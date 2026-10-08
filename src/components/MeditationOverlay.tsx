import React, { useState, useEffect } from 'react';

export const MeditationOverlay: React.FC = () => {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'peace'>('inhale');
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    const cycle = () => {
      setPhase('inhale');
      setSeconds(4);
      const t1 = setTimeout(() => {
        setPhase('hold');
        setSeconds(2);
      }, 4000);
      const t2 = setTimeout(() => {
        setPhase('exhale');
        setSeconds(4);
      }, 6000);
      const t3 = setTimeout(() => {
        setPhase('peace');
        setSeconds(2);
      }, 10000);
      return [t1, t2, t3];
    };

    let timers = cycle();
    const interval = setInterval(() => {
      timers = cycle();
    }, 12000);

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-16 sm:bottom-20 z-20 flex flex-col items-center justify-center pointer-events-none">
      <div className="p-4 bg-black/50 backdrop-blur-md border border-[#c5a059]/30 rounded-2xl text-center max-w-[560px] shadow-2xl animate-fade-in pointer-events-auto">
        <span className="text-[18px] text-[#c5a059]/90 font-serif-sc tracking-widest block mb-1">
          太极吐纳 · 调息养元
        </span>
        <h3 className="text-[26px] font-bold font-calligraphy text-[#f5ebd7] mb-2 leading-tight">
          {phase === 'inhale' && '吸气 · 敛聚四海清真之气'}
          {phase === 'hold' && '归元 · 万象归心沉丹田'}
          {phase === 'exhale' && '呼气 · 阴阳调和化万物'}
          {phase === 'peace' && '静笃 · 致虚极以守静笃'}
        </h3>
        <p className="text-[18px] text-[#e8dcb8]/90 font-serif-sc leading-relaxed">
          “万物负阴而抱阳，冲气以为和。”
        </p>
      </div>
    </div>
  );
};
