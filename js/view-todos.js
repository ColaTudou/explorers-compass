/* ============================================================
   探险家的罗盘 · 待办事务管理
   PRD 3.7：轻量级双人共享待办，不做复杂项目管理
   ============================================================ */
window.Views = window.Views || {};

Views.todos = (function () {

  var showDone = false;

  function list() { return Store.state.todos || []; }

  function render() {
    var all = list().slice().sort(function (a, b) { return (b.urgency || 3) - (a.urgency || 3); });
    var todo = all.filter(function (t) { return !t.is_done; });
    var done = all.filter(function (t) { return t.is_done; });

    var html = '' +
      '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--between mb-md">' +
      '<div><h1 class="t-h1">✅ 待办</h1>' +
      '<div class="t-cap mt-sm">' + todo.length + ' 项待办 · ' + done.length + ' 项已完成</div></div>' +
      '<button class="btn btn--primary btn--sm" id="btnAdd">' + UI.icon('plus', 16) + ' 添加</button>' +
      '</div>';

    if (!all.length) {
      html += '<div class="empty"><div class="empty__icon">✅</div>' +
        '<div class="empty__title">还没有待办</div>' +
        '<div class="empty__desc">生活琐事放这里，两个人都能看到</div></div>';
    } else {
      if (todo.length) {
        html += '<div class="col mb-base">' + todo.map(card).join('') + '</div>';
      } else {
        html += '<div class="card card--pad t-center mb-base" style="color:var(--success)">' +
          '全部完成了，厉害 👏</div>';
      }
      if (done.length) {
        html += '<div class="section">' +
          '<button class="btn btn--text btn--sm mb-sm" id="btnToggleDone">' +
          (showDone ? '▾' : '▸') + ' 已完成（' + done.length + '）</button>' +
          (showDone ? '<div class="col">' + done.map(card).join('') + '</div>' : '') +
          '</div>';
      }
    }
    return html + '<div style="height:var(--xxl)"></div>';
  }

  function card(t) {
    var u = Store.userById(t.assignee);
    var over = !t.is_done && t.deadline && new Date(t.deadline) < new Date();
    return '<div class="wish' + (t.is_done ? ' is-done' : '') + '">' +
      '<button class="wish__check' + (t.is_done ? ' is-on' : '') + '" data-check="' + t.id + '">' +
      (t.is_done ? UI.icon('check', 13, 3, '#fff') : '') + '</button>' +
      '<div class="grow">' +
      '<div class="t-body2" style="font-weight:500">' + UI.esc(t.content) + '</div>' +
      '<div class="row row--tight row--wrap mt-sm">' +
      urgencyTag(t.urgency) +
      (t.estimated_minutes ? '<span class="tag tag--plain">⏱ ' + t.estimated_minutes + ' 分钟</span>' : '') +
      (t.deadline ? '<span class="tag ' + (over ? 'tag--danger' : 'tag--plain') + '">' +
        (over ? '⚠ 已过期 · ' : '📅 ') + UI.dateCNShort(t.deadline) + '</span>' : '') +
      (u ? '<span class="tag tag--plain">👤 ' + UI.esc(u.nickname) + '</span>' : '') +
      '</div></div>' +
      '<button class="btn btn--text btn--mini t-danger" data-del="' + t.id + '">删除</button>' +
      '</div>';
  }

  function urgencyTag(n) {
    n = n || 3;
    var cls = n >= 5 ? 'tag--danger' : n === 4 ? 'tag--warn' : 'tag--plain';
    var star = '★'.repeat(n) + '☆'.repeat(5 - n);
    return '<span class="tag ' + cls + '">' + star + '</span>';
  }

  function mount(root) {
    var ba = root.querySelector('#btnAdd');
    if (ba) ba.onclick = addDialog;

    var bt = root.querySelector('#btnToggleDone');
    if (bt) bt.onclick = function () { showDone = !showDone; App.render(); };

    root.querySelectorAll('[data-check]').forEach(function (b) {
      b.onclick = function () {
        var t = list().filter(function (x) { return x.id === b.dataset.check; })[0];
        if (!t) return;
        Store.updateTodo(t.id, {
          is_done: !t.is_done,
          completed_at: t.is_done ? null : Store.nowISO()
        });
        App.render();
      };
    });

    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var t = list().filter(function (x) { return x.id === b.dataset.del; })[0];
        if (!t) return;
        var mine = t.created_by === Store.state.currentUserId;
        UI.confirm({
          title: '删除这条待办？',
          text: mine ? '你创建的，可以直接删。' : '这是对方创建的，删除后会通知 TA（本机模拟：确认即删除）。',
          okText: '删除', danger: true
        }).then(function (ok) { if (ok) { Store.deleteTodo(t.id); App.render(); } });
      };
    });
  }

  function addDialog() {
    var me = Store.me(), p = Store.partner();
    UI.promptSheet({
      title: '添加待办',
      fields: [
        { key: 'content', label: '要做什么？', placeholder: '例如：周六前交水电费' },
        { key: 'urgency', label: '紧急程度', type: 'select', value: '3', options: ['1', '2', '3', '4', '5'] },
        { key: 'estimated_minutes', label: '预估耗时（分钟，可留空）', placeholder: '30' },
        { key: 'deadline', label: '截止日期（可留空）', type: 'date' },
        {
          key: 'assignee', label: '指派给', type: 'select', value: me ? me.id : '',
          options: [{ value: '', label: '不指定' }].concat(
            [me, p].filter(Boolean).map(function (u) { return { value: u.id, label: u.nickname }; }))
        }
      ],
      okText: '添加'
    }).then(function (v) {
      if (!v || !v.content) return;
      Store.addTodo({
        content: v.content,
        urgency: Number(v.urgency) || 3,
        estimated_minutes: v.estimated_minutes ? Number(v.estimated_minutes) : null,
        deadline: v.deadline ? new Date(v.deadline + 'T23:59:00').toISOString() : null,
        assignee: v.assignee || null
      });
      UI.toast('已添加', 'ok');
      App.render();
    });
  }

  return { render: render, mount: mount };
})();
