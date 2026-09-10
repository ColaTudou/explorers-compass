/* ============================================================
   探险家的罗盘 · Service Worker
   作用：预缓存全部静态资源，装成 PWA 后完全离线可用。
   策略：静态资源 stale-while-revalidate；页面导航 network-first 兜底缓存。
   注意：SW 只在 http://localhost 或 https 下能注册，file:// 直接跳过。
   ============================================================ */
var CACHE = 'compass-v9';

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
  './js/sync.js',
  './js/ai-awaken.js',
  './js/app.js'
];

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

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // 跨域（天气 API / LLM）不缓存
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

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
