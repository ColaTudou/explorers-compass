/* ============================================================
   探险家的罗盘 · 通用 UI 工具（图标 / 弹窗 / Toast / 格式化 / 图片）
   图标风格遵循 PRD 5.5.6：线性 2px、圆角端点、Lucide 风格
   ============================================================ */
window.UI = (function () {

  var P = {
    home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20|M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    compass: 'circle:12,12,10|M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
    star: 'M12 2.6l2.9 5.88 6.5.94-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.07 1.11-6.47L2.6 9.42l6.5-.94L12 2.6z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|circle:12,7,4',
    plus: 'M12 5v14|M5 12h14',
    camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z|circle:12,13,4',
    zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    shuffle: 'M16 3h5v5|M4 20L21 3|M21 16v5h-5|M15 15l6 6|M4 4l5 5',
    pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z|circle:12,10,3',
    cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|circle:9,7,4|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12',
    check: 'M20 6L9 17l-5-5',
    x: 'M18 6L6 18|M6 6l12 12',
    left: 'M15 18l-6-6 6-6',
    right: 'M9 18l6-6-6-6',
    trash: 'M3 6h18|M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|circle:12,12,3',
    clock: 'circle:12,12,10|M12 6v6l4 2',
    calendar: 'M3 4h18v18H3z|M16 2v4|M8 2v4|M3 10h18',
    heart: 'M20.8 5a5.2 5.2 0 0 0-7.4 0L12 6.5l-1.4-1.5a5.2 5.2 0 0 0-7.4 7.3L12 21l8.8-8.7A5.2 5.2 0 0 0 20.8 5z',
    settings: 'circle:12,12,3|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    sparkle: 'M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z|M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
    tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z|M7 7h.01',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    link: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7|M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    archive: 'M21 8v13H3V8|M1 3h22v5H1z|M10 12h4'
  };

  function icon(name, size, stroke, color) {
    size = size || 20; stroke = stroke || 2;
    var def = P[name] || '';
    var body = def.split('|').map(function (d) {
      if (d.indexOf('circle:') === 0) {
        var a = d.slice(7).split(',');
        return '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="' + a[2] + '"/>';
      }
      return '<path d="' + d + '"/>';
    }).join('');
    return '<span class="ico"><svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg></span>';
  }

  /* ---------- 转义 ---------- */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- Toast ---------- */
  function toast(msg, kind) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity 250ms, transform 250ms';
      el.style.opacity = '0'; el.style.transform = 'translateY(-10px)';
      setTimeout(function () { el.remove(); }, 260);
    }, 2200);
  }

  /* ---------- Modal ---------- */
  function modal(opts) {
    var root = document.getElementById('modal-root');
    var mask = document.createElement('div');
    mask.className = 'mask';
    mask.innerHTML =
      '<div class="modal' + (opts.wide ? ' modal--wide' : '') + '">' +
      (opts.title ? '<div class="modal__head"><h3>' + esc(opts.title) + '</h3>' +
        (opts.sub ? '<div class="t-2 mt-sm">' + esc(opts.sub) + '</div>' : '') + '</div>' : '') +
      '<div class="modal__body">' + opts.body + '</div>' +
      (opts.footer === false ? '' : '<div class="modal__foot">' + (opts.footer || '') + '</div>') +
      '</div>';
    root.appendChild(mask);
    mask.addEventListener('click', function (e) {
      if (e.target === mask && !opts.sticky) close();
    });
    function close(result) {
      mask.remove();
      if (opts.onClose) opts.onClose(result);
    }
    if (opts.onMount) opts.onMount(mask, close);
    return { el: mask, close: close };
  }

  function confirm(opts) {
    return new Promise(function (resolve) {
      var m = modal({
        title: opts.title,
        body: '<div class="t-2">' + esc(opts.text || '') + '</div>',
        footer:
          '<button class="btn btn--secondary" data-act="no">' + esc(opts.cancelText || '取消') + '</button>' +
          '<button class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-act="yes">' +
          esc(opts.okText || '确定') + '</button>',
        onMount: function (el, close) {
          el.querySelector('[data-act="no"]').onclick = function () { close(false); resolve(false); };
          el.querySelector('[data-act="yes"]').onclick = function () { close(true); resolve(true); };
        },
        onClose: function () { resolve(false); }
      });
    });
  }

  function promptSheet(opts) {
    /* 简单输入弹窗：opts.fields = [{key,label,type,value,placeholder,options}] */
    return new Promise(function (resolve) {
      var html = '<div class="col">' + opts.fields.map(function (f) {
        var inner;
        if (f.type === 'select') {
          inner = '<select class="select" data-k="' + f.key + '">' + f.options.map(function (o) {
            var v = typeof o === 'string' ? o : o.value, t = typeof o === 'string' ? o : o.label;
            return '<option value="' + esc(v) + '"' + (v === f.value ? ' selected' : '') + '>' + esc(t) + '</option>';
          }).join('') + '</select>';
        } else if (f.type === 'textarea') {
          inner = '<textarea class="textarea" data-k="' + f.key + '" placeholder="' + esc(f.placeholder || '') + '">' + esc(f.value || '') + '</textarea>';
        } else {
          inner = '<input class="input" data-k="' + f.key + '" type="' + (f.type || 'text') + '" value="' + esc(f.value || '') + '" placeholder="' + esc(f.placeholder || '') + '">';
        }
        return '<div class="field"><label class="field__label">' + esc(f.label) + '</label>' + inner + '</div>';
      }).join('') + '</div>';

      modal({
        title: opts.title, sub: opts.sub, body: html,
        footer:
          '<button class="btn btn--secondary" data-act="no">取消</button>' +
          '<button class="btn btn--primary" data-act="yes">' + esc(opts.okText || '保存') + '</button>',
        onMount: function (el, close) {
          el.querySelector('[data-act="no"]').onclick = function () { close(); resolve(null); };
          el.querySelector('[data-act="yes"]').onclick = function () {
            var out = {};
            el.querySelectorAll('[data-k]').forEach(function (i) { out[i.dataset.k] = i.value.trim(); });
            close(); resolve(out);
          };
          var first = el.querySelector('input,textarea');
          if (first) setTimeout(function () { first.focus(); }, 60);
        },
        onClose: function () { }
      });
    });
  }

  /* ---------- 日期格式化 ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateCN(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
  }
  function dateCNShort(iso) {
    var d = new Date(iso);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function yearsSince(iso) {
    var then = new Date(iso), now = new Date();
    var y = now.getFullYear() - then.getFullYear();
    if (now.getMonth() < then.getMonth() ||
      (now.getMonth() === then.getMonth() && now.getDate() < then.getDate())) y--;
    return Math.max(y, 0);
  }
  function relTime(iso) {
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
    return dateCN(iso);
  }
  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  /* ---------- 封面渲染 ---------- */
  function coverHTML(j, variant, extraClass) {
    var cls = 'cover ' + (variant || 'cover--card') + (extraClass ? ' ' + extraClass : '');
    if (j.cover_image && j.cover_image.indexOf('data:') === 0) {
      return '<div class="' + cls + '"><img src="' + j.cover_image + '" alt=""></div>';
    }
    var hex = j.magic_code ? DATA.colorHex(j.magic_code.color) : '#C9A78A';
    var hex2 = shade(hex, -22);
    var emoji = DATA.categoryEmoji[j.category] || '✨';
    return '<div class="' + cls + '" style="background:linear-gradient(135deg,' + hex + ' 0%,' + hex2 + ' 100%)">' +
      '<span>' + emoji + '</span></div>';
  }
  function shade(hex, amt) {
    var c = hex.replace('#', '');
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
    return '#' + [r, g, b].map(function (v) { return pad2(v.toString(16)); }).join('');
  }
  function pad2(s) { return s.length < 2 ? '0' + s : s; }

  function magicText(j) {
    if (!j.magic_code) return '';
    return j.magic_code.color + ' · ' + j.magic_code.adjective;
  }

  function scorePair(j) {
    var a = j.a_side && j.a_side.score, b = j.b_side && j.b_side.score;
    if (!a && !b) return '<span class="t-cap t-muted">未评分</span>';
    var same = a && b && a === b;
    var av = a ? '<span class="t-num">' + a + '</span>' : '<span class="t-muted">-</span>';
    var bv = b ? '<span class="t-num">' + b + '</span>' : '<span class="t-muted">-</span>';
    return '<span class="score-pair' + (same ? ' is-same' : '') + '">' + av +
      '<span class="op">&</span>' + bv + '</span>';
  }

  function statusTag(j) {
    var map = {
      draft: ['草稿', 'warn'], waiting_for_partner: ['待TA提交', 'warn'],
      archived: ['已归档', 'success'], sealed: ['已封存', 'plain']
    };
    var m = map[j.status] || ['草稿', 'warn'];
    return '<span class="tag tag--' + m[1] + '"><i class="status-dot status-dot--' +
      (m[1] === 'success' ? 'ok' : m[1] === 'warn' ? 'warn' : 'err') + '"></i>' + m[0] + '</span>';
  }

  /* ---------- 图片压缩（PRD 3.2.2：宽边 1080px / 质量 85%）----------
     本地存储场景下降级为 800px / 0.68，避免超出 localStorage 配额 */
  function compressImage(file, maxW, quality) {
    maxW = maxW || 800; quality = quality || 0.68;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxW / img.width);
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function pickImages(multiple) {
    return new Promise(function (resolve) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = !!multiple;
      inp.onchange = function () { resolve(Array.prototype.slice.call(inp.files || [])); };
      inp.click();
    });
  }

  /* ---------- 实时拍照（相机取景器） ----------
     优先 getUserMedia 自定义取景器；不可用时降级为系统相机 input[capture] */
  function camera(opts) {
    opts = opts || {};
    var max = opts.max || 9;

    return new Promise(function (resolve) {
      var md = navigator.mediaDevices;
      if (!(md && md.getUserMedia)) { fallbackCapture(resolve); return; }

      var shots = [], stream = null, facing = 'environment';

      var wrap = document.createElement('div');
      wrap.className = 'cam';
      wrap.innerHTML =
        '<div class="cam__view">' +
        '<video id="cv" autoplay playsinline muted></video>' +
        '<button class="cam__x" id="camX">' + icon('x', 22, 2, '#fff') + '</button>' +
        '<div class="cam__thumbs" id="camThumbs"></div>' +
        '<div class="cam__hint" id="camHint">对准要拍的，点下面的圆圈</div>' +
        '</div>' +
        '<div class="cam__bar">' +
        '<button class="cam__side" id="camFlip" title="切换摄像头">' + icon('shuffle', 22, 2, '#fff') + '</button>' +
        '<button class="cam__shutter" id="camShot"><i></i></button>' +
        '<button class="cam__side" id="camDone"><span id="camDoneTxt">完成</span></button>' +
        '</div>';
      document.body.appendChild(wrap);

      var video = wrap.querySelector('#cv');
      var thumbs = wrap.querySelector('#camThumbs');
      var hint = wrap.querySelector('#camHint');

      function drawThumbs() {
        thumbs.innerHTML = shots.map(function (u, i) {
          return '<div class="cam__thumb"><img src="' + u + '">' +
            '<button data-rm="' + i + '">×</button></div>';
        }).join('');
        thumbs.querySelectorAll('[data-rm]').forEach(function (b) {
          b.onclick = function () { shots.splice(Number(b.dataset.rm), 1); drawThumbs(); };
        });
        wrap.querySelector('#camDoneTxt').textContent =
          shots.length ? '完成(' + shots.length + ')' : '完成';
      }

      function start() {
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        md.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false
        }).then(function (s) {
          stream = s;
          video.srcObject = s;
          return video.play();
        }).catch(function () {
          hint.textContent = '打不开摄像头，改用相册吧';
          setTimeout(function () { stop(); wrap.remove(); fallbackCapture(resolve); }, 900);
        });
      }

      function stop() { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); }

      function shoot() {
        if (shots.length >= max) { toast('最多 ' + max + ' 张', 'err'); return; }
        var w = video.videoWidth || 720, h = video.videoHeight || 1280;
        var src = document.createElement('canvas');
        src.width = w; src.height = h;
        var sctx = src.getContext('2d');
        if (facing === 'user') { sctx.translate(w, 0); sctx.scale(-1, 1); }
        sctx.drawImage(video, 0, 0, w, h);

        var scale = Math.min(1, 800 / Math.max(w, h));
        var out = document.createElement('canvas');
        out.width = Math.round(w * scale); out.height = Math.round(h * scale);
        out.getContext('2d').drawImage(src, 0, 0, out.width, out.height);
        shots.push(out.toDataURL('image/jpeg', 0.68));

        var f = document.createElement('div');
        f.className = 'cam__flash';
        wrap.querySelector('.cam__view').appendChild(f);
        setTimeout(function () { f.remove(); }, 220);
        drawThumbs();
      }

      wrap.querySelector('#camShot').onclick = shoot;
      wrap.querySelector('#camX').onclick = function () { stop(); wrap.remove(); resolve([]); };
      wrap.querySelector('#camDone').onclick = function () { stop(); wrap.remove(); resolve(shots); };
      wrap.querySelector('#camFlip').onclick = function () {
        facing = facing === 'environment' ? 'user' : 'environment';
        start();
      };

      start();
      drawThumbs();
    });
  }

  /* 降级：唤起系统相机（移动端有效，桌面端等同选文件） */
  function fallbackCapture(resolve) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) { resolve([]); return; }
      compressImage(f).then(function (u) { resolve([u]); }).catch(function () { resolve([]); });
    };
    inp.click();
  }

  /* ---------- 心情 / 预算 选项 ---------- */
  var MOODS = [
    { v: 'tired', t: '有点累' }, { v: 'normal', t: '一般' }, { v: 'energetic', t: '精力充沛' }
  ];
  var BUDGETS = [
    { v: 'thrifty', t: '省着点' }, { v: 'normal', t: '正常' }, { v: 'lavish', t: '奢侈一把' }
  ];

  return {
    icon: icon, esc: esc, toast: toast, modal: modal, confirm: confirm, promptSheet: promptSheet,
    pad: pad, dateCN: dateCN, dateCNShort: dateCNShort, yearsSince: yearsSince,
    relTime: relTime, greeting: greeting,
    coverHTML: coverHTML, magicText: magicText, scorePair: scorePair, statusTag: statusTag,
    compressImage: compressImage, pickImages: pickImages,
    camera: camera, fallbackCapture: fallbackCapture,
    MOODS: MOODS, BUDGETS: BUDGETS
  };
})();
