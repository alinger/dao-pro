export interface SolarTermInfo {
  name: string;
  mountain: string;
  angle: number; // degrees
  season: '春' | '夏' | '秋' | '冬';
  color: string;
  gua: string; // 十二消息辟卦
  phenology: string; // 三候
  meaning: string;
  taoistFestival?: string;
}

// 24 Solar Terms mapped to the 24 Mountains (二十四山与二十四节气坐度对应)
export const SOLAR_TERMS_24: SolarTermInfo[] = [
  // 冬至一阳生 (North / 子位开始)
  {
    name: '冬至',
    mountain: '子',
    angle: 0,
    season: '冬',
    color: '#38bdf8',
    gua: '地雷复卦 ☷☳ (一阳初动)',
    phenology: '蚯蚓结 · 麋角解 · 水泉动',
    meaning: '日南至，日短之至，日影长之至。一阳始生，天心潜动。',
    taoistFestival: '元始天尊圣诞 · 大道生天',
  },
  {
    name: '小寒',
    mountain: '癸',
    angle: 15,
    season: '冬',
    color: '#38bdf8',
    gua: '地泽临卦 ☷☱ (二阳渐长)',
    phenology: '雁北乡 · 鹊始巢 · 雉始雊',
    meaning: '冷气积久而为小寒。严冬凝敛，潜滋阴阳。',
  },
  {
    name: '大寒',
    mountain: '丑',
    angle: 30,
    season: '冬',
    color: '#38bdf8',
    gua: '地泽临卦 ☷☱',
    phenology: '鸡始乳 · 鸷鸟厉疾 · 水泽腹坚',
    meaning: '寒气之逆极也。岁序更迭，新春将启。',
    taoistFestival: '王侯腊日 · 岁暮谢神',
  },
  {
    name: '立春',
    mountain: '艮',
    angle: 45,
    season: '春',
    color: '#4ade80',
    gua: '地天泰卦 ☷☰ (三阳开泰)',
    phenology: '东风解冻 · 蛰虫始振 · 鱼陟负冰',
    meaning: '春气始至，万物复苏。三阳开泰，天地交感。',
    taoistFestival: '天腊节 · 句芒神降',
  },
  {
    name: '雨水',
    mountain: '寅',
    angle: 60,
    season: '春',
    color: '#4ade80',
    gua: '地天泰卦 ☷☰',
    phenology: '獭祭鱼 · 候雁北 · 草木萌动',
    meaning: '东风化雨，天街小雨润如酥。滋荣百谷。',
  },
  {
    name: '惊蛰',
    mountain: '甲',
    angle: 75,
    season: '春',
    color: '#4ade80',
    gua: '雷天大壮 ☳☰ (四阳盛茂)',
    phenology: '桃始华 · 仓庚鸣 · 鹰化为鸠',
    meaning: '春雷奋发，震旦启蛰。万物出乎震。',
  },
  {
    name: '春分',
    mountain: '卯',
    angle: 90,
    season: '春',
    color: '#4ade80',
    gua: '雷天大壮 ☳☰',
    phenology: '玄鸟至 · 雷乃发声 · 始电',
    meaning: '昼夜均而寒暑平。阴阳适中，天下升平。',
    taoistFestival: '祭日大典 · 玄坛开化',
  },
  {
    name: '清明',
    mountain: '乙',
    angle: 105,
    season: '春',
    color: '#4ade80',
    gua: '泽天夬卦 ☱☰ (五阳升发)',
    phenology: '桐始华 · 田鼠化为鴽 · 虹始见',
    meaning: '气清景明，万物皆显。天地清和之候。',
    taoistFestival: '清明朝真 · 拔度荐祖',
  },
  {
    name: '谷雨',
    mountain: '辰',
    angle: 120,
    season: '春',
    color: '#4ade80',
    gua: '泽天夬卦 ☱☰',
    phenology: '萍始生 · 鸣鸠拂其羽 · 戴胜降于桑',
    meaning: '雨生百谷，春将归去。仓颉造字，道文大显。',
  },
  {
    name: '立夏',
    mountain: '巽',
    angle: 135,
    season: '夏',
    color: '#ff4d4f',
    gua: '乾为天卦 ☰☰ (纯阳至极)',
    phenology: '蝼蝈鸣 · 蚯蚓出 · 王瓜生',
    meaning: '万物至此皆长大。阳气充盛，朱夏方遒。',
  },
  {
    name: '小满',
    mountain: '巳',
    angle: 150,
    season: '夏',
    color: '#ff4d4f',
    gua: '乾为天卦 ☰☰',
    phenology: '苦菜秀 · 靡草死 · 麦秋至',
    meaning: '万物小得盈满。夏熟之始，阴阳相济。',
  },
  {
    name: '芒种',
    mountain: '丙',
    angle: 165,
    season: '夏',
    color: '#ff4d4f',
    gua: '天风姤卦 ☰☴ (一阴始萌)',
    phenology: '螳螂生 · 鵙始鸣 · 反舌无声',
    meaning: '有芒之谷可种。炎炎盛夏，阳极阴生。',
  },
  {
    name: '夏至',
    mountain: '午',
    angle: 180,
    season: '夏',
    color: '#ff4d4f',
    gua: '天风姤卦 ☰☴',
    phenology: '鹿角解 · 蜩始鸣 · 半夏生',
    meaning: '日北至，日长之至。一阴潜生于地下，至极反本。',
    taoistFestival: '灵宝天尊圣诞 · 地祇大醮',
  },
  {
    name: '小暑',
    mountain: '丁',
    angle: 195,
    season: '夏',
    color: '#ff4d4f',
    gua: '天山遁卦 ☰☶ (二阴渐进)',
    phenology: '温风至 · 蟋蟀居宇 · 鹰始鸷',
    meaning: '暑，热也。温风沐世，天宇积温。',
  },
  {
    name: '大暑',
    mountain: '未',
    angle: 210,
    season: '夏',
    color: '#ff4d4f',
    gua: '天山遁卦 ☰☶',
    phenology: '腐草为萤 · 土润溽暑 · 大雨时行',
    meaning: '热动中伏，至盛之候。雷雨普降，阴气回转。',
  },
  {
    name: '立秋',
    mountain: '坤',
    angle: 225,
    season: '秋',
    color: '#facc15',
    gua: '天地否卦 ☰☷ (三阴成象)',
    phenology: '凉风至 · 白露降 · 寒蝉鸣',
    meaning: '秋者，揫也，物于此而揫敛。天高气爽，金风初肃。',
    taoistFestival: '中元地官赦罪 · 道德腊',
  },
  {
    name: '处暑',
    mountain: '申',
    angle: 240,
    season: '秋',
    color: '#facc15',
    gua: '天地否卦 ☰☷',
    phenology: '鹰乃祭鸟 · 天地始肃 · 禾乃登',
    meaning: '处，止也。暑气至此潜伏歇止，天地向秋。',
  },
  {
    name: '白露',
    mountain: '庚',
    angle: 255,
    season: '秋',
    color: '#facc15',
    gua: '风地观卦 ☴☷ (四阴渐长)',
    phenology: '鸿雁来 · 玄鸟归 · 群鸟养羞',
    meaning: '阴气渐重，凌云化露。水土凝润，玉华含霜。',
  },
  {
    name: '秋分',
    mountain: '酉',
    angle: 270,
    season: '秋',
    color: '#facc15',
    gua: '风地观卦 ☴☷',
    phenology: '雷始收声 · 蛰虫坯户 · 水始涸',
    meaning: '昼夜平分，秋色正中。金风玉露，天地平匀。',
    taoistFestival: '祭月清礼 · 太阴星君圣诞',
  },
  {
    name: '寒露',
    mountain: '辛',
    angle: 285,
    season: '秋',
    color: '#facc15',
    gua: '山地剥卦 ☶☷ (五阴将盛)',
    phenology: '鸿雁来宾 · 雀入大水为蛤 · 菊有黄华',
    meaning: '露气寒冷，将凝结为霜。登高舒怀，道气常清。',
    taoistFestival: '九皇星君醮仪 · 重阳登玄',
  },
  {
    name: '霜降',
    mountain: '戌',
    angle: 300,
    season: '秋',
    color: '#facc15',
    gua: '山地剥卦 ☶☷',
    phenology: '豺乃祭兽 · 草木黄落 · 蜇虫咸俯',
    meaning: '气肃而凝，露结为霜。秋之极致，万物归藏。',
  },
  {
    name: '立冬',
    mountain: '乾',
    angle: 315,
    season: '冬',
    color: '#38bdf8',
    gua: '坤为地卦 ☷☷ (六纯阴卦)',
    phenology: '水始冰 · 地始冻 · 雉入大水为蜃',
    meaning: '冬者，终也，万物收藏。水凝成冰，敛精守气。',
    taoistFestival: '下元水官解厄 · 民岁腊',
  },
  {
    name: '小雪',
    mountain: '亥',
    angle: 330,
    season: '冬',
    color: '#38bdf8',
    gua: '坤为地卦 ☷☷',
    phenology: '虹藏不见 · 天气上升地气下降 · 闭塞成冬',
    meaning: '天冷下雪，地气闭塞。凝神固真，清虚自守。',
  },
  {
    name: '大雪',
    mountain: '壬',
    angle: 345,
    season: '冬',
    color: '#38bdf8',
    gua: '坤为地卦 ☷☷',
    phenology: '鹖鴠不鸣 · 虎始交 · 荔挺出',
    meaning: '降雪益甚，积雪凝华。深冬归真，抱元守一。',
  },
];

