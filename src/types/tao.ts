export type ElementType = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

export interface FiveElementInfo {
  id: ElementType;
  name: string;
  hanzi: string;
  color: string;
  glowColor: string;
  direction: string;
  season: string;
  nature: string;
  generates: ElementType;
  conquers: ElementType;
  bagua: string[];
  description: string;
  yinYang: '阴' | '阳' | '平衡';
}

export interface TrigramInfo {
  id: string;
  name: string;
  symbol: string;
  yao: [boolean, boolean, boolean]; // top to bottom or bottom to top (true=Yang ⚊, false=Yin ⚋)
  nature: string;
  element: ElementType;
  directionEarly: string;
  directionLater: string;
  /**
   * 后天八卦（文王八卦）在罗盘盘面上的落位角度，单位度。
   * 约定与 MOUNTAINS_24.angle 完全一致：0=子/正北，顺时针为正，四正各 90°。
   *
   * 为什么必须显式给角度，而不能用「数组下标 × 45°」
   * --------------------------------------------------
   * TRIGRAMS 数组按**先天**方位顺序排列（乾正南、兑东南、离正东、震东北…），
   * 而下标 i×45° 落的是**后天**位置。两者序完全不同，直接乘会整体错位：
   *   艮 应在 45°(东北) 却落到 270°(正西)，偏 135°。
   * 八卦是罗盘的方位基准，必须与二十四山中的卦山（艮45/巽135/坤225/乾315）逐一对上。
   */
  angleLater: number;
  numberEarly: number;
  numberLater: number;
  attribute: string;
  family: string;
  meaning: string;
}

export interface Mountain24 {
  name: string;
  angle: number; // degrees
  type: 'tianGan' | 'diZhi' | 'gua';
  element: ElementType;
}

export interface Mansion28 {
  name: string;
  beast: '青龙' | '朱雀' | '白虎' | '玄武';
  color: string;
  meaning: string;
}

export type ViewMode = 'compass' | 'armillary' | 'elements' | 'bagua' | 'exploded' | 'meditation';

export interface ArmillaryRingConfig {
  name: string;
  innerRadius: number;
  outerRadius: number;
  thickness: number;
  tiltX: number; // Max tilt pitch in radians
  tiltZ: number; // Max tilt roll in radians
  baseSpinSpeed: number;
  direction: 1 | -1;
}
