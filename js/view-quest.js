/* ============================================================
   任务冒险 · Views.quest
   入口：我的 → 更多功能 → 🎯 任务冒险
   路由：#/quest        → 列表
        #/quest/<id>   → 某一局（执行 / 结算）
   ============================================================ */
window.Views = window.Views || {};

Views.quest = (function () {
  var _id = null;

  /* ---------------- 列表 ---------------- */
  function render() {
    var act = Quest.active();
    var done = Quest.finished();

    var html = '<button class="btn btn--text btn--sm mb-md" onclick="history.back()">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--between mb-md">' +
      '<div><h1 class="t-h1">🎯 任务冒险</h1>' +
      '<div class="t-cap mt-sm">写下想做的事，让系统派任务给你们俩</div></div>' +
      '</div>';

    html += '<div class="row row--tight mb-base">' +
      '<button class="btn btn--primary grow" id="qNewDaily">🎲 开一局（日常）</button>' +
      '<button class="btn btn--secondary grow" id="qNewTrip">🧳 开一局（旅行）</button>' +
      '</div>';

    if (!act.length && !done.length) {
      html += '<div class="empty"><div class="empty__icon">🎯</div>' +
        '<div class="empty__title">还没有冒险</div>' +
        '<div class="empty__desc">开一局，系统会从你们的「心愿」里挑几件事，' +
        '配上几个双人小任务，分头去完成。</div></div>' +
        '<div class="card card--pad mt-base t-sm">' +
        '<b>怎么玩：</b><br>' +
        '① 先去「心愿」写下想去的地方、想吃的东西<br>' +
        '② 回来开一局，填一个总预算（怎么花你们自己定）<br>' +
        '③ 系统派任务：双人任务要两人都打卡才算完成<br>' +
        '④ 全部完成后结算 → 存档 → 可以生成故事录<br>' +
        '⑤ 给这局打个分，下次会派得更合口味</div>';
    }

    if (act.length) {
      html += '<div class="section__head"><div class="section__title">进行中</div></div>' +
        '<div class="col mb-base">' + act.map(actCard).join('') + '</div>';
    }
    if (done.length) {
      html += '<div class="section__head"><div class="section__title">已完成的冒险（' + done.length + '）</div></div>' +
        '<div class="col mb-base">' + done.map(doneCard).join('') + '</div>';
    }

    return html + '<div style="height:var(--xxl)"></div>';
  }

  /* 列表卡片上的主题/位置小标签 */
  function themeLine(q) {
    if (!q.theme && !q.location) return '';
    return '<div class="row row--tight row--wrap mt-sm">' +
      (q.theme ? '<span class="tag tag--plain">🎨 ' + UI.esc(q.theme) + '</span>' : '') +
      (q.location ? '<span class="tag tag--plain">📍 ' + UI.esc(q.location.label || '已定位') + '</span>' : '') +
      '</div>';
  }

  function actCard(q) {
    var p = Quest.progress(q);
    return '<div class="card card--pad" data-open="' + q.id + '">' +
      '<div class="row row--between">' +
      '<div class="grow"><div class="t-h3">' + (q.mode === 'trip' ? '🧳 ' : '🎲 ') + UI.esc(q.title) + '</div>' +
      themeLine(q) +
      '<div class="t-sm mt-sm">完成 ' + p.done + '/' + p.total +
      (p.duoTotal ? ' · 双人 ' + p.duoDone + '/' + p.duoTotal : '') +
      (q.budget ? ' · 预算 ¥' + q.budget + (p.spent ? '（已花 ¥' + p.spent + '）' : '') : '') +
      '</div></div>' +
      '<div class="t-display" style="font-size:22px">' + p.pct + '%</div></div>' +
      '<div style="height:6px;background:var(--m0);border-radius:99px;overflow:hidden;margin-top:8px">' +
      '<div style="height:100%;width:' + p.pct + '%;background:var(--brand);border-radius:99px"></div></div>' +
      '</div>';
  }

  function doneCard(q) {
    var s = q.summary || Quest.progress(q);
    var stars = q.rating ? '　' + '★'.repeat(q.rating) + '☆'.repeat(5 - q.rating) : '　未评分';
    return '<div class="card card--pad" data-open="' + q.id + '">' +
      '<div class="t-h3">' + (q.mode === 'trip' ? '🧳 ' : '🎲 ') + UI.esc(q.title) + '</div>' +
      themeLine(q) +
      '<div class="t-sm mt-sm">' + (String(q.finished_at||'').slice(0,10)) + ' · 完成 ' + s.done + '/' + s.total +
      (s.spent ? ' · 花了 ¥' + s.spent : '') + '</div>' +
      '<div class="t-sm" style="color:var(--warn)">' + stars + '</div>' +
      '</div>';
  }

  /* ---------------- 详情（执行 / 结算） ---------------- */
  function renderDetail(id) {
    var q = Quest.get(id);
    if (!q) return '<div class="empty"><div class="empty__title">这局不见了</div></div>';
    var p = Quest.progress(q);
    var me = Store.state.currentUserId;

    var html = '<button class="btn btn--text btn--sm mb-md" onclick="location.hash=\'#/quest\'">' +
      UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--between mb-md"><div>' +
      '<h1 class="t-h1">' + (q.mode === 'trip' ? '🧳 ' : '🎲 ') + UI.esc(q.title) + '</h1>' +
      '<div class="t-cap mt-sm">' + (q.status === 'finished' ? '已结束 · ' : '进行中 · ') +
      '完成 ' + p.done + '/' + p.total +
      (q.budget ? ' · 预算 ¥' + q.budget + '（已花 ¥' + p.spent + '）' : '') +
      '</div></div>' +
      (q.status === 'active' ? '<button class="btn btn--secondary btn--sm" id="qFinish">结算</button>' : '') +
      '</div>' +
      '<div style="height:6px;background:var(--m0);border-radius:99px;overflow:hidden;margin-bottom:var(--base)">' +
      '<div style="height:100%;width:' + p.pct + '%;background:var(--brand);border-radius:99px"></div></div>';

    /* 主题 / 规则 / 位置 */
    var chips = '';
    if (q.theme) chips += '<span class="tag tag--plain">🎨 ' + UI.esc(q.theme) + '</span>';
    if (q.location) {
      chips += '<span class="tag tag--plain">📍 ' + UI.esc(q.location.label || '当前位置') +
        (q.location.weather ? ' · ' + UI.esc(q.location.weather) : '') + '</span>';
    }
    if (chips || (q.rules && q.rules.length)) {
      html += '<div class="card card--pad mb-base">';
      if (chips) html += '<div class="row row--tight row--wrap">' + chips + '</div>';
      if (q.rules && q.rules.length) {
        html += '<div class="t-h3 mt-base mb-sm">本局规则</div>' +
          q.rules.map(function (r, i) {
            return '<div class="t-sm">' + (i + 1) + '. ' + UI.esc(r.text) +
              (r.from === 'ai' ? ' <span class="tag tag--plain">AI</span>' : '') + '</div>';
          }).join('');
      }
      html += '</div>';
    }

    if (q.status === 'finished' && q.summary) {
      html += '<div class="card card--pad mb-base">' +
        '<div class="t-h3 mb-sm">本次战绩</div>' +
        '<div class="t-sm">完成任务 ' + q.summary.done + ' / ' + q.summary.total +
        '（双人任务 ' + q.summary.duoDone + '/' + q.summary.duoTotal + '）' +
        (q.summary.spent ? ' · 共花 ¥' + q.summary.spent : '') + '</div>' +
        '<div class="t-sm mt-sm">评分：' + (q.rating ? '★'.repeat(q.rating) : '还没打分') + '</div>' +
        (q.rating_tags && q.rating_tags.length ? '<div class="row row--tight row--wrap mt-sm">' +
          q.rating_tags.map(function (t) { return '<span class="tag tag--plain">' + UI.esc(t) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="row row--tight mt-base">' +
        '<button class="btn btn--secondary btn--sm grow" id="qRate">' + (q.rating ? '改评分' : '给这局打分') + '</button>' +
        '<button class="btn btn--secondary btn--sm grow" id="qBook">生成故事录</button>' +
        '</div>' +
        '<button class="btn btn--text btn--sm mt-sm" id="qJournal">' +
        (q.journal_id ? '查看存档' : '归档成经历') + '</button>' +
        '</div>';
    }

    /* 我的任务 */
    var mine = Quest.myTasks(q);
    html += '<div class="section__head"><div class="section__title">我的任务（' + mine.length + '）</div></div>';
    html += mine.length ? '<div class="col mb-base">' + mine.map(function (t) { return taskCard(q, t, true); }).join('') + '</div>'
      : '<div class="card card--pad mb-base t-sm">这局没有分给你的任务</div>';

    /* TA 的任务（只看状态，不看内容） */
    var others = Quest.otherTasks(q);
    if (others.length) {
      html += '<div class="section__head"><div class="section__title">TA 的任务（' + others.length + '）</div></div>' +
        '<div class="col mb-base">' + others.map(function (t) {
          var who = Quest.userName(t.assignee) || 'TA';
          return '<div class="card card--pad row row--between">' +
            '<div><div class="t-body2" style="font-weight:500">' + UI.esc(t.title) + '</div>' +
            '<div class="t-sm">' + UI.esc(who) + ' 的秘密任务</div></div>' +
            '<span class="tag ' + (t.status === 'done' ? 'tag--success' : 'tag--plain') + '">' +
            (t.status === 'done' ? '已完成' : '进行中') + '</span></div>';
        }).join('') + '</div>';
    }

    if (q.status === 'active') {
      html += '<div class="row row--tight">' +
        '<button class="btn btn--ghost grow" id="qAdd">＋ 临时加个任务</button>' +
        (window.LLM && LLM.isOn() ? '<button class="btn btn--ghost grow" id="qAddAi">✨ AI 补 2 个</button>' : '') +
        '<button class="btn btn--ghost" id="qDel">删除这局</button>' +
        '</div>';
    }
    return html + '<div style="height:var(--xxl)"></div>';
  }

  function taskCard(q, t, mine) {
    var isDuo = t.type === 'duo';
    var done = t.status === 'done';
    var skipped = t.status === 'skip';
    var myCi = (t.checkins || []).filter(function (c) { return c.userId === Store.state.currentUserId; })[0];
    var who = isDuo ? '👫 双人任务' : (Quest.userName(t.assignee) || '个人') + ' 的任务';

    var html = '<div class="card card--pad' + (done ? ' is-done' : '') + '" data-task="' + t.id + '">' +
      '<div class="row row--between">' +
      '<div class="grow"><div class="t-h3">' + (done ? '✅ ' : isDuo ? '👫 ' : '🎯 ') + UI.esc(t.title) + '</div>' +
      (t.desc ? '<div class="t-2 mt-sm">' + UI.esc(t.desc) + '</div>' : '') +
      (t.why ? '<div class="t-sm mt-sm" style="color:var(--text-3)">💡 ' + UI.esc(t.why) + '</div>' : '') +
      '<div class="row row--tight row--wrap mt-sm">' +
      '<span class="tag ' + (isDuo ? 'tag--plain' : 'tag--plain') + '">' + UI.esc(who) + '</span>' +
      (t.from === 'ai' ? '<span class="tag tag--plain">✨ AI 出的</span>' : '') +
      (t.from === 'wish' ? '<span class="tag tag--plain">💛 来自心愿</span>' : '') +
      (t.spent ? '<span class="tag tag--plain">¥' + t.spent + '</span>' : '') +
      (done && t.rating ? '<span class="tag tag--plain">' + '★'.repeat(t.rating) + '</span>' : '') +
      '</div></div></div>';

    if (skipped) html += '<div class="t-sm mt-sm" style="color:var(--text-3)">已跳过</div>';

    if (myCi && myCi.note) {
      html += '<div class="card card--pad mt-sm" style="background:var(--bg-2)">' +
        '<div class="t-sm">' + UI.esc(myCi.note) + '</div>' +
        ((myCi.images || []).length ? '<div class="row row--tight row--wrap mt-sm">' +
          myCi.images.slice(0, 3).map(function (u) {
            return '<img src="' + u + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px">';
          }).join('') + '</div>' : '') + '</div>';
    }

    if (q.status === 'active' && mine && !done && !skipped) {
      html += '<div class="row row--tight mt-base">' +
        '<button class="btn btn--primary btn--sm grow" data-checkin="' + t.id + '">' +
        (isDuo ? '打卡（等 TA 一起完成）' : '完成打卡') + '</button>' +
        '<button class="btn btn--ghost btn--sm" data-skip="' + t.id + '">跳过</button>' +
        '</div>';
    }
    if (isDuo && !done && q.status === 'active') {
      var n = (t.checkins || []).length;
      html += '<div class="t-sm mt-sm">' + (n ? '已打卡 ' + n + '/2，等 TA' : '还没人打卡') + '</div>';
    }
    return html + '</div>';
  }

  /* ---------------- 开局弹窗 ---------------- */
  function openNew(mode) {
    var hasWish = (Store.state.wishes || []).filter(function (w) { return !w.is_done; }).length;
    var aiOn = !!(window.LLM && LLM.isOn());
    var presets = (Quest.THEMES[mode] || []).slice(0, 8);
    var loc = null;          /* 定位结果，勾选后才去取 */
    var locating = false;

    function themeInput(el) { return el.querySelector('#qTheme').value.trim(); }

    UI.modal({
      title: mode === 'trip' ? '🧳 开一局旅行' : '🎲 开一局日常',
      sub: '定个主题、定几条规则，系统照着派任务',
      body:
        '<div class="field"><label class="field__label">给这局起个名字</label>' +
        '<input class="input" id="qTitle" placeholder="' + (mode === 'trip' ? '比如：厦门三天两夜' : '比如：周末瞎逛') + '"></div>' +

        '<div class="field"><label class="field__label">🎨 主题（任务会围着它转）</label>' +
        '<input class="input" id="qTheme" placeholder="自己写，或点下面的现成主题">' +
        '<div class="row row--tight row--wrap mt-sm" id="qThemeChips">' +
        presets.map(function (t) {
          return '<button class="tag tag--plain" data-th="' + UI.esc(t.name) + '">' + UI.esc(t.name) + '</button>';
        }).join('') +
        '<button class="tag tag--plain" data-th="__random">🎲 随机</button>' +
        '</div></div>' +

        '<div class="field"><label class="field__label">📜 玩法规则（可留空，一行一条）</label>' +
        '<textarea class="textarea" id="qRules" rows="3" placeholder="比如：\n全程只能步行\n拍照必须把对方拍进去"></textarea>' +
        '<div class="row row--tight mt-sm">' +
        '<button class="btn btn--ghost btn--sm" id="qRuleRandom">🎲 随机规则</button>' +
        (aiOn ? '<button class="btn btn--ghost btn--sm" id="qRuleAi">✨ AI 定规则</button>' : '') +
        '</div>' +
        '<div class="field__hint">定了规则，AI 出的题就不许违反它</div></div>' +

        (mode === 'trip' ?
          '<div class="field"><label class="field__label">📍 位置</label>' +
          '<label class="row row--tight" style="align-items:center">' +
          '<input type="checkbox" id="qLoc" style="width:18px;height:18px;flex:none"> ' +
          '<span class="t-sm">用当前位置，让任务贴合这里</span></label>' +
          '<div class="field__hint" id="qLocOut">' +
          (Quest.geoSupported() ? '只在开局这一刻取一次，不会记录轨迹、也不会上传' : '当前环境不支持定位（需要 https 且授权）') +
          '</div></div>' : '') +

        '<div class="field"><label class="field__label">总预算（可留空）</label>' +
        '<input class="input" id="qBudget" type="number" inputmode="numeric" placeholder="填个总数就行，怎么花你们自己定">' +
        '<div class="field__hint">预算只用来记个数，不会限制你怎么花</div></div>' +
        '<div class="field"><label class="field__label">任务数量</label>' +
        '<select class="select" id="qCount">' +
        '<option value="4">4 个（轻松）</option>' +
        '<option value="5" selected>5 个（刚好）</option>' +
        '<option value="7">7 个（充实）</option>' +
        '</select></div>' +
        '<div class="card card--pad t-sm">' +
        '心愿池里有 <b>' + hasWish + '</b> 件没做的事，会优先被派成任务。<br>' +
        '任务来源：' + (aiOn ? '<b>AI 生成</b>（按主题/规则/位置出题，失败自动用本地模板）' : '本地随机模板（会尽量贴合主题；想要 AI 出题去「我的 → AI 大模型」配置）') +
        '</div>',
      footer: '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">开始派任务</button>',
      onMount: function (el, close) {
        /* 主题：点标签填入 / 随机挑一个 */
        el.querySelectorAll('[data-th]').forEach(function (b) {
          b.onclick = function () {
            var v = b.dataset.th;
            if (v === '__random') {
              var all = Quest.THEMES[mode] || [];
              v = all[Math.floor(Math.random() * all.length)].name;
            }
            el.querySelector('#qTheme').value = v;
            el.querySelectorAll('[data-th]').forEach(function (x) { x.className = 'tag tag--plain'; });
            b.className = 'tag tag--success';
          };
        });

        /* 随机规则 */
        el.querySelector('#qRuleRandom').onclick = function () {
          var rs = Quest.randomRules(themeInput(el) || '随便逛逛', mode, 3);
          el.querySelector('#qRules').value = rs.join('\n');
          UI.toast('换了一批规则', 'ok');
        };

        /* AI 定规则 */
        var rai = el.querySelector('#qRuleAi');
        if (rai) rai.onclick = function () {
          rai.disabled = true; rai.textContent = '✨ 思考中…';
          Quest.aiRules(themeInput(el), mode, 3).then(function (rs) {
            rai.disabled = false; rai.textContent = '✨ AI 定规则';
            if (!rs.length) { UI.toast('AI 没憋出来，试试随机规则', 'err'); return; }
            el.querySelector('#qRules').value = rs.join('\n');
            UI.toast('规则定好了', 'ok');
          });
        };

        /* 定位（仅旅行模式） */
        var locBox = el.querySelector('#qLoc');
        if (locBox) locBox.onchange = function () {
          var out = el.querySelector('#qLocOut');
          if (!locBox.checked) { loc = null; out.textContent = '已关闭'; return; }
          if (locating) return;
          locating = true;
          out.textContent = '正在定位…';
          Quest.locate().then(function (c) {
            locating = false;
            if (!c) {
              locBox.checked = false; loc = null;
              out.textContent = '定位失败（需要授权；也可以不开，任务照常派）';
              UI.toast('没拿到位置，不影响开局', 'err');
              return;
            }
            loc = c;
            out.textContent = '📍 ' + (c.label || '当前位置') + '（' + c.lat.toFixed(3) + ', ' + c.lng.toFixed(3) + '）';
            /* 顺带带一份天气给 AI 参考，拿不到就算了 */
            attachWeather(c);
          });
        };

        el.querySelector('[data-act="no"]').onclick = function () { close(); };
        el.querySelector('[data-act="yes"]').onclick = function () {
          var title = el.querySelector('#qTitle').value.trim();
          var theme = themeInput(el);
          var rules = el.querySelector('#qRules').value;
          var budget = el.querySelector('#qBudget').value.trim();
          var count = Number(el.querySelector('#qCount').value) || 5;
          close();
          UI.toast('正在派任务…');
          var q = Quest.create({
            mode: mode,
            title: title || (mode === 'trip' ? '一次旅行' : '今日份冒险'),
            theme: theme,
            rules: rules,
            location: loc,
            budget: budget === '' ? null : budget
          });
          Quest.generate(q, { count: count, ai: aiOn }).then(function () {
            UI.toast('派好了，去玩吧 🎯', 'ok');
            location.hash = '#/quest/' + q.id;
            App.render();
          });
        };
      }
    });
  }

  /* 给定位补一份天气（纯装饰，拿不到就算了；固定城市时不取，避免错配） */
  function attachWeather(loc) {
    try {
      if (!window.Weather || !Weather.settings) return;
      var s = Weather.settings();
      if (s && s.city && s.city !== 'auto') return;
      Weather.get().then(function (w) {
        if (w && w.text) loc.weather = w.text + (w.temp != null ? ' ' + w.temp + '℃' : '');
      }).catch(function () { });
    } catch (e) { }
  }

  /* ---------------- 打卡 ---------------- */
  function openCheckin(q, taskId) {
    var t = (q.tasks || []).filter(function (x) { return x.id === taskId; })[0];
    if (!t) return;
    var imgs = [];
    UI.modal({
      title: '打卡：' + t.title,
      sub: t.type === 'duo' ? '两个人各打各的，都打完才算完成' : '记一笔就完成',
      body:
        '<div class="field"><label class="field__label">此刻的一句话</label>' +
        '<textarea class="textarea" id="ciNote" placeholder="发生了什么？"></textarea></div>' +
        '<div class="field"><label class="field__label">照片（可选）</label>' +
        '<div class="row row--wrap" id="ciImgs"></div>' +
        '<div class="row row--tight mt-sm">' +
        '<button class="btn btn--secondary btn--sm" id="ciPick">' + UI.icon('plus', 16) + ' 相册</button>' +
        '<button class="btn btn--ghost btn--sm" id="ciCam">📸 拍照</button></div></div>' +
        '<div class="field"><label class="field__label">这项花了多少（可选）</label>' +
        '<input class="input" id="ciSpent" type="number" inputmode="decimal" placeholder="0"></div>',
      footer: '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">打卡</button>',
      onMount: function (el, close) {
        function draw() {
          el.querySelector('#ciImgs').innerHTML = imgs.map(function (u, i) {
            return '<div style="position:relative;width:60px;height:60px">' +
              '<img src="' + u + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px">' +
              '<button data-rm="' + i + '" style="position:absolute;right:-4px;top:-4px;width:18px;height:18px;' +
              'border-radius:50%;background:#C95C5C;color:#fff;font-size:11px;line-height:18px">×</button></div>';
          }).join('');
          el.querySelectorAll('[data-rm]').forEach(function (b) {
            b.onclick = function () { imgs.splice(Number(b.dataset.rm), 1); draw(); };
          });
        }
        el.querySelector('#ciPick').onclick = function () {
          UI.pickImages(true).then(function (fs) {
            Promise.all(fs.slice(0, 4).map(function (f) { return UI.compressImage(f, 720, .6); }))
              .then(function (us) { imgs = imgs.concat(us); draw(); });
          });
        };
        el.querySelector('#ciCam').onclick = function () {
          UI.camera({ max: 4 }).then(function (us) { if (us && us.length) { imgs = imgs.concat(us); draw(); } });
        };
        el.querySelector('[data-act="no"]').onclick = function () { close(); };
        el.querySelector('[data-act="yes"]').onclick = function () {
          var spent = el.querySelector('#ciSpent').value.trim();
          Quest.checkin(q, taskId, {
            note: el.querySelector('#ciNote').value.trim(),
            images: imgs,
            spent: spent === '' ? null : spent
          });
          close();
          UI.toast(t.type === 'duo' ? '打卡成功，等 TA 一起完成' : '完成 ✅', 'ok');
          App.render();
        };
      }
    });
  }

  /* ---------------- 结算 + 评分 ---------------- */
  function openFinish(q) {
    var p = Quest.progress(q);
    UI.confirm({
      title: '结束这局？',
      text: '完成 ' + p.done + '/' + p.total + ' 项' +
        (p.duoTotal ? '（双人 ' + p.duoDone + '/' + p.duoTotal + '）' : '') +
        '。结束后会生成存档，随时可以再开一局。',
      okText: '结束并结算', danger: false
    }).then(function (ok) {
      if (!ok) return;
      Quest.finish(q);
      openRate(q);
    });
  }

  function openRate(q) {
    var picked = (q.rating_tags || []).slice();
    UI.modal({
      title: '给这局打个分',
      sub: '系统下次会派得更合你们的口味',
      body:
        '<div class="field"><label class="field__label">整体评分</label>' +
        '<div class="row" id="rateStars" style="gap:6px;font-size:30px">' +
        [1, 2, 3, 4, 5].map(function (i) {
          return '<span data-star="' + i + '" style="cursor:pointer;color:' +
            (q.rating && i <= q.rating ? 'var(--warn)' : 'var(--text-3)') + '">★</span>';
        }).join('') + '</div></div>' +
        '<div class="field"><label class="field__label">哪几个标签合适（可多选）</label>' +
        '<div class="row row--tight row--wrap" id="rateTags">' +
        Quest.RATING_TAGS.map(function (t) {
          return '<button class="tag ' + (picked.indexOf(t) >= 0 ? 'tag--success' : 'tag--plain') +
            '" data-tag="' + t + '">' + t + '</button>';
        }).join('') + '</div></div>',
      footer: '<button class="btn btn--primary" data-act="ok">保存</button>',
      onMount: function (el, close) {
        var score = q.rating || 0;
        el.querySelectorAll('[data-star]').forEach(function (s) {
          s.onclick = function () {
            score = Number(s.dataset.star);
            el.querySelectorAll('[data-star]').forEach(function (x) {
              x.style.color = Number(x.dataset.star) <= score ? 'var(--warn)' : 'var(--text-3)';
            });
          };
        });
        el.querySelectorAll('[data-tag]').forEach(function (b) {
          b.onclick = function () {
            var t = b.dataset.tag, i = picked.indexOf(t);
            if (i >= 0) { picked.splice(i, 1); b.className = 'tag tag--plain'; }
            else if (picked.length < 4) { picked.push(t); b.className = 'tag tag--success'; }
          };
        });
        el.querySelector('[data-act="ok"]').onclick = function () {
          Quest.rate(q, score, picked);
          close();
          UI.toast('记下了', 'ok');
          App.render();
        };
      }
    });
  }

  /* ---------------- 渲染 / 挂载 ---------------- */
  function renderView(id) { return id ? renderDetail(id) : render(); }

  function mount(root, id) {
    _id = id || null;

    var n1 = root.querySelector('#qNewDaily'), n2 = root.querySelector('#qNewTrip');
    if (n1) n1.onclick = function () { openNew('daily'); };
    if (n2) n2.onclick = function () { openNew('trip'); };

    root.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/quest/' + el.dataset.open; App.render(); };
    });

    if (!id) return;
    var q = Quest.get(id);
    if (!q) return;

    var fin = root.querySelector('#qFinish');
    if (fin) fin.onclick = function () { openFinish(q); };

    var rate = root.querySelector('#qRate');
    if (rate) rate.onclick = function () { openRate(q); };

    var book = root.querySelector('#qBook');
    if (book) book.onclick = function () {
      if (!q.journal_id) Quest.archive(q);
      if (window.BookExport && BookExport.download) {
        BookExport.download({ format: 'html', ids: q.journal_id ? [q.journal_id] : null });
      } else {
        UI.toast('已归档，去「旅程」里生成故事书', 'ok');
      }
    };

    var jr = root.querySelector('#qJournal');
    if (jr) jr.onclick = function () {
      if (!q.journal_id) Quest.archive(q);
      location.hash = '#/journeys/' + q.journal_id;
      App.render();
    };

    var del = root.querySelector('#qDel');
    if (del) del.onclick = function () {
      UI.confirm({ title: '删除这局？', text: '任务记录会一起删掉，无法恢复。', okText: '删除', danger: true })
        .then(function (ok) {
          if (!ok) return;
          Quest.remove(q); location.hash = '#/quest'; App.render();
        });
    };

    var add = root.querySelector('#qAdd');
    if (add) add.onclick = function () {
      UI.promptSheet({
        title: '临时加个任务',
        fields: [{ key: 'title', label: '想做点什么？', type: 'text', placeholder: '一句话' }]
      }).then(function (r) {
        var v = r && r.title ? String(r.title).trim() : '';
        if (!v) return;
        q.tasks.push({
          id: 't_' + Date.now().toString(36), title: v, desc: '',
          type: 'solo', assignee: Store.state.currentUserId,
          status: 'todo', checkins: [], rating: null, from: 'manual', wish_id: null, spent: 0
        });
        Store.save(); UI.toast('加上了', 'ok'); App.render();
      });
    };

    var addAi = root.querySelector('#qAddAi');
    if (addAi) addAi.onclick = function () {
      addAi.disabled = true; addAi.textContent = '✨ 出题中…';
      Quest.moreTasks(q, 2).then(function (ts) {
        addAi.disabled = false; addAi.textContent = '✨ AI 补 2 个';
        if (!ts.length) { UI.toast('AI 没憋出来，手动加一个吧', 'err'); return; }
        UI.toast('补了 ' + ts.length + ' 个', 'ok');
        App.render();
      });
    };

    root.querySelectorAll('[data-checkin]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openCheckin(q, b.dataset.checkin); };
    });
    root.querySelectorAll('[data-skip]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        Quest.skip(q, b.dataset.skip); App.render();
      };
    });
  }

  function clear() { _id = null; }

  return { render: renderView, mount: mount, clear: clear };
})();