// Helper to compute current Taoist Calendar info based on current year 2026
export function getTaoistCalendarData() {
  const gregorianYear = 2026;
  const taoistYear = gregorianYear + 2697; // 4723

  return {
    taoistYearNumber: taoistYear,
    taoistYearTitle: `道历四千七百二十三年`,
    eraName: '开元轩辕黄帝纪元',
    ganzhiYear: '岁次丙午',
    animalSign: '赤马（天干丙火 · 地支午火）',
    lunarMonth: '季秋九月',
    currentTerm: SOLAR_TERMS_24.find((t) => t.name === '寒露') || SOLAR_TERMS_24[19],
    currentGua: '山地剥卦 ☶☷',
    deityNote: '九天玄女辅道 · 北斗九皇星君当令',
  };
}

export interface TaoistTodayDetails {
  gregorianDateStr: string; // 公历
  lunarDateStr: string; // 农历
  taoistYearNumber: number; // 4723
  taoistYearTitle: string; // 道历四千七百二十三年
  eraName: string; // 轩辕黄帝纪元
  ganzhiYear: string; // 丙午年
  yearNayin: string; // 天河水
  yearDeity: string; // 赤马当令
  dayGanzhi: string; // 丙申日
  dayNayin: string; // 山下火
  lunarMonth: string; // 季秋九月
  lunarDay: string; // 廿六日
  zodiacSign: string; // 猴 (申)
  mansion28: {
    name: string; // 虚日鼠
    beast: string; // 北方玄武
    quality: string; // 吉宿
    meaning: string; // 虚星照耀，清静守志，利修真悟道，元辰安和
  };
  jianChu12: {
    name: string; // 定日
    quality: string; // 黄道吉日
    meaning: string; // 定国安民，百事吉利，万物底定，祈福吉庆
  };
  currentTerm: {
    name: string; // 寒露
    mountain: string; // 辛山
    angle: number; // 285°
    season: string; // 季秋
    hexagram: string; // 山地剥卦 ☶☷
    hexagramExplanation: string; // 五阴一阳，阴盛阳伏，敛精聚气，抱元守一
    phenology: string; // 初候鸿雁来宾 · 二候雀入大水为蛤 · 三候菊有黄华
    flavor: string; // 露气凝寒，天地澄澈
  };
  deities: {
    dutyDeity: string; // 九天玄女元君辅道 · 北斗九皇星君值令
    sacredCeremony: string; // 季秋九皇朝真醮会 · 斗姥天尊护佑
    presidingSpirit: string; // 太阴星君本命照临
  };
  auspiciousDirections: {
    xiShen: { name: string; dir: string; mountain: string; angle: number; hint: string };
    caiShen: { name: string; dir: string; mountain: string; angle: number; hint: string };
    guiShen: { name: string; dir: string; mountain: string; angle: number; hint: string };
    fuShen: { name: string; dir: string; mountain: string; angle: number; hint: string };
    shaFang: { name: string; dir: string; mountain: string; angle: number; hint: string };
  };
  injunctions: {
    yi: string[]; // 今日宜
    ji: string[]; // 今日忌
  };
  wisdomQuote: {
    source: string; // 出处
    quote: string; // 经言
    guidance: string; // 修真导引
  };
}

