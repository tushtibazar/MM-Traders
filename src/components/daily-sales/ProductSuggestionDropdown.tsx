import React from 'react';
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

  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-full max-w-sm rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
      {suggestions.map((p, sIdx) => {
        const isHighlighted = sIdx === highlightedIndex;
        return (
          <button
            key={p.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(p);
            }}
            onMouseEnter={() => onHighlight(sIdx)}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
              isHighlighted
                ? isRose
                  ? 'bg-rose-50 text-rose-950 font-bold'
                  : 'bg-emerald-50 text-emerald-950 font-bold'
                : 'text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{p.name}</span>
                {isHighlighted && (
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                      isRose
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    Tab
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                কোড: {p.code} • স্টক: {p.currentStock} {p.unit}
              </div>
            </div>
            <div
              className={`text-right font-mono font-bold text-xs ${
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
