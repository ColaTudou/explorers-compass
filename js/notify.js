/* ============================================================
   探险家的罗盘 · 浏览器通知推送
   诚实说明：没有服务端的情况下，浏览器通知只能在「页面开着」时触发
   （真正的后台推送需要 Service Worker + Web Push + 推送服务器）。
   所以这里做的是：页面开着时的定时提醒 + PWA 安装后可从桌面随时打开。
   ============================================================ */
window.Notify = (function () {

  var timer = null;

  function supported() {
    return typeof window.Notification !== 'undefined';
  }
  function secure() {
    // 通知 API 要求安全上下文：https 或 localhost（file:// 通常不行）
    return window.isSecureContext === true ||
      location.protocol === 'https:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }
  function permission() {
    return supported() ? Notification.permission : 'unsupported';
  }
  function granted() { return permission() === 'granted'; }

  function settings() {
    return (Store.state.settings && Store.state.settings.notify) || {};
  }
  function save(patch) {
    Store.state.settings.notify = Object.assign(settings(), patch);
    Store.save();
  }

  function request() {
    return new Promise(function (resolve) {
      if (!supported()) { resolve({ ok: false, reason: '这个浏览器不支持通知' }); return; }
      if (!secure()) { resolve({ ok: false, reason: '需要用 http://localhost 或 https 打开才能开通知' }); return; }
      if (Notification.permission === 'granted') { resolve({ ok: true }); return; }
      if (Notification.permission === 'denied') {
        resolve({ ok: false, reason: '通知被浏览器拒绝了，请在地址栏左侧的网站设置里改回来' }); return;
      }
      var p = Notification.requestPermission(function (r) { resolve({ ok: r === 'granted' }); });
      if (p && p.then) p.then(function (r) { resolve({ ok: r === 'granted' }); });
    });
  }

  function send(title, body, tag, hash) {
    if (!granted() || !settings().enabled) return false;
    try {
      var n = new Notification(title, {
        body: body,
        tag: tag || 'compass',
        icon: 'icon.svg',
        badge: 'icon.svg',
        requireInteraction: false
      });
      n.onclick = function () {
        try { window.focus(); } catch (e) { }
        if (hash) location.hash = hash;
        n.close();
      };
      return true;
    } catch (e) {
      // 部分环境（如未安装 PWA 的安卓 Chrome）必须用 SW 注册才能发通知
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          reg.showNotification(title, { body: body, tag: tag || 'compass', icon: 'icon.svg' });
        }).catch(function () { });
        return true;
      }
      return false;
    }
  }

  /* ---------------- 调度：每 60 秒检查一次 ---------------- */
  function fired(key) {
    var log = (Store.state.meta && Store.state.meta.notifyLog) || {};
    var today = Store.fmtYMD(new Date().toISOString());
    return log[key] === today;
  }
  function markFired(key) {
    Store.state.meta.notifyLog = Store.state.meta.notifyLog || {};
    Store.state.meta.notifyLog[key] = Store.fmtYMD(new Date().toISOString());
    Store.save();
  }

  function tick() {
    if (!granted() || !settings().enabled) return;
    var now = new Date();
    var h = now.getHours();
    var dow = now.getDay();   // 0=周日

    /* 1) 那年今日 · 每天 08:00（PRD 3.4.1） */
    if (settings().onThisDay !== false && h === 8 && !fired('onThisDay')) {
      var th = Recommend.todayInHistory();
      if (th) {
        markFired('onThisDay');
        var y = UI.yearsSince(th.main.start_date);
        var mc = th.main.magic_code ? '【' + UI.magicText(th.main) + '】' : '';
        send('🕰️ ' + y + ' 年前的今天',
          '你们留下了 ' + mc + '「' + (th.main.title || th.main.location_name) + '」，还记得吗？',
          'onthisday', '#/journeys/' + th.main.id);
      }
    }

    /* 2) 周末饥饿提醒 · 周五下午（PRD 4.4 机制三） */
    if (settings().hungry !== false && dow === 5 && h >= 15 && h <= 18 && !fired('hungry')) {
      markFired('hungry');
      var n = Recommend.weekStats().count;
      send('🧭 罗盘有点饿了',
        n === 0 ? '这周你们还没记录过，随手存一张图也行呀'
          : '这周你们只记录了 ' + n + ' 次，罗盘有点饿了🥺',
        'hungry', '#/home');
    }

    /* 3) 草稿唤醒 · 每天 20:00（PRD 4.3） */
    if (settings().awaken !== false && h === 20 && !fired('awaken')) {
      var pend = Awaken.pendingList();
      if (pend.length) {
        markFired('awaken');
        send('💬 有 ' + pend.length + ' 段记忆等着复苏',
          '关于「' + (pend[0].title || pend[0].location_name || '那天') + '」，帮我确认几个小问题吧～',
          'awaken', '#/awaken/' + pend[0].id);
      }
    }
  }

  function start() {
    if (timer) return;
    timer = setInterval(tick, 60000);
    setTimeout(tick, 3000);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  /* 手动试发一条，用于设置页验证 */
  function demo() {
    return send('🧭 探险家的罗盘', '通知已经通了，到点我会提醒你们。', 'demo', null);
  }

  return {
    supported: supported, secure: secure, permission: permission, granted: granted,
    request: request, send: send, start: start, stop: stop, demo: demo,
    settings: settings, save: save, tick: tick
  };
})();
