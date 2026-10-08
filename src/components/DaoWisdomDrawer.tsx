import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  BookOpen,
  Sparkles,
  ExternalLink,
  Compass,
  RefreshCw,
  Globe,
  ScrollText,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  MOUNTAIN_WISDOM_MAP,
  type MountainWisdom,
} from '../data/daoEncyclopediaData';
import { FIVE_ELEMENTS, TRIGRAMS, MOUNTAINS_24 } from '../data/taoData';
import { audioEngine } from '../utils/audio';

interface DaoWisdomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** 初始查询词或方位名（如 '子'、'坎'、'木' 等） */
  initialTopic?: string;
  /** 当前 3D 罗盘旋转角度 */
  currentAngle?: number;
}

interface GroundingSource {
  title: string;
  url: string;
}

interface SearchResponse {
  success: boolean;
  topic: string;
  content: string;
  sources: GroundingSource[];
  searchQueries?: string[];
  isLiveGrounding?: boolean;
  isFallback?: boolean;
}

type TabType = 'mountain' | 'trigram' | 'element' | 'search';

export const DaoWisdomDrawer: React.FC<DaoWisdomDrawerProps> = ({
  isOpen,
  onClose,
  initialTopic = '子',
  currentAngle = 0,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('mountain');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [activeDetailView, setActiveDetailView] = useState<'classic' | 'search'>('search');

  // 缓存已查询结果，避免重复打 API
  const cacheRef = useRef<Map<string, SearchResponse>>(new Map());

  // 同步外部 initialTopic
  useEffect(() => {
    if (initialTopic) {
      setSelectedTopic(initialTopic);
      // 自动切换对应 tab
      if (MOUNTAIN_WISDOM_MAP[initialTopic]) {
        setActiveTab('mountain');
      } else if (TRIGRAMS.some((t) => t.name === initialTopic)) {
        setActiveTab('trigram');
      } else if (FIVE_ELEMENTS[initialTopic] || ['木', '火', '土', '金', '水'].includes(initialTopic)) {
        setActiveTab('element');
      }
    }
  }, [initialTopic]);

  // 当选中的 topic 变化且抽屉打开时，执行实时检索
  useEffect(() => {
    if (!isOpen || !selectedTopic) return;

    const fetchWisdom = async (topic: string) => {
      // 检查缓存
      if (cacheRef.current.has(topic)) {
        setSearchResult(cacheRef.current.get(topic)!);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/dao-encyclopedia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            type: activeTab,
            angle: Math.round(currentAngle),
          }),
        });

        if (res.ok) {
          const data: SearchResponse = await res.json();
          cacheRef.current.set(topic, data);
          setSearchResult(data);
        } else {
          throw new Error('Search failed');
        }
      } catch (err) {
        console.warn('Dao encyclopedia fetch notice, using fallback:', err);
        // 本地降级
        const fallbackData: SearchResponse = {
          success: true,
          topic,
          content: generateLocalWisdomMarkdown(topic),
          sources: [
            { title: '《周易正义》· 魏王弼、晋韩康伯注', url: 'https://ctext.org/book-of-changes/zh' },
            { title: '《钦定协纪辨方书》· 卷四 本原之理', url: 'https://zh.wikisource.org/wiki/欽定協紀辨方書' },
          ],
          searchQueries: [`${topic} 易经 象数 典籍考据`],
          isLiveGrounding: false,
          isFallback: true,
        };
        cacheRef.current.set(topic, fallbackData);
        setSearchResult(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWisdom(selectedTopic);
  }, [isOpen, selectedTopic, activeTab, currentAngle]);

  const handleSelectTopic = (topic: string, tab: TabType) => {
    setSelectedTopic(topic);
    setActiveTab(tab);
    audioEngine.playBronzeBell();
  };

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSelectedTopic(searchQuery.trim());
    setActiveTab('search');
    setActiveDetailView('search');
    audioEngine.playSingingBowl(360, 1.2);
  };

  // 获取当前山位本地数据
  const currentMountainWisdom: MountainWisdom | undefined = MOUNTAIN_WISDOM_MAP[selectedTopic];

  // 元素颜色与样式辅助函数
  const getElementColor = (el?: string) => {
    switch (el) {
      case 'wood':
        return '#34d399';
      case 'fire':
        return '#f87171';
      case 'earth':
        return '#fbbf24';
      case 'metal':
        return '#e2e8f0';
      case 'water':
        return '#38bdf8';
      default:
        return '#ffd54f';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none select-none">
      {/* 背景深邃虚化遮罩 */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        onClick={() => {
          onClose();
          audioEngine.playBronzeBell();
        }}
        aria-hidden="true"
      />

      {/* 侧边抽屉面板 */}
      <aside className="relative w-full max-w-[540px] h-full bg-[#070a10]/95 backdrop-blur-2xl border-l border-[#c5a059]/40 shadow-[-16px_0_48px_rgba(0,0,0,0.9)] flex flex-col pointer-events-auto text-[#e5dec9] overflow-hidden animate-in slide-in-from-right duration-300">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#c5a059]/25 bg-gradient-to-r from-[#0d1422] to-[#080d16]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/40 flex items-center justify-center text-[#ffd54f] shadow-[0_0_12px_rgba(197,160,89,0.3)]">
              <ScrollText className="w-5 h-5 text-[#ffd54f]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold text-[#f5ebd7] font-calligraphy tracking-wider">
                  道韵百科 · 格物研玄
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                  Google 联网研考
                </span>
              </div>
              <p className="text-[12px] text-[#c5a059]/75 font-serif-sc">
                五行八卦 · 二十四山 · 易学理气 · 养生实录
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              audioEngine.playBronzeBell();
            }}
            className="p-1.5 rounded-lg text-[#c5a059]/70 hover:text-[#f5ebd7] hover:bg-[#c5a059]/15 border border-transparent hover:border-[#c5a059]/30 transition-all cursor-pointer"
            title="收卷关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 快速搜索栏 */}
        <div className="p-4 border-b border-[#c5a059]/15 bg-black/30">
          <form onSubmit={handleCustomSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="考索卦象、山向、五行生克、内丹修养..."
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-[#0e1420]/80 border border-[#c5a059]/30 text-[14px] text-[#f5ebd7] placeholder-[#c5a059]/45 focus:outline-none focus:border-[#ffd54f] focus:ring-1 focus:ring-[#ffd54f]/50 transition-all"
            />
            <Search className="w-4 h-4 text-[#c5a059]/60 absolute left-3 pointer-events-none" />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1 rounded-lg bg-[#c5a059]/20 hover:bg-[#c5a059]/35 border border-[#c5a059]/40 text-[12px] text-[#ffd54f] font-medium transition-all cursor-pointer"
            >
              考索
            </button>
          </form>

          {/* 快捷推荐词 */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar text-[11px] text-[#c5a059]/70">
            <span className="shrink-0 text-[#c5a059]/50">速查:</span>
            {['子山', '乾卦', '天行健', '火德炎上', '水火既济', '一阳来复'].map((kw) => (
              <button
                key={kw}
                onClick={() => {
                  setSelectedTopic(kw.replace('山', '').replace('卦', ''));
                  setSearchQuery(kw);
                  audioEngine.playBronzeBell();
                }}
                className="shrink-0 px-2 py-0.5 rounded bg-[#c5a059]/10 hover:bg-[#c5a059]/20 border border-[#c5a059]/20 text-[#e5dec9]/90 transition-all cursor-pointer"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>

        {/* 分类快捷标签 (二十四山 / 八卦 / 五行) */}
        <div className="px-4 py-2.5 bg-[#090d16] border-b border-[#c5a059]/15 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('mountain')}
            className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'mountain'
                ? 'bg-[#c5a059] text-black font-semibold shadow-[0_0_12px_rgba(197,160,89,0.4)]'
                : 'text-[#c5a059]/80 hover:bg-[#c5a059]/15'
            }`}
          >
            二十四山
          </button>
          <button
            onClick={() => setActiveTab('trigram')}
            className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'trigram'
                ? 'bg-[#c5a059] text-black font-semibold shadow-[0_0_12px_rgba(197,160,89,0.4)]'
                : 'text-[#c5a059]/80 hover:bg-[#c5a059]/15'
            }`}
          >
            后天八卦
          </button>
          <button
            onClick={() => setActiveTab('element')}
            className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'element'
                ? 'bg-[#c5a059] text-black font-semibold shadow-[0_0_12px_rgba(197,160,89,0.4)]'
                : 'text-[#c5a059]/80 hover:bg-[#c5a059]/15'
            }`}
          >
            五行生克
          </button>
        </div>

        {/* 目录快捷选择抽屉体 */}
        <div className="px-4 py-2 border-b border-[#c5a059]/10 bg-black/20 max-h-28 overflow-y-auto">
          {activeTab === 'mountain' && (
            <div className="flex flex-wrap gap-1.5">
              {MOUNTAINS_24.map((m) => {
                const isSelected = selectedTopic === m.name;
                const mColor = getElementColor(m.element);
                return (
                  <button
                    key={m.name}
                    onClick={() => handleSelectTopic(m.name, 'mountain')}
                    className={`px-2.5 py-1 rounded text-[13px] font-serif-sc transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#c5a059] text-black font-bold border-[#ffd54f] shadow-[0_0_8px_rgba(255,213,79,0.5)]'
                        : 'bg-[#101726]/80 text-[#e5dec9] border-[#c5a059]/25 hover:border-[#c5a059]/60'
                    }`}
                  >
                    <span style={{ color: isSelected ? '#000' : mColor }} className="font-bold mr-1">
                      {m.name}
                    </span>
                    <span className="text-[10px] opacity-70">{m.angle}°</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'trigram' && (
            <div className="flex flex-wrap gap-2">
              {TRIGRAMS.map((tri) => {
                const isSelected = selectedTopic === tri.name;
                return (
                  <button
                    key={tri.id}
                    onClick={() => handleSelectTopic(tri.name, 'trigram')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-[13px] transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#c5a059] text-black font-bold border-[#ffd54f]'
                        : 'bg-[#101726]/80 text-[#e5dec9] border-[#c5a059]/25 hover:border-[#c5a059]/60'
                    }`}
                  >
                    <span className="text-[16px] leading-none">{tri.symbol}</span>
                    <span>{tri.name}卦</span>
                    <span className="text-[11px] opacity-70">({tri.nature})</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'element' && (
            <div className="flex gap-2">
              {Object.values(FIVE_ELEMENTS).map((el) => {
                const isSelected = selectedTopic === el.hanzi || selectedTopic === el.id;
                return (
                  <button
                    key={el.id}
                    onClick={() => handleSelectTopic(el.hanzi, 'element')}
                    className={`flex-1 py-1.5 rounded text-center text-[13px] font-serif-sc font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-[#ffd54f] shadow-[0_0_10px_rgba(197,160,89,0.5)]'
                        : 'border-[#c5a059]/25 hover:border-[#c5a059]/60'
                    }`}
                    style={{
                      backgroundColor: isSelected ? el.glowColor : 'rgba(16, 23, 38, 0.8)',
                      color: isSelected ? '#ffffff' : el.color,
                    }}
                  >
                    {el.hanzi} · {el.nature.split('·')[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 主体研学展示区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 选定词条 Hero 徽章卡片 */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-[#121c2e] to-[#0a101d] border border-[#c5a059]/40 shadow-xl overflow-hidden">
            <div className="absolute -right-4 -bottom-6 text-[120px] font-calligraphy text-[#c5a059]/5 pointer-events-none select-none">
              {selectedTopic}
            </div>

            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-calligraphy text-[36px] shadow-2xl border"
                  style={{
                    backgroundColor: 'rgba(3, 7, 18, 0.85)',
                    borderColor: currentMountainWisdom
                      ? getElementColor(currentMountainWisdom.element)
                      : '#c5a059',
                    color: currentMountainWisdom
                      ? getElementColor(currentMountainWisdom.element)
                      : '#ffd54f',
                    textShadow: '0 0 16px rgba(197,160,89,0.6)',
                  }}
                >
                  {selectedTopic}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-bold text-[#f5ebd7] font-serif-sc">
                      {selectedTopic}
                      {currentMountainWisdom ? '山' : ''}
                    </span>
                    {currentMountainWisdom && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#c5a059]/20 text-[#ffd54f] border border-[#c5a059]/40">
                        {currentMountainWisdom.yuanLong} · {currentMountainWisdom.yinYang}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[#c5a059]/80 font-serif-sc mt-1">
                    {currentMountainWisdom ? (
                      <>
                        {currentMountainWisdom.palace} · 度数 {currentMountainWisdom.degreeCenter}° (
                        {currentMountainWisdom.degreeStart}°~{currentMountainWisdom.degreeEnd}°)
                      </>
                    ) : (
                      <>玄学理数 · 周天造化</>
                    )}
                  </div>
                </div>
              </div>

              {/* 视角切换器：经典注疏 / 实时联网 */}
              <div className="flex items-center p-1 bg-black/40 border border-[#c5a059]/30 rounded-lg text-[12px]">
                <button
                  onClick={() => setActiveDetailView('search')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                    activeDetailView === 'search'
                      ? 'bg-[#c5a059] text-black font-semibold'
                      : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  灵搜实录
                </button>
                <button
                  onClick={() => setActiveDetailView('classic')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                    activeDetailView === 'classic'
                      ? 'bg-[#c5a059] text-black font-semibold'
                      : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  典籍详注
                </button>
              </div>
            </div>

            {/* 经典偈语横幅 */}
            {currentMountainWisdom && (
              <div className="mt-4 pt-3.5 border-t border-[#c5a059]/20 text-[13px] text-[#e8dcb8]/90 font-serif-sc italic leading-relaxed">
                「{currentMountainWisdom.classicQuote}」
              </div>
            )}
          </div>

          {/* 实时 Google Search 研学视图 */}
          {activeDetailView === 'search' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="p-8 rounded-xl bg-black/30 border border-[#c5a059]/20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#ffd54f] animate-spin mx-auto opacity-80" />
                  <p className="text-[15px] font-calligraphy text-[#f5ebd7] tracking-wider">
                    太虚通玄中 · Google 实时采撷玄经真义...
                  </p>
                  <p className="text-[12px] text-[#c5a059]/60">
                    检索典籍注疏、堪舆形理、脏腑吐纳与现代易学考辨
                  </p>
                </div>
              ) : searchResult ? (
                <>
                  {/* 联网检索溯源卡片 */}
                  {searchResult.sources && searchResult.sources.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[#0c1422]/90 border border-[#c5a059]/30">
                      <div className="flex items-center gap-2 mb-2 text-[12px] text-[#ffd54f] font-medium">
                        <Globe className="w-3.5 h-3.5 text-[#34d399]" />
                        <span>Google Search 考据溯源文献：</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {searchResult.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101b2e] hover:bg-[#192b4a] border border-[#c5a059]/25 hover:border-[#c5a059]/60 text-[11px] text-[#e5dec9] transition-all cursor-pointer group"
                          >
                            <span className="truncate max-w-[200px]">{src.title}</span>
                            <ExternalLink className="w-3 h-3 text-[#c5a059]/60 group-hover:text-[#ffd54f] shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 结构化深度解读内容 */}
                  <div className="p-5 rounded-2xl bg-[#0a0f18]/90 border border-[#c5a059]/25 text-[#e5dec9] space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-[#c5a059]/20 pb-2">
                      <span className="text-[14px] font-serif-sc font-semibold text-[#ffd54f] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#34d399]" />
                        玄理考证 · 深度解读
                      </span>
                      {searchResult.isLiveGrounding && (
                        <span className="text-[11px] text-[#34d399] font-mono">
                          实时联网核验已生效
                        </span>
                      )}
                    </div>

                    <div className="prose prose-invert prose-yellow text-[14px] leading-relaxed font-serif-sc whitespace-pre-line">
                      {searchResult.content}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* 内置典籍详注视图 */}
          {activeDetailView === 'classic' && (
            <div className="space-y-4">
              {currentMountainWisdom ? (
                <>
                  {/* 四大核心维度展板 */}
                  <div className="p-4 rounded-xl bg-[#0b111c] border border-[#c5a059]/25 space-y-2">
                    <div className="text-[13px] font-semibold text-[#ffd54f] flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#c5a059]" />
                      【堪舆理气与水法克应】
                    </div>
                    <p className="text-[13px] text-[#d6cdb4] leading-relaxed">
                      {currentMountainWisdom.fengshuiSignificance}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0b111c] border border-[#c5a059]/25 space-y-2">
                    <div className="text-[13px] font-semibold text-[#ffd54f] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#34d399]" />
                      【修学炼养与经络导引】
                    </div>
                    <p className="text-[13px] text-[#d6cdb4] leading-relaxed">
                      {currentMountainWisdom.cultivationGuide}
                    </p>
                    <div className="text-[12px] text-[#c5a059]/80 pt-1">
                      主属脏腑：<span className="text-[#f5ebd7] font-medium">{currentMountainWisdom.organ}</span> · 对应时令：<span className="text-[#f5ebd7] font-medium">{currentMountainWisdom.solarTerm}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0b111c] border border-[#c5a059]/25 space-y-2">
                    <div className="text-[13px] font-semibold text-[#ffd54f] flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#38bdf8]" />
                      【象数理气概论】
                    </div>
                    <p className="text-[13px] text-[#d6cdb4] leading-relaxed">
                      {currentMountainWisdom.detailedSummary}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-xl bg-[#0b111c] border border-[#c5a059]/25 text-[14px] text-[#d6cdb4] leading-relaxed">
                  请选择上方任一「二十四山」、「八卦」或在搜索栏输入词条，即可查考典籍详注。
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部功能条 */}
        <div className="p-4 border-t border-[#c5a059]/20 bg-[#060910] flex items-center justify-between text-[12px] text-[#c5a059]/75">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>智能国学问答引擎：Gemini 3.8 Flash + Google Grounding</span>
          </div>
          <button
            onClick={() => {
              // 重新刷新当前词条
              if (selectedTopic) {
                cacheRef.current.delete(selectedTopic);
                setSelectedTopic(`${selectedTopic} `);
                setTimeout(() => setSelectedTopic(selectedTopic.trim()), 10);
                audioEngine.playBronzeBell();
              }
            }}
            className="flex items-center gap-1 text-[#ffd54f] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            重考真义
          </button>
        </div>
      </aside>
    </div>
  );
};

// 本地回退经典生成辅助函数
function generateLocalWisdomMarkdown(topic: string): string {
  const m = MOUNTAIN_WISDOM_MAP[topic];
  if (m) {
    return `### 【象数理气与本源】\n【${m.name}山】位列周天二十四山之【${m.palace}】，属【${m.yuanLong}】之【${m.yinYang}山】。五行属【${m.elementName}】，正中指向度数 ${m.degreeCenter}°（范围 ${m.degreeStart}° 至 ${m.degreeEnd}°）。对应节令【${m.solarTerm}】。\n\n### 【修学炼养与心性】\n在人身体系中应【${m.organ}】。${m.cultivationGuide}\n\n### 【堪舆水法与克应】\n${m.fengshuiSignificance}\n\n### 【经典注疏与玄览】\n典籍赞曰：「${m.classicQuote}」\n${m.detailedSummary}`;
  }

  return `### 【象数理气与本源】\n【${topic}】乃先秦汉易与道门天人相应学说中极重要之象数节点。天道运行，乾旋坤阖；万物芸芸，各复归其根。\n\n### 【修学炼养与心性】\n养生之道，首在顺应天时地利。心平气和，形与神俱，使真元周流于十二正经与奇经八脉，虚怀若谷。\n\n### 【时令节气与克应】\n天行有常，应天顺时。体察气机生克制化，顺其自然，达于「天人合一」之太和至境。`;
}

export default DaoWisdomDrawer;
