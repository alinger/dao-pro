import React, { useEffect, useRef, useState } from 'react';
import { MOUNTAINS_24 } from '../data/taoData';
import { audioEngine } from '../utils/audio';
import { Sparkles, Zap, Volume2, ChevronDown, ChevronUp } from 'lucide-react';

interface EnergyGaugeProps {
  currentAngle: number;
  rotationSpeed: number;
  energyLevel: number;
}

interface OverflowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glowColor: string;
  life: number;
  maxLife: number;
  flickerFreq: number;
  phase: number;
  isSpark: boolean;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export const EnergyGauge: React.FC<EnergyGaugeProps> = ({
  currentAngle,
  rotationSpeed,
  energyLevel,
}) => {
  const [manualSurgeActive, setManualSurgeActive] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const effectiveEnergy = manualSurgeActive ? Math.max(energyLevel, 92) : energyLevel;
  const isResonanceSurge = effectiveEnergy >= 80;

  const energyRef = useRef(effectiveEnergy);

  useEffect(() => {
    energyRef.current = effectiveEnergy;
    // Dynamically modulate synthesizer audio and humming based on effective energy
    audioEngine.updateEnergyResonanceAudio(effectiveEnergy);
  }, [effectiveEnergy]);

  // Clean up synthesizer audio on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopEnergyResonanceAudio();
    };
  }, []);

  const handleCardClick = () => {
    setManualSurgeActive(true);
    audioEngine.playBronzeBell();
    audioEngine.playCompassRotationResonance(6.0);
    setTimeout(() => {
      setManualSurgeActive(false);
    }, 4500);
  };

  // Find current 24 Mountain direction based on angle
  const normalizedDeg = Math.round(currentAngle) % 360;
  const mountainIdx = Math.floor(((normalizedDeg + 7.5) % 360) / 15);
  const currentMountain = MOUNTAINS_24[mountainIdx] || MOUNTAINS_24[0];

  // Dynamic Yin-Yang balance ratio influenced by motion and angle
  const yangRatio = Math.round(50 + Math.sin((normalizedDeg * Math.PI) / 180) * 15 + rotationSpeed * 12);
  const yinRatio = 100 - yangRatio;

  // High-frequency Particle Overflow Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: OverflowParticle[] = [];
    let shockwaves: ShockwaveRing[] = [];
    let frame = 0;
    let lastShockwaveTime = 0;

    // Dimensions setup with generous overflow margins
    const updateSize = () => {
      const parent = containerRef.current;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const padding = 50; // extra overflow zone around the gauge
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    const colorsHigh = [
      { fill: '#ffd54f', glow: 'rgba(255, 213, 79, 0.8)' }, // Pure Gold
      { fill: '#fff59d', glow: 'rgba(255, 245, 157, 0.9)' }, // Bright White-Gold
      { fill: '#ff8a65', glow: 'rgba(255, 138, 101, 0.8)' }, // Vermilion Ember
      { fill: '#4ade80', glow: 'rgba(74, 222, 128, 0.7)' },  // Pure Jade
      { fill: '#38bdf8', glow: 'rgba(56, 189, 248, 0.8)' },  // Celestial Azure
      { fill: '#ffffff', glow: 'rgba(255, 255, 255, 0.95)' }, // Incandescent Core
    ];

    const colorsNormal = [
      { fill: '#c5a059', glow: 'rgba(197, 160, 89, 0.5)' },
      { fill: '#ffd54f', glow: 'rgba(255, 213, 79, 0.4)' },
    ];

    const render = () => {
      animId = requestAnimationFrame(render);
      frame++;

      const parent = containerRef.current;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const padding = 50;
      const totalW = rect.width + padding * 2;
      const totalH = rect.height + padding * 2;

      ctx.clearRect(0, 0, totalW, totalH);

      const curEnergy = energyRef.current;
      const highEnergy = curEnergy >= 80;

      // Card bounding box inside the padded canvas
      const cardX = padding;
      const cardY = padding;
      const cardW = rect.width;
      const cardH = rect.height;

      // 1. Spawn overflowing particles
      const spawnCount = highEnergy ? Math.floor(4 + (curEnergy - 80) * 0.3) : curEnergy > 40 ? 1 : 0.5;

      for (let s = 0; s < spawnCount; s++) {
        if (Math.random() > (highEnergy ? 0.95 : 0.4)) {
          // Choose spawn location along the perimeter or inside the card
          let px = 0;
          let py = 0;
          let vx = 0;
          let vy = 0;

          if (highEnergy && Math.random() < 0.6) {
            // Erupting outward from the 4 edges of the card
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) {
              // Top edge: spraying strongly upwards
              px = cardX + Math.random() * cardW;
              py = cardY + (Math.random() * 6 - 3);
              vx = (Math.random() - 0.5) * 3.5;
              vy = -Math.random() * 3.8 - 1.2;
            } else if (edge === 1) {
              // Right edge: bursting rightwards & up
              px = cardX + cardW + (Math.random() * 6 - 3);
              py = cardY + Math.random() * cardH;
              vx = Math.random() * 3.5 + 0.8;
              vy = -Math.random() * 2.8 - 0.5;
            } else if (edge === 2) {
              // Bottom edge: bubbling down and drifting
              px = cardX + Math.random() * cardW;
              py = cardY + cardH + (Math.random() * 6 - 3);
              vx = (Math.random() - 0.5) * 2.8;
              vy = Math.random() * 2.2 + 0.5;
            } else {
              // Left edge: bursting leftwards & up
              px = cardX + (Math.random() * 6 - 3);
              py = cardY + Math.random() * cardH;
              vx = -Math.random() * 3.5 - 0.8;
              vy = -Math.random() * 2.8 - 0.5;
            }
          } else {
            // Emerges from inside the card body
            px = cardX + 15 + Math.random() * (cardW - 30);
            py = cardY + 15 + Math.random() * (cardH - 30);
            vx = (Math.random() - 0.5) * (highEnergy ? 3.0 : 1.2);
            vy = -Math.random() * (highEnergy ? 3.2 : 1.5) - 0.6;
          }

          const palette = highEnergy ? colorsHigh : colorsNormal;
          const chosenColor = palette[Math.floor(Math.random() * palette.length)];

          particles.push({
            x: px,
            y: py,
            vx,
            vy,
            size: highEnergy ? Math.random() * 3.2 + 1.2 : Math.random() * 2.0 + 0.8,
            color: chosenColor.fill,
            glowColor: chosenColor.glow,
            life: 0,
            maxLife: highEnergy ? Math.floor(Math.random() * 45 + 30) : Math.floor(Math.random() * 35 + 20),
            // High frequency flicker rate: rapid oscillation
            flickerFreq: highEnergy ? Math.random() * 0.45 + 0.35 : Math.random() * 0.2 + 0.1,
            phase: Math.random() * Math.PI * 2,
            isSpark: highEnergy && Math.random() < 0.25, // 25% are 4-pointed radiant sparkle stars
          });
        }
      }

      // 2. Spawn shockwave ring on high energy surges
      const now = Date.now();
      if (highEnergy && now - lastShockwaveTime > 550) {
        shockwaves.push({
          x: cardX + cardW / 2,
          y: cardY + cardH / 2,
          radius: 10,
          maxRadius: Math.max(cardW, cardH) * 0.85,
          alpha: 0.85,
          color: curEnergy > 90 ? '#ffd54f' : '#60a5fa',
        });
        lastShockwaveTime = now;
      }

      // 3. Render and update shockwaves
      for (let w = shockwaves.length - 1; w >= 0; w--) {
        const sw = shockwaves[w];
        sw.radius += 3.2;
        sw.alpha *= 0.94;

        if (sw.radius >= sw.maxRadius || sw.alpha < 0.02) {
          shockwaves.splice(w, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        // High-frequency flickering ring intensity
        const ringFlicker = 0.7 + 0.3 * Math.sin(frame * 0.6);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha * ringFlicker;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12;
        ctx.ellipse(sw.x, sw.y, sw.radius * 1.1, sw.radius * 0.85, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Update and render overflowing particles
      const maxParticles = highEnergy ? 120 : 35;
      if (particles.length > maxParticles) {
        particles = particles.slice(particles.length - maxParticles);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        // Mild air resistance & upward buoyancy
        p.vx *= 0.98;
        p.vy -= 0.04;

        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }

        const lifeRatio = p.life / p.maxLife;
        const fade = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1 - (lifeRatio - 0.2) / 0.8;

        // High-frequency stroboscopic flicker modulation
        const flicker = 0.4 + 0.6 * Math.abs(Math.sin(frame * p.flickerFreq + p.phase));
        // Random strobe flash spike
        const spike = Math.random() < 0.15 ? 1.0 : flicker;
        const currentAlpha = Math.max(0, Math.min(1, fade * spike));

        ctx.save();
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = highEnergy ? 8 : 4;

        if (p.isSpark) {
          // Render a 4-pointed radiant sparkle star for overflowing Qi essence
          const s = p.size * (1 + 0.4 * Math.sin(frame * 0.8));
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s * 2);
          ctx.lineTo(p.x + s * 0.5, p.y - s * 0.5);
          ctx.lineTo(p.x + s * 2, p.y);
          ctx.lineTo(p.x + s * 0.5, p.y + s * 0.5);
          ctx.lineTo(p.x, p.y + s * 2);
          ctx.lineTo(p.x - s * 0.5, p.y + s * 0.5);
          ctx.lineTo(p.x - s * 2, p.y);
          ctx.lineTo(p.x - s * 0.5, p.y - s * 0.5);
          ctx.closePath();
          ctx.fill();
        } else {
          // Render glowing circular spark
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Intense core dot for incandescent energy
          if (highEnergy && p.size > 2.0) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // 5. Electric micro-arcs along card perimeter when in high energy surge
      if (highEnergy && Math.random() < 0.45) {
        ctx.save();
        ctx.strokeStyle = Math.random() < 0.5 ? '#ffd54f' : '#67e8f9';
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = 0.75 + Math.random() * 0.25;
        ctx.shadowColor = '#ffd54f';
        ctx.shadowBlur = 6;

        const side = Math.floor(Math.random() * 4);
        let startX = cardX;
        let startY = cardY;
        let endX = cardX;
        let endY = cardY;

        if (side === 0) {
          startX = cardX + Math.random() * (cardW - 40);
          startY = cardY;
          endX = startX + (Math.random() * 30 + 10);
          endY = startY;
        } else if (side === 1) {
          startX = cardX + cardW;
          startY = cardY + Math.random() * (cardH - 40);
          endX = startX;
          endY = startY + (Math.random() * 30 + 10);
        } else if (side === 2) {
          startX = cardX + Math.random() * (cardW - 40);
          startY = cardY + cardH;
          endX = startX + (Math.random() * 30 + 10);
          endY = startY;
        } else {
          startX = cardX;
          startY = cardY + Math.random() * (cardH - 40);
          endX = startX;
          endY = startY + (Math.random() * 30 + 10);
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 8;
        const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 8;
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.restore();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const surgeIntensity = Math.min(1, Math.max(0, (effectiveEnergy - 80) / 20));

  return (
    <>
      {/* SVG Atmospheric Distortion / Heat Haze Filter Definition */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="atmospheric-distortion-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.028"
              numOctaves="3"
              result="noise"
              seed="2"
            >
              <animate
                attributeName="baseFrequency"
                dur="5s"
                values="0.012 0.022; 0.018 0.034; 0.012 0.022"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={4 + surgeIntensity * 12}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Atmospheric Distortion & Heat Haze Dynamic Mirage Layer across Main View */}
      <div
        className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-700 ${
          isResonanceSurge ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Heat Haze Shimmer Filter Layer */}
        <div
          className="absolute inset-0 animate-heat-haze"
          style={{
            backdropFilter: isResonanceSurge ? 'url(#atmospheric-distortion-filter) contrast(104%) brightness(102%)' : 'none',
            WebkitBackdropFilter: isResonanceSurge ? 'url(#atmospheric-distortion-filter) contrast(104%) brightness(102%)' : 'none',
          }}
        />

        {/* Concentric Heat Mirage & Thermal Expansion Qi-Waves */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            className="absolute w-[680px] h-[680px] rounded-full border border-[#ffd54f]/25 animate-thermal-wave"
            style={{
              background: 'radial-gradient(circle, rgba(255,213,79,0.12) 0%, rgba(245,158,11,0.04) 45%, transparent 70%)',
              filter: 'blur(3px)',
            }}
          />
          <div
            className="absolute w-[980px] h-[980px] rounded-full border border-[#ffb300]/15 animate-thermal-wave"
            style={{
              animationDelay: '1.3s',
              background: 'radial-gradient(circle, rgba(255,183,77,0.06) 0%, transparent 60%)',
              filter: 'blur(5px)',
            }}
          />
        </div>

        {/* Subtle rising Qi heat mirage mist */}
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 opacity-35 mix-blend-screen"
          style={{
            background: 'linear-gradient(to top, rgba(255, 213, 79, 0.08), transparent)',
          }}
        />

        {/* Top Resonance Status Ribbon */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-[#ffd54f]/50 backdrop-blur-md text-xs text-[#ffe082] shadow-[0_0_20px_rgba(255,213,79,0.35)] animate-flicker-fast">
          <Sparkles className="w-3.5 h-3.5 text-[#ffd54f]" />
          <span className="font-serif-sc tracking-wider font-semibold">
            太虚气场共振 · 灵光折射热浪
          </span>
          <span className="font-mono text-[#ffd54f] font-bold">
            [{effectiveEnergy}%]
          </span>
        </div>
      </div>

      {/* Main EnergyGauge Floating Card */}
      <div className="absolute top-4 left-6 z-20 pointer-events-none sm:pointer-events-auto">
      <div
        ref={containerRef}
        onClick={handleCardClick}
        title="拨动罗盘或点击激荡气场共鸣"
        className={`relative p-3.5 backdrop-blur-md rounded-xl max-w-[265px] text-xs transition-all duration-300 cursor-pointer select-none ${
          isResonanceSurge
            ? 'bg-black/80 border-2 border-[#ffd54f] shadow-[0_0_35px_rgba(255,213,79,0.55),inset_0_0_20px_rgba(255,213,79,0.22)] animate-energy-jitter'
            : 'bg-black/55 border border-[#c5a059]/30 shadow-2xl hover:border-[#c5a059]/55'
        }`}
      >
        {/* High-frequency Particle Overflow Canvas Overlay (spans beyond container borders) */}
        <canvas
          ref={canvasRef}
          className="absolute -top-[50px] -left-[50px] pointer-events-none z-30"
          style={{ width: 'calc(100% + 100px)', height: 'calc(100% + 100px)' }}
        />

        {/* Header indicator & High Energy Surge Badge */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#c5a059]/20">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-serif-sc font-medium text-sm transition-colors ${
                isResonanceSurge ? 'text-[#ffd54f] font-bold drop-shadow-[0_0_8px_rgba(255,213,79,0.9)]' : 'text-[#f5ebd7]'
              }`}
            >
              气场共鸣仪
            </span>
            {isResonanceSurge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ffd54f]/25 text-[#ffd54f] border border-[#ffd54f]/70 animate-flicker-fast flex items-center gap-1 shadow-[0_0_10px_rgba(255,213,79,0.5)]">
                <Volume2 className="w-2.5 h-2.5 text-[#ffd54f] animate-pulse" />
                <span>嗡鸣共振</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isResonanceSurge && (
              <Zap className="w-3.5 h-3.5 text-[#ffd54f] animate-flicker-fast" />
            )}
            <span
              className={`font-cinzel tabular-nums font-bold transition-all text-sm ${
                isResonanceSurge
                  ? 'text-[#ffe082] drop-shadow-[0_0_12px_rgba(255,213,79,0.9)] scale-110'
                  : 'text-[#c5a059]'
              }`}
            >
              {effectiveEnergy}%
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className="p-0.5 text-[#c5a059]/70 hover:text-[#ffd54f] transition-colors ml-1 cursor-pointer"
              title={isCollapsed ? '展开详情' : '折叠面板'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsed Mini Summary */}
        {isCollapsed && (
          <div className="flex items-center justify-between text-[11px] text-[#e8dcb8]/90 font-serif-sc pt-0.5">
            <span className="text-[#ffd54f]">{currentMountain.name}山 ({normalizedDeg}°)</span>
            <span className="text-[#c5a059]/70 text-[10px]">{rotationSpeed > 0.05 ? '运转充盈' : '恬淡中和'}</span>
          </div>
        )}

        {/* Expanded Rich Details */}
        {!isCollapsed && (
          <>
            {/* Real-time Direction & Degree */}
            <div className="grid grid-cols-2 gap-2 mb-2.5 text-[11px]">
              <div className="flex flex-col">
                <span className="text-[#c5a059]/75 text-[10px]">罗盘天向</span>
                <span className="font-serif-sc font-semibold text-[#f5ebd7] text-sm">
                  {currentMountain.name}山 ({currentMountain.element === 'water' ? '水' :
                    currentMountain.element === 'fire' ? '火' :
                    currentMountain.element === 'wood' ? '木' :
                    currentMountain.element === 'metal' ? '金' : '土'})
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#c5a059]/75 text-[10px]">周天度数</span>
                <span className="font-mono tabular-nums text-[#f5ebd7] text-sm">
                  {normalizedDeg.toString().padStart(3, '0')}°
                </span>
              </div>
            </div>

            {/* Yin-Yang Balance Dynamic Bar */}
            <div className="space-y-1 mb-2.5">
              <div className="flex justify-between text-[10px] text-[#e8dcb8]/85 font-serif-sc">
                <span>阳气 · {yangRatio}%</span>
                <span>阴仪 · {yinRatio}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-[#c5a059]/30">
                <div
                  className={`h-full transition-all duration-300 ${
                    isResonanceSurge
                      ? 'bg-gradient-to-r from-[#ff8c69] via-[#ffd54f] to-[#ffffff] shadow-[0_0_8px_rgba(255,213,79,0.8)]'
                      : 'bg-gradient-to-r from-[#f59e0b] to-[#fde047]'
                  }`}
                  style={{ width: `${yangRatio}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8] transition-all duration-300"
                  style={{ width: `${yinRatio}%` }}
                />
              </div>
            </div>

            {/* Dynamic Energy Waveform Bar visualizer */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#c5a059]/80">
                <span>灵力振荡频度</span>
                <span
                  className={`font-mono tabular-nums font-semibold ${
                    isResonanceSurge ? 'text-[#ffd54f] animate-flicker-fast' : 'text-[#c5a059]'
                  }`}
                >
                  {isResonanceSurge ? '九天共鸣 · 气场冲霄' : rotationSpeed > 0.05 ? '活跃充盈' : '恬淡中和'}
                </span>
              </div>
              <div className="flex items-center gap-1 h-3.5 pt-0.5">
                {[40, 65, 85, 50, 75, 95, 60, 45, 80, 70, 90, 55].map((baseH, idx) => {
                  const energyAmp = isResonanceSurge ? 1.4 : energyLevel / 60;
                  const jitter = isResonanceSurge ? (Math.random() - 0.5) * 35 : Math.sin(idx + Date.now() * 0.005) * 20;
                  const dynamicH = Math.min(100, Math.max(20, baseH * energyAmp + jitter));

                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm transition-all duration-100 ${
                        isResonanceSurge
                          ? 'bg-gradient-to-t from-[#f59e0b] to-[#fff176] shadow-[0_0_6px_rgba(255,213,79,0.8)]'
                          : 'bg-[#c5a059]'
                      }`}
                      style={{
                        height: `${dynamicH}%`,
                        opacity: isResonanceSurge ? 0.8 + Math.random() * 0.2 : 0.35 + (dynamicH / 100) * 0.65,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};
