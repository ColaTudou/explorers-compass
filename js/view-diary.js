/* ============================================================
   探险家的罗盘 · 我的日常（个人私密记录）
   隐私边界：默认只有本人能看到；愿意时把某一条「分享成旅程」，
            才进入双人叙事（且只填自己这一侧，另一侧留给对方）。
   内容：文字 + 照片 + 心情 + 天气 + 分类 + 标签 + 每日一问 + 时间线回看
   ============================================================ */
window.Views = window.Views || {};

Views.diary = (function () {

  var CATS = [
    { k: '探店', e: '🍜' }, { k: '游玩', e: '🏞' }, { k: '趣事', e: '✨' }, { k: '心得', e: '💭' },
    { k: '运动', e: '🏃' }, { k: '工作', e: '💼' }, { k: '居家', e: '🏠' }, { k: '其他', e: '📌' }
  ];
  var MOODS = [
    { k: '开心', e: '😄' }, { k: '平静', e: '😌' }, { k: '疲惫', e: '😪' }, { k: '低落', e: '😢' },
    { k: '期待', e: '🤩' }, { k: '生气', e: '😠' }, { k: '感动', e: '🥹' }, { k: '迷茫', e: '😶' }
  ];
  var PROMPTS = [
    '今天有哪一刻让你觉得"还不错"？',
    '今天吃到 / 喝到什么值得记一笔的？',
    '有没有一件小事，本来可以不说但还是想记下来？',
    '今天最花时间的一件事是什么？值得吗？',
    '如果给今天配一句旁白，会是什么？',
    '今天和谁说话最多？聊了什么？',
    '有什么让你有点在意、但还没想明白的事？',
    '今天身体感觉怎么样？睡够了没？',
    '最近在追什么剧 / 书 / 游戏？进展如何？',
    '有没有想买又没买的东西？为什么犹豫？',
    '今天走了哪些地方？路上看到什么？',
    '如果今天重来一次，你会改哪一步？',
    '有什么想对另一半说但还没说出口的话？',
    '今天学到了什么新东西？（哪怕很小）',
    '此刻最想做的事是什么？',
    '最近有什么在慢慢变好？',
    '今天有没有一个瞬间想拍照却没拍？',
    '如果明天可以完全自由安排，你想做什么？',
    '有什么一直想做但总说"等有空"的事？',
    '今天最感谢的一个人 / 一件事是什么？'
  ];

  var filter = { cat: '', mood: '', q: '' };
  var editing = null;      // 正在编辑的日记（新建时为 null）
  var draft = null;        // 编辑器里的临时内容

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(iso) {
    var d = new Date(iso);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function dayLabel(iso) {
    var t = todayStr(), y = ymd(iso);
    if (y === t) return '今天';
    var d = new Date(); d.setDate(d.getDate() - 1);
    if (y === d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())) return '昨天';
    var dt = new Date(iso);
    return (dt.getMonth() + 1) + '月' + dt.getDate() + '日 · 周' + '日一二三四五六'.charAt(dt.getDay());
  }
  function hm(iso) {
    var d = new Date(iso);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function moodEmoji(k) {
    for (var i = 0; i < MOODS.length; i++) if (MOODS[i].k === k) return MOODS[i].e;
    return '';
  }
  function catEmoji(k) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].k === k) return CATS[i].e;
    return '📌';
  }
  /* 把「2026-09-08」+ 某个时刻 → ISO 字符串（保留时分秒，排序与显示都自然） */
  function dateToISO(dateStr, timeFrom) {
    var p = String(dateStr || '').split('-');
    if (p.length !== 3) return '';
    var t = timeFrom ? new Date(timeFrom) : new Date();
    if (isNaN(t.getTime())) t = new Date();
    var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]),
      t.getHours(), t.getMinutes(), t.getSeconds());
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString();
  }

  /* ---------------- 列表 ---------------- */
  function mine() {
    return (Store.diariesOf ? Store.diariesOf() : [])
      .slice()
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
  }

  function matched() {
    var q = (filter.q || '').trim().toLowerCase();
    return mine().filter(function (d) {
      if (filter.cat && d.category !== filter.cat) return false;
      if (filter.mood && d.mood !== filter.mood) return false;
      if (!q) return true;
      var hay = [d.text, d.place, (d.tags || []).join(' '), d.category, d.mood].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  /* 去年的今天：同月同日、往年写的 */
  function onThisDay() {
    var now = new Date(), md = pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    return mine().filter(function (d) {
      var x = new Date(d.created_at);
      return x.getFullYear() < now.getFullYear() &&
        pad(x.getMonth() + 1) + '-' + pad(x.getDate()) === md;
    });
  }

  function render() {
    var all = mine(), list = matched(), otd = onThisDay();
    var days = {};
    all.forEach(function (d) { days[ymd(d.created_at)] = 1; });
    var dayCount = Object.keys(days).length;

    var html = '' +
      '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--between mb-md">' +
      '<div><h1 class="t-h1">📔 我的日常</h1>' +
      '<div class="t-cap mt-sm">' + all.length + ' 条 · 记录了 ' + dayCount + ' 天 · 只有你看得到</div></div>' +
      '<div class="row row--tight">' +
      '<button class="btn btn--secondary btn--sm" id="btnBook">' + UI.icon('book', 16) + ' 故事书</button>' +
      '<button class="btn btn--primary btn--sm" id="btnNew">' + UI.icon('plus', 16) + ' 写一条</button>' +
      '</div>' +
      '</div>';

    /* 搜索 + 筛选 */
    html += '<div class="card card--pad mb-base">' +
      '<input class="input mb-sm" id="dySearch" placeholder="搜点什么（文字 / 标签 / 地点）" value="' +
      UI.esc(filter.q) + '">' +
      '<div class="row row--tight row--wrap">' +
      chip('cat', '', '全部') + CATS.map(function (c) {
        return chip('cat', c.k, c.e + ' ' + c.k);
      }).join('') +
      '</div>' +
      '<div class="row row--tight row--wrap mt-sm">' +
      MOODS.map(function (m) { return chip('mood', m.k, m.e); }).join('') +
      (filter.mood ? chip('mood', '', '清除心情') : '') +
      '</div></div>';

    if (!all.length) {
      html += '<div class="empty"><div class="empty__icon">📔</div>' +
        '<div class="empty__title">还没有属于你自己的记录</div>' +
        '<div class="empty__desc">探店、游玩、有趣的事、心得感悟……随手记下来，' +
        '只属于你；想分享时再把它变成一段双人旅程。</div>' +
        '<button class="btn btn--primary" id="btnNew2">写下第一条</button></div>';
      return html + '<div style="height:var(--xxl)"></div>';
    }

    /* 去年的今天 */
    if (otd.length && !filter.q && !filter.cat && !filter.mood) {
      html += '<div class="section"><div class="section__head">' +
        '<div class="section__title">🕰 去年的今天</div></div>' +
        otd.map(function (d) { return miniCard(d, true); }).join('') + '</div>';
    }

    if (!list.length) {
      html += '<div class="empty"><div class="empty__icon">🔍</div>' +
        '<div class="empty__title">没有匹配的记录</div>' +
        '<div class="empty__desc">换个关键词，或清掉筛选看看</div></div>';
      return html + '<div style="height:var(--xxl)"></div>';
    }

    /* 时间线：按天分组，同一天可以有很多条 —— 天标题上标出条数，并留一个「再记一条」 */
    var dayN = {};
    list.forEach(function (d) { var k = ymd(d.created_at); dayN[k] = (dayN[k] || 0) + 1; });

    var lastDay = '';
    html += list.map(function (d) {
      var y = ymd(d.created_at), head = '';
      if (y !== lastDay) {
        lastDay = y;
        head = '<div class="row row--between mt-base mb-sm">' +
          '<div class="t-cap" style="font-weight:600">' + dayLabel(d.created_at) +
          ' · ' + dayN[y] + ' 条</div>' +
          '<button class="btn btn--text btn--mini" data-addday="' + y + '">＋ 再记一条</button>' +
          '</div>';
      }
      return head + card(d);
    }).join('');

    return html + '<div style="height:var(--xxl)"></div>';
  }

  function chip(group, val, label) {
    var on = filter[group] === val;
    return '<button class="tag tag--click' + (on ? ' tag--on' : '') +
      '" data-f="' + group + '" data-v="' + UI.esc(val) + '">' + UI.esc(label) + '</button>';
  }

  function card(d) {
    var imgs = (d.images || []).slice(0, 3);
    return '<div class="card card--pad mb-sm" data-open="' + d.id + '">' +
      '<div class="row row--tight mb-sm">' +
      '<span class="tag tag--plain">' + catEmoji(d.category) + ' ' + UI.esc(d.category || '其他') + '</span>' +
      (d.mood ? '<span class="tag tag--plain">' + moodEmoji(d.mood) + ' ' + UI.esc(d.mood) + '</span>' : '') +
      (d.weather ? '<span class="tag tag--plain">🌤 ' + UI.esc(d.weather) + '</span>' : '') +
      (d.place ? '<span class="tag tag--plain">📍 ' + UI.esc(d.place) + '</span>' : '') +
      '<span class="grow"></span>' +
      '<span class="t-cap">' + hm(d.created_at) + '</span>' +
      '</div>' +
      '<div class="t-body2" style="white-space:pre-wrap">' + UI.esc(d.text || '') + '</div>' +
      (imgs.length ? '<div class="row row--tight mt-sm">' + imgs.map(function (s) {
        return '<img src="' + s + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px" onclick="event.stopPropagation();window.__zoom(this.src)">';
      }).join('') + (d.images.length > 3 ? '<span class="t-cap">+' + (d.images.length - 3) + '</span>' : '') + '</div>' : '') +
      ((d.tags && d.tags.length) ? '<div class="row row--tight row--wrap mt-sm">' +
        d.tags.map(function (t) { return '<span class="tag tag--outline">#' + UI.esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '<div class="row row--tight mt-sm">' +
      (d.shared_journey_id
        ? '<span class="tag tag--success">已分享成旅程</span>'
        : '<button class="btn btn--text btn--mini" data-share="' + d.id + '">分享成旅程</button>') +
      '<button class="btn btn--text btn--mini" data-edit="' + d.id + '">编辑</button>' +
      '<button class="btn btn--text btn--mini t-danger" data-del="' + d.id + '">删除</button>' +
      '</div></div>';
  }

  function miniCard(d) {
    return '<div class="card card--pad mb-sm" data-open="' + d.id + '">' +
      '<div class="t-cap mb-sm">' + new Date(d.created_at).getFullYear() + ' 年的今天</div>' +
      '<div class="t-body2" style="white-space:pre-wrap">' + UI.esc((d.text || '').slice(0, 120)) + '</div>' +
      (d.mood ? '<div class="t-cap mt-sm">' + moodEmoji(d.mood) + ' ' + UI.esc(d.mood) + '</div>' : '') +
      '</div>';
  }

  /* ---------------- 事件 ---------------- */
  function mount(root) {
    var bn = root.querySelector('#btnNew'), bn2 = root.querySelector('#btnNew2');
    if (bn) bn.onclick = function () { compose(null); };
    if (bn2) bn2.onclick = function () { compose(null); };

    var bk = root.querySelector('#btnBook');
    if (bk) bk.onclick = function () { openBook(); };

    root.querySelectorAll('[data-addday]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        compose(null, b.dataset.addday);
      };
    });

    var se = root.querySelector('#dySearch');
    if (se) {
      se.oninput = function () {
        filter.q = se.value;
        var pos = se.selectionStart;
        App.render();
        var s2 = document.querySelector('#dySearch');
        if (s2) { s2.focus(); try { s2.setSelectionRange(pos, pos); } catch (e) { } }
      };
    }

    root.querySelectorAll('[data-f]').forEach(function (b) {
      b.onclick = function () {
        filter[b.dataset.f] = b.dataset.v;
        App.render();
      };
    });

    root.querySelectorAll('[data-share]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var d = Store.getDiary(b.dataset.share);
        if (!d) return;
        UI.confirm({
          title: '分享成旅程？',
          text: '会在「旅程」里生成一条新记录，只填你这一侧，对方那一侧留给 TA 来写。',
          okText: '分享'
        }).then(function (ok) {
          if (!ok) return;
          var j = Store.shareDiary(d.id);
          if (j) { UI.toast('已变成一段旅程', 'ok'); location.hash = '#/journeys/' + j.id; }
          else UI.toast('分享失败，请重试', 'err');
        });
      };
    });

    root.querySelectorAll('[data-edit]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        compose(Store.getDiary(b.dataset.edit));
      };
    });

    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var d = Store.getDiary(b.dataset.del);
        if (!d) return;
        UI.confirm({
          title: '删除这条日常？', text: '删除后无法恢复。', okText: '删除', danger: true
        }).then(function (ok) {
          if (!ok) return;
          Store.deleteDiary(d.id);
          UI.toast('已删除');
          App.render();
        });
      };
    });

    root.querySelectorAll('[data-open]').forEach(function (c) {
      c.onclick = function () { openOne(Store.getDiary(c.dataset.open)); };
    });
  }

  function openOne(d) {
    if (!d) return;
    var imgs = (d.images || []);
    UI.modal({
      title: (d.category ? catEmoji(d.category) + ' ' : '') + dayLabel(d.created_at) + ' ' + hm(d.created_at),
      body: '<div class="col">' +
        '<div class="row row--tight row--wrap">' +
        (d.mood ? '<span class="tag tag--plain">' + moodEmoji(d.mood) + ' ' + UI.esc(d.mood) + '</span>' : '') +
        (d.weather ? '<span class="tag tag--plain">🌤 ' + UI.esc(d.weather) + '</span>' : '') +
        (d.place ? '<span class="tag tag--plain">📍 ' + UI.esc(d.place) + '</span>' : '') +
        (d.shared_journey_id ? '<span class="tag tag--success">已分享成旅程</span>' : '') +
        '</div>' +
        (d.prompt ? '<div class="t-cap">每日一问：' + UI.esc(d.prompt) + '</div>' : '') +
        '<div class="t-body1" style="white-space:pre-wrap;line-height:1.75">' + UI.esc(d.text || '') + '</div>' +
        (imgs.length ? '<div class="col">' + imgs.map(function (s) {
          return '<img src="' + s + '" style="width:100%;border-radius:12px;margin-top:8px" onclick="window.__zoom(this.src)">';
        }).join('') + '</div>' : '') +
        ((d.tags && d.tags.length) ? '<div class="row row--tight row--wrap">' +
          d.tags.map(function (t) { return '<span class="tag tag--outline">#' + UI.esc(t) + '</span>'; }).join('') + '</div>' : '') +
        '</div>',
      footer: '<button class="btn btn--secondary" data-act="no">关闭</button>' +
        '<button class="btn btn--primary" data-act="edit">编辑</button>',
      onMount: function (el, close) {
        el.querySelector('[data-act="no"]').onclick = close;
        el.querySelector('[data-act="edit"]').onclick = function () { close(); compose(d); };
      }
    });
  }

  /* ---------------- 写一条 / 编辑 ----------------
     compose(日记, 指定日期) —— 传日期是为了「这天再记一条」/补记前几天 */
  function compose(d, dateStr) {
    editing = d || null;
    draft = {
      date: d ? ymd(d.created_at) : (dateStr || todayStr()),
      category: (d && d.category) || '趣事',
      mood: (d && d.mood) || '',
      text: (d && d.text) || '',
      images: (d && d.images) ? d.images.slice() : [],
      tags: (d && d.tags) ? d.tags.slice() : [],
      place: (d && d.place) || '',
      weather: (d && d.weather) || '',
      prompt: (d && d.prompt) || pickPrompt()
    };

    UI.modal({
      title: d ? '编辑日常' : '写一条日常',
      sub: '只属于你 · 一天可以记很多条 · 想分享时再变成旅程',
      body: bodyHTML(),
      footer: '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">保存</button>',
      onMount: function (el, close) {
        bindCompose(el, close);
      }
    });
  }

  function pickPrompt() {
    if (window.LLM && LLM.ready && LLM.ready() && LLM.chat) {
      // AI 出题是异步的，先用本地模板顶上，AI 返回后再替换
      aiPrompt();
    }
    return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  }
  function aiPrompt() {
    if (!window.LLM || !LLM.chat) return Promise.resolve('');
    return LLM.chat([
      { role: 'user', content: '请给我一个适合写进私人日记的引导问题，一句话，温柔、具体、不超过 20 字，不要解释。' }
    ]).then(function (t) {
      t = String(t || '').trim().slice(0, 40);
      if (t && draft && !draft.text) { draft.prompt = t; refreshPrompt(); }
      return t;
    }).catch(function () { return ''; });
  }
  function refreshPrompt() {
    var el = document.querySelector('#dyPrompt');
    if (el && draft) el.textContent = draft.prompt;
  }

  function bodyHTML() {
    return '<div class="col">' +
      '<div class="field"><label class="field__label">哪一天</label>' +
      '<input class="input" type="date" id="dyDate" value="' + UI.esc(draft.date) + '">' +
      '<div class="field__hint">默认今天；想补记前几天的事也可以改。' +
      '<b>同一天能记很多条</b>，不用合并成一条。</div></div>' +

      '<div class="field"><label class="field__label">分类</label>' +
      '<div class="row row--tight row--wrap" id="dyCats">' +
      CATS.map(function (c) {
        return '<button class="tag tag--click' + (draft.category === c.k ? ' tag--on' : '') +
          '" data-cat="' + c.k + '">' + c.e + ' ' + c.k + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">心情（可留空）</label>' +
      '<div class="row row--tight row--wrap" id="dyMoods">' +
      MOODS.map(function (m) {
        return '<button class="tag tag--click' + (draft.mood === m.k ? ' tag--on' : '') +
          '" data-mood="' + m.k + '">' + m.e + '</button>';
      }).join('') + '</div></div>' +

      '<div class="field"><label class="field__label">今天发生了什么</label>' +
      '<textarea class="textarea" id="dyText" rows="5" placeholder="随手记，想到什么写什么…">' +
      UI.esc(draft.text) + '</textarea></div>' +

      '<div class="field"><label class="field__label">每日一问（写不出来就从这里开始）</label>' +
      '<div class="row row--between"><div class="t-body2" id="dyPrompt">' + UI.esc(draft.prompt) + '</div>' +
      '<button class="btn btn--text btn--mini" id="dyPromptNew">换一个</button></div></div>' +

      '<div class="field"><label class="field__label">照片（可留空）</label>' +
      '<div class="row row--tight row--wrap" id="dyImgs">' +
      draft.images.map(function (s, i) {
        return '<span style="position:relative;display:inline-block">' +
          '<img src="' + s + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px">' +
          '<button class="btn btn--text btn--mini t-danger" data-rmimg="' + i + '">✕</button></span>';
      }).join('') +
      '<button class="btn btn--secondary btn--mini" id="dyAddImg">＋ 加图</button>' +
      '<button class="btn btn--secondary btn--mini" id="dyShot">📷 拍照</button>' +
      '</div></div>' +

      '<div class="field"><label class="field__label">标签（空格或逗号分隔）</label>' +
      '<input class="input" id="dyTags" placeholder="例如：咖啡 周末" value="' +
      UI.esc(draft.tags.join(' ')) + '"></div>' +

      '<div class="field"><label class="field__label">地点（可留空）</label>' +
      '<input class="input" id="dyPlace" placeholder="例如：公司楼下的咖啡馆" value="' +
      UI.esc(draft.place) + '"></div>' +

      '<div class="row row--between"><span class="t-cap">天气</span>' +
      '<span class="t-sm" id="dyWeather">' + UI.esc(draft.weather || '获取中…') + '</span></div>' +
      '</div>';
  }

  function bindCompose(el, close) {
    var ta = el.querySelector('#dyText');

    el.querySelectorAll('[data-cat]').forEach(function (b) {
      b.onclick = function () {
        draft.category = b.dataset.cat;
        el.querySelectorAll('[data-cat]').forEach(function (x) {
          x.className = 'tag tag--click' + (x.dataset.cat === draft.category ? ' tag--on' : '');
        });
      };
    });
    el.querySelectorAll('[data-mood]').forEach(function (b) {
      b.onclick = function () {
        draft.mood = draft.mood === b.dataset.mood ? '' : b.dataset.mood;
        el.querySelectorAll('[data-mood]').forEach(function (x) {
          x.className = 'tag tag--click' + (x.dataset.mood === draft.mood ? ' tag--on' : '');
        });
      };
    });

    var pn = el.querySelector('#dyPromptNew');
    if (pn) pn.onclick = function () {
      draft.prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
      var p = el.querySelector('#dyPrompt'); if (p) p.textContent = draft.prompt;
    };

    function redrawImgs() {
      var box = el.querySelector('#dyImgs');
      if (!box) return;
      box.innerHTML = draft.images.map(function (s, i) {
        return '<span style="position:relative;display:inline-block">' +
          '<img src="' + s + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px">' +
          '<button class="btn btn--text btn--mini t-danger" data-rmimg="' + i + '">✕</button></span>';
      }).join('') +
        '<button class="btn btn--secondary btn--mini" id="dyAddImg">＋ 加图</button>' +
        '<button class="btn btn--secondary btn--mini" id="dyShot">📷 拍照</button>';
      bindImgButtons();
    }
    function bindImgButtons() {
      var add = el.querySelector('#dyAddImg'), shot = el.querySelector('#dyShot');
      if (add) add.onclick = function () {
        UI.pickImages(true).then(function (files) {
          return Promise.all((files || []).slice(0, 9).map(function (f) {
            return UI.compressImage(f).catch(function () { return null; });
          }));
        }).then(function (arr) {
          arr.forEach(function (u) { if (u) draft.images.push(u); });
          redrawImgs();
        }).catch(function () { });
      };
      if (shot) shot.onclick = function () {
        UI.camera({ max: 1 }).then(function (arr) {
          (arr || []).forEach(function (u) { if (u) draft.images.push(u); });
          redrawImgs();
        }).catch(function () { });
      };
      el.querySelectorAll('[data-rmimg]').forEach(function (b) {
        b.onclick = function () { draft.images.splice(Number(b.dataset.rmimg), 1); redrawImgs(); };
      });
    }
    bindImgButtons();

    /* 天气：能拿到就带上，拿不到也不影响保存（外部服务铁律） */
    var wx = el.querySelector('#dyWeather');
    if (wx && !draft.weather && window.Weather && Weather.get) {
      Weather.get().then(function (w) {
        if (w && wx) { draft.weather = (w.text || '') + (w.temp !== undefined ? ' ' + w.temp + '°' : ''); wx.textContent = draft.weather; }
        else if (wx) wx.textContent = '未获取';
      }).catch(function () { if (wx) wx.textContent = '未获取'; });
    } else if (wx) wx.textContent = draft.weather || '未获取';

    el.querySelector('[data-act="no"]').onclick = function () { close(); };
    el.querySelector('[data-act="yes"]').onclick = function () {
      draft.text = ta ? ta.value.trim() : '';
      if (!draft.text && !draft.images.length) { UI.toast('写点什么，或至少加张图', 'err'); return; }
      var tg = el.querySelector('#dyTags'), pl = el.querySelector('#dyPlace'), de = el.querySelector('#dyDate');
      draft.tags = String((tg && tg.value) || '').split(/[\s,，、]+/).filter(Boolean).slice(0, 8);
      draft.place = pl ? pl.value.trim() : '';
      draft.date = (de && de.value) ? de.value : todayStr();
      save();
      close();
    };
  }

  function save() {
    var data = {
      category: draft.category, mood: draft.mood, text: draft.text,
      images: draft.images.slice(), tags: draft.tags, place: draft.place,
      weather: draft.weather, prompt: draft.prompt
    };
    if (editing) {
      /* 日期被改过 → 同步把 created_at 挪过去（保留原来的时分） */
      if (draft.date && draft.date !== ymd(editing.created_at)) {
        var iso = dateToISO(draft.date, editing.created_at);
        if (iso) data.created_at = iso;
      }
      Store.updateDiary(editing.id, data);
      UI.toast('已更新', 'ok');
    } else {
      data.user_id = Store.state.currentUserId;
      if (draft.date && draft.date !== todayStr()) {
        var iso2 = dateToISO(draft.date);
        if (iso2) data.created_at = iso2;
      }
      Store.addDiary(data);
      UI.toast('记下了 📔', 'ok');
    }
    App.render();
  }

  /* ---------------- 生成「我的日常」故事书 ---------------- */
  function openBook() {
    if (!window.BookExport || !BookExport.downloadDiary) { UI.toast('故事书模块没加载上', 'err'); return; }
    var total = mine().length;
    if (!total) { UI.toast('还没有记录，先写一条吧', 'err'); return; }
    UI.promptSheet({
      title: '生成日常故事书',
      sub: '把记下的日常按时间线排成一本只属于你的册子：双击就能翻，打印即存 PDF',
      fields: [
        {
          key: 'format', label: '格式', type: 'select', value: 'HTML（可翻阅 / 打印）',
          options: ['HTML（可翻阅 / 打印）', 'Markdown（贴到笔记 / 公众号）']
        },
        {
          key: 'range', label: '范围', type: 'select', value: '全部',
          options: ['全部', '今年', '本月', '只看今天这一天']
        },
        {
          key: 'category', label: '分类', type: 'select', value: '全部',
          options: ['全部'].concat(CATS.map(function (c) { return c.k; }))
        },
        {
          key: 'mood', label: '心情', type: 'select', value: '全部',
          options: ['全部'].concat(MOODS.map(function (m) { return m.k; }))
        },
        {
          key: 'cover', label: '封面', type: 'select', value: '经典封面',
          options: ['经典封面', '用最近的一张照片']
        },
        {
          key: 'photos', label: '照片', type: 'select', value: '含照片',
          options: ['含照片', '不要照片（纯文字，文件小很多）']
        }
      ],
      okText: '生成故事书'
    }).then(function (v) {
      if (!v) return;
      var range = 'all';
      if (v.range === '今年') range = 'year';
      else if (v.range === '本月') range = 'month';
      else if (v.range === '只看今天这一天') range = 'day';
      BookExport.downloadDiary({
        range: range,
        day: todayStr(),
        category: v.category !== '全部' ? v.category : 'all',
        mood: v.mood !== '全部' ? v.mood : 'all',
        cover: v.cover === '用最近的一张照片' ? 'latest' : 'classic',
        format: v.format.indexOf('Markdown') === 0 ? 'md' : 'html',
        photos: v.photos === '含照片'
      });
    });
  }

  return {
    render: render, mount: mount, compose: compose, openBook: openBook,
    CATS: CATS, MOODS: MOODS, PROMPTS: PROMPTS
  };
})();
