/* ============================================================
   探险家的罗盘 · LLM 适配层
   设计原则：
   1) 只认 OpenAI 兼容的 /chat/completions 协议 —— 因此 DeepSeek、通义千问、
      智谱、Moonshot、OpenAI、本地 Ollama / 自建 one-api 代理全都能用。
   2) 渐进增强：界面永远先用本地模板秒出，LLM 结果到了再替换。
   3) 绝不失败外泄：任何异常都静默回退，不影响主流程。
   4) 密钥存 localStorage（自用场景）。想更安全就把端点换成自建代理，代码不用改。
   ============================================================ */
window.LLM = (function () {

  var PRESETS = [
    { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
    { name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
    { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
    { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { name: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
    { name: '自建代理 / 其他', baseUrl: '', model: '' }
  ];

  function cfg() {
    return (Store.state.settings && Store.state.settings.llm) || {};
  }
  function isOn() {
    var c = cfg();
    return !!(c.enabled && c.baseUrl && c.apiKey);
  }
  function save(patch) {
    Store.state.settings.llm = Object.assign(cfg(), patch);
    Store.save();
  }

  function endpoint(base) {
    base = String(base || '').trim().replace(/\/+$/, '');
    if (/\/chat\/completions$/.test(base)) return base;
    return base + '/chat/completions';
  }

  function chat(messages, opts) {
    opts = opts || {};
    var c = cfg();
    if (!isOn()) return Promise.reject(new Error('LLM 未配置'));

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, c.timeout || 15000);

    return fetch(endpoint(c.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + c.apiKey
      },
      body: JSON.stringify({
        model: c.model || 'deepseek-chat',
        messages: messages,
        temperature: opts.temperature === undefined ? 0.85 : opts.temperature,
        max_tokens: opts.maxTokens || 400
      }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) {
        return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 100)); });
      }
      return r.json();
    }).then(function (j) {
      var m = j && j.choices && j.choices[0] && j.choices[0].message;
      var content = m && (m.content || (m.reasoning_content ? '' : ''));
      if (!content) throw new Error('返回内容为空');
      return String(content).trim();
    }).catch(function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  /* 从带 ```json 包裹或前后废话的文本里抠出 JSON */
  function parseJSON(text) {
    var s = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
    var i = s.indexOf('['), j = s.indexOf('{');
    var start = -1;
    if (i >= 0 && (j < 0 || i < j)) start = i; else start = j;
    if (start < 0) throw new Error('返回里没有 JSON');
    var end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
    if (end <= start) throw new Error('JSON 不完整');
    return JSON.parse(s.slice(start, end + 1));
  }

  /* ---------------- 用法一：罗盘推荐文案 ---------------- */
  function writeCopy(ctx) {
    if (!isOn()) return Promise.reject(new Error('off'));
    var p = '你是「探险家的罗盘」的文案生成器，用户是一对伴侣，正在决定今天去哪儿。\n' +
      '已知：\n' +
      '- 当前天气：' + ctx.weather + '，时段：' + ctx.slot + '\n' +
      '- 最推荐的老地方：' + ctx.top1 + '（' + ctx.top1cat + '，上次均分 ' + ctx.top1score + '）\n' +
      (ctx.cross ? '- 跨界组合：' + ctx.crossA + '（' + ctx.crossAcat + '）+ ' + ctx.crossB + '（' + ctx.crossBcat + '）\n' : '') +
      (ctx.brave ? '- 想尝试新分类："' + ctx.brave + '"（' + ctx.bravecat + '）\n' : '') +
      (ctx.festival ? '- 当前正逢' + ctx.festival + '，可以应个景\n' : '') +
      '\n要求：\n' +
      '1. 中文，整体 50 字以内，一句话说完，不要分点。\n' +
      '2. 语气亲昵，像熟悉的朋友在轻声建议，用「你们」，禁止用「您」。\n' +
      '3. 必须提到上面的具体店名/地点。\n' +
      '4. 另外给一句 12 字以内的天气关怀语。\n' +
      '5. 只输出严格 JSON，不要任何解释：{"copy":"...","care":"..."}';
    return chat([{ role: 'user', content: p }], { temperature: 0.9, maxTokens: 300 })
      .then(parseJSON)
      .then(function (o) {
        if (!o || !o.copy) throw new Error('字段缺失');
        return { copy: String(o.copy).slice(0, 120), care: String(o.care || '').slice(0, 40) };
      });
  }

  /* ---------------- 用法二：AI 陪聊唤醒出题 ---------------- */
  function questions(ctx) {
    if (!isOn()) return Promise.reject(new Error('off'));
    var p = '用户有一段落灰的回忆待补完，只留下了这些线索：\n' +
      '- 地点：' + (ctx.location || '不清楚') + '\n' +
      '- 分类：' + (ctx.category || '其他') + '\n' +
      '- 日期：' + (ctx.date || '不清楚') + '\n' +
      '\n请生成 5 个极简问题，引导 TA 回忆当天的细节。规则：\n' +
      '1. 每个问题必须能用「是/否」、一个选项、或一两个词回答，不要开放式长问句。\n' +
      '2. 三种题型：\n' +
      '   - bool：{q,type:"bool",yes:"答案为是时用于回忆录的陈述句",no:"答案为否时的陈述句"}\n' +
      '   - choice：{q,type:"choice",choices:["A","B"],tpls:["选A时的陈述句","选B时的陈述句"]}\n' +
      '   - word：{q,type:"word",prefix:"前缀",suffix:"后缀"}，答案为词时拼成「前缀+答案+后缀」\n' +
      '3. 陈述句用第三人称、过去式，简洁，10-18 字，不要主语"你"。例："那是第一次来这家"、"还排了会儿队"。\n' +
      '4. 至少 2 个 bool、1 个 word。\n' +
      '5. 只输出严格 JSON 数组（长度 5），不要任何解释。';
    return chat([{ role: 'user', content: p }], { temperature: 0.8, maxTokens: 700 })
      .then(parseJSON)
      .then(normalizeQuestions);
  }

  function normalizeQuestions(arr) {
    var out = [];
    (arr || []).forEach(function (x) {
      if (out.length >= 5) return;
      var q = String(x.q || x.question || '').trim();
      if (!q) return;
      // 题型必须显式给出，格式不对的题目直接丢掉，宁可少一道也不要出坏题
      if (['bool', 'choice', 'word'].indexOf(x.type) < 0) return;
      var type = x.type;
      var o = { q: q, type: type, tpl: {} };
      if (type === 'bool') {
        o.tpl.yes = String(x.yes || '是的').trim();
        o.tpl.no = String(x.no || '不是').trim();
      } else if (type === 'choice') {
        o.tpl.choices = (x.choices || []).map(String).slice(0, 4);
        if (o.tpl.choices.length < 2) return;
        var tpls = (x.tpls || []).map(String);
        o.tpl.tpls = o.tpl.choices.map(function (c, i) { return tpls[i] || c; });
      } else {
        var pre = String(x.prefix || ''), suf = String(x.suffix || '');
        o.tpl.w = function (pre, suf) {
          return function (v) { return pre + v + suf; };
        }(pre, suf);
      }
      out.push(o);
    });
    if (out.length < 3) throw new Error('题目数量不足');
    return out;
  }

  /* ---------------- 用法三：把答案合成回忆录 ---------------- */
  function composeText(ctx, pairs) {
    if (!isOn()) return Promise.reject(new Error('off'));
    var body = pairs.map(function (p) { return '问：' + p.q + '\n答：' + p.a; }).join('\n');
    var p = '把下面这段问答整理成一段通顺的第三人称回忆录。\n' +
      '背景：' + (ctx.date || '') + '，地点：' + (ctx.location || '某处') + '，分类：' + (ctx.category || '') + '\n\n' +
      body + '\n\n' +
      '要求：中文，60-120 字，一气呵成的一段话，第三人称（"两个人"/"他们"/不出现"我"），' +
      '语气温柔克制、带点画面感，不要罗列问答，不要编造上面没提到的信息。' +
      '直接输出正文，不要标题、不要引号、不要解释。';
    return chat([{ role: 'user', content: p }], { temperature: 0.8, maxTokens: 300 })
      .then(function (t) {
        return String(t).replace(/^["'「]|["'」]$/g, '').trim().slice(0, 300);
      });
  }

  /* ---------------- 连通性自检 ---------------- */
  function test() {
    return chat([{ role: 'user', content: '回复两个字：你好' }], { maxTokens: 20 })
      .then(function (t) { return { ok: true, text: t }; })
      .catch(function (e) { return { ok: false, text: e.message }; });
  }

  return {
    PRESETS: PRESETS,
    cfg: cfg, isOn: isOn, save: save, chat: chat,
    writeCopy: writeCopy, questions: questions, composeText: composeText,
    normalizeQuestions: normalizeQuestions, parseJSON: parseJSON, test: test
  };
})();
