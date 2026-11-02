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

// Physical A4 constants (exact measurements in mm matching @page { size: A4 portrait; margin: 12mm 10mm 14mm 10mm; })
// Total page size: 210mm x 297mm
// Margins: top 12mm, right 10mm, bottom 14mm, left 10mm
// Printable content area: 190mm width x 271mm height
const ROW_HEIGHT_MM = 7.0;

// Maximum capacity calibrated by physical component heights:
// Page 1 with Signatures & Totals (Single-page document):
// 271mm - 6mm (footer) - 31mm (p1 header) - 7.5mm (thead) - 34mm (signatures & totals) = 192.5mm -> 25 rows safely
const PAGE_1_MAX_WITH_SIG = 25;

// Page 1 without Signatures (First page of multi-page document):
// 271mm - 6mm (footer) - 31mm (p1 header) - 7.5mm (thead) = 226.5mm -> 30 rows safely
const PAGE_1_MAX_NO_SIG = 30;

// Continued page without Signatures (Middle pages):
// 271mm - 6mm (footer) - 10mm (cont header) - 7.5mm (thead) = 247.5mm -> 34 rows safely
const CONT_MAX_NO_SIG = 34;

// Continued page with Signatures & Totals (Last page of multi-page document):
// 271mm - 6mm (footer) - 10mm (cont header) - 7.5mm (thead) - 34mm (signatures & totals) = 213.5mm -> 29 rows safely
const CONT_MAX_WITH_SIG = 29;

/**
 * Sanitizes table text values: converts "0", "রুট নেই", empty, null, undefined,
 * or trailing dashes (e.g. "রুট ২: রবিবার-") to trimmed clean text or "-".
 */
const cleanReportText = (val?: string | null): string => {
  if (!val) return '-';
  let str = String(val).trim();
  // Strip trailing dashes, commas, hyphens, colons, or whitespace
  str = str.replace(/[-–—,:;|\s]+$/, '').trim();
  if (!str || str === '0' || str === 'রুট নেই' || str === 'null' || str === 'undefined' || str === 'NaN') {
    return '-';
  }
  return str;
};

