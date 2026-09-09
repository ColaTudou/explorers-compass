/* ============================================================
   探险家的罗盘 · 数据考古复苏
   PRD 4.1：读取历史数据（账单 / 相册）自动生成草稿旅程，
   让用户第一天就有东西可以看、可以回顾。
   —— 只取「商户名 + 日期」，不取金额、不取支付方式（PRD 4.1 数据安全）
   ============================================================ */
window.Views = window.Views || {};

Views.archaeology = (function () {

  var _drafts = [];   // 解析出的候选草稿

  /* ================= 页面 ================= */
  function render() {
    if (_drafts.length) return tplPreview();
    return '' +
      '<div class="row row--between mb-md">' +
      '<button class="btn btn--text btn--sm" onclick="history.back()">' + UI.icon('left', 16) + ' 返回</button>' +
      '</div>' +
      '<h1 class="t-h1">🪏 数据考古复苏</h1>' +
      '<p class="t-2 mt-sm mb-base">刚用的时候数据是空的，罗盘算不出东西。把过去半年的痕迹挖出来，' +
      '直接变成一堆草稿，之后慢慢补。</p>' +

      '<div class="card card--pad mb-base" style="background:var(--success-light);border:1px solid #CFE0CB">' +
      '<div class="t-body2">🔒 只读取<strong>商户名称和日期</strong>，不读金额、不读支付方式、不上传原图。' +
      '全部在本机完成，解析结果会先给你过目再写入。</div></div>' +

      '<div class="src-grid mb-base">' +
      '<button class="src" data-src="csv"><span class="src__ico">📄</span><span>账单 CSV</span>' +
      '<span class="t-sm">支付宝 / 微信导出</span></button>' +
      '<button class="src" data-src="text"><span class="src__ico">📋</span><span>粘贴文本</span>' +
      '<span class="t-sm">从 App 里复制</span></button>' +
      '<button class="src" data-src="album"><span class="src__ico">🖼️</span><span>相册批量</span>' +
      '<span class="t-sm">按拍摄日期分组</span></button>' +
      '<button class="src" data-src="table"><span class="src__ico">🧾</span><span>表格 / 网页</span>' +
      '<span class="t-sm">点评 / 小红书等导出</span></button>' +
      '</div>' +

      '<div class="card card--pad">' +
      '<div class="t-h3 mb-md">怎么拿到账单 CSV？</div>' +
      '<ul style="padding-left:18px" class="t-2">' +
      '<li><b>支付宝</b>：我的 → 账单 → 右上角「…」→ 开具交易流水证明 → 用于个人对账 → 下载 CSV</li>' +
      '<li><b>微信</b>：我 → 服务 → 钱包 → 账单 → 常见问题 → 下载账单 → 用于个人对账 → 下载 CSV</li>' +
      '<li>下载的 CSV 通常是压缩包，解压后把 <code>.csv</code> 文件拖进来就行</li>' +
      '</ul>' +
      '<div class="t-h3 mt-md mb-md" style="margin-top:14px">表格 / 网页是干嘛的？</div>' +
      '<ul style="padding-left:18px" class="t-2">' +
      '<li>大众点评 / 小红书 / 美团收藏没有官方导出，但浏览器插件和工具能存成 <b>CSV 或 HTML 表格</b></li>' +
      '<li>直接拖进来，罗盘会自动认「日期、名称、分类」列；<b>金额列只用于定位、不落地</b>（数据安全）</li>' +
      '<li>图片列若是本机内嵌图会带上；外链图片一律跳过（离线优先、不防盗链）</li>' +
      '</ul></div>' +
      '<div style="height:var(--xxl)"></div>';
  }

  /* ================= 候选预览 ================= */
  function tplPreview() {
    var on = _drafts.filter(function (d) { return d._on; }).length;
    return '' +
      '<div class="row row--between mb-md">' +
      '<button class="btn btn--text btn--sm" id="btnBack">' + UI.icon('left', 16) + ' 重选来源</button>' +
      '<button class="btn btn--text btn--sm" id="btnAll">全选/全不选</button></div>' +
      '<h1 class="t-h1">挖到 ' + _drafts.length + ' 段待复苏的记忆</h1>' +
      '<p class="t-2 mt-sm mb-base">勾掉不想要的，标题可以直接改。确认后生成为草稿。</p>' +

      '<div class="col mb-base">' + _drafts.map(function (d, i) {
        return '<div class="preview-row' + (d._on ? '' : ' is-off') + '" data-row="' + i + '">' +
          '<button class="preview-row__chk' + (d._on ? ' is-on' : '') + '" data-chk="' + i + '">' +
          (d._on ? UI.icon('check', 13, 3, '#fff') : '') + '</button>' +
          '<div class="grow">' +
          '<input class="input" style="height:38px;margin-bottom:6px" value="' + UI.esc(d.title) + '" data-title="' + i + '">' +
          '<div class="t-cap">' + UI.dateCN(d.date) + ' · ' + UI.esc(d.category) +
          (d.cover ? ' · 有图' : '') + '</div>' +
          '</div>' +
          (d.cover ? '<img src="' + d.cover + '" style="width:52px;height:52px;object-fit:cover;border-radius:8px">' : '') +
          '</div>';
      }).join('') + '</div>' +

      '<button class="btn btn--primary btn--lg btn--block" id="btnSave">写入 ' + on + ' 条草稿</button>' +
      '<button class="btn btn--text btn--block mt-sm" id="btnCancel">算了，不导入</button>' +
      '<div style="height:var(--xxl)"></div>';
  }

  function mount(root) {
    if (!_drafts.length) {
      root.querySelectorAll('[data-src]').forEach(function (b) {
        b.onclick = function () {
          switch (b.dataset.src) {
            case 'csv': pickCSV(); break;
            case 'text': pasteText(); break;
            case 'album': pickAlbum(); break;
            case 'table': pickTable(); break;
          }
        };
      });
      return;
    }

    root.querySelectorAll('[data-chk]').forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.dataset.chk);
        _drafts[i]._on = !_drafts[i]._on;
        App.render();
      };
    });
    root.querySelectorAll('[data-title]').forEach(function (inp) {
      inp.oninput = function () { _drafts[Number(inp.dataset.title)].title = inp.value; };
    });
    root.querySelector('#btnAll').onclick = function () {
      var allOn = _drafts.every(function (d) { return d._on; });
      _drafts.forEach(function (d) { d._on = !allOn; });
      App.render();
    };
    root.querySelector('#btnBack').onclick = function () { _drafts = []; App.render(); };
    root.querySelector('#btnCancel').onclick = function () { _drafts = []; location.hash = '#/journeys'; };
    root.querySelector('#btnSave').onclick = function () {
      var picked = _drafts.filter(function (d) { return d._on; });
      if (!picked.length) { UI.toast('至少选一条', 'err'); return; }
      picked.forEach(function (d) {
        var j = Store.newJourney({
          title: d.title || '待复苏的记忆',
          category: d.category || '其他',
          location_name: d.title || '',
          start_date: d.date, end_date: d.date,
          status: 'draft',
          source: 'archaeology'
        });
        var side = Store.sideTemplate(Store.state.currentUserId);
        side.images = d.cover ? [d.cover] : [];
        j[Store.mySideKey()] = side;
        if (d.cover) j.cover_image = d.cover;
        Store.addJourney(j);
      });
      _drafts = [];
      UI.toast('写入 ' + picked.length + ' 条草稿，慢慢补完它们', 'ok');
      location.hash = '#/journeys';
    };
  }

  /* ================= 来源一：账单 CSV ================= */
  function pickCSV() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.csv,.txt,text/csv,text/plain';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { fromCSV(String(fr.result)); };
      fr.readAsText(f, 'utf-8');
    };
    inp.click();
  }

  function fromCSV(text) {
    var rows = parseBill(text);
    if (!rows.length) {
      UI.toast('没解析出商户名和日期，换「粘贴文本」试试', 'err');
      return;
    }
    _drafts = rows;
    App.render();
    UI.toast('解析出 ' + rows.length + ' 条', 'ok');
  }

  /* ================= 来源二：粘贴文本 ================= */
  function pasteText() {
    UI.modal({
      title: '粘贴账单文本',
      sub: '从支付宝/微信账单页复制一段，每行大概长这样：2026-08-15 12:30 星巴克',
      body: '<textarea class="textarea" id="ptText" style="min-height:180px" ' +
        'placeholder="2026-08-15 12:30 星巴克咖啡&#10;2026-08-12 19:20 海底捞火锅&#10;2026-08-03 15:00 单向空间书店"></textarea>',
      footer: '<button class="btn btn--secondary" data-act="no">取消</button>' +
        '<button class="btn btn--primary" data-act="yes">解析</button>',
      onMount: function (el, close) {
        el.querySelector('[data-act="no"]').onclick = function () { close(); };
        el.querySelector('[data-act="yes"]').onclick = function () {
          var v = el.querySelector('#ptText').value;
          close();
          var rows = parseBill(v);
          if (!rows.length) { UI.toast('没认出日期和商户名', 'err'); return; }
          _drafts = rows; App.render(); UI.toast('解析出 ' + rows.length + ' 条', 'ok');
        };
      }
    });
  }

  /* ================= 来源三：相册批量 ================= */
  function pickAlbum() {
    UI.pickImages(true).then(function (files) {
      if (!files.length) return;
      UI.toast('读取 ' + files.length + ' 张照片的日期…');
      var groups = {};
      var jobs = files.slice(0, 60).map(function (f) {
        return UI.compressImage(f, 720, .6).then(function (url) {
          var d = new Date(f.lastModified || Date.now());
          var key = d.getFullYear() + '-' + Store.pad(d.getMonth() + 1) + '-' + Store.pad(d.getDate());
          groups[key] = groups[key] || { date: d.toISOString(), covers: [] };
          if (groups[key].covers.length < 3) groups[key].covers.push(url);
        }).catch(function () { });
      });
      Promise.all(jobs).then(function () {
        var rows = Object.keys(groups).sort().reverse().map(function (k) {
          return {
            _on: true, title: '', date: groups[k].date,
            category: '其他', cover: groups[k].covers[0] || '', count: groups[k].covers.length
          };
        });
        rows.forEach(function (r) { r.title = '待复苏的记忆 · ' + UI.dateCN(r.date); });
        if (!rows.length) { UI.toast('没读到照片'); return; }
        _drafts = rows; App.render(); UI.toast('按日期分成 ' + rows.length + ' 组', 'ok');
      });
    });
  }

  /* ================= 来源四：第三方导出的表格 / 网页 =================
     点评 / 小红书 / 美团没有官方导出，但插件和工具常存成 CSV 或 HTML 表格。
     这里做「智能列映射」：自动认 日期 / 名称 / 分类 / 图片 列，
     金额列只用来跳过、绝不落地；认不出来就用启发式猜。 */
  function pickTable() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.csv,.txt,.html,.htm,text/csv,text/html,text/plain';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var kind = /\.html?$/i.test(f.name) ? 'html' : 'csv';
        var rows = parseTable(String(fr.result), kind);
        if (!rows.length) {
          UI.toast('没认出「日期 + 名称」列，试试账单 CSV 或粘贴文本', 'err');
          return;
        }
        _drafts = rows; App.render(); UI.toast('解析出 ' + rows.length + ' 条', 'ok');
      };
      fr.readAsText(f, 'utf-8');
    };
    inp.click();
  }

  var HEAD_DATE = /日期|时间|date|time|消费|交易时间|打卡|收藏时间/;
  var HEAD_TITLE = /商户|商家|交易对方|名称|店名|店铺|标题|内容|地点|位置|备注|描述|收藏|点评|评论|name|title|shop|merchant|store|content|note|text|poi/;
  var HEAD_CAT = /分类|类别|类型|品类|cat|type|tag/;
  var HEAD_IMG = /图片|照片|图像|封面|缩略图|image|photo|pic|img|cover/;

  function csvToRows(text) {
    text = String(text || '').replace(/^\uFEFF/, '');
    var out = [];
    text.split(/\r?\n/).forEach(function (line) {
      var cells = splitRow(line);
      var has = cells.some(function (c) { return (c || '').trim().length > 0; });
      if (has) out.push(cells.map(function (c) { return (c || '').trim(); }));
    });
    return out;
  }

  function htmlToRows(html) {
    html = String(html || '');
    if (typeof DOMParser !== 'undefined') {
      try {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var tables = doc.querySelectorAll('table');
        if (tables.length) {
          var out = [];
          tables[0].querySelectorAll('tr').forEach(function (tr) {
            var cells = [];
            tr.querySelectorAll('th,td').forEach(function (td) {
              cells.push((td.textContent || '').replace(/\s+/g, ' ').trim());
            });
            if (cells.length) out.push(cells);
          });
          return out;
        }
      } catch (e) { /* 落到正则兜底 */ }
    }
    // 兜底：正则抠第一个表格
    var rows = [], m, re = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((m = re.exec(html)) && rows.length < 200) {
      var cells = [], cm = /<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi, mm;
      while ((mm = cm.exec(m[1]))) {
        cells.push(mm[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
      }
      if (cells.length) rows.push(cells);
    }
    return rows;
  }

  /* 在表格前几行里找表头：命中任一列关键词即认为是表头行 */
  function sniffHeader(table) {
    for (var i = 0; i < Math.min(table.length, 6); i++) {
      var row = table[i] || [];
      var hit = 0;
      for (var c = 0; c < row.length; c++) {
        var h = String(row[c] || '').toLowerCase();
        if (HEAD_DATE.test(h) || HEAD_TITLE.test(h) || HEAD_CAT.test(h) || HEAD_IMG.test(h)) hit++;
      }
      if (hit >= 1) return i;
    }
    return -1;
  }

  function mapByHeader(row) {
    var m = { date: -1, title: -1, cat: -1, img: -1 };
    for (var c = 0; c < row.length; c++) {
      var h = String(row[c] || '').toLowerCase();
      if (m.date < 0 && HEAD_DATE.test(h)) m.date = c;
      else if (m.title < 0 && HEAD_TITLE.test(h)) m.title = c;
      else if (m.cat < 0 && HEAD_CAT.test(h)) m.cat = c;
      else if (m.img < 0 && HEAD_IMG.test(h)) m.img = c;
    }
    return m;
  }

  function parseDateCell(cell) {
    if (!cell) return null;
    var m = String(cell).match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
    var y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else {
      m = String(cell).match(/(?:^|[^\d])(\d{1,2})[-/月.](\d{1,2})(?:日)?(?![-\d年])/);
      if (!m) return null;
      y = new Date().getFullYear(); mo = +m[1]; d = +m[2];
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return new Date(y, mo - 1, d, 19, 30).toISOString();
  }

  function mapCat(cell) {
    var s = String(cell || '').trim();
    var list = ['美食', '探店', '旅行', '手工', '演出', '运动', '居家', '其他'];
    for (var i = 0; i < list.length; i++) {
      if (s.indexOf(list[i]) >= 0) return list[i];
    }
    return '';
  }

  var MONEY_CELL = /^[¥￥]?\d[\d.,\s¥￥元+-]*$/;

  /* 一行 → 一条草稿；认不出日期或名称就返回 null */
  function buildDraft(cells, map) {
    function cv(i) { return (i >= 0 && cells[i] !== undefined) ? String(cells[i]).trim() : ''; }
    var date = null, title = '', catCell = '', cover = '', dateIdx = -1;

    if (map) {
      date = parseDateCell(cv(map.date));
      title = cv(map.title);
      catCell = cv(map.cat);
      cover = cv(map.img);
    } else {
      cells.forEach(function (c, i) {
        if (dateIdx >= 0) return;
        var pd = parseDateCell(String(c || '').trim());
        if (pd) { date = pd; dateIdx = i; }
      });
      cells.forEach(function (c, i) {
        var s = String(c || '').trim();
        if (!s || i === dateIdx) return;
        if (MONEY_CELL.test(s)) return;               // 金额不落地
        if (/^\d{6,}$/.test(s)) return;               // 单号/编号
        if (/^(收入|支出|不计收支|交易成功|支付成功|成功|关闭|已退款)$/.test(s)) return;
        if (s.length > 30) return;
        if (NOISE.some(function (n) { return s.indexOf(n) >= 0; })) return;
        if (s.length > title.length) title = s;       // 最长非数字文本当名称
      });
      cells.forEach(function (c) {
        var s = String(c || '').trim();
        if (s.indexOf('data:image') === 0) cover = cover || s;   // 只收内嵌图，外链跳过
      });
    }

    if (!date || !title) return null;
    title = title.replace(/^[\s"']+|[\s"']+$/g, '').replace(/\s+/g, ' ').trim();
    if (title.length < 2 || title.length > 24) return null;
    if (NOISE.some(function (n) { return title.indexOf(n) >= 0; })) return null;
    // 只收本机内嵌图（data:），外链一律跳过：离线优先、不防盗链、不上传原图
    if (cover && cover.indexOf('data:image') !== 0) cover = '';
    if (cover && cover.length > 400000) cover = '';   // 异常大图丢弃
    var category = mapCat(catCell) || guessCategory(title);
    return { title: title, date: date, category: category, cover: cover };
  }

  /* 解析第三方表格：csv / html 两种；返回可直接进预览的草稿数组（纯函数） */
  function parseTable(text, kind) {
    var table = kind === 'html' ? htmlToRows(text) : csvToRows(text);
    if (!table || !table.length) return [];
    var hdr = sniffHeader(table);
    var map = hdr >= 0 ? mapByHeader(table[hdr]) : null;
    var start = hdr >= 0 ? hdr + 1 : 0;
    var out = [], seen = {};
    for (var i = start; i < table.length; i++) {
      var row = table[i];
      if (!row || !row.length) continue;
      if (row.every(function (c) { return !(c || '').trim(); })) continue;
      var d = buildDraft(row, map);
      if (!d) continue;
      var k = d.date.slice(0, 10) + '|' + d.title;
      if (seen[k]) continue;
      seen[k] = 1;
      out.push({ _on: true, title: d.title, date: d.date, category: d.category, cover: d.cover });
    }
    return out.sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 80);
  }

  /* ================= CSV / 文本解析核心 =================
     目标：从一行里抓出「日期」+「商户名」，丢掉金额等一切其它信息 */
  var NOISE = ['余额宝', '花呗', '信用卡还款', '转账', '红包', '充值', '提现', '理财',
    '基金', '保险', '代付', '退款', '工资', '收款', '转账红包', '零钱', '存入', '支取',
    '冻结', '解冻', '服务费', '手续费', '利息', '分润', '信用'];

  function parseBill(text) {
    text = text.replace(/^\uFEFF/, '');          // 去 BOM
    var lines = text.split(/\r?\n/);
    var out = [], seen = {};

    // 表头：找「交易对方 / 商户」所在列，后续按列取值
    var headerIdx = -1;
    for (var i = 0; i < Math.min(lines.length, 12); i++) {
      var cells = splitRow(lines[i]);
      for (var c = 0; c < cells.length; c++) {
        if (/交易对方|商户|商家|对方|收款方|付款方/.test(cells[c])) { headerIdx = c; break; }
      }
      if (headerIdx >= 0) { lines = lines.slice(i + 1); break; }
    }

    var DATE_RE = /(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/;

    lines.forEach(function (line) {
      if (!line || line.length < 6) return;

      var m = line.match(DATE_RE);
      if (!m) return;
      var iso = new Date(+m[1], +m[2] - 1, +m[3], 19, 30).toISOString();

      var merchant = '';
      if (headerIdx >= 0) {
        var cells = splitRow(line);
        merchant = (cells[headerIdx] || '').trim();
      }
      if (!merchant || merchant.length > 30 || DATE_RE.test(merchant)) {
        merchant = guessMerchant(line, m[0]);
      }
      merchant = merchant.replace(/^[\s"']+|[\s"']+$/g, '').trim();
      if (merchant.length < 2 || merchant.length > 24) return;
      if (NOISE.some(function (n) { return merchant.indexOf(n) >= 0; })) return;

      var key = iso.slice(0, 10) + '|' + merchant;
      if (seen[key]) return;
      seen[key] = 1;

      out.push({
        _on: true,
        title: merchant,
        date: iso,
        category: guessCategory(merchant),
        cover: ''
      });
    });

    return out.sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 80);
  }

  function splitRow(line) {
    // 支持逗号 / 制表符分隔，处理引号包裹的字段
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { q = !q; continue; }
      if (!q && (ch === ',' || ch === '\t')) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }

  function guessMerchant(line, datePart) {
    var rest = line.split(datePart).join(' ');
    var cells = splitRow(rest).map(function (s) { return s.trim(); });
    var best = '';
    cells.forEach(function (c) {
      if (!c) return;
      if (/^[\d.,\s¥￥元+-]+$/.test(c)) return;         // 纯数字（金额）
      if (/^(收入|支出|不计收支|交易成功|支付成功|已全额退款|关闭|成功)$/.test(c)) return;
      if (/^\d{6,}$/.test(c)) return;                    // 单号
      if (c.length > best.length && c.length <= 24) best = c;
    });
    return best;
  }

  function guessCategory(name) {
    if (/咖啡|茶|奶茶|甜品|烘焙|蛋糕|冰淇淋/.test(name)) return '美食';
    if (/火锅|烧烤|餐厅|饭店|面|饭|小吃|料理|日料|烤肉|川菜|粤菜|酒楼|食堂|美食|食品|餐饮/.test(name)) return '美食';
    if (/书店|超市|商场|便利店|购物|服饰|衣|鞋|超市|市场|商城|百货/.test(name)) return '探店';
    if (/酒店|民宿|旅行|航空|机票|火车|高铁|景区|旅游|客栈/.test(name)) return '旅行';
    if (/电影|影院|剧院|演出|剧场|KTV|演唱会|展览|博物馆|话剧/.test(name)) return '演出';
    if (/健身|游泳|瑜伽|球|运动|攀岩|滑雪|骑行/.test(name)) return '运动';
    return '其他';
  }

  function clear() { _drafts = []; }

  return {
    render: render, mount: mount, clear: clear,
    parseBill: parseBill, guessCategory: guessCategory, splitRow: splitRow,
    parseTable: parseTable, csvToRows: csvToRows, htmlToRows: htmlToRows
  };
})();
