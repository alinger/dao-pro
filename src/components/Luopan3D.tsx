import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createTianchiTexture,
  createCompassDialTexture,
  createCompassBumpTexture,
  createEarthBaseTexture,
  DIAL_HIGHLIGHTS,
  type DialHighlight,
} from '../utils/textureGenerator';
import { audioEngine } from '../utils/audio';
import { ElementType, ViewMode, ArmillaryRingConfig } from '../types/tao';

/**
 * 6 道同心铜环（浑天仪天球环层）。
 *
 * 各环内外半径严格对齐贴图 createCompassDialTexture 中的 6 条内容环带（r0..r6）：
 * - r0 = maxR * 0.25 = 1.76（贴图天池边）
 * - r1 = maxR * 0.355 = 2.50（八卦外沿 / 五行内沿）
 * - r2 = maxR * 0.515 = 3.62（五行外沿 / 节气内沿）
 * - r3 = maxR * 0.63 = 4.43（节气外沿 / 廿四山内沿）
 * - r4 = maxR * 0.79 = 5.56（廿四山外沿 / 廿八宿内沿）
 * - r5 = maxR * 0.91 = 6.40（廿八宿外沿 / 周天铭文内沿）
 * - r6 = maxR * 1.0 = 7.03（盘沿到 7.25）
 */
export const ARMILLARY_RINGS: ArmillaryRingConfig[] = [
  {
    name: '先天八卦天运环',
    innerRadius: 1.42,   // 周合天池（天池水罩外径 1.40），正对 r0 (1.76) 内侧暗区
    outerRadius: 2.50,   // 正对贴图 r1 (2.50)：八卦与五行环精确分界线
    thickness: 0.10,
    tiltX: 0.52,   // ~30°
    tiltZ: 0.45,   // ~26°
    baseSpinSpeed: 0.0018,
    direction: 1,
  },
  {
    name: '五行生克环',
    innerRadius: 2.50,   // 接八卦环外沿 r1
    outerRadius: 3.62,   // 正对贴图 r2 (3.62)：五行与二十四节气环精确分界线
    thickness: 0.10,
    tiltX: -0.68,  // ~-39°
    tiltZ: -0.42,  // ~-24°
    baseSpinSpeed: 0.0024,
    direction: -1,
  },
  {
    name: '道历二十四节气天环',
    innerRadius: 3.62,   // 接五行环外沿 r2
    outerRadius: 4.43,   // 正对贴图 r3 (4.43)：节气与二十四山神位环精确分界线
    thickness: 0.12,
    tiltX: 0.92,   // ~53°
    tiltZ: -0.72,  // ~-41°
    baseSpinSpeed: 0.0014,
    direction: 1,
  },
  {
    name: '二十四山神位天环',
    innerRadius: 4.43,   // 接节气环外沿 r3
    outerRadius: 5.56,   // 正对贴图 r4 (5.56)：二十四山与二十八宿精确分界线
    thickness: 0.12,
    tiltX: -1.18,  // ~-68°
    tiltZ: 0.88,   // ~50°
    baseSpinSpeed: 0.0020,
    direction: -1,
  },
  {
    name: '二十八宿四象天纬环',
    innerRadius: 5.56,   // 接二十四山外沿 r4
    outerRadius: 6.40,   // 正对贴图 r5 (6.40)：二十八宿与周天铭文精确分界线
    thickness: 0.14,
    tiltX: 1.42,   // ~81° (Meridian ring)
    tiltZ: 0.22,   // ~13°
    baseSpinSpeed: 0.0010,
    direction: 1,
  },
  {
    name: '周天赤道道历天铭环',
    innerRadius: 6.40,   // 接二十八宿外沿 r5
    outerRadius: 7.25,   // = MAX_DIAL_RADIUS，覆盖周天度数与黄帝纪年铭文到盘沿
    thickness: 0.15,
    tiltX: -0.32,  // ~-18°
    tiltZ: -1.38,  // ~-79° (Equatorial ring)
    baseSpinSpeed: 0.0007,
    direction: -1,
  },
];

export const MAX_DIAL_RADIUS = 7.25;

/**
 * 天行自转基准速度：1 度 / 秒（秒针式）。
 *
 * 以「度/秒」而非「弧度/帧」定义，使转速与刷新率无关——
 * 旧实现 `angle += 0.0012` 是每帧增量，在 144Hz 屏上会快 2.4 倍。
 * 1°/s → 约 6 分钟转一圈，每 15 秒过一山，符合「按正常时间流动」的观感。
 */
export const ROTATION_DEG_PER_SEC = 1.0;

/** 单步按钮每次推进的度数 */
export const SINGLE_STEP_DEG = 1.0;

/** speedScale 档位 → 实际角速度倍率 */
export const SPEED_PRESETS: { label: string; value: number }[] = [
  { label: '悠缓 (0.25x)', value: 0.25 },
  { label: '沉稳 (1.0x)', value: 1.0 },
  { label: '灵动 (3.0x)', value: 3.0 },
];

/**
 * 罗盘适配视口时使用的目标半径。
 *
 * 取盘面贴图半径 MAX_DIAL_RADIUS = 7.25（直径 14.5）而不是镜面铜环 15.02 / 底座 15.2：
 * 外圈是装饰框，默认形态下允许轻微出血（此前实测按 15.2 适配会把相机退到 44.3，
 * 盘面缩成窗口的 42%，反而更看不清）。
 * VIEW_FIT_MARGIN 1.06 是给盘沿描边留的呼吸空间。
 */
const VIEW_FIT_RADIUS = MAX_DIAL_RADIUS;

/** 垂直 FOV，与 new PerspectiveCamera(40, ...) 保持一致。 */
const CAMERA_FOV = 40;

/** 画幅四周留白系数：1.0 = 刚好贴边，需留出盘沿描边与阴影的呼吸空间。 */
const VIEW_FIT_MARGIN = 1.06;

/**
 * 按视口宽高比算出「保证盘面完整入画」的相机距离。
 *
 * 相机 FOV 定义在垂直方向，水平可视宽度 = 垂直可视高度 × aspect。
 * 正俯视（phi≈0）时盘面不发生 sin(phi) 投影压缩，两向都得满足：
 *   垂直：2·d·tan(fov/2) ≥ 2R·margin
 *   水平：2·d·tan(fov/2)·aspect ≥ 2R·margin
 * 取两者的较大值。窄窗口（aspect→1）时垂直成为瓶颈，宽窗口时水平先顶满。
 *
 * 为什么必须自适应：用户实测窗口 891×776（aspect 1.148），
 * 若沿用宽屏（aspect 1.6）算出的固定距离，盘面上下会被裁掉。
 */