export const DuePrintPreviewModal: React.FC<DuePrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  customers,
  totalDue,
  totalCollected: _totalCollected,
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

  // Dynamic pagination based on physical printable capacity
  const pages: Customer[][] = useMemo(() => {
    const total = activeCustomers.length;
    if (total === 0) return [[]];

    // Case 1: Fits entirely on Page 1 with totals and signatures (up to 25 customers)
    if (total <= PAGE_1_MAX_WITH_SIG) {
      return [activeCustomers];
    }

    const result: Customer[][] = [];
    let remaining = activeCustomers.slice();
    let isFirstPage = true;

    while (remaining.length > 0) {
      if (isFirstPage) {
        let take = PAGE_1_MAX_NO_SIG;
        const leftAfterP1 = remaining.length - take;
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
          let take = CONT_MAX_NO_SIG;
          const leftAfter = remaining.length - take;
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
      {/* Scoped style tag enforcing exact 12mm 10mm 14mm 10mm page margin and 190mm x 271mm printable area in @media print */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 14mm 10mm;
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
          .printable-a4-page.due-a4-page {
            width: 100% !important;
            max-width: 100% !important;
            height: 271mm !important;
            min-height: 271mm !important;
            max-height: 271mm !important;
            padding: 0 !important;
            margin: 0 !important;
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            className="printable-a4-page due-a4-page bg-white text-slate-900 shadow-xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
            style={{
              width: '210mm',
              maxWidth: '100%',
              height: '297mm',
              minHeight: '297mm',
              maxHeight: '297mm',
              padding: '12mm 10mm 14mm 10mm',
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
                  <div className="flex items-start justify-between gap-3 pb-2">
                    <div className="flex-1">
                      <h1 className="text-xl font-black tracking-tight text-slate-950 font-bengali leading-none">
                        {businessName}
                      </h1>
                      <p className="text-[11px] font-bold text-slate-700 mt-1 leading-tight">
                        {subtitle}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                        ঠিকানা: {cleanReportText(settings.address || 'চকবাজার, ঢাকা')} {settings.phone ? `• মোবাইল: ${cleanReportText(settings.phone)}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded shadow-xs">
                        কাস্টমার বকেয়া তালিকা
                      </span>
                      <p className="text-[9.5px] text-slate-500 font-mono mt-1">
                        তারিখ: {formatDate(todayDateStr)} • প্রিন্ট: {new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Clean divider line with ~4mm gap below */}
                  <div className="border-b-2 border-slate-900 mb-[4mm]"></div>

                  {/* Metadata Filter Strip - 4 equal columns with equal inner padding & thin border */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-300 rounded p-1.5 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">ফিল্টারকৃত রুট:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {routeFilter === 'all' ? 'সকল রুট' : cleanReportText(routeFilter)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">এসআর ফিল্টার:</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {srFilter === 'all' ? 'সকল এসআর' : cleanReportText(srFilter)}
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
                <div className="border-b border-slate-300 pb-1.5 mb-[4mm] flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="font-bold text-slate-900">
                    {businessName} — কাস্টমার বকেয়া তালিকা (চলমান) • রুট: {routeFilter === 'all' ? 'সকল রুট' : cleanReportText(routeFilter)}
                  </span>
                  <span className="font-mono text-[11px] text-slate-700">
                    তারিখ: {formatDate(todayDateStr)} • পাতা: {toBengaliDigits(pageIndex + 1)}/{toBengaliDigits(totalPages)}
                  </span>
                </div>
              )}

              {/* TABLE WITH 190mm EXACT PRINTABLE WIDTH */}
              <div className="border border-slate-300 rounded-sm overflow-hidden w-full">
                <table
                  className="w-full text-left border-collapse"
                  style={{
                    tableLayout: 'fixed',
                    width: '100%',
                    fontSize: '10.5px',
                  }}
                >
                  <thead>
                    <tr
                      className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold"
                      style={{ height: '7.5mm' }}
                    >
                      <th style={{ width: '10mm' }} className="py-[1.8mm] px-[2.5mm] text-center border-r border-slate-300">#</th>
                      <th style={{ width: '52mm' }} className="py-[1.8mm] px-[2.5mm] border-r border-slate-300">কাস্টমার ও দোকানের নাম</th>
                      <th style={{ width: '28mm' }} className="py-[1.8mm] px-[2.5mm] border-r border-slate-300">মোবাইল</th>
                      <th style={{ width: '36mm' }} className="py-[1.8mm] px-[2.5mm] border-r border-slate-300">রুট / ঠিকানা</th>
                      <th style={{ width: '24mm' }} className="py-[1.8mm] px-[2.5mm] border-r border-slate-300">এসআর</th>
                      <th style={{ width: '24mm' }} className="py-[1.8mm] px-[2.5mm] text-right border-r border-slate-300">বর্তমান বকেয়া</th>
                      <th style={{ width: '16mm' }} className="py-[1.8mm] px-[1.5mm] text-center">স্বাক্ষর / রিসিট</th>
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
                        const rawRoute = routeVal
                          ? routeVal instanceof Set
                            ? Array.from(routeVal).join(', ')
                            : String(routeVal)
                          : c.address || '';
                        const route = cleanReportText(rawRoute);
                        const phone = cleanReportText(c.phone);
                        const srName = cleanReportText(c.assignedSrName);

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
                            <td className="py-[1.8mm] px-[2.5mm] text-center font-mono text-[10px] text-slate-500 border-r border-slate-200 truncate">
                              {toBengaliDigits(globalIdx)}
                            </td>
                            <td className="py-[1.8mm] px-[2.5mm] border-r border-slate-200 leading-tight truncate">
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
                            <td className="py-[1.8mm] px-[2.5mm] font-mono text-[10px] text-slate-700 border-r border-slate-200 truncate">
                              {phone}
                            </td>
                            <td className="py-[1.8mm] px-[2.5mm] text-[10px] text-slate-700 border-r border-slate-200 truncate" title={route}>
                              {route}
                            </td>
                            <td className="py-[1.8mm] px-[2.5mm] text-[10px] text-slate-600 border-r border-slate-200 truncate" title={srName}>
                              {srName}
                            </td>
                            <td className="py-[1.8mm] px-[2.5mm] text-right font-mono font-bold text-rose-700 text-[10.5px] border-r border-slate-200 truncate">
                              {currency} {(c.currentDue || 0).toLocaleString()}
                            </td>
                            <td className="py-[1.8mm] px-[1.5mm] border-r-0 border-slate-200"></td>
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
                        <td colSpan={5} className="py-[1.8mm] px-[2.5mm] text-right text-slate-900 font-bold text-[11px]">
                          সর্বমোট বকেয়া ({toBengaliDigits(activeCustomers.length)} জন কাস্টমার):
                        </td>
                        <td className="py-[1.8mm] px-[2.5mm] text-right font-mono text-rose-700 text-xs font-bold">
                          {currency} {totalDue.toLocaleString()}
                        </td>
                        <td className="border-l border-slate-300"></td>
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
                      <div className="border-b border-slate-400 pb-1 mb-1.5 h-8"></div>
                      <span className="font-semibold text-slate-800 text-[10.5px]">আদায়কারী / এসআর স্বাক্ষর</span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-1 mb-1.5 h-8"></div>
                      <span className="font-semibold text-slate-800 text-[10.5px]">অ্যাকাউন্ট্যান্ট / যাচাইকারী</span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-1 mb-1.5 h-8"></div>
                      <span className="font-bold text-slate-900 text-[10.5px]">মালিক / ম্যানেজার স্বাক্ষর</span>
                    </div>
                  </div>
                  <div className="text-[9.5px] text-slate-400 text-center mt-2.5 font-bengali">
                    * এটি {businessName} সিস্টেম জেনারেটেড ডিজিটাল খতিয়ান কপি।
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Page Footer (on every page at the fixed printable bottom) */}
            <div className="pt-1.5 border-t border-slate-200 text-[9.5px] text-slate-500 flex items-center justify-between font-bengali">
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
