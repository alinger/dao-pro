import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createTianchiTexture,
  createCompassDialTexture,
  createEarthBaseTexture,
} from '../utils/textureGenerator';
import { audioEngine } from '../utils/audio';
import { ElementType, ViewMode, ArmillaryRingConfig } from '../types/tao';

export const ARMILLARY_RINGS: ArmillaryRingConfig[] = [
  {
    name: '先天八卦环',
    innerRadius: 1.45,
    outerRadius: 2.22,
    thickness: 0.10,
    tiltX: 0.52,   // ~30°
    tiltZ: 0.45,   // ~26°
    baseSpinSpeed: 0.0022,
    direction: 1,
  },
  {
    name: '五行生克环',
    innerRadius: 2.28,
    outerRadius: 3.12,
    thickness: 0.10,
    tiltX: -0.68,  // ~-39°
    tiltZ: -0.42,  // ~-24°
    baseSpinSpeed: -0.0025,
    direction: -1,
  },
  {
    name: '道历二十四节气天环',
    innerRadius: 3.18,
    outerRadius: 4.16,
    thickness: 0.12,
    tiltX: 0.92,   // ~53°
    tiltZ: -0.72,  // ~-41°
    baseSpinSpeed: 0.0028,
    direction: 1,
  },
  {
    name: '二十四山神位天环',
    innerRadius: 4.22,
    outerRadius: 5.26,
    thickness: 0.12,
    tiltX: -1.18,  // ~-68°
    tiltZ: 0.88,   // ~50°
    baseSpinSpeed: -0.0020,
    direction: -1,
  },
  {
    name: '二十八宿四象天纬环',
    innerRadius: 5.32,
    outerRadius: 6.32,
    thickness: 0.14,
    tiltX: 1.42,   // ~81° (Meridian ring)
    tiltZ: 0.22,   // ~13°
    baseSpinSpeed: 0.0016,
    direction: 1,
  },
  {
    name: '周天赤道道历天铭环',
    innerRadius: 6.38,
    outerRadius: 7.22,
    thickness: 0.15,
    tiltX: -0.32,  // ~-18°
    tiltZ: -1.38,  // ~-79° (Equatorial ring)
    baseSpinSpeed: -0.0014,
    direction: -1,
  },
];

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
}

