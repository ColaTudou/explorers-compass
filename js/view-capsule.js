/* ============================================================
   探险家的罗盘 · 时光胶囊
   PRD 7.3：写给未来的话，定时解锁
   ============================================================ */
window.Views = window.Views || {};

Views.capsule = (function () {

  function list() { return Store.state.capsules || []; }

  function render() {
    var all = list();
    var ready = all.filter(function (c) {
      return c.status === 'locked' && new Date(c.unlock_at).getTime() <= Date.now();
    });
    var locked = all.filter(function (c) {
      return c.status === 'locked' && new Date(c.unlock_at).getTime() > Date.now();
    }).sort(function (a, b) { return new Date(a.unlock_at) - new Date(b.unlock_at); });
    var opened = all.filter(function (c) { return c.status === 'opened'; });

    var html = '' +
      '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--between mb-md">' +
      '<div><h1 class="t-h1">💊 时光胶囊</h1>' +
      '<div class="t-cap mt-sm">写给未来的你们，到那天才能打开</div></div>' +
      '<button class="btn btn--primary btn--sm" id="btnNew">' + UI.icon('plus', 16) + ' 写一封</button>' +
      '</div>';

    /* 可以开启了 */
    if (ready.length) {
      html += '<div class="section"><div class="card card--pad mb-md" ' +
        'style="border:1.5px solid var(--warn);background:var(--warn-light)">' +
        '<div class="row"><div style="font-size:26px">🎉</div>' +
        '<div class="grow"><div class="t-h3">有 ' + ready.length + ' 颗胶囊可以开启了</div>' +
        '<div class="t-cap">' + UI.esc(ready[0].title) + ' · 写于 ' +
        UI.dateCN(ready[0].created_at) + '</div></div></div>' +
        '<button class="btn btn--primary btn--block mt-md" id="btnOpen">现在打开</button>' +
        '</div></div>';
    }

    if (!all.length) {
      html += '<div class="empty"><div class="empty__icon">💊</div>' +
        '<div class="empty__title">还没有埋下时光胶囊</div>' +
        '<div class="empty__desc">写下现在的心情，约定一年后的今天再一起读' +
        '<br>——这是给未来的自己最好的礼物</div>' +
        '<button class="btn btn--primary mt-md" id="btnNew2">💊 写第一封</button></div>';
      return html + '<div style="height:var(--xxl)"></div>';
    }

    /* 未解锁 */
    if (locked.length) {
      html += '<div class="section"><div class="section__head">' +
        '<div class="section__title">等待开启（' + locked.length + '）</div></div>' +
        locked.map(function (c) {
          var days = Math.ceil((new Date(c.unlock_at) - Date.now()) / 86400000);
          return '<div class="card card--pad mb-md cap-locked">' +
            '<div class="row row--between">' +
            '<div class="grow"><div class="t-h3">' + UI.esc(c.title) + '</div>' +
            '<div class="t-cap mt-sm">🔒 ' + UI.dateCN(c.unlock_at) + ' 解锁 · 还有 ' + days + ' 天</div>' +
            progress(c) +
            '</div>' +
            '<button class="btn btn--text btn--mini t-danger" data-del="' + c.id + '">删除</button>' +
            '</div></div>';
        }).join('') + '</div>';
    }

    /* 已开启 */
    if (opened.length) {
      html += '<div class="section"><div class="section__head">' +
        '<div class="section__title">已开启（' + opened.length + '）</div></div>' +
        opened.map(function (c) {
          var a = Store.userById(c.author_id) || {};
          return '<div class="card card--pad mb-md">' +
            '<div class="row row--between mb-sm">' +
            '<div class="t-h3">' + UI.esc(c.title) + '</div>' +
            '<div class="t-cap">写于 ' + UI.dateCN(c.created_at) + '</div></div>' +
            '<div class="narrative narrative--serif">' + UI.esc(c.content || '（空白）') + '</div>' +
            ((c.images || []).length
              ? '<div class="img-strip mt-md">' + c.images.map(function (u) {
                return '<img src="' + u + '">';
              }).join('') + '</div>' : '') +
            '<div class="t-sm mt-md">🔓 于 ' + UI.dateCN(c.opened_at) + ' 开启 · ' +
            UI.esc(a.nickname || '') + '</div>' +
            '</div>';
        }).join('') + '</div>';
    }

    return html + '<div style="height:var(--xxl)"></div>';
  }

  function progress(c) {
    var total = new Date(c.unlock_at) - new Date(c.created_at);
    var past = Date.now() - new Date(c.created_at);
    var p = total > 0 ? Math.min(100, Math.max(0, Math.round(past / total * 100))) : 100;
    return '<div class="cap-bar mt-sm"><i style="width:' + p + '%"></i></div>';
  }

  function mount(root) {
    var bn = root.querySelector('#btnNew'), bn2 = root.querySelector('#btnNew2');
    if (bn) bn.onclick = newDialog;
    if (bn2) bn2.onclick = newDialog;

    var bo = root.querySelector('#btnOpen');
    if (bo) bo.onclick = function () {
      var ready = Store.readyCapsules();
      if (!ready.length) return;
      openOne(ready[0]);
    };

    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm({
          title: '删除这颗胶囊？', text: '还没开启的内容会一起消失，无法恢复。',
          okText: '删除', danger: true
        }).then(function (ok) {
          if (ok) { Store.deleteCapsule(b.dataset.del); UI.toast('已删除'); App.render(); }
        });
      };
    });
  }

  /* 开启仪式：先显示密封的胶囊，点一下再展开 */
  function openOne(c) {
    UI.modal({
      title: '💊 一颗到期的胶囊',
      sub: UI.esc(c.title),
      body: '<div class="t-center">' +
        '<div class="cap-seal" id="capSeal">🔒</div>' +
        '<div class="t-2 mt-md">写于 ' + UI.dateCN(c.created_at) + '，' +
        '那时到现在已经过了 ' + Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000) + ' 天</div>' +
        '<div id="capBody" class="hide mt-base">' +
        '<div class="narrative narrative--serif t-left">' + UI.esc(c.content || '（空白）') + '</div>' +
        '</div></div>',
      footer: '<button class="btn btn--primary" id="capBtn">开启</button>',
      sticky: true,
      onMount: function (el, close) {
        var btn = el.querySelector('#capBtn');
        btn.onclick = function () {
          if (c.status === 'locked') {
            Store.openCapsule(c.id);
            el.querySelector('#capSeal').textContent = '✨';
            el.querySelector('#capBody').classList.remove('hide');
            btn.textContent = '收好';
            UI.toast('开启了 🎉', 'ok');
          } else {
            close(); App.render();
          }
        };
      },
      onClose: function () { App.render(); }
    });
  }

  function newDialog() {
    var presets = [
      { label: '一年后', days: 365 },
      { label: '半年后', days: 180 },
      { label: '明年生日', days: 365 },
      { label: '三年后', days: 1095 }
    ];
    var def = new Date();
    def.setFullYear(def.getFullYear() + 1);

    UI.modal({
      title: '埋一颗时光胶囊',
      sub: '写给未来的你们，到那天才能打开',
      wide: true,
      body:
        '<div class="field"><label class="field__label">标题</label>' +
        '<input class="input" id="capTitle" placeholder="例如：给一年后的我们" value="给一年后的我们"></div>' +
        '<div class="field"><label class="field__label">想说的话</label>' +
        '<textarea class="textarea" id="capText" style="min-height:140px" ' +
        'placeholder="现在在想什么？最想让未来的自己记住什么？"></textarea></div>' +
        '<div class="field"><label class="field__label">什么时候解锁？</label>' +
        '<input class="input" id="capDate" type="date" value="' +
        def.getFullYear() + '-' + Store.pad(def.getMonth() + 1) + '-' + Store.pad(def.getDate()) + '">' +
        '<div class="row row--wrap mt-sm">' + presets.map(function (p) {
          return '<button class="tag tag--click" data-days="' + p.days + '">' + p.label + '</button>';
        }).join('') + '</div>' +
        '</div>' +
        '<div class="field"><label class="field__label">附几张照片（可留空）</label>' +
        '<div class="row row--wrap" id="capImgs"></div>' +
        '<div class="row row--tight mt-sm">' +
        '<button class="btn btn--secondary btn--sm" id="capPick">相册</button>' +
        '<button class="btn btn--ghost btn--sm" id="capCam">拍照</button></div></div>',
      footer: '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">埋下</button>',
      onMount: function (el, close) {
        var imgs = [];
        function draw() {
          el.querySelector('#capImgs').innerHTML = imgs.map(function (u, i) {
            return '<div style="position:relative;width:60px;height:60px">' +
              '<img src="' + u + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px">' +
              '<button data-rm="' + i + '" style="position:absolute;right:-4px;top:-4px;width:18px;height:18px;' +
              'border-radius:50%;background:#C95C5C;color:#fff;font-size:11px;line-height:18px">×</button></div>';
          }).join('');
          el.querySelectorAll('[data-rm]').forEach(function (b) {
            b.onclick = function () { imgs.splice(Number(b.dataset.rm), 1); draw(); };
          });
        }
        el.querySelector('#capPick').onclick = function () {
          UI.pickImages(true).then(function (files) {
            Promise.all(files.slice(0, 6).map(function (f) { return UI.compressImage(f, 720, .6); }))
              .then(function (u) { imgs = imgs.concat(u); draw(); });
          });
        };
        el.querySelector('#capCam').onclick = function () {
          UI.camera({ max: 6 }).then(function (u) {
            if (u && u.length) { imgs = imgs.concat(u); draw(); }
          });
        };
        el.querySelectorAll('[data-days]').forEach(function (b) {
          b.onclick = function () {
            var d = new Date();
            d.setDate(d.getDate() + Number(b.dataset.days));
            el.querySelector('#capDate').value =
              d.getFullYear() + '-' + Store.pad(d.getMonth() + 1) + '-' + Store.pad(d.getDate());
          };
        });
        el.querySelector('[data-act="no"]').onclick = function () { close(); };
        el.querySelector('[data-act="yes"]').onclick = function () {
          var title = el.querySelector('#capTitle').value.trim() || '写给未来的一封信';
          var text = el.querySelector('#capText').value.trim();
          var date = el.querySelector('#capDate').value;
          if (!text && !imgs.length) { UI.toast('至少写点什么，或加张照片', 'err'); return; }
          if (!date) { UI.toast('选一个解锁日期', 'err'); return; }
          Store.addCapsule({
            title: title, content: text, images: imgs,
            unlock_at: new Date(date + 'T09:00:00').toISOString()
          });
          close();
          UI.toast('埋好了，到那天见 💊', 'ok');
          App.render();
        };
      }
    });
  }

  return { render: render, mount: mount };
})();
