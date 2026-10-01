import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, Customer } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface DuePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  customers: Customer[];
  totalDue: number;
  srFilter: string;
  routeFilter: string;
  customerRouteMap: Map<string, Set<string>> | Map<string, string>;
  todayDateStr: string;
  initialAction?: 'png' | 'pdf' | null;
}

export const DuePrintPreviewModal: React.FC<DuePrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  customers,
  totalDue,
  srFilter,
  routeFilter,
  customerRouteMap,
  todayDateStr,
  initialAction = null,
}) => {
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => (c.currentDue || 0) > 0);
  }, [customers]);

  // Paginate: 16 customers per A4 page
  const ITEMS_PER_PAGE = 16;
  const pages = useMemo(() => {
    if (activeCustomers.length === 0) return [[]];
    const chunks: Customer[][] = [];
    for (let i = 0; i < activeCustomers.length; i += ITEMS_PER_PAGE) {
      chunks.push(activeCustomers.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [activeCustomers]);

  const totalPages = pages.length;

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="কাস্টমার বকেয়া খতিয়ান ও তালিকা (A4)"
      subtitle={`মোট বকেয়া: ${currency} ${totalDue.toLocaleString()} • ${activeCustomers.length} জন কাস্টমার • ${totalPages} পৃষ্ঠা`}
      fileNamePrefix={`Customer_Due_List_${todayDateStr}_${routeFilter !== 'all' ? routeFilter : 'All_Routes'}`}
      initialAction={initialAction}
    >
      {pages.map((pageCustomers, pageIndex) => {
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
                reportTitle="কাস্টমার বকেয়া তালিকা"
                reportSubtitle={`তারিখ: ${formatDate(todayDateStr)} • পৃষ্ঠা: ${pageIndex + 1}/${totalPages}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'তারিখ', value: formatDate(todayDateStr) },
                        {
                          label: 'ফিল্টারকৃত রুট',
                          value: routeFilter === 'all' ? 'সকল রুট' : routeFilter,
                        },
                        {
                          label: 'এসআর ফিল্টার',
                          value: srFilter === 'all' ? 'সকল এসআর' : srFilter,
                        },
                        {
                          label: 'মোট বকেয়া',
                          value: `${currency} ${totalDue.toLocaleString()}`,
                        },
                      ]
                    : []
                }
              />

              {/* Table */}
              <div className="border border-slate-300 rounded-sm overflow-hidden mt-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                      <th className="py-2 px-3 border-r border-slate-300">কাস্টমার ও দোকানের নাম</th>
                      <th className="py-2 px-3 border-r border-slate-300">মোবাইল</th>
                      <th className="py-2 px-3 border-r border-slate-300">রুট / ঠিকানা</th>
                      <th className="py-2 px-3 border-r border-slate-300">এসআর</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">বর্তমান বকেয়া</th>
                      <th className="py-2 px-3 text-center w-24">স্বাক্ষর / রিসিট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          কোনো বকেয়া রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageCustomers.map((c, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                        const routeVal = customerRouteMap.get(c.id);
                        const route = routeVal
                          ? routeVal instanceof Set
                            ? Array.from(routeVal).join(', ')
                            : String(routeVal)
                          : c.address || 'রুট নেই';
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                              {globalIdx}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-900 block">{c.name}</span>
                              {c.shopName && c.shopName !== c.name && (
                                <span className="text-[10px] text-slate-500 block font-normal">
                                  দোকান: {c.shopName}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-slate-700 border-r border-slate-200">
                              {c.phone || '-'}
                            </td>
                            <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200 truncate max-w-[130px]">
                              {route}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 border-r border-slate-200 truncate max-w-[100px]">
                              {c.assignedSrName || '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                              {currency} {(c.currentDue || 0).toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                        <td colSpan={5} className="py-2 px-3 text-right text-slate-900">
                          সর্বমোট বকেয়া ({activeCustomers.length} জন কাস্টমার):
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-700 text-sm">
                          {currency} {totalDue.toLocaleString()}
                        </td>
                        <td></td>
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
                    <span className="font-semibold text-slate-800">আদায়কারী / এসআর স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-semibold text-slate-800">অ্যাকাউন্ট্যান্ট / যাচাইকারী</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-bold text-slate-900">মালিক / ম্যানেজার স্বাক্ষর</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-center mt-3">
                  * এটি MM TRADERS সিস্টেম জেনারেটেড ডিজিটাল খতিয়ান কপি।
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
