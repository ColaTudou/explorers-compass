/* ============================================================
   探险家的罗盘 · 决策模块
   PRD 3.3 探险家的罗盘推荐引擎
   ============================================================ */
window.Views = window.Views || {};

Views.compass = (function () {

  var opt = { weather: '晴', mood: 'normal', budget: 'normal', cat: '' };
  var result = null;
  var spin = 0;
  var wx = null;          // 真实天气结果
  var wxTried = false;    // 每次进入页面只自动取一次，避免重渲染死循环

  function render() {
    return '' +
      '<div class="compass-hero mb-base">' +
      '<div class="compass-dial"><div class="compass-dial__needle" id="needle" style="transform:rotate(0deg)"></div></div>' +
      '<h1 class="t-h1">今天去哪儿？</h1>' +
      '<p class="t-2 mt-sm">基于你们的 ' +
      Store.state.journeys.filter(function (j) { return j.status === 'archived' || j.status === 'sealed'; }).length +
      ' 段共同记忆来算</p>' +
      '<div id="wxBar" class="mt-sm"></div>' +
      '<button class="btn btn--primary btn--lg mt-base" id="btnGo">' + UI.icon('compass', 18, 2, '#fff') + ' 转一下罗盘</button>' +
      '</div>' +

      '<div class="card card--pad mb-base">' +
      '<div class="field"><label class="field__label">现在什么天气？' +
      '<span id="wxHint" class="t-sm"></span></label>' +
      '<div class="slider-row" id="wRow">' + DATA.weathers.map(function (w) {
        return '<button class="slider-opt' + (opt.weather === w ? ' is-on' : '') + '" data-w="' + w + '">' +
          DATA.weatherEmoji[w] + ' ' + w + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">心情怎么样？</label>' +
      '<div class="slider-row" id="mRow">' + UI.MOODS.map(function (m) {
        return '<button class="slider-opt' + (opt.mood === m.v ? ' is-on' : '') + '" data-m="' + m.v + '">' + m.t + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">预算呢？</label>' +
      '<div class="slider-row" id="bRow">' + UI.BUDGETS.map(function (b) {
        return '<button class="slider-opt' + (opt.budget === b.v ? ' is-on' : '') + '" data-b="' + b.v + '">' + b.t + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field" style="margin-bottom:0"><label class="field__label">只看某类（可留空）</label>' +
      '<div class="row row--wrap" id="cRow">' +
      '<button class="tag tag--click' + (opt.cat === '' ? ' tag--on' : '') + '" data-c="">不限</button>' +
      DATA.categories.map(function (c) {
        return '<button class="tag tag--click' + (opt.cat === c ? ' tag--on' : '') + '" data-c="' + c + '">' +
          DATA.categoryEmoji[c] + ' ' + c + '</button>';
      }).join('') + '</div></div>' +
      '</div>' +

      '<div id="out"></div>' +
      '<div style="height:var(--xxl)"></div>';
  }

  function mount(root) {
    bindRow(root, '#wRow [data-w]', function (v) { opt.weather = v; setManual(); }, 'w');
    bindRow(root, '#mRow [data-m]', function (v) { opt.mood = v; }, 'm');
    bindRow(root, '#bRow [data-b]', function (v) { opt.budget = v; }, 'b');
    bindRow(root, '#cRow [data-c]', function (v) { opt.cat = v; }, 'c');

    root.querySelector('#btnGo').onclick = function () {
      spin += 720 + Math.floor(Math.random() * 360);
      var n = root.querySelector('#needle');
      if (n) n.style.transform = 'rotate(' + spin + 'deg)';
      result = Recommend.run({
        weather: opt.weather, mood: opt.mood, budget: opt.budget,
        categoryFilter: opt.cat ? [opt.cat] : []
      });
      drawOut(root.querySelector('#out'));
    };

    /* 真实天气：进入页面自动取一次，拿到了就覆盖手动选择 */
    if (!wxTried && Weather.settings().auto !== false) {
      wxTried = true;
      drawWx(root);
      Weather.get().then(function (r) {
        wx = r;
        if (r && r.text) opt.weather = r.text;
        App.render();
      });
    } else {
      drawWx(root);
    }

    if (result) drawOut(root.querySelector('#out'));
  }

  /* 用户手动改天气 → 关掉自动，避免下次重渲染又覆盖掉 */
  function setManual() {
    if (Weather.settings().auto !== false) {
      Weather.save({ auto: false });
      wx = null;
    }
  }

  function drawWx(root) {
    var bar = root.querySelector('#wxBar');
    var hint = root.querySelector('#wxHint');
    if (hint) {
      hint.innerHTML = Weather.settings().auto === false
        ? ' <span class="t-sm">（手动）</span>'
        : ' <span class="t-sm">（自动获取中…）</span>';
    }
    if (!bar) return;
    if (wx) {
      bar.innerHTML = '<div class="row row--center" style="gap:6px">' +
        '<span class="tag tag--success">' + (DATA.weatherEmoji[wx.text] || '') + ' ' +
        wx.text + ' ' + wx.temp + '°C</span>' +
        '<span class="t-cap">' + UI.esc(wx.label || '') + (wx.fromCache ? ' · 缓存' : '') + '</span>' +
        '</div>';
      if (hint) hint.innerHTML = ' <span class="t-sm">（自动 · ' + UI.esc(wx.label || '') + '）</span>';
    } else if (Weather.settings().auto === false) {
      bar.innerHTML = '<span class="t-cap">已手动选择 · ' +
        '<button class="btn btn--text btn--mini" id="wxAuto">恢复自动获取</button></span>';
      var a = root.querySelector('#wxAuto');
      if (a) a.onclick = function () {
        Weather.save({ auto: true }); wxTried = false; App.render();
      };
    }
  }

  function bindRow(root, sel, setter) {
    root.querySelectorAll(sel).forEach(function (b) {
      b.onclick = function () {
        var val = b.dataset.w || b.dataset.m || b.dataset.b || b.dataset.c;
        setter(val);
        var parent = b.parentNode;
        parent.querySelectorAll('.slider-opt,.tag').forEach(function (x) { x.classList.remove('is-on', 'tag--on'); });
        b.classList.add('is-on'); b.classList.add('tag--on');
      };
    });
  }

  function drawOut(box) {
    if (!box || !result) return;
    if (result.empty) {
      box.innerHTML = '<div class="empty"><div class="empty__icon">🧭</div>' +
        '<div class="empty__title">罗盘没算出东西</div>' +
        '<div class="empty__desc">可能记录太少，或者都被黑名单/近因过滤掉了。<br>先去存两条回忆吧。</div></div>';
      return;
    }

    var h = '';

    /* 节日主题（PRD 7.3 季节/节日主题推荐） */
    if (result.festival) {
      h += '<div class="card card--pad mb-base" style="border-left:4px solid var(--warn)">' +
        '<div class="row"><div style="font-size:24px">' + result.festival.emoji + '</div>' +
        '<div class="grow"><div class="t-h3">' + UI.esc(result.festival.name) + '到了</div>' +
        '<div class="t-cap">' + UI.esc(result.festival.tip) + ' · 契合的目的地已加权 +0.4</div>' +
        '</div></div></div>';
    }

    /* 文案 + 天气关怀（先用本地模板秒出，LLM 结果到了再替换） */
    h += '<div class="word-bubble mb-base" id="copyBox">' +
      '<span id="copyBadge" class="tag tag--success hide" style="margin-bottom:8px">✨ AI 生成</span>' +
      '<div id="copyText">' + UI.esc(result.copy) + '</div>' +
      '<div class="t-2 mt-md" id="careText">' + UI.icon('cloud', 14) + ' ' + UI.esc(result.care) + '</div>' +
      '</div>';

    /* 保守之选 Top 3 */
    h += '<div class="section"><div class="section__head"><div class="section__title">保守之选</div>' +
      '<span class="t-cap">你们验证过的好地方</span></div>';
    h += result.top3.map(function (s, i) {
      var j = s.j;
      return '<div class="card card--pad rec-card mb-md" data-open="' + j.id + '" style="cursor:pointer">' +
        '<div class="row"><span class="rec-rank rec-rank--' + (i + 1) + '">' + (i + 1) + '</span>' +
        '<div class="grow"><div class="t-h3">' + UI.esc(j.title || j.location_name) + '</div>' +
        '<div class="t-cap mt-sm">' + DATA.categoryEmoji[j.category] + ' ' + j.category +
        (j.location_name ? ' · ' + UI.icon('pin', 12) + UI.esc(j.location_name) : '') + '</div></div>' +
        '<div class="t-center"><div class="t-h3 t-num">' + s.w.toFixed(2) + '</div>' +
        '<div class="t-sm">权重</div></div></div>' +
        '<div class="row row--wrap mt-sm">' + (j.consensus && j.consensus.tags ? j.consensus.tags.slice(0, 4).map(function (t) {
          return '<span class="tag tag--plain">' + UI.esc(DATA.tagNames([t])[0]) + '</span>';
        }).join('') : '') + '</div>' +
        '<details class="mt-sm"><summary class="t-cap" style="cursor:pointer">权重是怎么算出来的？</summary>' +
        '<div class="t-sm mt-sm">' + s.parts.map(function (p) {
          return '<div>' + UI.esc(p.k) + '：<b class="t-num">' + p.v + '</b></div>';
        }).join('') + '</div></details>' +
        '</div>';
    }).join('');
    h += '</div>';

    /* 跨界组合 */
    if (result.cross) {
      h += '<div class="section"><div class="section__head"><div class="section__title">跨界组合</div>' +
        '<span class="t-cap">' + result.cross.catA + ' + ' + result.cross.catB + '</span></div>' +
        '<div class="card card--pad">' +
        '<div class="row"><div class="grow"><div class="t-h3">' + UI.esc(result.cross.a.title || result.cross.a.location_name) + '</div>' +
        '<div class="t-cap">' + result.cross.catA + '</div></div>' +
        '<span class="t-h2 t-muted">＋</span>' +
        '<div class="grow t-center"><div class="t-h3">' + UI.esc(result.cross.b.title || result.cross.b.location_name) + '</div>' +
        '<div class="t-cap">' + result.cross.catB + '</div></div></div>' +
        '<div class="t-2 mt-md">先去「' + UI.esc(result.cross.a.location_name) + '」，再顺路去「' +
        UI.esc(result.cross.b.location_name) + '」，一条线走完两种快乐。</div>' +
        '</div></div>';
    }

    /* 勇敢者之选 */
    h += '<div class="section"><div class="section__head"><div class="section__title">勇敢者之选</div>' +
      '<span class="t-cap">' + (result.brave.fallback ? '换个花样' : '没试过的分类：' + result.brave.category) + '</span></div>' +
      '<div class="card card--pad" style="border-left:4px solid var(--warn)">' +
      '<div class="row"><div class="t-h2">' + UI.icon('sparkle', 20) + '</div>' +
      '<div class="grow"><div class="t-h3">' + UI.esc(result.brave.name) + '</div>' +
      '<div class="t-cap">' + result.brave.category + ' · 你们还没试过这一类</div></div></div>' +
      '<button class="btn btn--secondary btn--sm mt-md" id="btnWish">加进愿望清单</button>' +
      '</div></div>';

    /* 算法过程 */
    h += '<div class="section"><details><summary class="section__title" style="cursor:pointer">算法过程（PRD 3.3.3 九步）</summary>' +
      '<div class="card card--pad mt-md">' + result.trace.map(function (t) {
        return '<div class="row" style="align-items:flex-start;gap:8px;padding:6px 0">' +
          '<div style="width:110px;flex:none" class="t-cap">' + UI.esc(t.step) + '</div>' +
          '<div class="t-2 grow">' + UI.esc(t.text) + '</div></div>';
      }).join('') + '</div></details></div>';

    box.innerHTML = h;

    box.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/journeys/' + el.dataset.open; };
    });
    var bw = box.querySelector('#btnWish');
    if (bw) bw.onclick = function () {
      Store.addWish({ title: result.brave.name, category: result.brave.category });
      UI.toast('已加进愿望清单', 'ok');
    };

    enhanceCopy(box, result);
  }

  /* 用真 LLM 重写文案；失败静默保留本地模板 */
  function enhanceCopy(box, r) {
    if (!LLM.isOn() || !r || r.empty) return;
    var cbox = box.querySelector('#copyBox');
    if (!cbox || cbox.dataset.llm === '1') return;
    cbox.dataset.llm = '1';

    var t1 = r.top3[0].j;
    LLM.writeCopy({
      weather: r.weather,
      slot: r.slot,
      top1: t1.title || t1.location_name || '',
      top1cat: t1.category,
      top1score: Recommend.baseScore(t1).toFixed(1),
      cross: !!r.cross,
      crossA: r.cross ? (r.cross.a.title || r.cross.a.location_name) : '',
      crossAcat: r.cross ? r.cross.catA : '',
      crossB: r.cross ? (r.cross.b.title || r.cross.b.location_name) : '',
      crossBcat: r.cross ? r.cross.catB : '',
      brave: r.brave ? r.brave.name : '',
      bravecat: r.brave ? r.brave.category : '',
      festival: r.festival ? r.festival.name : ''
    }).then(function (o) {
      var copyEl = box.querySelector('#copyText');
      if (copyEl && o.copy) copyEl.textContent = o.copy;
      var careEl = box.querySelector('#careText');
      if (careEl && o.care) careEl.innerHTML = UI.icon('cloud', 14) + ' ' + UI.esc(o.care);
      var badge = box.querySelector('#copyBadge');
      if (badge) badge.classList.remove('hide');
    }).catch(function () {
      // 静默回退：本地模板已经在页面上，什么都不用做
      if (cbox) cbox.dataset.llm = '0';
    });
  }

  return { render: render, mount: mount };
})();
