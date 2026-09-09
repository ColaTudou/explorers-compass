/* ============================================================
   探险家的罗盘 · 预置数据
   来源：PRD 2.3 标签库 / 3.5.3 重要时光分类 / 8.2 魔法暗号示例库
   ============================================================ */
window.DATA = (function () {

  /* 顶层分类（PRD 2.2 category） */
  var categories = ['美食', '探店', '旅行', '手工', '演出', '运动', '居家', '其他'];
  var categoryEmoji = {
    '美食': '🍜', '探店': '🛍️', '旅行': '🧳', '手工': '🎨',
    '演出': '🎭', '运动': '🏃', '居家': '🏠', '其他': '✨'
  };

  /* 天气 */
  var weathers = ['晴', '雨', '阴', '雪', '风'];
  var weatherEmoji = { '晴': '☀️', '雨': '🌧️', '阴': '☁️', '雪': '❄️', '风': '🌬️' };

  /* 魔法暗号：12 色（PRD 8.2） */
  var magicColors = [
    { name: '琥珀色', hex: '#C96F3D' },
    { name: '天青色', hex: '#7BA7B5' },
    { name: '珊瑚色', hex: '#E8836B' },
    { name: '鹅黄色', hex: '#E8C46B' },
    { name: '紫罗兰', hex: '#9B7BB8' },
    { name: '墨绿色', hex: '#6B8F71' },
    { name: '胭脂红', hex: '#C25B6B' },
    { name: '月光白', hex: '#B9B4A8' },
    { name: '午夜蓝', hex: '#4A5C7A' },
    { name: '焦糖色', hex: '#A9713F' },
    { name: '樱花粉', hex: '#E8A0B4' },
    { name: '象牙白', hex: '#D8CDB4' }
  ];

  /* 形容词推荐库（PRD 8.2 四类） */
  var adjectives = [
    '慵懒的', '热烈的', '静谧的', '微醺的', '清甜的', '治愈的', '怅然的', '雀跃的',
    '潮湿的', '微凉的', '闷热的', '晴朗的', '氤氲的', '清冽的', '暖洋洋的',
    '咸鲜的', '甜腻的', '酸辣的', '苦涩的', '香醇的', '清爽的',
    '闪闪发光的', '湿漉漉的', '慢悠悠的', '急匆匆的', '毛茸茸的', '空荡荡的'
  ];

  /* 标签库（PRD 2.3 六大维度） */
  var tagDefs = [
    ['场景', ['约会', '聚会', '独处', '庆生', '纪念日', '家庭']],
    ['花费', ['$', '$$', '$$$', '$$$$']],
    ['体力', ['低强度', '中强度', '高强度']],
    ['天气适配', ['室内', '室外', '雨天友好', '空调充足', '户外遮阳']],
    ['时段', ['早餐', '午餐', '下午茶', '晚餐', '夜宵', '夜间']],
    ['情绪', ['治愈', '刺激', '安静', '热闹', '浪漫', '怀旧', '新鲜']]
  ];
  var tags = [];
  var tagIdOf = {};
  tagDefs.forEach(function (pair) {
    pair[1].forEach(function (name) {
      var id = 'tag_' + pair[0] + '_' + name;
      tags.push({ id: id, name: name, dimension: pair[0], sort_order: tags.length });
      tagIdOf[name] = id;
    });
  });

  /* 重要时光分类（PRD 3.5.3） */
  var importantCategories = [
    { key: '纪念日', icon: '🎂' },
    { key: '生日', icon: '🎉' },
    { key: '旅行', icon: '✈️' },
    { key: '第一次', icon: '✨' },
    { key: '里程碑', icon: '🏆' },
    { key: '感动瞬间', icon: '💝' },
    { key: '自定义', icon: '⭐' }
  ];

  /* 勇敢者之选：系统发现库（PRD 3.3.3 第八步，MVP 阶段预置） */
  var discovery = {
    '美食': ['巷子里的私房菜', '主厨吧台 Omakase', '异国街头小吃', '深夜面馆', '素食料理'],
    '探店': ['独立书店', '中古唱片店', '城市旧货市场', '香氛实验室', '隐藏酒吧'],
    '旅行': ['周边古镇一日', '海岛露营', '山间民宿', '火车慢旅行', '跨城骑行'],
    '手工': ['陶艺体验', '双人烘焙课', '皮具手作', '香薰蜡烛 DIY', '油画体验'],
    '演出': ['Livehouse 现场', '小剧场话剧', '露天电影', '脱口秀开放麦', '爵士酒吧'],
    '运动': ['室内攀岩', '双人桨板', '夜跑城市', '羽毛球约局', '滑雪初体验'],
    '居家': ['一起做一顿大餐', '家庭影院之夜', '拼图挑战', '阳台改造', '交换书单'],
    '其他': ['城市漫步摄影', '菜市场探险', '图书馆泡一天', '天文馆夜场', '志愿者半日']
  };

  /* 天气 → 适配标签（用于情景适配加分） */
  var weatherTagMap = {
    '晴': ['室外', '户外遮阳'], '雨': ['室内', '雨天友好'], '阴': ['室外'],
    '雪': ['室内', '空调充足'], '风': ['室内']
  };

  /* 节日 / 季节主题（PRD 7.3）
     只收录公历固定日期的节日；春节 / 七夕 / 中秋等农历节日无法用公历推算，暂不收录 */
  var festivals = [
    { name: '元旦', from: '01-01', to: '01-03', emoji: '🎆', tags: ['热闹', '聚会'], tip: '新年头几天，适合热闹一点的地方' },
    { name: '情人节', from: '02-13', to: '02-15', emoji: '💝', tags: ['浪漫', '约会'], tip: '这几天就别去太吵的地方了' },
    { name: '妇女节', from: '03-07', to: '03-08', emoji: '🌸', tags: ['治愈', '约会'], tip: '适合慢悠悠、被好好对待的那种地方' },
    { name: '清明小假', from: '04-03', to: '04-06', emoji: '🌿', tags: ['室外', '怀旧'], tip: '春光大好，往户外走' },
    { name: '五一假期', from: '05-01', to: '05-05', emoji: '🧳', tags: ['旅行', '室外'], tip: '假期人多，提前订位是常识' },
    { name: '儿童节', from: '06-01', to: '06-01', emoji: '🎈', tags: ['新鲜', '热闹'], tip: '当一天小孩也不错' },
    { name: '暑假', from: '07-01', to: '08-31', emoji: '🏖️', tags: ['室外', '刺激'], tip: '天热，优先空调足或靠水的地方' },
    { name: '万圣节', from: '10-30', to: '11-01', emoji: '🎃', tags: ['刺激', '热闹'], tip: '一年里最适合扮鬼的日子' },
    { name: '圣诞季', from: '12-23', to: '12-26', emoji: '🎄', tags: ['浪漫', '热闹'], tip: '圣诞季的灯，值得专门去看一趟' },
    { name: '跨年夜', from: '12-30', to: '12-31', emoji: '🥂', tags: ['热闹', '聚会'], tip: '跨年要提前订，别等到当天' }
  ];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* 返回某天命中的节日，没有则 null */
  function festivalOf(date) {
    date = date || new Date();
    var md = pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    for (var i = 0; i < festivals.length; i++) {
      var f = festivals[i];
      if (f.from <= f.to ? (md >= f.from && md <= f.to) : (md >= f.from || md <= f.to)) return f;
    }
    return null;
  }

  /* 时段划分（PRD 3.3.2 current_time → 时段标签） */
  function slotOf(date) {
    var h = date.getHours();
    if (h >= 5 && h <= 10) return '早餐';
    if (h >= 11 && h <= 13) return '午餐';
    if (h >= 14 && h <= 16) return '下午茶';
    if (h >= 17 && h <= 20) return '晚餐';
    if (h >= 21 && h <= 23) return '夜宵';
    return '夜间';
  }

  function colorHex(name) {
    for (var i = 0; i < magicColors.length; i++) {
      if (magicColors[i].name === name) return magicColors[i].hex;
    }
    return '#C96F3D';
  }

  function tagNames(ids) {
    return (ids || []).map(function (id) {
      for (var i = 0; i < tags.length; i++) if (tags[i].id === id) return tags[i].name;
      return id;
    });
  }

  return {
    categories: categories, categoryEmoji: categoryEmoji,
    weathers: weathers, weatherEmoji: weatherEmoji,
    magicColors: magicColors, adjectives: adjectives,
    tags: tags, tagIdOf: tagIdOf, tagNames: tagNames,
    importantCategories: importantCategories,
    discovery: discovery, weatherTagMap: weatherTagMap,
    festivals: festivals, festivalOf: festivalOf,
    slotOf: slotOf, colorHex: colorHex
  };
})();
