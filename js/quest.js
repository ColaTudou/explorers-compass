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

  /* 双人任务模板：本地规则兜底用（不想动脑时也能开局） */
  var DUO_TEMPLATES = [
    { title: '合拍一张「只有我们」的照片', desc: '不拍风景，只拍两个人，构图随便但要有对方' },
    { title: '各自给对方写一句此刻的话', desc: '写完互相看，不准敷衍' },
    { title: '找一家没去过的小店', desc: '谁先看到就谁决定，进去坐十分钟' },
    { title: '互相拍一张对方不知道的照片', desc: '抓拍，回来一起看' },
    { title: '一起回答一个问题', desc: '今天最想记住的瞬间是什么？各自说各自的' },
    { title: '给这次出行起个名字', desc: '两个人各起一个，选一个都喜欢的' }
  ];

  var SOLO_TEMPLATES = [
    { title: '给 TA 准备一个小惊喜', desc: '预算内，随手能做到的那种' },
    { title: '记录一段声音', desc: '环境音也行，说句话也行' },
    { title: '拍三张「今天的颜色」', desc: '你眼里的今天是什么颜色' },
    { title: '替对方拍一张背影', desc: '不用打招呼' },
    { title: '写一句现在的心情', desc: '一句话就够' }
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
        from: 'wish', wish_id: w.id, spent: 0
      });
    });

    /* ② 补满数量：双人模板 + 个人模板 */
    var guard = 0;
    while (tasks.length < want && guard++ < 20) {
      if (Math.random() < 0.5) {
        var d = DUO_TEMPLATES[Math.floor(Math.random() * DUO_TEMPLATES.length)];
        if (has(tasks, d.title)) continue;
        tasks.push(mk(d.title, d.desc, 'duo', null, 'rule'));
      } else {
        var s = SOLO_TEMPLATES[Math.floor(Math.random() * SOLO_TEMPLATES.length)];
        if (has(tasks, s.title)) continue;
        tasks.push(mk(s.title, s.desc, 'solo', randomUser(), 'rule'));
      }
    }

    q.tasks = tasks;
    save();

    /* ③ 配了 AI 就让它润色/补充（失败静默回退） */
    if (opts.ai && window.LLM && LLM.isOn()) {
      return aiPolish(q).then(function () { save(); return q; })
        .catch(function () { return q; });
    }
    return Promise.resolve(q);
  }

  function mk(title, desc, type, assignee, from) {
    return {
      id: uid('t'), title: title, desc: desc, type: type, assignee: assignee,
      status: 'todo', checkins: [], rating: null, from: from || 'rule',
      wish_id: null, spent: 0
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

  /* AI 生成：把心愿 + 预算 + 模式交给模型，返回 JSON 任务数组 */
  function aiPolish(q) {
    var wishes = q.wish_ids.map(function (id) {
      return (Store.state.wishes || []).filter(function (w) { return w.id === id; })[0];
    }).filter(Boolean).map(function (w) { return w.title + (w.category ? '（' + w.category + '）' : ''); });

    var prompt = '你是给情侣设计约会/旅行小任务的游戏策划。\n' +
      '场景：' + (q.mode === 'trip' ? '一次旅行途中' : '一日约会') + '\n' +
      '总预算：' + (q.budget ? q.budget + ' 元（怎么花由他们自己决定，不要管细项）' : '没设预算') + '\n' +
      '他们的心愿：' + (wishes.length ? wishes.join('、') : '（还没写心愿）') + '\n\n' +
      '请生成 5-7 个可执行的小任务，其中至少 2 个是双人共同完成的。\n' +
      '严格只输出 JSON 数组，每项：{"title":"(不超过12字)","desc":"(一句话，不超过30字)","type":"duo 或 solo"}\n' +
      '不要输出任何解释文字。';

    return LLM.chat([{ role: 'user', content: prompt }], { temperature: 0.9, maxTokens: 700 })
      .then(function (text) {
        var arr = LLM.parseJSON(text);
        if (!arr || !arr.length) throw new Error('AI 没给出任务');
        var tasks = [];
        arr.slice(0, 8).forEach(function (it) {
          if (!it || !it.title) return;
          var duo = String(it.type || '').toLowerCase() === 'duo';
          tasks.push(mk(String(it.title).slice(0, 24), String(it.desc || '').slice(0, 60),
            duo ? 'duo' : 'solo', duo ? null : randomUser(), 'ai'));
        });
        if (!tasks.length) throw new Error('AI 任务为空');
        /* AI 任务放前面，心愿任务保留在后，保证心愿一定被用到 */
        q.tasks = tasks.concat(q.tasks.filter(function (t) { return t.from === 'wish'; }));
      });
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
    list: list, get: get, active: active, finished: finished,
    create: create, generate: generate, remove: remove,
    myTasks: myTasks, otherTasks: otherTasks,
    checkin: checkin, skip: skip, reopen: reopen, rateTask: rateTask,
    progress: progress, finish: finish, rate: rate, archive: archive,
    userName: userName
  };
})();
