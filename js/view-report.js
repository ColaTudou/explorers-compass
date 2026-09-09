/* ============================================================
   探险家的罗盘 · 年度探险报告
   PRD 7.3：数据可视化 + 可印刷成册
   ============================================================ */
window.Views = window.Views || {};

Views.report = (function () {

  var year = null;

  function years() {
    var set = {};
    Store.state.journeys.forEach(function (j) {
      set[new Date(j.start_date).getFullYear()] = true;
    });
    set[new Date().getFullYear()] = true;
    return Object.keys(set).map(Number).sort(function (a, b) { return b - a; });
  }

  function ofYear(y) {
    return Store.state.journeys.filter(function (j) {
      return new Date(j.start_date).getFullYear() === y;
    });
  }

  function stats(list) {
    var s = {
      total: list.length,
      archived: 0, days: 0, cats: {}, avg: 0, scoreSum: 0, scoreN: 0,
      important: 0, expense: 0, expenseN: 0, top: null, topScore: -1,
      byMonth: {}, tags: {}, magic: {}, annotations: 0, photos: 0
    };
    var daySet = {};
    list.forEach(function (j) {
      s.days = 0;
      daySet[Store.fmtYMD(j.start_date)] = true;
      if (j.status === 'archived' || j.status === 'sealed') s.archived++;
      if (j.is_important) s.important++;
      s.cats[j.category] = (s.cats[j.category] || 0) + 1;
      s.byMonth[new Date(j.start_date).getMonth()] = (s.byMonth[new Date(j.start_date).getMonth()] || 0) + 1;
      if (j.expense) { s.expense += j.expense; s.expenseN++; }
      s.annotations += (j.annotations || []).length;
      s.photos += ((j.a_side && j.a_side.images) || []).length + ((j.b_side && j.b_side.images) || []).length;
      if (j.magic_code) {
        var k = j.magic_code.color;
        s.magic[k] = (s.magic[k] || 0) + 1;
      }
      ((j.consensus && j.consensus.tags) || []).forEach(function (t) {
        s.tags[t] = (s.tags[t] || 0) + 1;
      });
      var sc = avgScore(j);
      if (sc !== null) { s.scoreSum += sc; s.scoreN++; if (sc > s.topScore) { s.topScore = sc; s.top = j; } }
    });
    s.days = Object.keys(daySet).length;
    s.avg = s.scoreN ? s.scoreSum / s.scoreN : 0;
    return s;
  }

  function avgScore(j) {
    var a = j.a_side && j.a_side.score, b = j.b_side && j.b_side.score;
    if (a && b) return (a + b) / 2;
    return a || b || null;
  }

  function render() {
    var ys = years();
    if (year === null || ys.indexOf(year) < 0) year = ys[0];
    var list = ofYear(year);
    var s = stats(list);
    var prev = stats(ofYear(year - 1));

    var html = '' +
      '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--between mb-md">' +
      '<div><h1 class="t-h1">📊 ' + year + ' 年度探险报告</h1>' +
      '<div class="t-cap mt-sm">这一年，你们一起出发了 ' + s.total + ' 次</div></div>' +
      '<button class="btn btn--secondary btn--sm" id="btnPrint">' + UI.icon('download', 16) + ' 打印/存 PDF</button>' +
      '</div>';

    /* 年份切换 */
    html += '<div class="filter-bar mb-base">' + ys.map(function (y) {
      return '<button class="tag tag--click' + (y === year ? ' tag--on' : '') + '" data-y="' + y + '">' + y + '</button>';
    }).join('') + '</div>';

    if (!s.total) {
      html += '<div class="empty"><div class="empty__icon">📊</div>' +
        '<div class="empty__title">' + year + ' 年还没有记录</div>' +
        '<div class="empty__desc">换一个年份，或者去创造一些回忆</div></div>';
      return html + '<div style="height:var(--xxl)"></div>';
    }

    /* 核心数字 */
    html += '<div class="rp-grid mb-base">' +
      kpi(s.total + '', '次探险', delta(s.total, prev.total)) +
      kpi(s.days + '', '个日子有记录', '') +
      kpi(s.avg.toFixed(1), '平均评分', delta(s.avg, prev.avg, 1)) +
      kpi(s.expenseN ? '¥' + Math.round(s.expense / s.expenseN) : '—', '人均每次', '') +
      kpi(s.important + '', '个重要时光', '') +
      kpi(s.photos + '', '张照片', '') +
      '</div>';

    /* 分类分布 */
    var maxCat = Math.max.apply(null, Object.keys(s.cats).map(function (k) { return s.cats[k]; }));
    html += '<div class="card card--pad mb-base">' +
      '<div class="section__title mb-md">都去探索了什么</div>' +
      DATA.categories.filter(function (c) { return s.cats[c]; }).map(function (c) {
        var n = s.cats[c];
        return '<div class="rp-bar-row">' +
          '<div class="rp-bar-label">' + DATA.categoryEmoji[c] + ' ' + c + '</div>' +
          '<div class="rp-bar"><i style="width:' + Math.round(n / maxCat * 100) + '%"></i></div>' +
          '<div class="rp-bar-num t-num">' + n + '</div></div>';
      }).join('') + '</div>';

    /* 月度热力 */
    html += '<div class="card card--pad mb-base">' +
      '<div class="section__title mb-md">一年十二个月</div>' +
      '<div class="rp-months">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) {
        var n = s.byMonth[m] || 0;
        var op = n ? 0.15 + Math.min(1, n / maxMonth(s) ) * 0.85 : 0.08;
        return '<div class="rp-month" title="' + (m + 1) + '月 · ' + n + ' 次">' +
          '<div class="rp-month__box" style="opacity:' + op.toFixed(2) + '"></div>' +
          '<div class="t-sm">' + (m + 1) + '</div></div>';
      }).join('') + '</div></div>';

    /* 年度最佳 */
    if (s.top) {
      html += '<div class="card card--pad mb-base">' +
        '<div class="section__title mb-md">今年的最佳探险</div>' +
        '<div class="row" data-open="' + s.top.id + '" style="cursor:pointer">' +
        UI.coverHTML(s.top, 'cover--thumb') +
        '<div class="grow"><div class="t-h2">' + UI.esc(s.top.title || s.top.location_name) + '</div>' +
        '<div class="t-cap mt-sm">' + UI.dateCN(s.top.start_date) + ' · ' +
        DATA.categoryEmoji[s.top.category] + ' ' + s.top.category + '</div>' +
        (s.top.magic_code ? '<div class="t-2 mt-sm">' + UI.esc(UI.magicText(s.top)) + '</div>' : '') +
        '</div><div class="t-h1 t-num" style="color:var(--brand)">' + s.topScore.toFixed(1) + '</div></div>' +
        '</div>';
    }

    /* 魔法暗号云 */
    var magicKeys = Object.keys(s.magic).sort(function (a, b) { return s.magic[b] - s.magic[a]; });
    if (magicKeys.length) {
      html += '<div class="card card--pad mb-base">' +
        '<div class="section__title mb-md">这一年的颜色</div>' +
        '<div class="row row--wrap">' + magicKeys.map(function (k) {
          return '<span class="tag" style="background:' + DATA.colorHex(k) + ';color:#fff">' +
            UI.esc(k) + ' × ' + s.magic[k] + '</span>';
        }).join('') + '</div></div>';
    }

    /* 高频标签 */
    var tagKeys = Object.keys(s.tags).sort(function (a, b) { return s.tags[b] - s.tags[a]; }).slice(0, 10);
    if (tagKeys.length) {
      html += '<div class="card card--pad mb-base">' +
        '<div class="section__title mb-md">你们的偏好</div>' +
        '<div class="row row--wrap">' + tagKeys.map(function (t) {
          return '<span class="tag tag--plain">' + UI.esc(DATA.tagNames([t])[0]) + ' × ' + s.tags[t] + '</span>';
        }).join('') + '</div></div>';
    }

    /* 重要时光 */
    var imp = list.filter(function (j) { return j.is_important; });
    if (imp.length) {
      html += '<div class="card card--pad mb-base">' +
        '<div class="section__title mb-md">⭐ 今年的重要时光</div>' +
        '<div class="col">' + imp.map(function (j) {
          return '<div class="row" data-open="' + j.id + '" style="cursor:pointer">' +
            '<div class="t-h3 grow">' + UI.esc(j.title || j.location_name) + '</div>' +
            '<div class="t-cap">' + UI.dateCNShort(j.start_date) + '</div></div>';
        }).join('') + '</div></div>';
    }

    html += '<div class="t-sm t-center mt-lg">用浏览器的「打印」可以存成 PDF，' +
      '建议选「横向 / 无边距」</div>' +
      '<div style="height:var(--xxl)"></div>';
    return html;
  }

  function maxMonth(s) {
    return Math.max.apply(null, [1].concat(Object.keys(s.byMonth).map(function (k) { return s.byMonth[k]; })));
  }

  function kpi(num, label, d) {
    return '<div class="rp-kpi">' +
      '<div class="rp-kpi__num">' + num + '</div>' +
      '<div class="rp-kpi__label">' + label + '</div>' +
      (d ? '<div class="rp-kpi__delta">' + d + '</div>' : '') +
      '</div>';
  }

  function delta(cur, prev, digits) {
    if (!prev) return '';
    var diff = cur - prev;
    if (Math.abs(diff) < 0.05) return '<span class="t-muted">与去年持平</span>';
    var sign = diff > 0 ? '↑' : '↓';
    var val = digits ? Math.abs(diff).toFixed(digits) : Math.abs(diff);
    return '<span style="color:' + (diff > 0 ? 'var(--success)' : 'var(--text-2)') + '">' +
      sign + ' ' + val + ' vs 去年</span>';
  }

  function mount(root) {
    root.querySelectorAll('[data-y]').forEach(function (b) {
      b.onclick = function () { year = Number(b.dataset.y); App.render(); };
    });
    root.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/journeys/' + el.dataset.open; };
    });
    var bp = root.querySelector('#btnPrint');
    if (bp) bp.onclick = function () { window.print(); };
  }

  return { render: render, mount: mount, stats: stats, ofYear: ofYear };
})();
