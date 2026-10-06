import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Luopan3D } from './components/Luopan3D';
import { HUDTopBar } from './components/HUDTopBar';
import { EnergyGauge } from './components/EnergyGauge';
import { ElementSelector } from './components/ElementSelector';
import { ElementDetailModal } from './components/ElementDetailModal';
import { MeditationOverlay } from './components/MeditationOverlay';
import { ArmillaryControls } from './components/ArmillaryControls';
import { TaoCalendarBadge } from './components/TaoCalendarBadge';
import { ViewMode, ElementType } from './types/tao';
import { audioEngine } from './utils/audio';
import bgImage from './assets/images/taoist_celestial_nebula_1791281164720.jpg';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('compass');
  const [selectedElement, setSelectedElement] = useState<ElementType | null>(null);
  const [selectedTrigram, setSelectedTrigram] = useState<string | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speedScale, setSpeedScale] = useState<number>(1.0); // 1.0 = Default slow, serene and dignified
  const [targetOrientationAngle, setTargetOrientationAngle] = useState<number | null>(null);

  // Armillary Sphere transformation progress (0 = Flat Luopan, 1 = Full 3D Armillary Sphere)
  const [armillaryProgress, setArmillaryProgress] = useState<number>(0);
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);

  // Real-time telemetry from 3D physics
  const [currentAngle, setCurrentAngle] = useState<number>(0);
  const [rotationSpeed, setRotationSpeed] = useState<number>(0);
  const [energyLevel, setEnergyLevel] = useState<number>(35);

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
        />

        {/* Real-time Energy Resonance Gauge (Left Wing) */}
        <EnergyGauge
          currentAngle={currentAngle}
          rotationSpeed={rotationSpeed}
          energyLevel={energyLevel}
        />

        {/* Right HUD Column: Tao Calendar & Wisdom Selectors (Unified Vertical Stack - Zero Overlap) */}
        <aside className="absolute top-4 right-6 z-20 flex flex-col items-end gap-2.5 max-w-[285px] w-full pointer-events-none">
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
        />
      </main>
    </div>
  );
}
