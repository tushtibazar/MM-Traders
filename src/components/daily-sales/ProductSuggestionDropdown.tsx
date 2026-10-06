import React, { useRef, useEffect } from 'react';
import { Product } from '../../types';

export interface ProductSuggestionDropdownProps {
  suggestions: Product[];
  highlightedIndex: number;
  currency: string;
  variant?: 'emerald' | 'rose';
  onSelect: (product: Product) => void;
  onHighlight: (index: number) => void;
}

export const ProductSuggestionDropdown: React.FC<ProductSuggestionDropdownProps> = ({
  suggestions,
  highlightedIndex,
  currency,
  variant = 'emerald',
  onSelect,
  onHighlight,
}) => {
  const isRose = variant === 'rose';
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Automatically scroll the highlighted item into view inside the dropdown
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (highlightedIndex === 0) {
      container.scrollTop = 0;
      return;
    }

    // Locate the highlighted button
    const item =
      itemRefs.current[highlightedIndex] ||
      container.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`) ||
      container.querySelector<HTMLElement>('[data-highlighted="true"]');
    if (!item) return;

    // Height of sticky header
    const header = container.firstElementChild as HTMLElement | null;
    const headerHeight = header ? header.offsetHeight : 34;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    const visibleTop = containerRect.top + headerHeight;
    const visibleBottom = containerRect.bottom;

    if (itemRect.top < visibleTop) {
      // Scrolled above visible area or hidden under sticky header: scroll UP so it's fully visible
      const diff = visibleTop - itemRect.top;
      container.scrollTop = Math.max(0, container.scrollTop - diff - 4);
    } else if (itemRect.bottom > visibleBottom) {
      // Scrolled below visible area: scroll DOWN so it's fully visible
      const diff = itemRect.bottom - visibleBottom;
      container.scrollTop = container.scrollTop + diff + 4;
    }
  }, [highlightedIndex, suggestions]);

  return (
    <div
      ref={containerRef}
      id={isRose ? 'damage-product-suggestions-dropdown' : 'sales-product-suggestions-dropdown'}
      className="absolute z-50 left-0 top-full mt-1 w-full min-w-[320px] max-w-md max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/10 select-none divide-y divide-slate-100"
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Sticky Informative Header showing total match count and navigation hints */}
      <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-[10px] font-semibold text-slate-600 flex justify-between items-center shadow-xs">
        <span className="flex items-center gap-1.5 font-bengali">
          <span className={`inline-block h-2 w-2 rounded-full ${isRose ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          মিল পাওয়া পণ্য: <strong className={isRose ? 'text-rose-700' : 'text-emerald-700'}>{suggestions.length}</strong> টি
        </span>
        <span className="text-[9px] text-slate-400 font-mono">
          ↑↓ স্ক্রোল • Tab/Enter নির্বাচন
        </span>
      </div>

      {/* Render ALL matching products */}
      {suggestions.map((p, sIdx) => {
        const isHighlighted = sIdx === highlightedIndex;
        return (
          <button
            key={p.id || `${p.code}-${sIdx}`}
            ref={(el) => {
              itemRefs.current[sIdx] = el;
            }}
            type="button"
            data-index={sIdx}
            data-highlighted={isHighlighted ? 'true' : undefined}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(p);
            }}
            onMouseMove={() => {
              if (sIdx !== highlightedIndex) {
                onHighlight(sIdx);
              }
            }}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
              isHighlighted
                ? isRose
                  ? 'bg-rose-100 text-rose-950 font-bold border-l-4 border-rose-600 pl-2 shadow-inner ring-1 ring-rose-300/60'
                  : 'bg-emerald-100 text-emerald-950 font-bold border-l-4 border-emerald-600 pl-2 shadow-inner ring-1 ring-emerald-300/60'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{p.name}</span>
                {isHighlighted && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 shadow-2xs ${
                      isRose
                        ? 'bg-rose-200 text-rose-900 border border-rose-300'
                        : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    Tab
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                কোড: <span className="font-mono">{p.code}</span> • স্টক: {p.currentStock} {p.unit}
              </div>
            </div>
            <div
              className={`text-right font-mono font-bold text-xs shrink-0 ${
                isRose ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {currency} {p.salePrice}
            </div>
          </button>
        );
      })}
    </div>
  );
};
