import React from 'react';
import { ViewMode } from '../types/tao';
import { Volume2, VolumeX, Play, Pause, Compass, Layers } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface HUDTopBarProps {
  currentMode: ViewMode;
  onModeSelect: (mode: ViewMode) => void;
  isAutoRotate: boolean;
  onToggleAutoRotate: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  armillaryProgress: number;
  onToggleArmillary: () => void;
  speedScale: number;
  onSpeedScaleChange: (speed: number) => void;
}

export const HUDTopBar: React.FC<HUDTopBarProps> = ({
  currentMode,
  onModeSelect,
  isAutoRotate,
  onToggleAutoRotate,
  isMuted,
  onToggleMute,
  armillaryProgress,
  onToggleArmillary,
  speedScale,
  onSpeedScaleChange,
}) => {
  const navLinks: { mode: ViewMode; label: string }[] = [
    { mode: 'compass', label: '天元总览' },
    { mode: 'armillary', label: '浑天演象' },
    { mode: 'elements', label: '五行生克' },
    { mode: 'bagua', label: '八卦推演' },
    { mode: 'exploded', label: '分层透视' },
    { mode: 'meditation', label: '阴阳吐纳' },
  ];

  const cycleSpeed = () => {
    if (speedScale <= 0.6) {
      onSpeedScaleChange(1.0);
    } else if (speedScale <= 1.2) {
      onSpeedScaleChange(1.8);
    } else {
      onSpeedScaleChange(0.5);
    }
    audioEngine.playBronzeBell();
  };

  const speedLabel = speedScale <= 0.6 ? '悠缓 (0.5x)' : speedScale <= 1.2 ? '沉稳 (1.0x)' : '灵动 (1.8x)';

  return (
    <header className="relative z-30 flex items-center justify-between px-6 py-4 border-b border-[#c5a059]/20 bg-black/40 backdrop-blur-md">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tracking-wider text-[#f5ebd7] font-calligraphy text-shadow">
          道韵乾坤 · 太极五行罗盘
        </span>
      </div>

      {/* Zone 2: Clean text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        {navLinks.map((item) => {
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => {
                onModeSelect(item.mode);
                audioEngine.playSingingBowl(320, 1.8);
              }}
              className={`relative py-1 transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-[#f5ebd7] font-semibold'
                  : 'text-[#c5a059]/75 hover:text-[#f5ebd7]'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Armillary Sphere Deploy / Retract Quick Latch Button */}
        <button
          onClick={onToggleArmillary}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            armillaryProgress > 0.5
              ? 'bg-[#c5a059] text-black border-[#e8dcb8] shadow-[0_0_14px_rgba(229,190,111,0.5)]'
              : 'border-[#c5a059]/40 bg-[#c5a059]/10 text-[#f5ebd7] hover:border-[#c5a059] hover:bg-[#c5a059]/20'
          }`}
          title="切换浑天仪多维立体转盘与平面罗盘"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">
            {armillaryProgress > 0.5 ? '复位成盘' : '乾坤破阵 · 浑天仪'}
          </span>
        </button>

        {/* Speed Multiplier Button */}
        <button
          onClick={cycleSpeed}
          title="调节转动速度节奏"
          className="px-2.5 py-1.5 text-xs font-mono tabular-nums border border-[#c5a059]/30 rounded-lg text-[#e8dcb8] hover:border-[#c5a059]/60 hover:text-[#f5ebd7] transition-all cursor-pointer whitespace-nowrap"
        >
          {speedLabel}
        </button>

        {/* Auto Rotate Toggle */}
        <button
          onClick={onToggleAutoRotate}
          title={isAutoRotate ? '暂停天行自转' : '开启天行动转'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
            isAutoRotate
              ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#f5ebd7]'
              : 'border-[#c5a059]/30 text-[#c5a059]/80 hover:text-[#f5ebd7] hover:border-[#c5a059]/60'
          }`}
        >
          {isAutoRotate ? <Pause className="w-3.5 h-3.5 text-[#c5a059]" /> : <Play className="w-3.5 h-3.5 text-[#c5a059]" />}
          <span className="hidden sm:inline whitespace-nowrap">{isAutoRotate ? '天行动转' : '定盘凝神'}</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleMute}
          title={isMuted ? '开启清音' : '静音'}
          className="p-2 text-xs font-medium text-[#c5a059] border border-[#c5a059]/30 rounded-lg hover:border-[#c5a059]/60 hover:text-[#f5ebd7] transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#c5a059]" />}
        </button>
      </div>
    </header>
  );
};
