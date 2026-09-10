/* ============================================================
   探险家的罗盘 · 数据层
   纯前端实现：localStorage 持久化 + 内存兜底
   表结构遵循 PRD 第2章：users / couples / journeys / tags / wishes / blacklist
   ============================================================ */
window.Store = (function () {

  var KEY = 'explorers_compass_v1';
  var state = null;
  var storageOK = true;

  /* ---------- 基础工具 ---------- */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function nowISO() { return new Date().toISOString(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------- 图片扩容：IndexedDB 卸载 / 还原（可选模块） ----------
     设计：内存里的 state 始终持有完整 dataURL（视图 / 导出都基于内存，零改动）；
     持久化用 JSON.stringify 的 replacer 把超长图片替换成占位符 @@idb:<key>@@，
     大图本体放 IndexedDB（js/idb.js）。localStorage 只存文本 + 小图 + 占位符，
     ~5MB 配额问题基本消失。IndexedDB 不可用时全部静默走老路。 */
  var INLINE_MAX = 48000;   // dataURL 长度 ≤ 此值直接留在 localStorage（小图/头像）
  var TRIM_HIGH = 1200000;  // 持久化文本超过 → 调度一次卸载
  var offloaded = {};       // 本会话已确认写进 IndexedDB 的 key
  var trimTimer = null;
  var trimming = null;      // 进行中的 trimNow Promise
  var gcLast = 0;           // GC 节流时间戳
  var idbWarned = false;    // 是否已提示过"转入浏览器图库"

  /* 由内容算稳定 key：相同图片天然去重（内容相同 → key 相同 → 覆盖写） */
  function keyOf(dataURL) {
    var h = 5381, i;
    for (i = 0; i < dataURL.length; i++) h = ((h << 5) + h + dataURL.charCodeAt(i)) >>> 0;
    return 'i' + dataURL.length + '_' + h.toString(36);
  }
  function isPlaceholder(s) {
    return typeof s === 'string' && s.indexOf('@@idb:') === 0;
  }

  /* 遍历 state 里所有图片引用。includePh=true 时也把占位符当引用（还原用）。
     cb(ref)：ref.read() / ref.write(v) / ref.remove()（数组元素删除或封面清空） */
  function eachImage(o, cb, includePh) {
    function isImg(u) {
      if (typeof u !== 'string') return false;
      return u.indexOf('data:') === 0 || (includePh && isPlaceholder(u));
    }
    function addList(imgs) {
      (imgs || []).forEach(function (u, i) {
        if (isImg(u)) cb({
          read: function () { return imgs[i]; },
          write: function (v) { imgs[i] = v; },
          remove: function () { imgs.splice(i, 1); i--; }
        });
      });
    }
    (o.journeys || []).forEach(function (j) {
      if (!j) return;
      if (isImg(j.cover_image)) cb({
        read: function () { return j.cover_image; },
        write: function (v) { j.cover_image = v; },
        remove: function () { j.cover_image = ''; }
      });
      if (j.a_side) addList(j.a_side.images);
      if (j.b_side) addList(j.b_side.images);
    });
    (o.capsules || []).forEach(function (c) { if (c) addList(c.images); });
  }

  /* JSON.stringify replacer：已确认入库的大图 → 占位符；其余原样 */
  function trimReplacer(k, v) {
    if (typeof v === 'string' && v.length > INLINE_MAX && v.indexOf('data:') === 0) {
      var key = keyOf(v);
      if (offloaded[key]) return '@@idb:' + key + '@@';
    }
    return v;
  }

  function scheduleTrim(delay) {
    if (trimTimer || trimming) return;
    trimTimer = setTimeout(function () {
      trimTimer = null;
      trimNow();
    }, delay === undefined ? 600 : delay);
  }

  /* 把 state 里超过阈值的图片搬进 IndexedDB，并用瘦身版重写 localStorage。
     无论是否真的搬了图，结束时都会用 replacer 落盘一次（保证导入后必持久化）。 */
  function trimNow() {
    if (!window.IDB) return Promise.resolve(false);
    if (trimming) return trimming;
    trimming = IDB.can().then(function (okIdb) {
      if (!okIdb) return false;
      function offloadBig(pass) {
        var jobs = [];
        eachImage(state, function (ref) {
          var u = ref.read();
          if (typeof u === 'string' && u.indexOf('data:') === 0 && u.length > INLINE_MAX) {
            var key = keyOf(u);
            if (!offloaded[key]) jobs.push(IDB.put(key, u).then(function () { offloaded[key] = true; }));
          }
        });
        return Promise.all(jobs).then(function () {
          localStorage.setItem(KEY, JSON.stringify(state, trimReplacer));
          // 若仍是小图累积撑大（极少见），第二遍把阈值降到 0 全量搬走
          var len = localStorage.getItem(KEY) ? localStorage.getItem(KEY).length : 0;
          if (pass === 0 && len > TRIM_HIGH) {
            INLINE_MAX = 0;
            return offloadBig(1);
          }
          return true;
        });
      }
      return offloadBig(0).then(function () {
        INLINE_MAX = 48000;   // 恢复默认阈值
        gcImages();
        return true;
      });
    }).then(function (r) { trimming = null; return r; }, function () { trimming = null; return false; });
    return trimming;
  }

  /* 启动 / 导出前调用：把 localStorage 里的占位符换回完整 dataURL。
     某个 key 已不在 IndexedDB（用户清了站点数据）→ 直接删掉该图，不留坏引用。 */
  function restoreImages() {
    if (!window.IDB) return Promise.resolve(0);
    var found = [];
    eachImage(state, function (ref) {
      var m = String(ref.read()).match(/^@@idb:(.+)@@$/);
      if (m) found.push({ ref: ref, key: m[1] });
    }, true);
    if (!found.length) return Promise.resolve(0);
    return IDB.can().then(function (okIdb) {
      if (!okIdb) return 0;
      var n = 0;
      var chain = Promise.resolve();
      found.forEach(function (it) {
        chain = chain.then(function () {
          return IDB.get(it.key).then(function (v) {
            if (v) { it.ref.write(v); offloaded[it.key] = true; n++; }
            else it.ref.remove();
          });
        });
      });
      return chain.then(function () { return n; });
    }).catch(function () { return 0; });
  }

  /* 清理孤儿图：删掉旅程/胶囊后，IndexedDB 里没人引用的 key 定期清除。
     keep 集合直接由内存里的完整 dataURL 算出（keyOf），不依赖占位符。
     force=true 跳过 60s 节流（测试 / 清空数据时用）。 */
  function gcImages(force) {
    if (!force && Date.now() - gcLast < 60000) return;
    gcLast = Date.now();
    if (!window.IDB) return;
    var keep = {};
    eachImage(state, function (ref) {
      var u = ref.read();
      if (typeof u === 'string' && u.indexOf('data:') === 0) keep[keyOf(u)] = true;
    });
    IDB.keys().then(function (ks) {
      var stale = ks.filter(function (k) { return !keep[k]; });
      if (!stale.length) return;
      stale.forEach(function (k) {
        delete offloaded[k];
        IDB.del(k).catch(function () {});
      });
    }).catch(function () {});
  }

  /* ---------- 默认状态 ---------- */
  function blank() {
    return {
      version: 1,
      users: [],
      couple: null,
      currentUserId: null,
      journeys: [],
      wishes: [],
      todos: [],
      capsules: [],
      blacklist: [],
      settings: {
        fabEnabled: true, roleLast: null, theme: 'auto',
        backup: { remind: true, intervalDays: 7 }
      },
      meta: { lastDoorDate: null, seeded: false, lastBackupAt: null, lastBackupRemindAt: null }
    };
  }

  /* 补齐嵌套默认字段（老存档 / 导入的旧数据没有新字段时补上） */
  function ensureDefaults() {
    var d = blank();
    Object.keys(d).forEach(function (k) { if (state[k] === undefined) state[k] = d[k]; });
    if (!state.settings || typeof state.settings !== 'object') state.settings = d.settings;
    if (!state.settings.backup) state.settings.backup = { remind: true, intervalDays: 7 };
    if (!state.meta || typeof state.meta !== 'object') state.meta = d.meta;
    if (state.meta.lastBackupAt === undefined) state.meta.lastBackupAt = null;
    if (state.meta.lastBackupRemindAt === undefined) state.meta.lastBackupRemindAt = null;
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); }
    catch (e) { storageOK = false; }
    if (raw) {
      try { state = JSON.parse(raw); }
      catch (e) { state = blank(); }
    } else {
      state = blank();
    }
    ensureDefaults();
    return state;
  }

  function save() {
    var txt;
    try { txt = JSON.stringify(state, trimReplacer); }
    catch (e) { storageOK = false; return false; }
    try {
      localStorage.setItem(KEY, txt);
      storageOK = true;
      idbWarned = false;
      if (window.IDB && txt.length > TRIM_HIGH) scheduleTrim();
      return true;
    } catch (e) {
      storageOK = false;
      if (window.IDB) {
        if (!idbWarned) {
          idbWarned = true;
          if (window.UI && UI.toast) UI.toast('本地空间紧张，正在把照片转入浏览器图库…', 'err');
        }
        scheduleTrim(0);   // 配额已满：立刻安排卸载（异步搬图后会自动落盘瘦身版）
      } else {
        if (window.UI && UI.toast) UI.toast('本地存储空间不足，请导出备份后清理图片', 'err');
      }
      return false;
    }
  }

  function reset() {
    state = blank();
    offloaded = {};
    if (window.IDB) { IDB.clear().catch(function () {}); }
    save();
  }

  function replaceAll(obj) {
    state = obj;
    ensureDefaults();
    save();
  }

  /* 导入专用：先整包进内存并落盘，再把大图异步搬进 IndexedDB 瘦身。
     返回 Promise<boolean>：是否成功通过 IndexedDB 完成瘦身落盘。 */
  function importReplace(obj) {
    replaceAll(obj);
    if (window.IDB) return trimNow();
    return Promise.resolve(false);
  }

  /* ================= 合并导入（真双人模式） =================
     两人各用一台设备记录，把对方导出的 JSON **合并**进来（而不是整体覆盖）。
     规则：
       ① 用户按 nickname 对齐 —— 两台设备各自绑定会生成不同的 uid，
          所以要建「对方 id → 本地 id」映射，并把对方数据里的 user_id 全部改过来；
       ② 旅程按 id 去重：本地没有的整条加入；同一条则**逐侧补全**
          （本地缺的那一侧用对方的 —— 这正是双面叙事能拼起来的关键）；
       ③ 标注 / 备注按 id 取并集；共识、重要标记按「有则用」；
       ④ 愿望 / 待办 / 胶囊按 id 取并集；黑名单按 type+value 去重。
     合并后 UI 会靠 mine && other 自动识别「双方都提交了 → 可合并确认」。 */
  function mergeFrom(obj) {
    var incoming = obj || {};
    var stats = { added: 0, sidesFilled: 0, wishes: 0, todos: 0, capsules: 0 };

    /* ① 用户对齐 */
    var idMap = {};
    (incoming.users || []).forEach(function (ru) {
      var hit = state.users.filter(function (u) { return u.nickname === ru.nickname; })[0];
      if (hit) idMap[ru.id] = hit.id;
      else { state.users.push(ru); idMap[ru.id] = ru.id; }
    });
    var mId = function (id) { return (id && idMap[id]) || id; };
    var mIds = function (a) { return (a || []).map(mId); };
    var localCoupleId = state.couple ? state.couple.id : null;

    function remapOwners(j) {
      if (localCoupleId && j.couple_id) j.couple_id = localCoupleId;
      if (j.roles) { j.roles.hunter = mId(j.roles.hunter); j.roles.poet = mId(j.roles.poet); }
      ['a_side', 'b_side'].forEach(function (k) {
        if (j[k] && j[k].user_id) j[k].user_id = mId(j[k].user_id);
      });
      if (j.created_by) j.created_by = mId(j.created_by);
      if (j.important_marked_by) j.important_marked_by = mId(j.important_marked_by);
      if (j.consensus) j.consensus.confirmed_by = mIds(j.consensus.confirmed_by);
      (j.annotations || []).forEach(function (a) { if (a.author_id) a.author_id = mId(a.author_id); });
      (j.notes || []).forEach(function (n) { if (n.author_id) n.author_id = mId(n.author_id); });
    }
    function unionById(a, b) {
      var seen = {}, out = [];
      (a || []).forEach(function (x) { if (x && x.id && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
      (b || []).forEach(function (x) { if (x && x.id && !seen[x.id]) { seen[x.id] = 1; out.push(x); } });
      return out;
    }

    /* ② 旅程 */
    var byId = {};
    state.journeys.forEach(function (j) { byId[j.id] = j; });
    (incoming.journeys || []).forEach(function (rj) {
      remapOwners(rj);
      var lj = byId[rj.id];
      if (!lj) { state.journeys.push(rj); byId[rj.id] = rj; stats.added++; return; }

      /* 同一条 → 逐侧补全 */
      ['a_side', 'b_side'].forEach(function (k) {
        var ls = lj[k], rs = rj[k];
        if (!rs) return;
        if (!ls || !ls.text) { lj[k] = rs; stats.sidesFilled++; return; }
        if (rs.text !== ls.text) {
          /* 同一个人在两台设备都写过 → 取更新时间较新的 */
          var rt = new Date(rj.updated_at || 0).getTime();
          var lt = new Date(lj.updated_at || 0).getTime();
          if (rt > lt) { lj[k] = rs; stats.sidesFilled++; }
        }
      });
      lj.annotations = unionById(lj.annotations, rj.annotations);
      lj.notes = unionById(lj.notes, rj.notes);
      if (!lj.consensus && rj.consensus) lj.consensus = rj.consensus;
      if (rj.is_important && !lj.is_important) {
        lj.is_important = true;
        lj.important_categories = rj.important_categories || lj.important_categories;
        lj.important_marked_by = rj.important_marked_by;
        lj.important_marked_at = rj.important_marked_at;
      }
      if (new Date(rj.updated_at || 0) > new Date(lj.updated_at || 0)) lj.updated_at = rj.updated_at;
    });

    /* ③ 愿望 / 待办 / 胶囊：按 id 取并集 */
    ['wishes', 'todos', 'capsules'].forEach(function (key) {
      var seen = {};
      (state[key] || []).forEach(function (x) { if (x && x.id) seen[x.id] = 1; });
      (incoming[key] || []).forEach(function (x) {
        if (!x || !x.id || seen[x.id]) return;
        if (localCoupleId && x.couple_id) x.couple_id = localCoupleId;
        if (x.created_by) x.created_by = mId(x.created_by);
        if (x.assignee) x.assignee = mId(x.assignee);
        if (x.author_id) x.author_id = mId(x.author_id);
        state[key].push(x); seen[x.id] = 1; stats[key]++;
      });
    });

    /* ④ 黑名单：按 type + value 去重 */
    var blSeen = {};
    (state.blacklist || []).forEach(function (b) { if (b) blSeen[b.type + '|' + b.value] = 1; });
    (incoming.blacklist || []).forEach(function (b) {
      if (!b || blSeen[b.type + '|' + b.value]) return;
      state.blacklist.push(b); blSeen[b.type + '|' + b.value] = 1;
    });

    save();
    return stats;
  }

  /* 合并导入入口：合并 → 落盘 → 大图异步搬进 IndexedDB。返回 Promise<stats> */
  function importMerge(obj) {
    var stats = mergeFrom(obj);
    if (window.IDB) return trimNow().then(function () { return stats; });
    return Promise.resolve(stats);
  }

  /* ---------- 用户 / 双人关系 ---------- */
  function me() {
    return state.users.filter(function (u) { return u.id === state.currentUserId; })[0] || null;
  }
  function partner() {
    if (!state.couple) return null;
    var otherId = state.couple.user_a_id === state.currentUserId
      ? state.couple.user_b_id : state.couple.user_a_id;
    return state.users.filter(function (u) { return u.id === otherId; })[0] || null;
  }
  function userById(id) {
    return state.users.filter(function (u) { return u.id === id; })[0] || null;
  }
  function isBonded() { return !!state.couple && state.couple.status === 'active'; }

  /* 当前用户属于 A 方还是 B 方 */
  function mySideKey() {
    if (!state.couple) return 'a_side';
    return state.couple.user_a_id === state.currentUserId ? 'a_side' : 'b_side';
  }
  function otherSideKey() { return mySideKey() === 'a_side' ? 'b_side' : 'a_side'; }

  function bindUsers(nameA, nameB, magic) {
    var ua = { id: uid('u'), nickname: nameA, avatar_url: '', created_at: nowISO() };
    var ub = { id: uid('u'), nickname: nameB, avatar_url: '', created_at: nowISO() };
    state.users = [ua, ub];
    state.couple = {
      id: uid('c'),
      user_a_id: ua.id, user_b_id: ub.id,
      status: 'active',
      magic_code: magic || { color: '琥珀色', adjective: '温暖的' },
      bonded_at: nowISO(), dissolved_at: null, created_at: nowISO()
    };
    state.currentUserId = ua.id;
    save();
    return state.couple;
  }

  function switchIdentity() {
    if (!state.couple) return;
    state.currentUserId = state.couple.user_a_id === state.currentUserId
      ? state.couple.user_b_id : state.couple.user_a_id;
    save();
  }

  /* ---------- 旅程 ---------- */
  function newJourney(seed) {
    var j = {
      id: uid('j'),
      couple_id: state.couple ? state.couple.id : null,
      cover_image: '',
      title: '',
      category: '美食',
      start_date: nowISO(),
      end_date: nowISO(),
      location_name: '',
      location_coords: null,
      weather: '',
      expense: null,
      companion_count: 2,
      status: 'draft',
      magic_code: null,
      roles: { hunter: null, poet: null },
      a_side: null,
      b_side: null,
      consensus: null,
      is_important: false,
      important_categories: [],
      important_marked_by: null,
      important_marked_at: null,
      annotations: [],
      notes: [],
      review_count: 0,
      created_by: state.currentUserId,
      last_visited_at: nowISO(),
      created_at: nowISO(),
      updated_at: nowISO()
    };
    if (seed) Object.keys(seed).forEach(function (k) { j[k] = seed[k]; });
    return j;
  }

  function sideTemplate(userId) {
    return { user_id: userId, text: '', images: [], score: null, senses: { smell: '', sound: '', temp: '' } };
  }

  function addJourney(j) { state.journeys.unshift(j); save(); return j; }

  function getJourney(id) {
    return state.journeys.filter(function (j) { return j.id === id; })[0] || null;
  }

  function updateJourney(id, patch) {
    var j = getJourney(id);
    if (!j) return null;
    Object.keys(patch).forEach(function (k) { j[k] = patch[k]; });
    j.updated_at = nowISO();
    save();
    return j;
  }

  function deleteJourney(id) {
    state.journeys = state.journeys.filter(function (j) { return j.id !== id; });
    save();
  }

  function journeys() {
    return state.journeys.slice().sort(function (a, b) {
      return new Date(b.start_date) - new Date(a.start_date);
    });
  }

  function visibleJourneys() {
    // 单人模式下也能看到自己的
    return journeys();
  }

  /* ---------- 自动黑名单（PRD 2.8） ---------- */
  function applyBlacklistRule(j) {
    if (!j || !j.location_name) return;
    var scores = [];
    if (j.a_side && j.a_side.score) scores.push(j.a_side.score);
    if (j.b_side && j.b_side.score) scores.push(j.b_side.score);
    if (!scores.length) return;

    var low = scores.some(function (s) { return s <= 2; });
    var high = scores.length === 2 && scores.every(function (s) { return s >= 4; })
      || scores.length === 1 && scores[0] >= 4;

    if (low) {
      addBlacklist('location', j.location_name, '评分 ≤ 2 自动拉黑');
      ((j.consensus && j.consensus.tags) || []).forEach(function (tid) {
        addBlacklist('tag', tid, '来自低分旅程：' + j.location_name);
      });
    } else if (high) {
      removeBlacklist('location', j.location_name);
    }
  }
  function addBlacklist(type, value, reason) {
    var exist = state.blacklist.filter(function (b) { return b.type === type && b.value === value; })[0];
    if (exist) return;
    state.blacklist.push({ id: uid('bl'), type: type, value: value, reason: reason, created_at: nowISO() });
    save();
  }
  function removeBlacklist(type, value) {
    state.blacklist = state.blacklist.filter(function (b) {
      return !(b.type === type && b.value === value);
    });
    save();
  }
  function isBlacklisted(type, value) {
    return state.blacklist.some(function (b) { return b.type === type && b.value === value; });
  }

  /* ---------- 归档 ---------- */
  function tryArchive(j) {
    if (!j.a_side || !j.b_side) return false;
    var confirmed = (j.consensus && j.consensus.confirmed_by) || [];
    var need = [state.couple && state.couple.user_a_id, state.couple && state.couple.user_b_id]
      .filter(Boolean);
    var ok = need.length === 0 ? true : need.every(function (id) { return confirmed.indexOf(id) >= 0; });
    if (ok) {
      j.status = 'archived';
      j.updated_at = nowISO();
      applyBlacklistRule(j);
      save();
      return true;
    }
    return false;
  }

  /* ---------- 愿望 ---------- */
  function addWish(w) {
    var item = {
      id: uid('w'), couple_id: state.couple ? state.couple.id : null,
      title: w.title, description: w.description || '',
      category: w.category || '', is_done: false, fulfilled_journey_id: null,
      created_by: state.currentUserId, created_at: nowISO(), completed_at: null
    };
    state.wishes.unshift(item); save(); return item;
  }
  function updateWish(id, patch) {
    var w = state.wishes.filter(function (x) { return x.id === id; })[0];
    if (!w) return null;
    Object.keys(patch).forEach(function (k) { w[k] = patch[k]; });
    save(); return w;
  }
  function deleteWish(id) {
    state.wishes = state.wishes.filter(function (x) { return x.id !== id; });
    save();
  }

  /* ---------- 统计 ---------- */
  /* 连续记录天数（PRD 4.4 机制四） */
  function streakDays() {
    var set = {};
    state.journeys.forEach(function (j) { set[fmtYMD(j.created_at)] = true; });
    var d = new Date();
    if (!set[fmtYMD(d.toISOString())]) d.setDate(d.getDate() - 1);   // 今天没记不算断档
    var n = 0;
    while (set[fmtYMD(d.toISOString())]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function dayScore(dateStr) {
    // 返回当天的双人评分均值（1-5）或 null
    var ymd = dateStr;
    var list = state.journeys.filter(function (j) {
      return fmtYMD(j.start_date) === ymd && (j.status === 'archived' || j.status === 'sealed' || j.status === 'draft');
    });
    var vals = [];
    list.forEach(function (j) {
      if (j.a_side && j.a_side.score) vals.push(j.a_side.score);
      if (j.b_side && j.b_side.score) vals.push(j.b_side.score);
    });
    if (!vals.length) return null;
    return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }

  function fmtYMD(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- 待办（PRD 3.7） ---------- */
  function addTodo(t) {
    var item = {
      id: uid('t'), couple_id: state.couple ? state.couple.id : null,
      content: t.content, urgency: t.urgency || 3,
      estimated_minutes: t.estimated_minutes || null,
      is_done: false, deadline: t.deadline || null,
      assignee: t.assignee || null,
      created_by: state.currentUserId,
      created_at: nowISO(), completed_at: null
    };
    state.todos = state.todos || [];
    state.todos.unshift(item); save(); return item;
  }
  function updateTodo(id, patch) {
    state.todos = state.todos || [];
    var t = state.todos.filter(function (x) { return x.id === id; })[0];
    if (!t) return null;
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    save(); return t;
  }
  function deleteTodo(id) {
    state.todos = (state.todos || []).filter(function (x) { return x.id !== id; });
    save();
  }

  /* ---------- 时光胶囊（PRD 7.3） ---------- */
  function addCapsule(c) {
    var item = {
      id: uid('cap'), couple_id: state.couple ? state.couple.id : null,
      title: c.title || '写给未来的一封信',
      content: c.content || '',
      images: c.images || [],
      author_id: state.currentUserId,
      unlock_at: c.unlock_at,
      created_at: nowISO(),
      opened_at: null,
      status: 'locked'
    };
    state.capsules = state.capsules || [];
    state.capsules.unshift(item); save(); return item;
  }
  function openCapsule(id) {
    var c = (state.capsules || []).filter(function (x) { return x.id === id; })[0];
    if (!c) return null;
    c.status = 'opened';
    c.opened_at = nowISO();
    save(); return c;
  }
  function deleteCapsule(id) {
    state.capsules = (state.capsules || []).filter(function (x) { return x.id !== id; });
    save();
  }
  /* 到点可开启、但还没开启的胶囊 */
  function readyCapsules() {
    return (state.capsules || []).filter(function (c) {
      return c.status === 'locked' && new Date(c.unlock_at).getTime() <= Date.now();
    });
  }

  function exportJSON() {
    return JSON.stringify({
      app: '探险家的罗盘', version: 1, exported_at: nowISO(),
      data: state
    }, null, 2);
  }

  /* 同步用量：真实落盘文本（用 replacer 才算得准）+ 内联小图 / 大图引用计数 */
  function usageInfo() {
    var txt = '';
    try { txt = JSON.stringify(state, trimReplacer); } catch (e) { txt = '{}'; }
    var inline = 0, big = 0;
    eachImage(state, function (ref) {
      var u = ref.read();
      if (typeof u === 'string' && u.indexOf('data:') === 0) {
        if (u.length <= INLINE_MAX) inline++; else big++;
      }
    });
    return {
      bytes: txt.length * 2,   // UTF-16 单位 → 字节估算
      chars: txt.length,
      inline: inline,          // 内联在文本里的小图
      big: big                 // 走 IndexedDB 的大图
    };
  }

  /* 异步图库占用：需要 IndexedDB 游标遍历；不可用时返回全 0 */
  function idbUsage() {
    if (!window.IDB) return Promise.resolve({ count: 0, bytes: 0 });
    if (window.IDB.usage) return window.IDB.usage();
    return window.IDB.keys().then(function (ks) { return { count: ks.length, bytes: 0 }; })
      .catch(function () { return { count: 0, bytes: 0 }; });
  }

  return {
    KEY: KEY, uid: uid, nowISO: nowISO, clone: clone, pad: pad, fmtYMD: fmtYMD,
    get state() { return state; },
    isStorageOK: function () { return storageOK; },
    load: load, save: save, reset: reset, replaceAll: replaceAll, importReplace: importReplace,
    mergeFrom: mergeFrom, importMerge: importMerge,
    restoreImages: restoreImages, trimNow: trimNow, gcImages: gcImages,
    keyOf: keyOf, isPlaceholder: isPlaceholder, usageInfo: usageInfo, idbUsage: idbUsage,
    me: me, partner: partner, userById: userById, isBonded: isBonded,
    mySideKey: mySideKey, otherSideKey: otherSideKey,
    bindUsers: bindUsers, switchIdentity: switchIdentity,
    newJourney: newJourney, sideTemplate: sideTemplate,
    addJourney: addJourney, getJourney: getJourney, updateJourney: updateJourney,
    deleteJourney: deleteJourney, journeys: journeys, visibleJourneys: visibleJourneys,
    applyBlacklistRule: applyBlacklistRule, addBlacklist: addBlacklist,
    removeBlacklist: removeBlacklist, isBlacklisted: isBlacklisted, tryArchive: tryArchive,
    addWish: addWish, updateWish: updateWish, deleteWish: deleteWish,
    addTodo: addTodo, updateTodo: updateTodo, deleteTodo: deleteTodo,
    addCapsule: addCapsule, openCapsule: openCapsule, deleteCapsule: deleteCapsule,
    readyCapsules: readyCapsules,
    dayScore: dayScore, streakDays: streakDays, exportJSON: exportJSON
  };
})();
