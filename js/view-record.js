/* ============================================================
   探险家的罗盘 · 记录模块
   PRD 3.2 猎人/诗人游戏化流程 + 4.2 两分钟闪电存档
   ============================================================ */
window.Views = window.Views || {};

Views.record = (function () {

  var _st = null;   // 当前记录流程状态

  /* ---------------- 入口 ---------------- */
  function start(journeyId) {
    var j = journeyId ? Store.getJourney(journeyId) : null;
    if (j) {
      _st = { step: 'role', j: j, mode: 'join' };
    } else {
      _st = { step: 'base', j: null, mode: 'new' };
    }
    location.hash = '#/record';
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    if (!_st) return '<div class="empty">记录已结束</div>';
    if (!Store.isBonded()) {
      return '<div class="empty"><div class="empty__icon">🧭</div>' +
        '<div class="empty__title">先绑定一位探险搭档</div>' +
        '<div class="empty__desc">记录是双人的事，先去「我的」完成绑定吧</div>' +
        '<button class="btn btn--primary" onclick="location.hash=\'#/profile\'">去绑定</button></div>';
    }
    switch (_st.step) {
      case 'base': return tplBase();
      case 'role': return tplRole();
      case 'hunter': return tplHunter();
      case 'poet': return tplPoet();
    }
    return '';
  }

  /* ---------------- 第一步：基础信息 ---------------- */
  function tplBase() {
    var j = _st.j || {};
    return '' +
      '<div class="steps">' +
      '<i class="steps__i is-on"></i><i class="steps__i"></i><i class="steps__i"></i></div>' +
      '<h1 class="t-h1 mb-md">先记下基本信息</h1>' +
      '<p class="t-2 mb-base">后面随时可以改，别纠结。</p>' +

      '<div class="field"><label class="field__label">这是什么类型的探险？</label>' +
      '<div class="row row--wrap" id="catPick">' +
      DATA.categories.map(function (c) {
        return '<button class="tag tag--click" data-cat="' + c + '">' +
          DATA.categoryEmoji[c] + ' ' + c + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">地点</label>' +
      '<input class="input" id="fLoc" placeholder="店名 / 商圈 / 地名，可留空" value=""></div>' +

      '<div class="field"><label class="field__label">日期</label>' +
      '<input class="input" id="fDate" type="date" value="' + todayStr() + '"></div>' +

      '<div class="field"><label class="field__label">天气（可留空）</label>' +
      '<div class="row row--wrap" id="wPick">' +
      DATA.weathers.map(function (w) {
        return '<button class="tag tag--click" data-w="' + w + '">' + DATA.weatherEmoji[w] + ' ' + w + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">人均花费（可留空，用于预算过滤）</label>' +
      '<input class="input" id="fExp" type="number" inputmode="numeric" placeholder="例如 88"></div>' +

      '<div class="field"><label class="field__label">同行人数</label>' +
      '<input class="input" id="fCnt" type="number" value="2" min="1"></div>' +

      '<button class="btn btn--primary btn--lg btn--block mt-base" id="btnNext">下一步 · 抽角色</button>' +
      '<button class="btn btn--text btn--block mt-sm" onclick="location.hash=\'#/home\'">先不记了</button>';
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + Store.pad(d.getMonth() + 1) + '-' + Store.pad(d.getDate());
  }

  function mountBase(root) {
    var cat = null, weather = '';
    root.querySelectorAll('#catPick [data-cat]').forEach(function (b) {
      b.onclick = function () {
        root.querySelectorAll('#catPick [data-cat]').forEach(function (x) { x.classList.remove('tag--on'); });
        b.classList.add('tag--on'); cat = b.dataset.cat;
      };
    });
    root.querySelectorAll('#wPick [data-w]').forEach(function (b) {
      b.onclick = function () {
        var on = b.classList.contains('tag--on');
        root.querySelectorAll('#wPick [data-w]').forEach(function (x) { x.classList.remove('tag--on'); });
        if (!on) { b.classList.add('tag--on'); weather = b.dataset.w; } else weather = '';
      };
    });
    root.querySelector('#btnNext').onclick = function () {
      var loc = root.querySelector('#fLoc').value.trim();
      var date = root.querySelector('#fDate').value;
      var exp = root.querySelector('#fExp').value.trim();
      var cnt = parseInt(root.querySelector('#fCnt').value, 10) || 2;
      if (!cat) { UI.toast('先选一个分类吧', 'err'); return; }
      var iso = new Date(date + 'T19:30:00').toISOString();
      _st.j = Store.newJourney({
        category: cat, location_name: loc, start_date: iso, end_date: iso,
        weather: weather, expense: exp === '' ? null : Number(exp), companion_count: cnt
      });
      _st.step = 'role';
      App.render();
    };
  }

  /* ---------------- 第二步：角色轮盘 ---------------- */
  function tplRole() {
    var j = _st.j;
    var assigned = assignRole(j);
    var amHunter = assigned === 'hunter';
    return '' +
      '<div class="steps"><i class="steps__i is-on"></i><i class="steps__i is-on"></i><i class="steps__i"></i></div>' +
      '<h1 class="t-h1 t-center mb-md">这次你是谁？</h1>' +
      '<div class="role-wheel" id="wheel">' +
      '<div class="role-wheel__inner">' +
      '<div class="role-wheel__emoji">' + (amHunter ? '📷' : '✍️') + '</div>' +
      '<div class="t-h3">' + (amHunter ? '镜头猎人' : '文字诗人') + '</div>' +
      '<div class="t-cap t-muted">' + (amHunter ? '负责 3 张照片' : '负责 3 个感知') + '</div>' +
      '</div></div>' +
      '<p class="t-2 t-center mb-base">' +
      (amHunter ? '站远一点、凑近一点、再偷偷抓拍一张 TA。'
        : '写下气味、背景音、体感温度，再起一个魔法暗号。') + '</p>' +
      '<button class="btn btn--primary btn--lg btn--block" id="btnGo">开始记录</button>' +
      '<button class="btn btn--secondary btn--block mt-md" id="btnSwap">换一下角色</button>' +
      '<p class="t-sm t-center mt-md">下次记录会自动互换，也可以随时手动换</p>';
  }

  function assignRole(j) {
    var me = Store.state.currentUserId;
    if (!j.roles) j.roles = { hunter: null, poet: null };
    if (j.roles.hunter === me) return 'hunter';
    if (j.roles.poet === me) return 'poet';
    // 未分配：首次随机；否则取上次的另一半
    var partner = Store.partner();
    var last = Store.state.settings.roleLast;
    var mine;
    if (!j.roles.hunter && !j.roles.poet) {
      mine = Math.random() < 0.5 ? 'hunter' : 'poet';
    } else {
      mine = (j.roles.hunter && j.roles.hunter !== me) ? 'poet' : 'hunter';
      if (last === 'hunter') mine = 'poet'; else if (last === 'poet') mine = 'hunter';
    }
    j.roles[mine] = me;
    if (partner) j.roles[mine === 'hunter' ? 'poet' : 'hunter'] = partner.id;
    Store.state.settings.roleLast = mine;
    Store.save();
    return mine;
  }

  function mountRole(root) {
    root.querySelector('#wheel').classList.add('is-spin');
    root.querySelector('#btnGo').onclick = function () {
      var role = assignRole(_st.j);
      _st.step = role === 'hunter' ? 'hunter' : 'poet';
      App.render();
    };
    root.querySelector('#btnSwap').onclick = function () {
      var me = Store.state.currentUserId;
      var cur = assignRole(_st.j);
      var other = cur === 'hunter' ? 'poet' : 'hunter';
      var partner = Store.partner();
      _st.j.roles[other] = me;
      if (partner) _st.j.roles[cur] = partner.id;
      Store.state.settings.roleLast = other;
      Store.save();
      UI.toast('已换成「' + (other === 'hunter' ? '镜头猎人' : '文字诗人') + '」');
      App.render();
    };
  }

  /* ---------------- 第三步：猎人界面 ---------------- */
  var SHOTS = [
    { key: 'pano', label: '全景', sub: '1/3 · 站远一点' },
    { key: 'close', label: '特写', sub: '2/3 · 凑近拍' },
    { key: 'sneak', label: '偷拍', sub: '3/3 · 别让TA发现' }
  ];

  function tplHunter() {
    var shots = _st.shots || (_st.shots = { pano: [], close: [], sneak: [] });
    return '' +
      '<div class="steps"><i class="steps__i is-on"></i><i class="steps__i is-on"></i><i class="steps__i is-on"></i></div>' +
      '<div class="row row--between mb-md">' +
      '<div><div class="t-h2">📷 镜头猎人</div>' +
      '<div class="t-cap">' + UI.esc(_st.j.location_name || '未填地点') + '</div></div>' +
      '</div>' +

      '<div class="shot-grid mb-base">' +
      SHOTS.map(function (s) {
        var arr = shots[s.key] || [];
        var done = arr.length > 0;
        return '<div class="shot' + (done ? ' is-done' : '') + '" data-shot="' + s.key + '">' +
          (done ? '<img src="' + arr[0] + '">' +
            (arr.length > 1 ? '<span class="shot__badge">' + arr.length + ' 张</span>' : '') +
            '<span class="shot__cap">' + s.label + '</span>'
            : '<span class="shot__label">' + s.label + '</span><span class="shot__sub">' + s.sub + '</span>') +
          '</div>';
      }).join('') + '</div>' +

      '<div class="row row--tight row--center mb-base">' +
      '<button class="btn btn--sm btn--secondary" id="btnImport">' + UI.icon('camera', 16) + ' 相册</button>' +
      '<button class="btn btn--sm btn--ghost" id="btnCam">📸 拍照</button>' +
      '</div>' +

      '<div class="t-center mb-base"><div class="shutter" id="btnShoot">' + UI.icon('camera', 32, 2, '#fff') + '</div>' +
      '<div class="t-cap mt-sm">点大圆圈开摄像头实拍（可连拍），三类各来一张就够</div></div>' +

      '<div class="field"><label class="field__label">一句话（可留空）</label>' +
      '<textarea class="textarea" id="hText" placeholder="随手记一句，剩下的交给时间"></textarea></div>' +

      '<div class="field"><label class="field__label">你给这次打几分？</label>' +
      '<div class="row" id="scorePick">' + [1, 2, 3, 4, 5].map(function (n) {
        return '<button class="tag tag--click" data-s="' + n + '">' + n + ' 分</button>';
      }).join('') + '</div></div>' +

      '<button class="btn btn--primary btn--lg btn--block mt-base" id="btnSubmit">提交 · 等 TA</button>' +
      '<button class="btn btn--text btn--block mt-sm" onclick="location.hash=\'#/journeys\'">先存草稿</button>';
  }

  function mountHunter(root) {
    var score = null;
    root.querySelectorAll('#scorePick [data-s]').forEach(function (b) {
      b.onclick = function () {
        root.querySelectorAll('#scorePick [data-s]').forEach(function (x) { x.classList.remove('tag--on'); });
        b.classList.add('tag--on'); score = Number(b.dataset.s);
      };
    });

    function addTo(key) {
      UI.pickImages(false).then(function (files) {
        if (!files.length) return;
        UI.compressImage(files[0]).then(function (dataUrl) {
          _st.shots[key].push(dataUrl);
          App.render();
        }).catch(function () { UI.toast('这张图读不出来', 'err'); });
      });
    }

    /* 实时拍照：连拍后按顺序填进空槽 */
    function shootTo(key) {
      UI.camera({ max: 9 }).then(function (urls) {
        if (!urls || !urls.length) return;
        var order = key ? [key] : SHOTS.map(function (s) { return s.key; });
        urls.forEach(function (u) {
          var target = order.filter(function (k) { return (_st.shots[k] || []).length === 0; })[0]
            || order[order.length - 1];
          _st.shots[target].push(u);
        });
        App.render();
        UI.toast('拍了 ' + urls.length + ' 张', 'ok');
      });
    }

    root.querySelectorAll('[data-shot]').forEach(function (el) {
      el.onclick = function () { addTo(el.dataset.shot); };
    });
    root.querySelector('#btnShoot').onclick = function () { shootTo(null); };
    root.querySelector('#btnCam').onclick = function () { shootTo(null); };
    root.querySelector('#btnImport').onclick = function () {
      UI.pickImages(true).then(function (files) {
        if (!files.length) return;
        Promise.all(files.slice(0, 9).map(function (f) { return UI.compressImage(f); }))
          .then(function (urls) {
            var next = SHOTS.filter(function (s) { return !(_st.shots[s.key] || []).length; })[0] || SHOTS[0];
            _st.shots[next.key] = _st.shots[next.key].concat(urls);
            App.render();
          });
      });
    };

    root.querySelector('#btnSubmit').onclick = function () {
      var imgs = [].concat(_st.shots.pano, _st.shots.close, _st.shots.sneak);
      if (!imgs.length) { UI.toast('至少来一张照片吧', 'err'); return; }
      var j = _st.j;
      var side = Store.sideTemplate(Store.state.currentUserId);
      side.images = imgs;
      side.text = root.querySelector('#hText').value.trim();
      side.score = score;
      j[Store.mySideKey()] = side;
      j.roles = j.roles || {};
      j.roles.hunter = Store.state.currentUserId;
      if (!j.cover_image) j.cover_image = imgs[0];
      j.title = j.title || (j.location_name || '未命名探险');
      finishSubmit(j);
    };
  }

  /* ---------------- 第三步（另一分支）：诗人界面 ---------------- */
  function tplPoet() {
    var mc = _st.magic || (_st.magic = { color: null, adjective: '' });
    return '' +
      '<div class="steps"><i class="steps__i is-on"></i><i class="steps__i is-on"></i><i class="steps__i is-on"></i></div>' +
      '<div class="mb-md"><div class="t-h2">✍️ 文字诗人</div>' +
      '<div class="t-cap">' + UI.esc(_st.j.location_name || '未填地点') + '</div></div>' +

      '<div class="sense-item"><div class="sense-item__ico">👃</div>' +
      '<input class="input" id="sSmell" placeholder="闻到了什么？如：蒜香和黄油味"></div>' +
      '<div class="sense-item"><div class="sense-item__ico">👂</div>' +
      '<input class="input" id="sSound" placeholder="背景音是什么？如：意大利语老歌"></div>' +
      '<div class="sense-item"><div class="sense-item__ico">🌡️</div>' +
      '<input class="input" id="sTemp" placeholder="体感如何？如：店里有点闷但很舒服"></div>' +

      '<hr class="divider">' +
      '<div class="field"><label class="field__label">魔法暗号 · 选一个颜色</label>' +
      '<div class="color-grid" id="colorPick">' +
      DATA.magicColors.map(function (c) {
        return '<button class="color-dot' + (mc.color === c.name ? ' is-on' : '') +
          '" data-c="' + c.name + '" title="' + c.name + '" style="background:' + c.hex + '"></button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">魔法暗号 · 一个形容词</label>' +
      '<input class="input" id="adjInput" placeholder="自己写一个，或从下面挑" value="' + UI.esc(mc.adjective) + '">' +
      '<div class="adj-grid mt-sm" id="adjPick">' +
      DATA.adjectives.slice(0, 14).map(function (a) {
        return '<button class="tag tag--click" data-a="' + a + '">' + a + '</button>';
      }).join('') + '</div></div>' +

      '<hr class="divider">' +
      '<div class="field"><label class="field__label">你给这次打几分？</label>' +
      '<div class="row" id="scorePick">' + [1, 2, 3, 4, 5].map(function (n) {
        return '<button class="tag tag--click" data-s="' + n + '">' + n + ' 分</button>';
      }).join('') + '</div></div>' +

      '<button class="btn btn--primary btn--lg btn--block mt-base" id="btnSubmit">提交 · 等 TA</button>' +
      '<button class="btn btn--text btn--block mt-sm" onclick="location.hash=\'#/journeys\'">先存草稿</button>';
  }

  function mountPoet(root) {
    var score = null;
    var mc = _st.magic;
    root.querySelectorAll('#scorePick [data-s]').forEach(function (b) {
      b.onclick = function () {
        root.querySelectorAll('#scorePick [data-s]').forEach(function (x) { x.classList.remove('tag--on'); });
        b.classList.add('tag--on'); score = Number(b.dataset.s);
      };
    });
    root.querySelectorAll('#colorPick [data-c]').forEach(function (b) {
      b.onclick = function () {
        root.querySelectorAll('#colorPick [data-c]').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on'); mc.color = b.dataset.c;
      };
    });
    root.querySelectorAll('#adjPick [data-a]').forEach(function (b) {
      b.onclick = function () {
        mc.adjective = b.dataset.a;
        root.querySelector('#adjInput').value = mc.adjective;
      };
    });
    root.querySelector('#adjInput').oninput = function () { mc.adjective = this.value.trim(); };

    root.querySelector('#btnSubmit').onclick = function () {
      var smell = root.querySelector('#sSmell').value.trim();
      var sound = root.querySelector('#sSound').value.trim();
      var temp = root.querySelector('#sTemp').value.trim();
      mc.adjective = root.querySelector('#adjInput').value.trim();
      if (!mc.color || !mc.adjective) { UI.toast('魔法暗号要「一个颜色 + 一个形容词」', 'err'); return; }
      if (!smell && !sound && !temp) { UI.toast('至少写一个感知吧', 'err'); return; }

      var j = _st.j;
      var side = Store.sideTemplate(Store.state.currentUserId);
      side.senses = { smell: smell, sound: sound, temp: temp };
      side.text = [smell, sound, temp].filter(Boolean).join('，');
      side.score = score;
      j[Store.mySideKey()] = side;
      j.magic_code = { color: mc.color, adjective: mc.adjective };
      j.roles = j.roles || {};
      j.roles.poet = Store.state.currentUserId;
      j.title = j.title || (j.location_name || '未命名探险');
      finishSubmit(j);
    };
  }

  /* ---------------- 提交收尾 ---------------- */
  function finishSubmit(j) {
    j.end_date = j.start_date;
    j.last_visited_at = j.start_date;
    var other = Store.otherSideKey();
    if (j.a_side && j.b_side) {
      j.status = 'waiting_for_partner';       // 双方都提交了 → 可进入合并
      if (_st.mode === 'new') Store.addJourney(j); else Store.save();
      UI.toast('双方都提交了，去合并吧');
      location.hash = '#/merge/' + j.id;
    } else {
      j.status = 'waiting_for_partner';
      if (_st.mode === 'new') Store.addJourney(j); else Store.save();
      UI.toast('已提交，等 TA 那一边');
      location.hash = '#/journeys/' + j.id;
    }
  }

  /* ---------------- 闪电存档（PRD 4.2） ---------------- */
  function flashArchive() {
    var imgs = [];
    var m = UI.modal({
      title: '⚡ 两分钟闪电存档',
      sub: '丢一张图 + 说一句话，剩下的以后慢慢补',
      body:
        '<div class="field"><label class="field__label">照片（至少 1 张）</label>' +
        '<div class="row row--wrap" id="fImgs"></div>' +
        '<div class="row row--tight mt-sm">' +
        '<button class="btn btn--secondary btn--sm" id="fPick">' + UI.icon('plus', 16) + ' 相册</button>' +
        '<button class="btn btn--ghost btn--sm" id="fCam">📸 拍照</button>' +
        '</div></div>' +
        '<div class="field"><label class="field__label">地点（可留空）</label>' +
        '<input class="input" id="fLoc2" placeholder="在哪儿？"></div>' +
        '<div class="field"><label class="field__label">一句话（可留空）</label>' +
        '<textarea class="textarea" id="fText" placeholder="现在什么感觉？"></textarea>' +
        '<button class="btn btn--text btn--sm mt-sm" id="fMic">🎙 用说的（语音转文字）</button>' +
        '</div>',
      footer:
        '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">存下</button>',
      onMount: function (el, close) {
        function drawImgs() {
          el.querySelector('#fImgs').innerHTML = imgs.map(function (u, i) {
            return '<div style="position:relative;width:64px;height:64px">' +
              '<img src="' + u + '" style="width:64px;height:64px;object-fit:cover;border-radius:8px">' +
              '<button data-rm="' + i + '" style="position:absolute;right:-4px;top:-4px;width:18px;height:18px;' +
              'border-radius:50%;background:#C95C5C;color:#fff;font-size:11px;line-height:18px">×</button></div>';
          }).join('');
          el.querySelectorAll('[data-rm]').forEach(function (b) {
            b.onclick = function () { imgs.splice(Number(b.dataset.rm), 1); drawImgs(); };
          });
        }
        el.querySelector('#fPick').onclick = function () {
          UI.pickImages(true).then(function (files) {
            Promise.all(files.slice(0, 6).map(function (f) { return UI.compressImage(f, 720, .6); }))
              .then(function (urls) { imgs = imgs.concat(urls); drawImgs(); });
          });
        };
        el.querySelector('#fMic').onclick = function () { startVoice(el.querySelector('#fText')); };
        el.querySelector('#fCam').onclick = function () {
          UI.camera({ max: 6 }).then(function (urls) {
            if (!urls || !urls.length) return;
            imgs = imgs.concat(urls); drawImgs();
          });
        };
        el.querySelector('[data-act="no"]').onclick = function () { close(); };
        el.querySelector('[data-act="yes"]').onclick = function () {
          var j = Store.newJourney({
            status: 'draft',
            location_name: el.querySelector('#fLoc2').value.trim(),
            title: el.querySelector('#fLoc2').value.trim() || '待复苏的记忆',
            category: '其他'
          });
          var side = Store.sideTemplate(Store.state.currentUserId);
          side.text = el.querySelector('#fText').value.trim();
          side.images = imgs.slice();
          j[Store.mySideKey()] = side;
          if (imgs[0]) j.cover_image = imgs[0];
          Store.addJourney(j);
          close();
          UI.toast('存下了，之后随时可以补完', 'ok');
          location.hash = '#/journeys/' + j.id;
        };
      }
    });
    return m;
  }

  /* 语音转文字：优先 Web Speech API，不支持则提示手打 */
  function startVoice(textarea) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { UI.toast('当前浏览器不支持语音转文字，直接打字吧', 'err'); textarea.focus(); return; }
    var rec = new SR();
    rec.lang = 'zh-CN'; rec.interimResults = false; rec.maxAlternatives = 1;
    UI.toast('开始说话…（说完会自动填入）');
    rec.onresult = function (e) {
      var t = e.results[0][0].transcript;
      textarea.value = (textarea.value ? textarea.value + ' ' : '') + t;
      UI.toast('听清了', 'ok');
    };
    rec.onerror = function () { UI.toast('没听清，直接打字也行', 'err'); };
    rec.start();
  }

  /* ---------------- 挂载分发 ---------------- */
  function mount(root) {
    if (!_st) return;
    if (!Store.isBonded()) return;
    switch (_st.step) {
      case 'base': mountBase(root); break;
      case 'role': mountRole(root); break;
      case 'hunter': mountHunter(root); break;
      case 'poet': mountPoet(root); break;
    }
  }

  function clear() { _st = null; }

  return { start: start, render: render, mount: mount, clear: clear, flashArchive: flashArchive };
})();