export function fitCameraDistance(aspect: number): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0.2 ? aspect : 1.6;
  const half = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
  const need = (VIEW_FIT_RADIUS * VIEW_FIT_MARGIN) / half;
  return Math.max(need, need / safeAspect);
}

/**
 * 默认第一视角（天元总览）。
 *
 * 球坐标约定：camX = d·sin(phi)·sin(theta)，camY = d·cos(phi)，camZ = d·sin(phi)·cos(theta)
 * - theta = 0 → 相机位于 +Z 轴看向 -Z，即正对罗盘「屏幕上方」，此时子山朝正上。
 * - phi 越小越俯视。**0.06 弧度 ≈ 3.4°，取「近正俯视」而非严格 0**：
 *   严格 phi=0 时相机恰好落在 y 轴上，OrbitControls 的方位角约束会退化、
 *   俯仰拖拽也会失去参照，故留 0.06 的余量。视觉上盘面呈正圆，
 *   方位不再随距离发生透视畸变，二十四山与周天度数都能直接读。
 *   （原 0.75 ≈ 43° 斜俯视，上下方向被 sin43° 压缩约 32%，读成椭圆。）
 * - dist **不写死**，由 fitCameraDistance(aspect) 在每次 resize 时重算。
 *   历史踩坑：曾按 aspect≈1.72 硬编码 dist=22.0（只保证 14.5 的盘面入画），
 *   用户在 891×776（aspect 1.148）的窗口下测得镜面铜环占屏高 99.2%、底座 100.4% 被裁，
 *   反馈「还是没展示完整」。根因是把 fit 目标误当成盘面而非最外层装饰框。
 */
export const DEFAULT_CAM = { theta: 0, phi: 0.06, dist: fitCameraDistance(1.6) };

interface Luopan3DProps {
  viewMode: ViewMode;
  armillaryProgress: number; // 0 (Flat) to 1 (Full 3D Armillary Sphere)
  selectedElement: ElementType | null;
  selectedTrigram: string | null;
  onRotationChange: (angle: number, speed: number) => void;
  onEnergyChange: (energy: number) => void;
  isAutoRotate: boolean;
  speedScale?: number;
  targetOrientationAngle?: number | null;
  /** Controlled: whether the dial texture is mirrored left-right */
  isMirroredDial?: boolean;
  onToggleMirrorDial?: () => void;
  /**
   * 单步请求计数器：每次值变化 +1 视为一次「拨一齿」请求。
   * 用计数器而非 boolean，是为了支持连点（每次点击都是一个新值）。
   */
  stepRequest?: number;
  /**
   * 拖拽手势模式（受控）。
   * 融合前由组件内部 useState 持有，只服务于左下角那组按钮；
   * 现上提为受控 prop，使顶栏「操盘」抽屉成为唯一入口。
   * 右键 / Shift 拖拽仍会在组件内临时切到 orbit，松开后回到此 prop 的值。
   */
  dragMode?: 'spin' | 'orbit';
}

