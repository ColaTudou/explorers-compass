/* ============================================================
   探险家的罗盘 · 首页
   PRD 5.5.8 首页布局 · 4.4 反向心理学激励 · 3.4 时光机
   ============================================================ */
window.Views = window.Views || {};

Views.home = (function () {

  var calMode = 'month';      // 'month' | 'week'
  var calAnchor = null;       // 日历基准日期

  function render() {
    var me = Store.me();
    var all = Store.journeys();
    var drafts = all.filter(function (j) { return j.status === 'draft'; });
    var recent = all.slice(0, 5);
    var important = all.filter(function (j) { return j.is_important; }).slice(0, 3);

    var html = '';

    /* 问候区 */
    html += '<div class="greet mb-base">' +
      '<div class="grow"><div class="greet__hi">' + UI.greeting() + '，' + UI.esc(me ? me.nickname : '探险家') + '</div>' +
      '<div class="greet__sub">' + weekLine() + '</div></div>' +
      '<div class="avatar" id="btnSwitch" title="切换身份">' +
      UI.esc(me ? me.nickname.slice(0, 1) : '?') + '</div>' +
      '</div>';

    /* 那年今日（PRD 3.4.1） */
    var today = Recommend.todayInHistory();
    if (today) {
      var m = today.main;
      html += '<div class="today-banner mb-base" data-open="' + m.id + '">' +
        '<div class="today-banner__ico">🕰️</div>' +
        '<div class="grow"><div class="t-h3">' + UI.yearsSince(m.start_date) + ' 年前的今天</div>' +
        '<div class="t-2">' + UI.esc(m.title || m.location_name || '那一天') +
        (m.magic_code ? '　【' + UI.esc(UI.magicText(m)) + '】' : '') + '</div>' +
        (today.rest > 0 ? '<div class="t-sm mt-sm">还有 ' + today.rest + ' 条同年今日的回忆</div>' : '') +
        '</div>' + UI.icon('right', 18) + '</div>';
    }

    /* 快捷操作区 */
    html += '<div class="section"><div class="quick-grid">' +
      quick('camera', '新建旅程', 'new') +
      quick('archive', '考古复苏', 'arch') +
      quick('shuffle', '随机任意门', 'door') +
      quick('star', '愿望清单', 'wish') +
      quick('book', '我的日常', 'diary') +
      '</div></div>';

    /* AI 陪聊唤醒（PRD 4.3） */
    var pend = Awaken.pendingList();
    if (pend.length) {
      var p0 = pend[0];
      html += '<div class="section"><div class="card card--pad" style="border:1.5px solid var(--info)">' +
        '<div class="row"><div style="font-size:26px">💬</div>' +
        '<div class="grow"><div class="t-h3">关于「' + UI.esc(p0.title || p0.location_name || '那天') +
        '」，帮我确认几个小问题吧～</div>' +
        '<div class="t-cap mt-sm">这段草稿放了 ' + Math.floor(Recommend.daysSince(p0.created_at)) +
        ' 天还没补完，答 5 个小题就帮你写成一段话' +
        (pend.length > 1 ? '（还有 ' + (pend.length - 1) + ' 段）' : '') + '</div></div></div>' +
        '<button class="btn btn--primary btn--block mt-md" id="btnAwaken">开始回忆</button>' +
        '</div></div>';
    }

    /* 连续记录奖励（PRD 4.4 机制四） */
    var streak = Store.streakDays();
    if (streak >= 2) {
      var unlock = streak >= 7;
      html += '<div class="section"><div class="streak-card">' +
        '<div style="font-size:26px">' + (unlock ? '🏆' : '🔥') + '</div>' +
        '<div class="grow"><div class="t-h3">已连续记录 ' + streak + ' 天</div>' +
        '<div class="t-cap mt-sm">' + (unlock
          ? '连续 7 天达成！本周幸福密度 ' + weekDensity() + '%（只跟你们自己比，不做排行榜）'
          : '再坚持 ' + (7 - streak) + ' 天解锁一个小彩蛋') + '</div></div></div></div>';
    }

    /* 幸福密度日历（PRD 5.3.1） */
    html += '<div class="section"><div class="card card--pad">' +
      '<div class="section__head"><div class="section__title">幸福密度</div>' +
      '<div class="t-cap">色块越深，那天越开心</div></div>' +
      '<div id="cal"></div>' +
      '</div></div>';

    /* 今日推荐（罗盘入口） */
    html += '<div class="section"><div class="section__head">' +
      '<div class="section__title">今日推荐</div>' +
      '<button class="btn btn--text btn--sm" onclick="location.hash=\'#/compass\'">打开罗盘 ' + UI.icon('right', 14) + '</button>' +
      '</div>' +
      '<div class="card card--pad" id="homeRec"><div class="t-2">正在算…</div></div></div>';

    /* 重要时光轮播（PRD 3.5.5） */
    if (important.length) {
      html += '<div class="section"><div class="section__head">' +
        '<div class="section__title">⭐ 重要时光</div>' +
        '<span class="t-cap">共 ' + all.filter(function (j) { return j.is_important; }).length + ' 条</span></div>' +
        '<div class="scroll-x">' + important.map(function (j) {
          return '<div style="width:180px;cursor:pointer" class="card card--hover" data-open="' + j.id + '">' +
            UI.coverHTML(j, 'cover--card') +
            '<div style="padding:8px"><div class="t-h3 ellip">' + UI.esc(j.title || j.location_name) + '</div>' +
            '<div class="t-cap mt-sm">' + UI.dateCN(j.start_date) + '</div>' +
            '<div class="row row--tight mt-sm">' + (j.important_categories || []).map(function (c) {
              return '<span class="tag tag--plain">' + iconOf(c) + ' ' + UI.esc(c) + '</span>';
            }).join('') + '</div></div></div>';
        }).join('') + '</div></div>';
    }

    /* 最近旅程 */
    html += '<div class="section"><div class="section__head">' +
      '<div class="section__title">最近旅程</div>' +
      '<button class="btn btn--text btn--sm" onclick="location.hash=\'#/journeys\'">全部 ' + UI.icon('right', 14) + '</button>' +
      '</div>';
    if (!recent.length) {
      html += '<div class="empty"><div class="empty__icon">🗺️</div>' +
        '<div class="empty__title">还没有任何记录</div>' +
        '<div class="empty__desc">先来一次「闪电存档」，一张图一句话就够了</div>' +
        '<button class="btn btn--primary" onclick="Views.record.flashArchive()">⚡ 现在就存一条</button></div>';
    } else {
      html += '<div class="col">' + recent.map(function (j) {
        return '<div class="card card--pad card--hover row" data-open="' + j.id + '" style="cursor:pointer">' +
          UI.coverHTML(j, 'cover--thumb') +
          '<div class="jcard__body">' +
          '<div class="jcard__title ellip">' + UI.esc(j.title || j.location_name || '未命名') + '</div>' +
          '<div class="jcard__meta"><span>' + UI.dateCN(j.start_date) + '</span>' +
          '<span>' + DATA.categoryEmoji[j.category] + ' ' + j.category + '</span></div>' +
          '<div class="row row--between">' + UI.statusTag(j) + UI.scorePair(j) + '</div>' +
          '</div></div>';
      }).join('') + '</div>';
    }
    html += '</div>';

    /* 时光胶囊到期提醒（PRD 7.3） */
    var readyCap = Store.readyCapsules ? Store.readyCapsules() : [];
    if (readyCap.length) {
      html += '<div class="section"><div class="card card--pad" data-cap="1" style="cursor:pointer;' +
        'border:1.5px solid var(--warn);background:var(--warn-light)">' +
        '<div class="row"><div style="font-size:26px">💊</div>' +
        '<div class="grow"><div class="t-h3">有 ' + readyCap.length + ' 颗时光胶囊可以开启了</div>' +
        '<div class="t-cap">' + UI.esc(readyCap[0].title) + ' · 写于 ' +
        UI.dateCN(readyCap[0].created_at) + '</div></div>' +
        UI.icon('right', 18) + '</div></div></div>';
    }

    /* 半成品展览（PRD 4.4 机制二） */
    if (drafts.length) {
      html += '<div class="section"><div class="card card--pad" style="border:1.5px dashed var(--warn)">' +
        '<div class="row row--between"><div>' +
        '<div class="t-h3">还有 ' + drafts.length + ' 段记忆等着复苏</div>' +
        '<div class="t-cap">草稿放着也是放着，花 2 分钟补完它</div></div>' +
        '<button class="btn btn--secondary btn--sm" onclick="location.hash=\'#/journeys\'">去看看</button>' +
        '</div></div></div>';
    }

    html += '<div style="height:var(--xl)"></div>';
    return html;
  }

  function iconOf(c) {
    var hit = DATA.importantCategories.filter(function (x) { return x.key === c; })[0];
    return hit ? hit.icon : '⭐';
  }

  function quick(ico, label, act) {
    return '<button class="quick" data-quick="' + act + '">' +
      '<span class="quick__ico">' + UI.icon(ico, 20) + '</span>' +
      '<span>' + label + '</span></button>';
  }

  function weekLine() {
    var s = Recommend.weekStats();
    if (s.count === 0) return '这周还没记录，罗盘有点饿了 🥺';
    if (s.count < 3) return '这周记录了 ' + s.count + ' 次，继续涂红日历吧';
    return '这周记录了 ' + s.count + ' 次，幸福密度不错 👏';
  }

  /* 本周幸福密度：近 7 天里有记录的天数占比 */
  function weekDensity() {
    var set = {};
    Store.state.journeys.forEach(function (j) { set[Store.fmtYMD(j.start_date)] = true; });
    var hit = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(); d.setDate(d.getDate() - i);
      if (set[Store.fmtYMD(d.toISOString())]) hit++;
    }
    return Math.round(hit / 7 * 100);
  }

  /* ---------------- 日历（支持月视图 / 周视图，PRD 5.1） ---------------- */
  var calMode = 'month';      // 'month' | 'week'
  var calAnchor = null;       // 基准日期

  function buildCellMap() {
    var map = {};
    Store.journeys().forEach(function (j) {
      var k = Store.fmtYMD(j.start_date);
      map[k] = map[k] || { score: null, ids: [], imp: false, n: 0 };
      map[k].ids.push(j.id);
      map[k].n++;
      if (j.is_important) map[k].imp = true;
      var sc = avgScore(j);
      if (sc !== null) map[k].score = map[k].score === null ? sc : (map[k].score + sc) / 2;
    });
    return map;
  }

  function drawCal(container) {
    var anchor = calAnchor ? new Date(calAnchor) : new Date();
    var cellOf = buildCellMap();
    var head = '<div class="cal__head">' +
      '<button class="cal__nav" data-mv="-1">' + UI.icon('left', 18) + '</button>' +
      '<div class="cal__month">' + titleOf(anchor) + '</div>' +
      '<button class="cal__nav" data-mv="1">' + UI.icon('right', 18) + '</button>' +
      '</div>' +
      '<div class="row row--center mb-md">' +
      '<button class="slider-opt' + (calMode === 'month' ? ' is-on' : '') + '" data-mode="month" style="flex:none;width:76px;height:30px">月</button>' +
      '<button class="slider-opt' + (calMode === 'week' ? ' is-on' : '') + '" data-mode="week" style="flex:none;width:76px;height:30px">周</button>' +
      '</div>';

    var body = calMode === 'week' ? weekHTML(anchor, cellOf) : monthHTML(anchor, cellOf);
    container.innerHTML = head + body;

    container.querySelectorAll('[data-mv]').forEach(function (b) {
      b.onclick = function () {
        var nx = new Date(anchor);
        if (calMode === 'week') nx.setDate(nx.getDate() + 7 * Number(b.dataset.mv));
        else nx = new Date(nx.getFullYear(), nx.getMonth() + Number(b.dataset.mv), 1);
        calAnchor = nx.toISOString();
        drawCal(container);
      };
    });
    container.querySelectorAll('[data-mode]').forEach(function (b) {
      b.onclick = function () { calMode = b.dataset.mode; drawCal(container); };
    });
    bindDayCells(container, cellOf);
  }

  function titleOf(a) {
    if (calMode === 'week') {
      var s = new Date(a); s.setDate(s.getDate() - s.getDay());
      var e = new Date(s); e.setDate(e.getDate() + 6);
      return (s.getMonth() + 1) + '月' + s.getDate() + '日 – ' + (e.getMonth() + 1) + '月' + e.getDate() + '日';
    }
    return a.getFullYear() + ' 年 ' + (a.getMonth() + 1) + ' 月';
  }

  function monthHTML(anchor, cellOf) {
    var y = anchor.getFullYear(), m = anchor.getMonth();
    var first = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var todayStr = Store.fmtYMD(new Date().toISOString());

    var wd = ['日', '一', '二', '三', '四', '五', '六'].map(function (d) {
      return '<div class="cal__wd">' + d + '</div>';
    }).join('');

    var cells = '';
    for (var i = 0; i < first; i++) cells += '<div class="cal__cell cal__cell--out"></div>';
    var total = 0, sum = 0;
    for (var d = 1; d <= days; d++) {
      var key = y + '-' + Store.pad(m + 1) + '-' + Store.pad(d);
      var c = cellOf[key];
      var cls = 'cal__cell', style = '';
      if (key === todayStr) cls += ' cal__cell--today';
      if (c) {
        var sc = c.score;
        style = 'background:' + (sc === null ? 'var(--m0)' : moodColor(sc)) + ';color:#fff';
        cls += ' cal__cell--has';
        if (c.imp) cls += ' cal__cell--important';
        if (sc !== null) { total++; sum += sc; }
        cells += '<div class="' + cls + '" style="' + style + '" data-day="' + key + '">' + d + '</div>';
      } else {
        cells += '<div class="' + cls + ' cal__cell--empty" data-day="' + key + '">' + d + '</div>';
      }
    }

    var prefix = y + '-' + Store.pad(m + 1);
    var count = Object.keys(cellOf).filter(function (k) { return k.indexOf(prefix) === 0; }).length;
    return '<div class="cal__grid">' + wd + cells + '</div>' +
      '<div class="cal__stat">' +
      '<div>本月探险 <b class="t-num">' + count + '</b> 次</div>' +
      '<div>平均评分 <b class="t-num">' + (total ? (sum / total).toFixed(1) : '—') + '</b></div>' +
      '</div>' + legendHTML();
  }

  function weekHTML(anchor, cellOf) {
    var s = new Date(anchor); s.setDate(s.getDate() - s.getDay());
    var todayStr = Store.fmtYMD(new Date().toISOString());
    var cols = '';
    var total = 0, sum = 0, cnt = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(s); d.setDate(d.getDate() + i);
      var key = Store.fmtYMD(d.toISOString());
      var c = cellOf[key];
      var h = c ? Math.max(14, Math.round((c.score || 1) / 5 * 56)) : 0;
      if (c) {
        cnt += c.n;
        if (c.score !== null) { total++; sum += c.score; }
      }
      cols += '<div class="wk__col' + (key === todayStr ? ' is-today' : '') + '" data-day="' + key + '">' +
        '<div class="t-cap">' + '日一二三四五六'[d.getDay()] + '</div>' +
        '<div class="t-h3 t-num">' + d.getDate() + '</div>' +
        '<div class="wk__bar" style="height:' + h + 'px' +
        (c ? ';background:' + (c.score === null ? 'var(--m0)' : moodColor(c.score)) : '') + '"></div>' +
        '<div class="t-sm">' + (c ? c.n + ' 次' : '—') + '</div>' +
        '</div>';
    }
    return '<div class="wk">' + cols + '</div>' +
      '<div class="cal__stat">' +
      '<div>本周探险 <b class="t-num">' + cnt + '</b> 次</div>' +
      '<div>平均评分 <b class="t-num">' + (total ? (sum / total).toFixed(1) : '—') + '</b></div>' +
      '</div>' + legendHTML();
  }

  function legendHTML() {
    return '<div class="cal__legend"><span>低</span>' +
      '<i style="background:var(--m1)"></i><i style="background:var(--m2)"></i>' +
      '<i style="background:var(--m3)"></i><i style="background:var(--m4)"></i>' +
      '<i style="background:var(--m5)"></i><span>高</span></div>';
  }

  function bindDayCells(container, cellOf) {
    container.querySelectorAll('[data-day]').forEach(function (cell) {
      cell.onclick = function () {
        var k = cell.dataset.day;
        var c = cellOf[k];
        if (!c) { UI.toast('这天还没有探险记录哦'); return; }
        if (c.ids.length === 1) { location.hash = '#/journeys/' + c.ids[0]; return; }
        UI.modal({
          title: k + ' 的回忆',
          body: c.ids.map(function (id) {
            var j = Store.getJourney(id);
            if (!j) return '';
            return '<div class="card card--pad row mb-md" data-open="' + id + '" style="cursor:pointer">' +
              UI.coverHTML(j, 'cover--thumb') +
              '<div class="grow"><div class="t-h3">' + UI.esc(j.title || j.location_name) + '</div>' +
              '<div class="t-cap mt-sm">' + DATA.categoryEmoji[j.category] + ' ' + j.category + ' · ' + UI.scorePair(j) + '</div></div></div>';
          }).join(''),
          footer: false,
          onMount: function (el, close) {
            el.querySelectorAll('[data-open]').forEach(function (x) {
              x.onclick = function () { close(); location.hash = '#/journeys/' + x.dataset.open; };
            });
          }
        });
      };
    });
  }

  function avgScore(j) {
    var a = j.a_side && j.a_side.score, b = j.b_side && j.b_side.score;
    if (a && b) return (a + b) / 2;
    return a || b || null;
  }

  function moodColor(sc) {
    if (sc >= 4.5) return 'var(--m5)';
    if (sc >= 3.5) return 'var(--m4)';
    if (sc >= 2.5) return 'var(--m3)';
    if (sc >= 1.5) return 'var(--m2)';
    return 'var(--m1)';
  }

  /* ---------------- 挂载 ---------------- */
  function mount(root) {
    var cal = root.querySelector('#cal');
    if (cal) drawCal(cal);

    root.querySelectorAll('[data-quick]').forEach(function (b) {
      b.onclick = function () {
        switch (b.dataset.quick) {
          case 'new': Views.record.clear(); Views.record.start(); break;
          case 'arch': Views.archaeology.clear(); location.hash = '#/archaeology'; break;
          case 'door': openDoor(); break;
          case 'wish': location.hash = '#/wishes'; break;
          case 'diary':
            location.hash = '#/diary';
            if (Views.diary && Views.diary.compose) setTimeout(function () { Views.diary.compose(null); }, 80);
            break;
        }
      };
    });

    var ba = root.querySelector('#btnAwaken');
    if (ba) ba.onclick = function () {
      Views.awaken.start(Awaken.pendingList()[0].id);
    };

    root.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/journeys/' + el.dataset.open; };
    });

    root.querySelectorAll('[data-cap]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/capsule'; };
    });

    var sw = root.querySelector('#btnSwitch');
    if (sw) sw.onclick = function () { switchIdentity(); };

    /* 首页轻量推荐（取 Top1 + 勇敢者） */
    var box = root.querySelector('#homeRec');
    if (box) {
      var r = Recommend.run({ weather: '晴', mood: 'normal', budget: 'normal' });
      if (r.empty) {
        box.innerHTML = '<div class="t-2">记录还太少，罗盘算不出来。先存两条再来～</div>';
      } else {
        var t1 = r.top3[0];
        box.innerHTML = '<div class="row">' +
          '<span class="rec-rank">1</span>' +
          '<div class="grow"><div class="t-h3">' + UI.esc(t1.j.location_name) + '</div>' +
          '<div class="t-cap">' + DATA.categoryEmoji[t1.j.category] + ' ' + t1.j.category +
          ' · 权重 ' + t1.w.toFixed(2) + '</div></div>' +
          '<button class="btn btn--sm btn--primary" onclick="location.hash=\'#/compass\'">看看</button>' +
          '</div>' +
          (r.brave ? '<hr class="divider"><div class="t-2">' + UI.icon('sparkle', 14) +
            ' 勇敢者之选：' + UI.esc(r.brave.name) + '（' + r.brave.category + '）</div>' : '');
      }
    }
  }

  /* ---------------- 随机任意门（PRD 3.4.2） ---------------- */
  function openDoor() {
    var j = Recommend.randomDoor();
    if (!j) { UI.toast('还没有已归档的旅程可以抽取'); return; }
    UI.modal({
      title: '🚪 随机任意门',
      sub: '抽到了一段回忆，先只看个模糊的影子',
      body: '<div class="door">' +
        '<div class="door__cover" id="dc">' +
        (j.cover_image && j.cover_image.indexOf('data:') === 0
          ? '<img src="' + j.cover_image + '">'
          : '<div style="position:absolute;inset:0;filter:blur(16px);background:' +
          'linear-gradient(135deg,' + DATA.colorHex(j.magic_code ? j.magic_code.color : '琥珀色') + ',#8B7662)"></div>') +
        '<div class="door__mark">？</div>' +
        '</div>' +
        '<div class="t-h2 mt-base">' + UI.esc(j.location_name || '某个地方') + '</div>' +
        '<div class="t-2 mt-sm">' + UI.dateCN(j.start_date) + ' · ' + DATA.categoryEmoji[j.category] + ' ' + j.category + '</div>' +
        '<div class="t-cap mt-sm">揭晓后这段旅程的回顾次数 +1</div>' +
        '</div>',
      footer: '<button class="btn btn--secondary" data-act="again">换一个</button>' +
        '<button class="btn btn--primary" data-act="yes">揭晓回忆</button>',
      onMount: function (el, close) {
        el.querySelector('[data-act="again"]').onclick = function () { close(); openDoor(); };
        el.querySelector('[data-act="yes"]').onclick = function () { close(); location.hash = '#/journeys/' + j.id; };
      }
    });
  }

  /* ---------------- 身份切换 ---------------- */
  function switchIdentity() {
    var p = Store.partner();
    if (!p) { UI.toast('还没有绑定搭档'); return; }
    UI.confirm({
      title: '切换到「' + p.nickname + '」的视角？',
      text: '本机模拟双人切换。切换后你将以 TA 的身份记录和确认，用于体验「双面叙事」。',
      okText: '切换'
    }).then(function (ok) {
      if (!ok) return;
      Store.switchIdentity();
      UI.toast('现在是 ' + Store.me().nickname + ' 的视角', 'ok');
      App.render();
    });
  }

  return { render: render, mount: mount, openDoor: openDoor };
})();
