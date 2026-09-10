/* ============================================================
   探险家的罗盘 · 演示种子数据
   目的：首次打开即有内容可看、可回顾、可推荐（PRD 4.1 数据考古复苏的精神）
   ⚠ 全部为本地虚构示例，可在「我的 → 清空数据」移除
   ============================================================ */
window.Seed = (function () {

  function daysAgo(n) {
    var d = new Date();
    d.setHours(19, 30, 0, 0);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }
  function yearsAgo(n) {
    var d = new Date();
    d.setHours(19, 30, 0, 0);
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString();
  }
  function T() { return DATA.tagIdOf.apply(null, arguments); }

  /* 占位图：按分类配色 + emoji + 地点，SVG 内嵌 dataURL（<1KB，自动内联不进 IDB）。
     让演示数据 12 条旅程都有照片，故事书导出来立刻有图可看。 */
  function cover(cat, loc) {
    var pal = { '美食': ['#A78B71','#5D4E37'], '探店': ['#3A506B','#1B2845'],
                '居家': ['#88A096','#5C7A6E'], '旅行': ['#5F7F67','#34463A'],
                '手工': ['#A38AB5','#6B567A'], '演出': ['#D08FA0','#8E5A6D'],
                '运动': ['#7A9B7E','#4E6B52'], '其他': ['#8A857C','#5C5853'] };
    var c = pal[cat] || pal['其他'];
    var e = (DATA.categoryEmoji && DATA.categoryEmoji[cat]) || '✨';
    var esc = function (s) { return String(s).replace(/[<>&]/g, function (m) { return ({'<':'&lt;','>':'&gt;','&':'&amp;'})[m]; }); };
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="800" height="600" fill="url(#g)"/>' +
      '<circle cx="640" cy="480" r="180" fill="rgba(255,255,255,0.12)"/>' +
      '<circle cx="180" cy="120" r="80" fill="rgba(255,255,255,0.08)"/>' +
      '<text x="400" y="320" text-anchor="middle" font-size="160" opacity="0.9">' + e + '</text>' +
      '<text x="400" y="470" text-anchor="middle" font-size="32" fill="rgba(255,255,255,0.92)" font-family="serif">' + esc(loc) + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }

  var RAW = [
    {
      d: 1, cat: '美食', loc: '巷子口的意面小馆', weather: '晴', expense: 88,
      magic: { color: '琥珀色', adjective: '微醺的' },
      a: { text: '老板现擀的面条，酱汁收得刚好。窗边那桌一直有人等，我们运气不错。', score: 5 },
      b: { text: '一进门是蒜香和黄油味，背景音是意大利语老歌，店里有点闷但很舒服。', score: 5 },
      cons: '第一次吃到会想再来第二次的意面。', tags: ['约会', '$$', '低强度', '室内', '晚餐', '浪漫'],
      important: true, ic: ['纪念日']
    },
    {
      d: 4, cat: '探店', loc: '旧仓库改造的独立书店', weather: '阴', expense: 45,
      magic: { color: '午夜蓝', adjective: '静谧的' },
      a: { text: '二楼有整面墙的旧画册，翻到一本八十年代的旅行摄影集。', score: 4 },
      b: { text: '旧纸张的味道，只有翻页声和远处咖啡机的嗡嗡，午后有点凉。', score: 4 },
      cons: '下雨天最好的避难所。', tags: ['独处', '$', '低强度', '雨天友好', '下午茶', '安静']
    },
    {
      d: 9, cat: '美食', loc: '夜市口的炭火烧烤', weather: '晴', expense: 120,
      magic: { color: '胭脂红', adjective: '热烈的' },
      a: { text: '人声鼎沸，烤茄子是全场最佳。吃完手上全是炭味。', score: 4 },
      b: { text: '油烟味、炭火噼啪声，夏夜的风是热的。', score: 5 },
      cons: '吵得说不出话，但很开心。', tags: ['聚会', '$$', '低强度', '室外', '夜宵', '热闹']
    },
    {
      d: 17, cat: '居家', loc: '家里的阳台', weather: '雨', expense: 30,
      magic: { color: '天青色', adjective: '潮湿的' },
      a: { text: '下雨出不去，索性把阳台收拾了，种了两盆薄荷。', score: 3 },
      b: { text: '泥土味和雨声，湿气很重，但两个人窝着挺好。', score: 4 },
      cons: '什么都没做的一天，也算探险。', tags: ['独处', '$', '低强度', '室内', '全天', '治愈']
    },
    {
      d: 31, cat: '旅行', loc: '莫干山民宿', weather: '晴', expense: 480,
      magic: { color: '墨绿色', adjective: '清冽的' },
      a: { text: '清晨的雾还没散，竹林里全是鸟叫。走了一万多步。', score: 5 },
      b: { text: '竹叶和露水的味道，溪水声一直在耳边，山里比市区低六度。', score: 5 },
      cons: '值得再来一次的地方。', tags: ['约会', '$$$$', '高强度', '室外', '全天', '治愈'],
      important: true, ic: ['旅行']
    },
    {
      d: 58, cat: '演出', loc: '小剧场的话剧', weather: '阴', expense: 260,
      magic: { color: '紫罗兰', adjective: '怅然的' },
      a: { text: '只有四十个座位，演员下场时从我们面前走过。', score: 4 },
      b: { text: '木地板的味道，全场安静得能听见呼吸，空调有点冷。', score: 4 },
      cons: '散场后一路都在聊结局。', tags: ['约会', '$$$', '低强度', '室内', '夜间', '浪漫']
    },
    {
      d: 96, cat: '美食', loc: '商场里的连锁火锅', weather: '雨', expense: 150,
      magic: { color: '焦糖色', adjective: '闷热的' },
      a: { text: '排队一小时，锅底一般，服务也慢。不会再来了。', score: 2 },
      b: { text: '全是火锅味，吵得头疼，越吃越热。', score: 2 },
      cons: '踩雷，已自动进黑名单。', tags: ['聚会', '$$', '低强度', '室内', '晚餐', '热闹']
    },
    {
      d: 180, cat: '其他', loc: '城市边缘的旧铁路', weather: '风', expense: 0,
      magic: { color: '象牙白', adjective: '慢悠悠的' },
      a: { text: '铁轨全长满了草，走到底是一座废弃的站台。', score: 4 },
      b: { text: '铁锈味和风声，日头很晒，但走得不想回头。', score: 4 },
      cons: '免费的探险，意外的好。', tags: ['独处', '$', '中强度', '室外', '下午茶', '怀旧']
    },
    {
      d: 365, cat: '美食', loc: '法喜寺旁的素面馆', weather: '晴', expense: 60,
      magic: { color: '鹅黄色', adjective: '清甜的' },
      a: { text: '爬完山下来吃的那碗面，汤头清得能看见碗底。', score: 5 },
      b: { text: '香火味混着面汤的热气，寺里的钟声敲了三下，午后暖洋洋。', score: 5 },
      cons: '那年今日，还记得这碗面吗？', tags: ['约会', '$$', '中强度', '室外', '午餐', '治愈'],
      important: true, ic: ['第一次']
    },
    {
      d: 730, cat: '探店', loc: '初见时的那家咖啡馆', weather: '阴', expense: 70,
      magic: { color: '樱花粉', adjective: '微醺的' },
      a: { text: '第一次见面时的位置还在，靠窗第二个桌子。', score: 5 },
      b: { text: '拿铁的香气，店里放着爵士，手心一直是热的。', score: 5 },
      cons: '所有故事的起点。', tags: ['约会', '$$', '低强度', '室内', '下午茶', '浪漫'],
      important: true, ic: ['第一次', '纪念日']
    }
  ];

  function build(couple) {
    var ua = couple.user_a_id, ub = couple.user_b_id;
    var list = [];

    RAW.forEach(function (r, i) {
      var start = r.d >= 365 ? yearsAgo(r.d >= 700 ? 2 : 1) : daysAgo(r.d);
      var j = Store.newJourney({
        couple_id: couple.id,
        title: '',
        category: r.cat,
        start_date: start,
        end_date: start,
        location_name: r.loc,
        weather: r.weather,
        expense: r.expense,
        companion_count: 2,
        status: 'archived',
        magic_code: r.magic,
        roles: { hunter: ua, poet: ub },
        a_side: {
          user_id: ua, text: r.a.text, images: [], score: r.a.score,
          senses: { smell: '', sound: '', temp: '' }
        },
        b_side: {
          user_id: ub, text: r.b.text, images: [], score: r.b.score,
          senses: {
            smell: r.b.text.slice(0, 12), sound: r.b.text.slice(12, 24), temp: ''
          }
        },
        consensus: {
          text: r.cons,
          tags: r.tags.map(function (n) { return DATA.tagIdOf[n]; }).filter(Boolean),
          confirmed_by: [ua, ub]
        },
        is_important: !!r.important,
        important_categories: r.ic || [],
        important_marked_by: r.important ? ua : null,
        important_marked_at: r.important ? start : null,
        annotations: [],
        notes: [],
        review_count: Math.floor(Math.random() * 3),
        created_by: ua,
        last_visited_at: start,
        created_at: start,
        updated_at: start
      });
      j.title = r.loc;
      /* 给演示数据加占位图（让故事书有照片可看） */
      var cov = cover(r.cat, r.loc);
      j.cover_image = cov;
      if (j.a_side) j.a_side.images = [cov];
      if (j.b_side) j.b_side.images = [cov];
      if (i === 1) {
        j.annotations = [{
          id: Store.uid('an'), text: '后来那家书店搬走了，还好当时拍了照。',
          author_id: ua, created_at: daysAgo(2)
        }];
      }
      list.push(j);
    });

    /* 一条待对方提交的旅程（演示双面叙事） */
    var wStart = daysAgo(2);
    var waiting = Store.newJourney({
      couple_id: couple.id,
      title: '新开的那家云南米线',
      category: '美食',
      start_date: wStart, end_date: wStart,
      location_name: '新开的那家云南米线',
      weather: '晴', expense: 68, companion_count: 2,
      status: 'waiting_for_partner',
      magic_code: null,
      a_side: {
        user_id: ua,
        text: '汤底是酸的，加了薄荷叶。老板说米线是当天现做的。',
        images: [], score: 4, senses: { smell: '', sound: '', temp: '' }
      },
      b_side: null,
      consensus: null,
      created_by: ua, last_visited_at: wStart, created_at: wStart
    });
    waiting.cover_image = cover('美食', waiting.location_name);
    if (waiting.a_side) waiting.a_side.images = [waiting.cover_image];
    list.push(waiting);

    /* 一条闪电存档草稿（演示半成品展览） */
    var dStart = daysAgo(6);
    var draft = Store.newJourney({
      couple_id: couple.id,
      title: '待复苏的记忆',
      category: '其他',
      start_date: dStart, end_date: dStart,
      location_name: '小区门口的花店',
      weather: '', expense: null, companion_count: 2,
      status: 'draft',
      magic_code: null,
      a_side: {
        user_id: ua, text: '路过时随手买的洋桔梗，她说是这个月最好看的花。',
        images: [], score: null, senses: { smell: '', sound: '', temp: '' }
      },
      b_side: null,
      consensus: null,
      created_by: ua, last_visited_at: dStart, created_at: dStart
    });
    draft.cover_image = cover('其他', draft.location_name);
    if (draft.a_side) draft.a_side.images = [draft.cover_image];
    list.push(draft);

    Store.state.journeys = list;

    /* 愿望清单 */
    Store.state.wishes = [
      {
        id: Store.uid('w'), couple_id: couple.id,
        title: '一起去看一次海边的日出', description: '查好日出时间，前一晚住在海边。',
        category: '旅行', is_done: false, fulfilled_journey_id: null,
        created_by: ua, created_at: daysAgo(20), completed_at: null
      },
      {
        id: Store.uid('w'), couple_id: couple.id,
        title: '去学一次陶艺', description: '做两个不成对的杯子。',
        category: '手工', is_done: false, fulfilled_journey_id: null,
        created_by: ub, created_at: daysAgo(12), completed_at: null
      },
      {
        id: Store.uid('w'), couple_id: couple.id,
        title: '爬一次真正的山', description: '',
        category: '运动', is_done: false, fulfilled_journey_id: null,
        created_by: ua, created_at: daysAgo(7), completed_at: null
      },
      {
        id: Store.uid('w'), couple_id: couple.id,
        title: '把阳台改造成小花园', description: '',
        category: '居家', is_done: true, fulfilled_journey_id: null,
        created_by: ub, created_at: daysAgo(40), completed_at: daysAgo(17)
      }
    ];

    /* 待办（PRD 3.7） */
    Store.state.todos = [
      {
        id: Store.uid('t'), couple_id: couple.id,
        content: '给阳台的薄荷换个大盆', urgency: 3, estimated_minutes: 30,
        is_done: false, deadline: null, assignee: ub,
        created_by: ua, created_at: daysAgo(3), completed_at: null
      },
      {
        id: Store.uid('t'), couple_id: couple.id,
        content: '预约下个月的体检', urgency: 5, estimated_minutes: 15,
        is_done: false,
        deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
        assignee: ua,
        created_by: ub, created_at: daysAgo(1), completed_at: null
      },
      {
        id: Store.uid('t'), couple_id: couple.id,
        content: '换季衣服收纳', urgency: 2, estimated_minutes: 120,
        is_done: true, deadline: null, assignee: null,
        created_by: ua, created_at: daysAgo(20), completed_at: daysAgo(18)
      }
    ];

    /* 时光胶囊（PRD 7.3）：一年后才到期 */
    Store.state.capsules = [
      {
        id: Store.uid('cap'), couple_id: couple.id,
        title: '给一年后的我们',
        content: '今天我们在阳台上种了两盆薄荷。不知道一年后的今天，它们还在不在，我们又去了哪些地方。' +
          '希望那时候，我们还是愿意为一件小事开心一整天。',
        images: [cover('其他', '一年后的话')], author_id: ua,
        unlock_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        created_at: daysAgo(17), opened_at: null, status: 'locked'
      }
    ];

    /* 黑名单：由低分旅程自动生成 */
    Store.state.blacklist = [];
    Store.applyBlacklistRule(list[6]);

    Store.state.meta.seeded = true;
    Store.save();
  }

  /* 数据迁移：给老版本（无图）的 journey / capsule 自动补占位图，不丢内容。
     app.js 在已绑定用户启动时调用一次。 */
  function migrateAddCover() {
    var dirty = false;
    Store.state.journeys.forEach(function (j) {
      if (!j.cover_image) {
        j.cover_image = cover(j.category, j.location_name);
        dirty = true;
      }
      if (j.a_side && (!j.a_side.images || j.a_side.images.length === 0)) {
        j.a_side.images = [j.cover_image];
        dirty = true;
      }
      if (j.b_side && (!j.b_side.images || j.b_side.images.length === 0)) {
        j.b_side.images = [j.cover_image];
        dirty = true;
      }
    });
    Store.state.capsules.forEach(function (c) {
      if (!c.images || c.images.length === 0) {
        c.images = [cover('其他', c.title)];
        dirty = true;
      }
    });
    if (dirty) Store.save();
  }

  return { build: build, migrateAddCover: migrateAddCover };
})();