export const Luopan3D: React.FC<Luopan3DProps> = ({
  viewMode,
  armillaryProgress,
  onRotationChange,
  onEnergyChange,
  isAutoRotate,
  speedScale = 1.0,
  targetOrientationAngle = null,
  isMirroredDial = false,
  onToggleMirrorDial,
  stepRequest = 0,
  dragMode = 'spin',
  // 两个选中项都参与 3D 二级聚焦：
  //   selectedElement  → 五行模式只留该元素色块
  //   selectedTrigram  → 八卦模式只留该卦
  selectedElement,
  selectedTrigram,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Mesh & Assembly references
  const mainAssemblyRef = useRef<THREE.Group | null>(null);
  const basePlateRef = useRef<THREE.Mesh | null>(null);
  /** 独立盘面（承载 compassTex）。外层 Group 绕 y 自转，内层 Mesh 固定躺平。 */
  const dialPlateRef = useRef<THREE.Group | null>(null);
  const mirrorFloorRef = useRef<THREE.Mesh | null>(null);

  // Armillary ring nodes
  const ringNodesRef = useRef<{
    gimbalGroup: THREE.Group;
    spinGroup: THREE.Group;
    mesh: THREE.Mesh;
    config: ArmillaryRingConfig;
    localAngle: number;
  }[]>([]);

  // Central Tianchi Hub
  const tianchiHubRef = useRef<THREE.Group | null>(null);
  const needleGroupRef = useRef<THREE.Group | null>(null);

  // State & Physics
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'spin' | 'orbit'>('spin');
  const prevPointerPosRef = useRef({ x: 0, y: 0 });
  // Initialise to 0 so the 子(north) position sits at the top of the dial on load.
  const globalMasterAngleRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const cameraTargetAnglesRef = useRef({ ...DEFAULT_CAM });
  const cameraCurrentAnglesRef = useRef({ ...DEFAULT_CAM });
  const currentArmillaryProgressRef = useRef(armillaryProgress);
  /** 非「罗盘」形态（分层/元素/吐纳/浑天）→ 显示铜环作为立体表现层 */
  const showArmillaryRingsRef = useRef(viewMode !== 'compass');
  const speedScaleRef = useRef(speedScale);
  const lastResonanceSoundTimeRef = useRef(0);

  /** 拖拽模式的镜像 state：仅供内部/调试读取，真正的判定用 dragModeRef（避免每帧穿透闭包） */
  const [touchInstruction] = useState<'spin' | 'orbit'>('spin');
  const isMirroredTextRef = useRef<boolean>(false);

  // 受控 dragMode → ref 同步。
  // 必须在 effect 里同步而非只在 handlePointerDown 时读 prop：
  // 用户在顶栏切换到「三维天球」后，下一次按下就会走 orbit 分支。
  useEffect(() => {
    dragModeRef.current = dragMode;
  }, [dragMode]);

  // Rewrite the ring geometry UVs to flip the engraved dial texture horizontally.
  // Affects ONLY the WebGL ring meshes — HUD/DOM layers are untouched, so the
  // bearing readout text can never be mirrored by this toggle.
  const applyMirrorToRings = (mirrored: boolean) => {
    const sign = mirrored ? -1 : 1;
    ringNodesRef.current.forEach(({ mesh }) => {
      const geom = mesh.geometry;
      const pos = geom.getAttribute('position');
      const uvAttr = geom.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvAttr.setXY(i, (sign * x / MAX_DIAL_RADIUS) * 0.5 + 0.5, (-y / MAX_DIAL_RADIUS) * 0.5 + 0.5);
      }
      uvAttr.needsUpdate = true;
    });
  };

  // Keep the geometry-UV mirror flag in sync with the controlled prop.
  useEffect(() => {
    isMirroredTextRef.current = isMirroredDial;
    applyMirrorToRings(isMirroredDial);
  }, [isMirroredDial]);

  useEffect(() => {
    currentArmillaryProgressRef.current = armillaryProgress;
  }, [armillaryProgress]);

  // 「分层 / 元素 / 吐纳」这几个视角不会改 armillaryProgress（只有浑天/罗盘会），
  // 但它们同样需要铜环作为立体层次的表现层，所以额外记一个「非平面罗盘形态」标志。
  useEffect(() => {
    showArmillaryRingsRef.current = viewMode !== 'compass';
  }, [viewMode]);

  /**
   * ★ 盘面聚光贴图热替换 —— 让「五行生克 / 八卦推演」拥有真实的画面差异。
   *
   * 背景：此前 viewMode 只驱动相机位置，导致这两个模式与「天元总览」画面雷同
   * （用户反馈「顶部的菜单好像区别不大」）。
   *
   * 这里在 viewMode / 选中项变化时**重新烘焙整张 2048 盘面贴图**（而非叠一层遮罩
   * —— 遮罩会透出盘底 earthBaseTex 的棕褐色，形成刺眼异色环），
   * 把与当前模式无关的环整体压暗，只留目标环满亮。
   *
   * 用「换 map + dispose 旧图」而不是改 material.color 的原因：
   *   color 是整体乘法，会把天池、盘沿、铭文一起染暗，无法只暗某一个环。
   *
   * 二级聚焦：五行模式下若已在右侧面板选中某个元素，
   * 盘面上只保留该元素的色块与字（其余五行整体隐去），
   * 让「生克」这件事从文字说明变成盘面上的直接呈现。
   */
  const highlightKeyRef = useRef<string>('');

  useEffect(() => {
    const base: DialHighlight | undefined = DIAL_HIGHLIGHTS[viewMode];
    let spec = base;
    // 五行模式下跟随右侧面板的选中元素做二级聚焦。
    // 仅在 elements 模式生效：其他模式（如分层透视）选中态不该改变盘面完整度。
    if (base && viewMode === 'elements' && selectedElement) {
      spec = { ...base, focusElements: [selectedElement] };
    }
    // 八卦模式同理：只留选中的那一卦。
    if (base && viewMode === 'bagua' && selectedTrigram) {
      spec = { ...base, focusTrigrams: [selectedTrigram] };
    }

    const key = spec
      ? `${viewMode}|${spec.keep.join(',')}|${spec.dimFactor}|${spec.keepBoost ?? 1}` +
        `|${(spec.focusElements ?? []).join(',')}|${(spec.focusTrigrams ?? []).join(',')}`
      : 'none';
    if (key === highlightKeyRef.current) return;
    highlightKeyRef.current = key;

    const group = dialPlateRef.current;
    if (!group) return;
    const mesh = group.children[0] as THREE.Mesh | undefined;
    const mat = mesh?.material as THREE.MeshStandardMaterial | undefined;
    if (!mat) return;

    const prev = mat.map;
    const next = createCompassDialTexture(spec);
    mat.map = next;
    mat.needsUpdate = true;
    // 旧贴图释放，避免频繁切模式时 VRAM 泄漏（每次烘焙都是一张 2048² 纹理）
    if (prev && prev !== next) prev.dispose();
  }, [viewMode, selectedElement, selectedTrigram]);

  useEffect(() => {
    speedScaleRef.current = speedScale;
  }, [speedScale]);

  // Smoothly align compass to selected solar term target angle
  useEffect(() => {
    if (targetOrientationAngle !== null && targetOrientationAngle !== undefined) {
      const targetRad = (targetOrientationAngle * Math.PI) / 180;
      globalMasterAngleRef.current = targetRad;
      angularVelocityRef.current = 0;
    }
  }, [targetOrientationAngle]);

  // Update target camera based on view mode
  useEffect(() => {
    // 四个视角的距离都以「当前视口的自适应基准」为参照按倍率给出，
    // 硬编码绝对值会在窄窗口下超出缩放范围、或在宽窗口下离得过远。
    const cam = cameraRef.current;
    const base = fitCameraDistance(cam ? cam.aspect : 1.6);

    if (viewMode === 'armillary') {
      // 浑天：球体已撑开，必须拉远 + 压低（phi 大 = 视线接近水平），否则天环互相穿插
      cameraTargetAnglesRef.current = { theta: 0.42, phi: 1.15, dist: base * 0.84 };
      audioEngine.setMeditationDrone(false);
    } else if (viewMode === 'exploded') {
      // 分层：介于俯视与平视之间，保留环的层叠厚度感
      cameraTargetAnglesRef.current = { theta: 0.3, phi: 1.0, dist: base * 0.82 };
      audioEngine.playBronzeBell();
      audioEngine.setMeditationDrone(false);
    } else if (viewMode === 'meditation') {
      // 吐纳：比默认视角再俯一点并贴近盘面（默认已改为近正俯视 0.06，这里取 0.04 略贴近）
      cameraTargetAnglesRef.current = { theta: 0, phi: 0.04, dist: base * 0.92 };
      audioEngine.setMeditationDrone(true);
    } else if (viewMode === 'elements') {
      /**
       * 五行生克：**带方位感的斜俯视**，与天元总览的近正俯视明确区分。
       *
       * 取 theta=0.2（略偏东）、phi=0.72（约 41°，介于俯视 0.06 与分层 1.0 之间）：
       *   - phi 0.72 让盘面呈明确椭圆、能看到环带厚度 → 读作「一圈一层」；
       *   - theta 偏转后盘面的「东（木/卯）」被推远、「西（金/酉）」被拉近，
       *     视觉上自然把视线引向五行环带；
       *   - dist 略近（0.9）让五行环在画面里占比更大。
       * 配合盘面聚光（五行环满亮、其余压暗），该模式与总览的差异一眼可辨。
       */
      cameraTargetAnglesRef.current = { theta: 0.2, phi: 0.72, dist: base * 0.9 };
      audioEngine.setMeditationDrone(false);
    } else if (viewMode === 'bagua') {
      /**
       * 八卦推演：**更低更近的侧俯视**，凑近看内圈八卦。
       *
       * 取 theta=-0.36（偏西）、phi=0.86（约 49°）：
       *   - 比五行模式再压低一档，八卦环（最内圈、仅 104px 宽）的
       *     三爻线在斜视下才有立体感，正俯视时它们只是几条平行细线；
       *   - theta 取负号与五行模式**反向偏转**，两个模式连镜头方向都不同，
       *     不会出现"切过去了但好像没变"的观感；
       *   - dist 0.78 是三档里最近的，把八卦环顶到画面中心。
       */
      cameraTargetAnglesRef.current = { theta: -0.36, phi: 0.86, dist: base * 0.78 };
      audioEngine.setMeditationDrone(false);
    } else {
      // 天元总览（默认）：theta=0 → 相机落在 +Z 看向 -Z，正对盘面「上方」，
      // 配合 globalMasterAngle=0 使子山（北）落在屏幕正上方；
      // phi=0.06 近正俯视，盘面呈正圆、方位无透视畸变；
      // dist 用当前视口的自适应值，保证镜面铜环与底座完整入画。
      audioEngine.setMeditationDrone(false);
      cameraTargetAnglesRef.current = { ...DEFAULT_CAM, dist: base };
    }
  }, [viewMode]);

  /**
   * 单步：每次推进一个「刻度单位」。
   *
   * 语义等同机械罗盘的「一齿一齿拨」，因此推进量取一度而非一山（15°）——
   * 15°/次在视觉上过于跳跃，无法用来微调到某个山心。
   * 每次单步会清零惯性速度并清空小数累积，避免松手后被残余惯性「带跑」。
   */
  useEffect(() => {
    if (stepRequest === undefined || stepRequest === 0) return;
    globalMasterAngleRef.current += (SINGLE_STEP_DEG * Math.PI) / 180;
    angularVelocityRef.current = 0;
  }, [stepRequest]);

  // Main Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x04060a, 0.016);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;

    // 首帧就按真实容器宽高比把外框框进画面，而不是用 DEFAULT_CAM 里的基准值。
    // 否则窄窗口（如 891×776，aspect 1.148）首帧就会裁掉镜面铜环与底座。
    const initDist = fitCameraDistance(camera.aspect);
    cameraTargetAnglesRef.current.dist = initDist;
    cameraCurrentAnglesRef.current.dist = initDist;

    // Seed the camera exactly at the fitted pose so the first rendered frame already
    // frames the dial from the intended first-person view, with no visible
    // "fly-in" from an arbitrary start pose.
    camera.position.set(
      initDist * Math.sin(DEFAULT_CAM.phi) * Math.sin(DEFAULT_CAM.theta),
      initDist * Math.cos(DEFAULT_CAM.phi),
      initDist * Math.sin(DEFAULT_CAM.phi) * Math.cos(DEFAULT_CAM.theta)
    );
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Warm Key & Cool Rim Lighting (Studio bronze reflections)
    const ambientLight = new THREE.AmbientLight(0x4a4030, 2.0);
    scene.add(ambientLight);

    // Direct Top-Down Dial Illuminator ensuring all engraved text is vividly lit
    const topDialLight = new THREE.DirectionalLight(0xfff8ee, 2.2);
    topDialLight.position.set(0, 20, 2);
    scene.add(topDialLight);

    const keyLight = new THREE.DirectionalLight(0xffe2b8, 2.6);
    keyLight.position.set(10, 16, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    const corePointLight = new THREE.PointLight(0xf59e0b, 2.4, 14);
    corePointLight.position.set(0, 0.6, 0);
    scene.add(corePointLight);

    // Procedural Textures with maximum anisotropy for pin-sharp text
    const maxAniso = renderer.capabilities.getMaxAnisotropy() || 16;
    const tianchiTex = createTianchiTexture();
    tianchiTex.anisotropy = maxAniso;
    const compassTex = createCompassDialTexture();
    compassTex.anisotropy = maxAniso;
    const compassBumpTex = createCompassBumpTexture();
    compassBumpTex.anisotropy = maxAniso;
    const earthBaseTex = createEarthBaseTexture();
    earthBaseTex.anisotropy = maxAniso;

    // Dark Mirror Floor Plane (Real specular reflection of the rotating bronze rings)
    const mirrorFloorGeo = new THREE.CylinderGeometry(15, 15, 0.3, 64);
    const mirrorFloorMat = new THREE.MeshStandardMaterial({
      color: 0x06090e,
      roughness: 0.15,
      metalness: 0.88,
    });
    const mirrorFloor = new THREE.Mesh(mirrorFloorGeo, mirrorFloorMat);
    mirrorFloor.position.y = -3.2;
    mirrorFloor.receiveShadow = true;
    scene.add(mirrorFloor);
    mirrorFloorRef.current = mirrorFloor;

    const floorTrimGeo = new THREE.TorusGeometry(15.02, 0.08, 16, 64);
    const floorTrimMat = new THREE.MeshStandardMaterial({
      color: 0x9c7b41,
      roughness: 0.3,
      metalness: 0.9,
    });
    const floorTrim = new THREE.Mesh(floorTrimGeo, floorTrimMat);
    floorTrim.rotation.x = Math.PI / 2;
    floorTrim.position.y = -3.05;
    scene.add(floorTrim);

    // Master Luopan Assembly
    const mainAssembly = new THREE.Group();
    scene.add(mainAssembly);
    mainAssemblyRef.current = mainAssembly;

    // Square Earth Plate ("方地") with Seal Script Corners (篆书: 巽、坤、艮、乾)
    const baseGeo = new THREE.BoxGeometry(15.2, 0.45, 15.2);
    // Explicitly align base plate top face UVs so corners and Little Seal Script match compass coordinates
    const bPos = baseGeo.getAttribute('position');
    const bUvs = baseGeo.getAttribute('uv');
    for (let i = 0; i < bPos.count; i++) {
      if (bPos.getY(i) > 0.1) {
        const bx = bPos.getX(i);
        const bz = bPos.getZ(i);
        bUvs.setXY(i, (bx / 15.2) + 0.5, (-bz / 15.2) + 0.5);
      }
    }
    bUvs.needsUpdate = true;

    const baseMat = new THREE.MeshStandardMaterial({
      map: earthBaseTex,
      roughness: 0.42,
      metalness: 0.12,
    });
    const basePlate = new THREE.Mesh(baseGeo, baseMat);
    basePlate.position.y = -0.32;
    basePlate.receiveShadow = true;
    mainAssembly.add(basePlate);
    basePlateRef.current = basePlate;

    /**
     * 独立的盘面圆盘 —— 罗盘形态下盘面的唯一载体，与 6 道铜环彻底解耦。
     *
     * 为什么必须独立（历史 bug 的根因）：
     *   盘面原本是靠 6 道铜环叠加拼出来的（每圈 ringMat 都挂 compassTex、
     *   UV 覆盖全盘，露出来的只有各圈环带本身）。但**铜环的物理边界和贴图的
     *   内容边界完全错位**：
     *       贴图内容边界（世界）: 1.76 / 2.50 / 3.62 / 4.43 / 5.56 / 6.40 / 7.03
     *       铜环几何边界（世界）: 2.22 / 3.12 / 4.16 / 5.26 / 6.32 / 7.25
     *   例如五行环内容是 2.50~3.62，铜环却在 3.12 切一刀 —— 直接把五行环
     *   从中间劈开，配合 ExtrudeGeometry 的 bevel 斜面，用户在近正俯视下
     *   看到的就是「内圈断层 + 文字显示不完整」。
     *   改铜环半径去凑贴图、或改贴图凑铜环都不行：两侧都有各自的约束
     *   （铜环半径服务于浑天模式的球体展开，贴图环比例服务于可读性）。
     *
     * 解法：用一个整圆圆盘承载 compassTex，连续无接缝，文字永不被切；
     * 铜环退化为纯粹的立体装饰层。
     *
     * 半径取 MAX_DIAL_RADIUS(7.25)：CircleGeometry 的 UV 是 (x/2R+0.5)，
     * 顶点 UV 半径 = 0.5；贴图最外内容 r6 的 UV 半径 = 0.485，
     * 正好铺到几何的 0.97R ≈ 7.03 世界半径，且保留少量盘沿留白。
     */
    const dialPlateMat = new THREE.MeshStandardMaterial({
      map: compassTex,
      bumpMap: compassBumpTex,
      bumpScale: 0.035,
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    });
    const dialPlateGeo = new THREE.CircleGeometry(MAX_DIAL_RADIUS, 160);
    const dialPlate = new THREE.Mesh(dialPlateGeo, dialPlateMat);
    // 旋转用外层 Group 承载，避免几何自身的 rotation.x=-90° 与自转的 rotation.z
    // 产生万向节耦合（会把圆盘转成倾斜的椭圆、看起来像断层）。
    // 结构：dialPlateGroup(绕 y 自转) > dialPlate(固定 -90° 躺平)
    const dialPlateGroup = new THREE.Group();
    /**
     * 高度：**0.16**（不是 0.24）。
     *
     * 各方高度（世界 y）：
     *   铜环 ringMesh     0.06，顶面 0.06 + thickness(0.10~0.15) ≈ 0.16~0.21
     *   天池圆柱          中心 0.12、高 0.22 → 顶面 0.23
     *   盘面圆盘          ← 本值
     *   磁针 needleGroup  0.28
     *
     * 盘面取 0.16 的理由：
     *   - 高于「铜环底面 0.06」，与铜环错开，浑天切换时不会穿插；
     *   - 低于「铜环最高顶面 0.21」——看似矛盾，但罗盘形态下铜环整组
     *     visible=false，实际不存在穿插；而浑天形态下盘面 opacity→0
     *     并 visible=false，两者互斥，所以取哪个高度都不会真穿插。
     *   - **必须低于天池顶面 0.23**：天池（太极 + 玻璃罩 + 磁针）是盘面
     *     中心的实体，盘面若高于它会把天池盖掉一半（曾用 0.24 时，
     *     天池圆柱顶面被盘面切掉，看起来中心"缺了一块"）。
     *   - 高于底座顶面 -0.32+0.225 = -0.095，确保盘面永远浮在方台之上。
     */
    dialPlateGroup.position.y = 0.16;
    dialPlate.rotation.x = -Math.PI / 2;
    dialPlate.receiveShadow = true;
    dialPlateGroup.add(dialPlate);
    mainAssembly.add(dialPlateGroup);
    dialPlateRef.current = dialPlateGroup;

    // Central Tianchi Hub ("天池太极")
    const tianchiHub = new THREE.Group();
    mainAssembly.add(tianchiHub);
    tianchiHubRef.current = tianchiHub;

    const tianchiCylinderGeo = new THREE.CylinderGeometry(1.38, 1.38, 0.22, 64);
    // Explicitly align Tianchi top cap UVs to guarantee correct non-mirrored cardinal rendering
    const tPos = tianchiCylinderGeo.getAttribute('position');
    const tUvs = tianchiCylinderGeo.getAttribute('uv');
    for (let i = 0; i < tPos.count; i++) {
      if (tPos.getY(i) > 0.05) {
        const tx = tPos.getX(i);
        const tz = tPos.getZ(i);
        tUvs.setXY(i, (tx / 2.76) + 0.5, (-tz / 2.76) + 0.5);
      }
    }
    tUvs.needsUpdate = true;

    const tianchiMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0xb58e45,
        roughness: 0.25,
        metalness: 0.85,
      }),
      new THREE.MeshStandardMaterial({
        map: tianchiTex,
        roughness: 0.35,
        metalness: 0.08,
      }),
      new THREE.MeshStandardMaterial({ color: 0x05070a }),
    ];
    const tianchiMesh = new THREE.Mesh(tianchiCylinderGeo, tianchiMaterials);
    tianchiMesh.position.y = 0.12;
    tianchiMesh.receiveShadow = true;
    tianchiHub.add(tianchiMesh);

    // Glass Crystal Dome (琉璃水罩)
    const domeGeo = new THREE.SphereGeometry(1.4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      transmission: 0.88,
      ior: 1.45,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const glassDome = new THREE.Mesh(domeGeo, domeMat);
    glassDome.position.y = 0.12;
    tianchiHub.add(glassDome);

    // 3D Magnetic Needle (红头天池磁针)
    const needleGroup = new THREE.Group();
    needleGroup.position.set(0, 0.28, 0);
    tianchiHub.add(needleGroup);
    needleGroupRef.current = needleGroup;

    const pivotGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16);
    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xd90429,
      roughness: 0.2,
      metalness: 0.9,
    });
    needleGroup.add(new THREE.Mesh(pivotGeo, rubyMat));

    const southNeedleGeo = new THREE.ConeGeometry(0.09, 1.05, 4);
    const southNeedleMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.25,
      metalness: 0.85,
    });
    const southNeedle = new THREE.Mesh(southNeedleGeo, southNeedleMat);
    southNeedle.rotation.x = Math.PI / 2;
    southNeedle.position.z = 0.52;
    needleGroup.add(southNeedle);

    const northNeedleGeo = new THREE.ConeGeometry(0.09, 0.95, 4);
    const northNeedleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.95,
    });
    const northNeedle = new THREE.Mesh(northNeedleGeo, northNeedleMat);
    northNeedle.rotation.x = -Math.PI / 2;
    northNeedle.position.z = -0.47;
    needleGroup.add(northNeedle);

    // The 6 Concentric Physical Bronze Armillary Rings
    ringNodesRef.current = [];
    const maxDialRadius = MAX_DIAL_RADIUS;

    ARMILLARY_RINGS.forEach((config) => {
      const gimbalGroup = new THREE.Group();
      mainAssembly.add(gimbalGroup);

      const spinGroup = new THREE.Group();
      gimbalGroup.add(spinGroup);

      const shape = new THREE.Shape();
      shape.absarc(0, 0, config.outerRadius, 0, Math.PI * 2, false);
      // innerRadius 为 0 时不要挖 hole —— 半径 0 的 Path 是退化环面，
      // 会让 ExtrudeGeometry 的三角化产生 NaN 或破洞。
      // 无缝化后第 0 圈正是这种情况，实心圆盘正好替代「天池外的地盘」。
      if (config.innerRadius > 0.001) {
        const hole = new THREE.Path();
        hole.absarc(0, 0, config.innerRadius, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }

      const ringGeom = new THREE.ExtrudeGeometry(shape, {
        depth: config.thickness,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.006,
        bevelThickness: 0.008,
        curveSegments: 96,
      });

      const posAttr = ringGeom.getAttribute('position');
      const uvs = new Float32Array(posAttr.count * 2);
      const mirrorSign = isMirroredTextRef.current ? -1 : 1;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        uvs[i * 2] = (mirrorSign * x / maxDialRadius) * 0.5 + 0.5;
        uvs[i * 2 + 1] = (-y / maxDialRadius) * 0.5 + 0.5;
      }
      ringGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

      const ringMat = new THREE.MeshStandardMaterial({
        map: compassTex,
        bumpMap: compassBumpTex,
        bumpScale: 0.035,
        roughness: 0.62,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });

      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.06;
      ringMesh.castShadow = true;
      ringMesh.receiveShadow = true;
      spinGroup.add(ringMesh);

      // Gold Bevel Edge Rings (精确贴合环边缘)
      const outerCollarGeo = new THREE.TorusGeometry(config.outerRadius, 0.02, 8, 96);
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0xdeb86b,
        roughness: 0.2,
        metalness: 0.95,
      });
      const outerCollar = new THREE.Mesh(outerCollarGeo, collarMat);
      outerCollar.rotation.x = Math.PI / 2;
      outerCollar.position.y = 0.06;
      outerCollar.userData.isArmillaryCollar = true;
      spinGroup.add(outerCollar);

      const innerCollarGeo = new THREE.TorusGeometry(config.innerRadius, 0.02, 8, 96);
      const innerCollar = new THREE.Mesh(innerCollarGeo, collarMat);
      innerCollar.rotation.x = Math.PI / 2;
      innerCollar.position.y = 0.06;
      innerCollar.userData.isArmillaryCollar = true;
      spinGroup.add(innerCollar);

      // ★ 微细浮雕纹路间隔带（青铜连珠乳钉浮雕圈）
      // 依附于 spinGroup，在环自转、单步拨动或浑天差速转动时，纹理严格随环同步旋转
      const beadCount = Math.round(config.outerRadius * 16);
      const beadGeo = new THREE.SphereGeometry(0.018, 8, 6);
      const beadMat = new THREE.MeshStandardMaterial({
        color: 0xf5d070,
        roughness: 0.22,
        metalness: 0.94,
      });
      const reliefBeadsMesh = new THREE.InstancedMesh(beadGeo, beadMat, beadCount);
      reliefBeadsMesh.userData.isArmillaryCollar = true;
      const beadDummy = new THREE.Object3D();
      for (let b = 0; b < beadCount; b++) {
        const beadAngle = (b * Math.PI * 2) / beadCount;
        beadDummy.position.set(
          Math.cos(beadAngle) * config.outerRadius,
          0.065, // 微微凸起于铜环顶面 0.06，在场景光线下形成立体浮雕高光与接触阴影
          Math.sin(beadAngle) * config.outerRadius
        );
        beadDummy.scale.set(1, 0.72, 1);
        beadDummy.updateMatrix();
        reliefBeadsMesh.setMatrixAt(b, beadDummy.matrix);
      }
      reliefBeadsMesh.instanceMatrix.needsUpdate = true;
      spinGroup.add(reliefBeadsMesh);

      // 4 Quadrant Gimbal Pivots (居中镶嵌于铜环厚度侧翼)
      for (let p = 0; p < 4; p++) {
        const angle = (p * Math.PI) / 2;
        const pivotPinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12);
        const pivotPin = new THREE.Mesh(pivotPinGeo, collarMat);
        pivotPin.position.set(
          Math.cos(angle) * (config.outerRadius + 0.02),
          0.06 - config.thickness / 2,
          Math.sin(angle) * (config.outerRadius + 0.02)
        );
        pivotPin.rotation.z = Math.PI / 2;
        pivotPin.userData.isArmillaryCollar = true;
        spinGroup.add(pivotPin);
      }

      ringNodesRef.current.push({
        gimbalGroup,
        spinGroup,
        mesh: ringMesh,
        config,
        localAngle: 0,
      });
    });

    // Animation Loop with Pure Tangible Mechanics (No floating particle dots)
    let animationFrameId: number;
    const clock = new THREE.Clock();
    /**
     * 自建 elapsed 累加器，不能用 clock.getElapsedTime()。
     *
     * THREE.Clock.getElapsedTime() 内部就是 getDelta() + 累加，
     * 两者共用 oldTime。若同帧内先调 getElapsedTime() 再调 getDelta()，
     * 第二次拿到的 delta ≈ 0，转速会整体塌成 0。因此这里只用 getDelta()，
     * 自己维护 elapsedTime。
     */
    let elapsedTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      // Clamp to 0.1s: after the tab is backgrounded, rAF can fire with a multi-second
      // gap, which would teleport the dial forward by several degrees in one frame.
      const deltaSeconds = Math.min(clock.getDelta(), 0.1);
      elapsedTime += deltaSeconds;
      // Frame-rate independent damping factor: equivalent to *0.94 on a 60fps frame,
      // so inertia decays at the same real-world rate on 60Hz / 120Hz / 144Hz displays.
      const frameDamping = Math.pow(0.94, deltaSeconds * 60);
      const currentScale = speedScaleRef.current;

      // Master Auto-Rotation: Dignified, slow, tranquil
      if (!isDraggingRef.current) {
        if (isAutoRotate) {
          // Clock-hand style: constant ROTATION_DEG_PER_SEC degrees per real second,
          // fully frame-rate independent (1 deg/s at 60Hz, 120Hz and 144Hz alike).
          globalMasterAngleRef.current +=
            ((ROTATION_DEG_PER_SEC * currentScale * deltaSeconds) * Math.PI) / 180;
        } else {
          // Manual flick inertia: angularVelocityRef is expressed in rad/frame-at-60Hz,
          // so multiply by (deltaSeconds * 60) to convert it into a real-time increment.
          globalMasterAngleRef.current += angularVelocityRef.current * deltaSeconds * 60;
          angularVelocityRef.current *= frameDamping;
          if (Math.abs(angularVelocityRef.current) < 0.0001) {
            angularVelocityRef.current = 0;
          }
        }
      }

      // Smooth Armillary Gimbal Interpolation
      const currentProgress = currentArmillaryProgressRef.current;

      // Exponential smoothing converted from a per-frame factor to a per-second one.
      // lerp(k) at 60fps == 1 - (1-k)^(dt*60) at any refresh rate, so the easing
      // curve (camera moves, base plate settle, gimbal tilt) takes the same
      // wall-clock time on a 60Hz laptop and a 144Hz monitor.
      const lerp = (k: number) => 1 - Math.pow(1 - k, deltaSeconds * 60);
      const lerpBase = lerp(0.08);
      const lerpGimbal = lerp(0.06);
      const lerpCam = lerp(0.05);

      if (basePlateRef.current) {
        const targetBaseY = currentProgress > 0.05 ? -1.8 * currentProgress : -0.32;
        basePlateRef.current.position.y += (targetBaseY - basePlateRef.current.position.y) * lerpBase;
        (basePlateRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - currentProgress * 0.75;
        (basePlateRef.current.material as THREE.MeshStandardMaterial).transparent = true;
      }

      // Needle Dynamics
      if (needleGroupRef.current) {
        const needleWobble = Math.sin(elapsedTime * 1.8) * 0.02 * (1 + Math.abs(angularVelocityRef.current) * 3);
        needleGroupRef.current.rotation.y = -globalMasterAngleRef.current * 0.2 + needleWobble;
      }

      // Rotate Armillary Rings
      const speedMultiplier = (1 + Math.abs(angularVelocityRef.current) * 6) * currentScale;
      const ringFrameScale = deltaSeconds * 60;

      /**
       * 盘面（dialPlateRef）与铜环互斥：
       *   罗盘形态 → 显示独立盘面圆盘，隐藏整组铜环；
       *   浑天/分层/元素/吐纳/展开 → 隐藏盘面圆盘，显示铜环。
       *
       * 历史脉络（本轮第三次重构，前两次都失败，结论记牢）：
       *   1) 最初盘面靠 6 道铜环叠加（每圈挂同一张 compassTex、UV 覆盖全盘），
       *      整组隐藏会让盘面消失 → 只能隐金边圈；
       *   2) 试图无缝化 6 圈半径消 Jakob 缝隙，但**铜环物理边界与贴图内容边界
       *      根本没对齐**（3.12 落在五行环 2.50~3.62 中间），bevel 斜面照样
       *      把内容环切断 → 用户反馈「内圈断层 + 文字显示不完整」；
       *   3) 正解：另建一个 CircleGeometry 整盘承载 compassTex，
       *      盘面从此连续无接缝，铜环退化为纯装饰层、可整组隐藏。
       *
       * opacity 淡入淡出用各自的独立材质：dialPlateMat 与 collarMat 各一份，
       * 不共享（copper ring 的 collarMat 仍被 6 圈共用，不能改）。
       */
      const flatMode = !showArmillaryRingsRef.current && currentProgress <= 0.02;

      // 盘面圆盘：罗盘形态淡入，展开时淡出
      if (dialPlateRef.current) {
        const mesh = dialPlateRef.current.children[0] as THREE.Mesh | undefined;
        const mat = mesh?.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          const targetOpacity = flatMode ? 1 : 0;
          mat.opacity += (targetOpacity - mat.opacity) * lerpBase;
          // 首帧已由材质初始 opacity=1 保证满不透明，无需特判；
          // 阈值 0.02 避免 alpha 极小时仍参与混合导致远景泛白。
          dialPlateRef.current.visible = mat.opacity > 0.02;
        }
      }

      // 铜环：与盘面相反
      const showRings = !flatMode;
      ringNodesRef.current.forEach((node) => {
        const targetTiltX = node.config.tiltX * currentProgress;
        const targetTiltZ = node.config.tiltZ * currentProgress;
        node.gimbalGroup.rotation.x += (targetTiltX - node.gimbalGroup.rotation.x) * lerpGimbal;
        node.gimbalGroup.rotation.z += (targetTiltZ - node.gimbalGroup.rotation.z) * lerpGimbal;

        // 差速自转仅在浑天仪展开状态下驱动；合盘归位时平滑收拢回 0，避免错位
        if (currentProgress > 0.02) {
          node.localAngle +=
            node.config.baseSpinSpeed * node.config.direction * speedMultiplier * ringFrameScale * Math.min(1, currentProgress * 1.5);
        } else {
          node.localAngle *= Math.pow(0.85, ringFrameScale);
          if (Math.abs(node.localAngle) < 0.0001) node.localAngle = 0;
        }

        // 基础自转锚定 globalMasterAngle，差速随 progress 比例展开，保证合盘时各环角度严丝合缝
        node.spinGroup.rotation.y = globalMasterAngleRef.current + node.localAngle * currentProgress;

        // 罗盘形态下整组隐藏（盘面已由独立圆盘承载），立体形态恢复。
        node.spinGroup.visible = showRings;
      });

      /**
       * 盘面跟随主总成自转。
       *
       * 必须用 rotation.y、且符号与铜环一致：
       * 铜环是 `spinGroup.rotation.y = globalMasterAngle`，
       * 盘面若用 rotation.z 或取负号，会与 HUD 读数反向 —— 指针指「子」而盘面转去「午」。
       * 外层 Group 只为提供干净的 y 轴旋转，几何自身的 -90° 躺平在内层 Mesh 上，
       * 两者互不干扰（用同一个 Mesh 同时做 x 与 z 旋转会万向节耦合、盘面歪成椭圆）。
       */
      if (dialPlateRef.current) {
        dialPlateRef.current.rotation.y = globalMasterAngleRef.current;
      }

      // Report energy and angle.
      // angularVelocityRef only carries MANUAL flick inertia (it stays 0 during
      // auto-rotation), so reporting it alone would make the speed readout read
      // "idle" even while the dial is turning. Report the real angular speed in
      // rad/s from whichever mechanism is currently driving the dial.
      const autoAngularSpeed = isAutoRotate
        ? (ROTATION_DEG_PER_SEC * currentScale * Math.PI) / 180
        : 0;
      const currentAngularSpeed = Math.abs(angularVelocityRef.current * 60) + autoAngularSpeed;

      const currentEnergy = Math.min(
        100,
        Math.round(25 + currentAngularSpeed * 190 + currentProgress * 30 + Math.sin(elapsedTime * 1.2) * 5)
      );
      onEnergyChange(currentEnergy);
      onRotationChange(
        ((((globalMasterAngleRef.current * 180) / Math.PI) % 360) + 360) % 360,
        currentAngularSpeed
      );

      // Rotational chime
      if (Math.abs(angularVelocityRef.current) > 0.015 && Date.now() - lastResonanceSoundTimeRef.current > 420) {
        audioEngine.playCompassRotationResonance(angularVelocityRef.current * 80);
        lastResonanceSoundTimeRef.current = Date.now();
      }

      // Camera Interpolation
      const curCam = cameraCurrentAnglesRef.current;
      const tgtCam = cameraTargetAnglesRef.current;
      curCam.theta += (tgtCam.theta - curCam.theta) * lerpCam;
      curCam.phi += (tgtCam.phi - curCam.phi) * lerpCam;
      curCam.dist += (tgtCam.dist - curCam.dist) * lerpCam;

      const camX = curCam.dist * Math.sin(curCam.phi) * Math.sin(curCam.theta);
      const camY = curCam.dist * Math.cos(curCam.phi);
      const camZ = curCam.dist * Math.sin(curCam.phi) * Math.cos(curCam.theta);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    /**
     * 视口变化时，除了更新 aspect，还必须**重算相机距离**。
     *
     * 相机 FOV 定义在垂直方向，水平可视宽度 = 垂直可视高度 × aspect，
     * 所以同一个 dist 在不同宽高比下能容纳的世界尺寸完全不同。
     * 固定 dist 会导致窄窗口裁掉镜面铜环与底座、宽窗口又离得过远。
     * 这里按 fitCameraDistance 拉回「外框刚好完整入画」的距离。
     * 用户若手动缩放过（dist 偏离基准超过 25%），则尊重用户操作不再强制覆盖。
     */
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);

      const fitDist = fitCameraDistance(camera.aspect);
      const current = cameraTargetAnglesRef.current.dist;
      // 基准也随视口变化，不能拿固定的 DEFAULT_CAM.dist 比对
      const baseDist = fitCameraDistance(1.6);
      const userZoomed = Math.abs(current - baseDist) / baseDist > 0.25;
      if (!userZoomed) {
        cameraTargetAnglesRef.current.dist = fitDist;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [viewMode, isAutoRotate, onEnergyChange, onRotationChange]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevPointerPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.button === 2 || e.shiftKey || dragModeRef.current === 'orbit') {
      dragModeRef.current = 'orbit';
    } else {
      dragModeRef.current = 'spin';
    }

    audioEngine.playCompassRotationResonance(0.3);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - prevPointerPosRef.current.x;
    const dy = e.clientY - prevPointerPosRef.current.y;
    prevPointerPosRef.current = { x: e.clientX, y: e.clientY };

    if (dragModeRef.current === 'orbit') {
      cameraTargetAnglesRef.current.theta += dx * 0.006;
      cameraTargetAnglesRef.current.phi = Math.max(
        0.15,
        Math.min(Math.PI * 0.48, cameraTargetAnglesRef.current.phi - dy * 0.006)
      );
    } else {
      const deltaAngle = dx * 0.006 + dy * -0.003;
      globalMasterAngleRef.current += deltaAngle;
      angularVelocityRef.current = deltaAngle * 0.6;
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    // 缩放范围围绕「当前视口的自适应基准距离」取相对倍数，
    // 不能再用固定的 [9, 26] —— 那是按旧硬编码 dist=22.0 设的，
    // 自适应后窄窗口基准可达 45+，固定上限会立刻把用户锁在极近处。
    const cam = cameraRef.current;
    const base = fitCameraDistance(cam ? cam.aspect : 1.6);
    cameraTargetAnglesRef.current.dist = Math.max(
      base * 0.55,
      Math.min(base * 1.9, cameraTargetAnglesRef.current.dist + e.deltaY * 0.015)
    );
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#04060a]">
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* 左下角三按钮（拨动罗盘 / 三维天球视角 / 镜像翻转文字）已融合进顶栏「操盘」抽屉，
       * 此处不再重复渲染，避免同一能力两处入口。 */}

      {/* Subtle Hint */}
      <div className="absolute bottom-6 left-6 z-10 hidden sm:flex items-center gap-2 text-[15px] text-[#c5a059]/80 font-serif-sc">
        <span>金铜重规 · 纯粹原器</span>
        <span aria-hidden="true">·</span>
        <span>浑天仪立体转动</span>
        <span aria-hidden="true">·</span>
        <span>滚轮缩放视野</span>
      </div>
    </div>
  );
};
