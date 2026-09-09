/* ============================================================
   探险家的罗盘 · 共同愿望清单
   PRD 3.6：愿望 → 实现的闭环
   ============================================================ */
window.Views = window.Views || {};

Views.wishes = (function () {

  function render() {
    var list = Store.state.wishes || [];
    var todo = list.filter(function (w) { return !w.is_done; });
    var done = list.filter(function (w) { return w.is_done; });

    var html = '' +
      '<div class="row row--between mb-md">' +
      '<div><h1 class="t-h1">共同愿望清单</h1>' +
      '<div class="t-cap mt-sm">想一起做的事，做完了就变成旅程</div></div>' +
      '<button class="btn btn--primary btn--sm" id="btnAdd">' + UI.icon('plus', 16) + ' 添加</button></div>' +

      '<div class="card card--pad mb-base" style="background:linear-gradient(135deg,#FFF9F1,#F3DFCF)">' +
      '<div class="row row--between">' +
      '<div><div class="t-h3">今天做点啥？</div>' +
      '<div class="t-cap">从未完成的愿望里随机抽一个</div></div>' +
      '<button class="btn btn--primary btn--sm" id="btnLucky">' + UI.icon('shuffle', 16, 2, '#fff') + ' 抽一个</button>' +
      '</div></div>';

    if (!list.length) {
      html += '<div class="empty"><div class="empty__icon">⭐</div>' +
        '<div class="empty__title">还没有想一起做的事</div>' +
        '<div class="empty__desc">哪怕是「一起去吃那家新开的店」也值得写下来</div></div>';
    } else {
      if (todo.length) {
        html += '<div class="section"><div class="section__head">' +
          '<div class="section__title">想去（' + todo.length + '）</div></div>' +
          '<div class="col">' + todo.map(card).join('') + '</div></div>';
      }
      if (done.length) {
        html += '<div class="section"><div class="section__head">' +
          '<div class="section__title">已经实现（' + done.length + '）</div></div>' +
          '<div class="col">' + done.map(card).join('') + '</div></div>';
      }
    }
    html += '<div style="height:var(--xxl)"></div>';
    return html;
  }

  function card(w) {
    return '<div class="wish' + (w.is_done ? ' is-done' : '') + '" data-id="' + w.id + '">' +
      '<button class="wish__check' + (w.is_done ? ' is-on' : '') + '" data-check="' + w.id + '">' +
      (w.is_done ? UI.icon('check', 13, 3, '#fff') : '') + '</button>' +
      '<div class="grow">' +
      '<div class="wish__title t-h3">' + UI.esc(w.title) + '</div>' +
      (w.description ? '<div class="t-2 mt-sm">' + UI.esc(w.description) + '</div>' : '') +
      '<div class="row row--tight mt-sm">' +
      (w.category ? '<span class="tag tag--plain">' + (DATA.categoryEmoji[w.category] || '') + ' ' + w.category + '</span>' : '') +
      '<span class="t-sm">' + UI.dateCN(w.created_at) + '</span>' +
      (w.fulfilled_journey_id ? '<span class="tag tag--success">已关联旅程</span>' : '') +
      '</div></div>' +
      '<button class="btn btn--text btn--mini t-danger" data-del="' + w.id + '">删除</button>' +
      '</div>';
  }

  function mount(root) {
    var ba = root.querySelector('#btnAdd');
    if (ba) ba.onclick = addWishDialog;

    var bl = root.querySelector('#btnLucky');
    if (bl) bl.onclick = function () {
      var todo = (Store.state.wishes || []).filter(function (w) { return !w.is_done; });
      if (!todo.length) { UI.toast('愿望清单是空的'); return; }
      var w = todo[Math.floor(Math.random() * todo.length)];
      UI.modal({
        title: '🎉 今天做这个',
        body: '<div class="t-center"><div class="t-display mb-md">' + UI.esc(w.title) + '</div>' +
          (w.description ? '<div class="t-2">' + UI.esc(w.description) + '</div>' : '') + '</div>',
        footer: '<button class="btn btn--secondary" data-act="no">再想想</button>' +
          '<button class="btn btn--primary" data-act="yes">就它了</button>',
        onMount: function (el, close) {
          el.querySelector('[data-act="no"]').onclick = function () { close(); };
          el.querySelector('[data-act="yes"]').onclick = function () {
            close();
            UI.confirm({
              title: '现在就去实现它？',
              text: '可以现在创建一条旅程记录，完成后自动关联这个愿望。',
              okText: '创建旅程'
            }).then(function (ok) {
              if (!ok) return;
              var j = Store.newJourney({
                title: w.title, category: w.category || '其他',
                location_name: w.title, status: 'draft'
              });
              Store.addJourney(j);
              Store.updateWish(w.id, { fulfilled_journey_id: j.id });
              Views.record.start(j.id);
            });
          };
        }
      });
    };

    root.querySelectorAll('[data-check]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var w = (Store.state.wishes || []).filter(function (x) { return x.id === b.dataset.check; })[0];
        if (!w) return;
        if (w.is_done) {
          Store.updateWish(w.id, { is_done: false, completed_at: null, fulfilled_journey_id: null });
          App.render(); return;
        }
        UI.confirm({
          title: '完成「' + w.title + '」？',
          text: '要不要关联到一条旅程？也可以稍后再关联。',
          okText: '标记完成', cancelText: '再等等'
        }).then(function (ok) {
          if (!ok) return;
          Store.updateWish(w.id, { is_done: true, completed_at: Store.nowISO() });
          var cands = Store.journeys().slice(0, 12);
          if (!cands.length) { UI.toast('已标记完成', 'ok'); App.render(); return; }
          UI.modal({
            title: '关联到哪条旅程？',
            body: '<div class="col">' + cands.map(function (j) {
              return '<div class="card card--pad row" data-pick="' + j.id + '" style="cursor:pointer">' +
                UI.coverHTML(j, 'cover--thumb') +
                '<div class="grow"><div class="t-h3">' + UI.esc(j.title || j.location_name) + '</div>' +
                '<div class="t-cap">' + UI.dateCN(j.start_date) + '</div></div></div>';
            }).join('') + '</div>',
            footer: '<button class="btn btn--secondary" data-act="skip">暂不关联</button>',
            onMount: function (el, close) {
              el.querySelectorAll('[data-pick]').forEach(function (x) {
                x.onclick = function () {
                  Store.updateWish(w.id, { fulfilled_journey_id: x.dataset.pick });
                  close(); UI.toast('已关联', 'ok'); App.render();
                };
              });
              el.querySelector('[data-act="skip"]').onclick = function () { close(); App.render(); };
            }
          });
        });
      };
    });

    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        UI.confirm({ title: '删除这个愿望？', text: '愿望属于共有数据，删除后双方都看不到了。', okText: '删除', danger: true })
          .then(function (ok) { if (ok) { Store.deleteWish(b.dataset.del); UI.toast('已删除'); App.render(); } });
      };
    });
  }

  function addWishDialog() {
    UI.promptSheet({
      title: '添加一个愿望',
      fields: [
        { key: 'title', label: '想一起做什么？', placeholder: '例如：一起去看海边的日出' },
        { key: 'description', label: '补充（可留空）', type: 'textarea', placeholder: '具体想法、注意事项…' },
        { key: 'category', label: '分类', type: 'select', value: '其他', options: DATA.categories }
      ],
      okText: '添加'
    }).then(function (v) {
      if (!v || !v.title) return;
      Store.addWish(v);
      UI.toast('愿望已添加 ⭐', 'ok');
      App.render();
    });
  }

  return { render: render, mount: mount };
})();
