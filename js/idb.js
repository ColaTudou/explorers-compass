/* ============================================================
   探险家的罗盘 · IndexedDB 图片仓库（可选扩容层）
   localStorage 只有 ~5MB，照片全内联会很快打满。本模块把大图
   存进 IndexedDB，localStorage 里只留文本 + 小图 + 占位符。

   铁律：IndexedDB 不可用（老浏览器 / 隐私模式 / file:// 部分
   环境）时一切静默回退，行为与没有本模块时完全一致——
   本模块只是「锦上添花」的扩容层，绝不让主流程依赖它。
   ============================================================ */
window.IDB = (function () {

  var DB_NAME = 'explorers-compass';
  var STORE = 'images';
  var db = null;
  var opening = null;
  var okState = null;   // null=未知 / true / false（缓存探测结果）

  /* 打开数据库（只成功一次，之后复用连接） */
  function open() {
    if (db) return Promise.resolve(db);
    if (opening) return opening;
    if (!window.indexedDB) { okState = false; return Promise.reject(new Error('no indexedDB')); }
    opening = new Promise(function (resolve, reject) {
      var req;
      try { req = window.indexedDB.open(DB_NAME, 1); }
      catch (e) { okState = false; opening = null; reject(e); return; }
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'k' });
      };
      req.onsuccess = function () {
        db = req.result;
        okState = true;
        db.onversionchange = function () { try { db.close(); } catch (e) {} db = null; opening = null; };
        opening = null;
        resolve(db);
      };
      req.onerror = function () {
        okState = false; opening = null;
        reject(req.error || new Error('idb open failed'));
      };
      req.onblocked = function () { /* 等其他标签页关掉旧版本即可，不处理 */ };
    });
    return opening;
  }

  /* 是否可用：永远 resolve，不抛错 */
  function can() {
    if (okState === true && db) return Promise.resolve(true);
    if (okState === false) return Promise.resolve(false);
    return open().then(function () { return true; }, function () { return false; });
  }

  /* 在事务里跑一个请求；resolve 时机取请求成功与事务完成的先到者 */
  function run(mode, fn) {
    return can().then(function (ok) {
      if (!ok) throw new Error('idb unavailable');
      return new Promise(function (resolve, reject) {
        var done = false;
        function fin(f) { if (!done) { done = true; f(); } }
        var t, req;
        try {
          t = db.transaction(STORE, mode);
          req = fn(t.objectStore(STORE));
        } catch (e) { reject(e); return; }
        req.onsuccess = function () { fin(function () { resolve(req.result); }); };
        t.oncomplete = function () { fin(function () { resolve(req.result); }); };
        req.onerror = function () { fin(function () { reject(req.error || new Error('op failed')); }); };
        t.onerror = function () { fin(function () { reject(t.error || new Error('tx failed')); }); };
        t.onabort = function () { fin(function () { reject(t.error || new Error('tx aborted')); }); };
      });
    });
  }

  function put(key, value) {
    return run('readwrite', function (s) { return s.put({ k: key, v: value }); });
  }
  function get(key) {
    return run('readonly', function (s) { return s.get(key); }).then(function (row) {
      return row && row.v ? row.v : null;
    });
  }
  function del(key) {
    return run('readwrite', function (s) { return s.delete(key); });
  }
  function clear() {
    return run('readwrite', function (s) { return s.clear(); });
  }
  /* 列出全部 key（游标遍历，兼容老实现） */
  function keys() {
    return can().then(function (ok) {
      if (!ok) return [];
      return new Promise(function (resolve, reject) {
        var t;
        try { t = db.transaction(STORE, 'readonly'); }
        catch (e) { resolve([]); return; }
        var req = t.objectStore(STORE).openCursor();
        var acc = [];
        req.onsuccess = function () {
          var c = req.result;
          if (c) { acc.push(c.key); c.continue(); }
          else resolve(acc);
        };
        req.onerror = function () { resolve(acc); };
      });
    });
  }

  /* 统计图库：{ count: 张数, bytes: 约占用字节 }（游标遍历，不一次性载入内存） */
  function usage() {
    return can().then(function (ok) {
      if (!ok) return { count: 0, bytes: 0 };
      return new Promise(function (resolve) {
        var t;
        try { t = db.transaction(STORE, 'readonly'); }
        catch (e) { resolve({ count: 0, bytes: 0 }); return; }
        var req = t.objectStore(STORE).openCursor();
        var count = 0, bytes = 0;
        req.onsuccess = function () {
          var c = req.result;
          if (c) { count++; bytes += (c.value && c.value.v ? c.value.v.length : 0) * 2; c.continue(); }
          else resolve({ count: count, bytes: bytes });
        };
        req.onerror = function () { resolve({ count: count, bytes: bytes }); };
      });
    });
  }

  return {
    DB_NAME: DB_NAME,
    can: can,
    put: put,
    get: get,
    del: del,
    keys: keys,
    clear: clear,
    usage: usage
  };
})();
