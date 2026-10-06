import React, { useState } from 'react';
import {
  SOLAR_TERMS_24,
  getTaoistCalendarData,
  getTaoistTodayDetails,
  SolarTermInfo,
} from '../data/taoCalendar';
import { audioEngine } from '../utils/audio';
import {
  Calendar,
  ChevronRight,
  X,
  Sparkles,
  Compass,
  Scroll,
  Sun,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flame,
  Award,
} from 'lucide-react';

interface TaoCalendarBadgeProps {
  currentAngle: number;
  onSelectTermAngle?: (angle: number) => void;
}

export const TaoCalendarBadge: React.FC<TaoCalendarBadgeProps> = ({
  currentAngle,
  onSelectTermAngle,
}) => {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'almanac'>('today');

  const calendarData = getTaoistCalendarData();
  const todayDetails = getTaoistTodayDetails();

  // Find the solar term currently pointed to by the compass needle/angle (0° = 冬至 / 子)
  const normalizedDeg = Math.round(currentAngle) % 360;
  const termIdx = Math.floor(((normalizedDeg + 7.5) % 360) / 15);
  const alignedTerm = SOLAR_TERMS_24[termIdx] || SOLAR_TERMS_24[0];

  const handleSelectAngle = (angle: number) => {
    if (onSelectTermAngle) {
      onSelectTermAngle(angle);
      audioEngine.playBronzeBell();
    }
  };

  const handleSelectTerm = (term: SolarTermInfo) => {
    handleSelectAngle(term.angle);
  };

  const openTodayDetails = () => {
    setActiveTab('today');
    setIsOpenModal(true);
    audioEngine.playSingingBowl(360, 1.5);
  };

  const openAlmanac = () => {
    setActiveTab('almanac');
    setIsOpenModal(true);
    audioEngine.playBronzeBell();
  };

  return (
    <>
      {/* HUD Floating Taoist Calendar Badge */}
      <div className="w-full">
        <div className="p-3 bg-black/65 backdrop-blur-md border border-[#c5a059]/35 rounded-xl shadow-2xl w-full text-xs transition-all hover:border-[#c5a059]/60">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#c5a059]/20">
            <div className="flex items-center gap-1.5 cursor-pointer" onClick={openTodayDetails}>
              <Calendar className="w-4 h-4 text-[#ffd54f]" />
              <span className="font-serif-sc font-bold text-[#f5ebd7] text-sm hover:text-[#ffd54f] transition-colors">
                道历天象玄历
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openTodayDetails}
                className="text-[11px] font-semibold text-[#ffd54f] hover:underline cursor-pointer flex items-center gap-0.5 bg-[#c5a059]/15 px-2 py-0.5 rounded border border-[#c5a059]/30 hover:bg-[#c5a059]/30 transition-all"
              >
                <span>今日详情</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <button
                onClick={openAlmanac}
                className="text-[11px] text-[#e8dcb8]/80 hover:text-[#ffd54f] hover:underline cursor-pointer flex items-center gap-0.5"
                title="打开二十四节气万年图谱"
              >
                <span>图谱</span>
              </button>
            </div>
          </div>

          {/* Today Overview in badge */}
          <div className="space-y-1.5 text-[11px] mb-2.5 cursor-pointer" onClick={openTodayDetails}>
            <div className="flex justify-between items-center">
              <span className="text-[#c5a059]/80">黄帝纪元</span>
              <span className="font-mono tabular-nums text-[#ffd54f] font-semibold">
                道历 4723 年 · 丙午年
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#c5a059]/80">今日正朔</span>
              <span className="font-serif-sc text-[#f5ebd7] font-medium">
                {todayDetails.lunarMonth}{todayDetails.lunarDay} · {todayDetails.dayGanzhi}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#c5a059]/75">日值客星</span>
              <span className="text-[#4ade80] font-medium">
                {todayDetails.mansion28.name} ({todayDetails.jianChu12.name}大吉)
              </span>
            </div>
          </div>

          {/* Real-time Needle Aligned Solar Term and Hexagram */}
          <div className="p-2 rounded-lg bg-black/50 border border-[#c5a059]/25 space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-[#c5a059]/80 text-[10px]">罗盘天向所指</span>
              <span
                className="font-bold text-xs"
                style={{ color: alignedTerm.color }}
              >
                {alignedTerm.name}节 · {alignedTerm.mountain}山
              </span>
            </div>
            <div className="text-[10px] text-[#e8dcb8]/90 truncate">
              辟卦：{alignedTerm.gua}
            </div>
            <div className="text-[10px] text-[#c5a059]/70 truncate">
              候应：{alignedTerm.phenology}
            </div>
          </div>

          {/* Click to open today's details banner button */}
          <button
            onClick={openTodayDetails}
            className="w-full mt-2.5 py-1.5 px-2 bg-gradient-to-r from-[#c5a059]/20 to-[#ffd54f]/20 hover:from-[#c5a059]/35 hover:to-[#ffd54f]/35 border border-[#ffd54f]/40 rounded-lg text-center font-serif-sc font-medium text-[11px] text-[#ffe082] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-[#ffd54f]" />
            <span>展开今日修真玄历 · 宜忌与吉方</span>
          </button>
        </div>
      </div>

      {/* Taoist Calendar Modal (Supports Today's Details & 24 Solar Terms Almanac) */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-[#0c0e14] border border-[#c5a059]/45 rounded-2xl p-5 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-[#e8dcb8] max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header & Tabs */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#c5a059]/30 shrink-0">
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xl sm:text-2xl font-bold font-calligraphy text-[#ffd54f]">
                  道历玄宪 · 乾坤易数
                </span>

                {/* Tab switchers */}
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-[#c5a059]/30 text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('today');
                      audioEngine.playSingingBowl(320, 1.2);
                    }}
                    className={`px-3 py-1 rounded-md font-serif-sc font-semibold transition-all cursor-pointer ${
                      activeTab === 'today'
                        ? 'bg-[#c5a059] text-black shadow-sm'
                        : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                    }`}
                  >
                    道历今日详情
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('almanac');
                      audioEngine.playBronzeBell();
                    }}
                    className={`px-3 py-1 rounded-md font-serif-sc font-semibold transition-all cursor-pointer ${
                      activeTab === 'almanac'
                        ? 'bg-[#c5a059] text-black shadow-sm'
                        : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                    }`}
                  >
                    二十四节气图谱
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsOpenModal(false)}
                className="p-1.5 text-[#c5a059]/70 hover:text-[#f5ebd7] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto py-4 space-y-5 pr-1.5 flex-1">
              {activeTab === 'today' ? (
                /* ================= TAB 1: TODAY'S TAOIST CALENDAR DETAILS ================= */
                <div className="space-y-4">
                  {/* Hero Date Placard */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#1a140e] via-[#120e0a] to-[#080705] border-2 border-[#c5a059]/50 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-[#f59e0b]/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Top Era line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#c5a059]/25 text-xs text-[#c5a059]">
                      <span className="font-semibold tracking-wider">
                        {todayDetails.eraName} · {todayDetails.taoistYearTitle}
                      </span>
                      <span className="font-mono text-[#ffd54f]">
                        {todayDetails.gregorianDateStr}
                      </span>
                    </div>

                    {/* Main Ganzhi & Lunar Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-2xl sm:text-3xl font-extrabold font-serif-sc text-[#ffe082] drop-shadow-[0_2px_8px_rgba(255,213,79,0.3)]">
                          {todayDetails.dayGanzhi}
                          <span className="text-base sm:text-lg font-normal text-[#e8dcb8]/90 ml-3">
                            {todayDetails.lunarMonth}{todayDetails.lunarDay}
                          </span>
                        </div>
                        <div className="text-xs text-[#c5a059]/90 mt-1 flex flex-wrap items-center gap-2">
                          <span>岁次：{todayDetails.ganzhiYear} ({todayDetails.yearDeity})</span>
                          <span>·</span>
                          <span>纳音：{todayDetails.dayNayin}</span>
                          <span>·</span>
                          <span>生肖：{todayDetails.zodiacSign}</span>
                        </div>
                      </div>

                      {/* Right Tags */}
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <div className="px-3 py-1 rounded-lg bg-[#ffd54f]/15 border border-[#ffd54f]/40 text-center">
                          <span className="text-[10px] text-[#ffd54f] block font-medium">建除十二神</span>
                          <span className="text-xs font-bold text-[#fff8e1]">{todayDetails.jianChu12.name} · {todayDetails.jianChu12.quality}</span>
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-[#4ade80]/15 border border-[#4ade80]/40 text-center">
                          <span className="text-[10px] text-[#4ade80] block font-medium">二十八宿值日</span>
                          <span className="text-xs font-bold text-[#f5ebd7]">{todayDetails.mansion28.name} ({todayDetails.mansion28.quality})</span>
                        </div>
                      </div>
                    </div>

                    {/* Star meaning note */}
                    <p className="mt-3 pt-2.5 border-t border-[#c5a059]/15 text-[11px] text-[#e8dcb8]/80 leading-relaxed font-serif-sc">
                      {todayDetails.mansion28.meaning} {todayDetails.jianChu12.meaning}
                    </p>
                  </div>

                  {/* Current Solar Term & Hexagram */}
                  <div className="p-4 rounded-xl bg-black/45 border border-[#c5a059]/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#c5a059]/20">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#ff7875]" />
                        <span className="font-bold text-sm text-[#f5ebd7]">
                          当令节序 · 消息辟卦
                        </span>
                      </div>
                      <button
                        onClick={() => handleSelectAngle(todayDetails.currentTerm.angle)}
                        className="px-2.5 py-1 rounded-md bg-[#c5a059]/20 hover:bg-[#c5a059]/35 border border-[#c5a059]/50 text-[#ffd54f] text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Compass className="w-3 h-3" />
                        <span>对准当令 ({todayDetails.currentTerm.mountain} {todayDetails.currentTerm.angle}°)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                      <div className="space-y-1">
                        <div>
                          <span className="text-[#c5a059]/80">节令候序：</span>
                          <span className="font-semibold text-[#ffd54f]">{todayDetails.currentTerm.name}节 ({todayDetails.currentTerm.season}) · {todayDetails.currentTerm.mountain}</span>
                        </div>
                        <div>
                          <span className="text-[#c5a059]/80">候应气象：</span>
                          <span className="text-[#e8dcb8]/90">{todayDetails.currentTerm.phenology}</span>
                        </div>
                        <p className="text-[10px] text-[#c5a059]/70 italic">{todayDetails.currentTerm.flavor}</p>
                      </div>

                      <div className="space-y-1 sm:border-l sm:border-[#c5a059]/20 sm:pl-3">
                        <div>
                          <span className="text-[#c5a059]/80">辟卦卦象：</span>
                          <span className="font-semibold text-[#67e8f9]">{todayDetails.currentTerm.hexagram}</span>
                        </div>
                        <p className="text-[10px] text-[#e8dcb8]/85 leading-relaxed">
                          {todayDetails.currentTerm.hexagramExplanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Auspicious Directions with Quick Compass Steering */}
                  <div className="p-4 rounded-xl bg-black/45 border border-[#c5a059]/30 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#c5a059]/20">
                      <div className="flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-[#ffd54f]" />
                        <span className="font-bold text-sm text-[#f5ebd7]">
                          今日吉神方位 · 罗盘调向
                        </span>
                      </div>
                      <span className="text-[10px] text-[#c5a059]/75">
                        点击各吉方即刻旋盘对准
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Xi Shen */}
                      <button
                        onClick={() => handleSelectAngle(todayDetails.auspiciousDirections.xiShen.angle)}
                        className="p-2.5 rounded-lg bg-[#ffd54f]/10 border border-[#ffd54f]/30 hover:border-[#ffd54f] hover:bg-[#ffd54f]/20 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-[#ffd54f] group-hover:scale-105 transition-transform">
                            {todayDetails.auspiciousDirections.xiShen.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#c5a059]/80">
                            {todayDetails.auspiciousDirections.xiShen.angle}°
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-[#fff8e1]">
                          {todayDetails.auspiciousDirections.xiShen.dir} ({todayDetails.auspiciousDirections.xiShen.mountain})
                        </div>
                        <div className="text-[9px] text-[#e8dcb8]/70 truncate mt-0.5">
                          {todayDetails.auspiciousDirections.xiShen.hint}
                        </div>
                      </button>

                      {/* Cai Shen */}
                      <button
                        onClick={() => handleSelectAngle(todayDetails.auspiciousDirections.caiShen.angle)}
                        className="p-2.5 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/30 hover:border-[#4ade80] hover:bg-[#4ade80]/20 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-[#4ade80] group-hover:scale-105 transition-transform">
                            {todayDetails.auspiciousDirections.caiShen.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#c5a059]/80">
                            {todayDetails.auspiciousDirections.caiShen.angle}°
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-[#fff8e1]">
                          {todayDetails.auspiciousDirections.caiShen.dir} ({todayDetails.auspiciousDirections.caiShen.mountain})
                        </div>
                        <div className="text-[9px] text-[#e8dcb8]/70 truncate mt-0.5">
                          {todayDetails.auspiciousDirections.caiShen.hint}
                        </div>
                      </button>

                      {/* Gui Shen */}
                      <button
                        onClick={() => handleSelectAngle(todayDetails.auspiciousDirections.guiShen.angle)}
                        className="p-2.5 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30 hover:border-[#38bdf8] hover:bg-[#38bdf8]/20 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-[#38bdf8] group-hover:scale-105 transition-transform">
                            {todayDetails.auspiciousDirections.guiShen.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#c5a059]/80">
                            {todayDetails.auspiciousDirections.guiShen.angle}°
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-[#fff8e1]">
                          {todayDetails.auspiciousDirections.guiShen.dir} ({todayDetails.auspiciousDirections.guiShen.mountain})
                        </div>
                        <div className="text-[9px] text-[#e8dcb8]/70 truncate mt-0.5">
                          {todayDetails.auspiciousDirections.guiShen.hint}
                        </div>
                      </button>

                      {/* Fu Shen */}
                      <button
                        onClick={() => handleSelectAngle(todayDetails.auspiciousDirections.fuShen.angle)}
                        className="p-2.5 rounded-lg bg-[#f472b6]/10 border border-[#f472b6]/30 hover:border-[#f472b6] hover:bg-[#f472b6]/20 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-xs text-[#f472b6] group-hover:scale-105 transition-transform">
                            {todayDetails.auspiciousDirections.fuShen.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#c5a059]/80">
                            {todayDetails.auspiciousDirections.fuShen.angle}°
                          </span>
                        </div>
                        <div className="font-semibold text-sm text-[#fff8e1]">
                          {todayDetails.auspiciousDirections.fuShen.dir} ({todayDetails.auspiciousDirections.fuShen.mountain})
                        </div>
                        <div className="text-[9px] text-[#e8dcb8]/70 truncate mt-0.5">
                          {todayDetails.auspiciousDirections.fuShen.hint}
                        </div>
                      </button>
                    </div>

                    {/* Sha Fang warning */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-950/30 border border-red-500/20 text-[11px] text-red-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{todayDetails.auspiciousDirections.shaFang.name}：{todayDetails.auspiciousDirections.shaFang.dir} ({todayDetails.auspiciousDirections.shaFang.hint})</span>
                    </div>
                  </div>

                  {/* Deities & Ceremonies */}
                  <div className="p-3.5 rounded-xl bg-black/45 border border-[#c5a059]/30 text-xs space-y-1.5">
                    <span className="font-bold text-[#ffd54f] block">道门仙真值令与醮典</span>
                    <div className="text-[11px] text-[#e8dcb8]/90 space-y-1">
                      <p>★ 值日仙真：{todayDetails.deities.dutyDeity}</p>
                      <p>★ 适逢醮事：{todayDetails.deities.sacredCeremony}</p>
                      <p>★ 临鉴真君：{todayDetails.deities.presidingSpirit}</p>
                    </div>
                  </div>

                  {/* Taoist Injunctions: Yi / Ji (Do's and Don'ts) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Yi */}
                    <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm pb-1 border-b border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>道门今日所宜 (修真正道)</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-emerald-100/90">
                        {todayDetails.injunctions.yi.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ji */}
                    <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm pb-1 border-b border-rose-500/20">
                        <XCircle className="w-4 h-4" />
                        <span>道门今日所忌 (谨戒省察)</span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-rose-100/90">
                        {todayDetails.injunctions.ji.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-rose-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Taoist Wisdom Quote */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#1c150c] to-[#0c0a06] border border-[#c5a059]/40 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Scroll className="w-4 h-4 text-[#ffd54f]" />
                      <span className="font-bold text-[#ffd54f] text-sm font-serif-sc">
                        玄门修心箴言 · {todayDetails.wisdomQuote.source}
                      </span>
                    </div>
                    <blockquote className="p-2.5 rounded-lg bg-black/40 border-l-2 border-[#ffd54f] text-[#fff8e1] font-serif-sc text-sm leading-relaxed italic">
                      “{todayDetails.wisdomQuote.quote}”
                    </blockquote>
                    <p className="text-[11px] text-[#e8dcb8]/85 leading-relaxed font-serif-sc">
                      {todayDetails.wisdomQuote.guidance}
                    </p>
                  </div>
                </div>
              ) : (
                /* ================= TAB 2: 24 SOLAR TERMS ALMANAC ================= */
                <div className="space-y-4">
                  {/* Taoist Year Overview Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-black/40 border border-[#c5a059]/25 rounded-xl text-xs">
                    <div>
                      <span className="text-[#c5a059]/70 block text-[11px]">正统纪年</span>
                      <span className="font-semibold text-sm text-[#ffd54f]">
                        道历 4723 年 (丙午)
                      </span>
                    </div>
                    <div>
                      <span className="text-[#c5a059]/70 block text-[11px]">岁次纳音</span>
                      <span className="font-medium text-sm text-[#f5ebd7]">
                        天河水 · 赤马火德
                      </span>
                    </div>
                    <div>
                      <span className="text-[#c5a059]/70 block text-[11px]">值守真君</span>
                      <span className="font-medium text-xs text-[#f5ebd7]">
                        九天玄女 · 北斗九皇当令
                      </span>
                    </div>
                  </div>

                  {/* 24 Solar Terms Interactive Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-semibold text-[#f5ebd7]">
                        二十四节气坐度 (点击罗盘即刻调向对准)
                      </span>
                      <span className="text-[11px] text-[#c5a059]/70">
                        二十四山 1:1 坐度对应
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SOLAR_TERMS_24.map((term) => {
                        const isCurrentPointed = alignedTerm.name === term.name;
                        return (
                          <button
                            key={term.name}
                            onClick={() => handleSelectTerm(term)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isCurrentPointed
                                ? 'border-[#ffd54f] bg-[#ffd54f]/15 shadow-[0_0_12px_rgba(255,213,79,0.25)]'
                                : 'border-[#c5a059]/20 hover:border-[#c5a059]/50 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className="font-bold text-sm"
                                style={{ color: term.color }}
                              >
                                {term.name}
                              </span>
                              <span className="text-[10px] text-[#c5a059]/75 font-mono">
                                {term.mountain}山 {term.angle}°
                              </span>
                            </div>
                            <div className="text-[10px] text-[#e8dcb8]/80 truncate">
                              {term.gua.split(' ')[0]}
                            </div>
                            {term.taoistFestival && (
                              <div className="text-[9px] text-[#ffd54f]/90 truncate mt-0.5">
                                ★ {term.taoistFestival.split(' ')[0]}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Taoist Sacred Three Yuan and Five La Festivals lore */}
                  <div className="p-3.5 bg-black/40 border border-[#c5a059]/20 rounded-xl text-xs space-y-2">
                    <span className="font-semibold text-sm text-[#ffd54f] block">
                      道门三元五腊与四时大醮
                    </span>
                    <p className="text-[11px] text-[#e8dcb8]/85 leading-relaxed">
                      《玄都律》云：“正月十五上元天官赐福，七月十五中元地官赦罪，十月十五下元水官解厄。五腊者，正月初一天腊，五月初五地腊，七月初七道德腊，十月初一民岁腊，十二月初八王侯腊。”道历周行二十四气，顺应阴阳消长，天人合发。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
