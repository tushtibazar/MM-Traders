import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { BusinessSettings, Customer } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import { formatDueNumber } from '../../utils/dueUtils';

interface DuePrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  customers: Customer[];
  totalDue: number;
  totalCollected?: number;
  srFilter: string;
  routeFilter: string;
  customerRouteMap: Map<string, Set<string>> | Map<string, string>;
  customerDueNumberMap?: Map<string, string>;
  todayDateStr: string;
  initialAction?: 'png' | 'pdf' | null;
}

// Physical A4 constants (exact measurements in mm matching @page { size: A4 portrait; margin: 8mm; })
// Total printable area: 194mm width x 281mm height
const ROW_HEIGHT_MM = 7.0;

// Maximum capacity calibrated by physical component heights:
// Page 1 with Signatures (Single-page document):
// 281mm - 6mm (footer) - 31mm (p1 header) - 7.5mm (thead) - 33.5mm (signatures & totals) = 203mm -> 28 rows
const PAGE_1_MAX_WITH_SIG = 28;

// Page 1 without Signatures (First page of multi-page document):
// 281mm - 6mm (footer) - 31mm (p1 header) - 7.5mm (thead) = 236.5mm -> 33 rows
const PAGE_1_MAX_NO_SIG = 33;

// Continued page without Signatures (Middle pages):
// 281mm - 6mm (footer) - 11mm (cont header) - 7.5mm (thead) = 256.5mm -> 36 rows
const CONT_MAX_NO_SIG = 36;

// Continued page with Signatures (Last page of multi-page document):
// 281mm - 6mm (footer) - 11mm (cont header) - 7.5mm (thead) - 33.5mm (signatures & totals) = 223mm -> 31 rows
const CONT_MAX_WITH_SIG = 31;

