/* ============================================================
   探险家的罗盘 · 推荐引擎
   严格实现 PRD 3.3.3 的九步流程
   ============================================================ */
window.Recommend = (function () {

  function daysSince(iso) {
    return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000);
  }

  function baseScore(j) {
    var a = j.a_side && j.a_side.score, b = j.b_side && j.b_side.score;
    if (a && b) return (a + b) / 2;
    return a || b || 3;
  }

  function tagNamesOf(j) {
    return DATA.tagNames((j.consensus && j.consensus.tags) || []);
  }

  /**
   * @param {Object} o { weather, mood, budget, categoryFilter:[], useLocation:bool }
   */
  function run(o) {
    o = o || {};
    var now = new Date();
    var slot = DATA.slotOf(now);
    var weather = o.weather || '晴';
    var mood = o.mood || 'normal';
    var budget = o.budget || 'normal';

    var trace = [];   // 算法过程留痕，便于向用户解释「为什么推荐这个」
    var pool = Store.state.journeys.filter(function (j) {
      return j.status === 'archived' || j.status === 'sealed';
    });

    /* ---------- 第一步：黑名单过滤（PRD 2.8） ---------- */
    // 地点黑名单：硬性过滤。标签黑名单：软过滤——
    // 因为一条低分旅程可能带 6 个通用标签（如「室内」「$$」），
    // 全量剔除会把整个候选池清空，所以候选不足 3 条时退化为只过滤地点。
    var afterLoc = pool.filter(function (j) {
      return !(j.location_name && Store.isBlacklisted('location', j.location_name));
    });
    var afterTag = afterLoc.filter(function (j) {
      return !((j.consensus && j.consensus.tags) || []).some(function (t) {
        return Store.isBlacklisted('tag', t);
      });
    });
    pool = afterTag.length >= 3 ? afterTag : afterLoc;
    trace.push({
      step: '① 黑名单过滤',
      text: '地点剔除 ' + (Store.state.journeys.length - afterLoc.length) + ' 条' +
        (pool === afterTag ? '，标签再剔除 ' + (afterLoc.length - afterTag.length) + ' 条' : '（标签过滤已退化，候选不足）')
    });

    /* ---------- 第二步：近因剔除（14 天） ---------- */
    before = pool.length;
    var afterRecency = pool.filter(function (j) { return daysSince(j.last_visited_at) > 14; });
    if (afterRecency.length > 0) pool = afterRecency;  // 全被剔除时降级保留
    trace.push({ step: '② 近因剔除', text: '14 天内去过的剔除 ' + (before - pool.length) + ' 条，剩 ' + pool.length + ' 条' });

    /* ---------- 第三步：心情过滤 ---------- */
    before = pool.length;
    var tiredWords = ['高强度', '室外'], energeticWords = ['室外', '刺激', '新鲜'];
    var moodPool = pool.filter(function (j) {
      var names = tagNamesOf(j);
      if (mood === 'tired') return !names.some(function (n) { return tiredWords.indexOf(n) >= 0; });
      return true;
    });
    if (moodPool.length > 0) pool = moodPool;
    trace.push({
      step: '③ 心情过滤',
      text: mood === 'tired' ? '累了，剔除高强度/室外 ' + (before - pool.length) + ' 条'
        : mood === 'energetic' ? '精力充沛，运动/户外类加权 +0.3' : '一般，不做过滤'
    });

    /* ---------- 第四步：预算过滤 ---------- */
    before = pool.length;
    var budgetPool = pool.filter(function (j) {
      if (budget === 'thrifty') return j.expense === null || j.expense <= 100;
      return true;
    });
    if (budgetPool.length > 0) pool = budgetPool;
    trace.push({
      step: '④ 预算过滤',
      text: budget === 'thrifty' ? '只留人均 ≤100 元，剔除 ' + (before - pool.length) + ' 条'
        : budget === 'lavish' ? '高消费（>300）加权 +0.3' : '正常，不做过滤'
    });

    /* ---------- 第五步：权重计算 ---------- */
    var freq = {};
    Store.state.journeys.forEach(function (j) { freq[j.category] = (freq[j.category] || 0) + 1; });
    var hotCats = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 2);
    var weatherTags = DATA.weatherTagMap[weather] || [];
    var festival = DATA.festivalOf(now);   // PRD 7.3 季节/节日主题推荐

    var scored = pool.map(function (j) {
      var names = tagNamesOf(j);
      var w = baseScore(j);
      var parts = [{ k: '基础评分', v: w.toFixed(2) }];

      // 时间衰减反比
      var d = daysSince(j.last_visited_at);
      var decay = 1 + d / 100;
      w *= decay;
      parts.push({ k: '时间衰减', v: '×' + decay.toFixed(2) });

      // 情景适配加分
      var fit = names.some(function (n) {
        return weatherTags.indexOf(n) >= 0 || n === slot;
      });
      if (fit) { w += 0.5; parts.push({ k: '情景适配（' + weather + '/' + slot + '）', v: '+0.5' }); }

      // 距离加权（需要坐标，本地示例数据一般为空，静默跳过）
      if (o.useLocation && j.location_coords && o.coords) {
        var km = haversine(o.coords, j.location_coords);
        if (km < 5) {
          var m = 1 + (5 - km) / 10; w *= m;
          parts.push({ k: '距离 ' + km.toFixed(1) + 'km', v: '×' + m.toFixed(2) });
        }
      }

      // 分类偏好
      if (hotCats.indexOf(j.category) >= 0) { w += 0.2; parts.push({ k: '常去分类 ' + j.category, v: '+0.2' }); }

      // 节日主题加权（PRD 7.3）
      if (festival && names.some(function (n) { return festival.tags.indexOf(n) >= 0; })) {
        w += 0.4; parts.push({ k: '节日契合·' + festival.name, v: '+0.4' });
      }

      // 心情加权
      if (mood === 'energetic' && names.some(function (n) { return energeticWords.indexOf(n) >= 0; })) {
        w += 0.3; parts.push({ k: '活力匹配', v: '+0.3' });
      }
      // 预算加权
      if (budget === 'lavish' && j.expense > 300) { w += 0.3; parts.push({ k: '高消费加权', v: '+0.3' }); }

      return { j: j, w: w, parts: parts };
    }).sort(function (x, y) { return y.w - x.w; });

    trace.push({ step: '⑤ 权重计算', text: '基础分 × 时间衰减 + 情景/分类/心情/预算加权，共 ' + scored.length + ' 条参与排序' });

    /* ---------- 第六步：保守之选 Top 3 ---------- */
    var top3 = scored.slice(0, 3);
    trace.push({ step: '⑥ 保守之选', text: '取权重前 3：' + (top3.map(function (s) { return s.j.location_name; }).join('、') || '无') });

    /* ---------- 第七步：跨界组合 ---------- */
    var cross = null;
    var byCat = {};
    scored.forEach(function (s) {
      if (!byCat[s.j.category] || byCat[s.j.category].w < s.w) byCat[s.j.category] = s;
    });
    var catKeys = Object.keys(byCat);
    if (catKeys.length >= 2) {
      // 随机抽两个不同分类
      var i1 = Math.floor(Math.random() * catKeys.length);
      var i2 = Math.floor(Math.random() * (catKeys.length - 1));
      if (i2 >= i1) i2++;
      var A = byCat[catKeys[i1]], B = byCat[catKeys[i2]];
      if (A && B && A !== B) {
        cross = { a: A.j, b: B.j, catA: catKeys[i1], catB: catKeys[i2] };
        trace.push({ step: '⑦ 跨界组合', text: catKeys[i1] + ' + ' + catKeys[i2] });
      }
    }
    if (!cross) trace.push({ step: '⑦ 跨界组合', text: '历史分类不足 2 个，跳过' });

    /* ---------- 第八步：勇敢者之选 ---------- */
    var tried = {};
    Store.state.journeys.forEach(function (j) { tried[j.category] = true; });
    var untried = DATA.categories.filter(function (c) { return !tried[c]; });
    var brave = null;
    if (untried.length) {
      var cat = untried[Math.floor(Math.random() * untried.length)];
      var pool2 = DATA.discovery[cat] || [];
      brave = { category: cat, name: pool2[Math.floor(Math.random() * pool2.length)] || cat };
      trace.push({ step: '⑧ 勇敢者之选', text: '未尝试分类「' + cat + '」→ ' + brave.name });
    } else {
      var all = DATA.categories.slice();
      var c2 = all[Math.floor(Math.random() * all.length)];
      var p3 = DATA.discovery[c2] || [];
      brave = { category: c2, name: p3[Math.floor(Math.random() * p3.length)] || c2, fallback: true };
      trace.push({ step: '⑧ 勇敢者之选', text: '全分类都试过了，从「' + c2 + '」再挑一个：' + brave.name });
    }

    /* ---------- 第九步：自然语言包装（本地模板引擎，离线可用） ---------- */
    var copy = writeCopy(top3[0] && top3[0].j, cross, brave, weather);
    trace.push({ step: '⑨ 文案生成', text: '本地模板引擎（离线）' });

    return {
      slot: slot, weather: weather, mood: mood, budget: budget,
      festival: festival,
      top3: top3, cross: cross, brave: brave,
      copy: copy.copy, care: copy.care, trace: trace,
      empty: scored.length === 0
    };
  }

  function haversine(c1, c2) {
    var R = 6371, dLat = rad(c2.lat - c1.lat), dLng = rad(c2.lng - c1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(c1.lat)) * Math.cos(rad(c2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function rad(x) { return x * Math.PI / 180; }

  /* ---------- 文案模板（模拟 LLM 的亲昵口吻） ---------- */
  var OPEN = ['今天', '这会儿', '要不今天'];
  var CARE = {
    '晴': '外面太阳正好，别晒太久，带瓶水呀',
    '雨': '外面在下雨，记得带伞，路滑慢点走',
    '阴': '天有点阴，带件薄外套吧',
    '雪': '下雪了，路滑，穿厚点再出门',
    '风': '今天风大，头发会乱，但心情不会'
  };

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function writeCopy(top1, cross, brave, weather) {
    var s = '';
    if (top1) {
      var sc = baseScore(top1);
      var star = sc >= 4.5 ? '五星' : sc >= 4 ? '四星' : '三星';
      var mc = top1.magic_code ? '（' + top1.magic_code.color + '的、' + top1.magic_code.adjective.replace('的', '') + '）' : '';
      s += pick(OPEN) + '适合去' + mc + '「' + top1.location_name + '」呀～' +
        '上次你们俩都给了' + star + '！';
    } else {
      s += '你们的档案还太少啦，先随手记一条，罗盘才有东西可以算。';
    }
    if (cross) {
      s += pick([
        '吃完/逛完还可以顺路去「' + cross.b.location_name + '」' + cross.catB + '一下。',
        '要是还有力气，「' + cross.b.location_name + '」就在同一片儿，凑成一条线。',
        '或者先去「' + cross.b.location_name + '」，再回头吃饭也行。'
      ]);
      if (Math.random() < .5) s = s.replace('吃完/逛完', '逛完');
    }
    if (brave) {
      s += '想试点没玩过的？「' + brave.name + '」怎么样～';
    }
    return { copy: s, care: CARE[weather] || '出门注意安全，早点回来' };
  }

  /* ---------- 随机任意门（PRD 3.4.2，重要时光权重翻倍） ---------- */
  function randomDoor() {
    var pool = Store.state.journeys.filter(function (j) {
      return j.status === 'archived' || j.status === 'sealed';
    });
    if (!pool.length) return null;
    var bag = [];
    pool.forEach(function (j) {
      bag.push(j);
      if (j.is_important) bag.push(j);   // 3.5.5 重要时光权重翻倍
    });
    return bag[Math.floor(Math.random() * bag.length)];
  }

  /* ---------- 那年今日（PRD 3.4.1） ---------- */
  function todayInHistory() {
    var now = new Date();
    var m = now.getMonth() + 1, d = now.getDate();
    var hits = Store.state.journeys.filter(function (j) {
      var dt = new Date(j.start_date);
      return dt.getMonth() + 1 === m && dt.getDate() === d &&
        dt.getFullYear() < now.getFullYear() &&
        (j.status === 'archived' || j.status === 'sealed');
    }).sort(function (a, b) { return new Date(a.start_date) - new Date(b.start_date); });
    if (!hits.length) return null;
    // 3.5.5 重要时光优先
    var imp = hits.filter(function (j) { return j.is_important; });
    return { main: imp[0] || hits[0], rest: hits.length - 1 };
  }

  /* ---------- 本周末饥饿提醒（PRD 4.4 机制三） ---------- */
  function weekStats() {
    var since = Date.now() - 7 * 86400000;
    var n = Store.state.journeys.filter(function (j) {
      return new Date(j.created_at).getTime() >= since;
    }).length;
    return { count: n };
  }

  return {
    run: run, randomDoor: randomDoor, todayInHistory: todayInHistory,
    weekStats: weekStats, daysSince: daysSince, baseScore: baseScore
  };
})();
