import React, { useMemo } from 'react';
import { Banknote, Calculator, Plus, Trash2 } from 'lucide-react';

export const DENOMINATION_LIST = [1000, 500, 200, 100, 50, 20, 10, 5] as const;

export interface OtherCashRow {
  id: string;
  label?: string;
  amount: number | '';
}

export type DenominationMap = {
  [key: number]: number | '';
  other?: number | '';
  otherEntries?: OtherCashRow[];
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

  // Dynamic multiple "অন্যান্য" rows list
  const otherRows: OtherCashRow[] = useMemo(() => {
    if (values.otherEntries && Array.isArray(values.otherEntries) && values.otherEntries.length > 0) {
      return values.otherEntries;
    }
    if (values.other !== undefined && values.other !== '' && Number(values.other) > 0) {
      return [{ id: 'other-1', label: 'অন্যান্য ১', amount: values.other }];
    }
    return [{ id: 'other-1', label: 'অন্যান্য ১', amount: '' }];
  }, [values.otherEntries, values.other]);

  const handleAddOtherRow = () => {
    if (disabled) return;
    const nextIdx = otherRows.length + 1;
    const newRow: OtherCashRow = {
      id: `other-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `অন্যান্য ${nextIdx}`,
      amount: '',
    };
    const updated = [...otherRows, newRow];
    const newOtherTotal = updated.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    onChange({
      ...values,
      other: newOtherTotal,
      otherEntries: updated,
    });
  };

  const handleOtherRowChange = (id: string, countStr: string) => {
    if (disabled) return;
    const val: number | '' = countStr === '' ? '' : Math.max(0, Number(countStr) || 0);
    const updated: OtherCashRow[] = otherRows.map((r) => (r.id === id ? { ...r, amount: val } : r));
    const newOtherTotal = updated.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    onChange({
      ...values,
      other: newOtherTotal,
      otherEntries: updated,
    });
  };

  const handleDeleteOtherRow = (id: string) => {
    if (disabled) return;
    let updated: OtherCashRow[] = otherRows.filter((r) => r.id !== id);
    if (updated.length === 0) {
      updated = [{ id: `other-${Date.now()}`, label: 'অন্যান্য ১', amount: '' }];
    } else {
      updated = updated.map((r, i): OtherCashRow => ({ ...r, label: `অন্যান্য ${i + 1}` }));
    }
    const newOtherTotal = updated.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    onChange({
      ...values,
      other: newOtherTotal,
      otherEntries: updated,
    });
  };

  const totalCash = useMemo(() => {
    const notesTotal = subtotals.reduce((sum, item) => sum + item.subtotal, 0);
    const otherTotal = otherRows.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return notesTotal + otherTotal;
  }, [subtotals, otherRows]);

  const totalNoteCount = useMemo(() => {
    return subtotals.reduce((sum, item) => sum + item.count, 0);
  }, [subtotals]);

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

            {/* ৪. ডাইনামিক একাধিক অন্যান্য রো (Dynamic Multiple Other Rows) */}
            {otherRows.map((row, idx) => (
              <tr
                key={row.id}
                className="border-t border-slate-200 bg-slate-50/70 hover:bg-emerald-50/30 transition-colors"
              >
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-800 bg-slate-200/90 px-2 py-0.5 rounded border border-slate-300 text-xs">
                      {row.label || `অন্যান্য ${idx + 1}`}
                    </span>
                    <span className="text-slate-500 text-xs hidden sm:inline">
                      (কয়েন / ভাংতি)
                    </span>
                    {/* Small "+" (plus) button next to other row */}
                    {idx === 0 && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={handleAddOtherRow}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold border border-emerald-300 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                        title="আরেকটি অন্যান্য রো যোগ করুন"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>যোগ (+)</span>
                      </button>
                    )}
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
                      value={row.amount === 0 ? '' : row.amount}
                      onChange={(e) => handleOtherRowChange(row.id, e.target.value)}
                      placeholder="০"
                      className="w-24 sm:w-32 text-right rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 transition-colors"
                    />
                    {otherRows.length > 1 && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDeleteOtherRow(row.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="এই রো মুছুন"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
