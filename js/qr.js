/* ============================================================
   探险家的罗盘 · 二维码生成器（零依赖，纯手写）
   用途：把「配对链接」画成二维码，对方扫一下就能完成配对。
   实现范围：QR Code Model 2 · 字节模式(0100) · 纠错级别 M · 版本 1~10
   （版本 10 可放 213 字节，装一条配对链接绰绰有余）
   坐标：m[row][col]，1 = 深色。对外暴露 matrix() / svg()。
   ============================================================ */
window.QR = (function () {

  var LAST = null;

  /* ---------- GF(256)，本原多项式 0x11D ---------- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  /* ---------- Reed-Solomon ---------- */
  function genPoly(n) {                    // g[0] = 最高次项系数，恒为 1
    var g = [1], i, j;
    for (i = 0; i < n; i++) {
      var ng = [];
      for (j = 0; j <= g.length; j++) ng.push(0);
      for (j = 0; j < g.length; j++) {
        ng[j] ^= g[j];                     // × x
        ng[j + 1] ^= gmul(g[j], EXP[i]);   // × α^i
      }
      g = ng;
    }
    return g;
  }
  function rsEncode(data, ecLen) {
    var g = genPoly(ecLen), res = [], i, j;
    for (i = 0; i < ecLen; i++) res.push(0);
    for (i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (factor) for (j = 0; j < ecLen; j++) res[j] ^= gmul(g[j + 1], factor);
    }
    return res;
  }

  /* ---------- 规格表（纠错级别 M） ----------
     [总码字, 每块纠错码字, 组1块数, 组1数据码字, 组2块数, 组2数据码字] */
  var SPEC = {
    1: [26, 10, 1, 16, 0, 0],
    2: [44, 16, 1, 28, 0, 0],
    3: [70, 26, 1, 44, 0, 0],
    4: [100, 18, 2, 32, 0, 0],
    5: [134, 24, 2, 43, 0, 0],
    6: [172, 16, 4, 27, 0, 0],
    7: [196, 18, 4, 31, 0, 0],
    8: [242, 22, 2, 38, 2, 39],
    9: [292, 22, 3, 36, 2, 37],
    10: [346, 26, 4, 43, 1, 44]
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  /* ---------- BCH ---------- */
  function bchFormat(d) {                  // 5 bit → 15 bit
    var v = d << 10, i;
    for (i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= 0x537 << i;
    return ((d << 10) | v) ^ 0x5412;
  }
  function bchVersion(v) {                 // 6 bit → 18 bit
    var d = v << 12, i;
    for (i = 5; i >= 0; i--) if (d & (1 << (i + 12))) d ^= 0x1F25 << i;
    return (v << 12) | d;
  }

  /* ---------- 8 种掩码（x = 列, y = 行） ---------- */
  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
    function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
  ];

  /* ================= 主流程 ================= */
  function matrix(text, forceMask) {
    var bytes = utf8Bytes(String(text));
    var ver = pickVersion(bytes.length);
    if (!ver) return null;

    var spec = SPEC[ver], ecLen = spec[1];
    var n1 = spec[2], d1 = spec[3], n2 = spec[4], d2 = spec[5];
    var numBlocks = n1 + n2;
    var dataCap = spec[0] - ecLen * numBlocks;
    var i, j;

    /* 1) 比特流：模式 + 字符计数 + 数据 + 终止符 + 补齐 */
    var bits = [];
    pushBits(bits, 4, 4);
    pushBits(bits, bytes.length, ver <= 9 ? 8 : 16);
    for (i = 0; i < bytes.length; i++) pushBits(bits, bytes[i], 8);
    for (i = 0; i < 4 && bits.length < dataCap * 8; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var dataWords = [];
    for (i = 0; i < bits.length; i += 8) {
      var w = 0;
      for (j = 0; j < 8; j++) w = (w << 1) | bits[i + j];
      dataWords.push(w);
    }
    for (i = 0; dataWords.length < dataCap; i++) dataWords.push(i % 2 === 0 ? 0xEC : 0x11);

    /* 2) 分块 + 纠错 */
    var blocks = [], pos = 0;
    for (i = 0; i < n1; i++) { blocks.push(dataWords.slice(pos, pos + d1)); pos += d1; }
    for (i = 0; i < n2; i++) { blocks.push(dataWords.slice(pos, pos + d2)); pos += d2; }
    for (i = 0; i < blocks.length; i++) blocks[i] = { data: blocks[i], ec: rsEncode(blocks[i], ecLen) };

    /* 3) 交织：先所有数据码字（按块轮转），再所有纠错码字 */
    var final = [], maxData = 0;
    for (i = 0; i < blocks.length; i++) maxData = Math.max(maxData, blocks[i].data.length);
    for (i = 0; i < maxData; i++)
      for (j = 0; j < blocks.length; j++)
        if (i < blocks[j].data.length) final.push(blocks[j].data[i]);
    for (i = 0; i < ecLen; i++)
      for (j = 0; j < blocks.length; j++) final.push(blocks[j].ec[i]);

    /* 4) 功能图形（顺序不能变：时序 → 定位 → 校正） */
    LAST = final;
    var size = ver * 4 + 17;
    var m = [], fn = [], r, c;
    for (r = 0; r < size; r++) { m.push(new Array(size).fill(0)); fn.push(new Array(size).fill(false)); }
    function set(x, y, v) { m[y][x] = v ? 1 : 0; fn[y][x] = true; }

    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }   // 时序
    finder(set, size, 3, 3);
    finder(set, size, size - 4, 3);
    finder(set, size, 3, size - 4);

    var ac = ALIGN[ver], last = ac.length - 1;
    for (i = 0; i <= last; i++) for (j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      align(set, ac[j], ac[i]);
    }

    reserveFormat(set, size);
    if (ver >= 7) reserveVersion(set, size, 0);

    /* 5) 放数据（蛇形，跳过功能图形） */
    var bitIdx = 0, totalBits = final.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var k = 0; k < 2; k++) {
          var x = right - k;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (fn[y][x] || bitIdx >= totalBits) continue;
          m[y][x] = (final[bitIdx >>> 3] >> (7 - (bitIdx & 7))) & 1;
          bitIdx++;                       // ⚠ 绝不能在这里标记 fn：数据区必须留给掩码处理
        }
      }
    }

    /* 6) 选掩码 + 写格式 / 版本信息 */
    var best = Number(forceMask >= 0 ? forceMask : 0), bestScore = Infinity;
    if (forceMask >= 0) {
      applyMask(m, fn, size, MASKS[best]);
      writeFormat(set, size, best);
      if (ver >= 7) reserveVersion(set, size, ver);
      return m;
    }
    for (i = 0; i < 8; i++) {
      applyMask(m, fn, size, MASKS[i]);
      writeFormat(set, size, i);
      var sc = penalty(m, size);
      if (sc < bestScore) { bestScore = sc; best = i; }
      applyMask(m, fn, size, MASKS[i]);   // 异或两次 = 还原
    }
    applyMask(m, fn, size, MASKS[best]);
    writeFormat(set, size, best);
    if (ver >= 7) reserveVersion(set, size, ver);
    return m;
  }

  /* ---------------- 辅助 ---------------- */
  function utf8Bytes(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return out;
  }
  function pushBits(arr, val, len) {
    for (var i = len - 1; i >= 0; i--) arr.push((val >>> i) & 1);
  }
  function pickVersion(len) {
    for (var v = 1; v <= 10; v++) {
      var s = SPEC[v], cap = s[0] - s[1] * (s[2] + s[4]);
      var cc = v <= 9 ? 8 : 16;
      if (cap * 8 >= 4 + cc + len * 8) return v;
    }
    return 0;
  }
  function finder(set, size, cx, cy) {          // 9×9：7×7 图案 + 1 圈分隔符
    for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
      var x = cx + dx, y = cy + dy;
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      var d = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, d !== 2 && d !== 4);
    }
  }
  function align(set, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++)
      set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  function reserveFormat(set, size) {
    var i;
    for (i = 0; i <= 8; i++) if (i !== 6) { set(8, i, 0); set(i, 8, 0); }
    for (i = 0; i < 8; i++) { set(8, size - 1 - i, 0); set(size - 1 - i, 8, 0); }
    set(8, size - 8, 1);                        // 固定深色模块
  }
  function reserveVersion(set, size, ver) {
    var bits = ver ? bchVersion(ver) : 0;
    for (var i = 0; i < 18; i++) {
      var bit = (bits >> i) & 1;
      var a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, bit); set(b, a, bit);
    }
  }
  function writeFormat(set, size, mask) {
    var bits = bchFormat((0 << 3) | mask);      // 纠错级别 M = 00
    var i, p = [];
    for (i = 0; i <= 5; i++) p.push([8, i]);
    p.push([8, 7]); p.push([8, 8]); p.push([7, 8]);
    for (i = 9; i < 15; i++) p.push([14 - i, 8]);
    for (i = 0; i < 15; i++) set(p[i][0], p[i][1], (bits >> i) & 1);
    for (i = 0; i < 8; i++) set(size - 1 - i, 8, (bits >> i) & 1);
    for (i = 8; i < 15; i++) set(8, size - 15 + i, (bits >> i) & 1);
    set(8, size - 8, 1);
  }
  function applyMask(m, fn, size, maskFn) {
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++)
      if (!fn[y][x] && maskFn(x, y)) m[y][x] ^= 1;
  }

  /* 罚分：只用于挑最"好扫"的掩码，算不精也不影响可解码性 */
  function penalty(m, size) {
    var score = 0, x, y, run, dark = 0;
    for (y = 0; y < size; y++) {
      run = 1;
      for (x = 1; x < size; x++) {
        if (m[y][x] === m[y][x - 1]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (x = 0; x < size; x++) {
      run = 1;
      for (y = 1; y < size; y++) {
        if (m[y][x] === m[y - 1][x]) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var v = m[y][x];
      if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) score += 3;
    }
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) dark += m[y][x];
    score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return score;
  }

  /* ---------------- 输出 ---------------- */
  function svg(text, px, dark, light) {
    var m = matrix(text);
    if (!m) return '';
    var n = m.length, q = 4, span = n + q * 2;
    px = px || 220;
    var rects = '';
    for (var y = 0; y < n; y++) {
      var x = 0;
      while (x < n) {
        if (!m[y][x]) { x++; continue; }
        var start = x;
        while (x + 1 < n && m[y][x + 1]) x++;
        rects += '<rect x="' + (start + q) + '" y="' + (y + q) +
          '" width="' + (x - start + 1) + '" height="1"/>';
        x++;
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px +
      '" viewBox="0 0 ' + span + ' ' + span + '" shape-rendering="crispEdges">' +
      '<rect width="' + span + '" height="' + span + '" fill="' + (light || '#ffffff') + '"/>' +
      '<g fill="' + (dark || '#000000') + '">' + rects + '</g></svg>';
  }

  /* 只建功能图形表（测试用：从现成矩阵反读码字，定位编码差异） */
  function probe(text) {
    var bytes = utf8Bytes(String(text));
    var ver = pickVersion(bytes.length);
    if (!ver) return null;
    var size = ver * 4 + 17, i, j, r;
    var fn = [];
    for (r = 0; r < size; r++) fn.push(new Array(size).fill(false));
    function set(x, y) { fn[y][x] = true; }
    for (i = 0; i < size; i++) { set(6, i); set(i, 6); }
    finder(set, size, 3, 3); finder(set, size, size - 4, 3); finder(set, size, 3, size - 4);
    var ac = ALIGN[ver], last = ac.length - 1;
    for (i = 0; i <= last; i++) for (j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      align(set, ac[j], ac[i]);
    }
    reserveFormat(set, size);
    if (ver >= 7) reserveVersion(set, size, 0);
    return { ver: ver, size: size, fn: fn };
  }

  /* 按蛇形顺序把数据区读回码字（先反转掩码） */
  function readBack(mat, p, mask) {
    var size = p.size, fn = p.fn, bits = [];
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var k = 0; k < 2; k++) {
          var x = right - k;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (fn[y][x]) continue;
          var v = mat[y][x];
          if (MASKS[mask](x, y)) v ^= 1;
          bits.push(v);
        }
      }
    }
    var words = [];
    for (var i = 0; i + 8 <= bits.length; i += 8) {
      var w = 0;
      for (var j = 0; j < 8; j++) w = (w << 1) | bits[i + j];
      words.push(w);
    }
    return words;
  }

  return { matrix: matrix, svg: svg, utf8Bytes: utf8Bytes, SPEC: SPEC, probe: probe, readBack: readBack, last: function () { return LAST; } };
})();
