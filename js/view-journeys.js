/* ============================================================
   探险家的罗盘 · 旅程列表 / 详情 / 合并确认 / 二次批注 / 备注
   PRD 3.2.4 合并与确认 · 3.4.3 二次批注 · 3.5 重要时光与备注
   ============================================================ */
window.Views = window.Views || {};

Views.journeys = (function () {

  var filter = { cat: '', status: '', kw: '' };

  /* ================= 列表 ================= */
  function renderList() {
    var all = Store.journeys();
    var list = all.filter(function (j) {
      if (filter.cat && j.category !== filter.cat) return false;
      if (filter.status && j.status !== filter.status) return false;
      if (filter.kw) {
        var kw = filter.kw.toLowerCase();
        var hay = (j.title + ' ' + j.location_name + ' ' +
          DATA.tagNames((j.consensus && j.consensus.tags) || []).join(' ')).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });

    var html = '' +
      '<div class="row row--between mb-md">' +
      '<h1 class="t-h1">旅程</h1>' +
      '<div class="row row--tight">' +
      '<button class="btn btn--ghost btn--sm" id="btnArch">' + UI.icon('archive', 16) + ' 考古复苏</button>' +
      '<button class="btn btn--primary btn--sm" id="btnNew">' + UI.icon('plus', 16) + ' 新建</button>' +
      '</div></div>' +

      '<div class="field"><input class="input" id="kw" placeholder="搜地点 / 标题 / 标签" value="' + UI.esc(filter.kw) + '"></div>' +

      '<div class="filter-bar mb-base">' +
      '<button class="tag tag--click' + (filter.cat === '' ? ' tag--on' : '') + '" data-cat="">全部</button>' +
      DATA.categories.map(function (c) {
        return '<button class="tag tag--click' + (filter.cat === c ? ' tag--on' : '') + '" data-cat="' + c + '">' +
          DATA.categoryEmoji[c] + ' ' + c + '</button>';
      }).join('') +
      '<button class="tag tag--click' + (filter.status === 'draft' ? ' tag--on' : '') + '" data-st="draft">待完善</button>' +
      '</div>';

    if (!list.length) {
      html += '<div class="empty"><div class="empty__icon">🧭</div>' +
        '<div class="empty__title">还没有这一段记忆</div>' +
        '<div class="empty__desc">点右下角的闪电，或新建一次完整的探险记录</div></div>';
    } else {
      html += '<div class="col">' + list.map(journeyCard).join('') + '</div>';
    }

    /* 半成品展览（PRD 4.4 机制二） */
    var drafts = all.filter(function (j) { return j.status === 'draft'; });
    if (drafts.length) {
      html += '<div class="section mt-lg"><div class="section__head">' +
        '<div class="section__title">还有 ' + drafts.length + ' 段记忆等着复苏</div></div>' +
        '<div class="scroll-x">' + drafts.map(function (j) {
          return '<div style="width:200px" class="card card--pad card--hover" data-open="' + j.id + '">' +
            '<div class="t-h3 ellip">' + UI.esc(j.title || j.location_name || '未命名') + '</div>' +
            '<div class="t-cap mt-sm">' + UI.relTime(j.created_at) + ' · 草稿</div>' +
            '<div class="t-2 mt-sm clamp2">' + UI.esc(sideText(j) || '还什么都没写') + '</div>' +
            '</div>';
        }).join('') + '</div></div>';
    }

    return html;
  }

  function sideText(j) {
    var s = j[Store.mySideKey()] || j.a_side || j.b_side;
    return s ? s.text : '';
  }

  function journeyCard(j) {
    var cov = UI.coverHTML(j, 'cover--thumb');
    return '<div class="card card--pad card--hover row" data-open="' + j.id + '" style="cursor:pointer">' +
      cov +
      '<div class="jcard__body">' +
      '<div class="row row--tight"><div class="jcard__title grow ellip">' +
      UI.esc(j.title || j.location_name || '未命名探险') + '</div>' +
      (j.is_important ? '<span title="重要时光">⭐</span>' : '') + '</div>' +
      '<div class="jcard__meta">' +
      '<span>' + UI.dateCN(j.start_date) + '</span>' +
      '<span>' + DATA.categoryEmoji[j.category] + ' ' + j.category + '</span>' +
      (j.location_name ? '<span>' + UI.icon('pin', 13) + ' ' + UI.esc(j.location_name) + '</span>' : '') +
      '</div>' +
      '<div class="row row--tight row--between">' +
      '<div class="jcard__tags">' + UI.statusTag(j) +
      (j.magic_code ? '<span class="tag tag--plain">' + UI.esc(UI.magicText(j)) + '</span>' : '') +
      '</div>' + UI.scorePair(j) + '</div>' +
      '</div></div>';
  }

  function mountList(root) {
    var btnNew = root.querySelector('#btnNew');
    if (btnNew) btnNew.onclick = function () { Views.record.clear(); Views.record.start(); };
    var btnArch = root.querySelector('#btnArch');
    if (btnArch) btnArch.onclick = function () { Views.archaeology.clear(); location.hash = '#/archaeology'; };
    var kw = root.querySelector('#kw');
    if (kw) {
      var timer;
      kw.oninput = function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          filter.kw = kw.value.trim();
          var pos = kw.selectionStart;
          App.render();
          var el = document.querySelector('#kw');
          if (el) { el.focus(); el.setSelectionRange(pos, pos); }
        }, 300);
      };
    }
    root.querySelectorAll('[data-cat]').forEach(function (b) {
      b.onclick = function () { filter.cat = b.dataset.cat; App.render(); };
    });
    root.querySelectorAll('[data-st]').forEach(function (b) {
      b.onclick = function () {
        filter.status = filter.status === b.dataset.st ? '' : b.dataset.st; App.render();
      };
    });
    root.querySelectorAll('[data-open]').forEach(function (el) {
      el.onclick = function () { location.hash = '#/journeys/' + el.dataset.open; };
    });
  }

  /* ================= 详情 ================= */
  function renderDetail(id) {
    var j = Store.getJourney(id);
    if (!j) return '<div class="empty"><div class="empty__title">找不到这段旅程</div></div>';

    var myKey = Store.mySideKey(), oKey = Store.otherSideKey();
    var mine = j[myKey], other = j[oKey];
    var merged = j.status === 'archived' || j.status === 'sealed';
    var canMerge = !!j.a_side && !!j.b_side && !merged;

    var html = '' +
      '<div class="row row--between mb-md">' +
      '<button class="btn btn--text btn--sm" onclick="history.back()">' + UI.icon('left', 16) + ' 返回</button>' +
      '<div class="row row--tight">' +
      '<button class="btn btn--sm btn--secondary" id="btnStar">' +
      (j.is_important ? '⭐ 已标记重要时光' : '☆ 标记重要时光') + '</button>' +
      (canDelete(j) ? '<button class="btn btn--sm btn--text t-danger" id="btnDel">' + UI.icon('trash', 16) + '</button>' : '') +
      '</div></div>' +
      UI.coverHTML(j, 'cover--hero') +
      '<div style="position:relative;z-index:3" class="mt-md mb-md">' +
      '<div class="cover__title" style="color:#31251B">' + UI.esc(j.title || j.location_name || '未命名探险') + '</div>' +
      (j.magic_code ? '<div class="t-2">魔法暗号：' + UI.esc(UI.magicText(j)) + '</div>' : '') +
      '</div>';

    /* 基本信息栏 */
    html += '<div class="info-strip">' +
      '<span>' + UI.icon('calendar', 15) + ' ' + UI.dateCN(j.start_date) + '</span>' +
      (j.location_name ? '<span>' + UI.icon('pin', 15) + ' ' + UI.esc(j.location_name) + '</span>' : '') +
      (j.weather ? '<span>' + (DATA.weatherEmoji[j.weather] || '') + ' ' + j.weather + '</span>' : '') +
      (j.expense ? '<span>人均 ¥' + j.expense + '</span>' : '') +
      '<span>' + DATA.categoryEmoji[j.category] + ' ' + j.category + '</span>' +
      '<span>同行 ' + j.companion_count + ' 人</span>' +
      '<span>' + UI.icon('eye', 15) + ' 回顾 ' + j.review_count + ' 次</span>' +
      '</div>';

    /* 状态提示 */
    if (canMerge) {
      html += '<div class="card card--pad mt-base" style="border:1.5px solid var(--warn)">' +
        '<div class="row row--between">' +
        '<div><div class="t-h3">双视角都已提交</div>' +
        '<div class="t-cap">看看 TA 写了什么，合成你们的共识吧</div></div>' +
        '<button class="btn btn--primary btn--sm" id="btnMerge">去合并</button></div></div>';
    } else if (j.status === 'waiting_for_partner' && !mine) {
      html += '<div class="card card--pad mt-base" style="border:1.5px solid var(--brand)">' +
        '<div class="row row--between">' +
        '<div><div class="t-h3">轮到你了</div>' +
        '<div class="t-cap">TA 已经提交，等你补上另一个视角</div></div>' +
        '<button class="btn btn--primary btn--sm" id="btnFill">我来记录</button></div></div>';
    } else if (j.status === 'waiting_for_partner' && mine && !other) {
      html += '<div class="card card--pad mt-base">' +
        '<div class="t-2">' + UI.icon('clock', 15) + ' 已提交，等 ' +
        UI.esc((Store.partner() || {}).nickname || 'TA') + ' 那一边…</div></div>';
    } else if (j.status === 'draft') {
      html += '<div class="card card--pad mt-base">' +
        '<div class="row row--between"><div><div class="t-h3">草稿待完善</div>' +
        '<div class="t-cap">随时可以补照片、感知词和评分</div></div>' +
        '<button class="btn btn--secondary btn--sm" id="btnFill">继续补完</button></div>' +
        (Awaken.needAwaken(j)
          ? '<hr class="divider">' +
          '<div class="row row--between"><div class="t-2">想不起来当时的事了？让罗盘问你 5 个小题</div>' +
          '<button class="btn btn--ghost btn--sm" id="btnAwaken">💬 帮我回忆</button></div>' : '') +
        '</div>';
    }

    /* 双视角 */
    html += '<div class="mt-lg"><h2 class="section__title mb-md">两个视角</h2>';
    if (merged) {
      html += renderSide(j, 'a_side') + '<div style="height:var(--base)"></div>' + renderSide(j, 'b_side');
    } else {
      html += renderSide(j, myKey);
      html += '<div class="side-locked mt-md">' +
        (other ? '✅ TA 已提交，合并后才能看到' : '⏳ 待 TA 提交') +
        '<div class="t-sm mt-sm">合并前互不偷看，保留各自最真实的感受</div></div>';
    }
    html += '</div>';

    /* 共识 */
    if (j.consensus) {
      html += '<div class="mt-lg"><h2 class="section__title mb-md">我们的共识</h2>' +
        '<div class="card card--pad">' +
        '<div class="narrative narrative--serif">' + UI.esc(j.consensus.text || '（还没写）') + '</div>' +
        ((j.consensus.tags || []).length
          ? '<div class="row row--wrap mt-md">' + j.consensus.tags.map(function (t) {
            return '<span class="tag">' + UI.esc(DATA.tagNames([t])[0]) + '</span>';
          }).join('') + '</div>' : '') +
        '</div></div>';
    }

    /* 二次批注（PRD 3.4.3） */
    html += '<div class="mt-lg"><h2 class="section__title mb-md">二次批注</h2>' +
      '<div class="card card--pad">' +
      (j.annotations && j.annotations.length
        ? j.annotations.map(function (a) {
          return '<div class="annotation"><div class="annotation__text">' + UI.esc(a.text) + '</div>' +
            '<div class="t-sm mt-sm">于 ' + UI.dateCN(a.created_at) + ' 追忆 · ' +
            UI.esc((Store.userById(a.author_id) || {}).nickname || '') + '</div></div>';
        }).join('')
        : '<div class="t-2">还没有批注。一年后回看，感受会不一样。</div>') +
      '<hr class="divider">' +
      '<textarea class="textarea" id="annoInput" placeholder="写下你现在的感受"></textarea>' +
      '<button class="btn btn--secondary btn--sm mt-sm" id="btnAnno">追加批注</button>' +
      '</div></div>';

    /* 备注（PRD 3.5.6） */
    var myNote = (j.notes || []).filter(function (n) { return n.author_id === Store.state.currentUserId; })[0];
    html += '<div class="mt-lg"><h2 class="section__title mb-md">备注</h2>' +
      '<div class="card card--pad">' +
      '<textarea class="textarea" id="noteInput" placeholder="预订电话、停车位置、小贴士…支持纯文本">' +
      UI.esc(myNote ? myNote.content : '') + '</textarea>' +
      '<div class="t-sm mt-sm" id="noteTip">自动保存（300ms 防抖）</div>' +
      '</div></div>';

    html += '<div style="height:var(--xxl)"></div>';
    return html;
  }

  function canDelete(j) {
    return j.status === 'draft' && j.created_by === Store.state.currentUserId;
  }

  function renderSide(j, key) {
    var s = j[key];
    var who = key === 'a_side' ? (Store.userById(Store.state.couple && Store.state.couple.user_a_id) || {}) : (Store.userById(Store.state.couple && Store.state.couple.user_b_id) || {});
    var name = who.nickname || (key === 'a_side' ? 'A 方' : 'B 方');
    if (!s) {
      return '<div class="side-locked">' + name + ' 还没提交</div>';
    }
    var imgs = (s.images || []).slice(0, 6);
    return '<div class="side-card">' +
      '<div class="side-card__head">' +
      '<div class="avatar avatar--sm">' + UI.esc(name.slice(0, 1)) + '</div>' +
      '<div class="grow"><div class="t-h3">' + UI.esc(name) + '</div>' +
      '<div class="t-cap">' + (key === 'a_side' ? 'A 视角' : 'B 视角') + '</div></div>' +
      (s.score ? '<div class="score-pair"><span class="t-num" style="font-size:20px">' + s.score + '</span><span class="t-cap">分</span></div>' : '') +
      '</div>' +
      (imgs.length
        ? '<div class="img-strip mb-md">' + imgs.map(function (u) {
          return '<img src="' + u + '" onclick="window.__zoom && window.__zoom(this.src)">';
        }).join('') + '</div>'
        : '<div class="img-strip mb-md">' + [0, 1, 2].map(function () {
          return UI.coverHTML(j, '');
        }).join('') + '</div>') +
      (s.senses && (s.senses.smell || s.senses.sound || s.senses.temp)
        ? '<div class="row row--wrap mb-md">' +
        (s.senses.smell ? '<span class="tag tag--plain">👃 ' + UI.esc(s.senses.smell) + '</span>' : '') +
        (s.senses.sound ? '<span class="tag tag--plain">👂 ' + UI.esc(s.senses.sound) + '</span>' : '') +
        (s.senses.temp ? '<span class="tag tag--plain">🌡️ ' + UI.esc(s.senses.temp) + '</span>' : '') +
        '</div>' : '') +
      '<div class="narrative narrative--serif">' + UI.esc(s.text || '（这个人什么都没写）') + '</div>' +
      '</div>';
  }

  function mountDetail(root, id) {
    var j = Store.getJourney(id);
    if (!j) return;

    // 回顾次数 +1（PRD 3.4）
    j.review_count = (j.review_count || 0) + 1;
    Store.save();

    var bMerge = root.querySelector('#btnMerge');
    if (bMerge) bMerge.onclick = function () { location.hash = '#/merge/' + id; };

    var bFill = root.querySelector('#btnFill');
    if (bFill) bFill.onclick = function () { Views.record.start(id); };

    var bAw = root.querySelector('#btnAwaken');
    if (bAw) bAw.onclick = function () { Views.awaken.start(id); };

    var bStar = root.querySelector('#btnStar');
    if (bStar) bStar.onclick = function () { openStar(j); };

    var bDel = root.querySelector('#btnDel');
    if (bDel) bDel.onclick = async function () {
      var ok = await UI.confirm({
        title: '删除这条草稿？', text: '草稿由创建者单方删除即可。删除后无法恢复。',
        okText: '删除', danger: true
      });
      if (ok) { Store.deleteJourney(id); UI.toast('已删除'); location.hash = '#/journeys'; }
    };

    var bAnno = root.querySelector('#btnAnno');
    if (bAnno) bAnno.onclick = function () {
      var v = root.querySelector('#annoInput').value.trim();
      if (!v) { UI.toast('写点什么吧'); return; }
      j.annotations = j.annotations || [];
      j.annotations.push({
        id: Store.uid('an'), text: v,
        author_id: Store.state.currentUserId, created_at: Store.nowISO()
      });
      Store.save(); UI.toast('批注已追加', 'ok'); App.render();
    };

    var noteInput = root.querySelector('#noteInput');
    if (noteInput) {
      var t;
      noteInput.oninput = function () {
        clearTimeout(t);
        root.querySelector('#noteTip').textContent = '正在保存…';
        t = setTimeout(function () {
          var v = noteInput.value;
          j.notes = j.notes || [];
          var mine = j.notes.filter(function (n) { return n.author_id === Store.state.currentUserId; })[0];
          if (mine) { mine.content = v; mine.updated_at = Store.nowISO(); }
          else j.notes.push({
            id: Store.uid('nt'), content: v,
            author_id: Store.state.currentUserId, updated_at: Store.nowISO()
          });
          Store.save();
          root.querySelector('#noteTip').textContent = '已保存 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }, 300);
      };
    }
  }

  /* ================= 标记重要时光（PRD 3.5.2 / 3.5.3） ================= */
  function openStar(j) {
    if (j.is_important) {
      UI.confirm({
        title: '取消重要时光标记？', text: '这条会从星光集中移除。',
        okText: '取消标记', danger: true
      }).then(function (ok) {
        if (!ok) return;
        Store.updateJourney(j.id, {
          is_important: false, important_categories: [],
          important_marked_by: null, important_marked_at: null
        });
        UI.toast('已取消'); App.render();
      });
      return;
    }
    var picked = [];
    UI.modal({
      title: '⭐ 标记为重要时光',
      sub: '最多选 3 个分类',
      body: '<div class="row row--wrap" id="icPick">' +
        DATA.importantCategories.map(function (c) {
          return '<button class="tag tag--click" data-ic="' + c.key + '">' + c.icon + ' ' + c.key + '</button>';
        }).join('') + '</div>' +
        '<div class="field mt-base"><label class="field__label">自定义分类（最多 8 字，可留空）</label>' +
        '<input class="input" id="icCustom" maxlength="8" placeholder="例如：求婚那天"></div>',
      footer: '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">标记</button>',
      onMount: function (el, close) {
        el.querySelectorAll('[data-ic]').forEach(function (b) {
          b.onclick = function () {
            if (b.dataset.ic === '自定义') return;
            if (b.classList.contains('tag--on')) {
              b.classList.remove('tag--on');
              picked = picked.filter(function (x) { return x !== b.dataset.ic; });
            } else if (picked.length < 3) {
              b.classList.add('tag--on'); picked.push(b.dataset.ic);
            } else UI.toast('最多 3 个', 'err');
          };
        });
        el.querySelector('[data-act="no"]').onclick = function () { close(); };
        el.querySelector('[data-act="yes"]').onclick = function () {
          var custom = el.querySelector('#icCustom').value.trim();
          if (custom) picked.push(custom);
          Store.updateJourney(j.id, {
            is_important: true, important_categories: picked,
            important_marked_by: Store.state.currentUserId,
            important_marked_at: Store.nowISO()
          });
          close(); UI.toast('已加入星光集 ⭐', 'ok'); App.render();
        };
      }
    });
  }

  /* ================= 合并确认（PRD 3.2.4） ================= */
  function renderMerge(id) {
    var j = Store.getJourney(id);
    if (!j) return '<div class="empty">找不到这段旅程</div>';
    if (!Store.state.couple) return '<div class="empty">请先完成双人绑定</div>';
    var a = Store.userById(Store.state.couple.user_a_id) || {};
    var b = Store.userById(Store.state.couple.user_b_id) || {};
    var confirmed = (j.consensus && j.consensus.confirmed_by) || [];
    var iConfirmed = confirmed.indexOf(Store.state.currentUserId) >= 0;

    var tags = (j.consensus && j.consensus.tags) || [];

    return '' +
      '<div class="row row--between mb-md">' +
      '<button class="btn btn--text btn--sm" onclick="history.back()">' + UI.icon('left', 16) + ' 返回</button>' +
      '<div class="t-cap">合并后双方都可看到全部内容</div></div>' +

      '<h1 class="t-h1 mb-md">合成为「我们的共识」</h1>' +

      '<div class="merge-grid">' +
      '<div>' + renderMergeSide(j, 'a_side', a) + '</div>' +
      '<div class="merge-line"></div>' +
      '<div>' + renderMergeSide(j, 'b_side', b) + '</div>' +
      '</div>' +

      '<div class="card card--pad mt-lg">' +
      '<div class="field"><label class="field__label">魔法暗号</label>' +
      '<div class="t-2">' + (j.magic_code
        ? '<span class="tag">' + UI.esc(UI.magicText(j)) + '</span>'
        : '<span class="t-muted">还没有，可在下方挑一个</span>') + '</div>' +
      '<div class="color-grid mt-sm" id="mColor">' +
      DATA.magicColors.map(function (c) {
        return '<button class="color-dot' + (j.magic_code && j.magic_code.color === c.name ? ' is-on' : '') +
          '" data-c="' + c.name + '" title="' + c.name + '" style="background:' + c.hex + '"></button>';
      }).join('') + '</div>' +
      '<input class="input mt-sm" id="mAdj" placeholder="一个形容词" value="' +
      UI.esc(j.magic_code ? j.magic_code.adjective : '') + '">' +
      '<div class="adj-grid mt-sm" id="mAdjPick">' +
      DATA.adjectives.slice(0, 12).map(function (x) {
        return '<button class="tag tag--click" data-a="' + x + '">' + x + '</button>';
      }).join('') + '</div></div>' +

      '<hr class="divider">' +
      '<div class="field"><label class="field__label">共识文本</label>' +
      '<textarea class="textarea" id="mText" placeholder="把两个人的感受合成一句话">' +
      UI.esc(j.consensus ? j.consensus.text : '') + '</textarea></div>' +

      '<div class="field"><label class="field__label">标签（决定罗盘怎么推荐你们）</label>' +
      '<div class="row row--wrap" id="mTags">' +
      DATA.tags.map(function (t) {
        var on = tags.indexOf(t.id) >= 0;
        return '<button class="tag tag--click' + (on ? ' tag--on' : '') + '" data-t="' + t.id + '">' + t.name + '</button>';
      }).join('') + '</div></div>' +
      '</div>' +

      '<div class="card card--pad mt-base">' +
      '<div class="t-cap mb-sm">确认进度：' +
      [a, b].map(function (u) {
        var ok = confirmed.indexOf(u.id) >= 0;
        return (ok ? '✅ ' : '⏳ ') + UI.esc(u.nickname || '?');
      }).join('　') + '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="btnConfirm" ' + (iConfirmed ? 'disabled' : '') + '>' +
      (iConfirmed ? '已确认，等 TA' : '确认合并') + '</button>' +
      (iConfirmed ? '<div class="t-sm t-center mt-sm">对方确认后自动归档</div>' : '') +
      '</div>' +
      '<div style="height:var(--xxl)"></div>';
  }

  function renderMergeSide(j, key, user) {
    var s = j[key];
    var name = user.nickname || (key === 'a_side' ? 'A 方' : 'B 方');
    if (!s) return '<div class="side-locked">' + UI.esc(name) + ' 还没提交</div>';
    return '<div class="side-card">' +
      '<div class="side-card__head"><div class="avatar avatar--sm">' + UI.esc(name.slice(0, 1)) + '</div>' +
      '<div class="grow"><div class="t-h3">' + UI.esc(name) + '</div>' +
      '<div class="t-cap">' + (j.roles && j.roles.hunter === user.id ? '📷 猎人' : '✍️ 诗人') + '</div></div>' +
      (s.score ? '<div class="t-h3 t-num">' + s.score + '<span class="t-cap"> 分</span></div>' : '') +
      '</div>' +
      ((s.images || []).length ? '<div class="img-strip mb-md">' + s.images.slice(0, 6).map(function (u) {
        return '<img src="' + u + '">';
      }).join('') + '</div>' : '') +
      '<div class="narrative narrative--serif">' + UI.esc(s.text || '（没写）') + '</div>' +
      '</div>';
  }

  function mountMerge(root, id) {
    var j = Store.getJourney(id);
    if (!j) return;
    var pickedTags = ((j.consensus && j.consensus.tags) || []).slice();
    var color = j.magic_code ? j.magic_code.color : null;

    root.querySelectorAll('#mColor [data-c]').forEach(function (b) {
      b.onclick = function () {
        root.querySelectorAll('#mColor [data-c]').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on'); color = b.dataset.c; saveDraft();
      };
    });
    root.querySelectorAll('#mAdjPick [data-a]').forEach(function (b) {
      b.onclick = function () { root.querySelector('#mAdj').value = b.dataset.a; saveDraft(); };
    });
    root.querySelectorAll('#mTags [data-t]').forEach(function (b) {
      b.onclick = function () {
        var i = pickedTags.indexOf(b.dataset.t);
        if (i >= 0) { pickedTags.splice(i, 1); b.classList.remove('tag--on'); }
        else { pickedTags.push(b.dataset.t); b.classList.add('tag--on'); }
        saveDraft();
      };
    });
    root.querySelector('#mAdj').oninput = saveDraft;
    root.querySelector('#mText').oninput = saveDraft;

    function saveDraft() {
      var adj = root.querySelector('#mAdj').value.trim();
      if (color && adj) j.magic_code = { color: color, adjective: adj };
      j.consensus = j.consensus || { text: '', tags: [], confirmed_by: [] };
      j.consensus.text = root.querySelector('#mText').value;
      j.consensus.tags = pickedTags.slice();
      j.updated_at = Store.nowISO();
      Store.save();
    }

    root.querySelector('#btnConfirm').onclick = function () {
      saveDraft();
      j.consensus.confirmed_by = j.consensus.confirmed_by || [];
      if (j.consensus.confirmed_by.indexOf(Store.state.currentUserId) < 0) {
        j.consensus.confirmed_by.push(Store.state.currentUserId);
      }
      if (!j.title) j.title = (j.location_name || '未命名探险');
      var done = Store.tryArchive(j);
      if (done) {
        UI.toast('已归档，这段记忆完整了 🎉', 'ok');
        location.hash = '#/journeys/' + id;
      } else {
        UI.toast('已确认，等 TA 确认后自动归档');
        App.render();
      }
    };
  }

  return {
    renderList: renderList, mountList: mountList,
    renderDetail: renderDetail, mountDetail: mountDetail,
    renderMerge: renderMerge, mountMerge: mountMerge
  };
})();
