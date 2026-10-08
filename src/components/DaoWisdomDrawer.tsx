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
  const [activeDetailView, setActiveDetailView] = useState<'classic' | 'search'>('classic');

  // Sync initial topic when drawer opens or initialTopic changes
  useEffect(() => {
    if (initialTopic) {
      setSelectedTopic(initialTopic);
      // Auto-detect tab
      if (MOUNTAIN_WISDOM_MAP[initialTopic]) {
        setActiveTab('mountain');
      } else if (TRIGRAMS.some((t) => t.name === initialTopic)) {
        setActiveTab('trigram');
      } else if (Object.values(FIVE_ELEMENTS).some((e) => e.name === initialTopic)) {
        setActiveTab('element');
      }
    }
  }, [initialTopic, isOpen]);

  // Handle Online Search with Gemini + Google Grounding
  const handlePerformSearch = async (topic: string) => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setActiveDetailView('search');
    try {
      const res = await fetch('/api/search-wisdom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data: SearchResponse = await res.json();
      setSearchResult(data);
      audioEngine.playSingingBowl(360, 1.2);
    } catch (err) {
      console.error('Failed to search wisdom:', err);
      setSearchResult({
        success: false,
        topic,
        content: `【典籍研索】\n关于「${topic}」的天象易理，在周天五行流转中独具法度。天地合德，阴阳相摩，神明自生。`,
        sources: [],
        isFallback: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close drawer on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentMountain: MountainWisdom | undefined = MOUNTAIN_WISDOM_MAP[selectedTopic];
  const currentTrigram = TRIGRAMS.find((t) => t.name === selectedTopic);
  const currentElement = Object.values(FIVE_ELEMENTS).find((e) => e.name === selectedTopic);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
        <div className="w-screen max-w-xl md:max-w-2xl bg-[#070a10]/95 border-l border-[#c5a059]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col text-[#e5dec9]">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#c5a059]/20 bg-[#090d16]/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/35 text-[#ffd54f]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-wide text-[#f5ebd7] font-calligraphy">
                  道韵百科 · 格物研玄
                </h3>
                <p className="text-xs text-[#c5a059]/70">
                  周天二十四山 · 八卦玄化 · 五行真机全典
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#c5a059]/30 text-[#c5a059]/80 hover:text-[#f5ebd7] hover:border-[#c5a059] hover:bg-[#c5a059]/15 transition-all cursor-pointer"
              title="收起抽屉 (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Tabs Header */}
          <div className="p-4 border-b border-[#c5a059]/20 bg-black/40 space-y-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#c5a059]/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handlePerformSearch(searchQuery.trim());
                  }
                }}
                placeholder="键入任意二十四山、八卦、五行或天象词条..."
                className="w-full pl-9 pr-24 py-2 text-xs bg-black/50 border border-[#c5a059]/30 rounded-xl text-[#f5ebd7] placeholder-[#c5a059]/40 focus:outline-none focus:border-[#ffd54f]"
              />
              <button
                onClick={() => handlePerformSearch(searchQuery.trim())}
                disabled={!searchQuery.trim() || isLoading}
                className="absolute right-1.5 top-1.5 px-3 py-1 text-xs font-semibold bg-[#c5a059]/25 hover:bg-[#c5a059]/40 border border-[#c5a059]/50 rounded-lg text-[#ffd54f] transition-all cursor-pointer disabled:opacity-40"
              >
                {isLoading ? '考据中...' : '深度研考'}
              </button>
            </div>

            {/* Segmented Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-[#c5a059]/20 rounded-xl text-xs">
              <button
                onClick={() => {
                  setActiveTab('mountain');
                  audioEngine.playBronzeBell();
                }}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  activeTab === 'mountain'
                    ? 'bg-[#c5a059] text-black font-semibold'
                    : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                }`}
              >
                二十四山向
              </button>
              <button
                onClick={() => {
                  setActiveTab('trigram');
                  audioEngine.playBronzeBell();
                }}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  activeTab === 'trigram'
                    ? 'bg-[#c5a059] text-black font-semibold'
                    : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                }`}
              >
                先天八卦
              </button>
              <button
                onClick={() => {
                  setActiveTab('element');
                  audioEngine.playBronzeBell();
                }}
                className={`flex-1 py-1.5 rounded-lg text-center font-medium transition-all cursor-pointer ${
                  activeTab === 'element'
                    ? 'bg-[#c5a059] text-black font-semibold'
                    : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
                }`}
              >
                五行生克
              </button>
            </div>
          </div>

          {/* Quick Select Grid for current Category */}
          <div className="px-4 py-2.5 border-b border-[#c5a059]/15 bg-[#090d16]/40 shrink-0 overflow-x-auto">
            {activeTab === 'mountain' && (
              <div className="flex items-center gap-1.5 min-w-max pb-1">
                {Object.keys(MOUNTAIN_WISDOM_MAP).map((mName) => {
                  const isSel = selectedTopic === mName;
                  return (
                    <button
                      key={mName}
                      onClick={() => {
                        setSelectedTopic(mName);
                        setActiveDetailView('classic');
                        audioEngine.playBronzeBell();
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#c5a059] text-black font-bold border-[#ffd54f]'
                          : 'border-[#c5a059]/25 text-[#c5a059]/80 hover:border-[#c5a059]/60 hover:text-[#f5ebd7]'
                      }`}
                    >
                      {mName}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'trigram' && (
              <div className="flex items-center gap-2 min-w-max pb-1">
                {TRIGRAMS.map((tri) => {
                  const isSel = selectedTopic === tri.name;
                  return (
                    <button
                      key={tri.id}
                      onClick={() => {
                        setSelectedTopic(tri.name);
                        setActiveDetailView('classic');
                        audioEngine.playBronzeBell();
                      }}
                      className={`px-3 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[#c5a059] text-black font-bold border-[#ffd54f]'
                          : 'border-[#c5a059]/25 text-[#c5a059]/80 hover:border-[#c5a059]/60 hover:text-[#f5ebd7]'
                      }`}
                    >
                      <span>{tri.symbol}</span>
                      <span>{tri.name}卦</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'element' && (
              <div className="flex items-center gap-2 min-w-max pb-1">
                {Object.values(FIVE_ELEMENTS).map((elem) => {
                  const isSel = selectedTopic === elem.name;
                  return (
                    <button
                      key={elem.id}
                      onClick={() => {
                        setSelectedTopic(elem.name);
                        setActiveDetailView('classic');
                        audioEngine.playBronzeBell();
                      }}
                      className={`px-3 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-[#c5a059] text-black font-bold border-[#ffd54f]'
                          : 'border-[#c5a059]/25 text-[#c5a059]/80 hover:border-[#c5a059]/60 hover:text-[#f5ebd7]'
                      }`}
                    >
                      <span>{elem.name}</span>
                      <span className="text-[10px] opacity-70">({elem.direction})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 leading-relaxed">
            {/* View Switch Buttons (Classic Lore vs Cloud Grounding) */}
            <div className="flex items-center justify-between pb-2 border-b border-[#c5a059]/20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDetailView('classic')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    activeDetailView === 'classic'
                      ? 'bg-[#c5a059]/25 border border-[#c5a059] text-[#ffd54f]'
                      : 'text-[#c5a059]/70 hover:text-[#f5ebd7]'
                  }`}
                >
                  经典法统释义
                </button>
                <button
                  onClick={() => {
                    setActiveDetailView('search');
                    if (!searchResult || searchResult.topic !== selectedTopic) {
                      handlePerformSearch(selectedTopic);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeDetailView === 'search'
                      ? 'bg-[#c5a059]/25 border border-[#c5a059] text-[#ffd54f]'
                      : 'text-[#c5a059]/70 hover:text-[#f5ebd7]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Google 实时考据</span>
                </button>
              </div>

              <span className="text-xs text-[#c5a059]/60 font-mono">
                研览词条 · {selectedTopic}
              </span>
            </div>

            {/* View A: Classic Lore View */}
            {activeDetailView === 'classic' && (
              <div className="space-y-6 animate-fade-in">
                {currentMountain && (
                  <>
                    {/* Header Card */}
                    <div className="p-5 rounded-2xl bg-black/40 border border-[#c5a059]/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-bold font-calligraphy text-[#ffd54f]">
                            {currentMountain.name}
                          </span>
                          <div>
                            <div className="text-base font-semibold text-[#f5ebd7]">
                              {currentMountain.category}山向 · 坐{currentMountain.name}向
                              {MOUNTAIN_WISDOM_MAP[currentMountain.name]?.bagua}
                            </div>
                            <div className="text-xs text-[#c5a059]/70 flex items-center gap-2 mt-0.5">
                              <span>五行：{currentMountain.element}</span>
                              <span>·</span>
                              <span>阴阳：{currentMountain.yinYang}</span>
                              <span>·</span>
                              <span>归卦：{currentMountain.bagua}卦</span>
                              <span>·</span>
                              <span>周天角：{currentMountain.angle}°</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#c5a059]/15 text-[#ffd54f] border border-[#c5a059]/30">
                          {currentMountain.category}
                        </span>
                      </div>

                      {/* Ancient Poem */}
                      <div className="p-3.5 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/25 text-xs text-[#ffd54f] font-serif-sc italic leading-relaxed">
                        “{currentMountain.ancientPoem}”
                      </div>
                    </div>

                    {/* Classic Quote */}
                    <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                      <div className="text-xs font-semibold text-[#ffd54f] flex items-center gap-1.5">
                        <ScrollText className="w-4 h-4 text-[#c5a059]" />
                        <span>经籍原典</span>
                      </div>
                      <p className="text-xs text-[#c5a059]/90 leading-relaxed font-serif-sc">
                        {currentMountain.classicQuote}
                      </p>
                    </div>

                    {/* Astronomy Origin */}
                    <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                      <div className="text-xs font-semibold text-[#ffd54f] flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-[#c5a059]" />
                        <span>天象宿度考源</span>
                      </div>
                      <p className="text-xs text-[#c5a059]/90 leading-relaxed font-serif-sc">
                        {currentMountain.astronomyOrigin}
                      </p>
                    </div>

                    {/* Fengshui Significance */}
                    <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                      <div className="text-xs font-semibold text-[#ffd54f] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                        <span>堪舆象数妙用</span>
                      </div>
                      <p className="text-xs text-[#c5a059]/90 leading-relaxed font-serif-sc">
                        {currentMountain.fengshuiSignificance}
                      </p>
                    </div>

                    {/* Cultivation Virtue */}
                    <div className="p-4 rounded-xl border border-[#c5a059]/25 bg-black/30 space-y-2">
                      <div className="text-xs font-semibold text-[#ffd54f] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#c5a059]" />
                        <span>道法自然修持</span>
                      </div>
                      <p className="text-xs text-[#c5a059]/90 leading-relaxed font-serif-sc">
                        {currentMountain.cultivationVirtue}
                      </p>
                    </div>
                  </>
                )}

                {/* If selected topic is Trigram */}
                {currentTrigram && (
                  <div className="p-5 rounded-2xl bg-black/40 border border-[#c5a059]/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-mono text-[#ffd54f]">
                        {currentTrigram.symbol}
                      </span>
                      <div>
                        <h4 className="text-xl font-bold font-calligraphy text-[#f5ebd7]">
                          {currentTrigram.name}卦 · {currentTrigram.nature}
                        </h4>
                        <div className="text-xs text-[#c5a059]/70">
                          先天{currentTrigram.directionEarly} · 后天{currentTrigram.directionLater} · 象{currentTrigram.family}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed font-serif-sc">
                      {currentTrigram.meaning}
                    </p>
                  </div>
                )}

                {/* If selected topic is Element */}
                {currentElement && (
                  <div className="p-5 rounded-2xl bg-black/40 border border-[#c5a059]/30 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold font-calligraphy text-[#ffd54f]">
                        {currentElement.name}
                      </span>
                      <div>
                        <h4 className="text-lg font-bold text-[#f5ebd7]">
                          五行之{currentElement.name} · {currentElement.nature}
                        </h4>
                        <div className="text-xs text-[#c5a059]/70">
                          位{currentElement.direction} · 季{currentElement.season}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#c5a059]/90 leading-relaxed font-serif-sc">
                      {currentElement.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* View B: Live Cloud Search View */}
            {activeDetailView === 'search' && (
              <div className="space-y-4 animate-fade-in">
                {isLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3 text-center">
                    <RefreshCw className="w-8 h-8 text-[#ffd54f] animate-spin" />
                    <p className="text-xs text-[#c5a059]/80">
                      正在连线 Google 实时检索古今天文典籍与周易考据...
                    </p>
                  </div>
                ) : searchResult ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-[#c5a059]/30 bg-black/50 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#ffd54f]">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Globe className="w-4 h-4" />
                          联网考据成果
                        </span>
                        {searchResult.isLiveGrounding && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 text-[10px]">
                            Google Search Grounded
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#dcd4bc] whitespace-pre-wrap leading-relaxed font-serif-sc">
                        {searchResult.content}
                      </div>
                    </div>

                    {/* Sources */}
                    {searchResult.sources && searchResult.sources.length > 0 && (
                      <div className="p-4 rounded-xl border border-[#c5a059]/20 bg-black/30 space-y-2">
                        <div className="text-xs font-semibold text-[#c5a059]/80 flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                          引证学术出处与典籍索引：
                        </div>
                        <ul className="text-xs space-y-1.5">
                          {searchResult.sources.map((src, i) => (
                            <li key={i}>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#ffd54f] hover:underline flex items-center gap-1 truncate"
                              >
                                <ChevronRight className="w-3 h-3 shrink-0" />
                                <span className="truncate">{src.title}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#c5a059]/60">
                    点击上方「深度研考」即可开展联网考据。
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
