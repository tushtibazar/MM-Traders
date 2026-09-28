import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, DailyAccountItem } from '../../types';

interface FlattenedDamageItem {
  sheetId: string;
  sheetNo: string;
  date: string;
  route: string;
  srName: string;
  notes?: string;
  item: DailyAccountItem;
}

interface DamagePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  damageItems: FlattenedDamageItem[];
  selectedMonth: string;
  selectedRoute: string;
  totalDamageValue: number;
  totalDamageQty: number;
  initialAction?: 'png' | 'pdf' | null;
}

export const DamagePrintPreviewModal: React.FC<DamagePrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  damageItems,
  selectedMonth,
  selectedRoute,
  totalDamageValue,
  totalDamageQty,
  initialAction = null,
}) => {
  // Items per A4 page
  const ITEMS_PER_PAGE = 18;

  const pages = useMemo(() => {
    if (damageItems.length === 0) return [[]];
    const chunks: FlattenedDamageItem[][] = [];
    for (let i = 0; i < damageItems.length; i += ITEMS_PER_PAGE) {
      chunks.push(damageItems.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [damageItems]);

  const totalPages = pages.length;

  const filterSummary = [
    selectedMonth !== 'all' ? `মাস: ${selectedMonth}` : 'সকল মাস',
    selectedRoute !== 'all' ? `রুট: ${selectedRoute}` : 'সকল রুট',
  ].join(' • ');

  const metadata = [
    { label: 'রিপোর্ট ফিল্টার', value: filterSummary },
    { label: 'মোট ড্যামেজ রেকর্ড', value: `${damageItems.length} টি` },
    { label: 'মোট নষ্ট পরিমাণ', value: `${totalDamageQty.toLocaleString()} পিস/ইউনিট` },
    { label: 'মোট আর্থিক ক্ষতি', value: `${currency} ${totalDamageValue.toLocaleString()}` },
  ];

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="ড্যামেজ হিসাব প্রিন্ট ও এক্সপোর্ট প্রিভিউ (A4)"
      subtitle={`${filterSummary} • মোট ${damageItems.length}টি এন্ট্রি • ${totalPages} পৃষ্ঠা`}
      fileNamePrefix={`Damage_Account_${selectedMonth !== 'all' ? selectedMonth : 'All'}`}
      initialAction={initialAction}
    >
      {pages.map((pageItems, pageIndex) => {
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
                reportTitle="মার্কেট ড্যামেজ ও নষ্ট মালের হিসাব খতিয়ান"
                reportSubtitle="Market Damage & Spoiled Goods Statement"
                metadata={isFirstPage ? metadata : []}
                isContinuedPage={!isFirstPage}
              />

              {/* Table */}
              <div className="mt-3 border border-slate-300 rounded overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <th className="py-2 px-2 text-center w-9 border-r border-slate-700">#</th>
                      <th className="py-2 px-2.5 text-left w-20 border-r border-slate-700">তারিখ</th>
                      <th className="py-2 px-2.5 text-left w-24 border-r border-slate-700">রুট / ভ্যান</th>
                      <th className="py-2 px-2.5 text-left w-24 border-r border-slate-700">এসআর</th>
                      <th className="py-2 px-3 text-left border-r border-slate-700">পণ্যের বিবরণ</th>
                      <th className="py-2 px-2.5 text-center w-20 border-r border-slate-700">পরিমাণ</th>
                      <th className="py-2 px-2.5 text-right w-20 border-r border-slate-700">দর</th>
                      <th className="py-2 px-3 text-right w-24 border-r border-slate-700">ক্ষতি ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          কোনো ড্যামেজ রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((rec, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                        const qty = Number(rec.item.damageQty) || Number(rec.item.issuedQty) || 0;
                        const rate = Number(rec.item.sellingPrice) || 0;
                        const totalVal = Number(rec.item.damageValue) || 0;

                        return (
                          <tr key={`${rec.sheetId}-${idx}`} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                              {globalIdx}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-700 border-r border-slate-200">
                              {rec.date}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-700 border-r border-slate-200 truncate max-w-[100px]">
                              {rec.route}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 border-r border-slate-200 truncate max-w-[100px]">
                              {rec.srName}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                              {rec.item.productName}
                              {rec.item.unit && (
                                <span className="text-[10px] text-slate-500 block font-normal">
                                  একক: {rec.item.unit}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-center font-mono font-bold text-rose-700 border-r border-slate-200">
                              {qty}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                              {rate > 0 ? `${currency} ${rate.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-800 border-r border-slate-200">
                              {currency} {totalVal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-rose-50 font-bold border-t-2 border-slate-800 text-slate-900">
                        <td colSpan={5} className="py-2 px-3 text-right font-bold text-slate-900">
                          মোট ড্যামেজ ও আর্থিক ক্ষতি:
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-rose-800">
                          {totalDamageQty.toLocaleString()}
                        </td>
                        <td></td>
                        <td className="py-2 px-3 text-right font-mono text-sm font-black text-rose-900">
                          {currency} {totalDamageValue.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Bottom Summary on Last Page */}
              {isLastPage && (
                <div className="mt-4 p-3 bg-rose-50/70 border border-rose-200 rounded text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-900">
                    <span className="font-bold">নোট:</span>
                    <span>
                      মার্কেট থেকে ফেরত আসা ড্যামেজ পণ্য কোম্পানির নিকট ক্লিম করার জন্য এই হিসাব ব্যবহার করুন।
                    </span>
                  </div>
                  <div className="font-mono text-right text-rose-950 shrink-0">
                    সর্বমোট আর্থিক ক্ষতি: <strong>{currency} {totalDamageValue.toLocaleString()}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer & Signatures */}
            <div className="mt-6 pt-3 border-t border-slate-300">
              <div className="flex items-end justify-between text-xs text-slate-500 mb-2">
                <div className="text-center w-36">
                  <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                    যাচাইকারী (এসআর/ম্যানেজার)
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
