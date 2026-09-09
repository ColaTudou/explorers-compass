/* ============================================================
   探险家的罗盘 · 星光集（重要时光列表）
   PRD 3.5.4：瀑布流 / 时间轴 / 分类 三种视图 + 搜索 + 统计
   ============================================================ */
window.Views = window.Views || {};

Views.starlight = (function () {

  var view = 'waterfall';    // waterfall | timeline | category
  var kw = '';

  function list() {
    return Store.journeys().filter(function (j) { return j.is_important; });
  }

  function filtered() {
    var l = list();
    if (!kw) return l;
    var k = kw.toLowerCase();
    return l.filter(function (j) {
      var hay = [j.title, j.location_name, j.category,
      DATA.tagNames((j.consensus && j.consensus.tags) || []).join(' '),
      (j.important_categories || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(k) >= 0;
    });
  }

  function render() {
    var all = list();
    var l = filtered();

    var html = '' +
      '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<h1 class="t-h1">⭐ 星光集</h1>' +
      '<p class="t-2 mt-sm mb-base">被你们亲手标记为「重要」的时刻，都收在这里</p>';

    /* 统计 */
    var counts = {};
    all.forEach(function (j) {
      (j.important_categories || []).forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    });
    html += '<div class="card card--pad mb-base">' +
      '<div class="row row--between mb-md">' +
      '<div><div class="t-h2">' + all.length + ' 个重要时光</div>' +
      '<div class="t-cap">占全部旅程的 ' + pct(all.length, Store.state.journeys.length) + '%</div></div>' +
      '<div style="font-size:30px">✨</div></div>' +
      (Object.keys(counts).length
        ? '<div class="row row--wrap">' + Object.keys(counts).map(function (c) {
          return '<span class="tag tag--plain">' + iconOf(c) + ' ' + UI.esc(c) + ' ' + counts[c] + '</span>';
        }).join('') + '</div>'
        : '<div class="t-cap">还没有分类标签</div>') +
      '</div>';

    /* 搜索 + 视图切换 */
    html += '<div class="field"><input class="input" id="slKw" placeholder="搜地点 / 标题 / 标签 / 分类" value="' + UI.esc(kw) + '"></div>';
    html += '<div class="row row--center mb-base">' +
      ['waterfall:瀑布流', 'timeline:时间轴', 'category:分类'].map(function (s) {
        var p = s.split(':');
        return '<button class="slider-opt' + (view === p[0] ? ' is-on' : '') + '" data-view="' + p[0] +
          '" style="flex:1;height:34px">' + p[1] + '</button>';
      }).join('') + '</div>';

    if (!l.length) {
      html += '<div class="empty"><div class="empty__icon">⭐</div>' +
        '<div class="empty__title">' + (all.length ? '没搜到' : '还没有重要时光') + '</div>' +
        '<div class="empty__desc">' + (all.length ? '换个词试试' :
          '在旅程详情页点「标记重要时光」，就能把它收进这里') + '</div></div>';
      return html + '<div style="height:var(--xxl)"></div>';
    }

    if (view === 'waterfall') html += waterfall(l);
    else if (view === 'timeline') html += timeline(l);
    else html += byCategory(l);

    return html + '<div style="height:var(--xxl)"></div>';
  }

  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }

  function iconOf(c) {
    var hit = DATA.importantCategories.filter(function (x) { return x.key === c; })[0];
    return hit ? hit.icon : '⭐';
  }

  function cats(j) {
    return (j.important_categories || []).slice(0, 2).map(function (c) {
      return '<span class="tag tag--plain">' + iconOf(c) + ' ' + UI.esc(c) + '</span>';
    }).join('');
  }

  /* 瀑布流：两列错落 */
  function waterfall(l) {
    return '<div class="sl-grid">' + l.map(function (j, i) {
      var tall = i % 3 === 0;
      return '<div class="sl-card' + (tall ? ' sl-card--tall' : '') + '" data-open="' + j.id + '">' +
        UI.coverHTML(j, 'cover--card', 'sl-card__cover' + (tall ? ' sl-card__cover--tall' : '')) +
        '<div class="sl-card__body">' +
        '<div class="t-h3 ellip">' + UI.esc(j.title || j.location_name || '未命名') + '</div>' +
        '<div class="t-cap mt-sm">' + UI.dateCN(j.start_date) + '</div>' +
        '<div class="row row--tight mt-sm">' + cats(j) + '</div>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* 时间轴：按年份分组 */
  function timeline(l) {
    var byYear = {};
    l.forEach(function (j) {
      var y = new Date(j.start_date).getFullYear();
      byYear[y] = byYear[y] || [];
      byYear[y].push(j);
    });
    return Object.keys(byYear).sort(function (a, b) { return b - a; }).map(function (y) {
      return '<div class="tl-year"><div class="tl-year__label">' + y + '</div>' +
        byYear[y].map(function (j) {
          return '<div class="tl-item" data-open="' + j.id + '">' +
            '<div class="tl-item__dot"></div>' +
            '<div class="card card--pad grow">' +
            '<div class="row row--between"><div class="t-h3">' +
            UI.esc(j.title || j.location_name || '未命名') + '</div>' +
            '<div class="t-cap">' + UI.dateCNShort(j.start_date) + '</div></div>' +
            (j.magic_code ? '<div class="t-cap mt-sm">' + UI.esc(UI.magicText(j)) + '</div>' : '') +
            '<div class="row row--tight mt-sm">' + cats(j) + '</div>' +
            '</div></div>';
        }).join('') + '</div>';
    }).join('');
  }

  /* 分类视图：以分类为 Tab */
  function byCategory(l) {
    var groups = {};
    l.forEach(function (j) {
      var cs = j.important_categories || [];
      if (!cs.length) cs = ['未分类'];
      cs.forEach(function (c) { groups[c] = groups[c] || []; groups[c].push(j); });
    });
    return Object.keys(groups).map(function (c) {
      return '<div class="section"><div class="section__head">' +
        '<div class="section__title">' + iconOf(c) + ' ' + UI.esc(c) + '</div>' +
        '<span class="t-cap">' + groups[c].length + ' 条</span></div>' +
        '<div class="col">' + groups[c].map(function (j) {
          return '<div class="card card--pad card--hover row" data-open="' + j.id + '" style="cursor:pointer">' +
            UI.coverHTML(j, 'cover--thumb') +
            '<div class="grow"><div class="t-h3">' + UI.esc(j.title || j.location_name) + '</div>' +
            '<div class="t-cap mt-sm">' + UI.dateCN(j.start_date) + ' · ' +
            DATA.categoryEmoji[j.category] + ' ' + j.category + '</div></div>' +
            UI.scorePair(j) + '</div>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function mount(root) {
    var kwEl = root.querySelector('#slKw');
    if (kwEl) {
      var t;
      kwEl.oninput = function () {
        clearTimeout(t);
        t = setTimeout(function () {
          kw = kwEl.value.trim();
          var pos = kwEl.selectionStart;
          App.render();
          var el = document.querySelector('#slKw');
          if (el) { el.focus(); el.setSelectionRange(pos, pos); }
        }, 300);
      };
    }
    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.onclick = function () { view = b.dataset.view; App.render(); };
    });
    root.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/journeys/' + el.dataset.open; };
    });
  }

  return { render: render, mount: mount };
})();