export function getTaoistTodayDetails(): TaoistTodayDetails {
  const currentTerm = SOLAR_TERMS_24.find((t) => t.name === '寒露') || SOLAR_TERMS_24[19];

  return {
    gregorianDateStr: '2026年10月6日 丙午岁次',
    lunarDateStr: '开元四千七百二十三年 · 季秋九月廿六',
    taoistYearNumber: 4723,
    taoistYearTitle: '道历四千七百二十三年',
    eraName: '开元轩辕黄帝纪元',
    ganzhiYear: '岁次丙午',
    yearNayin: '天河水',
    yearDeity: '赤马当令 · 火德周天',
    dayGanzhi: '丙申日',
    dayNayin: '山下火',
    lunarMonth: '季秋九月',
    lunarDay: '廿六日',
    zodiacSign: '申猴',
    mansion28: {
      name: '虚日鼠',
      beast: '北方玄武第七宿',
      quality: '清修吉宿',
      meaning: '太虚玄玄，真空妙有。虚星照临，心神内敛，最宜静坐通真，清净无为。',
    },
    jianChu12: {
      name: '定日',
      quality: '黄道天定吉辰',
      meaning: '定日吉辰，定国安民，百事吉利，万物归位，静定生慧。',
    },
    currentTerm: {
      name: currentTerm.name,
      mountain: `${currentTerm.mountain}山`,
      angle: currentTerm.angle,
      season: '季秋肃敛',
      hexagram: currentTerm.gua,
      hexagramExplanation: '五阴在下，一阳在上。阳气虽微而根柢深固，正宜收敛身心，守固真元。',
      phenology: currentTerm.phenology,
      flavor: '寒露凝霜，天高气爽，金水相涵，道气充沛。',
    },
    deities: {
      dutyDeity: '九天玄女元君辅道 · 北斗七元九皇星君值令',
      sacredCeremony: '九皇朝真延寿大醮 · 斗母本命朝真礼',
      presidingSpirit: '三元三品三官大帝 · 照临监察福善',
    },
    auspiciousDirections: {
      xiShen: { name: '喜神', dir: '西南', mountain: '坤', angle: 225, hint: '适宜求祥纳吉、和合心神' },
      caiShen: { name: '财神', dir: '正西', mountain: '兑', angle: 270, hint: '适宜经市开元、纳财丰衍' },
      guiShen: { name: '贵神', dir: '西北', mountain: '乾', angle: 315, hint: '适宜访师求道、瞻谒先真' },
      fuShen: { name: '福神', dir: '东南', mountain: '巽', angle: 135, hint: '适宜修福延龄、慈心利物' },
      shaFang: { name: '日破煞位', dir: '正南', mountain: '午', angle: 180, hint: '正南岁破日冲，避开动土争竞' },
    },
    injunctions: {
      yi: [
        '静坐内视 · 抱元守一',
        '调和阴阳 · 吐纳服气',
        '研诵经典 · 道德修持',
        '礼真谢圣 · 朝拜北斗',
        '布施利济 · 积功累德',
        '散步幽境 · 颐养天和',
      ],
      ji: [
        '妄动嗔恚 · 动心伤神',
        '口舌相争 · 伐善伐德',
        '杀戮生灵 · 伤残天地',
        '背阳入阴 · 沉溺妄念',
        '暴饮暴食 · 损耗脾胃',
        '贪名求胜 · 劳形失真',
      ],
    },
    wisdomQuote: {
      source: '《道德经》第十六章 · 归根复命',
      quote: '致虚极，守静笃。万物并作，吾以观复。夫物芸芸，各复归其根。归根曰静，静曰复命。',
      guidance: '今日逢季秋之候，天地敛藏，心宜澄澈如鉴。闭目内观，恬淡虚无，真气从之，精神守固。',
    },
  };
}
