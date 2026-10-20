import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings, Product } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';

interface SummaryPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  products: Product[];
  todayDateStr?: string;
  generationDateTimeStr: string;
  onlyInStock: boolean;
  initialAction?: 'png' | 'pdf' | null;
}

export const formatStockForSummary = (product: Product): string => {
  const stock = Number(product.currentStock) || 0;
  if (stock <= 0) {
    return '০';
  }

  const pRatio = Number(product.piecesPerCarton || product.cartonQty);
  const ratio = !isNaN(pRatio) && isFinite(pRatio) && pRatio > 0 ? pRatio : 1;
  const isCarton = product.unit === 'কার্টন' || product.unit === 'কার্টুন' || ratio > 1;

  if (isCarton && ratio > 1) {
    const totalPieces = Math.round(stock * ratio);
    if (totalPieces <= 0) return '০';
    const cartons = Math.floor(totalPieces / ratio);
    const remPieces = totalPieces % ratio;

    if (cartons > 0 && remPieces > 0) {
      return `${toBengaliDigits(cartons)} কার্টুন ${toBengaliDigits(remPieces)} পিস`;
    } else if (cartons > 0) {
      return `${toBengaliDigits(cartons)} কার্টুন`;
    } else {
      return `${toBengaliDigits(remPieces)} পিস`;
    }
  }

  // Unit fallback
  const rounded = Math.round(stock * 100) / 100;
  if (product.unit) {
    return `${toBengaliDigits(rounded)} ${product.unit}`;
  }
  return `${toBengaliDigits(rounded)}`;
};

