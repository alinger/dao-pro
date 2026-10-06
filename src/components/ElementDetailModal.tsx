import React from 'react';
import { ElementType } from '../types/tao';
import { FIVE_ELEMENTS, TRIGRAMS } from '../data/taoData';
import { X, Sparkles, Compass } from 'lucide-react';

interface ElementDetailModalProps {
  selectedElement: ElementType | null;
  selectedTrigram: string | null;
  onClose: () => void;
  onSelectElement: (el: ElementType) => void;
}

export const ElementDetailModal: React.FC<ElementDetailModalProps> = ({
  selectedElement,
  selectedTrigram,
  onClose,
  onSelectElement,
}) => {
  const currentEl = selectedElement ? FIVE_ELEMENTS[selectedElement] : null;
  const currentTri = selectedTrigram
    ? TRIGRAMS.find((t) => t.id === selectedTrigram) || null
    : null;

  if (!currentEl && !currentTri) return null;

  return (
    <div className="fixed inset-x-4 bottom-6 sm:bottom-8 sm:right-8 sm:left-auto sm:w-[420px] z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-[#0b0e14]/90 backdrop-blur-xl border border-[#c5a059]/40 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-[#e8dcb8]">
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#c5a059]/20">
          <div className="flex items-center gap-2.5">
            <span
              className="text-2xl font-bold font-calligraphy"
              style={{ color: currentEl ? currentEl.color : '#f5ebd7' }}
            >
              {currentEl ? `${currentEl.name} · 五行行度` : `${currentTri?.name}卦 (${currentTri?.nature})`}
            </span>
            <span className="text-xs text-[#c5a059]/80 font-serif-sc">
              {currentEl ? currentEl.nature : `先天气数 ${currentTri?.numberEarly} · 后天 ${currentTri?.numberLater}`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#c5a059]/60 hover:text-[#f5ebd7] rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content for Five Element */}
        {currentEl && (
          <div className="mt-3 space-y-3.5 text-xs">
            <p className="leading-relaxed text-[#f0e6d2]/90 font-serif-sc">
              {currentEl.description}
            </p>

            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-black/40 border border-[#c5a059]/15">
              <div>
                <span className="text-[#c5a059]/70 text-[10px]">方位枢纽</span>
                <p className="font-medium text-[#f5ebd7]">{currentEl.direction}</p>
              </div>
              <div>
                <span className="text-[#c5a059]/70 text-[10px]">四季节律</span>
                <p className="font-medium text-[#f5ebd7]">{currentEl.season}</p>
              </div>
            </div>

            {/* Generation & Conquering Interactive Cycle */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[#c5a059]/70">相生：</span>
                <button
                  onClick={() => onSelectElement(currentEl.generates)}
                  className="px-2 py-0.5 rounded border border-[#c5a059]/30 text-[#f5ebd7] hover:bg-[#c5a059]/20 transition-colors"
                >
                  生 {FIVE_ELEMENTS[currentEl.generates].name} ({FIVE_ELEMENTS[currentEl.generates].nature.split(' ')[0]})
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#c5a059]/70">相克：</span>
                <button
                  onClick={() => onSelectElement(currentEl.conquers)}
                  className="px-2 py-0.5 rounded border border-rose-900/50 text-[#f5ebd7] hover:bg-rose-900/30 transition-colors"
                >
                  克 {FIVE_ELEMENTS[currentEl.conquers].name}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content for Trigram */}
        {currentTri && (
          <div className="mt-3 space-y-3 text-xs">
            {/* Visual Yao Lines Display */}
            <div className="flex items-center gap-4 p-2.5 rounded-lg bg-black/40 border border-[#c5a059]/15">
              <div className="flex flex-col gap-1 items-center justify-center pl-2">
                {currentTri.yao.map((isYang, idx) => (
                  <div key={idx} className="flex gap-1">
                    {isYang ? (
                      <div className="w-12 h-1.5 bg-[#e5be6f] rounded-xs shadow-[0_0_6px_#e5be6f]" />
                    ) : (
                      <>
                        <div className="w-5 h-1.5 bg-[#c5a059] rounded-xs" />
                        <div className="w-5 h-1.5 bg-[#c5a059] rounded-xs" />
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#c5a059]/70">卦德：{currentTri.attribute}</span>
                  <span className="text-[#c5a059]/70">象征：{currentTri.family}</span>
                </div>
                <div className="text-[11px] text-[#f5ebd7]">
                  先天方位：{currentTri.directionEarly} · 后天方位：{currentTri.directionLater}
                </div>
              </div>
            </div>

            <p className="leading-relaxed text-[#f0e6d2]/90 font-serif-sc">
              {currentTri.meaning}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
