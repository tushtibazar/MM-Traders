import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface DailySummaryRow {
  date: string;
  salesAmount: number;
  salesCount: number;
  lessAmount: number;
  expenseAmount: number;
  shortAmount: number;
  damageAmount: number;
}

interface MonthlySalesPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  monthNameBn: string;
  year: number;
  dailySales: { date: string; salesAmount: number; sheetCount: number }[];
  dailyLess: { date: string; lessAmount: number }[];
  dailyExpense: { date: string; expenseAmount: number }[];
  dailyShort?: { date: string; shortAmount: number }[];
  dailyDamage?: { date: string; damageAmount: number }[];
  totalSales: number;
  totalLess: number;
  totalExpense: number;
  totalShort?: number;
  totalDamage?: number;
  initialAction?: 'png' | 'pdf' | null;
}

export const MonthlySalesPrintPreviewModal: React.FC<MonthlySalesPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  monthNameBn,
  year,
  dailySales,
  dailyLess,
  dailyExpense,
  dailyShort = [],
  dailyDamage = [],
  totalSales,
  totalLess,
  totalExpense,
  totalShort = 0,
  totalDamage = 0,
  initialAction = null,
}) => {
  // Combine all active dates in month
  const consolidatedRows = useMemo(() => {
    const map = new Map<string, DailySummaryRow>();

    dailySales.forEach((s) => {
      const cur = map.get(s.date) || {
        date: s.date,
        salesAmount: 0,
        salesCount: 0,
        lessAmount: 0,
        expenseAmount: 0,
        shortAmount: 0,
        damageAmount: 0,
      };
      cur.salesAmount += s.salesAmount;
      cur.salesCount += s.sheetCount;
      map.set(s.date, cur);
    });

    dailyLess.forEach((l) => {
      const cur = map.get(l.date) || {
        date: l.date,
        salesAmount: 0,
        salesCount: 0,
        lessAmount: 0,
        expenseAmount: 0,
        shortAmount: 0,
        damageAmount: 0,
      };
      cur.lessAmount += l.lessAmount;
      map.set(l.date, cur);
    });

    dailyExpense.forEach((e) => {
      const cur = map.get(e.date) || {
        date: e.date,
        salesAmount: 0,
        salesCount: 0,
        lessAmount: 0,
        expenseAmount: 0,
        shortAmount: 0,
        damageAmount: 0,
      };
      cur.expenseAmount += e.expenseAmount;
      map.set(e.date, cur);
    });

    (dailyShort || []).forEach((sh) => {
      const cur = map.get(sh.date) || {
        date: sh.date,
        salesAmount: 0,
        salesCount: 0,
        lessAmount: 0,
        expenseAmount: 0,
        shortAmount: 0,
        damageAmount: 0,
      };
      cur.shortAmount += sh.shortAmount;
      map.set(sh.date, cur);
    });

    (dailyDamage || []).forEach((dmg) => {
      const cur = map.get(dmg.date) || {
        date: dmg.date,
        salesAmount: 0,
        salesCount: 0,
        lessAmount: 0,
        expenseAmount: 0,
        shortAmount: 0,
        damageAmount: 0,
      };
      cur.damageAmount += dmg.damageAmount;
      map.set(dmg.date, cur);
    });

    const rows = Array.from(map.values());
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [dailySales, dailyLess, dailyExpense, dailyShort, dailyDamage]);

  // Paginate: 22 dates per page
  const ITEMS_PER_PAGE = 22;
  const pages = useMemo(() => {
    if (consolidatedRows.length === 0) return [[]];
    const chunks: DailySummaryRow[][] = [];
    for (let i = 0; i < consolidatedRows.length; i += ITEMS_PER_PAGE) {
      chunks.push(consolidatedRows.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [consolidatedRows]);

  const totalPages = pages.length;
  const netBalance = totalSales - totalLess - totalExpense;

  const formatDateBn = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);
      const daysBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
      return `${formatDate(dateStr)} (${daysBn[dateObj.getDay()]})`;
    } catch {
      return formatDate(dateStr);
    }
  };

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="মাসিক বিক্রয় ও আর্থিক বিবরণী (A4)"
      subtitle={`মাস: ${monthNameBn} ${year} • মোট বিক্রি: ${currency} ${totalSales.toLocaleString()} • নিট: ${currency} ${netBalance.toLocaleString()} • ${totalPages} পৃষ্ঠা`}
      fileNamePrefix={`Monthly_Sales_${monthNameBn}_${year}`}
      initialAction={initialAction}
    >
      {pages.map((pageRows, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div
            key={pageIndex}
            className="printable-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden"
            style={{
              width: '794px',
              minHeight: '1123px',
              padding: '24px 28px',
              boxSizing: 'border-box',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
          >
            <div>
              <PrintHeader
                settings={settings}
                reportTitle="মাসিক বিক্রয় ও আর্থিক বিবরণী"
                reportSubtitle={`মাস: ${monthNameBn} ${year} • পৃষ্ঠা: ${pageIndex + 1}/${totalPages}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'নির্বাচিত মাস', value: `${monthNameBn} ${year}` },
                        { label: 'মোট বিক্রি', value: `${currency} ${totalSales.toLocaleString()}` },
                        { label: 'মোট লেস ও ছাড়', value: `${currency} ${totalLess.toLocaleString()}` },
                        {
                          label: 'মোট ব্যয় ও খরচ',
                          value: `${currency} ${totalExpense.toLocaleString()}`,
                        },
                        { label: 'মোট শর্ট', value: `${currency} ${totalShort.toLocaleString()}` },
                        { label: 'মোট ড্যামেজ', value: `${currency} ${totalDamage.toLocaleString()}` },
                      ]
                    : []
                }
              />

              {/* Table */}
              <div className="border border-slate-300 rounded-sm overflow-hidden mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="py-2 px-1.5 text-center w-7 border-r border-slate-300">#</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">তারিখ ও বার</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-300">বিক্রয় (Sales)</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-300">লেস (Less)</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-300">খরচ (Expense)</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-300">শর্ট (Short)</th>
                      <th className="py-2 px-2.5 text-right">ড্যামেজ (Damage)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          এই মাসে কোনো রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;

                        return (
                          <tr key={row.date} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-1.5 text-center font-mono text-slate-500 border-r border-slate-200">
                              {globalIdx}
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200 font-medium">
                              {formatDateBn(row.date)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                              {row.salesAmount > 0 ? `${currency} ${row.salesAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-amber-700 border-r border-slate-200">
                              {row.lessAmount > 0 ? `${currency} ${row.lessAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                              {row.expenseAmount > 0 ? `${currency} ${row.expenseAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-orange-700 border-r border-slate-200">
                              {row.shortAmount > 0 ? `${currency} ${row.shortAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-purple-700">
                              {row.damageAmount > 0 ? `${currency} ${row.damageAmount.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                        <td colSpan={2} className="py-2 px-2.5 text-right text-slate-900">
                          সর্বমোট মাসিক যোগফল:
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-900">
                          {currency} {totalSales.toLocaleString()}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-amber-700">
                          {currency} {totalLess.toLocaleString()}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-rose-700">
                          {currency} {totalExpense.toLocaleString()}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-orange-700">
                          {currency} {totalShort.toLocaleString()}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-purple-700">
                          {currency} {totalDamage.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Bottom Signatures (On Last Page) */}
            {isLastPage ? (
              <div className="pt-6 mt-4 border-t border-slate-300">
                <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-semibold text-slate-800">হিসাব রক্ষক স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-semibold text-slate-800">অডিট অফিসার স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-bold text-slate-900">স্বত্বাধিকারী / মালিকের স্বাক্ষর</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-center mt-3">
                  * এটি MM TRADERS সিস্টেম প্রস্তুতকৃত চূড়ান্ত মাসিক বিক্রয় ও আর্থিক প্রতিবেদন।
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 text-right pt-2 border-t border-slate-200">
                চলমান পৃষ্ঠা {pageIndex + 1} • পরবর্তী পৃষ্ঠায় সমাপনী হিসাব
              </div>
            )}
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
