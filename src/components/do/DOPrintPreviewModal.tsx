import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, DOPayment } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';

interface DOPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  payments: DOPayment[];
  filterLabel: string;
  todayDateStr?: string;
  initialAction?: 'png' | 'pdf' | null;
}

export const DOPrintPreviewModal: React.FC<DOPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  payments,
  filterLabel,
  todayDateStr = new Date().toISOString().split('T')[0],
  initialAction = null,
}) => {
  const activePayments = useMemo(() => {
    return payments.filter((p) => p.status === 'active' || !p.status);
  }, [payments]);

  const totalAmount = useMemo(() => {
    return activePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [activePayments]);

  // Paginate: 25 entries per A4 page for compact Bengali printout
  const ITEMS_PER_PAGE = 25;
  const pages = useMemo(() => {
    if (activePayments.length === 0) return [[]];
    const chunks: DOPayment[][] = [];
    for (let i = 0; i < activePayments.length; i += ITEMS_PER_PAGE) {
      chunks.push(activePayments.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [activePayments]);

  const totalPages = pages.length;

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="কোম্পানি ডিও (D.O.) পেমেন্ট তালিকা প্রিন্ট প্রিভিউ (A4)"
      subtitle={`মোট প্রদান: ৳ ${totalAmount.toLocaleString('en-US')} • মোট এন্ট্রি: ${toBengaliDigits(activePayments.length)} টি • ${toBengaliDigits(totalPages)} পৃষ্ঠা`}
      fileNamePrefix={`MM_Traders_DO_Payments_${todayDateStr}`}
      initialAction={initialAction}
    >
      {pages.map((pageItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const startSerial = pageIndex * ITEMS_PER_PAGE;

        return (
          <div
            key={pageIndex}
            className="printable-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-visible print:overflow-visible font-sans"
            style={{
              width: '794px',
              minHeight: '1123px',
              padding: '18px 22px',
              boxSizing: 'border-box',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
          >
            <div>
              {/* Header Letterhead */}
              <PrintHeader
                settings={settings}
                reportTitle="কোম্পানি ডিও (D.O.) পরিশোধ বিবরণী"
                reportSubtitle={`মুদ্রণ তারিখ: ${formatDate(todayDateStr)} • ফিল্টার: ${filterLabel} • পৃষ্ঠা: ${toBengaliDigits(pageIndex + 1)}/${toBengaliDigits(totalPages)}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'প্রতিষ্ঠান', value: settings.businessName || 'এম এম ট্রেডার্স' },
                        { label: 'মোট এন্ট্রি', value: `${toBengaliDigits(activePayments.length)} টি` },
                        { label: 'ফিল্টার সময়সীমা', value: filterLabel },
                        { label: 'সর্বমোট ডিও পরিশোধ', value: `৳ ${totalAmount.toLocaleString('en-US')}` },
                      ]
                    : []
                }
              />

              {/* Summary Strip (Only on First Page) */}
              {isFirstPage && (
                <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    ফিল্টারকৃত মোট ডিও জমা: <strong className="text-slate-950 font-mono text-sm">৳ {totalAmount.toLocaleString('en-US')}</strong>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    * কোম্পানির একাউন্টে সরাসরি পরিশোধিত ডেলিভারি অর্ডার অগ্রিম
                  </span>
                </div>
              )}

              {/* Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300 text-[11px]">
                    <th className="py-2 px-2 text-center w-12 border-r border-slate-300">ক্রমিক</th>
                    <th className="py-2 px-3 text-center w-28 border-r border-slate-300">পরিশোধ তারিখ</th>
                    <th className="py-2 px-4 text-right w-36 border-r border-slate-300">টাকার পরিমাণ</th>
                    <th className="py-2 px-4 text-left">বিবরণ / নোট / রেফারেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        কোনো ডিও পেমেন্ট রেকর্ড পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item, idx) => {
                      const globalSerial = startSerial + idx + 1;
                      return (
                        <tr
                          key={item.id}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                          style={{ height: '32px' }}
                        >
                          <td className="py-1.5 px-2 text-center font-mono font-medium text-slate-600 border-r border-slate-300 text-[11px] align-middle">
                            {toBengaliDigits(globalSerial)}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono border-r border-slate-300 align-middle">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-1.5 px-4 text-right font-mono font-bold text-slate-950 border-r border-slate-300 align-middle">
                            ৳ {Number(item.amount || 0).toLocaleString('en-US')}
                          </td>
                          <td className="py-1.5 px-4 text-slate-700 align-middle">
                            {item.note || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Subtotal on Last Page */}
                {isLastPage && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
                      <td colSpan={2} className="py-2 px-3 text-right">
                        সর্বমোট ডিও পরিশোধ:
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-sm text-slate-950 border-r border-slate-300">
                        ৳ {totalAmount.toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-4 text-[10px] text-slate-500">
                        (সর্বমোট {toBengaliDigits(activePayments.length)} টি এন্ট্রি)
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Bottom Footer & Signatures */}
            <div>
              {isLastPage && (
                <div className="pt-8 pb-3 mt-4 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                      <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-800">
                        হিসাব প্রস্তুতকারী
                      </div>
                      <div className="text-[10px] text-slate-400">ম্যানেজার / হিসাবরক্ষক</div>
                    </div>
                    <div>
                      <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-800">
                        স্বত্বাধিকারী / ওনার স্বাক্ষর
                      </div>
                      <div className="text-[10px] text-slate-400">{settings.businessName || 'এম এম ট্রেডার্স'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-500">
                <div>
                  মুদ্রণ: {formatDate(todayDateStr)} • {settings.businessName || 'এম এম ট্রেডার্স'}
                </div>
                <div className="font-mono font-semibold">
                  পৃষ্ঠা {toBengaliDigits(pageIndex + 1)} / {toBengaliDigits(totalPages)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