export const SummaryPrintPreviewModal: React.FC<SummaryPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  products,
  todayDateStr = new Date().toISOString().split('T')[0],
  generationDateTimeStr,
  onlyInStock,
  initialAction = null,
}) => {
  // Paginate: 25 products per A4 page for clear handwriting space, no awkward splits, and no blank pages
  const ITEMS_PER_PAGE = 25;
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
      title="দৈনিক মাল বিতরণ ও লোডিং সামারি প্রিন্ট প্রিভিউ (A4)"
      subtitle={`মোট পণ্য: ${toBengaliDigits(products.length)} টি ${onlyInStock ? '(শুধু স্টক বিদ্যমান)' : ''} • ${toBengaliDigits(totalPages)} পৃষ্ঠা`}
      fileNamePrefix={`MM_Traders_Daily_Summary_${todayDateStr}`}
      initialAction={initialAction}
    >
      {pages.map((pageProducts, pageIndex) => {
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
              padding: '16px 20px',
              boxSizing: 'border-box',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
          >
            <div>
              {/* Top Letterhead */}
              <PrintHeader
                settings={settings}
                reportTitle="দৈনিক মাল সামারি শিট"
                reportSubtitle={`তারিখ ও সময়: ${generationDateTimeStr} • পৃষ্ঠা: ${toBengaliDigits(pageIndex + 1)}/${toBengaliDigits(totalPages)}`}
                isContinuedPage={!isFirstPage}
                metadata={
                  isFirstPage
                    ? [
                        { label: 'তারিখ', value: formatDate(todayDateStr) },
                        { label: 'প্রস্তুতের সময়', value: generationDateTimeStr },
                        { label: 'মোট পণ্য সংখ্যা', value: `${toBengaliDigits(products.length)} টি` },
                        { label: 'ফিল্টার', value: onlyInStock ? 'শুধু স্টক আছে এমন' : 'সকল সক্রিয় পণ্য' },
                      ]
                    : []
                }
              />

              {/* SR & Route Hand-fill Strip (Only on First Page) */}
              {isFirstPage && (
                <div className="mb-2.5 px-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800">
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <div>
                      <span className="font-bold text-slate-700">এসআর/ডিএসআর:</span>{' '}
                      <span className="font-mono text-slate-400">....................................</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">রুট / বাজার:</span>{' '}
                      <span className="font-mono text-slate-400">....................................</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-700">গাড়ি নং:</span>{' '}
                      <span className="font-mono text-slate-400">...........................</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notice Banner */}
              {isFirstPage && (
                <div className="mb-2 px-2.5 py-1 bg-amber-50/70 border border-amber-200 rounded text-[10px] text-amber-900 flex items-center justify-between">
                  <span>* এসআর/ডিএসআর গাড়িতে মাল তোলার সময় &quot;মোট&quot; কলামে হাতে লিখে হিসাব রাখবেন। বর্তমান গুদাম স্টক দেখে অতিরিক্ত মাল নেওয়া থেকে সতর্ক থাকুন।</span>
                  <span className="font-semibold text-slate-600">লাইভ স্টক ও কার্টন দর</span>
                </div>
              )}

              {/* Summary Table: Exactly 5 Columns:
                  ১. নং
                  ২. প্রোডাক্টের নাম
                  ৩. মোট (হাতে লেখার জন্য ফাঁকা ও প্রশস্ত ঘর)
                  ৪. স্টক
                  ৫. দর (কার্টুন)
              */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-300 text-[11px]">
                    <th className="py-2 px-1 text-center w-10 border-r border-slate-300">নং</th>
                    <th className="py-2 px-2.5 text-left border-r border-slate-300">প্রোডাক্টের নাম</th>
                    <th className="py-2 px-2 text-center w-28 border-r border-slate-300 bg-amber-50/40">
                      মোট <span className="text-[9px] font-normal text-slate-500 block">(হাতে লেখার ফাঁকা ঘর)</span>
                    </th>
                    <th className="py-2 px-2 text-center w-32 border-r border-slate-300">স্টক</th>
                    <th className="py-2 px-2 text-right w-24">দর (কার্টুন)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {pageProducts.map((p, idx) => {
                    const globalSerial = startSerial + idx + 1;
                    const stockDisplay = formatStockForSummary(p);
                    const hasStock = (Number(p.currentStock) || 0) > 0;
                    const salePrice = Number(p.salePrice) || 0;

                    return (
                      <tr
                        key={p.id}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                        style={{ height: '30px' }}
                      >
                        {/* নং */}
                        <td className="py-1.5 px-1 text-center font-mono font-medium text-slate-600 border-r border-slate-300 text-[11px] align-middle">
                          {toBengaliDigits(globalSerial)}
                        </td>

                        {/* প্রোডাক্টের নাম */}
                        <td className="py-1.5 px-2.5 border-r border-slate-300 align-middle">
                          <span className="font-bold text-slate-900 text-xs block truncate max-w-[250px]">{p.name}</span>
                          {p.code && (
                            <span className="text-[9px] text-slate-400 font-mono">কোড: {p.code}</span>
                          )}
                        </td>

                        {/* মোট (হাতে লেখার জন্য ফাঁকা ঘর) */}
                        <td className="py-1 px-2 border-r border-slate-300 bg-white text-center align-middle">
                          <div className="h-6 w-full rounded border border-dashed border-slate-300 bg-white" />
                        </td>

                        {/* স্টক */}
                        <td className="py-1.5 px-2 text-center align-middle font-medium text-xs border-r border-slate-300">
                          <span
                            className={
                              hasStock
                                ? 'font-bold text-emerald-800'
                                : 'font-semibold text-slate-400'
                            }
                          >
                            {stockDisplay}
                          </span>
                        </td>

                        {/* দর (কার্টুন) */}
                        <td className="py-1.5 px-2.5 text-right align-middle font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                          ৳ {salePrice.toLocaleString('en-US')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer & Signatures (Signatures on Last Page) */}
            <div>
              {isLastPage && (
                <div className="pt-7 pb-3 mt-4 border-t border-slate-200">
                  <div className="grid grid-cols-3 gap-6 text-center text-xs">
                    <div>
                      <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-800">
                        এসআর / ডিএসআর স্বাক্ষর
                      </div>
                      <div className="text-[10px] text-slate-400">মাল গ্রহণকারী</div>
                    </div>
                    <div>
                      <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-800">
                        স্টোর কিপার / ডেলিভারি ম্যান
                      </div>
                      <div className="text-[10px] text-slate-400">মাল সরবরাহকারী</div>
                    </div>
                    <div>
                      <div className="border-t border-slate-800 pt-1.5 font-bold text-slate-800">
                        স্বত্বাধিকারী / ওনার
                      </div>
                      <div className="text-[10px] text-slate-400">{settings.businessName || 'এম এম ট্রেডার্স'}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 mt-2 border-t border-slate-300 flex justify-between items-center text-[9px] text-slate-500">
                <div>
                  মুদ্রণ তারিখ ও সময়: {generationDateTimeStr} • {settings.businessName || 'এম এম ট্রেডার্স'}
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
