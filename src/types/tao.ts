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
