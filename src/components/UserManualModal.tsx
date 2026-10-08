import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Search,
  Compass,
  Layers,
  Flame,
  Binary,
  Maximize2,
  Wind,
  Sparkles,
  RotateCw,
  Move3d,
  CheckCircle2,
  Keyboard,
  Info,
  ArrowRight,
} from 'lucide-react';
import { ViewMode } from '../types/tao';
import { audioEngine } from '../utils/audio';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode?: (mode: ViewMode) => void;
  onToggleAutoRotate?: () => void;
  onStep?: () => void;
  onToggleArmillary?: () => void;
  onOpenEncyclopedia?: (topic?: string) => void;
}

type ChapterId =
  | 'overview'
  | 'view_modes'
  | 'controls'
  | 'rings'
  | 'instruments'
  | 'faq';

interface Chapter {
  id: ChapterId;
  title: string;
  subtitle: string;
  tag: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'overview',
    title: '器用总纲 · 乾坤法度',
    subtitle: '平台设计源流与传统数理考据',
    tag: '纲要',
  },
  {
    id: 'view_modes',
    title: '六大研览视界',
    subtitle: '从平面同心罗盘到三维立体浑天仪',
    tag: '视界',
  },
  {
    id: 'controls',
    title: '操盘手势与控台指引',
    subtitle: '自转、单步拨齿、视角旋转与调速',
    tag: '操作',
  },
  {
    id: 'rings',
    title: '罗盘周天六环详解',
    subtitle: '天池、八卦、五行、节气、二十四山与宿度',
    tag: '盘层',
  },
  {
    id: 'instruments',
    title: '辅助法器与研学工具',
    subtitle: '二十四向读数、道历节气轮与道韵百科',
    tag: '法器',
  },
  {
    id: 'faq',
    title: '疑难释义与快捷键',
    subtitle: '常见使用疑问与效率键位一览',
    tag: '问答',
  },
];

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  onToggleAutoRotate,
  onStep,
  onToggleArmillary,
  onOpenEncyclopedia,
}) => {
  const [activeChapter, setActiveChapter] = useState<ChapterId>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Close with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Action Trigger
  const handleAction = (cb?: () => void) => {
    if (cb) {
      cb();
      audioEngine.playBronzeBell();
    }
  };

  const handleModeAction = (mode: ViewMode) => {
    if (onSelectMode) {
      onSelectMode(mode);
      audioEngine.playSingingBowl(320, 1.4);
      onClose();
    }
  };

  // Filter content based on search query
  const query = searchQuery.trim().toLowerCase();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Manual Container */}
      <div
        className="relative z-10 flex flex-col w-full max-w-5xl h-[92vh] max-h-[860px] bg-[#070a10]/95 border border-[#c5a059]/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden text-[#e5dec9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header of the Manual */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c5a059]/20 bg-[#090d16]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/35 text-[#ffd54f]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wide text-[#f5ebd7] font-calligraphy">
                  道韵乾坤 · 交互使用手册
                </h2>
                <span className="text-xs text-[#c5a059]/80 font-mono">
                  v2.5 · 研览宝鉴
                </span>
              </div>
              <p className="text-xs text-[#c5a059]/70">
                太极五行三维罗盘与浑天仪操作全览 · 研玄格物指归
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input in Header */}
            <div className="relative hidden sm:block w-52 md:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#c5a059]/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索功能、视界、按键..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-[#c5a059]/30 rounded-lg text-[#f5ebd7] placeholder-[#c5a059]/40 focus:outline-none focus:border-[#c5a059]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#c5a059]/60 hover:text-[#f5ebd7]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#c5a059]/30 text-[#c5a059]/80 hover:text-[#f5ebd7] hover:border-[#c5a059] hover:bg-[#c5a059]/15 transition-all cursor-pointer"
              title="关闭使用手册 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 py-2 border-b border-[#c5a059]/20 bg-[#090d16]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#c5a059]/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="检索手册内容..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-[#c5a059]/30 rounded-lg text-[#f5ebd7] placeholder-[#c5a059]/40 focus:outline-none focus:border-[#c5a059]"
            />
          </div>
        </div>

        {/* Content Body: Sidebar Navigation + Main Reading Pane */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Chapter Nav */}
          <nav className="w-56 md:w-64 border-r border-[#c5a059]/20 bg-[#06080e]/60 flex flex-col shrink-0 overflow-y-auto p-3 space-y-1">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-[#c5a059]/60 tracking-wider">
              目录纲目
            </div>
            {CHAPTERS.map((ch, idx) => {
              const isActive = activeChapter === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChapter(ch.id);
                    audioEngine.playBronzeBell();
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                    isActive
                      ? 'bg-[#c5a059]/20 border border-[#c5a059]/50 text-[#f5ebd7] shadow-[0_0_15px_rgba(197,160,89,0.15)]'
                      : 'hover:bg-[#c5a059]/10 text-[#c5a059]/80 border border-transparent hover:text-[#f5ebd7]'
                  }`}
                >
                  <span
                    className={`mt-0.5 text-xs font-mono font-bold shrink-0 ${
                      isActive ? 'text-[#ffd54f]' : 'text-[#c5a059]/50'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium tracking-wide truncate">
                      {ch.title}
                    </div>
                    <div className="text-[11px] text-[#c5a059]/60 truncate">
                      {ch.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Quick Helper Tip in sidebar */}
            <div className="mt-auto pt-4 px-2">
              <div className="p-3 rounded-lg border border-[#c5a059]/20 bg-[#c5a059]/5 text-[11px] text-[#c5a059]/75 space-y-1">
                <div className="font-semibold text-[#ffd54f] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  研习小贴士
                </div>
                <p className="leading-relaxed">
                  随时按键 <kbd className="px-1 py-0.5 bg-black/50 border border-[#c5a059]/30 rounded text-[10px]">H</kbd> 呼出本手册，
                  按 <kbd className="px-1 py-0.5 bg-black/50 border border-[#c5a059]/30 rounded text-[10px]">空格</kbd> 可启闭天行自转。
                </p>
              </div>
            </div>
          </nav>

          {/* Right Reading Canvas */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 leading-relaxed text-[#dcd4bc]">
            {/* Search Match Alert */}
            {query && (
              <div className="p-3 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-xl text-xs text-[#ffd54f] flex items-center justify-between">
                <span>正在高亮检索词：“{query}”</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="underline text-[#e5dec9] hover:text-white"
                >
                  清除检索
                </button>
              </div>
            )}

            {/* Render Chapter Content based on activeChapter */}
            {activeChapter === 'overview' && (
              <section className="space-y-6 animate-fade-in">
                <div>
                  <div className="text-xs font-mono text-[#ffd54f] mb-1">
                    CHAPTER 01 · GENERAL PRINCIPLES
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5ebd7] font-calligraphy mb-2">
                    器用总纲 · 乾坤法度
                  </h3>
                  <p className="text-sm text-[#c5a059]/80">
                    本系统将传统东方堪舆天文学理与现代 WebGL 物理渲染深度熔铸，构筑出兼具学术严谨与沉浸审美的三维天地全息推演仪。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                    <h4 className="text-base font-semibold text-[#ffd54f] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#c5a059]" />
                      一、天圆地方之刚体架构
                    </h4>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed">
                      传统堪舆罗盘由外方盘与内圆盘构成，内盘为严格同心之刚体。天池为中枢，周天六环（八卦、五行、节气、二十四山、二十八宿、赤道度数）依序向外严丝合缝排列，体现万物同源、浑然一体之道统。
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                    <h4 className="text-base font-semibold text-[#ffd54f] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#c5a059]" />
                      二、浑天仪天球破阵之化境
                    </h4>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed">
                      汉代张衡立浑天仪，以铜环测候日月星辰。本品独创「乾坤破阵」动效，可将二维平面同心盘瞬间解体化为六道三维万向倾角铜环，各环模拟天体轨道差速咬合运转，复现古代皇家天文重器之壮阔。
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#c5a059]/20 bg-[#c5a059]/5 space-y-3">
                  <h4 className="text-sm font-semibold text-[#f5ebd7] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#ffd54f]" />
                    系统核心特性一览
                  </h4>
                  <ul className="text-xs space-y-2 text-[#c5a059]/90">
                    <li className="flex items-start gap-2">
                      <span className="text-[#ffd54f] mt-0.5">·</span>
                      <span><strong>双形态无缝切变</strong>：支持从刚体同心罗盘平面形态平滑过渡至三维多环浑天仪，支持无级滑块控制。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ffd54f] mt-0.5">·</span>
                      <span><strong>错金嵌漆微浮雕工艺</strong>：盘面环带交界处具备微细错金双弦与青铜连珠浮雕，接缝随环同步旋转，层次分明。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ffd54f] mt-0.5">·</span>
                      <span><strong>真实天象与道历联动</strong>：实时推算干支岁次、节气交节度数，支持点击节气轮直接定盘至相应天行角度。</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#ffd54f] mt-0.5">·</span>
                      <span><strong>道韵百科云端考据</strong>：内置完整五行、八卦、二十四山典籍，并支持 Google 实时联网深度研赜。</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleModeAction('compass')}
                    className="px-4 py-2 text-xs font-semibold bg-[#c5a059] text-black rounded-lg hover:bg-[#ffd54f] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    立即进入天元总览
                  </button>
                  <button
                    onClick={() => setActiveChapter('view_modes')}
                    className="px-4 py-2 text-xs font-semibold border border-[#c5a059]/40 text-[#f5ebd7] rounded-lg hover:bg-[#c5a059]/15 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    研读六大视界
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>
            )}

            {/* Chapter 02: View Modes */}
            {activeChapter === 'view_modes' && (
              <section className="space-y-6 animate-fade-in">
                <div>
                  <div className="text-xs font-mono text-[#ffd54f] mb-1">
                    CHAPTER 02 · SIX PERSPECTIVES
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5ebd7] font-calligraphy mb-2">
                    六大研览视界
                  </h3>
                  <p className="text-sm text-[#c5a059]/80">
                    点击顶栏「视角模式」下拉菜单，即可在六种截然不同的观测维度之间随心切换。
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Mode 1 */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-[#ffd54f]" />
                        <h4 className="text-base font-semibold text-[#f5ebd7]">
                          01. 天元总览 (Compass Overview)
                        </h4>
                      </div>
                      <p className="text-xs text-[#c5a059]/90">
                        【经典形态】整块同心刚体罗盘。盘面各环锁死同速旋转，严守子午磁针、八卦节气与二十四山方位对应关系。用于宏观审视全局气象与方向辨别。
                      </p>
                    </div>
                    <button
                      onClick={() => handleModeAction('compass')}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/50 text-[#ffd54f] hover:bg-[#c5a059]/20 rounded-lg cursor-pointer whitespace-nowrap self-start md:self-center"
                    >
                      切至该视界
                    </button>
                  </div>

                  {/* Mode 2 */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#ffd54f]" />
                        <h4 className="text-base font-semibold text-[#f5ebd7]">
                          02. 浑天演象 (Armillary Sphere / 乾坤破阵)
                        </h4>
                      </div>
                      <p className="text-xs text-[#c5a059]/90">
                        【天球化境】六道精铜环分别沿空间不同极轴倾斜张开（30°至81°），激活独立差速与逆顺咬合转动，展现天体周天运行之动美，支持滑块无级调节展开度。
                      </p>
                    </div>
                    <button
                      onClick={() => handleModeAction('armillary')}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/50 text-[#ffd54f] hover:bg-[#c5a059]/20 rounded-lg cursor-pointer whitespace-nowrap self-start md:self-center"
                    >
                      切至该视界
                    </button>
                  </div>

                  {/* Mode 3 */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#ffd54f]" />
                        <h4 className="text-base font-semibold text-[#f5ebd7]">
                          03. 五行生克 (Wu Xing Resonance)
                        </h4>
                      </div>
                      <p className="text-xs text-[#c5a059]/90">
                        【气机推演】金木水火土五行气场流转。右侧操控台可任选元素，罗盘与粒子场将共鸣呈现相生（木火土金水）与相克链条之神妙，点击可查典籍析解。
                      </p>
                    </div>
                    <button
                      onClick={() => handleModeAction('elements')}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/50 text-[#ffd54f] hover:bg-[#c5a059]/20 rounded-lg cursor-pointer whitespace-nowrap self-start md:self-center"
                    >
                      切至该视界
                    </button>
                  </div>

                  {/* Mode 4 */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Binary className="w-4 h-4 text-[#ffd54f]" />
                        <h4 className="text-base font-semibold text-[#f5ebd7]">
                          04. 八卦推演 (Bagua Deductions)
                        </h4>
                      </div>
                      <p className="text-xs text-[#c5a059]/90">
                        【易理阐微】聚焦先天八卦（乾南坤北、离东坎西、兑东南震东北、巽西南艮西北）方位、卦象爻画、象意及八卦与五行交泰之理。
                      </p>
                    </div>
                    <button
                      onClick={() => handleModeAction('bagua')}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/50 text-[#ffd54f] hover:bg-[#c5a059]/20 rounded-lg cursor-pointer whitespace-nowrap self-start md:self-center"
                    >
                      切至该视界
                    </button>
                  </div>

                  {/* Mode 5 */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-[#ffd54f]" />
                        <h4 className="text-base font-semibold text-[#f5ebd7]">
                          05. 分层透视 (Exploded Perspective)
                        </h4>
                      </div>
                      <p className="text-xs text-[#c5a059]/90">
                        【机关解构】罗盘各层环带在垂直高度方向按梯级悬浮分离，内部铜芯、天池、八卦、节气各层如同精密工坊拆解模型，供细致考据各层独立纹样。
                      </p>
                    </div>
                    <button
                      onClick={() => handleModeAction('exploded')}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/50 text-[#ffd54f] hover:bg-[#c5a059]/20 rounded-lg cursor-pointer whitespace-nowrap self-start md:self-center"
                    >
                      切至该视界
                    </button>
                  </div>

                  {/* Mode 6 */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Wind className="w-4 h-4 text-[#ffd54f]" />
                        <h4 className="text-base font-semibold text-[#f5ebd7]">
                          06. 阴阳吐纳 (Meditation Breathing)
                        </h4>
                      </div>
                      <p className="text-xs text-[#c5a059]/90">
                        【虚室生白】隐藏外部繁杂 HUD，中枢太极鱼伴随轻柔呼吸节律缓步脉动缩放，辅以铜磬清音，用于定心安神、吐纳养生与内景存想。
                      </p>
                    </div>
                    <button
                      onClick={() => handleModeAction('meditation')}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/50 text-[#ffd54f] hover:bg-[#c5a059]/20 rounded-lg cursor-pointer whitespace-nowrap self-start md:self-center"
                    >
                      切至该视界
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Chapter 03: Controls & Gestures */}
            {activeChapter === 'controls' && (
              <section className="space-y-6 animate-fade-in">
                <div>
                  <div className="text-xs font-mono text-[#ffd54f] mb-1">
                    CHAPTER 03 · CONTROLS & GESTURES
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5ebd7] font-calligraphy mb-2">
                    操盘手势与控台指引
                  </h3>
                  <p className="text-sm text-[#c5a059]/80">
                    无论是键鼠精密操作，还是平板触控指拨，皆可得心应手。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Top Bar Controls */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-3">
                    <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                      <RotateCw className="w-4 h-4 text-[#c5a059]" />
                      顶栏核心主控功能
                    </h4>
                    <ul className="text-xs space-y-2.5 text-[#c5a059]/90">
                      <li>
                        <strong>天行动转 / 定盘凝神</strong>：开启或暂停罗盘的自转天行运动。定盘后利于精细研察特定方位。
                      </li>
                      <li>
                        <strong>转速档位调速</strong>：提供秒针基准（1°/s，约6分钟转一圈，每山匀速停15秒）、0.5x、2x、4x、8x 等档位，可快速巡览或静笃观照。
                      </li>
                      <li>
                        <strong>单步拨齿 (15°)</strong>：点击一次单步推进一个整刻度（一山刚好等于 15 度），同时自动暂停自转，供精确研山。
                      </li>
                      <li>
                        <strong>乾坤破阵 (浑天演象)</strong>：一键展开或复位浑天铜环，亦可通过底部控制器滑块拖拽连续形变。
                      </li>
                    </ul>
                  </div>

                  {/* Right Column: Gestures & Orientation */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-3">
                    <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                      <Move3d className="w-4 h-4 text-[#c5a059]" />
                      拖拽手势与视线调整
                    </h4>
                    <ul className="text-xs space-y-2.5 text-[#c5a059]/90">
                      <li>
                        <strong>拨动罗盘模式</strong>：鼠标按住盘面拖拽即可手动旋转罗盘，带真实角动量惯性衰减。
                      </li>
                      <li>
                        <strong>三维天球模式</strong>：在顶栏「操盘」抽屉中切为「三维天球」，按住拖拽即可 360° 旋转俯仰视角，观察立体环体纵深。
                      </li>
                      <li>
                        <strong>滚轮缩放视角</strong>：鼠标滚轮前后滚动，可平滑缩放盘面视角距离。
                      </li>
                      <li>
                        <strong>盘面文字镜像</strong>：在「操盘」抽屉中开启，可将盘面贴图左右反转，适应仰观天文或特定内照图法，外部HUD读数不受影响。
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#c5a059]/20 bg-[#c5a059]/5 space-y-2">
                  <h4 className="text-sm font-semibold text-[#f5ebd7] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ffd54f]" />
                    实时操盘演练
                  </h4>
                  <p className="text-xs text-[#c5a059]/80">
                    您可以在此处直接触发操作，感受交互响应：
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      onClick={() => handleAction(onToggleAutoRotate)}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/40 rounded-lg text-[#f5ebd7] hover:bg-[#c5a059]/20 transition-all cursor-pointer"
                    >
                      启闭天行自转
                    </button>
                    <button
                      onClick={() => handleAction(onStep)}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/40 rounded-lg text-[#f5ebd7] hover:bg-[#c5a059]/20 transition-all cursor-pointer"
                    >
                      单步拨齿 15°
                    </button>
                    <button
                      onClick={() => handleAction(onToggleArmillary)}
                      className="px-3 py-1.5 text-xs border border-[#c5a059]/40 rounded-lg text-[#f5ebd7] hover:bg-[#c5a059]/20 transition-all cursor-pointer"
                    >
                      切换浑天仪 / 罗盘
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Chapter 04: The 6 Concentric Rings */}
            {activeChapter === 'rings' && (
              <section className="space-y-6 animate-fade-in">
                <div>
                  <div className="text-xs font-mono text-[#ffd54f] mb-1">
                    CHAPTER 04 · COMPASS RING STRUCTURE
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5ebd7] font-calligraphy mb-2">
                    罗盘周天六环详解
                  </h3>
                  <p className="text-sm text-[#c5a059]/80">
                    盘面自内而外严格依循古代制盘法度，由中枢天池向外层层衍化。
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>中枢枢机 · 天池海底针</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r0 核心枢纽</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      罗盘心脏，内嵌子午红丝与磁针。北极指南，针动而气显，为一切堪舆度量之准绳。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>第一环 · 先天八卦环（8 等分）</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r0 ~ r1</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      乾南坤北、离东坎西，配兑震巽艮四隅。刻有八卦正名及标准三画爻符，表天象阴阳对待之本。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>第二环 · 五行生克与合化环（10 等分）</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r1 ~ r2</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      东方甲乙木、南方丙丁火、中央戊己土、西方庚辛金、北方壬癸水。底色配青绿、朱赤、金黄、白素、玄黑，标示生克节律。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>第三环 · 二十四节气周天环（24 等分）</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r2 ~ r3</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      自冬至一阳生起，经立春、春分、夏至、立秋、秋分至大雪，记录太阳运行在黄道二十四等分点上的气候物候变迁。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>第四环 · 二十四山向环（24 等分，每山15°）</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r3 ~ r4</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      八干（甲乙丙丁庚辛壬癸）+ 十二支（子丑寅卯辰巳午未申酉戌亥）+ 四维（乾坤艮巽）。立向消砂纳水之核心刻度。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>第五环 · 二十八宿星度环（28 宿度）</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r4 ~ r5</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      青龙七宿（角亢氐房心尾箕）、玄武七宿（斗牛女虚危室壁）、白虎七宿（奎娄胃昴毕觜参）、朱雀七宿（井鬼柳星张翼轸）。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/25 bg-black/30">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#ffd54f] mb-1">
                      <span>第六环 · 周天赤道度数环（365.25°）</span>
                      <span className="font-mono text-[11px] text-[#c5a059]/60">r5 ~ r6 外缘</span>
                    </div>
                    <p className="text-xs text-[#c5a059]/90">
                      周天三百六十五度四分度之一刻度，并铸有「黄帝指南车制 · 浑天演象天元太极」御制铭文，外设金属包边与连珠浮雕。
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#c5a059]/20 bg-[#c5a059]/5 text-xs text-[#c5a059]/90 leading-relaxed">
                  <strong className="text-[#ffd54f] block mb-1">接缝错金微浮雕设计</strong>
                  每一圈接缝处均雕刻有一道极细微的古典错金阴槽（深玄色凹槽 + 1px金色弦边），并在关键交界处布置 24/48 颗青铜连珠星目。在「浑天演象」三维倾斜时，浮雕随各铜环分别自转，层次刀工明晰，绝不粘连。
                </div>
              </section>
            )}

            {/* Chapter 05: Auxiliary Instruments */}
            {activeChapter === 'instruments' && (
              <section className="space-y-6 animate-fade-in">
                <div>
                  <div className="text-xs font-mono text-[#ffd54f] mb-1">
                    CHAPTER 05 · INSTRUMENTS & TOOLS
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5ebd7] font-calligraphy mb-2">
                    辅助法器与研学工具
                  </h3>
                  <p className="text-sm text-[#c5a059]/80">
                    主舞台四周环绕精密的 HUD 天文法器组件，助您随时掌握气机流转与天象数据。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bearing Readout */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                    <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#c5a059]" />
                      二十四向实时方位读数仪
                    </h4>
                    <p className="text-xs text-[#c5a059]/90">
                      置于罗盘正下方。60fps 实时映射盘心当前朝向度数（如 0.0°、15.0°）、精准指向二十四山（如「子山」、「午山」）、先天八卦方位与五行属性。点击即可一键直通该山向的百科典籍。
                    </p>
                  </div>

                  {/* Calendar Badge */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                    <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#c5a059]" />
                      道历天象节气轮
                    </h4>
                    <p className="text-xs text-[#c5a059]/90">
                      右上角常驻。基于农历天干地支推算当日岁次（如甲辰年）、月建与日柱，实时标示当前交节节气。点击任意节气名称，罗盘将平滑自动定向对准该节气黄道度数。
                    </p>
                  </div>

                  {/* Energy Gauge */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                    <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#c5a059]" />
                      玄黄动态气场共振仪
                    </h4>
                    <p className="text-xs text-[#c5a059]/90">
                      左下角仪表。依据盘面转动角速度与天行气运实时生成「玄黄共振指数」与「天行气运量级」，反馈天人感应之动静虚实。
                    </p>
                  </div>

                  {/* Dao Wisdom Encyclopedia */}
                  <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                    <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#c5a059]" />
                      道韵百科 · 格物研玄
                    </h4>
                    <p className="text-xs text-[#c5a059]/90">
                      顶栏右侧专设入口。侧边抽屉式展开，收录全套二十四山向修学考据、八卦象意、五行生克经典，并支持一键通过 Google 实时联网查询深度学术考据。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      onOpenEncyclopedia?.('子');
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-[#c5a059]/20 hover:bg-[#c5a059]/40 border border-[#c5a059]/50 text-[#f5ebd7] rounded-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#ffd54f]" />
                    打开道韵百科查阅典籍
                  </button>
                </div>
              </section>
            )}

            {/* Chapter 06: FAQ & Shortcuts */}
            {activeChapter === 'faq' && (
              <section className="space-y-6 animate-fade-in">
                <div>
                  <div className="text-xs font-mono text-[#ffd54f] mb-1">
                    CHAPTER 06 · FAQ & SHORTCUTS
                  </div>
                  <h3 className="text-2xl font-bold text-[#f5ebd7] font-calligraphy mb-2">
                    疑难释义与快捷键
                  </h3>
                  <p className="text-sm text-[#c5a059]/80">
                    汇集使用者常见疑惑解答，助您如臂使指。
                  </p>
                </div>

                {/* Keyboard Shortcuts Table */}
                <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/40 space-y-3">
                  <h4 className="text-sm font-semibold text-[#ffd54f] flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-[#c5a059]" />
                    键盘快捷操作一览
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2 rounded bg-black/40 border border-[#c5a059]/20 flex items-center justify-between">
                      <span className="text-[#c5a059]/80">启闭自转</span>
                      <kbd className="px-1.5 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded text-[11px] font-mono text-[#ffd54f]">
                        Space 空格
                      </kbd>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-[#c5a059]/20 flex items-center justify-between">
                      <span className="text-[#c5a059]/80">使用手册</span>
                      <kbd className="px-1.5 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded text-[11px] font-mono text-[#ffd54f]">
                        H
                      </kbd>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-[#c5a059]/20 flex items-center justify-between">
                      <span className="text-[#c5a059]/80">道韵百科</span>
                      <kbd className="px-1.5 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded text-[11px] font-mono text-[#ffd54f]">
                        E
                      </kbd>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-[#c5a059]/20 flex items-center justify-between">
                      <span className="text-[#c5a059]/80">开启/静音</span>
                      <kbd className="px-1.5 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded text-[11px] font-mono text-[#ffd54f]">
                        M
                      </kbd>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-[#c5a059]/20 flex items-center justify-between">
                      <span className="text-[#c5a059]/80">单步拨齿</span>
                      <kbd className="px-1.5 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded text-[11px] font-mono text-[#ffd54f]">
                        S
                      </kbd>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-[#c5a059]/20 flex items-center justify-between">
                      <span className="text-[#c5a059]/80">退出/收起</span>
                      <kbd className="px-1.5 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded text-[11px] font-mono text-[#ffd54f]">
                        Esc
                      </kbd>
                    </div>
                  </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-xl border border-[#c5a059]/20 bg-black/30 space-y-1.5">
                    <div className="text-xs font-semibold text-[#ffd54f]">
                      问：为什么「天元总览」里每个环的转速都完全一样？
                    </div>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed">
                      答：在传统堪舆中，罗盘内盘是**整块同心的刚体木盘或铜盘**。八卦、五行、节气与二十四山是刻在同一块盘体上的固定对应刻度，若各环转速不同，方位与节气就会发生错乱。如欲观赏各环独立差速运转，请点击顶栏切入<strong>「浑天演象」</strong>模式。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/20 bg-black/30 space-y-1.5">
                    <div className="text-xs font-semibold text-[#ffd54f]">
                      问：如何快速将罗盘对准特定的节气或山向？
                    </div>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed">
                      答：有两种最便捷的方式：① 点击右上角「道历节气轮」中的任意节气，罗盘将平滑自动对准该节气对应角度；② 使用顶栏「单步拨齿 15°」按钮，罗盘会自动暂停自转并以每山 15 度为单位精确前进。
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[#c5a059]/20 bg-black/30 space-y-1.5">
                    <div className="text-xs font-semibold text-[#ffd54f]">
                      问：「盘面文字镜像」是做什么用的？
                    </div>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed">
                      答：在古代星图与内景存想法门中，有时需由下仰观天穹（仰视），此时东西方位与俯视地图恰好左右互反。在顶栏「操盘」抽屉中开启文字镜像，可反转盘面贴图，而外部 HUD 读数仪始终保持正向，满足专业研学需求。
                    </p>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#c5a059]/20 bg-[#090d16]/90 text-xs text-[#c5a059]/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c5a059]" />
            <span>太极浑天三维引擎 · 运行正常</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">道韵乾坤 · 太极五行罗盘</span>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#c5a059]/20 hover:bg-[#c5a059]/40 border border-[#c5a059]/50 rounded text-xs text-[#f5ebd7] transition-all cursor-pointer"
            >
              完成研读 (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
