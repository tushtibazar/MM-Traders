import React, { useMemo } from 'react';
import { Banknote, Calculator } from 'lucide-react';

export const DENOMINATION_LIST = [1000, 500, 200, 100, 50, 20, 10, 5] as const;

export type DenominationMap = {
  [key: number]: number | '';
  other?: number | '';
};

interface CashDenominationTableProps {
  values: DenominationMap;
  onChange: (values: DenominationMap) => void;
  currency?: string;
  disabled?: boolean;
}

const BENGALI_DENOMINATION_LABELS: { [key: number]: string } = {
  1000: '১০০০ টাকার নোট',
  500: '৫০০ টাকার নোট',
  200: '২০০ টাকার নোট',
  100: '১০০ টাকার নোট',
  50: '৫০ টাকার নোট',
  20: '২০ টাকার নোট',
  10: '১০ টাকার নোট',
  5: '৫ টাকার নোট',
};

export const CashDenominationTable: React.FC<CashDenominationTableProps> = ({
  values,
  onChange,
  currency = '৳',
  disabled = false,
}) => {
  const handleCountChange = (denom: number, countStr: string) => {
    if (disabled) return;
    const countVal = countStr === '' ? '' : Math.max(0, parseInt(countStr, 10) || 0);
    onChange({
      ...values,
      [denom]: countVal,
    });
  };

  const subtotals = useMemo(() => {
    return DENOMINATION_LIST.map((denom) => {
      const count = Number(values[denom]) || 0;
      return {
        denom,
        count,
        subtotal: denom * count,
      };
    });
  }, [values]);

  const totalCash = useMemo(() => {
    const notesTotal = subtotals.reduce((sum, item) => sum + item.subtotal, 0);
    const otherVal = Number(values.other) || 0;
    return notesTotal + otherVal;
  }, [subtotals, values.other]);

  const totalNoteCount = useMemo(() => {
    return subtotals.reduce((sum, item) => sum + item.count, 0);
  }, [subtotals]);

  const otherAmount = values.other ?? '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Banknote className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">নোট হিসাব (Cash Denomination)</h3>
            <p className="text-xs text-slate-500">
              হাতে থাকা ক্যাশ নোটের সংখ্যা হিসাব
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
            মোট নোট: <strong className="font-mono text-slate-900">{totalNoteCount}</strong> টি
          </span>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-3 py-1 rounded-md">
            মোট ক্যাশ: {currency} {totalCash.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-700">
              <th className="py-2.5 px-4 w-1/3">১. নোট</th>
              <th className="py-2.5 px-4 text-center w-1/3">২. সংখ্যা (নোটের সংখ্যা)</th>
              <th className="py-2.5 px-4 text-right w-1/3">৩. সাবটোটাল (টাকা)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DENOMINATION_LIST.map((denom, idx) => {
              const count = values[denom] ?? '';
              const subtotal = denom * (Number(count) || 0);

              return (
                <tr
                  key={denom}
                  className={`transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  } hover:bg-emerald-50/30`}
                >
                  {/* 1. নোট */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                        {currency} {denom}
                      </span>
                      <span className="text-slate-600 text-xs hidden sm:inline">
                        ({BENGALI_DENOMINATION_LABELS[denom]})
                      </span>
                    </div>
                  </td>

                  {/* 2. সংখ্যা */}
                  <td className="py-2.5 px-4 text-center">
                    <input
                      type="number"
                      min="0"
                      disabled={disabled}
                      value={count}
                      onChange={(e) => handleCountChange(denom, e.target.value)}
                      placeholder="০"
                      className="w-28 sm:w-36 text-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 transition-colors"
                    />
                  </td>

                  {/* 3. সাবটোটাল */}
                  <td className="py-2.5 px-4 text-right">
                    <span className="font-mono font-bold text-xs sm:text-sm text-emerald-800">
                      {currency} {subtotal.toLocaleString()}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* ৪. অন্যান্য (Other - e.g. coins or odd amounts) */}
            <tr className="border-t border-slate-200 bg-slate-50/70 hover:bg-emerald-50/30 transition-colors">
              <td className="py-2.5 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800 bg-slate-200/90 px-2 py-0.5 rounded border border-slate-300 text-xs">
                    অন্যান্য
                  </span>
                  <span className="text-slate-500 text-xs hidden sm:inline">
                    (কয়েন / ভাংতি)
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-4 text-center">
                <span className="text-slate-400 font-mono text-xs select-none">—</span>
              </td>
              <td className="py-2.5 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-mono font-bold text-slate-500">{currency}</span>
                  <input
                    type="number"
                    min="0"
                    disabled={disabled}
                    value={otherAmount === 0 ? '' : otherAmount}
                    onChange={(e) => {
                      if (disabled) return;
                      const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0);
                      onChange({
                        ...values,
                        other: val,
                      });
                    }}
                    placeholder="০"
                    className="w-24 sm:w-32 text-right rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 transition-colors"
                  />
                </div>
              </td>
            </tr>
          </tbody>

          {/* মোট ক্যাশ ফুটার */}
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-emerald-50/60 font-bold text-xs sm:text-sm">
              <td className="py-3 px-4 text-slate-900 font-extrabold flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-emerald-700" />
                <span>মোট ক্যাশ (Total Cash)</span>
              </td>
              <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                {totalNoteCount} টি নোট
              </td>
              <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm sm:text-base">
                {currency} {totalCash.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
