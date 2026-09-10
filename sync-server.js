/* ============================================================
   探险家的罗盘 · 同步服务（零依赖 Node）
   作用：给两台设备当「加密信箱」。服务端只存密文，看不到你们的内容。
   启动：node sync-server.js     或双击「启动同步服务.bat」
   默认端口：8787
   ============================================================ */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 8787;
const DATA_FILE = path.join(__dirname, '.sync-store.json');

let store = {};          // { room: { a: {cipher, ts}, b: {cipher, ts} } }
try { store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {}; } catch (e) { store = {}; }

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(store)); } catch (e) { /* 忽略 */ }
  }, 200);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}
function send(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { return send(res, 400, { ok: false }); }
  const p = url.pathname;

  /* 健康检查 */
  if (p === '/' || p === '/api/health') {
    return send(res, 200, { ok: true, service: '探险家的罗盘 · 同步服务', rooms: Object.keys(store).length });
  }

  /* 房间状态：GET /api/room/:room → { a: ts|null, b: ts|null } */
  const m = p.match(/^\/api\/room\/([A-Za-z0-9_-]{4,64})$/);
  if (m && req.method === 'GET') {
    const r = store[m[1]] || {};
    return send(res, 200, { ok: true, a: r.a ? r.a.ts : null, b: r.b ? r.b.ts : null });
  }

  /* 同步：POST /api/sync  body { room, side:'a'|'b', cipher, ts }
     → 存下自己这份，并把对方那份返回 */
  if (p === '/api/sync' && req.method === 'POST') {
    let body = '';
    let tooBig = false;
    req.on('data', function (c) {
      body += c;
      if (body.length > 60 * 1024 * 1024) { tooBig = true; req.destroy(); }   // 60MB 上限
    });
    req.on('end', function () {
      if (tooBig) return send(res, 413, { ok: false, error: '数据过大' });
      let q;
      try { q = JSON.parse(body); } catch (e) { return send(res, 400, { ok: false, error: 'bad json' }); }
      const room = q && q.room, side = q && q.side, cipher = q && q.cipher;
      if (!room || !/^[A-Za-z0-9_-]{4,64}$/.test(room)) return send(res, 400, { ok: false, error: 'bad room' });
      if (side !== 'a' && side !== 'b') return send(res, 400, { ok: false, error: 'bad side' });
      if (typeof cipher !== 'string' || !cipher) return send(res, 400, { ok: false, error: 'bad cipher' });

      store[room] = store[room] || {};
      store[room][side] = { cipher: cipher, ts: q.ts || Date.now() };
      persist();

      const other = store[room][side === 'a' ? 'b' : 'a'] || null;
      send(res, 200, {
        ok: true,
        other: other ? { cipher: other.cipher, ts: other.ts } : null
      });
    });
    return;
  }

  send(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('');
  console.log('  🧭  探险家的罗盘 · 同步服务已启动');
  console.log('  ─────────────────────────────────');
  console.log('  本机：    http://localhost:' + PORT);
  const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function (k) {
    (ifs[k] || []).forEach(function (i) {
      if (i.family === 'IPv4' && !i.internal) {
        console.log('  局域网：  http://' + i.address + ':' + PORT);
      }
    });
  });
  console.log('');
  console.log('  ⚠ 手机上的 App 是 https 打开的，浏览器不允许它请求 http 地址。');
  console.log('    要让手机用上，需要一个 https 地址 —— 见 部署指南.md 的「同步服务」一节。');
  console.log('    按 Ctrl+C 停止服务。');
  console.log('');
});
