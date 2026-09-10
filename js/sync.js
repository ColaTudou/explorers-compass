/* ============================================================
   探险家的罗盘 · 数据同步（真双人模式 · 自动版）
   服务端只是一个「加密信箱」—— 只存密文，看不到你们的内容。
   「同步密钥」同时用来派生房间号（roomId）和 AES-GCM 密钥，
   所以只有拿着同一个密钥的两台设备能互相看到、互相合并。
   依赖：Web Crypto（需要 https 或 localhost）
   ============================================================ */
window.Sync = (function () {

  function cfg() {
    return (Store.state.settings && Store.state.settings.sync) || {};
  }
  function saveCfg(patch) {
    Store.state.settings.sync = Object.assign({}, cfg(), patch);
    Store.save();
  }
  function ready() {
    var c = cfg();
    return !!(c.url && c.secret);
  }
  function supported() {
    return !!(window.crypto && crypto.subtle && window.TextEncoder);
  }

  /* ---------- base64（Uint8Array ↔ 字符串） ---------- */
  function b64(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  }
  function unb64(str) {
    var bin = atob(str);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  /* ---------- 从「同步密钥」派生 roomId + AES 密钥 ---------- */
  function derive(secret) {
    if (!supported()) return Promise.reject(new Error('当前环境不支持加密（需 https 打开）'));
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(String(secret)), 'PBKDF2', false, ['deriveBits'])
      .then(function (base) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode('compass-sync-v1'), iterations: 60000, hash: 'SHA-256' },
          base, 256
        );
      })
      .then(function (bits) {
        var buf = new Uint8Array(bits);
        var room = '';
        for (var i = 0; i < 8; i++) room += ('0' + buf[i].toString(16)).slice(-2);
        return crypto.subtle.importKey('raw', buf, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
          .then(function (key) { return { room: room, key: key }; });
      });
  }

  function encryptText(key, text) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var data = new TextEncoder().encode(text);
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data).then(function (ct) {
      var out = new Uint8Array(iv.length + ct.byteLength);
      out.set(iv, 0);
      out.set(new Uint8Array(ct), iv.length);
      return b64(out);
    });
  }
  function decryptText(key, str) {
    var buf = unb64(str);
    var iv = buf.slice(0, 12);
    var ct = buf.slice(12);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct).then(function (pt) {
      return new TextDecoder().decode(pt);
    });
  }

  /* ---------- 我在同步房间里的位置 ----------
     双方各自算，用「昵称字典序」保证结果一致（不会两个人都当 a）。 */
  function mySide() {
    var me = Store.me(), pt = Store.partner();
    if (!me || !pt) return 'a';
    return (String(me.nickname) < String(pt.nickname)) ? 'a' : 'b';
  }

  /* ---------- 要同步的内容（不含本机私有设置 / 密钥） ---------- */
  function snapshot() {
    var s = Store.state;
    return {
      users: s.users,
      couple: s.couple,
      journeys: s.journeys,
      wishes: s.wishes,
      todos: s.todos,
      capsules: s.capsules,
      blacklist: s.blacklist
    };
  }

  function baseUrl() {
    return String(cfg().url || '').replace(/\/+$/, '');
  }

  /* ---------- 立即同步：上传自己 → 拉对方 → 合并 ---------- */
  function syncNow() {
    if (!ready()) return Promise.reject(new Error('还没配置同步服务地址或密钥'));
    var side = mySide();
    var d;
    return derive(cfg().secret).then(function (r) {
      d = r;
      /* 先把照片从图库还原到内存，保证密文里含完整照片 */
      return Store.restoreImages ? Store.restoreImages() : null;
    }).then(function () {
      return encryptText(d.key, JSON.stringify(snapshot()));
    }).then(function (cipher) {
      return fetch(baseUrl() + '/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: d.room, side: side, cipher: cipher, ts: Date.now() })
      }).then(function (r) { return r.json(); });
    }).then(function (r) {
      if (!r || !r.ok) throw new Error((r && r.error) || '同步服务返回异常');
      if (!r.other) {
        return { side: side, pushed: true, pulled: false, stats: null };
      }
      return decryptText(d.key, r.other.cipher).then(function (text) {
        var stats = Store.mergeFrom(JSON.parse(text));
        if (window.IDB && Store.trimNow) {
          return Store.trimNow().then(function () {
            return { side: side, pushed: true, pulled: true, stats: stats };
          });
        }
        return { side: side, pushed: true, pulled: true, stats: stats };
      });
    }).then(function (out) {
      Store.state.meta.lastSyncAt = Store.nowISO();
      Store.save();
      return out;
    });
  }

  /* ---------- 查询房间状态：对方最近同步过没有 ---------- */
  function roomStatus() {
    if (!ready()) return Promise.reject(new Error('未配置'));
    return derive(cfg().secret).then(function (d) {
      return fetch(baseUrl() + '/api/room/' + d.room).then(function (r) { return r.json(); });
    });
  }

  /* ---------- 生成一个高熵同步密钥（避免用生日之类猜得到的） ---------- */
  function genSecret() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var u8 = crypto.getRandomValues(new Uint8Array(18));
    var s = '';
    for (var i = 0; i < 18; i++) s += chars[u8[i] % chars.length];
    return s.slice(0, 6) + '-' + s.slice(6, 12) + '-' + s.slice(12, 18);
  }

  return {
    cfg: cfg, saveCfg: saveCfg, ready: ready, supported: supported,
    mySide: mySide, syncNow: syncNow, roomStatus: roomStatus, genSecret: genSecret
  };
})();
