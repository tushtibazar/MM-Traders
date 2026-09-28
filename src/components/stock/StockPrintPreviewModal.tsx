import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, Product } from '../../types';

interface StockPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  products: Product[];
  todayDateStr: string;
  initialAction?: 'png' | 'pdf' | null;
}

export const StockPrintPreviewModal: React.FC<StockPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  products,
  todayDateStr,
  initialAction = null,
}) => {
  const totalStockQuantity = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentStock || 0), 0);
  }, [products]);

  const totalPurchaseValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.purchasePrice || 0), 0);
  }, [products]);

  const totalSaleValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.currentStock || 0) * (p.salePrice || 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => (p.currentStock || 0) <= (p.minStockAlert || 0)).length;
  }, [products]);

  // Paginate: 18 products per A4 page
  const ITEMS_PER_PAGE = 18;
  const pages = useMemo(() => {
    if (products.length === 0) return [[]];
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += ITEMS_PER_PAGE) {
      chunks.push(products.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [products]);

  const totalPages = pages.length;

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="গুদাম স্টক মূল্যায়ন বিবরণী (A4)"
      subtitle={`মোট সম্পদ: ${currency} ${totalPurchaseValuation.toLocaleString()} • ${products.length} ধরণের পণ্য • ${totalPages} পৃষ্ঠা`}
      fileNamePrefix={`Warehouse_Stock_Valuation_${todayDateStr}`}
      initialAction={initialAction}
    >
      {pages.map((pageProducts, pageIndex) => {
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
                reportTitle="গুদাম স্টক মূল্যায়ন বিবরণী"
                reportSubtitle={`তারিখ: ${todayDateStr} • পৃষ্ঠা: ${pageIndex + 1}/${totalPages}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'তারিখ', value: todayDateStr },
                        { label: 'মোট পণ্য ধরণ', value: `${products.length} টি` },
                        { label: 'মোট স্টক আইটেম', value: `${totalStockQuantity.toLocaleString()} একক` },
                        {
                          label: 'মোট ক্রয়মূল্য সম্পদ',
                          value: `${currency} ${totalPurchaseValuation.toLocaleString()}`,
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
                      <th className="py-2 px-3 border-r border-slate-300">পণ্যের নাম ও কোড</th>
                      <th className="py-2 px-3 border-r border-slate-300">ক্যাটাগরি</th>
                      <th className="py-2 px-3 text-center border-r border-slate-300">বর্তমান মজুদ</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">ক্রয় দর</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">মোট ক্রয়মূল্য</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300">বিক্রয় দর</th>
                      <th className="py-2 px-3 text-center w-16">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pageProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          কোনো স্টক রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageProducts.map((p, idx) => {
                        const globalIdx = pageIndex * ITEMS_PER_PAGE + idx + 1;
                        const isAlert = (p.currentStock || 0) <= (p.minStockAlert || 0);
                        const pVal = (p.currentStock || 0) * (p.purchasePrice || 0);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                              {globalIdx}
                            </td>
                            <td className="py-1.5 px-3 border-r border-slate-200">
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                কোড: {p.code} {p.packSize ? `• ${p.packSize}` : ''}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 border-r border-slate-200 truncate max-w-[90px]">
                              {p.category}
                            </td>
                            <td className="py-1.5 px-3 text-center font-bold text-slate-900 border-r border-slate-200 font-mono">
                              {p.currentStock} {p.unit}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                              {currency} {p.purchasePrice.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">
                              {currency} {pVal.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                              {currency} {p.salePrice.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-center border-r border-slate-200">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isAlert ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isAlert ? 'স্বল্প' : 'পর্যাপ্ত'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {isLastPage && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                        <td colSpan={3} className="py-2 px-3 text-right text-slate-900">
                          সর্বমোট যোগফল ({products.length} টি পণ্য):
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-900">
                          {totalStockQuantity.toLocaleString()}
                        </td>
                        <td></td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800 text-sm">
                          {currency} {totalPurchaseValuation.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {currency} {totalSaleValuation.toLocaleString()}
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
                    <span className="font-semibold text-slate-800">গুদাম ইনচার্জ / কিপার স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-semibold text-slate-800">হিসাব নিরীক্ষক স্বাক্ষর</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
                    <span className="font-bold text-slate-900">মালিক / ব্যবস্থাপনা পরিচালক</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 text-center mt-3">
                  * এটি MM TRADERS ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম প্রস্তুতকৃত অফিসিয়াল গুদাম স্টক বিবরণী।
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
