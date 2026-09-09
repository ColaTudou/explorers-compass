/* ============================================================
   探险家的罗盘 · 真实天气（Open-Meteo）
   选它的理由：免费、无需申请密钥、允许跨域，纯前端可直接调用。
   失败时一律返回 null，界面自动回落到「手动选天气」，绝不阻塞。
   ============================================================ */
window.Weather = (function () {

  var CITIES = [
    { name: '北京', lat: 39.9042, lng: 116.4074 },
    { name: '上海', lat: 31.2304, lng: 121.4737 },
    { name: '广州', lat: 23.1291, lng: 113.2644 },
    { name: '深圳', lat: 22.5431, lng: 114.0579 },
    { name: '杭州', lat: 30.2741, lng: 120.1551 },
    { name: '成都', lat: 30.5728, lng: 104.0668 },
    { name: '重庆', lat: 29.5630, lng: 106.5516 },
    { name: '西安', lat: 34.3416, lng: 108.9398 },
    { name: '武汉', lat: 30.5928, lng: 114.3055 },
    { name: '南京', lat: 32.0603, lng: 118.7969 },
    { name: '苏州', lat: 31.2989, lng: 120.5853 },
    { name: '天津', lat: 39.3434, lng: 117.3616 },
    { name: '长沙', lat: 28.2282, lng: 112.9388 },
    { name: '青岛', lat: 36.0671, lng: 120.3826 },
    { name: '厦门', lat: 24.4798, lng: 118.0894 },
    { name: '香港', lat: 22.3193, lng: 114.1694 },
    { name: '台北', lat: 25.0330, lng: 121.5654 }
  ];

  var TTL = 60 * 60 * 1000;   // 缓存 1 小时

  function settings() {
    return (Store.state.settings && Store.state.settings.weather) || {};
  }
  function save(patch) {
    Store.state.settings.weather = Object.assign(settings(), patch);
    Store.save();
  }

  /* WMO天气代码 → 我们系统的五档天气（PRD 2.2） */
  function wmoToText(code, windSpeed) {
    var windy = typeof windSpeed === 'number' && windSpeed >= 30;

    // 有降水 / 雷暴：优先级最高
    if (code >= 51 && code <= 67) return '雨';
    if (code >= 71 && code <= 77) return '雪';
    if (code >= 80 && code <= 82) return '雨';
    if (code >= 85 && code <= 86) return '雪';
    if (code >= 95 && code <= 99) return '雨';

    // 无降水：晴 / 阴 / 雾，但大风优先报「风」
    if (code === 0 || code === 1) return windy ? '风' : '晴';
    if (code === 2 || code === 3) return windy ? '风' : '阴';
    if (code === 45 || code === 48) return '阴';
    return '晴';
  }

  function cacheKey(lat, lng) {
    return 'compass_wx_' + Math.round(lat * 10) + '_' + Math.round(lng * 10);
  }
  function readCache(lat, lng) {
    try {
      var raw = localStorage.getItem(cacheKey(lat, lng));
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || Date.now() - o.ts > TTL) return null;
      o.fromCache = true;
      return o;
    } catch (e) { return null; }
  }
  function writeCache(lat, lng, o) {
    try { localStorage.setItem(cacheKey(lat, lng), JSON.stringify(o)); } catch (e) { }
  }

  /* 浏览器定位（需要用户授权，且只在 https / localhost 下可用） */
  function locate() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error('浏览器不支持定位')); return; }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: '当前位置' });
        },
        function (err) { reject(new Error(err && err.message || '定位被拒绝')); },
        { timeout: 8000, maximumAge: 30 * 60 * 1000 }
      );
    });
  }

  /* 取坐标：手动城市 > 定位 > 缓存过的定位 */
  function coords() {
    var s = settings();
    if (s.city && s.city !== 'auto') {
      var c = CITIES.filter(function (x) { return x.name === s.city; })[0];
      if (c) return Promise.resolve({ lat: c.lat, lng: c.lng, label: c.name });
    }
    if (s.coords) return Promise.resolve({ lat: s.coords.lat, lng: s.coords.lng, label: s.coords.label || '当前位置' });
    return locate().then(function (c) {
      save({ coords: { lat: c.lat, lng: c.lng, label: c.label } });
      return c;
    });
  }

  /* 主入口：返回 { text, temp, label, fromCache } 或 null */
  function get(force) {
    if (settings().auto === false) return Promise.resolve(null);
    return coords().then(function (c) {
      if (!force) {
        var hit = readCache(c.lat, c.lng);
        if (hit) return hit;
      }
      var url = 'https://api.open-meteo.com/v1/forecast' +
        '?latitude=' + encodeURIComponent(c.lat) +
        '&longitude=' + encodeURIComponent(c.lng) +
        '&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto';
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        var cur = j && j.current;
        if (!cur) throw new Error('返回为空');
        var out = {
          text: wmoToText(cur.weather_code, cur.wind_speed_10m),
          temp: Math.round(cur.temperature_2m),
          code: cur.weather_code,
          label: c.label,
          ts: Date.now()
        };
        writeCache(c.lat, c.lng, out);
        return out;
      });
    }).catch(function () { return null; });
  }

  return {
    CITIES: CITIES, get: get, locate: locate, wmoToText: wmoToText,
    settings: settings, save: save
  };
})();
