/* ============================================================
   探险家的罗盘 · 我的
   PRD 3.1 用户体系与双人绑定 · 6.2 数据主权 · 2.8 黑名单管理
   ============================================================ */
window.Views = window.Views || {};

Views.profile = (function () {

  function render() {
    var me = Store.me(), p = Store.partner(), c = Store.state.couple;

    var html = backupBanner();

    /* 绑定卡片 */
    if (c && c.status === 'active') {
      html += '<div class="bond-card mb-base">' +
        '<div class="row row--center" style="gap:var(--md)">' +
        '<div class="avatar avatar--lg">' + UI.esc(me.nickname.slice(0, 1)) + '</div>' +
        '<div class="t-h2">🤝</div>' +
        '<div class="avatar avatar--lg">' + UI.esc(p ? p.nickname.slice(0, 1) : '?') + '</div>' +
        '</div>' +
        '<div class="t-h2 mt-md">' + UI.esc(me.nickname) + ' & ' + UI.esc(p ? p.nickname : '?') + '</div>' +
        (c.magic_code ? '<div class="t-2 mt-sm">绑定暗号：' + UI.esc(c.magic_code.color + ' · ' + c.magic_code.adjective) + '</div>' : '') +
        '<div class="t-cap mt-sm">绑定于 ' + UI.dateCN(c.bonded_at) + '</div>' +
        '</div>';
    } else {
      html += '<div class="bond-card mb-base">' +
        '<div class="empty__icon">🤝</div>' +
        '<div class="t-h2">还没有绑定搭档</div>' +
        '<div class="t-2 mt-sm">绑定后才能使用双人记录、合并与罗盘推荐</div>' +
        '<button class="btn btn--primary mt-md" id="btnBind">现在绑定</button>' +
        '</div>';
    }

    /* 身份切换 */
    if (c && c.status === 'active') {
      html += '<div class="card card--pad mb-base">' +
        '<div class="t-h3 mb-md">当前视角</div>' +
        '<div class="identity-switch">' +
        identity(c.user_a_id, 'A 方') + identity(c.user_b_id, 'B 方') +
        '</div>' +
        '<div class="t-sm mt-sm">本机模拟双人切换：切到 TA 的视角，就能补上另一半的记录</div>' +
        '</div>';
    }

    /* 统计 */
    var all = Store.journeys();
    html += '<div class="card card--pad mb-base">' +
      '<div class="t-h3 mb-md">我们的数据</div>' +
      '<div class="cal__stat" style="border:none;padding-top:0;flex-wrap:wrap">' +
      '<div>旅程 <b class="t-num">' + all.length + '</b></div>' +
      '<div>已归档 <b class="t-num">' + all.filter(function (j) { return j.status === 'archived'; }).length + '</b></div>' +
      '<div>重要时光 <b class="t-num">' + all.filter(function (j) { return j.is_important; }).length + '</b></div>' +
      '<div>愿望 <b class="t-num">' + (Store.state.wishes || []).length + '</b></div>' +
      '<div>黑名单 <b class="t-num">' + Store.state.blacklist.length + '</b></div>' +
      '</div></div>';

    /* 存储用量（第五轮：文字 + 图库两层的真实占用） */
    html += '<div class="card card--pad mb-base">' +
      '<div class="t-h3 mb-md">存储用量</div>' +
      '<div id="usageBody"><div class="t-sm" style="color:var(--text-3)">统计中…</div></div></div>';

    /* 更多功能（Phase 3） */
    html += '<div class="section__head mt-lg"><div class="section__title">更多功能</div></div>' +
      '<div class="quick-grid mb-base">' +
      more('⭐', '星光集', all.filter(function (j) { return j.is_important; }).length + ' 条', 'starlight') +
      more('✅', '待办', (Store.state.todos || []).filter(function (t) { return !t.is_done; }).length + ' 项', 'todos') +
      more('💊', '时光胶囊', (Store.state.capsules || []).length + ' 颗', 'capsule') +
      more('📊', '年度报告', '看看这一年', 'report') +
      more('🎯', '任务冒险', '派任务 · 打卡 · 存档', 'quest') +
      more('📔', '我的日常', (Store.diariesOf ? Store.diariesOf().length : 0) + ' 条 · 只自己可见', 'diary') +
      '</div>';

    /* 设置项：外部服务 */
    var lc = LLM.cfg(), ws = Weather.settings(), ns = Notify.settings();
    html += '<div class="section__head mt-lg"><div class="section__title">外部服务</div></div>' +
      '<div class="card mb-base">' +
      row('sparkle', 'AI 大模型',
        lc.enabled ? (lc.baseUrl ? '已开启 · ' + (lc.model || '未填模型') : '已开启，但缺端点') : '未开启 · 用本地模板', 'llm') +
      row('cloud', '真实天气',
        ws.auto === false ? '已关闭 · 手动选择' : 'Open-Meteo 自动获取（' + (ws.city || '自动定位') + '）', 'weather') +
      row('msg', '通知提醒',
        !Notify.supported() ? '浏览器不支持'
          : !Notify.secure() ? '需用 localhost / https 打开'
            : Notify.granted() ? (ns.enabled === false ? '已授权，但未开启' : '已开启')
              : '未授权', 'notify') +
      row('download', '安装到桌面 / 主屏幕',
        App.isStandalone() ? '已经安装好了'
          : (App.isWeChat && App.isWeChat()) ? '微信里装不了，点这里看方法'
            : App.canInstall() ? '点这里安装' : '浏览器菜单里选「安装应用」', 'install') +
      '</div>';

    html += '<div class="card mb-base">' +
      row('link', '配对与同步（两台手机）', syncLabel(), 'sync') +
      row('cloud', '备份与同步', '定期提醒 · 可存到指定文件夹 / 网盘同步目录', 'backup') +
      row('book', '导出成故事书（可打印）', '按时间线排成一本回忆录，能翻能打印', 'book') +
      row('book', '我的日常 · 故事书', '把日记排成一本只属于你的册子', 'diarybook') +
      row('download', '导出全部数据（JSON）', '随时导出一份完整存档', 'export') +
      row('upload', '导入数据', '从备份 JSON 恢复 / 换设备互通', 'import') +
      row('eye', '外观主题', themeLabel(), 'theme') +
      row('archive', '黑名单管理', Store.state.blacklist.length + ' 条', 'blacklist') +
      row('settings', '闪电按钮', Store.state.settings.fabEnabled ? '已开启' : '已关闭', 'fab') +
      row('sparkle', '载入演示数据', '重置为一份虚构的示例旅程', 'seed') +
      row('trash', '清空全部数据', '不可恢复，请先导出备份', 'reset') +
      row('broom', '彻底重置（含缓存）', '数据 + 图片库 + 离线包一起清掉', 'hardreset') +
      '</div>';

    /* 版本与更新：让用户一眼确认自己跑的是哪一版，并能手动拉最新版 */
    html += '<div class="setting-row" data-act="update" style="cursor:pointer">' +
      '<span class="setting-row__ico">' + UI.icon('refresh', 20) + '</span>' +
      '<div class="grow"><div class="t-body2">版本与更新</div>' +
      '<div class="t-sm">当前 ' + UI.esc(App.VERSION || 'v1') +
      (App.BUILT ? ' · ' + UI.esc(App.BUILT) : '') + ' · 点这里检查更新</div></div>' +
      UI.icon('right', 16) + '</div>';

    html += '<div class="t-sm t-center">探险家的罗盘 · ' + UI.esc(App.VERSION || 'V3.1') + '（本地版）<br>' +
      '数据全部保存在这台设备的浏览器里，不上传任何服务器</div>' +
      '<div style="height:var(--xl)"></div>';

    return html;
  }

  /* 「更多功能」入口卡片 */
  function more(ico, label, sub, act) {
    return '<button class="quick" data-more="' + act + '">' +
      '<span class="quick__ico" style="font-size:22px">' + ico + '</span>' +
      '<span>' + label + '</span>' +
      '<span class="t-sm" style="color:var(--text-3)">' + UI.esc(sub) + '</span></button>';
  }

  function syncLabel() {
    if (!Sync.supported()) return '需要 https 打开';
    if (!Sync.ready()) return '未配对 · 点这里生成邀请';
    var t = Store.state.meta && Store.state.meta.lastSyncAt;
    return t ? '已配对 · 上次同步 ' + UI.dateCN(t) : '已配对 · 点这里同步';
  }

  function themeLabel() {
    var t = (Store.state.settings && Store.state.settings.theme) || 'auto';
    return t === 'auto' ? '跟随系统' : t === 'dark' ? '深色' : '浅色';
  }

  function identity(uid, tag) {
    var u = Store.userById(uid);
    if (!u) return '';
    var on = Store.state.currentUserId === uid;
    return '<button class="identity' + (on ? ' is-on' : '') + '" data-uid="' + uid + '">' +
      '<div class="avatar avatar--sm">' + UI.esc(u.nickname.slice(0, 1)) + '</div>' +
      '<div class="grow"><div class="t-h3">' + UI.esc(u.nickname) + '</div>' +
      '<div class="t-cap">' + tag + (on ? ' · 当前' : '') + '</div></div></button>';
  }

  function row(ico, title, sub, act) {
    return '<div class="setting-row" data-act="' + act + '" style="cursor:pointer">' +
      '<span class="setting-row__ico">' + UI.icon(ico, 20) + '</span>' +
      '<div class="grow"><div class="t-body2">' + title + '</div>' +
      '<div class="t-sm">' + UI.esc(sub) + '</div></div>' + UI.icon('right', 16) + '</div>';
  }

  function mount(root) {
    var bb = root.querySelector('#btnBind');
    if (bb) bb.onclick = bindWizard;

    var gb = root.querySelector('#btnGoBackup');
    if (gb) gb.onclick = function () { openBackup(); };

    root.querySelectorAll('[data-uid]').forEach(function (b) {
      b.onclick = function () {
        Store.state.currentUserId = b.dataset.uid;
        Store.save();
        UI.toast('已切换到 ' + Store.me().nickname, 'ok');
        App.render();
      };
    });

    root.querySelectorAll('[data-act]').forEach(function (r) {
      r.onclick = function () {
        switch (r.dataset.act) {
              case 'export': doExport(); break;
              case 'import': doImport(); break;
              case 'sync': openSync(); break;
              case 'backup': openBackup(); break;
              case 'book': openBookExport(); break;
              case 'diarybook':
                if (Views.diary && Views.diary.openBook) Views.diary.openBook();
                else UI.toast('日常模块没加载上', 'err');
                break;
          case 'blacklist': showBlacklist(); break;
          case 'fab':
            Store.state.settings.fabEnabled = !Store.state.settings.fabEnabled;
            Store.save(); App.render(); App.syncFab();
            break;
          case 'seed': confirmSeed(); break;
          case 'reset': confirmReset(); break;
          case 'hardreset': confirmHardReset(); break;
          case 'update': doCheckUpdate(); break;
          case 'llm': openLLM(); break;
          case 'weather': openWeather(); break;
          case 'notify': openNotify(); break;
          case 'install': doInstall(); break;
          case 'starlight': location.hash = '#/starlight'; break;
          case 'todos': location.hash = '#/todos'; break;
          case 'capsule': location.hash = '#/capsule'; break;
          case 'report': location.hash = '#/report'; break;
          case 'quest': location.hash = '#/quest'; break;
          case 'diary': location.hash = '#/diary'; break;
          case 'theme': App.cycleTheme(); UI.toast('外观：' + themeLabel()); App.render(); break;
        }
      };
    });

    fillUsage(root);
  }

  /* ---------------- 存储用量卡片（异步填充，避免触发全量重渲染） ---------------- */
  function fmtBytes(b) {
    return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  }
  function fillUsage(root) {
    var body = root.querySelector('#usageBody');
    if (!body) return;
    var u = Store.usageInfo();
    var budget = 5 * 1024 * 1024;          // 展示用的配额预算 ~5MB
    var ratio = Math.min(100, Math.round(u.bytes / budget * 100));
    var warn = ratio > 70
      ? '<div class="t-sm mt-sm" style="color:var(--warn)">占用偏高：建议「导出全部数据」备份后清理，或删掉不用的照片</div>'
      : '<div class="t-sm mt-sm" style="color:var(--text-3)">导出 JSON 自包含全部照片，随时可带走</div>';
    body.innerHTML =
      '<div class="row row--between" style="margin-bottom:6px">' +
      '<span class="t-sm">文本 + 小图（浏览器本地配额 ~5MB）</span>' +
      '<span class="t-sm" style="color:var(--text-3)">' + fmtBytes(u.bytes) + '</span></div>' +
      '<div style="height:6px;border-radius:3px;background:rgba(140,110,80,.18);overflow:hidden">' +
      '<div style="height:100%;width:' + ratio + '%;background:var(--brand,#D9822B)"></div></div>' +
      '<div id="usageIdb" class="row row--between mt-md">' +
      '<span class="t-sm">照片（IndexedDB 图库 · 不占 5MB）</span>' +
      '<span class="t-sm" style="color:var(--text-3)">' + (u.inline + u.big) + ' 张 · 统计中…</span></div>' +
      warn;
    Store.idbUsage().then(function (r) {
      var el = body.querySelector('#usageIdb');
      if (!el) return;
      var total = u.inline + (r.count || 0);
      el.innerHTML =
        '<span class="t-sm">照片（IndexedDB 图库 · 不占 5MB）</span>' +
        '<span class="t-sm" style="color:var(--text-3)">' + total + ' 张 · ' + fmtBytes(r.bytes || 0) + '</span>';
    });
  }

  function doInstall() {
    if (App.isStandalone()) { UI.toast('已经装好了'); return; }

    /* 微信 / QQ / 钉钉等 App 内置浏览器：永远触发不了安装，必须引导「用浏览器打开」 */
    var inApp = (App.inAppBrowser ? App.inAppBrowser() : '');
    if (inApp) {
      var names = { wechat: '微信', qq: 'QQ', dingtalk: '钉钉', alipay: '支付宝', weibo: '微博' };
      var an = names[inApp] || '这个 App';
      UI.modal({
        title: an + '里装不了 😅',
        body: '<div class="t-2">' +
          an + '内置的浏览器<b>不支持</b>「添加到主屏幕」，得先切到手机自带的浏览器：<br><br>' +
          '<b>👉 点右上角「···」→ 选「在浏览器打开」</b><br><br>' +
          '切过去之后，再进「我的 → 安装到桌面 / 主屏幕」，或者直接：<br>' +
          '· <b>安卓</b>：Chrome 右上角 ⋮ → 「安装应用」<br>' +
          '· <b>iPhone</b>：Safari 底部 <b>分享</b> → 「添加到主屏幕」<br><br>' +
          '<span class="t-sm">放心：数据存在手机本地，换浏览器打开不会丢。</span></div>'
      });
      return;
    }

    if (!App.canInstall()) {
      UI.modal({
        title: '怎么安装？',
        body: '<div class="t-2">' +
          '<b>电脑（Chrome / Edge）</b>：地址栏右侧有个「安装」图标，点了就变成桌面应用。<br><br>' +
          '<b>手机 Chrome</b>：右上角菜单 → 「添加到主屏幕」。<br><br>' +
          '<b>iPhone Safari</b>：底部分享按钮 → 「添加到主屏幕」。<br><br>' +
          '<span class="t-sm">注意：安装和离线需要以 http://localhost 或 https 打开（用「启动本地服务.bat」即可）。' +
          '直接双击 index.html 时浏览器不提供这些能力。</span></div>'
      });
      return;
    }
    App.doInstall().then(function (ok) {
      if (ok) UI.toast('安装成功 🎉', 'ok');
      App.render();
    });
  }

  function onInstallReady() { if (App.parse().name === 'profile') App.render(); }

  /* ---------------- AI 大模型设置 ---------------- */
  function openLLM() {
    var c = LLM.cfg();
    var opts = LLM.PRESETS.map(function (p, i) {
      return '<option value="' + i + '"' + (c.baseUrl === p.baseUrl ? ' selected' : '') + '>' + p.name + '</option>';
    }).join('');
    UI.modal({
      title: 'AI 大模型',
      sub: '填 OpenAI 兼容端点即可，DeepSeek / 通义 / 智谱 / Moonshot / 本地 Ollama 都能用',
      wide: true,
      body:
        '<div class="row row--between mb-base">' +
        '<div><div class="t-body2">启用 AI 文案与 AI 出题</div>' +
        '<div class="t-sm">关掉就用本地模板，功能不受影响</div></div>' +
        '<button class="slider-opt' + (c.enabled ? ' is-on' : '') + '" id="llmToggle" style="flex:none;width:64px">' +
        (c.enabled ? '已开启' : '已关闭') + '</button></div>' +

        '<div class="field"><label class="field__label">服务商预设</label>' +
        '<select class="select" id="llmPreset">' + opts + '</select></div>' +

        '<div class="field"><label class="field__label">端点 Base URL</label>' +
        '<input class="input" id="llmBase" placeholder="https://api.deepseek.com/v1" value="' + UI.esc(c.baseUrl || '') + '"></div>' +

        '<div class="field"><label class="field__label">模型名</label>' +
        '<input class="input" id="llmModel" placeholder="deepseek-chat" value="' + UI.esc(c.model || '') + '"></div>' +

        '<div class="field"><label class="field__label">API Key</label>' +
        '<input class="input" id="llmKey" type="password" placeholder="sk-..." value="' + UI.esc(c.apiKey || '') + '">' +
        '<div class="field__hint" style="color:var(--warn)">⚠ 密钥明文存在本机浏览器里，只适合自用。' +
        '在意安全就把端点换成自建代理（one-api / new-api），代码不用改。</div></div>' +

        '<div class="field"><label class="field__label">语音识别模型（可留空）</label>' +
        '<input class="input" id="llmAsr" placeholder="FunAudioLLM/SenseVoiceSmall" value="' + UI.esc(c.asrModel || '') + '">' +
        '<div class="field__hint">「用说的」按钮走的音频转写接口。留空用 whisper-1；' +
        '硅基流动填 <b>FunAudioLLM/SenseVoiceSmall</b>、阿里百炼兼容模式填 <b>paraformer-v2</b>。' +
        '服务商不支持语音也没关系，会自动退回引导你用输入法麦克风。</div></div>' +

        '<div id="llmTestOut" class="t-sm"></div>',
      footer:
        '<button class="btn btn--secondary" id="llmTest">测试连接</button>' +
        '<button class="btn btn--primary" data-act="ok">保存</button>',
      onMount: function (el, close) {
        var preset = el.querySelector('#llmPreset');
        preset.onchange = function () {
          var p = LLM.PRESETS[Number(preset.value)];
          if (!p) return;
          el.querySelector('#llmBase').value = p.baseUrl;
          el.querySelector('#llmModel').value = p.model;
        };
        var t = el.querySelector('#llmToggle');
        t.onclick = function () {
          var on = !t.classList.contains('is-on');
          t.classList.toggle('is-on', on);
          t.textContent = on ? '已开启' : '已关闭';
        };
        el.querySelector('#llmTest').onclick = function () {
          var out = el.querySelector('#llmTestOut');
          out.innerHTML = '连接中…';
          LLM.save({
            enabled: true,
            baseUrl: el.querySelector('#llmBase').value.trim(),
            model: el.querySelector('#llmModel').value.trim(),
            asrModel: el.querySelector('#llmAsr').value.trim(),
            apiKey: el.querySelector('#llmKey').value.trim()
          });
          LLM.test().then(function (r) {
            out.innerHTML = r.ok
              ? '<span style="color:var(--success)">✓ 通了：' + UI.esc(String(r.text).slice(0, 40)) + '</span>'
              : '<span style="color:var(--danger)">✗ ' + UI.esc(r.text) + '</span>';
          });
        };
        el.querySelector('[data-act="ok"]').onclick = function () {
          LLM.save({
            enabled: t.classList.contains('is-on'),
            baseUrl: el.querySelector('#llmBase').value.trim(),
            model: el.querySelector('#llmModel').value.trim(),
            asrModel: el.querySelector('#llmAsr').value.trim(),
            apiKey: el.querySelector('#llmKey').value.trim()
          });
          close(); UI.toast('已保存', 'ok'); App.render();
        };
      }
    });
  }

  /* ---------------- 天气设置 ---------------- */
  function openWeather() {
    var s = Weather.settings();
    var cityOpts = '<option value="auto"' + (!s.city || s.city === 'auto' ? ' selected' : '') + '>自动定位</option>' +
      Weather.CITIES.map(function (c) {
        return '<option value="' + c.name + '"' + (s.city === c.name ? ' selected' : '') + '>' + c.name + '</option>';
      }).join('');
    UI.modal({
      title: '真实天气',
      sub: 'Open-Meteo：免费、无需密钥、允许跨域',
      body:
        '<div class="row row--between mb-base">' +
        '<div><div class="t-body2">自动获取天气</div>' +
        '<div class="t-sm">关掉就回到手动选择</div></div>' +
        '<button class="slider-opt' + (s.auto !== false ? ' is-on' : '') + '" id="wxToggle" style="flex:none;width:64px">' +
        (s.auto !== false ? '已开启' : '已关闭') + '</button></div>' +
        '<div class="field"><label class="field__label">城市（选「自动定位」会向你申请定位权限）</label>' +
        '<select class="select" id="wxCity">' + cityOpts + '</select></div>' +
        '<div id="wxOut" class="t-sm"></div>',
      footer: '<button class="btn btn--secondary" id="wxNow">立即试取</button>' +
        '<button class="btn btn--primary" data-act="ok">保存</button>',
      onMount: function (el, close) {
        var t = el.querySelector('#wxToggle');
        t.onclick = function () {
          var on = !t.classList.contains('is-on');
          t.classList.toggle('is-on', on);
          t.textContent = on ? '已开启' : '已关闭';
        };
        el.querySelector('#wxNow').onclick = function () {
          var out = el.querySelector('#wxOut');
          out.innerHTML = '获取中…';
          Weather.save({ auto: true, city: el.querySelector('#wxCity').value });
          Weather.get(true).then(function (r) {
            out.innerHTML = r
              ? '<span style="color:var(--success)">✓ ' + UI.esc(r.label) + '：' + r.text + ' ' + r.temp + '°C</span>'
              : '<span style="color:var(--danger)">✗ 没取到，检查网络，或改用手动选择</span>';
          });
        };
        el.querySelector('[data-act="ok"]').onclick = function () {
          Weather.save({ auto: t.classList.contains('is-on'), city: el.querySelector('#wxCity').value });
          close(); UI.toast('已保存'); App.render();
        };
      }
    });
  }

  /* ---------------- 通知设置 ---------------- */
  function openNotify() {
    var s = Notify.settings();
    var state = !Notify.supported() ? '浏览器不支持通知'
      : !Notify.secure() ? '当前是 file:// 打开，通知不可用。<br>请用「启动本地服务.bat」以 http://localhost 打开。'
        : Notify.granted() ? '已授权，可以设置提醒了' : '还没授权，点下面按钮申请';
    var items = [
      ['onThisDay', '那年今日 · 每天 08:00'],
      ['hungry', '周末饥饿提醒 · 周五下午'],
      ['awaken', '草稿唤醒 · 每天 20:00']
    ];
    UI.modal({
      title: '通知提醒',
      sub: '诚实说明：没有服务端，提醒只在页面开着时触发',
      body:
        '<div class="card card--pad mb-base" style="background:var(--warn-light)">' +
        '<div class="t-sm" id="ntState">' + state + '</div></div>' +
        '<div class="col mb-md">' + items.map(function (it) {
          var on = s[it[0]] !== false;
          return '<div class="row row--between"><span class="t-body2">' + it[1] + '</span>' +
            '<button class="slider-opt' + (on ? ' is-on' : '') + '" data-nt="' + it[0] +
            '" style="flex:none;width:64px">' + (on ? '开' : '关') + '</button></div>';
        }).join('') + '</div>' +
        '<div class="row row--tight">' +
        '<button class="btn btn--secondary btn--sm" id="ntReq">申请权限</button>' +
        '<button class="btn btn--ghost btn--sm" id="ntDemo">发一条测试</button></div>',
      footer: '<button class="btn btn--primary" data-act="ok">完成</button>',
      onMount: function (el, close) {
        el.querySelectorAll('[data-nt]').forEach(function (b) {
          b.onclick = function () {
            var on = !b.classList.contains('is-on');
            b.classList.toggle('is-on', on);
            b.textContent = on ? '开' : '关';
            var patch = {}; patch[b.dataset.nt] = on;
            Notify.save(patch);
          };
        });
        el.querySelector('#ntReq').onclick = function () {
          Notify.request().then(function (r) {
            if (r.ok) {
              Notify.save({ enabled: true });
              Notify.start();
              el.querySelector('#ntState').innerHTML = '<span style="color:var(--success)">✓ 已授权并开启</span>';
              UI.toast('通知已开启', 'ok');
            } else {
              el.querySelector('#ntState').innerHTML =
                '<span style="color:var(--danger)">✗ ' + UI.esc(r.reason || '被拒绝') + '</span>';
            }
          });
        };
        el.querySelector('#ntDemo').onclick = function () {
          Notify.save({ enabled: true });
          UI.toast(Notify.demo() ? '已发送，看右上角' : '没发出去，先申请权限');
        };
        el.querySelector('[data-act="ok"]').onclick = function () { close(); App.render(); };
      }
    });
  }

  /* ---------------- 绑定向导（PRD 3.1.2） ---------------- */
  function bindWizard() {
    UI.promptSheet({
      title: '建立双人绑定',
      sub: '本机模拟：填两个人的昵称，选一个属于你们的魔法暗号',
      fields: [
        { key: 'a', label: '你的昵称', placeholder: '例如：小鹿' },
        { key: 'b', label: 'TA 的昵称', placeholder: '例如：阿柚' },
        { key: 'color', label: '绑定暗号 · 颜色', type: 'select', value: '琥珀色', options: DATA.magicColors.map(function (c) { return c.name; }) },
        { key: 'adj', label: '绑定暗号 · 形容词', value: '温暖的', placeholder: '例如：温暖的' }
      ],
      okText: '生成绑定码'
    }).then(function (v) {
      if (!v || !v.a || !v.b) return;
      var code = String(Math.floor(100000 + Math.random() * 900000));
      UI.modal({
        title: '绑定码 ' + code,
        sub: '让 TA 输入这 6 位数字确认（本机模拟：点下面的按钮即可）',
        body: '<div class="bond-card"><div class="t-cap">你们的魔法暗号</div>' +
          '<div class="bond-code">' + UI.esc(v.color.slice(0, 1) + v.adj.replace('的', '')) + '</div>' +
          '<div class="t-2">' + UI.esc(v.color + ' · ' + v.adj) + '</div></div>',
        footer: '<button class="btn btn--primary btn--block" data-act="ok">模拟 TA 确认绑定</button>',
        sticky: true,
        onMount: function (el, close) {
          el.querySelector('[data-act="ok"]').onclick = function () {
            Store.bindUsers(v.a, v.b, { color: v.color, adjective: v.adj });
            close();
            UI.toast('绑定成功 🤝', 'ok');
            App.render();
          };
        }
      });
    });
  }

  /* ---------------- 导出 / 导入 ---------------- */
  function doExport() {
    // 先确保大图已从 IndexedDB 还原进内存，导出的 JSON 才是自包含的完整数据
    var finish = function () {
      var txt = Store.exportJSON();
      var blob = new Blob([txt], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '探险家的罗盘_' + Store.fmtYMD(new Date().toISOString()) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      UI.toast('已导出 JSON（含全部照片）', 'ok');
    };
    if (Store.restoreImages) Store.restoreImages().then(finish, finish);
    else finish();
  }

  function doImport() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var obj = JSON.parse(fr.result);
          var data = obj.data || obj;
          if (!data.journeys) throw new Error('格式不对');
          askImportMode(data);
        } catch (e) { UI.toast('这个文件读不出来：' + e.message, 'err'); }
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  /* 选「合并」还是「覆盖」—— 合并才是两人互通的正确姿势 */
  function askImportMode(data) {
    var n = (data.journeys || []).length;
    UI.modal({
      title: '怎么导入这份数据？',
      sub: '这份备份里有 ' + n + ' 段旅程',
      body: '<div class="t-2">' +
        '<b>合并（推荐）</b> —— 把对方记的内容并进来，<b>你自己已有的记录不会丢</b>；' +
        '同一条旅程的 A / B 两侧会自动拼在一起。<br><br>' +
        '<b>覆盖</b> —— 用这份备份<b>替换掉</b>本机全部数据，换新手机 / 恢复备份时用。' +
        '</div>',
      footer:
        '<button class="btn btn--secondary" data-act="replace">覆盖</button>' +
        '<button class="btn btn--primary" data-act="merge">合并</button>',
      onMount: function (el, close) {
        el.querySelector('[data-act="merge"]').onclick = function () {
          close();
          if (Store.importMerge) {
            Store.importMerge(data).then(function (s) {
              UI.toast('合并完成：新增 ' + s.added + ' 段、补全 ' + s.sidesFilled + ' 侧', 'ok');
              App.render();
            });
          } else {
            Store.replaceAll(data); UI.toast('导入成功', 'ok'); App.render();
          }
        };
        el.querySelector('[data-act="replace"]').onclick = function () {
          close();
          if (Store.importReplace) {
            Store.importReplace(data).then(function () {
              UI.toast('已覆盖本机数据', 'ok');
              App.render();
            });
          } else {
            Store.replaceAll(data); UI.toast('导入成功', 'ok'); App.render();
          }
        };
      }
    });
  }

  /* ---------------- 导出成故事书（叙事式，可翻阅 / 可打印） ---------------- */
  function openBookExport() {
    if (!window.BookExport) { UI.toast('故事书模块没加载上', 'err'); return; }
    var cats = ['全部'].concat((DATA.categories || []).slice());
    UI.promptSheet({
      title: '导出成故事书',
      sub: '把记录按时间线排成一本回忆录：双击就能翻，打印即可存成 PDF',
      fields: [
        {
          key: 'format', label: '格式', type: 'select', value: 'HTML（可翻阅 / 打印）',
          options: ['HTML（可翻阅 / 打印）', 'Markdown（贴到笔记 / 公众号）']
        },
        {
          key: 'range', label: '范围', type: 'select', value: '全部',
          options: ['全部', '今年', '仅已完成的（已归档）']
        },
        {
          key: 'category', label: '分类', type: 'select', value: '全部', options: cats
        },
        {
          key: 'cover', label: '封面', type: 'select', value: '经典封面',
          options: ['经典封面', '用最新的一张照片', '用重要时光的照片', '从相册选一张…']
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
      else if (v.range === '仅已完成的（已归档）') range = 'archived';
      var coverMode = 'classic';
      if (v.cover === '用最新的一张照片') coverMode = 'latest';
      else if (v.cover === '用重要时光的照片') coverMode = 'important';
      else if (v.cover === '从相册选一张…') coverMode = 'pick';
      var opts = {
        range: range,
        category: (v.category && v.category !== '全部') ? v.category : 'all',
        cover: coverMode,
        format: v.format === 'Markdown（贴到笔记 / 公众号）' ? 'md' : 'html',
        photos: v.photos !== '不要照片（纯文字，文件小很多）'
      };
      if (coverMode !== 'pick') { BookExport.download(opts); return; }
      // 从相册选一张做封面
      UI.pickImages(false).then(function (files) {
        if (!files || !files.length) { BookExport.download(opts); return; }
        UI.toast('正在处理封面照片…');
        UI.compressImage(files[0], 1200, .72).then(function (url) {
          opts.coverImage = url;
          BookExport.download(opts);
        }).catch(function () { BookExport.download(opts); });
      });
    });
  }

  /* ---------------- 备份与同步（定期提醒 + 指定文件夹 / 网盘同步目录） ---------------- */
  var DAY = 86400000;

  function daysSince(iso) {
    if (!iso) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
  }
  function hasAnyData() {
    var s = Store.state;
    return !!((s.journeys && s.journeys.length) || (s.capsules && s.capsules.length) ||
      (s.wishes && s.wishes.length) || (s.todos && s.todos.length));
  }
  /* 到点该提醒：开了提醒 + 有数据 + 距上次备份 ≥ 周期 + 最近没唠叨过 */
  function backupDue() {
    var b = (Store.state.settings && Store.state.settings.backup) || {};
    if (b.remind === false || !hasAnyData()) return false;
    var iv = Math.max(1, b.intervalDays || 7);
    var dBack = daysSince(Store.state.meta.lastBackupAt);
    var dRem = daysSince(Store.state.meta.lastBackupRemindAt);
    if (dBack !== null && dBack < iv) return false;
    return dRem === null || dRem >= iv;
  }

  function backupBanner() {
    if (!backupDue()) return '';
    var d = daysSince(Store.state.meta.lastBackupAt);
    var txt = d === null ? '还没备份过' : d + ' 天没备份';
    return '<div class="card card--pad mb-base" style="background:#FFF3DC;border:1px solid #E2A64B55">' +
      '<div class="row row--center" style="gap:var(--md)">' +
      '<div style="flex:none;font-size:20px">💾</div>' +
      '<div class="grow"><div class="t-body2"><b>' + txt + '了</b>——数据在这台设备里，定期导出到网盘才不怕丢</div></div>' +
      '<button class="btn btn--primary btn--sm" id="btnGoBackup" style="flex:none">去备份</button>' +
      '</div></div>';
  }

  /* ---------------- 数据同步（两台手机 · 加密信箱） ---------------- */
  function openSync() {
    if (!Sync.supported()) {
      UI.modal({
        title: '需要 https 打开',
        body: '<div class="t-2">配对和同步要用浏览器的加密能力，只有 <b>https</b> 或 ' +
          '<b>localhost</b> 打开时才可用。<br><br>用分享链接（https://…）打开这个 App 就能用了。</div>'
      });
      return;
    }

    /* 没有密钥就先生成一个：它既是房间号也是加密钥匙，生成一次两边就对上了 */
    var c = Sync.cfg();
    if (!c.secret) {
      Sync.saveCfg({ url: c.url || Sync.DEFAULT_URL, secret: Sync.genSecret() });
      c = Sync.cfg();
    }
    var link = Sync.pairLink(c.secret);
    var lastAt = Store.state.meta && Store.state.meta.lastSyncAt;

    UI.modal({
      title: '邀请对方配对',
      sub: '让这台设备和 TA 的手机真正连上',
      wide: true,
      body:
        '<div class="t-body2 mb-md">把这个<b>二维码</b>或<b>链接</b>发给 TA（微信、短信都行）。' +
        'TA 打开就自动完成配对，之后两边点「立即同步」就能互相看到对方的记录。</div>' +

        '<div class="t-center mb-md" id="syQr"></div>' +

        '<div class="row mb-sm" style="gap:8px">' +
        '<input class="input grow" id="syLink" readonly value="' + UI.esc(link) + '">' +
        '<button class="btn btn--secondary btn--sm" id="syCopy" style="flex:none">复制</button>' +
        '</div>' +

        '<div class="t-cap mb-md">🔒 服务器只是一个加密信箱：只存密文，看不到你们的任何内容。' +
        '链接里带着钥匙，别发到公开地方。</div>' +

        '<div class="row row--between mb-sm"><span class="t-body2">上次同步</span>' +
        '<span class="t-sm">' + (lastAt ? UI.dateCN(lastAt) + ' ' +
          new Date(lastAt).toTimeString().slice(0, 5) : '还没同步过') + '</span></div>' +

        '<div id="syOut" class="t-sm"></div>' +

        '<div class="field mt-md"><label class="field__label">同步密钥（对方没法点链接时，念给 TA 填）</label>' +
        '<div class="row" style="gap:8px">' +
        '<input class="input grow" id="sySecret" value="' + UI.esc(c.secret || '') + '">' +
        '<button class="btn btn--secondary btn--sm" id="syGen" style="flex:none">换一个</button>' +
        '</div>' +
        '<div class="field__hint">两台设备必须<b>完全一样</b>。换了密钥等于换房间，需要重新发给 TA。</div></div>' +

        '<div class="field"><label class="field__label">同步服务地址（一般不用改）</label>' +
        '<input class="input" id="syUrl" value="' + UI.esc(c.url || Sync.DEFAULT_URL) + '"></div>',

      footer:
        '<button class="btn btn--secondary" data-act="status">看看 TA 同步了没</button>' +
        '<button class="btn btn--primary" data-act="sync">立即同步</button>',
      onMount: function (el, close) {
        var qrBox = el.querySelector('#syQr');
        if (qrBox) {
          if (window.QR && QR.svg) {
            qrBox.innerHTML = QR.svg(link, 220) +
              '<div class="t-cap mt-sm">让 TA 扫这个码</div>';
          } else {
            qrBox.innerHTML = '<div class="t-cap">二维码组件没加载，把下面的链接发给 TA 也一样</div>';
          }
        }

        el.querySelector('#syCopy').onclick = function () {
          var inp = el.querySelector('#syLink');
          var txt = inp.value;
          var okCopy = function () { UI.toast('链接已复制，发给 TA 吧', 'ok'); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(okCopy, function () { fallback(); });
          } else fallback();
          function fallback() {
            inp.select();
            try { document.execCommand('copy'); okCopy(); }
            catch (e) { UI.toast('复制失败，请手动选中链接', 'err'); }
          }
        };

        var refresh = function () {
          var s = Sync.cfg();
          el.querySelector('#sySecret').value = s.secret || '';
          var l = Sync.pairLink();
          el.querySelector('#syLink').value = l;
          if (qrBox && window.QR && QR.svg) {
            qrBox.innerHTML = QR.svg(l, 220) + '<div class="t-cap mt-sm">让 TA 扫这个码</div>';
          }
        };
        el.querySelector('#syGen').onclick = function () {
          Sync.saveCfg({ url: el.querySelector('#syUrl').value.trim() || Sync.DEFAULT_URL, secret: Sync.genSecret() });
          refresh();
          UI.toast('已换新密钥，记得重新发给 TA');
        };

        var collect = function () {
          return {
            url: el.querySelector('#syUrl').value.trim() || Sync.DEFAULT_URL,
            secret: el.querySelector('#sySecret').value.trim()
          };
        };
        el.querySelector('[data-act="sync"]').onclick = function () {
          var v = collect();
          if (!v.secret) { UI.toast('还缺同步密钥', 'err'); return; }
          Sync.saveCfg(v);
          var out = el.querySelector('#syOut');
          out.innerHTML = '同步中…';
          Sync.syncNow().then(function (r) {
            var msg = r.pulled
              ? '✓ 同步完成：合并了 TA 的内容（新增 ' + (r.stats.added || 0) +
                ' 段、补全 ' + (r.stats.sidesFilled || 0) + ' 侧）'
              : '✓ 已上传你的内容；TA 还没同步过，等 TA 点一次同步就能互相看到';
            out.innerHTML = '<span style="color:var(--success)">' + msg + '</span>';
            close(); App.render();
          }).catch(function (e) {
            out.innerHTML = '<span style="color:var(--danger)">✗ ' + UI.esc(e.message) +
              '<br>检查一下网络，或确认两台设备用的是同一个密钥</span>';
          });
        };
        el.querySelector('[data-act="status"]').onclick = function () {
          Sync.saveCfg(collect());
          var out = el.querySelector('#syOut');
          out.innerHTML = '查询中…';
          Sync.roomStatus().then(function (r) {
            if (!r || !r.ok) throw new Error((r && r.error) || '服务返回异常');
            var mine = Sync.mySide(), theirs = mine === 'a' ? 'b' : 'a';
            var fmt = function (ts) { return ts ? new Date(ts).toLocaleString('zh-CN') : '还没同步过'; };
            out.innerHTML = '<div class="t-sm">你这侧：' + fmt(r[mine]) + '<br>TA 那侧：' + fmt(r[theirs]) + '</div>';
          }).catch(function (e) {
            out.innerHTML = '<span style="color:var(--danger)">✗ ' + UI.esc(e.message) + '</span>';
          });
        };
      }
    });
  }

  function openBackup() {
    var meta = Store.state.meta;
    var b = (Store.state.settings && Store.state.settings.backup) || {};
    meta.lastBackupRemindAt = Store.nowISO();     // 提醒过就不再每天唠叨
    Store.save();
    var d = daysSince(meta.lastBackupAt);
    var stateLine = d === null ? '还没备份过' : d + ' 天前 · ' + UI.dateCN(meta.lastBackupAt);
    var on = b.remind !== false;

    UI.modal({
      title: '备份与同步',
      sub: '数据主权在你手里：本地一份、备份出去一份，谁也锁不住',
      wide: true,
      body:
        '<div class="col" style="gap:var(--md)">' +
        '<div class="card" style="background:var(--bg-2,#F7EFE4);padding:var(--md)">' +
        '<div class="row row--between"><span class="t-body2">上次备份</span><span class="t-2">' + stateLine + '</span></div>' +
        '<div class="row row--between mt-sm"><span class="t-body2">备份位置</span><span class="t-2" id="bkDir">查询中…</span></div>' +
        '</div>' +
        '<div class="row row--between">' +
        '<div class="grow"><div class="t-body2">每 7 天提醒我备份</div>' +
        '<div class="t-sm">到日子「我的」顶部会出现提醒条</div></div>' +
        '<button class="slider-opt' + (on ? ' is-on' : '') + '" id="bkRemind" style="flex:none;width:64px">' +
        (on ? '已开启' : '已关闭') + '</button></div>' +
        '<div class="t-sm" style="color:var(--text-3)">' +
        '💡 <b>电脑端</b>：点「备份到文件夹」把存档写进你指定的硬盘目录（Chrome / Edge 支持）。<br>' +
        '💡 <b>想自动上云</b>：把那个文件夹选成 坚果云 / OneDrive / 微云 的<b>本地同步目录</b>，存进去就自动传了一份到云端。<br>' +
        '📱 <b>手机端</b>：用「下载备份」存成文件，再发到电脑 / 网盘；换设备时用「导入数据」恢复。<br>' +
        '📡 <b>互通方式</b>：A 设备导出 → 发文件给 B 设备 → B 设备导入。同一个存档，两台都能用。</div>' +
        '</div>',
      footer:
        '<button class="btn btn--secondary" data-bk="download">' + UI.icon('download', 16) + ' 下载备份</button>' +
        '<button class="btn btn--primary" data-bk="folder">' + UI.icon('cloud', 16) + ' 备份到文件夹…</button>',
      onMount: function (el, close) {
        var sw = el.querySelector('#bkRemind');
        sw.onclick = function () {
          var cur = (Store.state.settings && Store.state.settings.backup) || {};
          cur.remind = !(cur.remind !== false);
          Store.save();
          sw.classList.toggle('is-on', cur.remind);
          sw.textContent = cur.remind ? '已开启' : '已关闭';
        };
        el.querySelectorAll('[data-bk]').forEach(function (btn) {
          btn.onclick = function () {
            var act = btn.dataset.bk;
            close();
            if (act === 'download') doExport();
            else backupToFolder();
          };
        });
        readDirName().then(function (name) {
          var box = el.querySelector('#bkDir');
          if (box) box.textContent = name || '未设置 → 点「备份到文件夹」';
        });
      }
    });
  }

  function readDirName() {
    if (!window.IDB || !window.IDB.get) return Promise.resolve('');
    return window.IDB.get('backup_dir').then(function (v) {
      return v && v.name ? v.name : '';
    }).catch(function () { return ''; });
  }

  /* 电脑端：弹系统目录选择器，把完整存档写进指定文件夹 */
  function backupToFolder() {
    if (typeof window.showDirectoryPicker !== 'function') {
      UI.toast('需要电脑端 Chrome / Edge（用本地服务或 https 打开）才能选文件夹；手机上请用「下载备份」', 'err');
      return;
    }
    var prep = Store.restoreImages ? Store.restoreImages() : Promise.resolve(0);
    prep.then(function () {
      var txt = Store.exportJSON();
      window.showDirectoryPicker({ mode: 'readwrite' }).then(function (dir) {
        return writeJSONInto(dir, txt).then(function () {
          rememberDir(dir);
          touchBackup();
          UI.toast('已备份到「' + dir.name + '」', 'ok');
        });
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;   // 用户点了取消
        UI.toast('备份没成功：' + (e && e.message || e), 'err');
      });
    });
  }

  function writeJSONInto(dir, txt) {
    var stamp = Store.fmtYMD(new Date().toISOString()).replace(/-/g, '');
    var name = '探险家的罗盘_备份_' + stamp + '.json';
    return dir.getFileHandle(name, { create: true }).then(function (fh) {
      return fh.createWritable().then(function (w) {
        return w.write(txt).then(function () { return w.close(); });
      });
    });
  }

  function rememberDir(dir) {
    if (window.IDB && window.IDB.put) window.IDB.put('backup_dir', dir).catch(function () {});
  }
  function touchBackup() {
    Store.state.meta.lastBackupAt = Store.nowISO();
    Store.state.meta.lastBackupRemindAt = Store.nowISO();
    Store.save();
  }

  /* ---------------- 黑名单（PRD 2.8） ---------------- */
  function showBlacklist() {
    var bl = Store.state.blacklist;
    var body = bl.length
      ? '<div class="col">' + bl.map(function (b) {
        var label = b.type === 'tag' ? DATA.tagNames([b.value])[0] : b.value;
        return '<div class="card card--pad row">' +
          '<span class="tag tag--danger">' + (b.type === 'tag' ? '标签' : '地点') + '</span>' +
          '<div class="grow"><div class="t-body2">' + UI.esc(label) + '</div>' +
          '<div class="t-sm">' + UI.esc(b.reason || '') + '</div></div>' +
          '<button class="btn btn--text btn--mini" data-rm="' + b.id + '">移出</button>' +
          '</div>';
      }).join('') + '</div>'
      : '<div class="empty"><div class="empty__icon">🛡️</div>' +
      '<div class="empty__title">黑名单是空的</div>' +
      '<div class="empty__desc">当某次旅程有人打了 ≤2 分，地点和标签会自动进黑名单</div></div>';

    UI.modal({
      title: '黑名单管理', sub: '罗盘推荐会自动排除这些',
      body: body, wide: true, footer: false,
      onMount: function (el, close) {
        el.querySelectorAll('[data-rm]').forEach(function (b) {
          b.onclick = function () {
            Store.state.blacklist = Store.state.blacklist.filter(function (x) { return x.id !== b.dataset.rm; });
            Store.save(); close(); showBlacklist(); UI.toast('已移出黑名单');
          };
        });
      }
    });
  }

  function confirmSeed() {
    UI.confirm({
      title: '载入演示数据？',
      text: '会清空当前所有旅程和愿望，替换成一份虚构的示例数据（含那年今日、黑名单、重要时光）。',
      okText: '载入', danger: true
    }).then(function (ok) {
      if (!ok) return;
      if (!Store.state.couple) {
        Store.bindUsers('小鹿', '阿柚', { color: '琥珀色', adjective: '温暖的' });
      }
      Seed.build(Store.state.couple);
      Store.state.meta.seeded = true;
      Store.save();
      UI.toast('演示数据已载入', 'ok');
      App.render();
    });
  }

  function confirmReset() {
    UI.confirm({
      title: '清空全部数据？',
      text: '所有旅程、愿望、绑定关系都会被删除，无法恢复。建议先导出备份。',
      okText: '确认清空', danger: true
    }).then(function (ok) {
      if (!ok) { UI.toast('已取消，数据没有变动'); return; }
      Store.reset();
      /* 标记「已经初始化过」——否则下次启动 boot() 看到 users 为空会重新灌演示数据 */
      Store.state.meta.seeded = true;
      Store.save();
      UI.toast('已清空，来填上你们俩的名字', 'ok');
      location.hash = '#/profile';
      App.render();
      /* 空 App 没法用：立刻引导建立真实的双人绑定 */
      setTimeout(function () { bindWizard(); }, 300);
    });
  }

  /* 彻底重置：连浏览器缓存、图片库、离线包一起清掉。
     用于"明明清了却还是旧数据 / 旧界面"的兜底 —— 那必然是缓存住了旧代码。 */
  function confirmHardReset() {
    UI.confirm({
      title: '彻底重置？',
      text: '会删除本机全部数据，并清空浏览器缓存与离线包（相当于重装一次 App）。' +
            '如果你看到的数据和界面一直没变化，用这个最彻底。',
      okText: '彻底重置', danger: true
    }).then(function (ok) {
      if (!ok) return;
      UI.toast('正在清理…');
      if (App.hardReset) App.hardReset();
      else location.reload();
    });
  }

  function doCheckUpdate() {
    if (!App.checkUpdate) { UI.toast('当前是本地文件版，无需更新'); return; }
    UI.toast('正在检查更新…');
    App.checkUpdate().then(function (r) {
      if (r === 'updated') UI.toast('已切换到最新版本', 'ok');
      else if (r === 'latest') UI.toast('已经是最新版 ' + App.VERSION, 'ok');
      else if (r === 'none') UI.toast('未启用离线包，刷新即可', 'ok');
      else UI.toast('检查失败，请确认网络', 'err');
    });
  }

  return { render: render, mount: mount, bindWizard: bindWizard, onInstallReady: onInstallReady };
})();
