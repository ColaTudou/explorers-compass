/* ============================================================
   探险家的罗盘 · AI 陪聊唤醒
   PRD 4.3：草稿停留超 3 天、文本为空或少于 20 字时，
   用 5 个「是/否或一两个词就能回答」的问题引导回忆，答案整理成回忆录回填。
   —— 无大模型环境下用规则提问引擎实现，接 LLM 时替换 generateQuestions() 即可
   ============================================================ */
window.Awaken = (function () {

  /* ---------- 触发条件（PRD 4.3） ---------- */
  function needAwaken(j) {
    if (!j || j.status !== 'draft') return false;
    var side = j[Store.mySideKey()] || j.a_side || j.b_side;
    var text = side ? (side.text || '') : '';
    var tooShort = !text || text.replace(/\s/g, '').length < 20;
    var old = (Date.now() - new Date(j.created_at).getTime()) / 86400000 > 3;
    return tooShort && old;
  }

  function pendingList() {
    return Store.state.journeys.filter(function (j) { return needAwaken(j); });
  }

  /* ---------- 问题库 ----------
     每个问题带 tpl（答案 → 陈述句片段），用于合成回忆录 */
  function bank(ctx) {
    var cat = ctx.category || '其他';
    var byCat = {
      '美食': [
        q('是第一次来这家吗？', 'bool', { yes: '那是第一次来这家', no: '这家之前就来过，算是熟门熟路' }),
        q('排队了吗？', 'bool', { yes: '还排了会儿队', no: '运气不错，没等位' }),
        q('哪道菜印象最深？', 'word', { w: function (v) { return '到现在还记得那道「' + v + '」'; } }),
        q('会想再来第二次吗？', 'bool', { yes: '两个人都说还会再来', no: '尝过一次也就够了' })
      ],
      '探店': [
        q('是专程去的，还是路过？', 'choice', {
          choices: ['专程去的', '路过顺便'],
          tpls: ['是专程绕过去的一趟', '是路过时顺手拐进去的']
        }),
        q('待了多久？', 'choice', {
          choices: ['不到一小时', '一到三小时', '大半天'],
          tpls: ['匆匆待了不到一小时', '在里面消磨了一两个小时', '足足待了大半天']
        }),
        q('买/看了什么印象最深？', 'word', { w: function (v) { return '印象最深的是「' + v + '」'; } }),
        q('还想去第二次吗？', 'bool', { yes: '走的时候还说下次再来', no: '去过一次就知足了' })
      ],
      '旅行': [
        q('是提前计划好的，还是临时起意？', 'choice', {
          choices: ['计划很久了', '临时起意'],
          tpls: ['这趟是计划了很久的', '这趟纯属临时起意']
        }),
        q('天气给面子吗？', 'bool', { yes: '天气很给面子', no: '天气不太配合，但也算一种经历' }),
        q('走了很多路吗？', 'bool', { yes: '那天走了特别多路，脚都酸了', no: '没怎么折腾，走得挺悠闲' }),
        q('最想再回去的是哪儿？', 'word', { w: function (v) { return '最想再回去看看的是「' + v + '」'; } })
      ],
      '演出': [
        q('是提前买票的吗？', 'bool', { yes: '票是提前买好的', no: '临时才决定去的' }),
        q('位置好不好？', 'bool', { yes: '位置不错，看得清楚', no: '位置一般，但气氛够' }),
        q('散场后聊了很久吗？', 'bool', { yes: '散场路上还在聊', no: '散场就各想各的了' }),
        q('最记得哪一幕？', 'word', { w: function (v) { return '最记得的是「' + v + '」那一幕'; } })
      ],
      '运动': [
        q('是第一次尝试吗？', 'bool', { yes: '那是第一次尝试', no: '算是轻车熟路了' }),
        q('累吗？', 'choice', {
          choices: ['还好', '有点累', '累瘫了'],
          tpls: ['意外地不太累', '有点累但很爽', '回来直接累瘫了']
        }),
        q('有进步吗？', 'bool', { yes: '比上次有进步', no: '水平一如既往' }),
        q('下次还约吗？', 'bool', { yes: '当场就约了下一次', no: '短期内是不想了' })
      ],
      '居家': [
        q('是临时决定的吗？', 'bool', { yes: '完全是临时起意', no: '早就在计划里了' }),
        q('待了一整天吗？', 'bool', { yes: '在家待了一整天', no: '只是抽了段空闲' }),
        q('有做出什么成果吗？', 'bool', { yes: '还真折腾出点成果', no: '什么成果也没有，但挺放松' }),
        q('那天最舒服的时刻是？', 'word', { w: function (v) { return '最舒服的是「' + v + '」的时候'; } })
      ],
      '手工': [
        q('是第一次做吗？', 'bool', { yes: '那是第一次动手做', no: '之前就做过，这次更顺手' }),
        q('成品满意吗？', 'bool', { yes: '成品出乎意料地满意', no: '成品有点一言难尽' }),
        q('花了多长时间？', 'choice', {
          choices: ['一小时以内', '两三小时', '半天以上'],
          tpls: ['一小时不到就搞定了', '做了两三个小时', '耗了大半天在上面']
        }),
        q('成品还在吗？', 'bool', { yes: '成品到现在还留着', no: '做完就不知放哪了' })
      ]
    };

    var list = (byCat[cat] || []).slice();

    /* 通用问题补到 5 条 */
    var generic = [
      q('是周末去的吗？', 'bool', { yes: '那天是个周末', no: '是工作日抽空去的' }),
      q('是和对方一起去的吗？', 'bool', { yes: '是两个人一起去的', no: '那天没能一起' }),
      q('心情怎么样？', 'choice', {
        choices: ['很好', '还行', '不太好'],
        tpls: ['那天心情很好', '心情平平淡淡', '那天心情有点低落']
      }),
      q('拍照了吗？', 'bool', { yes: '拍了不少照片', no: '倒是没怎么拍照' }),
      q('是白天还是晚上？', 'choice', {
        choices: ['白天', '晚上'],
        tpls: ['是白天去的', '是晚上去的']
      }),
      q('花销大概什么水平？', 'choice', {
        choices: ['很便宜', '正常', '有点贵'],
        tpls: ['花得不多', '花费中规中矩', '这顿/这趟花了点钱']
      }),
      q('还会想起那天吗？', 'bool', { yes: '后来还会时不时想起来', no: '之后就很少想起了' })
    ];
    shuffle(generic);
    while (list.length < 5 && generic.length) list.push(generic.pop());

    shuffle(list);
    return list.slice(0, 5);
  }

  function q(text, type, tpl) {
    return { q: text, type: type, tpl: tpl };
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- 合成回忆录（PRD 4.3 第五步） ---------- */
  function compose(j, qs, answers) {
    var d = new Date(j.start_date);
    var wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    var month = d.getMonth() + 1;
    var season = month >= 3 && month <= 5 ? '春天'
      : month >= 6 && month <= 8 ? '夏天'
        : month >= 9 && month <= 11 ? '秋天' : '冬天';

    var head = '那是一个' + season + '的' + wd;
    if (j.location_name) head += '，去了「' + j.location_name + '」';
    head += '。';

    var body = qs.map(function (item, i) {
      var a = answers[i];
      if (a === undefined || a === null || a === '') return '';
      if (item.type === 'bool') {
        return a === true ? item.tpl.yes : item.tpl.no;
      }
      if (item.type === 'choice') {
        var idx = item.tpl.choices.indexOf(a);
        return idx >= 0 ? item.tpl.tpls[idx] : String(a);
      }
      return item.tpl.w ? item.tpl.w(a) : String(a);
    }).filter(Boolean);

    var tail = body.length ? body.join('；') + '。' : '';
    return head + tail;
  }

  /* 把内部答案结构转成给 LLM 看的自然语言 */
  function answerText(item, a) {
    if (a === undefined || a === null || a === '') return '想不起来了';
    if (item.type === 'bool') return a === true ? '是' : '不是';
    return String(a);
  }

  return {
    needAwaken: needAwaken, pendingList: pendingList,
    bank: bank, compose: compose, answerText: answerText
  };
})();

/* ============================================================
   AI 唤醒的问答界面（挂在 Views 下）
   ============================================================ */
window.Views = window.Views || {};

Views.awaken = (function () {

  var _j = null, _qs = [], _i = 0, _ans = [];
  var _llmTried = false;      // 每次问答只试一次 LLM 出题
  var _llmComposeTried = false;

  function start(journeyId) {
    var j = Store.getJourney(journeyId);
    if (!j) return;
    _j = j;
    _qs = Awaken.bank({ category: j.category });
    _i = 0;
    _ans = [];
    _llmTried = false;
    _llmComposeTried = false;
    location.hash = '#/awaken/' + journeyId;

    /* 渐进增强：本地题目立刻可用，LLM 题目到了再换（用户还没作答才换） */
    if (LLM.isOn()) {
      LLM.questions({
        location: j.location_name || '',
        category: j.category,
        date: UI.dateCN(j.start_date)
      }).then(function (qs) {
        if (qs && qs.length >= 3 && _i === 0 && _j && _j.id === journeyId) {
          _qs = qs; _ans = [];
          App.render();
        }
      }).catch(function () { /* 静默回退本地题库 */ });
    }
  }

  function render(id) {
    var j = Store.getJourney(id);
    if (!j) return '<div class="empty">找不到这段旅程</div>';
    if (_j && _j.id !== id) { _j = j; _qs = Awaken.bank({ category: j.category }); _i = 0; _ans = []; }
    if (!_qs.length) { _qs = Awaken.bank({ category: j.category }); }

    if (_i >= _qs.length) return tplDone();

    var item = _qs[_i];
    var where = j.location_name ? '「' + j.location_name + '」' : '那天';
    return '' +
      '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 退出</button>' +
      '<div class="qa-progress">' + _qs.map(function (_, i) {
        return '<i class="' + (i < _i ? 'is-done' : i === _i ? 'is-on' : '') + '"></i>';
      }).join('') + '</div>' +
      '<div class="card qa-card">' +
      '<div class="t-cap mb-md">关于 ' + UI.esc(where) + ' 的回忆，帮我确认几个小问题吧～</div>' +
      '<div class="qa-q">' + UI.esc(item.q) + '</div>' +
      (item.type === 'bool'
        ? '<div class="qa-opts">' +
        '<button class="qa-opt" data-a="yes">是</button>' +
        '<button class="qa-opt" data-a="no">不是</button>' +
        '<button class="qa-opt" data-a="skip">想不起来了</button>' +
        '</div>'
        : item.type === 'choice'
          ? '<div class="qa-opts">' + item.tpl.choices.map(function (c) {
            return '<button class="qa-opt" data-a="' + UI.esc(c) + '">' + UI.esc(c) + '</button>';
          }).join('') +
          '<button class="qa-opt" data-a="skip">想不起来了</button></div>'
          : '<input class="input" id="qaWord" placeholder="一两个词就行" autocomplete="off">' +
          '<div class="qa-opts mt-md">' +
          '<button class="qa-opt" data-act="word">就这个</button>' +
          '<button class="qa-opt" data-a="skip">想不起来了</button></div>') +
      '</div>' +
      '<div class="t-sm t-center mt-base">第 ' + (_i + 1) + ' / ' + _qs.length + ' 题　·　' +
      '答完全部会自动整理成一段回忆录</div>' +
      '<div style="height:var(--xl)"></div>';
  }

  function tplDone() {
    var text = Awaken.compose(_j, _qs, _ans);
    return '' +
      '<div class="t-center mt-lg">' +
      '<div class="t-h1 mb-md">整理好了 ✨</div>' +
      '<div class="t-2 mb-base">下面是根据你刚才的回答拼出来的，可以改，也可以直接存。</div>' +
      '<div class="t-center mb-sm"><span id="aiBadge" class="tag tag--success hide">✨ AI 正在整理…</span></div>' +
      '<textarea class="textarea" id="finalText" style="min-height:160px">' + UI.esc(text) + '</textarea>' +
      '<button class="btn btn--primary btn--lg btn--block mt-base" id="btnSave">存进这段回忆</button>' +
      '<button class="btn btn--text btn--block mt-sm" id="btnRedo">重问一遍</button>' +
      '</div>';
  }

  function mount(root, id) {
    var j = Store.getJourney(id);
    if (!j) return;

    if (_i >= _qs.length) {
      /* 本地合成先上，LLM 成文到了再替换（失败就保留本地版本） */
      if (LLM.isOn() && !_llmComposeTried) {
        _llmComposeTried = true;
        var badge = root.querySelector('#aiBadge');
        if (badge) badge.classList.remove('hide');
        var pairs = _qs.map(function (item, i) {
          return { q: item.q, a: Awaken.answerText(item, _ans[i]) };
        });
        LLM.composeText({
          date: UI.dateCN(j.start_date),
          location: j.location_name || '',
          category: j.category
        }, pairs).then(function (t) {
          var ta = root.querySelector('#finalText');
          if (t && ta) ta.value = t;
          if (badge) badge.textContent = '✨ AI 生成';
        }).catch(function () {
          if (badge) badge.classList.add('hide');
        });
      }

      var bs = root.querySelector('#btnSave');
      if (bs) bs.onclick = function () {
        var v = root.querySelector('#finalText').value.trim();
        var key = Store.mySideKey();
        j[key] = j[key] || Store.sideTemplate(Store.state.currentUserId);
        j[key].text = v;
        j.updated_at = Store.nowISO();
        Store.save();
        UI.toast('回忆录已写入，状态仍是草稿，可继续改', 'ok');
        location.hash = '#/journeys/' + id;
      };
      var br = root.querySelector('#btnRedo');
      if (br) br.onclick = function () {
        _qs = Awaken.bank({ category: j.category }); _i = 0; _ans = [];
        _llmComposeTried = false; App.render();
      };
      return;
    }

    root.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.a;
        _ans[_i] = a === 'yes' ? true : a === 'no' ? false : a === 'skip' ? null : a;
        _i++; App.render();
      };
    });
    var wb = root.querySelector('[data-act="word"]');
    if (wb) wb.onclick = function () {
      var v = root.querySelector('#qaWord').value.trim();
      if (!v) { UI.toast('写点什么，或直接说想不起来了'); return; }
      _ans[_i] = v; _i++; App.render();
    };
    var wi = root.querySelector('#qaWord');
    if (wi) {
      wi.focus();
      wi.onkeydown = function (e) { if (e.key === 'Enter') wb.click(); };
    }
  }

  function clear() { _j = null; _qs = []; _i = 0; _ans = []; _llmTried = false; _llmComposeTried = false; }

  return { start: start, render: render, mount: mount, clear: clear };
})();
