/* ============================================================
   探险家的罗盘 · 叙事式导出（故事书）
   把数据导出成「一本能翻、能打印」的 HTML 回忆录：
   自包含（CSS + 照片都内嵌），双击即看，浏览器打印即可存 PDF。
   与 JSON 导出的分工：JSON 是备份/迁移用，故事书是给人读的。
   ============================================================ */
window.BookExport = (function () {

  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[&<>"']/g, function (c) { return MAP[c]; });
  }
  function cnDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function nameOf(uid) {
    var u = Store.userById(uid);
    return u ? u.nickname : '';
  }

  /* ---------- 筛数据 ---------- */
  function collect(opts) {
    var list = Store.journeys().slice();
    if (opts.range === 'year') {
      var y = new Date().getFullYear();
      list = list.filter(function (j) { return new Date(j.start_date).getFullYear() === y; });
    } else if (opts.range === 'archived') {
      list = list.filter(function (j) { return j.status === 'archived' || j.status === 'sealed'; });
    }
    // 按指定 id 筛（任务冒险归档后单独出书用）
    if (opts.ids && opts.ids.length) {
      list = list.filter(function (j) { return opts.ids.indexOf(j.id) >= 0; });
    }
    // 按分类筛（'all' / 空 = 不限）
    if (opts.category && opts.category !== 'all') {
      list = list.filter(function (j) { return (j.category || '其他') === opts.category; });
    }
    // 故事书按时间正序：从最早走到最近
    return list.sort(function (a, b) { return new Date(a.start_date) - new Date(b.start_date); });
  }

  function photosOf(j, withPhotos) {
    if (!withPhotos) return [];
    var out = [], seen = {};
    function add(u) {
      if (typeof u !== 'string' || u.indexOf('data:') !== 0) return;
      if (seen[u]) return;
      seen[u] = 1; out.push(u);
    }
    add(j.cover_image);
    [j.a_side, j.b_side].forEach(function (s) {
      (s && s.images ? s.images : []).forEach(add);
    });
    return out.slice(0, 9);
  }

  function roleOf(j, uid) {
    if (!j.roles) return '';
    if (j.roles.hunter === uid) return '猎人';
    if (j.roles.poet === uid) return '诗人';
    return '';
  }

  /* 封面照片：'latest' 取最新一条有图的，'important' 取重要时光里第一张 */
  function autoCover(mode, list) {
    if (mode !== 'latest' && mode !== 'important') return '';
    var pool = mode === 'important'
      ? list.filter(function (j) { return j.is_important; })
      : list.slice().reverse();
    for (var i = 0; i < pool.length; i++) {
      var ps = photosOf(pool[i], true);
      if (ps.length) return ps[0];
    }
    return '';
  }
  function scoreOf(j) {
    var v = [];
    if (j.a_side && j.a_side.score) v.push(j.a_side.score);
    if (j.b_side && j.b_side.score) v.push(j.b_side.score);
    if (!v.length) return null;
    return (v.reduce(function (a, b) { return a + b; }, 0) / v.length).toFixed(1);
  }

  /* ---------- 单条旅程 ---------- */
  function journeyHTML(j, withPhotos) {
    var photos = photosOf(j, withPhotos);
    var sc = scoreOf(j);
    var status = j.status === 'archived' || j.status === 'sealed' ? ''
      : '<span class="chip chip--todo">' + (j.status === 'draft' ? '草稿' : '待对方提交') + '</span>';

    var h = '<article class="j' + (j.is_important ? ' is-important' : '') + '">';
    h += '<div class="j__head"><div class="j__date">' + esc(cnDate(j.start_date)) + '</div>';
    h += '<h3 class="j__title">' + esc(j.title || '未命名的一次出门') +
      (j.is_important ? ' <span class="star">★</span>' : '') + '</h3>';
    h += '<div class="j__meta">' +
      '<span>' + esc((DATA.categoryEmoji && DATA.categoryEmoji[j.category]) || '') + ' ' + esc(j.category || '') + '</span>' +
      (j.location_name ? '<span>📍 ' + esc(j.location_name) + '</span>' : '') +
      (sc ? '<span>★ ' + esc(sc) + '</span>' : '') +
      status + '</div></div>';

    if (photos.length) {
      h += '<div class="j__photos photos--' + (photos.length === 1 ? '1' : photos.length <= 4 ? '2' : '3') + '">' +
        photos.map(function (p) { return '<img src="' + p + '" alt="">'; }).join('') + '</div>';
    }

    var sides = [j.a_side, j.b_side].filter(Boolean);
    if (sides.length) {
      h += '<div class="j__sides">' + sides.map(function (s) {
        var who = nameOf(s.user_id) || 'TA';
        var role = roleOf(j, s.user_id);
        var body = [];
        if (s.text) body.push('<p>' + esc(s.text).replace(/\n/g, '<br>') + '</p>');
        if (s.senses) {
          var sn = [];
          if (s.senses.smell) sn.push('闻起来 ' + esc(s.senses.smell));
          if (s.senses.sound) sn.push('听起来 ' + esc(s.senses.sound));
          if (s.senses.temp) sn.push('摸起来 ' + esc(s.senses.temp));
          if (sn.length) body.push('<p class="senses">' + sn.join(' · ') + '</p>');
        }
        return '<div class="side"><div class="side__who">' + esc(who) +
          (role ? '<span class="chip">' + esc(role) + '</span>' : '') +
          (s.score ? '<span class="chip">★ ' + esc(s.score) + '</span>' : '') + '</div>' +
          (body.length ? body.join('') : '<p class="muted">（这一侧还没写）</p>') + '</div>';
      }).join('') + '</div>';
    }

    var tags = DATA.tagNames ? DATA.tagNames((j.consensus && j.consensus.tags) || []) : [];
    if (tags.length) {
      h += '<div class="j__tags">' + tags.map(function (t) { return '<span class="tag"># ' + esc(t) + '</span>'; }).join('') + '</div>';
    }
    (j.notes || []).forEach(function (n) {
      if (!n || !n.content) return;
      h += '<div class="j__note"><b>备注' + (nameOf(n.author_id) ? '（' + esc(nameOf(n.author_id)) + '）' : '') +
        '：</b>' + esc(n.content).replace(/\n/g, '<br>') + '</div>';
    });
    (j.annotations || []).forEach(function (a) {
      if (!a || !a.text) return;
      h += '<div class="j__anno"><b>' + esc(cnDate(a.created_at)) + ' 追忆' +
        (nameOf(a.author_id) ? ' · ' + esc(nameOf(a.author_id)) : '') + '：</b>' +
        esc(a.text).replace(/\n/g, '<br>') + '</div>';
    });

    h += '</article>';
    return h;
  }

  /* ---------- 整本 ---------- */
  function build(opts) {
    opts = opts || {};
    var withPhotos = opts.photos !== false;
    var list = collect(opts);
    var c = Store.state.couple;
    var me = Store.me(), pa = Store.partner();
    var title = (me && pa) ? (me.nickname + ' & ' + pa.nickname) : '我们的';
    var photoCount = 0, catCount = {};
    list.forEach(function (j) {
      photoCount += photosOf(j, withPhotos).length;
      catCount[j.category || '其他'] = (catCount[j.category || '其他'] || 0) + 1;
    });
    var years = [];
    list.forEach(function (j) {
      var y = new Date(j.start_date).getFullYear();
      if (years.indexOf(y) < 0) years.push(y);
    });
    years.sort();
    var rangeText = opts.range === 'year' ? (new Date().getFullYear() + ' 年')
      : opts.range === 'archived' ? '已完成的部分' : '全部记录';
    if (opts.category && opts.category !== 'all') rangeText += ' · 只看「' + opts.category + '」';

    var h = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>探险家的罗盘 · ' + esc(title) + '的故事书</title><style>' + css() + '</style></head><body>';

    /* 封面 */
    var coverImg = opts.coverImage || autoCover(opts.cover, list);
    var coverBody = '<div class="cover__mark">🧭</div>' +
      '<h1>探险家的罗盘</h1>' +
      '<div class="cover__sub">' + esc(title) + ' · 的故事书</div>' +
      '<div class="cover__meta">' + esc(rangeText) + ' · 共 ' + list.length + ' 段记忆' +
      (withPhotos ? ' · ' + photoCount + ' 张照片' : '') + '</div>' +
      '<div class="cover__date">生成于 ' + esc(cnDate(new Date().toISOString())) + '</div>' +
      '<div class="cover__tip no-print">点右上角「打印」→ 另存为 PDF，就是一本能翻的册子</div>';
    h += coverImg
      ? '<header class="cover cover--photo">' +
        '<div class="cover__photo"><img src="' + coverImg + '" alt=""></div>' +
        '<div class="cover__body">' + coverBody + '</div></header>'
      : '<header class="cover">' + coverBody + '</header>';

    /* 目录 */
    if (years.length > 1) {
      h += '<nav class="toc no-break"><h2>目录</h2><ul>' +
        years.map(function (y) {
          var n = list.filter(function (j) { return new Date(j.start_date).getFullYear() === y; }).length;
          return '<li><a href="#y' + y + '">' + y + ' 年<span>' + n + ' 段</span></a></li>';
        }).join('') + '</ul></nav>';
    }

    /* 正文：按年分组 */
    years.forEach(function (y) {
      var ys = list.filter(function (j) { return new Date(j.start_date).getFullYear() === y; });
      h += '<section class="year"><h2 id="y' + y + '">' + y + ' 年</h2>';
      ys.forEach(function (j) { h += journeyHTML(j, withPhotos); });
      h += '</section>';
    });

    if (!list.length) {
      h += '<section class="empty"><p>这个范围里还没有记录。换个范围试试？</p></section>';
    }

    /* 想一起做的事（愿望清单） */
    var wishes = (Store.state.wishes || []).slice().sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });
    var wishDone = wishes.filter(function (w) { return w.is_done; }).length;
    if (wishes.length) {
      h += '<section class="wishes no-break"><h2>想一起做的事' +
        '<span class="cnt">' + wishDone + ' / ' + wishes.length + ' 已完成</span></h2>' +
        '<div class="wish-list">' + wishes.map(function (w) {
          return '<div class="wish' + (w.is_done ? ' is-done' : '') + '">' +
            '<span class="wish__box">' + (w.is_done ? '✓' : '') + '</span>' +
            '<div class="grow"><div class="wish__t">' + esc(w.title) + '</div>' +
            (w.description ? '<div class="wish__d">' + esc(w.description) + '</div>' : '') +
            '<div class="wish__m">' + (w.category ? esc(w.category) + ' · ' : '') +
            (w.is_done
              ? '已完成' + (w.completed_at ? ' · ' + esc(cnDate(w.completed_at)) : '')
              : '还没做') +
            '</div></div></div>';
        }).join('') + '</div></section>';
    }

    /* 尾声：我们一起走过的路 */
    var cats = Object.keys(catCount).sort(function (a, b) { return catCount[b] - catCount[a]; });
    var importantCount = list.filter(function (j) { return j.is_important; }).length;
    h += '<section class="stats no-break"><h2>我们一起走过的路</h2>' +
      '<div class="kpis">' +
      '<div class="kpi"><b>' + list.length + '</b><span>段记忆</span></div>' +
      (withPhotos ? '<div class="kpi"><b>' + photoCount + '</b><span>张照片</span></div>' : '') +
      '<div class="kpi"><b>' + importantCount + '</b><span>次重要时光</span></div>' +
      '<div class="kpi"><b>' + wishDone + '</b><span>个愿望实现</span></div>' +
      '</div>' +
      (cats.length ? '<div class="bars">' +
        cats.map(function (k) {
          var pct = Math.round(catCount[k] / list.length * 100);
          return '<div class="bar"><span class="bar__k">' + esc((DATA.categoryEmoji && DATA.categoryEmoji[k]) || '') + ' ' + esc(k) + '</span>' +
            '<span class="bar__t"><i style="width:' + pct + '%"></i></span>' +
            '<span class="bar__v">' + catCount[k] + '</span></div>';
        }).join('') + '</div>' : '') +
      '<p class="muted">共 ' + list.length + ' 段记忆' + (withPhotos ? '、' + photoCount + ' 张照片' : '') +
      '。数据只存在你们自己的设备里，这一页是给回忆用的。</p></section>';

    h += '</body></html>';
    return h;
  }

  /* ---------- Markdown 版（贴到公众号 / 笔记软件） ---------- */
  function buildMarkdown(opts) {
    opts = opts || {};
    var withPhotos = opts.photos !== false;
    var list = collect(opts);
    var me = Store.me(), pa = Store.partner();
    var title = (me && pa) ? (me.nickname + ' & ' + pa.nickname) : '我们的';
    var photoCount = 0, catCount = {};
    list.forEach(function (j) {
      photoCount += photosOf(j, withPhotos).length;
      catCount[j.category || '其他'] = (catCount[j.category || '其他'] || 0) + 1;
    });
    var rangeText = opts.range === 'year' ? (new Date().getFullYear() + ' 年')
      : opts.range === 'archived' ? '已完成的部分' : '全部记录';
    if (opts.category && opts.category !== 'all') rangeText += ' · 只看「' + opts.category + '」';

    var m = '# 探险家的罗盘 · ' + title + ' 的故事书\n\n';
    m += '> ' + rangeText + ' · 共 ' + list.length + ' 段记忆' +
      (withPhotos ? ' · ' + photoCount + ' 张照片' : '') + '\n';
    m += '> 生成于 ' + cnDate(new Date().toISOString()) + '\n\n---\n\n';

    var years = [];
    list.forEach(function (j) {
      var y = new Date(j.start_date).getFullYear();
      if (years.indexOf(y) < 0) years.push(y);
    });
    years.sort();

    years.forEach(function (y) {
      m += '## ' + y + ' 年\n\n';
      list.filter(function (j) { return new Date(j.start_date).getFullYear() === y; })
        .forEach(function (j) {
          var sc = scoreOf(j);
          m += '### ' + cnDate(j.start_date) + ' · ' + (j.title || '未命名的一次出门') +
            (j.is_important ? ' ⭐' : '') + '\n\n';
          var meta = [];
          meta.push((DATA.categoryEmoji && DATA.categoryEmoji[j.category] || '') + ' ' + (j.category || ''));
          if (j.location_name) meta.push('📍 ' + j.location_name);
          if (sc) meta.push('★ ' + sc);
          if (j.status !== 'archived' && j.status !== 'sealed') {
            meta.push(j.status === 'draft' ? '草稿' : '待对方提交');
          }
          m += '`' + meta.join(' · ') + '`\n\n';

          if (withPhotos) {
            photosOf(j, true).forEach(function (p) { m += '![](' + p + ')\n\n'; });
          }

          [j.a_side, j.b_side].filter(Boolean).forEach(function (s) {
            var who = nameOf(s.user_id) || 'TA';
            var role = roleOf(j, s.user_id);
            m += '> **' + who + (role ? '（' + role + '）' : '') +
              (s.score ? ' ★' + s.score : '') + '**\n> \n';
            if (s.text) m += '> ' + String(s.text).replace(/\n/g, '\n> ') + '\n';
            if (s.senses) {
              var sn = [];
              if (s.senses.smell) sn.push('闻起来 ' + s.senses.smell);
              if (s.senses.sound) sn.push('听起来 ' + s.senses.sound);
              if (s.senses.temp) sn.push('摸起来 ' + s.senses.temp);
              if (sn.length) m += '> ' + sn.join(' · ') + '\n';
            }
            m += '\n';
          });

          var tags = DATA.tagNames ? DATA.tagNames((j.consensus && j.consensus.tags) || []) : [];
          if (tags.length) m += tags.map(function (t) { return '`# ' + t + '`'; }).join(' ') + '\n\n';
          (j.notes || []).forEach(function (n) {
            if (!n || !n.content) return;
            m += '**备注' + (nameOf(n.author_id) ? '（' + nameOf(n.author_id) + '）' : '') + '**：' +
              String(n.content).replace(/\n/g, ' ') + '\n\n';
          });
          (j.annotations || []).forEach(function (a) {
            if (!a || !a.text) return;
            m += '**' + cnDate(a.created_at) + ' 追忆' +
              (nameOf(a.author_id) ? ' · ' + nameOf(a.author_id) : '') + '**：' +
              String(a.text).replace(/\n/g, ' ') + '\n\n';
          });
          m += '---\n\n';
        });
    });

    if (!list.length) m += '_这个范围里还没有记录。_\n\n';

    var wishes = (Store.state.wishes || []).slice().sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });
    if (wishes.length) {
      var wishDone = wishes.filter(function (w) { return w.is_done; }).length;
      m += '## 想一起做的事（' + wishDone + ' / ' + wishes.length + ' 已完成）\n\n';
      wishes.forEach(function (w) {
        m += '- [' + (w.is_done ? 'x' : ' ') + '] ' + w.title +
          (w.category ? ' · ' + w.category : '') +
          (w.is_done && w.completed_at ? ' · 已完成于 ' + cnDate(w.completed_at) : '') +
          (w.description ? '\n  - ' + w.description : '') + '\n';
      });
      m += '\n';
    }

    var cats = Object.keys(catCount).sort(function (a, b) { return catCount[b] - catCount[a]; });
    m += '## 我们一起走过的路\n\n';
    m += '| 段记忆 | 照片 | 重要时光 | 愿望实现 |\n| --- | --- | --- | --- |\n';
    m += '| ' + list.length + ' | ' + photoCount + ' | ' +
      list.filter(function (j) { return j.is_important; }).length + ' | ' +
      wishes.filter(function (w) { return w.is_done; }).length + ' |\n\n';
    cats.forEach(function (k) {
      var bar = new Array(Math.max(1, Math.round(catCount[k] / list.length * 20)) + 1).join('▮');
      m += '- ' + (DATA.categoryEmoji && DATA.categoryEmoji[k] || '') + ' ' + k + ' ' + bar + ' ' + catCount[k] + '\n';
    });
    m += '\n> 数据只存在你们自己的设备里，这份文档是给回忆用的。\n';
    return m;
  }

  function download(opts) {
    opts = opts || {};
    var isMd = opts.format === 'md';
    var finish = function () {
      var text = isMd ? buildMarkdown(opts) : build(opts);
      var type = isMd ? 'text/markdown;charset=utf-8' : 'text/html;charset=utf-8';
      var ext = isMd ? '.md' : '.html';
      var blob = new Blob([text], { type: type });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '探险家的罗盘_故事书_' + Store.fmtYMD(new Date().toISOString()) + ext;
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      UI.toast(isMd ? 'Markdown 已导出，可直接贴进笔记软件' : '故事书已导出，双击就能看', 'ok');
    };
    if (Store.restoreImages) Store.restoreImages().then(finish, finish);
    else finish();
  }

  /* ---------- 打印友好的样式 ---------- */
  function css() {
    return '*{box-sizing:border-box}' +
      'body{margin:0;background:#FBF3E7;color:#31251B;font-family:"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.75}' +
      '.cover{min-height:88vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;background:#F3DFCF}' +
      '.cover__mark{font-size:56px}.cover h1{margin:16px 0 8px;font-size:32px;letter-spacing:2px}' +
      '.cover__sub{font-size:18px;color:#7A6656}.cover__meta{margin-top:14px;font-size:14px;color:#7A6656}' +
      '.cover__date{margin-top:6px;font-size:12px;color:#9A8878}.cover__tip{margin-top:24px;font-size:12px;color:#9A8878}' +
      '.cover--photo{display:block;min-height:auto;padding:0}' +
      '.cover__photo{height:56vh;min-height:220px;overflow:hidden;background:#EFE3D4}' +
      '.cover__photo img{width:100%;height:100%;object-fit:cover;display:block}' +
      '.cover__body{padding:34px 24px 44px;text-align:center}' +
      'main,.toc,.year,.stats{max-width:760px;margin:0 auto;padding:0 20px}' +
      '.toc{padding-top:36px}.toc h2,.year h2,.stats h2{font-size:20px;border-bottom:1px solid #E0D2C2;padding-bottom:8px;margin:32px 0 16px}' +
      '.toc ul{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:10px}' +
      '.toc a{display:block;padding:8px 14px;border:1px solid #E0D2C2;border-radius:20px;text-decoration:none;color:#31251B;font-size:14px}' +
      '.toc a span{color:#9A8878;margin-left:6px;font-size:12px}' +
      '.j{background:#fff;border-radius:14px;padding:18px 20px;margin:0 0 18px;box-shadow:0 1px 3px rgba(60,45,30,.08)}' +
      '.j.is-important{border-left:4px solid #D9822B}' +
      '.j__date{font-size:12px;color:#9A8878;letter-spacing:1px}' +
      '.j__title{margin:4px 0 8px;font-size:19px}.star{color:#D9822B}' +
      '.j__meta{display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:#7A6656}' +
      '.chip{display:inline-block;margin-left:6px;padding:1px 8px;border:1px solid #E0D2C2;border-radius:10px;font-size:11px;color:#7A6656}' +
      '.chip--todo{background:#FFF3DC;border-color:#E2A64B;color:#8A5A1A}' +
      '.j__photos{display:grid;gap:6px;margin:14px 0}' +
      '.photos--1{grid-template-columns:1fr}.photos--2{grid-template-columns:repeat(2,1fr)}.photos--3{grid-template-columns:repeat(3,1fr)}' +
      '.j__photos img{width:100%;height:200px;object-fit:cover;border-radius:10px;display:block}' +
      '.photos--1 img{height:320px}' +
      '.j__sides{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px}' +
      '.side{flex:1 1 280px;background:#FBF6EE;border-radius:10px;padding:12px 14px}' +
      '.side__who{font-size:13px;font-weight:600;margin-bottom:6px}' +
      '.side p{margin:6px 0;font-size:14px;white-space:normal}' +
      '.senses{color:#7A6656;font-size:13px}' +
      '.muted{color:#9A8878}.j__tags{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}' +
      '.tag{background:#F3DFCF;border-radius:10px;padding:2px 10px;font-size:12px;color:#7A6656}' +
      '.j__note,.j__anno{margin-top:10px;font-size:13px;color:#5A4636;background:#FFF9F1;border-left:3px solid #E8D3B8;padding:8px 12px;border-radius:6px}' +
      '.wishes h2 .cnt{font-size:13px;font-weight:400;color:#9A8878;margin-left:10px}' +
      '.wish-list{display:flex;flex-direction:column;gap:10px}' +
      '.wish{display:flex;gap:10px;align-items:flex-start;background:#fff;border-radius:10px;padding:12px 14px}' +
      '.wish__box{flex:none;width:20px;height:20px;border:1.5px solid #D9C7B2;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;line-height:1}' +
      '.wish.is-done .wish__box{background:#1D9E75;border-color:#1D9E75}' +
      '.wish.is-done .wish__t{color:#9A8878;text-decoration:line-through}' +
      '.wish__t{font-size:15px;font-weight:500}' +
      '.wish__d{font-size:13px;color:#7A6656;margin-top:2px}' +
      '.wish__m{font-size:12px;color:#9A8878;margin-top:4px}' +
      '.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 18px}' +
      '.kpi{flex:1 1 90px;background:#fff;border-radius:10px;padding:12px;text-align:center}' +
      '.kpi b{display:block;font-size:22px;color:#D9822B;line-height:1.3}' +
      '.kpi span{font-size:12px;color:#7A6656}' +
      '.bars{margin:8px 0 16px}.bar{display:flex;align-items:center;gap:10px;margin:8px 0;font-size:13px}' +
      '.bar__k{width:88px;color:#7A6656}.bar__t{flex:1;height:8px;background:#EFE3D4;border-radius:4px;overflow:hidden}' +
      '.bar__t i{display:block;height:100%;background:#D9822B}.bar__v{width:28px;text-align:right;color:#7A6656}' +
      '.empty{text-align:center;padding:60px 20px;color:#9A8878}' +
      '@media print{body{background:#fff}.no-print{display:none}' +
      '@page{size:A4;margin:14mm}' +
      '.cover{page-break-after:always;min-height:auto;padding:80px 0}' +
      '.cover--photo{padding:0}' +
      '.cover__photo{height:78mm;min-height:0}' +
      '.j,.no-break,.wish,.kpis{page-break-inside:avoid}' +
      '.year h2{page-break-after:avoid}' +
      '.j__photos img{height:150px}.photos--1 img{height:220px}}';
  }

  return { build: build, buildMarkdown: buildMarkdown, download: download, collect: collect, photosOf: photosOf, autoCover: autoCover };
})();
