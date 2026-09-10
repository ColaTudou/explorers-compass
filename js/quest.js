/* ============================================================
   任务冒险引擎 · window.Quest
   ------------------------------------------------------------
   一次「局」= 一次约会 / 一日游玩 / 一趟旅行。流程：
     灵感池（心愿）→ 系统派任务（个人 + 双人）→ 双方执行打卡
     → 结算完成情况 → 对本次任务打分 → 归档成经历（可生成故事录）

   设计铁律（与全站一致）：
     · AI 可选，失败一律回退本地规则，绝不让主流程崩
     · 双面叙事：solo 任务只有被分配的人能打卡；
                duo 任务双方各打各的卡，合并前看不到对方内容
   ============================================================ */
window.Quest = (function () {
  var DATA = window.DATA;

  /* ---------------- 主题预设 ----------------
     tags 用于把任务模板/规则库和主题对齐，让任务"贴合主题" */
  var THEMES = {
    daily: [
      { name: '城市漫步', tags: ['city', 'walk'] },
      { name: '逛吃一天', tags: ['food', 'city'] },
      { name: '宅家也浪漫', tags: ['home', 'cozy'] },
      { name: '拍照打卡', tags: ['photo'] },
      { name: '动起来', tags: ['sport'] },
      { name: '文艺半日', tags: ['art'] },
      { name: '夜色巡游', tags: ['night', 'city'] },
      { name: '怀旧路线', tags: ['memory', 'city'] },
      { name: '自然半日', tags: ['nature'] },
      { name: '随便逛逛', tags: [] }
    ],
    trip: [
      { name: '海边慢游', tags: ['sea', 'nature'] },
      { name: '山野徒步', tags: ['mountain', 'sport', 'nature'] },
      { name: '古城漫游', tags: ['oldtown', 'culture'] },
      { name: '美食寻味', tags: ['food'] },
      { name: '博物馆日', tags: ['art', 'culture'] },
      { name: '小镇闲逛', tags: ['town', 'walk'] },
      { name: '自然风光', tags: ['nature', 'photo'] },
      { name: '城市探险', tags: ['city', 'walk'] },
      { name: '亲子/轻户外', tags: ['nature', 'fun'] },
      { name: '说走就走', tags: [] }
    ]
  };

  /* ---------------- 规则库：本地随机生成规则用 ----------------
     tags 同上，'all' 表示任何主题都合适 */
  var RULES_LIB = [
    { text: '全程只许步行或公共交通', tags: ['all'] },
    { text: '每人各有 1 次「跳过权」，用完就不能跳了', tags: ['all'] },
    { text: '每完成一个任务，要互相夸对方一句（不许敷衍）', tags: ['all'] },
    { text: '拍照必须把对方拍进去', tags: ['photo', 'all'] },
    { text: '没到日落不准回住处', tags: ['trip', 'nature', 'sea'] },
    { text: '遇到岔路口，交给抛硬币决定', tags: ['walk', 'city', 'town', 'oldtown'] },
    { text: '必须进一家从没去过的店', tags: ['city', 'food', 'town', 'oldtown'] },
    { text: '每到一个地方留一张票据/一片叶子当纪念', tags: ['trip', 'all'] },
    { text: '全程不准玩手机（拍照和打卡除外）', tags: ['all'] },
    { text: '总花费不能超出预算，超了的人请下一顿', tags: ['food', 'all'] },
    { text: '晚餐地点由完成任务最少的人决定', tags: ['food', 'all'] },
    { text: '每完成 2 个任务，必须坐下休息 15 分钟', tags: ['walk', 'sport', 'trip'] },
    { text: '每人要给对方拍 3 张照片，回来一起挑', tags: ['photo', 'all'] },
    { text: '不许进连锁店，只找本地小店', tags: ['food', 'city', 'oldtown'] },
    { text: '路上要跟至少 1 个陌生人说话（问路也算）', tags: ['walk', 'city', 'town', 'trip'] },
    { text: '看到 3 种叫不出名字的东西就拍下来', tags: ['nature', 'mountain', 'sea'] },
    { text: '手机电量低于 20% 就地结束', tags: ['all'] },
    { text: '给这次出行起个名字，谁起得好听听谁的', tags: ['trip', 'all'] },
    { text: '最后一个任务由分数低的人出题', tags: ['all'] },
    { text: '全程只能用现金/只能刷同一个人的卡', tags: ['food', 'city'] },
    { text: '每天要写一句当天最想记住的话', tags: ['trip', 'memory'] },
    { text: '不许打车，三公里以内全靠走', tags: ['walk', 'city'] },
    { text: '必须在户外吃完一次东西（野餐/路边摊都行）', tags: ['nature', 'sea', 'food'] },
    { text: '看到有意思的门/窗/招牌就拍一张，凑够 9 张', tags: ['oldtown', 'photo', 'city'] }
  ];

  /* 双人任务模板：本地规则兜底用（不想动脑时也能开局） */
  var DUO_TEMPLATES = [
    { title: '合拍一张「只有我们」的照片', desc: '不拍风景，只拍两个人，构图随便但要有对方', tags: ['all', 'photo'] },
    { title: '各自给对方写一句此刻的话', desc: '写完互相看，不准敷衍', tags: ['all', 'memory'] },
    { title: '找一家没去过的小店', desc: '谁先看到就谁决定，进去坐十分钟', tags: ['city', 'food', 'town', 'oldtown'] },
    { title: '互相拍一张对方不知道的照片', desc: '抓拍，回来一起看', tags: ['all', 'photo'] },
    { title: '一起回答一个问题', desc: '今天最想记住的瞬间是什么？各自说各自的', tags: ['all'] },
    { title: '给这次出行起个名字', desc: '两个人各起一个，选一个都喜欢的', tags: ['trip', 'all'] },
    { title: '沿一条没走过的路走到底', desc: '不看导航，走到底看看是什么', tags: ['walk', 'city', 'town', 'oldtown'] },
    { title: '对着同一片景色各拍一张', desc: '拍完对比一下，看看两个人眼里的差别', tags: ['nature', 'sea', 'mountain', 'photo'] },
    { title: '一起吃一样没吃过的东西', desc: '路边摊也算，吃完互相打分', tags: ['food', 'city', 'oldtown'] },
    { title: '找一片可以坐下来的地方发呆十分钟', desc: '不许说话，就坐着', tags: ['nature', 'sea', 'cozy', 'town'] },
    { title: '在展品里各挑一件最想带走的', desc: '说完理由，不许说"都好看"', tags: ['art', 'culture'] },
    { title: '一起爬到最高处看一眼', desc: '山顶、楼顶、天台都行', tags: ['mountain', 'city', 'sport'] },
    { title: '踩一次水/摸一次沙子/淋一次雨', desc: '别矜持，玩一下', tags: ['sea', 'nature', 'fun'] },
    { title: '拍一段十秒的视频当纪念', desc: '不用剪辑，随手拍就行', tags: ['all', 'photo'] },
    { name_: 1, title: '找一家还亮着灯的小店进去', desc: '晚上还开着的店，进去坐坐', tags: ['night', 'city', 'town'] }
  ];

  var SOLO_TEMPLATES = [
    { title: '给 TA 准备一个小惊喜', desc: '预算内，随手能做到的那种', tags: ['all'] },
    { title: '记录一段声音', desc: '环境音也行，说句话也行', tags: ['all', 'nature'] },
    { title: '拍三张「今天的颜色」', desc: '你眼里的今天是什么颜色', tags: ['photo', 'all'] },
    { title: '替对方拍一张背影', desc: '不用打招呼', tags: ['photo', 'all'] },
    { title: '写一句现在的心情', desc: '一句话就够', tags: ['all', 'memory'] },
    { title: '问路/搭话一次', desc: '跟当地人聊两句，回来复述给 TA', tags: ['city', 'town', 'oldtown', 'trip'] },
    { title: '找一样当地特产买下来', desc: '不用贵，有意思就行', tags: ['food', 'oldtown', 'town', 'trip'] },
    { title: '画下今天看到的最好看的东西', desc: '随手画，火柴人也行', tags: ['art', 'nature'] },
    { title: '给 TA 带一份"你觉得 TA 会喜欢"的东西', desc: '路上随手买的', tags: ['food', 'city', 'all'] },
    { title: '偷偷记下 TA 今天说的一句话', desc: '结算时再说出来', tags: ['all', 'memory'] },
    { title: '走一段路不看手机', desc: '至少二十分钟', tags: ['walk', 'nature', 'sport'] },
    { title: '拍一张"只有这里才有"的照片', desc: '别的地方拍不到的那种', tags: ['trip', 'photo', 'nature', 'sea', 'mountain'] }
  ];

  var RATING_TAGS = ['很有趣', '刚刚好', '有点赶', '太贵了', '下次还想要', '不太合适'];

  /* ---------------- 基础读写 ---------------- */
  function list() { return (Store.state && Store.state.quests) || []; }
  function get(id) { return list().filter(function (q) { return q.id === id; })[0] || null; }
  function active() { return list().filter(function (q) { return q.status === 'active'; }); }
  function finished() {
    return list().filter(function (q) { return q.status === 'finished'; })
      .sort(function (a, b) { return String(b.finished_at || '').localeCompare(String(a.finished_at || '')); });
  }

  function save() { Store.save(); }

  function uid(p) {
    return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- 建局 ---------------- */
  function create(opts) {
    opts = opts || {};
    var q = {
      id: uid('q'),
      couple_id: Store.state.couple ? Store.state.couple.id : null,
      mode: opts.mode === 'trip' ? 'trip' : 'daily',
      title: opts.title || (opts.mode === 'trip' ? '一次旅行' : '今日份冒险'),
      theme: opts.theme || '',
      rules: normRules(opts.rules),
      location: opts.location || null,
      budget: (opts.budget === '' || opts.budget == null) ? null : Number(opts.budget) || null,
      spent: 0,
      wish_ids: [],
      tasks: [],
      status: 'active',
      created_by: Store.state.currentUserId,
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      finished_at: null,
      rating: null,
      rating_tags: [],
      summary: null,
      journal_id: null
    };
    Store.state.quests = Store.state.quests || [];
    Store.state.quests.unshift(q);
    save();
    return q;
  }

  /* ---------------- 生成任务 ----------------
     opts: { count, useWish, ai }
     返回 Promise<quest>                        */
  function generate(q, opts) {
    opts = opts || {};
    var want = Math.max(3, Math.min(8, opts.count || 5));
    var tags = themeTags(q.theme, q.mode);
    var pool = (Store.state.wishes || []).filter(function (w) { return !w.is_done; });
    var picked = pickWishes(pool, Math.min(want, pool.length ? 3 : 0));

    q.wish_ids = picked.map(function (w) { return w.id; });

    var tasks = [];
    /* ① 心愿变任务：随机决定是双人还是分给某个人 */
    picked.forEach(function (w) {
      var duo = Math.random() < 0.6;
      tasks.push({
        id: uid('t'), title: w.title, desc: w.description || '',
        type: duo ? 'duo' : 'solo',
        assignee: duo ? null : randomUser(),
        status: 'todo', checkins: [], rating: null,
        from: 'wish', wish_id: w.id, spent: 0, why: '来自你们的心愿'
      });
    });

    /* ② 补满数量：跟主题对得上的模板排前面 */
    var duoList = rank(DUO_TEMPLATES, tags);
    var soloList = rank(SOLO_TEMPLATES, tags);
    var di = 0, si = 0, guard = 0;
    while (tasks.length < want && guard++ < 40) {
      if (Math.random() < 0.5) {
        var d = duoList[di++ % duoList.length];
        if (!d || has(tasks, d.title)) continue;
        tasks.push(mk(d.title, d.desc, 'duo', null, 'rule'));
      } else {
        var s = soloList[si++ % soloList.length];
        if (!s || has(tasks, s.title)) continue;
        tasks.push(mk(s.title, s.desc, 'solo', randomUser(), 'rule'));
      }
    }

    q.tasks = tasks;
    save();

    /* ③ 配了 AI 就按「主题 + 规则 + 位置」出题（失败静默回退到本地） */
    if (opts.ai && window.LLM && LLM.isOn()) {
      return aiGen(q, want).then(function () { save(); return q; })
        .catch(function () { return q; });
    }
    return Promise.resolve(q);
  }

  /* 模板排序：命中主题 tags 的排前面，组内打乱 */
  function rank(list, tags) {
    var hit = [], miss = [];
    list.forEach(function (t) {
      var ts = t.tags || [];
      var m = tags.some(function (x) { return ts.indexOf(x) >= 0; });
      (m ? hit : miss).push(t);
    });
    return shuffle(hit).concat(shuffle(miss));
  }
  function shuffle(a) {
    var c = a.slice();
    for (var i = c.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = c[i]; c[i] = c[j]; c[j] = t;
    }
    return c;
  }

  /* 主题 → tags：先查预设，查不到就从主题文字里猜关键词 */
  var TAG_KEYS = [
    ['sea', ['海', '沙滩', '岛', '海岸', '浪']],
    ['mountain', ['山', '徒步', '登', '爬', '峰']],
    ['food', ['吃', '美食', '探店', '小吃', '餐厅', '觅食']],
    ['city', ['城', '街', '市', '商圈', '逛', 'CBD']],
    ['nature', ['自然', '公园', '湖', '森', '花', '露营', '田野']],
    ['photo', ['拍', '摄影', '照片', '打卡', '出片']],
    ['art', ['美术', '展', '文艺', '书店', '博物', '画廊']],
    ['culture', ['古', '博物馆', '历史', '文化', '民俗']],
    ['oldtown', ['古镇', '老街', '古城', '胡同', '巷']],
    ['sport', ['运动', '跑步', '骑', '健身', '球', '流汗']],
    ['night', ['夜', '晚上', '夜市', '灯光', '日落之后']],
    ['memory', ['回忆', '怀旧', '纪念', '老地方', '从前']],
    ['walk', ['散步', '漫步', '走走', '闲逛', '溜达']],
    ['home', ['宅', '家里', '居家', '不出门']],
    ['cozy', ['宅', '窝', '安静', '慢', '躺']],
    ['town', ['小镇', '乡村', '县城', '乡下']],
    ['fun', ['玩', '游乐', '亲子', '小孩', '疯']]
  ];
  function themeTags(theme, mode) {
    var t = String(theme || '').trim();
    var presets = THEMES[mode === 'trip' ? 'trip' : 'daily'] || [];
    for (var i = 0; i < presets.length; i++) {
      if (presets[i].name === t) return presets[i].tags.slice();
    }
    var out = [];
    TAG_KEYS.forEach(function (p) {
      p[1].forEach(function (k) {
        if (t.indexOf(k) >= 0 && out.indexOf(p[0]) < 0) out.push(p[0]);
      });
    });
    return out;
  }

  /* 规则归一化：接受字符串（换行分隔）/ 数组 / [{text,from}] */
  function normRules(rules, from) {
    var arr = [];
    if (typeof rules === 'string') {
      arr = rules.split(/\n+/).map(function (s) { return { text: s }; });
    } else if (Array.isArray(rules)) {
      arr = rules.map(function (r) { return typeof r === 'string' ? { text: r } : (r || {}); });
    }
    return arr.map(function (o) {
      return {
        id: uid('r'),
        text: String(o.text || '').trim().slice(0, 40),
        from: o.from || from || 'manual'
      };
    }).filter(function (r) { return r.text; }).slice(0, 8);
  }

  /* 本地随机规则：跟主题对得上的优先 */
  function randomRules(theme, mode, n) {
    n = n || 3;
    var tags = themeTags(theme, mode);
    return rank(RULES_LIB, tags).slice(0, n).map(function (r) { return r.text; });
  }

  /* ---------------- 定位（旅行模式用） ----------------
     全部静默失败：拿不到就返回 null，绝不阻塞开局 */
  function supported() {
    return !!(typeof navigator !== 'undefined' && navigator.geolocation);
  }
  function locate() {
    return new Promise(function (resolve, reject) {
      if (!supported()) { reject(new Error('浏览器不支持定位')); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        resolve({
          lat: pos.coords.latitude, lng: pos.coords.longitude,
          label: '', at: new Date().toISOString()
        });
      }, function (e) {
        reject(new Error((e && e.message) || '定位被拒绝'));
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 });
    });
  }

  /* 坐标 → 地名（免费接口，失败就当没地名） */
  function reverseGeocode(lat, lng) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (done) return; done = true; resolve(v); }
      var timer = setTimeout(function () { fin(null); }, 6000);
      try {
        fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
          encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lng) + '&localityLanguage=zh')
          .then(function (r) { return r.json(); })
          .then(function (d) {
            clearTimeout(timer);
            fin([d.city || d.locality || d.principalSubdivision, d.countryName]
              .filter(Boolean).join(' · ') || null);
          })
          .catch(function () { clearTimeout(timer); fin(null); });
      } catch (e) { clearTimeout(timer); fin(null); }
    });
  }

  /* 定位 + 地名一步到位，整条链失败返回 null */
  function locateWithName() {
    return locate().then(function (c) {
      return reverseGeocode(c.lat, c.lng).then(function (n) {
        c.label = n || '当前位置';
        return c;
      });
    }).catch(function () { return null; });
  }

  function timeOfDay() {
    var h = new Date().getHours();
    if (h < 6) return '凌晨';
    if (h < 9) return '清晨';
    if (h < 12) return '上午';
    if (h < 14) return '中午';
    if (h < 18) return '午后';
    if (h < 20) return '傍晚';
    return '夜里';
  }

  function mk(title, desc, type, assignee, from, why) {
    return {
      id: uid('t'), title: title, desc: desc, type: type, assignee: assignee,
      status: 'todo', checkins: [], rating: null, from: from || 'rule',
      wish_id: null, spent: 0, why: why || ''
    };
  }
  function has(tasks, title) {
    return tasks.some(function (t) { return t.title === title; });
  }
  function pickWishes(pool, n) {
    var copy = pool.slice();
    var out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
  }
  function randomUser() {
    var us = Store.state.users || [];
    if (!us.length) return null;
    return us[Math.floor(Math.random() * us.length)].id;
  }

  /* AI 出题：主题 + 规则 + 位置 + 心愿 + 预算一起交给模型 */
  function aiGen(q, want) {
    return aiTasks(q, want).then(function (tasks) {
      if (!tasks.length) throw new Error('AI 任务为空');
      /* AI 任务放前面，心愿任务保留在后，保证心愿一定被用到 */
      q.tasks = tasks.concat(q.tasks.filter(function (t) { return t.from === 'wish'; }));
    });
  }

  /* 只要任务、不写入：给「AI 补几个任务」用 */
  function moreTasks(q, n) {
    if (!window.LLM || !LLM.isOn()) return Promise.resolve([]);
    return aiTasks(q, n || 2).then(function (tasks) {
      q.tasks = (q.tasks || []).concat(tasks);
      save();
      return tasks;
    }).catch(function () { return []; });
  }

  function aiTasks(q, want) {
    want = Math.max(3, Math.min(8, want || 5));
    var wishes = q.wish_ids.map(function (id) {
      return (Store.state.wishes || []).filter(function (w) { return w.id === id; })[0];
    }).filter(Boolean).map(function (w) { return w.title + (w.category ? '（' + w.category + '）' : ''); });
    var rules = (q.rules || []).map(function (r) { return r.text; });
    var loc = q.location;

    var p = [];
    p.push('你是给情侣设计约会/旅行小任务的游戏策划，出的题要就地可执行、有画面感。');
    p.push('');
    p.push('【这一局】');
    p.push('- 名称：' + q.title);
    p.push('- 场景：' + (q.mode === 'trip' ? '一次旅行途中' : '一日约会'));
    p.push('- 主题：' + (q.theme || '（没定主题，你自己挑一个有趣的）'));
    p.push('- 时段：' + timeOfDay());
    p.push('- 总预算：' + (q.budget ? q.budget + ' 元（怎么花由他们自己决定，不要拆到细项）' : '没设预算'));
    if (loc) {
      p.push('- 所在地：' + (loc.label || '当前位置') +
        '（纬度 ' + Number(loc.lat).toFixed(3) + '，经度 ' + Number(loc.lng).toFixed(3) + '）');
      if (loc.weather) p.push('- 当地天气：' + loc.weather);
    }
    if (rules.length) {
      p.push('- 他们自己定的规则（你出的题绝对不能违反）：');
      rules.forEach(function (r, i) { p.push('   ' + (i + 1) + '. ' + r); });
    }
    p.push('- 他们的心愿（能用上就用上）：' + (wishes.length ? wishes.join('、') : '（还没写心愿）'));
    p.push('');
    p.push('【要求】');
    p.push('1. 生成 ' + want + ' 个任务。' +
      (q.theme ? '每一个都必须明显贴合主题「' + q.theme + '」，不许跑题。' : ''));
    if (loc) p.push('2. 任务要能在「' + (loc.label || '当前位置') + '」附近完成，可以点名当地常见的地方类型（老街 / 海边 / 山道 / 夜市 之类），但不要编造具体店名。');
    else p.push('2. 任务要日常可执行，不需要特殊场地。');
    p.push('3. 其中至少 2 个是双人共同完成的（type = "duo"），其余单人（type = "solo"）。');
    p.push('4. 每个任务再给一句 why：为什么在这个主题/这个地方出这道题（不超过 20 字）。');
    p.push('5. 不要违反上面任何一条规则；不要出现违法、危险、需要专业装备的内容。');
    p.push('');
    p.push('严格只输出 JSON 数组，不要任何解释文字：');
    p.push('[{"title":"(不超过12字)","desc":"(一句话，不超过30字)","type":"duo 或 solo","why":"(不超过20字)"}]');

    return LLM.chat([{ role: 'user', content: p.join('\n') }], { temperature: 0.9, maxTokens: 900 })
      .then(function (text) {
        var arr = LLM.parseJSON(text);
        if (!arr || !arr.length) throw new Error('AI 没给出任务');
        var tasks = [];
        arr.slice(0, 8).forEach(function (it) {
          if (!it || !it.title) return;
          var duo = String(it.type || '').toLowerCase() === 'duo';
          tasks.push(mk(String(it.title).slice(0, 24), String(it.desc || '').slice(0, 60),
            duo ? 'duo' : 'solo', duo ? null : randomUser(), 'ai',
            String(it.why || '').slice(0, 40)));
        });
        return tasks;
      });
  }

  /* AI 生成规则：给这局定几条好玩的规矩，失败返回 [] */
  function aiRules(theme, mode, n) {
    n = n || 3;
    if (!window.LLM || !LLM.isOn()) return Promise.resolve([]);
    var prompt = '你是情侣约会/旅行小游戏的设计师。\n' +
      '场景：' + (mode === 'trip' ? '一次旅行途中' : '一日约会') + '\n' +
      '主题：' + (theme || '（随便）') + '\n\n' +
      '请设计 ' + n + ' 条好玩但不折腾的「游戏规则」，要求是：\n' +
      '· 一句话，不超过 20 字，口语化，读起来想玩\n' +
      '· 主题贴合，能在现实中做到，不违法不危险不花钱\n' +
      '· 不要重复下面这几条：' + RULES_LIB.slice(0, 6).map(function (r) { return r.text; }).join('、') + '\n' +
      '严格只输出 JSON 数组：["规则1","规则2","规则3"]，不要任何解释文字。';
    return LLM.chat([{ role: 'user', content: prompt }], { temperature: 1, maxTokens: 300 })
      .then(function (text) {
        var arr = LLM.parseJSON(text);
        if (!arr || !arr.length) return [];
        return arr.map(function (s) { return String(s || '').trim().slice(0, 40); })
          .filter(Boolean).slice(0, 5);
      })
      .catch(function () { return []; });
  }

  /* ---------------- 执行 / 打卡 ---------------- */
  function myTasks(q) {
    var me = Store.state.currentUserId;
    return (q.tasks || []).filter(function (t) {
      return t.type === 'duo' || t.assignee === me || !t.assignee;
    });
  }
  function otherTasks(q) {
    var me = Store.state.currentUserId;
    return (q.tasks || []).filter(function (t) { return t.type === 'solo' && t.assignee && t.assignee !== me; });
  }

  function checkin(q, taskId, data) {
    data = data || {};
    var t = (q.tasks || []).filter(function (x) { return x.id === taskId; })[0];
    if (!t) return null;
    var me = Store.state.currentUserId;
    t.checkins = t.checkins || [];
    var mine = t.checkins.filter(function (c) { return c.userId === me; })[0];
    if (!mine) {
      mine = { userId: me, at: null, note: '', images: [] };
      t.checkins.push(mine);
    }
    mine.at = new Date().toISOString();
    if (data.note != null) mine.note = data.note;
    if (data.images && data.images.length) mine.images = data.images.slice(0, 6);
    if (data.spent != null && !isNaN(Number(data.spent))) {
      t.spent = Number(data.spent);
      q.spent = (q.tasks || []).reduce(function (s, x) { return s + (Number(x.spent) || 0); }, 0);
    }
    if (t.status === 'todo') t.status = 'doing';
    /* 完成判定：duo 要双方都打卡；solo 自己打即可 */
    if (t.type === 'duo') {
      if (t.checkins.length >= 2) t.status = 'done';
    } else {
      t.status = 'done';
    }
    if (t.status === 'done' && t.wish_id) {
      var w = (Store.state.wishes || []).filter(function (x) { return x.id === t.wish_id; })[0];
      if (w && !w.is_done) {
        Store.updateWish(w.id, { is_done: true, completed_at: new Date().toISOString() });
      }
    }
    save();
    return t;
  }

  function skip(q, taskId) {
    var t = (q.tasks || []).filter(function (x) { return x.id === taskId; })[0];
    if (t) { t.status = 'skip'; save(); }
    return t;
  }

  function reopen(q, taskId) {
    var t = (q.tasks || []).filter(function (x) { return x.id === taskId; })[0];
    if (t) { t.status = 'todo'; save(); }
    return t;
  }

  function rateTask(q, taskId, score) {
    var t = (q.tasks || []).filter(function (x) { return x.id === taskId; })[0];
    if (t) { t.rating = Math.max(1, Math.min(5, Number(score) || 0)) || null; save(); }
    return t;
  }

  /* ---------------- 进度 / 结算 ---------------- */
  function progress(q) {
    var ts = q.tasks || [];
    var done = ts.filter(function (t) { return t.status === 'done'; }).length;
    var skipd = ts.filter(function (t) { return t.status === 'skip'; }).length;
    var duo = ts.filter(function (t) { return t.type === 'duo'; });
    return {
      total: ts.length, done: done, skip: skipd,
      pct: ts.length ? Math.round(done / ts.length * 100) : 0,
      duoTotal: duo.length,
      duoDone: duo.filter(function (t) { return t.status === 'done'; }).length,
      spent: q.spent || 0,
      budget: q.budget
    };
  }

  /* 结算：可中途结算（没做完也算），生成 summary 并归档成一条经历 */
  function finish(q, rating) {
    var p = progress(q);
    q.summary = {
      total: p.total, done: p.done, skip: p.skip,
      duoTotal: p.duoTotal, duoDone: p.duoDone,
      spent: p.spent, budget: q.budget,
      durationMin: Math.max(1, Math.round((Date.now() - new Date(q.started_at).getTime()) / 60000))
    };
    q.status = 'finished';
    q.finished_at = new Date().toISOString();
    if (rating) q.rating = Math.max(1, Math.min(5, Number(rating)));
    save();
    return q;
  }

  function rate(q, score, tags) {
    q.rating = Math.max(1, Math.min(5, Number(score) || 0)) || null;
    q.rating_tags = Array.isArray(tags) ? tags.slice(0, 4) : [];
    save();
    return q;
  }

  function remove(q) {
    Store.state.quests = list().filter(function (x) { return x.id !== q.id; });
    save();
  }

  /* ---------------- 归档成经历（供故事录 / 时间线查看） ---------------- */
  function archive(q) {
    if (q.journal_id) return Store.getJourney(q.journal_id);
    var me = Store.state.currentUserId;
    var p = progress(q);
    var lines = [];
    (q.tasks || []).forEach(function (t) {
      if (t.status !== 'done') return;
      t.checkins.forEach(function (c) {
        if (c.note) lines.push({ userId: c.userId, text: c.note, images: c.images || [] });
      });
    });
    var mine = lines.filter(function (l) { return l.userId === me; });
    var other = lines.filter(function (l) { return l.userId !== me; });

    var j = Store.newJourney({
      title: q.title,
      category: q.mode === 'trip' ? '旅行' : '日常',
      location_name: '',
      status: 'done',
      start_date: (q.started_at || '').slice(0, 10),
      end_date: (q.finished_at || new Date().toISOString()).slice(0, 10),
      expense: p.spent || null
    });
    j.magic_code = 'quest:' + q.id;
    var mySide = Store.sideTemplate(me);
    mySide.text = mine.map(function (l) { return l.text; }).join('\n');
    mySide.images = flatten(mine);
    j[Store.mySideKey()] = mySide;

    if (other.length) {
      var otherKey = Store.mySideKey() === 'a_side' ? 'b_side' : 'a_side';
      var otherId = (Store.state.users || []).filter(function (u) { return u.id !== me; })[0];
      var os = Store.sideTemplate(otherId ? otherId.id : null);
      os.text = other.map(function (l) { return l.text; }).join('\n');
      os.images = flatten(other);
      j[otherKey] = os;
    }
    Store.addJourney(j);
    q.journal_id = j.id;
    save();
    return j;
  }
  function flatten(arr) {
    var out = [];
    arr.forEach(function (l) { (l.images || []).forEach(function (u) { if (out.length < 6) out.push(u); }); });
    return out;
  }

  function userName(id) {
    var u = (Store.state.users || []).filter(function (x) { return x.id === id; })[0];
    return u ? u.nickname : '';
  }

  return {
    RATING_TAGS: RATING_TAGS,
    THEMES: THEMES, RULES_LIB: RULES_LIB,
    list: list, get: get, active: active, finished: finished,
    create: create, generate: generate, remove: remove,
    myTasks: myTasks, otherTasks: otherTasks,
    checkin: checkin, skip: skip, reopen: reopen, rateTask: rateTask,
    progress: progress, finish: finish, rate: rate, archive: archive,
    userName: userName,
    /* 主题 / 规则 / 定位 */
    themeTags: themeTags, randomRules: randomRules, aiRules: aiRules, normRules: normRules,
    moreTasks: moreTasks, aiRules: aiRules,
    geoSupported: supported, locate: locateWithName, timeOfDay: timeOfDay
  };
})();