export const Luopan3D: React.FC<Luopan3DProps> = ({
  viewMode,
  armillaryProgress,
  onRotationChange,
  onEnergyChange,
  isAutoRotate,
  speedScale = 1.0,
  targetOrientationAngle = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Mesh & Assembly references
  const mainAssemblyRef = useRef<THREE.Group | null>(null);
  const basePlateRef = useRef<THREE.Mesh | null>(null);
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
  const globalMasterAngleRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const cameraTargetAnglesRef = useRef({ theta: 0.15, phi: 1.15, dist: 16.8 });
  const cameraCurrentAnglesRef = useRef({ theta: 0.15, phi: 1.15, dist: 16.8 });
  const currentArmillaryProgressRef = useRef(armillaryProgress);
  const speedScaleRef = useRef(speedScale);
  const lastResonanceSoundTimeRef = useRef(0);

  const [touchInstruction, setTouchInstruction] = useState<'spin' | 'orbit'>('spin');
  const [isMirroredText, setIsMirroredText] = useState<boolean>(false);
  const isMirroredTextRef = useRef<boolean>(false);

  useEffect(() => {
    currentArmillaryProgressRef.current = armillaryProgress;
  }, [armillaryProgress]);

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
    if (viewMode === 'armillary') {
      cameraTargetAnglesRef.current = { theta: 0.45, phi: 1.25, dist: 17.5 };
    } else if (viewMode === 'exploded') {
      cameraTargetAnglesRef.current = { theta: 0.35, phi: 1.15, dist: 18.0 };
      audioEngine.playBronzeBell();
    } else if (viewMode === 'meditation') {
      cameraTargetAnglesRef.current = { theta: 0, phi: 0.35, dist: 13.5 };
      audioEngine.setMeditationDrone(true);
    } else {
      audioEngine.setMeditationDrone(false);
      cameraTargetAnglesRef.current = { theta: 0.15, phi: 1.05, dist: 16.0 };
    }
  }, [viewMode]);

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
    camera.position.set(0, 11, 15);
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
    const maxDialRadius = 7.25;

    ARMILLARY_RINGS.forEach((config) => {
      const gimbalGroup = new THREE.Group();
      mainAssembly.add(gimbalGroup);

      const spinGroup = new THREE.Group();
      gimbalGroup.add(spinGroup);

      const shape = new THREE.Shape();
      shape.absarc(0, 0, config.outerRadius, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, config.innerRadius, 0, Math.PI * 2, true);
      shape.holes.push(hole);

      const ringGeom = new THREE.ExtrudeGeometry(shape, {
        depth: config.thickness,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.02,
        bevelThickness: 0.02,
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
        roughness: 0.40,
        metalness: 0.12,
        side: THREE.DoubleSide,
      });

      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.06;
      ringMesh.castShadow = true;
      ringMesh.receiveShadow = true;
      spinGroup.add(ringMesh);

      // Gold Bevel Edge Rings
      const outerCollarGeo = new THREE.TorusGeometry(config.outerRadius, 0.025, 8, 96);
      const collarMat = new THREE.MeshStandardMaterial({
        color: 0xdeb86b,
        roughness: 0.2,
        metalness: 0.95,
      });
      const outerCollar = new THREE.Mesh(outerCollarGeo, collarMat);
      outerCollar.rotation.x = Math.PI / 2;
      outerCollar.position.y = 0.06 + config.thickness / 2;
      spinGroup.add(outerCollar);

      const innerCollarGeo = new THREE.TorusGeometry(config.innerRadius, 0.025, 8, 96);
      const innerCollar = new THREE.Mesh(innerCollarGeo, collarMat);
      innerCollar.rotation.x = Math.PI / 2;
      innerCollar.position.y = 0.06 + config.thickness / 2;
      spinGroup.add(innerCollar);

      // 4 Quadrant Gimbal Pivots
      for (let p = 0; p < 4; p++) {
        const angle = (p * Math.PI) / 2;
        const pivotPinGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12);
        const pivotPin = new THREE.Mesh(pivotPinGeo, collarMat);
        pivotPin.position.set(
          Math.cos(angle) * (config.outerRadius + 0.04),
          0.06,
          Math.sin(angle) * (config.outerRadius + 0.04)
        );
        pivotPin.rotation.z = Math.PI / 2;
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

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const currentScale = speedScaleRef.current;

      // Master Auto-Rotation: Dignified, slow, tranquil
      if (!isDraggingRef.current) {
        if (isAutoRotate) {
          globalMasterAngleRef.current += 0.0012 * currentScale;
        } else {
          globalMasterAngleRef.current += angularVelocityRef.current;
          angularVelocityRef.current *= 0.94;
          if (Math.abs(angularVelocityRef.current) < 0.0001) {
            angularVelocityRef.current = 0;
          }
        }
      }

      // Smooth Armillary Gimbal Interpolation
      const currentProgress = currentArmillaryProgressRef.current;

      if (basePlateRef.current) {
        const targetBaseY = currentProgress > 0.05 ? -1.8 * currentProgress : -0.32;
        basePlateRef.current.position.y += (targetBaseY - basePlateRef.current.position.y) * 0.08;
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
      ringNodesRef.current.forEach((node) => {
        const targetTiltX = node.config.tiltX * currentProgress;
        const targetTiltZ = node.config.tiltZ * currentProgress;
        node.gimbalGroup.rotation.x += (targetTiltX - node.gimbalGroup.rotation.x) * 0.06;
        node.gimbalGroup.rotation.z += (targetTiltZ - node.gimbalGroup.rotation.z) * 0.06;

        node.localAngle += node.config.baseSpinSpeed * node.config.direction * speedMultiplier;
        node.spinGroup.rotation.y = globalMasterAngleRef.current * (1 - currentProgress) + node.localAngle;
      });

      // Report energy and angle
      const currentEnergy = Math.min(
        100,
        Math.round(25 + Math.abs(angularVelocityRef.current) * 600 + currentProgress * 30 + Math.sin(elapsedTime * 1.2) * 5)
      );
      onEnergyChange(currentEnergy);
      onRotationChange(
        ((((globalMasterAngleRef.current * 180) / Math.PI) % 360) + 360) % 360,
        Math.abs(angularVelocityRef.current)
      );

      // Rotational chime
      if (Math.abs(angularVelocityRef.current) > 0.015 && Date.now() - lastResonanceSoundTimeRef.current > 420) {
        audioEngine.playCompassRotationResonance(angularVelocityRef.current * 80);
        lastResonanceSoundTimeRef.current = Date.now();
      }

      // Camera Interpolation
      const curCam = cameraCurrentAnglesRef.current;
      const tgtCam = cameraTargetAnglesRef.current;
      curCam.theta += (tgtCam.theta - curCam.theta) * 0.05;
      curCam.phi += (tgtCam.phi - curCam.phi) * 0.05;
      curCam.dist += (tgtCam.dist - curCam.dist) * 0.05;

      const camX = curCam.dist * Math.sin(curCam.phi) * Math.sin(curCam.theta);
      const camY = curCam.dist * Math.cos(curCam.phi);
      const camZ = curCam.dist * Math.sin(curCam.phi) * Math.cos(curCam.theta);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
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
    cameraTargetAnglesRef.current.dist = Math.max(
      9.0,
      Math.min(26.0, cameraTargetAnglesRef.current.dist + e.deltaY * 0.015)
    );
  };

  const toggleGestureMode = (mode: 'spin' | 'orbit') => {
    dragModeRef.current = mode;
    setTouchInstruction(mode);
    audioEngine.playBronzeBell();
  };

  const toggleTextMirror = () => {
    const nextState = !isMirroredText;
    setIsMirroredText(nextState);
    isMirroredTextRef.current = nextState;
    const sign = nextState ? -1 : 1;
    ringNodesRef.current.forEach(({ mesh }) => {
      const geom = mesh.geometry;
      const pos = geom.getAttribute('position');
      const uvAttr = geom.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvAttr.setXY(i, (sign * x / 7.25) * 0.5 + 0.5, (-y / 7.25) * 0.5 + 0.5);
      }
      uvAttr.needsUpdate = true;
    });
    audioEngine.playBronzeBell();
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

      {/* Floating Gesture Mode Switcher */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 p-1 bg-black/55 backdrop-blur-md border border-[#c5a059]/25 rounded-lg shadow-xl text-xs">
        <button
          onClick={() => toggleGestureMode('spin')}
          className={`px-3 py-1.5 font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
            touchInstruction === 'spin'
              ? 'bg-[#c5a059] text-black shadow-sm font-semibold'
              : 'text-[#c5a059]/80 hover:text-[#e8dcb8]'
          }`}
        >
          拨动罗盘
        </button>
        <button
          onClick={() => toggleGestureMode('orbit')}
          className={`px-3 py-1.5 font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
            touchInstruction === 'orbit'
              ? 'bg-[#c5a059] text-black shadow-sm font-semibold'
              : 'text-[#c5a059]/80 hover:text-[#e8dcb8]'
          }`}
        >
          三维天球视角
        </button>
        <button
          onClick={toggleTextMirror}
          className={`px-3 py-1.5 font-medium rounded-md transition-all whitespace-nowrap cursor-pointer border ${
            isMirroredText
              ? 'bg-[#c5a059]/25 text-[#ffd54f] border-[#c5a059]/60'
              : 'text-[#c5a059]/80 hover:text-[#e8dcb8] border-[#c5a059]/20'
          }`}
          title="切换罗盘文字正反镜像"
        >
          {isMirroredText ? '恢复正向文字' : '镜像翻转文字'}
        </button>
      </div>

      {/* Subtle Hint */}
      <div className="absolute bottom-6 right-6 z-10 hidden sm:flex items-center gap-2 text-xs text-[#c5a059]/60 font-serif-sc">
        <span>金铜重规 · 纯粹原器</span>
        <span aria-hidden="true">·</span>
        <span>浑天仪立体转动</span>
        <span aria-hidden="true">·</span>
        <span>滚轮缩放视野</span>
      </div>
    </div>
  );
};
