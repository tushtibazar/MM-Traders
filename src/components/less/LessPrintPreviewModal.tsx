import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, LessEntry, LessSettlement } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface LessPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  entries: LessEntry[];
  settlements: LessSettlement[];
  selectedMonth: string;
  totalLess: number;
  totalSettlement: number;
  netOutstanding: number;
  initialAction?: 'png' | 'pdf' | null;
}

export const LessPrintPreviewModal: React.FC<LessPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  entries,
  settlements,
  selectedMonth,
  totalLess,
  totalSettlement,
  netOutstanding,
  initialAction = null,
}) => {
  // Items per A4 page
  const ITEMS_PER_PAGE = 18;

  const pages = useMemo(() => {
    if (entries.length === 0) return [[]];
    const chunks: LessEntry[][] = [];
    for (let i = 0; i < entries.length; i += ITEMS_PER_PAGE) {
      chunks.push(entries.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [entries]);

  const totalPages = pages.length;

  const monthLabel = selectedMonth
    ? `মাস: ${selectedMonth}`
    : 'সকল মাসের রেকর্ড';

  const metadata = [
    { label: 'রিপোর্ট ফিল্টার', value: monthLabel },
    { label: 'মোট লেস এন্ট্রি', value: `${entries.length} টি` },
    { label: 'কোম্পানি জমা', value: `${currency} ${totalSettlement.toLocaleString()}` },
    { label: 'বকেয়া লেস পাওনা', value: `${currency} ${netOutstanding.toLocaleString()}` },
  ];

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="লেস হিসাব প্রিন্ট ও এক্সপোর্ট প্রিভিউ (A4)"
      subtitle={`${monthLabel} • মোট ${entries.length}টি এন্ট্রি • ${totalPages} পৃষ্ঠা`}
      fileNamePrefix={`Less_Account_${selectedMonth || 'All'}`}
      initialAction={initialAction}
    >
      {pages.map((pageEntries, pageIndex) => {
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
              {/* Header */}
              <PrintHeader
                settings={settings}
                reportTitle="কোম্পানি লেস হিসাব ও সমন্বয় রিপোর্ট"
                reportSubtitle="Less Account & Settlement Statement"
                metadata={isFirstPage ? metadata : []}
                isContinuedPage={!isFirstPage}
              />

              {/* Entries Table */}
              <div className="mt-3 border border-slate-300 rounded overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <th className="py-2 px-2 text-center w-10 border-r border-slate-700">#</th>
                      <th className="py-2 px-3 text-left w-24 border-r border-slate-700">তারিখ</th>
                      <th className="py-2 px-3 text-left border-r border-slate-700">বিবরণ / খাত</th>
                      <th className="py-2 px-3 text-center w-24 border-r border-slate-700">স্ট্যাটাস</th>
                      <th className="py-2 px-3 text-right w-28 border-r border-slate-700">পরিমাণ ({currency})</th>
                      <th className="py-2 px-3 text-left w-32 border-r border-slate-700">নোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          কোনো লেস এন্ট্রি পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageEntries.map((item, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                        const isReimbursed = item.status === 'reimbursed';
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                              {globalIdx}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-700 border-r border-slate-200">
                              {formatDate(item.date)}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                              {item.description}
                            </td>
                            <td className="py-1.5 px-3 text-center border-r border-slate-200">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isReimbursed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isReimbursed ? 'সমন্বিত' : 'বকেয়া'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                              {currency} {Number(item.amount || 0).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 border-r border-slate-200 truncate max-w-[120px]">
                              {item.note || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-slate-900">
                        <td colSpan={4} className="py-2 px-3 text-right">
                          মোট লেস দাবি:
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-slate-950 font-black">
                          {currency} {totalLess.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Bottom Financial Position Summary on Last Page */}
              {isLastPage && (
                <div className="mt-4 grid grid-cols-3 gap-3 border border-slate-200 bg-slate-50 p-3 rounded text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">
                      সর্বমোট লেস দাবি (Total Claimed)
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900">
                      {currency} {totalLess.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">
                      কোম্পানি জমা / সমন্বয় (Settled)
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-700">
                      {currency} {totalSettlement.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-rose-700 block text-[10px] uppercase font-bold">
                      অবশিষ্ট বকেয়া পাওনা (Net Due)
                    </span>
                    <span className="text-sm font-black font-mono text-rose-800">
                      {currency} {netOutstanding.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer & Signatures */}
            <div className="mt-6 pt-3 border-t border-slate-300">
              <div className="flex items-end justify-between text-xs text-slate-500 mb-2">
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                    হিসাবরক্ষক
                  </div>
                </div>
                <div className="text-center text-[10px] text-slate-400">
                  পৃষ্ঠা {pageIndex + 1} / {totalPages}
                </div>
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                    স্বত্বাধিকারী স্বাক্ষর
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
