import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, Product } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';

interface ProductPricePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  products: Product[];
  todayDateStr?: string;
  initialAction?: 'png' | 'pdf' | null;
}

export const ProductPricePrintPreviewModal: React.FC<ProductPricePrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  products,
  todayDateStr = new Date().toISOString().split('T')[0],
  initialAction = null,
}) => {
  // Only display active products in the customer/wall price list
  const activeProducts = useMemo(() => {
    return products
      .filter((p) => p.status !== 'inactive')
      .sort((a, b) => {
        // Group by category, then sort by name
        const catCompare = (a.category || '').localeCompare(b.category || '', 'bn');
        if (catCompare !== 0) return catCompare;
        return (a.name || '').localeCompare(b.name || '', 'bn');
      });
  }, [products]);

  // Paginate: ~24 products per A4 page for comfortable readability on wall printouts
  const ITEMS_PER_PAGE = 24;
  const pages = useMemo(() => {
    if (activeProducts.length === 0) return [[]];
    const chunks: Product[][] = [];
    for (let i = 0; i < activeProducts.length; i += ITEMS_PER_PAGE) {
      chunks.push(activeProducts.slice(i, i + ITEMS_PER_PAGE));
    }
    return chunks;
  }, [activeProducts]);

  const totalPages = pages.length;

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="পণ্য ও মূল্য তালিকা প্রিন্ট প্রিভিউ (A4)"
      subtitle={`মোট সক্রিয় পণ্য: ${toBengaliDigits(activeProducts.length)} টি • ${toBengaliDigits(totalPages)} পৃষ্ঠা`}
      fileNamePrefix={`MM_Traders_Price_List_${todayDateStr}`}
      initialAction={initialAction}
    >
      {pages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const startSerial = pageIndex * ITEMS_PER_PAGE;

        return (
          <div
            key={pageIndex}
            className="printable-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-visible print:overflow-visible"
            style={{
              width: '794px',
              minHeight: '1123px',
              padding: '18px 24px',
              boxSizing: 'border-box',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
          >
            <div>
              {/* Header Letterhead */}
              <PrintHeader
                settings={settings}
                reportTitle="পণ্য ও বিক্রয় মূল্য তালিকা"
                reportSubtitle={`প্রকাশের তারিখ: ${formatDate(todayDateStr)} • পৃষ্ঠা: ${toBengaliDigits(pageIndex + 1)}/${toBengaliDigits(totalPages)}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'তারিখ', value: formatDate(todayDateStr) },
                        { label: 'মোট পণ্য ধরণ', value: `${toBengaliDigits(activeProducts.length)} টি` },
                        { label: 'মূল্য ধরন', value: 'কার্টন ও খুচরা রেট' },
                        { label: 'প্রতিষ্ঠান', value: settings.businessName || 'এম এম ট্রেডার্স' },
                      ]
                    : []
                }
              />

              {/* Notice Banner */}
              {isFirstPage && (
                <div className="mb-2.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-center text-[10px] text-slate-700 font-medium">
                  * বাজারে পণ্য সরবরাহের জন্য প্রযোজ্য নির্ধারিত বিক্রয় মূল্য তালিকা। বিশেষ প্রয়োজনে বা পাইকারি অর্ডারে পরিচালকের সাথে যোগাযোগ করুন।
                </div>
              )}

              {/* Price List Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300 text-[11px]">
                    <th className="py-1.5 px-2 text-center w-10 border-r border-slate-300">ক্রমিক</th>
                    <th className="py-1.5 px-3 text-left border-r border-slate-300">পণ্যের বিবরণ / নাম</th>
                    <th className="py-1.5 px-2 text-center w-24 border-r border-slate-300">ক্যাটাগরি</th>
                    <th className="py-1.5 px-2 text-center w-24 border-r border-slate-300">প্যাকিং সাইজ</th>
                    <th className="py-1.5 px-3 text-right w-32 border-r border-slate-300">কার্টন রেট ({currency})</th>
                    <th className="py-1.5 px-3 text-right w-28">প্রতি পিস মূল্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pageProducts.map((p, idx) => {
                    const globalSerial = startSerial + idx + 1;
                    const cartonPieces = Math.max(1, p.piecesPerCarton || p.cartonQty || 1);
                    const cartonPrice = Number(p.salePrice) || 0;
                    const perPiecePrice = cartonPieces > 0 && cartonPrice > 0 ? cartonPrice / cartonPieces : 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      >
                        <td className="py-1.5 px-2 text-center font-mono font-medium text-slate-500 border-r border-slate-200 text-[11px]">
                          {toBengaliDigits(globalSerial)}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200">
                          <span className="font-bold text-slate-900 text-xs block">{p.name}</span>
                          {p.code && (
                            <span className="text-[9.5px] text-slate-500 font-mono">কোড: {p.code}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-600 border-r border-slate-200 text-[10.5px]">
                          {p.category || 'সাধারণ'}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200 text-[10.5px]">
                          {cartonPieces > 1 ? `১ কার্টন = ${toBengaliDigits(cartonPieces)} পিস` : p.unit || 'পিস'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200 text-xs">
                          {currency} {toBengaliDigits(cartonPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }))}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800 text-[11px]">
                          {perPiecePrice > 0 ? (
                            <>
                              {currency} {toBengaliDigits(perPiecePrice.toFixed(2))}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer */}
            <div className="pt-3 mt-2 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-500">
              <div>
                মুদ্রণ: {formatDate(todayDateStr)} • {settings.businessName || 'এম এম ট্রেডার্স'}
              </div>
              <div className="font-mono font-semibold">
                পৃষ্ঠা {toBengaliDigits(pageIndex + 1)} / {toBengaliDigits(totalPages)}
              </div>
            </div>
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
