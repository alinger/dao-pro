import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Luopan3D } from './components/Luopan3D';
import { HUDTopBar, DragMode } from './components/HUDTopBar';
import { EnergyGauge } from './components/EnergyGauge';
import { ElementSelector } from './components/ElementSelector';
import { ElementDetailModal } from './components/ElementDetailModal';
import { MeditationOverlay } from './components/MeditationOverlay';
import { ArmillaryControls } from './components/ArmillaryControls';
import { TaoCalendarBadge } from './components/TaoCalendarBadge';
import { ViewMode, ElementType } from './types/tao';
import { audioEngine } from './utils/audio';
import { bearingStore } from './utils/bearingStore';
import { BearingReadout } from './components/BearingReadout';
import { DaoWisdomDrawer } from './components/DaoWisdomDrawer';
import { UserManualModal } from './components/UserManualModal';
import bgImage from './assets/images/taoist_celestial_nebula_1791281164720.jpg';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('compass');
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  const [selectedTrigram, setSelectedTrigram] = useState<string | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speedScale, setSpeedScale] = useState<number>(1.0); // 1.0 = 1°/s，秒针式基准速度
  const [targetOrientationAngle, setTargetOrientationAngle] = useState<number | null>(null);
  /** 罗盘 3D 贴图左右镜像态（上提至 App，供 HUD 读数感知） */
  const [isMirroredDial, setIsMirroredDial] = useState<boolean>(false);
  /** 单步请求计数器：每次 +1 传给 Luopan3D 触发一次拨齿（用计数而非 boolean 以支持连点） */
  const [stepRequest, setStepRequest] = useState<number>(0);
  /** 拖拽手势模式：上提至 App，使顶栏「操盘」抽屉成为唯一入口（原在 Luopan3D 内部 state） */
  const [dragMode, setDragMode] = useState<DragMode>('spin');
  /** 道韵百科侧边抽屉开合态与初始词条 */
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState<boolean>(false);
  const [encyclopediaTopic, setEncyclopediaTopic] = useState<string>('子');
  /** 使用手册全景页面模态窗开合态 */
  const [isUserManualOpen, setIsUserManualOpen] = useState<boolean>(false);

  // Armillary Sphere transformation progress (0 = Flat Luopan, 1 = Full 3D Armillary Sphere)
  const [armillaryProgress, setArmillaryProgress] = useState<number>(0);
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);

  // Real-time telemetry from 3D physics
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(35);

  // 镜像态 ref：供 60fps 高频回调读取，避免闭包捕获旧值
  const isMirroredDialRef = useRef<boolean>(false);
  useEffect(() => {
    isMirroredDialRef.current = isMirroredDial;
    bearingStore.publish(currentAngle, isMirroredDial);
  }, [isMirroredDial, currentAngle]);

  // Smooth animation interpolation for armillary transformation
  useEffect(() => {
    let animId: number;
    const updateProgress = () => {
      const diff = targetProgressRef.current - currentProgressRef.current;
      if (Math.abs(diff) > 0.002) {
        currentProgressRef.current += diff * 0.08;
        setArmillaryProgress(currentProgressRef.current);
      } else if (currentProgressRef.current !== targetProgressRef.current) {
        currentProgressRef.current = targetProgressRef.current;
        setArmillaryProgress(targetProgressRef.current);
      }
      animId = requestAnimationFrame(updateProgress);
    };
    animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRotationChange = useCallback((angle: number, speed: number) => {
    setCurrentAngle(angle);
    setRotationSpeed(speed);
    // 广播给 HUD 方位读数（命令式更新，不触发额外 React 渲染）
    bearingStore.publish(angle, isMirroredDialRef.current);
  }, []);

  const handleEnergyChange = useCallback((energy: number) => {
    setEnergyLevel(energy);
  }, []);

  const handleToggleAutoRotate = () => {
    setIsAutoRotate((prev) => !prev);
    audioEngine.playBronzeBell();
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  /**
   * 拨齿：手动推进一个刻度。
   * 同时自动暂停自转——单步的语义是「我要停在这一格精调」，
   * 若继续自转，拨完立刻又飘走，失去单步意义。
   */
  const handleStep = () => {
    setIsAutoRotate(false);
    setStepRequest((prev) => prev + 1);
    audioEngine.playBronzeBell();
  };

  const handleModeSelect = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'armillary') {
      targetProgressRef.current = 1.0;
      audioEngine.playArmillaryDeploy();
    } else if (mode === 'compass') {
      targetProgressRef.current = 0.0;
      audioEngine.playArmillarySnap();
    }
    if (mode === 'elements' && !selectedElement) {
      setSelectedElement('wood');
    }
  };

  const handleToggleArmillary = () => {
    if (targetProgressRef.current > 0.5) {
      targetProgressRef.current = 0.0;
      setViewMode('compass');
      audioEngine.playArmillarySnap();
    } else {
      targetProgressRef.current = 1.0;
      setViewMode('armillary');
      audioEngine.playArmillaryDeploy();
    }
  };

  const handleManualProgressChange = (val: number) => {
    targetProgressRef.current = val;
    currentProgressRef.current = val;
    setArmillaryProgress(val);
    if (val > 0.1 && viewMode !== 'armillary') {
      setViewMode('armillary');
    }
  };

  const handleDeployArmillary = () => {
    targetProgressRef.current = 1.0;
    setViewMode('armillary');
    audioEngine.playArmillaryDeploy();
  };

  const handleRetractArmillary = () => {
    targetProgressRef.current = 0.0;
    setViewMode('compass');
    audioEngine.playArmillarySnap();
  };

  const handleOpenEncyclopedia = (topic?: string) => {
    if (topic) setEncyclopediaTopic(topic);
    setIsEncyclopediaOpen(true);
    audioEngine.playSingingBowl(340, 1.2);
  };

  const handleOpenUserManual = useCallback(() => {
    setIsUserManualOpen(true);
    audioEngine.playSingingBowl(360, 1.4);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        e.preventDefault();
        setIsUserManualOpen((prev) => !prev);
        audioEngine.playBronzeBell();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setIsEncyclopediaOpen((prev) => !prev);
        audioEngine.playBronzeBell();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleAutoRotate();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleAutoRotate, handleToggleMute, handleStep]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04060a] text-[#e5dec9] font-serif-sc select-none">
      {/* Atmospheric Background with Ethereal Celestial Panorama & Soft Flowing Vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none transition-opacity duration-1000"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-radial from-transparent via-[#04060a]/60 to-[#04060a] pointer-events-none" />

      {/* Top Bar Contract (3 zones) */}
      <HUDTopBar
        currentMode={viewMode}
        onModeSelect={handleModeSelect}
        isAutoRotate={isAutoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        armillaryProgress={armillaryProgress}
        onToggleArmillary={handleToggleArmillary}
        speedScale={speedScale}
        onSpeedScaleChange={setSpeedScale}
        onStep={handleStep}
        dragMode={dragMode}
        onDragModeChange={setDragMode}
        isMirroredDial={isMirroredDial}
        onToggleMirrorDial={() => {
          setIsMirroredDial((prev) => !prev);
          audioEngine.playBronzeBell();
        }}
        onToggleEncyclopedia={() => setIsEncyclopediaOpen((prev) => !prev)}
        onOpenUserManual={handleOpenUserManual}
      />

      {/* Main 3D Canvas Scene */}
      <main className="relative w-full h-[calc(100vh-65px)]">
        <Luopan3D
          viewMode={viewMode}
          armillaryProgress={armillaryProgress}
          selectedElement={selectedElement}
          selectedTrigram={selectedTrigram}
          onRotationChange={handleRotationChange}
          onEnergyChange={handleEnergyChange}
          isAutoRotate={isAutoRotate}
          speedScale={speedScale}
          targetOrientationAngle={targetOrientationAngle}
          isMirroredDial={isMirroredDial}
          stepRequest={stepRequest}
          dragMode={dragMode}
          onToggleMirrorDial={() => {
            setIsMirroredDial((prev) => !prev);
            audioEngine.playBronzeBell();
          }}
        />

        {/* Real-time 24-Direction Bearing Readout (below compass center, DOM layer — never mirrored) */}
        <BearingReadout
          angle={currentAngle}
          isMirroredDial={isMirroredDial}
          dimmed={viewMode === 'meditation'}
          onOpenEncyclopedia={handleOpenEncyclopedia}
        />

        {/* Real-time Energy Resonance Gauge (Left Wing) */}
        <EnergyGauge
          currentAngle={currentAngle}
          rotationSpeed={rotationSpeed}
          energyLevel={energyLevel}
        />

        {/* Right HUD Column: Tao Calendar & Wisdom Selectors (Unified Vertical Stack - Zero Overlap)
         * max-w 分档 300/360（实测推导，见 scripts/probe-aside-width.mjs）：
         *   360px 是 1920 宽下右侧留白充裕时的舒适值；
         *   300px 是窄视口（1024x768）下的「免费下限」——道历面板高度 320px、
         *   折行 16 处与 360px 完全一致；再窄到 280px 高度就跳到 344px 开始劣化。
         * 低于 xl(1280) 用 300px：读数面板同步压到 328 宽后，
         * 1024 下两者间隙由 -66px 转为正值，不再重叠。 */}
        <aside className="absolute top-4 right-6 z-20 flex flex-col items-end gap-3 max-w-[300px] xl:max-w-[360px] w-full pointer-events-none">
          <div className="pointer-events-auto w-full">
            <TaoCalendarBadge
              currentAngle={currentAngle}
              onSelectTermAngle={(angle) => {
                setTargetOrientationAngle(angle);
                setIsAutoRotate(false);
              }}
            />
          </div>

          <div className="pointer-events-auto w-full">
            <ElementSelector
              viewMode={viewMode}
              selectedElement={selectedElement}
              selectedTrigram={selectedTrigram}
              onSelectElement={(el) => {
                setSelectedElement(el);
                if (el) setSelectedTrigram(null);
              }}
              onSelectTrigram={(tri) => {
                setSelectedTrigram(tri);
                if (tri) setSelectedElement(null);
              }}
              onOpenEncyclopedia={handleOpenEncyclopedia}
            />
          </div>
        </aside>

        {/* Armillary Sphere Interactive Controls (Bottom Center - Zero Overlap) */}
        {(viewMode === 'armillary' || armillaryProgress > 0.05) && (
          <ArmillaryControls
            progress={armillaryProgress}
            onProgressChange={handleManualProgressChange}
            onDeploy={handleDeployArmillary}
            onRetract={handleRetractArmillary}
          />
        )}

        {/* Meditation Breath Phase Overlay */}
        {viewMode === 'meditation' && <MeditationOverlay />}

        {/* Selected Element / Trigram Wisdom Modal */}
        <ElementDetailModal
          selectedElement={selectedElement}
          selectedTrigram={selectedTrigram}
          onClose={() => {
            setSelectedElement(null);
            setSelectedTrigram(null);
          }}
          onSelectElement={(el) => setSelectedElement(el)}
          onOpenEncyclopedia={handleOpenEncyclopedia}
        />

        {/* Dao Wisdom Encyclopedia Side Drawer (道韵百科 · 格物研玄) */}
        <DaoWisdomDrawer
          isOpen={isEncyclopediaOpen}
          onClose={() => setIsEncyclopediaOpen(false)}
          initialTopic={encyclopediaTopic}
          currentAngle={currentAngle}
        />

        {/* User Manual Modal (使用手册 · 研览宝鉴) */}
        <UserManualModal
          isOpen={isUserManualOpen}
          onClose={() => setIsUserManualOpen(false)}
          onSelectMode={handleModeSelect}
          onToggleAutoRotate={handleToggleAutoRotate}
          onStep={handleStep}
          onToggleArmillary={handleToggleArmillary}
          onOpenEncyclopedia={handleOpenEncyclopedia}
        />
      </main>
    </div>
  );
}
