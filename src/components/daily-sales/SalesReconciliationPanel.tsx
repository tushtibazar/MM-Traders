import React from 'react';
import { Scale, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface SalesReconciliationPanelProps {
  netDailySales?: number;
  newDue: number;
  expense: number;
  onExpenseChange: (expense: number) => void;
  less?: number;
  onLessChange?: (less: number) => void;
  short?: number;
  onShortChange?: (short: number) => void;
  dsrName?: string;
  totalCash: number;
  currency?: string;
  disabled?: boolean;
}

export const SalesReconciliationPanel: React.FC<SalesReconciliationPanelProps> = ({
  netDailySales = 0,
  newDue,
  expense,
  onExpenseChange,
  less = 0,
  onLessChange,
  short = 0,
  onShortChange,
  dsrName,
  totalCash,
  currency = '৳',
  disabled = false,
}) => {
  const salesNet = Number(netDailySales) || 0;
  // Expected Cash = Net Daily Sales - Today's New Due - Expense - Less - Short
  const expectedCash = Math.max(0, salesNet - newDue - expense - (less || 0) - (short || 0));
  const difference = totalCash - expectedCash;
  const isMatch = Math.abs(difference) < 0.01;
  const isExcess = difference > 0.01;
  const isShortage = difference < -0.01;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
            <Scale className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">ক্যাশ হিসাব (Cash Reconciliation)</h3>
            <p className="text-xs text-slate-500">
              ক্যাশ, খরচ, বাকি, লেস ও শর্ট সমন্বয়
            </p>
          </div>
        </div>

        <div>
          {isMatch ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>মিলেছে</span>
            </span>
          ) : isExcess ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 bg-blue-100/80 border border-blue-200 px-2.5 py-1 rounded-md">
              <AlertCircle className="h-3.5 w-3.5 text-blue-600" />
              <span>+{currency} {difference.toLocaleString()} বেশি</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100/80 border border-rose-200 px-2.5 py-1 rounded-md">
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
              <span>-{currency} {Math.abs(difference).toLocaleString()} ঘাটতি</span>
            </span>
          )}
        </div>
      </div>

      {/* 4 Items Stacked Vertically Top to Bottom in Exact Order */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* 1. ক্যাশ (Cash) — READ-ONLY, automatically pulled from "মোট ক্যাশ" */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
              ১
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">১. ক্যাশ (Cash)</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  অটো
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                নোট হিসাব থেকে মোট ক্যাশ
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono font-black text-sm sm:text-base text-emerald-800 bg-emerald-50/90 border border-emerald-200 px-3 py-1.5 rounded-lg min-w-[120px]">
              {currency} {totalCash.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 2. খরচ (Expense) — manual number input */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-100 text-rose-800 font-bold text-xs shrink-0">
              ২
            </span>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs sm:text-sm block">২. খরচ (Expense)</span>
              <span className="text-[11px] text-slate-500 block truncate">
                ভ্যান/বাজার দৈনন্দিন খরচ
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-end shrink-0 min-w-[120px]">
            <span className="text-xs font-mono font-bold text-rose-600">{currency}</span>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={expense === 0 ? '' : expense}
              onChange={(e) => onExpenseChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0))}
              placeholder="০"
              className="w-24 sm:w-28 text-right rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-rose-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-50 transition-colors"
            />
          </div>
        </div>

        {/* 3. বাকি (Due) — READ-ONLY, automatically calculated as sum of "আজকের বাকি" */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
              ৩
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">৩. বাকি (Due)</span>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  অটো
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                আজকের নতুন বাকি তালিকা থেকে
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono font-black text-sm sm:text-base text-amber-900 bg-amber-50/90 border border-amber-200 px-3 py-1.5 rounded-lg min-w-[120px]">
              {currency} {newDue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 4. লেস (Less/Adjustment) — manual number input */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-800 font-bold text-xs shrink-0">
              ৪
            </span>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs sm:text-sm block">৪. লেস (Less/Adjustment)</span>
              <span className="text-[11px] text-slate-500 block truncate">
                ছাড় বা সমন্বয় টাকা
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-end shrink-0 min-w-[120px]">
            <span className="text-xs font-mono font-bold text-purple-600">{currency}</span>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={less === 0 ? '' : less}
              onChange={(e) => onLessChange?.(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0))}
              placeholder="০"
              className="w-24 sm:w-28 text-right rounded-lg border border-purple-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-purple-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-50 transition-colors"
            />
          </div>
        </div>

        {/* 5. শর্ট (Short / Cash Shortage) — manual number input tied to DSR */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-orange-100 text-orange-800 font-bold text-xs shrink-0">
              ৫
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-xs sm:text-sm">৫. শর্ট (Short)</span>
                {dsrName ? (
                  <span className="text-[10px] font-semibold text-orange-800 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded truncate max-w-[130px]">
                    DSR: {dsrName}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    DSR ঘাটতি
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block truncate">
                {dsrName ? `${dsrName} এর ক্যাশ শর্ট / ঘাটতি টাকা` : 'DSR এর ক্যাশ শর্ট বা ঘাটতি টাকা'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 justify-end shrink-0 min-w-[120px]">
            <span className="text-xs font-mono font-bold text-orange-600">{currency}</span>
            <input
              type="number"
              min="0"
              disabled={disabled}
              value={short === 0 ? '' : short}
              onChange={(e) => onShortChange?.(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0))}
              placeholder="০"
              className="w-24 sm:w-28 text-right rounded-lg border border-orange-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-orange-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-50 transition-colors"
            />
          </div>
        </div>

        {/* Reconciliation Comparison & Match Indicator */}
        <div className="pt-3 border-t border-slate-200 space-y-2.5">
          {/* Formula Summary Line */}
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-600">
              <span>প্রকৃত বিক্রি (Net Sales):</span>
              <span className="font-mono font-bold text-slate-800">{currency} {salesNet.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>
                বাদ: বাকি + খরচ {(less || 0) > 0 ? '+ লেস' : ''} {(short || 0) > 0 ? '+ শর্ট' : ''}:
              </span>
              <span className="font-mono font-semibold text-rose-600">
                - {currency} {(newDue + expense + (less || 0) + (short || 0)).toLocaleString()}
              </span>
            </div>
            <div className="pt-1 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900 text-xs">
              <span>প্রত্যাশিত ক্যাশ (Expected):</span>
              <span className="font-mono text-emerald-800">{currency} {expectedCash.toLocaleString()}</span>
            </div>
          </div>

          {/* Match Indicator Banner */}
          {isMatch ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-950 text-xs sm:text-sm block">
                    ✅ হিসাব মিলেছে (Match)
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    বিক্রি ও ক্যাশ সম্পূর্ণ মিলে গেছে
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-xs text-emerald-800 bg-white/80 border border-emerald-300 px-2 py-0.5 rounded">
                পার্থক্য: {currency} ০
              </span>
            </div>
          ) : isExcess ? (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-300 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <span className="font-bold text-blue-950 text-xs sm:text-sm block">
                    ⚠️ ক্যাশ বেশি (Excess Cash)
                  </span>
                  <span className="text-[11px] text-blue-700">
                    হাতে প্রত্যাশিত ক্যাশের চেয়ে বেশি জমা
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-xs text-blue-800 bg-white/80 border border-blue-300 px-2 py-0.5 rounded">
                +{currency} {difference.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold text-rose-950 text-xs sm:text-sm block">
                    ❌ ক্যাশ ঘাটতি (Cash Shortage)
                  </span>
                  <span className="text-[11px] text-rose-700">
                    হাতে প্রত্যাশিত ক্যাশের চেয়ে কম রয়েছে
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-xs text-rose-800 bg-white/80 border border-rose-300 px-2 py-0.5 rounded">
                -{currency} {Math.abs(difference).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
