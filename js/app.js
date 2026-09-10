/* ============================================================
   探险家的罗盘 · 应用外壳
   Hash 路由 + 移动端 Tab 栏 / 桌面端侧边栏 + 全局闪电按钮
   ============================================================ */
window.App = (function () {

  var TABS = [
    { key: 'home', name: '首页', icon: 'home', hash: '#/home' },
    { key: 'journeys', name: '旅程', icon: 'book', hash: '#/journeys' },
    { key: 'compass', name: '罗盘', icon: 'compass', hash: '#/compass' },
    { key: 'wishes', name: '愿望', icon: 'star', hash: '#/wishes' },
    { key: 'profile', name: '我的', icon: 'user', hash: '#/profile' }
  ];

  var TITLES = {
    home: '探险家的罗盘', journeys: '旅程', compass: '罗盘',
    wishes: '愿望清单', profile: '我的', record: '记录中', merge: '合并确认',
    archaeology: '考古复苏', awaken: '陪聊唤醒',
    starlight: '星光集', todos: '待办', capsule: '时光胶囊', report: '年度报告'
  };

  function parse() {
    var h = location.hash || '#/home';
    var seg = h.replace(/^#\//, '').split('/');
    return { name: seg[0] || 'home', id: seg[1] || null };
  }

  function currentTab() {
    var r = parse();
    return ['home', 'journeys', 'compass', 'wishes', 'profile'].indexOf(r.name) >= 0 ? r.name : '';
  }

  /* ---------------- 侧边栏（桌面端） ---------------- */
  function sidebarHTML() {
    var tab = currentTab();
    var c = Store.state.couple;
    var me = Store.me();
    return '<aside class="sidebar">' +
      '<div class="sidebar__brand">' +
      '<div class="sidebar__logo">' + UI.icon('compass', 22, 2, '#fff') + '</div>' +
      '<div><div class="sidebar__name">探险家的罗盘</div>' +
      '<div class="sidebar__sub">' +
      (c && c.magic_code ? UI.esc(c.magic_code.color + ' · ' + c.magic_code.adjective) : 'Explorers Compass') +
      '</div></div></div>' +
      '<nav class="sidebar__nav">' +
      TABS.map(function (t) {
        return '<a class="sidebar__item' + (tab === t.key ? ' is-active' : '') + '" href="' + t.hash + '">' +
          UI.icon(t.icon, 20) + '<span>' + t.name + '</span></a>';
      }).join('') +
      '</nav>' +
      '<div class="sidebar__foot">' +
      '<button class="sidebar__item" id="sideFlash">' + UI.icon('zap', 20) + '<span>闪电存档</span></button>' +
      (me ? '<div class="row mt-md" style="padding:0 12px">' +
        '<div class="avatar avatar--sm">' + UI.esc(me.nickname.slice(0, 1)) + '</div>' +
        '<div class="grow"><div class="t-body2">' + UI.esc(me.nickname) + '</div>' +
        '<div class="t-sm">' + (Store.isBonded() ? '已绑定' : '未绑定') + '</div></div></div>' : '') +
      '</div></aside>';
  }

  /* ---------------- 顶栏（移动端） ---------------- */
  function topbarHTML() {
    var r = parse();
    var title = TITLES[r.name] || '探险家的罗盘';
    var showBack = r.name === 'record' || r.name === 'merge' || r.id;
    return '<header class="topbar">' +
      (showBack ? '<button class="btn btn--text btn--sm" onclick="history.back()">' + UI.icon('left', 18) + '</button>' : '') +
      '<div class="topbar__title">' + UI.esc(title) + '</div>' +
      '<div class="topbar__side">' +
      '<button class="btn btn--text btn--sm" id="topFlash">' + UI.icon('zap', 18) + '</button>' +
      '</div></header>';
  }

  /* ---------------- 底部 Tab（移动端） ---------------- */
  function tabbarHTML() {
    var tab = currentTab();
    return '<nav class="tabbar">' +
      TABS.map(function (t) {
        return '<a class="tabbar__item' + (tab === t.key ? ' is-active' : '') + '" href="' + t.hash + '">' +
          UI.icon(t.icon, 22) + '<span>' + t.name + '</span></a>';
      }).join('') + '</nav>';
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var root = document.getElementById('app');
    var r = parse();
    var body = '';

    switch (r.name) {
      case 'home': body = Views.home.render(); break;
      case 'journeys':
        body = r.id ? Views.journeys.renderDetail(r.id) : Views.journeys.renderList();
        break;
      case 'merge': body = Views.journeys.renderMerge(r.id); break;
      case 'compass': body = Views.compass.render(); break;
      case 'wishes': body = Views.wishes.render(); break;
      case 'profile': body = Views.profile.render(); break;
      case 'record': body = Views.record.render(); break;
      case 'archaeology': body = Views.archaeology.render(); break;
      case 'awaken': body = Views.awaken.render(r.id); break;
      case 'starlight': body = Views.starlight.render(); break;
      case 'todos': body = Views.todos.render(); break;
      case 'capsule': body = Views.capsule.render(); break;
      case 'report': body = Views.report.render(); break;
      default: body = '<div class="empty">页面不见了</div>';
    }

    var crumb = '';
    if (r.name === 'journeys' && r.id) {
      crumb = '<div class="crumb"><a href="#/journeys">旅程</a> / 详情</div>';
    }

    root.innerHTML =
      sidebarHTML() +
      '<div class="main-col">' +
      topbarHTML() +
      '<main class="page">' + crumb + '<div class="anim-enter">' + body + '</div></main>' +
      '</div>' +
      tabbarHTML();

    // 挂载
    var main = root.querySelector('main.page');
    switch (r.name) {
      case 'home': Views.home.mount(main); break;
      case 'journeys':
        if (r.id) Views.journeys.mountDetail(main, r.id);
        else Views.journeys.mountList(main);
        break;
      case 'merge': Views.journeys.mountMerge(main, r.id); break;
      case 'compass': Views.compass.mount(main); break;
      case 'wishes': Views.wishes.mount(main); break;
      case 'profile': Views.profile.mount(main); break;
      case 'record': Views.record.mount(main); break;
      case 'archaeology': Views.archaeology.mount(main); break;
      case 'awaken': Views.awaken.mount(main, r.id); break;
      case 'starlight': Views.starlight.mount(main); break;
      case 'todos': Views.todos.mount(main); break;
      case 'capsule': Views.capsule.mount(main); break;
      case 'report': Views.report.mount(main); break;
    }

    var sf = document.getElementById('sideFlash');
    if (sf) sf.onclick = function () { Views.record.flashArchive(); };
    var tf = document.getElementById('topFlash');
    if (tf) tf.onclick = function () { Views.record.flashArchive(); };

    syncFab();
    window.scrollTo(0, 0);
  }

  function syncFab() {
    var fab = document.getElementById('fab');
    if (!fab) return;
    var r = parse();
    var hide = r.name === 'record' || r.name === 'merge' ||
      r.name === 'archaeology' || r.name === 'awaken' ||
      r.name === 'report' || !Store.state.settings.fabEnabled;
    fab.classList.toggle('is-hidden', hide);
  }

  /* ---------------- 闪电按钮拖拽（PRD 5.2.1） ---------------- */
  function initFab() {
    var fab = document.getElementById('fab');
    if (!fab) return;
    var moved = false, sx = 0, sy = 0, ox = 0, oy = 0, timer = null;

    fab.addEventListener('pointerdown', function (e) {
      moved = false;
      sx = e.clientX; sy = e.clientY;
      var rect = fab.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      fab.setPointerCapture(e.pointerId);
      timer = setTimeout(function () { moved = true; fab.style.transition = 'none'; }, 350);
    });
    fab.addEventListener('pointermove', function (e) {
      if (!timer) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      clearTimeout(timer); timer = null;
      var r = fab.getBoundingClientRect();
      fab.style.left = (ox + dx) + 'px';
      fab.style.top = (oy + dy) + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
    });
    fab.addEventListener('pointerup', function () {
      clearTimeout(timer); timer = null;
      fab.style.transition = '';
      if (!moved) Views.record.flashArchive();
    });
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    Store.load();

    /* 只有「全新安装」才灌演示数据。
       ⚠ 必须同时看 meta.seeded：用户点过「清空全部数据」后 users 也是空的，
       但那时不能再灌 —— 否则会出现「清空了、刷新又回来了」的假象。 */
    var seeded = Store.state.meta && Store.state.meta.seeded;
    if (!Store.state.users.length && !seeded) {
      Store.bindUsers('小鹿', '阿柚', { color: '琥珀色', adjective: '温暖的' });
      Seed.build(Store.state.couple);
      Store.state.meta.seeded = true;
      Store.save();
    } else if (Store.state.users.length) {
      // 老用户：自动给旧版无图的 journey / capsule 补占位图（数据迁移，不丢内容）
      Seed.migrateAddCover();
    }

    if (!location.hash) location.hash = '#/home';
    initFab();

    applyTheme();
    if (typeof window.matchMedia === 'function') {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onSchemeChange = function () {
        if (((Store.state.settings && Store.state.settings.theme) || 'auto') === 'auto') applyTheme();
      };
      if (mq.addEventListener) mq.addEventListener('change', onSchemeChange);
      else if (mq.addListener) mq.addListener(onSchemeChange);
    }

    // 图片点击放大
    window.__zoom = function (src) {
      UI.modal({
        body: '<img src="' + src + '" style="width:100%;border-radius:12px">',
        footer: false, sticky: false, wide: true
      });
    };

    // 首次渲染前先还原 IndexedDB 里的大图（占位符 → dataURL），避免破图闪现；
    // 顺手对历史数据做一次瘦身（老用户 localStorage 里可能已攒了很多大图）
    function done() {
      window.addEventListener('hashchange', render);
      render();
      initPWA();
      initShortcuts();
      if (window.IDB && Store.trimNow) Store.trimNow();
      if (Notify.granted() && Notify.settings().enabled !== false) Notify.start();
      if (!Store.isStorageOK()) {
        UI.toast('浏览器禁用了本地存储，数据不会被保存', 'err');
      }
    }
    if (Store.restoreImages) {
      Store.restoreImages().then(done, done);
    } else {
      done();
    }
  }

  /* ---------------- 主题：自动 / 浅色 / 深色（PRD 6.3） ---------------- */
  function systemPrefersDark() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function isDark() {
    var mode = (Store.state.settings && Store.state.settings.theme) || 'auto';
    return mode === 'dark' || (mode === 'auto' && systemPrefersDark());
  }
  function applyTheme() {
    var dark = isDark();
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
    if (typeof document.querySelector === 'function') {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#1E1712' : '#FBF3E7');
    }
    return dark;
  }
  function setTheme(mode) {
    Store.state.settings.theme = mode;
    Store.save();
    applyTheme();
  }
  function cycleTheme() {
    var order = ['auto', 'light', 'dark'];
    var cur = (Store.state.settings && Store.state.settings.theme) || 'auto';
    setTheme(order[(order.indexOf(cur) + 1) % 3]);
    return Store.state.settings.theme;
  }

  /* ---------------- PWA：注册 Service Worker + 捕获安装事件 ---------------- */
  var deferredPrompt = null;

  function initPWA() {
    if ('serviceWorker' in navigator && /^(https?:)?$/.test(location.protocol) === false) return;
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* file:// 或不支持时静默 */ });
    }
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredPrompt = e;
      if (Views.profile && Views.profile.onInstallReady) Views.profile.onInstallReady();
    });
    window.addEventListener('appinstalled', function () {
      deferredPrompt = null;
      UI.toast('安装成功，可以从桌面打开了 🎉', 'ok');
      App.render();
    });
  }

  function canInstall() {
    return !!deferredPrompt;
  }
  function doInstall() {
    if (!deferredPrompt) return Promise.resolve(false);
    deferredPrompt.prompt();
    return deferredPrompt.userChoice.then(function (r) {
      deferredPrompt = null;
      return r && r.outcome === 'accepted';
    });
  }
  function isStandalone() {
    if (window.navigator.standalone === true) return true;
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(display-mode: standalone)').matches;
    }
    return false;
  }

  /* 识别 App 内置浏览器（微信 / QQ / 钉钉 / 支付宝 / 微博）——
     这些环境一律不触发 beforeinstallprompt，装不了 PWA，必须引导用户"用浏览器打开" */
  function inAppBrowser() {
    var ua = (navigator.userAgent || '');
    if (/MicroMessenger/i.test(ua)) return 'wechat';
    if (/DingTalk/i.test(ua)) return 'dingtalk';
    if (/AlipayClient/i.test(ua)) return 'alipay';
    if (/Weibo/i.test(ua)) return 'weibo';
    if (/\bQQ\//i.test(ua) || /QQBrowser/i.test(ua)) return 'qq';
    return '';
  }
  function isWeChat() { return inAppBrowser() === 'wechat'; }

  /* ---------------- 桌面端键盘快捷键 ---------------- */
  function initShortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape') {
        var mask = document.querySelector('.mask');
        if (mask) { mask.remove(); return; }
      }
      var idx = ['1', '2', '3', '4', '5'].indexOf(e.key);
      if (idx >= 0) { location.hash = TABS[idx].hash; return; }
      if (e.key === 'n' || e.key === 'N') {
        if (parse().name !== 'record') { Views.record.clear(); Views.record.start(); }
        return;
      }
      if (e.key === 'f' || e.key === 'F') { Views.record.flashArchive(); return; }
      if (e.key === '?' || e.key === '/') { showShortcutHelp(); return; }
    });
  }

  function showShortcutHelp() {
    UI.modal({
      title: '键盘快捷键',
      body: '<div class="col">' +
        [['1 – 5', '切换 首页/旅程/罗盘/愿望/我的'],
        ['N', '新建旅程'], ['F', '闪电存档'],
        ['Esc', '关闭弹窗'], ['?', '显示这个帮助']].map(function (p) {
          return '<div class="row row--between"><span class="t-2">' + p[0] + '</span>' +
            '<span class="t-body2">' + p[1] + '</span></div>';
        }).join('') + '</div>'
    });
  }

  return {
    render: render, syncFab: syncFab, boot: boot, parse: parse,
    canInstall: canInstall, doInstall: doInstall, isStandalone: isStandalone,
    inAppBrowser: inAppBrowser, isWeChat: isWeChat,
    showShortcutHelp: showShortcutHelp,
    applyTheme: applyTheme, setTheme: setTheme, cycleTheme: cycleTheme, isDark: isDark
  };
})();

document.addEventListener('DOMContentLoaded', App.boot);
