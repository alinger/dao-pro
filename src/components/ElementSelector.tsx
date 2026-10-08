import React, { useState, useEffect } from 'react';
import { ElementType, ViewMode } from '../types/tao';
import { FIVE_ELEMENTS, TRIGRAMS } from '../data/taoData';
import { ChevronDown, ChevronUp, Sparkles, Compass, BookOpen } from 'lucide-react';

interface ElementSelectorProps {
  viewMode: ViewMode;
  selectedElement: ElementType | null;
  selectedTrigram: string | null;
  onSelectElement: (el: ElementType | null) => void;
  onSelectTrigram: (trigramId: string | null) => void;
  onOpenEncyclopedia?: (topic: string) => void;
}

export const ElementSelector: React.FC<ElementSelectorProps> = ({
  viewMode,
  selectedElement,
  selectedTrigram,
  onSelectElement,
  onSelectTrigram,
  onOpenEncyclopedia,
}) => {
  const elementsList: ElementType[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  const [activeTab, setActiveTab] = useState<'elements' | 'bagua'>('elements');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync tab with active viewMode if user changes navigation
  useEffect(() => {
    if (viewMode === 'bagua') {
      setActiveTab('bagua');
      setIsCollapsed(false);
    } else if (viewMode === 'elements') {
      setActiveTab('elements');
      setIsCollapsed(false);
    }
  }, [viewMode]);

  return (
    <div className="w-full">
      <div className="p-4 bg-black/68 backdrop-blur-md border border-[#c5a059]/40 rounded-xl shadow-2xl text-[18px] w-full transition-all hover:border-[#c5a059]/55">
        {/* Header with Tab Switcher & Collapse Toggle */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#c5a059]/20">
          <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded-lg border border-[#c5a059]/25 text-[16px]">
            <button
              onClick={() => {
                setActiveTab('elements');
                setIsCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-md font-serif-sc font-medium transition-all cursor-pointer ${
                activeTab === 'elements'
                  ? 'bg-[#c5a059] text-black font-semibold shadow-xs'
                  : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
              }`}
            >
              五行生克
            </button>
            <button
              onClick={() => {
                setActiveTab('bagua');
                setIsCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-md font-serif-sc font-medium transition-all cursor-pointer ${
                activeTab === 'bagua'
                  ? 'bg-[#c5a059] text-black font-semibold shadow-xs'
                  : 'text-[#c5a059]/80 hover:text-[#f5ebd7]'
              }`}
            >
              八卦象数
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const topic = selectedElement
                  ? FIVE_ELEMENTS[selectedElement]?.name
                  : selectedTrigram
                  ? TRIGRAMS.find((t) => t.id === selectedTrigram)?.name || '八卦'
                  : activeTab === 'elements'
                  ? '五行'
                  : '八卦';
                onOpenEncyclopedia?.(topic);
              }}
              className="p-1 text-[#ffd54f] hover:text-[#fff] bg-[#c5a059]/15 hover:bg-[#c5a059]/30 border border-[#c5a059]/35 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[12px] px-1.5"
              title="考索道韵百科"
            >
              <BookOpen className="w-3 h-3 text-[#ffd54f]" />
              <span>百科</span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-[#c5a059]/70 hover:text-[#ffd54f] rounded transition-colors cursor-pointer"
              title={isCollapsed ? '展开面板' : '折叠面板'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Content Body (Collapsible) */}
        {!isCollapsed && (
          <div className="animate-in fade-in duration-200">
            {activeTab === 'elements' ? (
              /* TAB 1: FIVE ELEMENTS */
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[15px] text-[#c5a059]/85">
                  <span>五行相生 · 循序而行</span>
                  {selectedElement && (
                    <button
                      onClick={() => onSelectElement(null)}
                      className="text-[#ffd54f] hover:underline cursor-pointer"
                    >
                      清除选择
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {elementsList.map((elId) => {
                    const el = FIVE_ELEMENTS[elId];
                    const isSelected = selectedElement === elId;
                    return (
                      <button
                        key={elId}
                        onClick={() => onSelectElement(isSelected ? null : elId)}
                        className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-white/80 bg-white/15 shadow-[0_0_12px_rgba(255,255,255,0.25)] scale-105'
                            : 'border-[#c5a059]/20 hover:border-[#c5a059]/50 hover:bg-white/5'
                        }`}
                        style={{ color: el.color }}
                      >
                        <span className="font-calligraphy text-[24px] font-bold leading-tight">{el.name}</span>
                        <span className="text-[15px] opacity-75">{el.yinYang}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedElement && (
                  <div className="pt-1.5 border-t border-[#c5a059]/15 flex items-center justify-between text-[16px] text-[#e8dcb8]">
                    <span>生：{FIVE_ELEMENTS[FIVE_ELEMENTS[selectedElement].generates].name}</span>
                    <span aria-hidden="true" className="text-[#c5a059]/40">·</span>
                    <span>克：{FIVE_ELEMENTS[FIVE_ELEMENTS[selectedElement].conquers].name}</span>
                    <span className="text-[15px] text-[#ffd54f]/90">
                      方位：{FIVE_ELEMENTS[selectedElement].direction}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: BAGUA TRIGRAMS */
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[15px] text-[#c5a059]/85">
                  <span>八卦分立 · 乾坤定位</span>
                  {selectedTrigram && (
                    <button
                      onClick={() => onSelectTrigram(null)}
                      className="text-[#ffd54f] hover:underline cursor-pointer"
                    >
                      清除选择
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {TRIGRAMS.map((tri) => {
                    const isSelected = selectedTrigram === tri.id;
                    return (
                      <button
                        key={tri.id}
                        onClick={() => onSelectTrigram(isSelected ? null : tri.id)}
                        className={`p-1.5 flex flex-col items-center rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#ffd54f] bg-[#c5a059]/25 text-[#ffd54f] shadow-[0_0_10px_rgba(255,213,79,0.4)] scale-105'
                            : 'border-[#c5a059]/20 hover:border-[#c5a059]/50 text-[#e8dcb8]/85 hover:text-[#f5ebd7]'
                        }`}
                      >
                        <span className="text-[20px] font-semibold leading-tight">{tri.name}</span>
                        <span className="text-[17px] opacity-80 leading-tight">{tri.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
