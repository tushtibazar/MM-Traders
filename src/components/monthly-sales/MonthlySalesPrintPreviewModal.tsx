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
  cashAmount: number;
  dueCollection: number;
  totalCash: number;
  isPending?: boolean;
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
  dailyCash?: { date: string; cashAmount: number; dueCollection: number; totalCash: number; isPending?: boolean }[];
  totalSales: number;
  totalLess: number;
  totalExpense: number;
  totalShort?: number;
  totalDamage?: number;
  totalCashOnly?: number;
  totalDueCollection?: number;
  totalCash?: number;
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
  dailyCash = [],
  totalSales,
  totalLess,
  totalExpense,
  totalShort = 0,
  totalDamage = 0,
  totalCashOnly = 0,
  totalDueCollection = 0,
  totalCash = 0,
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
        cashAmount: 0,
        dueCollection: 0,
        totalCash: 0,
        isPending: false,
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
        cashAmount: 0,
        dueCollection: 0,
        totalCash: 0,
        isPending: false,
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
        cashAmount: 0,
        dueCollection: 0,
        totalCash: 0,
        isPending: false,
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
        cashAmount: 0,
        dueCollection: 0,
        totalCash: 0,
        isPending: false,
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
        cashAmount: 0,
        dueCollection: 0,
        totalCash: 0,
        isPending: false,
      };
      cur.damageAmount += dmg.damageAmount;
      map.set(dmg.date, cur);
    });

    (dailyCash || []).forEach((c) => {
      const cur = map.get(c.date) || {
        date: c.date,
        salesAmount: 0,
        salesCount: 0,
        lessAmount: 0,
        expenseAmount: 0,
        shortAmount: 0,
        damageAmount: 0,
        cashAmount: 0,
        dueCollection: 0,
        totalCash: 0,
        isPending: false,
      };
      cur.cashAmount += c.cashAmount;
      cur.dueCollection += c.dueCollection;
      cur.totalCash += c.totalCash;
      if (c.isPending) cur.isPending = true;
      map.set(c.date, cur);
    });

    const rows = Array.from(map.values());
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [dailySales, dailyLess, dailyExpense, dailyShort, dailyDamage, dailyCash]);

  // Paginate: 18 dates per page in A4 landscape to comfortably accommodate header, 10 columns, and signatures
  const ITEMS_PER_PAGE = 18;
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
      title="মাসিক বিক্রয় ও আর্থিক বিবরণী (A4 ল্যান্ডস্কেপ)"
      subtitle={`মাস: ${monthNameBn} ${year} • মোট বিক্রি: ${currency} ${totalSales.toLocaleString()} • মোট ক্যাশ: ${currency} ${totalCash.toLocaleString()} • নিট ব্যালেন্স: ${currency} ${netBalance.toLocaleString()} • ${totalPages} পৃষ্ঠা`}
      fileNamePrefix={`Monthly_Sales_${monthNameBn}_${year}`}
      initialAction={initialAction}
    >
      {/* Scoped CSS for A4 landscape layout (281mm x 194mm) */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 8mm !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-modal-overlay,
          .print-preview-scroll {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            position: static !important;
            overflow: visible !important;
            display: block !important;
          }
          .printable-area {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            display: block !important;
          }
          .printable-a4-page.monthly-sales-a4-page {
            width: 281mm !important;
            max-width: 281mm !important;
            height: 194mm !important;
            min-height: 194mm !important;
            max-height: 194mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .printable-a4-page.monthly-sales-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {pages.map((pageRows, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div
            key={pageIndex}
            className="printable-a4-page monthly-sales-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden mb-8 print:mb-0"
            style={{
              width: '281mm',
              maxWidth: '100%',
              height: '194mm',
              minHeight: '194mm',
              maxHeight: '194mm',
              padding: '6mm 8mm',
              boxSizing: 'border-box',
              overflow: 'hidden',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
            }}
          >
            <div>
              <PrintHeader
                settings={settings}
                reportTitle="মাসিক বিক্রয় ও আর্থিক বিবরণী (ক্যাশ হিসাব সহ)"
                reportSubtitle={`মাস: ${monthNameBn} ${year} • পৃষ্ঠা: ${pageIndex + 1}/${totalPages}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'নির্বাচিত মাস', value: `${monthNameBn} ${year}` },
                        { label: 'মোট বিক্রি', value: `${currency} ${totalSales.toLocaleString()}` },
                        { label: 'মোট লেস ও ছাড়', value: `${currency} ${totalLess.toLocaleString()}` },
                        { label: 'মোট ব্যয় ও খরচ', value: `${currency} ${totalExpense.toLocaleString()}` },
                        { label: 'মোট শর্ট', value: `${currency} ${totalShort.toLocaleString()}` },
                        { label: 'মোট ড্যামেজ', value: `${currency} ${totalDamage.toLocaleString()}` },
                        { label: 'মোট ক্যাশ টাকা', value: `${currency} ${totalCashOnly.toLocaleString()}` },
                        { label: 'মোট বাকি জমা', value: `${currency} ${totalDueCollection.toLocaleString()}` },
                        { label: 'সর্বমোট ক্যাশ', value: `${currency} ${totalCash.toLocaleString()}` },
                      ]
                    : []
                }
              />

              {/* 10-Column Landscape Table */}
              <div className="border border-slate-300 rounded-sm overflow-hidden mt-1.5">
                <table className="w-full text-left text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-[10.5px]">
                      <th style={{ width: '4%' }} className="py-1.5 px-1 text-center border-r border-slate-300">#</th>
                      <th style={{ width: '14%' }} className="py-1.5 px-2 border-r border-slate-300">তারিখ ও বার</th>
                      <th style={{ width: '11%' }} className="py-1.5 px-2 text-right border-r border-slate-300">বিক্রয় (Sales)</th>
                      <th style={{ width: '9%' }} className="py-1.5 px-1.5 text-right border-r border-slate-300">লেস (Less)</th>
                      <th style={{ width: '10%' }} className="py-1.5 px-1.5 text-right border-r border-slate-300">খরচ (Expense)</th>
                      <th style={{ width: '9%' }} className="py-1.5 px-1.5 text-right border-r border-slate-300">শর্ট (Short)</th>
                      <th style={{ width: '9%' }} className="py-1.5 px-1.5 text-right border-r border-slate-300">ড্যামেজ</th>
                      <th style={{ width: '11%' }} className="py-1.5 px-2 text-right border-r border-slate-300 bg-slate-50">ক্যাশ টাকা</th>
                      <th style={{ width: '11%' }} className="py-1.5 px-2 text-right border-r border-slate-300 bg-slate-50">বাকি জমা</th>
                      <th style={{ width: '12%' }} className="py-1.5 px-2 text-right bg-teal-50 text-teal-950">মোট ক্যাশ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          এই মাসে কোনো রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;

                        return (
                          <tr key={row.date} className="hover:bg-slate-50/50 text-[10.5px]">
                            <td className="py-1 px-1 text-center font-mono text-slate-500 border-r border-slate-200">
                              {globalIdx}
                            </td>
                            <td className="py-1 px-2 border-r border-slate-200 font-medium truncate">
                              <span className="font-mono text-[10px] text-slate-800">
                                {formatDateBn(row.date)}
                              </span>
                              {row.isPending && (
                                <span className="ml-1 text-[8.5px] px-1 py-0.2 font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  চলমান
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                              {row.salesAmount > 0 ? `${currency} ${row.salesAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold text-amber-700 border-r border-slate-200">
                              {row.lessAmount > 0 ? `${currency} ${row.lessAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                              {row.expenseAmount > 0 ? `${currency} ${row.expenseAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold text-orange-700 border-r border-slate-200">
                              {row.shortAmount > 0 ? `${currency} ${row.shortAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-1.5 text-right font-mono font-bold text-purple-700 border-r border-slate-200">
                              {row.damageAmount > 0 ? `${currency} ${row.damageAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-medium text-slate-800 border-r border-slate-200 bg-slate-50/30">
                              {row.cashAmount > 0 ? `${currency} ${row.cashAmount.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-medium text-emerald-800 border-r border-slate-200 bg-slate-50/30">
                              {row.dueCollection > 0 ? `${currency} ${row.dueCollection.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1 px-2 text-right font-mono font-bold text-teal-800 bg-teal-50/40">
                              {row.totalCash > 0 ? `${currency} ${row.totalCash.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-[11px]">
                        <td colSpan={2} className="py-1.5 px-2 text-right text-slate-900 font-bold font-bengali">
                          সর্বমোট মাসিক যোগফল:
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-900">
                          {currency} {totalSales.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-amber-700">
                          {currency} {totalLess.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-rose-700">
                          {currency} {totalExpense.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-orange-700">
                          {currency} {totalShort.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-purple-700">
                          {currency} {totalDamage.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-900 bg-slate-50">
                          {currency} {totalCashOnly.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-800 bg-slate-50">
                          {currency} {totalDueCollection.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-black text-teal-900 bg-teal-100/70 border-l border-teal-300">
                          {currency} {totalCash.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Bottom Signatures (On Last Page) */}
            {isLastPage ? (
              <div className="pt-3 border-t border-slate-300">
                <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-6"></div>
                    <span className="font-semibold text-slate-800 text-[10.5px]">হিসাব রক্ষক স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-6"></div>
                    <span className="font-semibold text-slate-800 text-[10.5px]">অডিট অফিসার স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-6"></div>
                    <span className="font-bold text-slate-900 text-[10.5px]">স্বত্বাধিকারী / মালিকের স্বাক্ষর</span>
                  </div>
                </div>
                <div className="text-[9.5px] text-slate-400 text-center mt-1.5 font-bengali">
                  * এটি MM TRADERS সিস্টেম প্রস্তুতকৃত চূড়ান্ত মাসিক বিক্রয় ও আর্থিক প্রতিবেদন (ক্যাশ টাকা হিসাব অন্তর্ভুক্ত)।
                </div>
              </div>
            ) : (
              <div className="text-[9.5px] text-slate-400 text-right pt-1.5 border-t border-slate-200">
                চলমান পৃষ্ঠা {pageIndex + 1} • পরবর্তী পৃষ্ঠায় সমাপনী হিসাব
              </div>
            )}
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
