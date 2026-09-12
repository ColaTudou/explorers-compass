/* ============================================================
   探险家的罗盘 · Service Worker
   作用：预缓存全部静态资源，装成 PWA 后完全离线可用。

   ⚠ 缓存策略（v13 起改为「网络优先」）：
      旧版对 JS/CSS 用 cache-first，导致我们修了 bug 之后，
      用户手机里仍然跑着上周缓存的旧代码（表现为"点了没反应"）。
      现在代码类资源一律 network-first：有网就拿最新的，
      只有断网 / 请求失败时才回落到缓存。图片图标仍用 cache-first。
   注意：SW 只在 http://localhost 或 https 下能注册，file:// 直接跳过。
   ============================================================ */
var CACHE = 'compass-v15';

var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-maskable.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './css/tokens.css',
  './css/app.css',
  './css/views.css',
  './js/data.js',
  './js/store.js',
  './js/idb.js',
  './js/ui.js',
  './js/seed.js',
  './js/recommend.js',
  './js/llm.js',
  './js/weather.js',
  './js/notify.js',
  './js/view-record.js',
  './js/view-journeys.js',
  './js/view-home.js',
  './js/view-compass.js',
  './js/view-wishes.js',
  './js/view-profile.js',
  './js/view-archaeology.js',
  './js/view-starlight.js',
  './js/view-todos.js',
  './js/view-capsule.js',
  './js/view-report.js',
  './js/export-book.js',
  './js/quest.js',
  './js/qr.js',
  './js/view-diary.js',
  './js/view-quest.js',
  './js/sync.js',
  './js/ai-awaken.js',
  './js/app.js'
];

/* 需要「每次都拿最新」的资源：页面 + 代码 */
function isCode(pathname) {
  return /\.(js|css|html)$/.test(pathname) ||
         pathname === './' ||
         pathname.slice(-1) === '/' ||
         pathname.indexOf('index.html') >= 0;
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 单个失败不拖垮整体
      return Promise.all(ASSETS.map(function (u) {
        return c.add(u).catch(function () { });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* 页面主动要求「立刻接管」（点检查更新时用） */
self.addEventListener('message', function (e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // 跨域（天气 API / LLM / 同步服务器）不缓存
  if (new URL(req.url).origin !== self.location.origin) return;

  var pathname = new URL(req.url).pathname;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  /* ---- 代码 / 页面：网络优先，断网才用缓存 ---- */
  if (isCode(pathname)) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* ---- 图片等静态资源：缓存优先 ---- */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});

/* 点击通知 → 聚焦或打开对应页面 */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