export const DuePrintPreviewModal: React.FC<DuePrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  customers,
  totalDue,
  totalCollected,
  srFilter,
  routeFilter,
  customerRouteMap,
  customerDueNumberMap,
  todayDateStr,
  initialAction = null,
}) => {
  const activeCustomers = useMemo(() => {
    return customers.filter((c) => (c.currentDue || 0) > 0);
  }, [customers]);

  // Dynamic pagination based on physical printable capacity (never a hardcoded fixed chunk)
  const pages: Customer[][] = useMemo(() => {
    const total = activeCustomers.length;
    if (total === 0) return [[]];

    // Case 1: Fits entirely on Page 1 with totals and signatures (up to 28 customers)
    if (total <= PAGE_1_MAX_WITH_SIG) {
      return [activeCustomers];
    }

    const result: Customer[][] = [];
    let remaining = activeCustomers.slice();
    let isFirstPage = true;

    while (remaining.length > 0) {
      if (isFirstPage) {
        const leftAfterP1 = remaining.length - PAGE_1_MAX_NO_SIG;
        let take = PAGE_1_MAX_NO_SIG;
        // Keep at least 2 rows with the totals block on the next page
        if (leftAfterP1 > 0 && leftAfterP1 < 2) {
          take = remaining.length - 2;
        }
        result.push(remaining.slice(0, take));
        remaining = remaining.slice(take);
        isFirstPage = false;
      } else {
        // If remaining fits on this page with totals and signatures
        if (remaining.length <= CONT_MAX_WITH_SIG) {
          result.push(remaining);
          remaining = [];
        } else {
          const leftAfter = remaining.length - CONT_MAX_NO_SIG;
          let take = CONT_MAX_NO_SIG;
          // Keep at least 2 rows with the totals block on the next page
          if (leftAfter > 0 && leftAfter < 2) {
            take = remaining.length - 2;
          }
          result.push(remaining.slice(0, take));
          remaining = remaining.slice(take);
        }
      }
    }

    return result;
  }, [activeCustomers]);

  const totalPages = pages.length;

  // Starting index for each page to maintain continuous global numbering (1, 2, 3...)
  const pageStartIndices = useMemo(() => {
    const indices: number[] = [];
    let currentStart = 1;
    pages.forEach((p) => {
      indices.push(currentStart);
      currentStart += p.length;
    });
    return indices;
  }, [pages]);

  const businessName = settings.businessName || 'MM TRADERS';
  const subtitle = settings.subtitle || 'ডিস্ট্রিবিউটর ও পাইকারি বিক্রেতা';

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="কাস্টমার বকেয়া খতিয়ান ও তালিকা (A4)"
      subtitle={`মোট বকেয়া: ${currency} ${totalDue.toLocaleString()} • ${toBengaliDigits(activeCustomers.length)} জন কাস্টমার • ${toBengaliDigits(totalPages)} পাতা`}
      fileNamePrefix={`Customer_Due_List_${todayDateStr}_${routeFilter !== 'all' ? routeFilter : 'All_Routes'}`}
      initialAction={initialAction}
    >
      {/* Scoped style tag enforcing exact 8mm page margin and 194mm x 281mm printable area in @media print */}
      <style>{`
        @page {
          size: A4 portrait !important;
          margin: 8mm !important;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .print-modal-overlay,
          .print-preview-scroll {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .printable-area {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .printable-a4-page.due-a4-page {
            width: 194mm !important;
            max-width: 194mm !important;
            height: 281mm !important;
            min-height: 281mm !important;
            max-height: 281mm !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .printable-a4-page.due-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {pages.map((pageCustomers, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const pageStartIdx = pageStartIndices[pageIndex] || 1;

        return (
          <div
            key={pageIndex}
            className="printable-a4-page due-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between"
            style={{
              width: '194mm',
              height: '281mm',
              minHeight: '281mm',
              maxHeight: '281mm',
              padding: '0',
              margin: '0 auto',
              boxSizing: 'border-box',
              overflow: 'hidden',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
            }}
          >
            {/* Top Section: Header + Table + (Optional Totals & Signatures on Last Page) */}
            <div>
              {/* PAGE 1 COMPACT HEADER */}
              {isFirstPage ? (
                <div className="mb-2">
                  {/* Top Letterhead */}
                  <div className="border-b-2 border-slate-900 pb-1.5 mb-1.5 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h1 className="text-xl font-black tracking-tight text-slate-950 font-bengali leading-none">
                        {businessName}
                      </h1>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5 leading-tight">
                        {subtitle}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                        ঠিকানা: {settings.address || 'চকবাজার, ঢাকা'} {settings.phone ? `• মোবাইল: ${settings.phone}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white text-xs font-bold rounded">
                        কাস্টমার বকেয়া তালিকা
                      </span>
                      <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                        তারিখ: {formatDate(todayDateStr)} • প্রিন্ট: {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Chips Box */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded p-1 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">ফিল্টারকৃত রুট:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {routeFilter === 'all' ? 'সকল রুট' : routeFilter}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">এসআর ফিল্টার:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {srFilter === 'all' ? 'সকল এসআর' : srFilter}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">মোট বকেয়া:</span>
                      <span className="font-bold text-rose-700 truncate block font-mono">
                        {currency} {totalDue.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">মোট কাস্টমার:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {toBengaliDigits(activeCustomers.length)} জন (পাতা ১/{toBengaliDigits(totalPages)})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* CONTINUED PAGE COMPACT RUNNING HEADER */
                <div className="border-b border-slate-300 pb-1 mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="font-bold text-slate-900">
                    {businessName} — কাস্টমার বকেয়া তালিকা (চলমান) • রুট: {routeFilter === 'all' ? 'সকল রুট' : routeFilter}
                  </span>
                  <span className="font-mono text-[11px] text-slate-700">
                    তারিখ: {formatDate(todayDateStr)} • পাতা: {toBengaliDigits(pageIndex + 1)}/{toBengaliDigits(totalPages)}
                  </span>
                </div>
              )}

              {/* TABLE WITH PHYSICAL DIMENSIONS (194mm width) */}
              <div className="border border-slate-300 rounded-sm overflow-hidden">
                <table
                  className="w-full text-left border-collapse"
                  style={{
                    tableLayout: 'fixed',
                    width: '194mm',
                    fontSize: '10.5px',
                  }}
                >
                  <thead>
                    <tr
                      className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold"
                      style={{ height: '7.5mm' }}
                    >
                      <th style={{ width: '10mm' }} className="py-1 px-1 text-center border-r border-slate-300">#</th>
                      <th style={{ width: '54mm' }} className="py-1 px-2 border-r border-slate-300">কাস্টমার ও দোকানের নাম</th>
                      <th style={{ width: '27mm' }} className="py-1 px-2 border-r border-slate-300">মোবাইল</th>
                      <th style={{ width: '36mm' }} className="py-1 px-2 border-r border-slate-300">রুট / ঠিকানা</th>
                      <th style={{ width: '25mm' }} className="py-1 px-2 border-r border-slate-300">এসআর</th>
                      <th style={{ width: '24mm' }} className="py-1 px-2 text-right border-r border-slate-300">বর্তমান বকেয়া</th>
                      <th style={{ width: '18mm' }} className="py-1 px-1 text-center">স্বাক্ষর / রিসিট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          কোনো বকেয়া রেকর্ড পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      pageCustomers.map((c, idx) => {
                        const globalIdx = pageStartIdx + idx;
                        const routeVal = customerRouteMap.get(c.id);
                        const route = routeVal
                          ? routeVal instanceof Set
                            ? Array.from(routeVal).join(', ')
                            : String(routeVal)
                          : c.address || 'রুট নেই';

                        const dueNo = customerDueNumberMap ? customerDueNumberMap.get(c.id) : undefined;

                        return (
                          <tr
                            key={c.id}
                            className="border-b border-slate-200 hover:bg-slate-50/50"
                            style={{
                              height: `${ROW_HEIGHT_MM}mm`,
                              maxHeight: `${ROW_HEIGHT_MM}mm`,
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                              pageBreakInside: 'avoid',
                              breakInside: 'avoid',
                            }}
                          >
                            <td className="py-0.5 px-1 text-center font-mono text-[10px] text-slate-500 border-r border-slate-200 truncate">
                              {toBengaliDigits(globalIdx)}
                            </td>
                            <td className="py-0.5 px-2 border-r border-slate-200 leading-tight truncate">
                              <div className="flex items-center gap-1 truncate">
                                <span className="font-bold text-slate-900 text-[10px] truncate">
                                  {c.name}
                                </span>
                                {dueNo && (
                                  <span className="font-mono text-[8.5px] font-bold text-amber-900 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 shrink-0">
                                    {formatDueNumber(dueNo)}
                                  </span>
                                )}
                              </div>
                              {c.shopName && c.shopName !== c.name && (
                                <span className="text-[9px] text-slate-500 block truncate font-normal">
                                  দোকান: {c.shopName}
                                </span>
                              )}
                            </td>
                            <td className="py-0.5 px-2 font-mono text-[10px] text-slate-700 border-r border-slate-200 truncate">
                              {c.phone || '-'}
                            </td>
                            <td className="py-0.5 px-2 text-[10px] text-slate-700 border-r border-slate-200 truncate" title={route}>
                              {route}
                            </td>
                            <td className="py-0.5 px-2 text-[10px] text-slate-600 border-r border-slate-200 truncate" title={c.assignedSrName || '-'}>
                              {c.assignedSrName || '-'}
                            </td>
                            <td className="py-0.5 px-2 text-right font-mono font-bold text-rose-700 text-[10.5px] border-r border-slate-200 truncate">
                              {currency} {(c.currentDue || 0).toLocaleString()}
                            </td>
                            <td className="py-0.5 px-1 border-r-0 border-slate-200"></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Totals Row (Displayed directly under the last row on the final page) */}
                  {isLastPage && (
                    <tfoot>
                      <tr
                        className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs"
                        style={{ height: '7.5mm', pageBreakInside: 'avoid', breakInside: 'avoid' }}
                      >
                        <td colSpan={5} className="py-1 px-3 text-right text-slate-900 font-bold text-[11px]">
                          সর্বমোট বকেয়া ({toBengaliDigits(activeCustomers.length)} জন কাস্টমার):
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-rose-700 text-xs font-bold">
                          {currency} {totalDue.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* BOTTOM SIGNATURES (Kept together on the last page) */}
              {isLastPage && (
                <div
                  className="pt-4 mt-3 border-t border-slate-300"
                  style={{
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
                    <div>
                      <div className="border-b border-slate-400 pb-1 mb-1 h-7"></div>
                      <span className="font-semibold text-slate-800 text-[10.5px]">আদায়কারী / এসআর স্বাক্ষর</span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-1 mb-1 h-7"></div>
                      <span className="font-semibold text-slate-800 text-[10.5px]">অ্যাকাউন্ট্যান্ট / যাচাইকারী</span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-1 mb-1 h-7"></div>
                      <span className="font-bold text-slate-900 text-[10.5px]">মালিক / ম্যানেজার স্বাক্ষর</span>
                    </div>
                  </div>
                  <div className="text-[9.5px] text-slate-400 text-center mt-2 font-bengali">
                    * এটি {businessName} সিস্টেম জেনারেটেড ডিজিটাল খতিয়ান কপি।
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Page Footer (on every page at the fixed printable bottom) */}
            <div className="pt-1 border-t border-slate-200 text-[9.5px] text-slate-500 flex items-center justify-between font-bengali">
              <span>
                তারিখ: {formatDate(todayDateStr)} • {businessName}
              </span>
              <span className="font-semibold text-slate-700">
                পাতা {toBengaliDigits(pageIndex + 1)} / {toBengaliDigits(totalPages)}
              </span>
            </div>
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
