import React from 'react';
import { ARMILLARY_RINGS } from './Luopan3D';
import { Sparkles, RotateCw, Compass, Shield } from 'lucide-react';

interface ArmillaryControlsProps {
  progress: number;
  onProgressChange: (val: number) => void;
  onDeploy: () => void;
  onRetract: () => void;
}

export const ArmillaryControls: React.FC<ArmillaryControlsProps> = ({
  progress,
  onProgressChange,
  onDeploy,
  onRetract,
}) => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto max-w-lg w-[92%] sm:w-auto">
      {/* Poetic Inscription Banner from the classic Taoist legend */}
      <div className="px-5 py-2.5 bg-black/60 backdrop-blur-md border border-[#c5a059]/35 rounded-2xl shadow-2xl text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-serif-sc text-[#c5a059]/80 mb-0.5 tracking-widest">
          <span>乾坤多维天球运转</span>
          <span aria-hidden="true">·</span>
          <span>浑天仪化境</span>
        </div>
        <p className="font-calligraphy text-base sm:text-lg text-[#f5ebd7] tracking-wider leading-relaxed text-shadow">
          “九霄龙吟惊天变，风云际会潜水游。成也风云，败也风云。”
        </p>
      </div>

      {/* Interactive Deployment Slider & Quick Latch Buttons */}
      <div className="flex items-center gap-3 px-4 py-2 bg-black/55 backdrop-blur-md border border-[#c5a059]/25 rounded-xl shadow-xl text-xs w-full sm:w-auto justify-between">
        <span className="text-[#c5a059]/80 font-medium whitespace-nowrap">
          乾坤张合
        </span>

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={progress}
          onChange={(e) => onProgressChange(parseFloat(e.target.value))}
          className="w-32 sm:w-44 accent-[#c5a059] cursor-pointer"
        />

        <span className="font-mono tabular-nums text-[#f5ebd7] w-10 text-right">
          {Math.round(progress * 100)}%
        </span>

        {/* Preset quick actions */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-[#c5a059]/20">
          <button
            onClick={onDeploy}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
              progress > 0.85
                ? 'bg-[#c5a059] text-black font-semibold'
                : 'text-[#e8dcb8] hover:bg-[#c5a059]/20'
            }`}
          >
            化境
          </button>
          <button
            onClick={onRetract}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
              progress < 0.15
                ? 'bg-[#c5a059] text-black font-semibold'
                : 'text-[#e8dcb8] hover:bg-[#c5a059]/20'
            }`}
          >
            合盘
          </button>
        </div>
      </div>

      {/* Ring Gimbal Tilt Indicators (visible when expanded) */}
      {progress > 0.2 && (
        <div className="hidden md:flex items-center gap-2 text-[10px] text-[#c5a059]/70 font-mono">
          {ARMILLARY_RINGS.map((ring, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-black/40 border border-[#c5a059]/15 rounded">
              {ring.name.slice(0, 4)}: {Math.round((ring.tiltX * 180) / Math.PI * progress)}°
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
