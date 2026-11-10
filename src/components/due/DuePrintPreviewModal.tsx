import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { BusinessSettings, Customer } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import {
  formatDueNumber,
  formatShortDueNumber,
  compareCustomersByLastDueNumber,
  getCustomerDueNumbersInfo,
} from '../../utils/dueUtils';
import { useApp } from '../../context/AppContext';

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
  customerDueNumbersListMap?: Map<string, string[]>;
  todayDateStr: string;
  initialAction?: 'png' | 'pdf' | null;
  printViewMode?: 'by_customer' | 'by_due';
  flatDues?: Array<{
    id: string;
    dueNo: string;
    rawDueNo: string;
    customerId: string;
    customerName: string;
    shopName: string;
    phone: string;
    address: string;
    assignedSrName: string;
    routes: string[];
    date?: string;
    amount: number;
    isPaid: boolean;
    ledgerId?: string;
  }>;
}

// Physical A4 constants (exact measurements in mm matching @page { size: A4 portrait; margin: 12mm 10mm 14mm 10mm; })
// Total page size: 210mm x 297mm
// Margins: top 12mm, right 10mm, bottom 14mm, left 10mm
// Printable content area: 190mm width x 271mm height
const ROW_HEIGHT_MM = 6.5;

// Maximum capacity calibrated by physical component heights (both views now use single-line ~6.5mm rows):
// Page 1 with Signatures & Totals (Single-page document):
// 271mm - 6mm (footer) - 31mm (p1 header) - 7.5mm (thead) - 34mm (signatures & totals) - 4mm = 188.5mm -> 28 rows safely
const PAGE_1_MAX_WITH_SIG = 28;

// Page 1 without Signatures (First page of multi-page document):
// 271mm - 6mm (footer) - 31mm (p1 header) - 7.5mm (thead) - 4mm = 222.5mm -> 34 rows safely
const PAGE_1_MAX_NO_SIG = 34;

// Continued page without Signatures (Middle pages):
// 271mm - 6mm (footer) - 10mm (cont header) - 7.5mm (thead) - 4mm = 243.5mm -> 37 rows safely
const CONT_MAX_NO_SIG = 37;

// Continued page with Signatures & Totals (Last page of multi-page document):
// 271mm - 6mm (footer) - 10mm (cont header) - 7.5mm (thead) - 34mm (signatures & totals) - 4mm = 209.5mm -> 32 rows safely
const CONT_MAX_WITH_SIG = 32;

/**
 * Renders outstanding due number(s) beside the customer name on the SAME line.
 * - 1 due: [০০০৪৯১]
 * - 2 dues: [০০০৪৯১ · ০০০৫৪০] with last number bold
 * - > 2 dues: [৫০১ … ৫৪০ (+৬)] with last number bold
 */
const renderCustomerDueChip = (dueNos: string[]) => {
  if (!dueNos || dueNos.length === 0) return null;

  if (dueNos.length === 1) {
    return (
      <span className="shrink-0 inline-flex items-center px-1 py-0.2 rounded border border-slate-300 bg-slate-50 font-mono text-[8pt] text-slate-900 font-bold whitespace-nowrap leading-none">
        [{formatShortDueNumber(dueNos[0])}]
      </span>
    );
  }

  if (dueNos.length === 2) {
    return (
      <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.2 rounded border border-slate-300 bg-slate-50 font-mono text-[8pt] whitespace-nowrap leading-none">
        <span>[{formatShortDueNumber(dueNos[0])}</span>
        <span className="text-slate-400 font-sans mx-0.5">·</span>
        <span className="font-black text-slate-950">{formatShortDueNumber(dueNos[1])}</span>
        <span>]</span>
      </span>
    );
  }

  const first = formatShortDueNumber(dueNos[0]);
  const last = formatShortDueNumber(dueNos[dueNos.length - 1]);
  const hiddenCount = dueNos.length === 10 ? 6 : Math.max(1, dueNos.length - 2);

  return (
    <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.2 rounded border border-slate-300 bg-slate-50 font-mono text-[8pt] whitespace-nowrap leading-none">
      <span>[{first}</span>
      <span className="text-slate-400 font-sans mx-0.5">…</span>
      <span className="font-black text-slate-950">{last}</span>
      <span className="ml-0.5 font-sans font-bold text-[7.5pt] text-rose-700">
        (+{toBengaliDigits(hiddenCount)})
      </span>
      <span>]</span>
    </span>
  );
};

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
  printViewMode = 'by_customer',
  flatDues = [],
}) => {
  const { db } = useApp();

  const isDueMode = printViewMode === 'by_due';

  const activeCustomers = useMemo(() => {
    const list = customers.filter((c) => (c.currentDue || 0) > 0);
    // Sort customers by their last (largest) due number ascending
    return list.slice().sort((a, b) => compareCustomersByLastDueNumber(a.id, b.id, db, false));
  }, [customers, db]);

  const activeDues = useMemo(() => {
    return flatDues.filter((d) => !d.isPaid);
  }, [flatDues]);

  // Dynamic pagination based on physical printable capacity
  // Dynamic pagination based on physical printable capacity (single-line rows)
  const pages: any[][] = useMemo(() => {
    const items = isDueMode ? activeDues : activeCustomers;
    const total = items.length;
    if (total === 0) return [[]];

    // Case 1: Fits entirely on Page 1 with totals and signatures (up to 28 rows)
    if (total <= PAGE_1_MAX_WITH_SIG) {
      return [items];
    }

    const result: any[][] = [];
    let remaining = items.slice();
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
  }, [isDueMode, activeDues, activeCustomers]);

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

  const displayedTotalDue = useMemo(() => {
    if (isDueMode) {
      return activeDues.reduce((sum, d) => sum + (d.amount || 0), 0);
    }
    return totalDue;
  }, [isDueMode, activeDues, totalDue]);

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title={isDueMode ? "বাকি নং অনুযায়ী বকেয়া তালিকা (A4)" : "কাস্টমার বকেয়া খতিয়ান ও তালিকা (A4)"}
      subtitle={
        isDueMode
          ? `মোট বকেয়া: ${currency} ${displayedTotalDue.toLocaleString()} • ${toBengaliDigits(activeDues.length)}টি বাকি • ${toBengaliDigits(totalPages)} পাতা`
          : `মোট বকেয়া: ${currency} ${displayedTotalDue.toLocaleString()} • ${toBengaliDigits(activeCustomers.length)} জন কাস্টমার • ${toBengaliDigits(totalPages)} পাতা`
      }
      fileNamePrefix={
        isDueMode
          ? `Due_Number_List_${todayDateStr}_${routeFilter !== 'all' ? routeFilter : 'All_Routes'}`
          : `Customer_Due_List_${todayDateStr}_${routeFilter !== 'all' ? routeFilter : 'All_Routes'}`
      }
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
                        {isDueMode ? 'বাকি নং তালিকা' : 'কাস্টমার বকেয়া তালিকা'}
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
                        {currency} {displayedTotalDue.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">{isDueMode ? 'মোট বাকি:' : 'মোট কাস্টমার:'}</span>
                      <span className="font-bold text-slate-900 truncate block">
                        {isDueMode
                          ? `${toBengaliDigits(activeDues.length)} টি (পাতা ১/${toBengaliDigits(totalPages)})`
                          : `${toBengaliDigits(activeCustomers.length)} জন (পাতা ১/${toBengaliDigits(totalPages)})`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* CONTINUED PAGE COMPACT RUNNING HEADER */
                <div className="border-b border-slate-300 pb-1.5 mb-[4mm] flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="font-bold text-slate-900">
                    {businessName} — {isDueMode ? 'বাকি নং তালিকা' : 'কাস্টমার বকেয়া তালিকা'} (চলমান) • রুট: {routeFilter === 'all' ? 'সকল রুট' : cleanReportText(routeFilter)}
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
                    fontSize: '10px',
                  }}
                >
                  {isDueMode ? (
                    /* "বাকি নং অনুযায়ী" print: ক্র. 4% | বাকি নং 10% | নাম 33% | মোবাইল 12% | বাকির তারিখ 11% | রুট 15% | বর্তমান বকেয়া 15% */
                    <>
                      <thead>
                        <tr
                          className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold"
                          style={{ height: '7.5mm' }}
                        >
                          <th style={{ width: '4%' }} className="py-[1.8mm] px-[1.5mm] text-center border-r border-slate-300">ক্র.</th>
                          <th style={{ width: '10%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">বাকি নং</th>
                          <th style={{ width: '33%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">নাম ও দোকান</th>
                          <th style={{ width: '12%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">মোবাইল</th>
                          <th style={{ width: '11%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">বাকির তারিখ</th>
                          <th style={{ width: '15%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">রুট</th>
                          <th style={{ width: '15%' }} className="py-[1.8mm] px-[2mm] text-right">বর্তমান বকেয়া ({currency})</th>
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
                          pageCustomers.map((d: any, idx) => {
                            const globalIdx = pageStartIdx + idx;
                            const routeStr = d.routes && d.routes.length > 0 ? d.routes.join(', ') : d.address || '';
                            const route = cleanReportText(routeStr);
                            const phone = cleanReportText(d.phone);

                            return (
                              <tr
                                key={`${d.customerId}-${d.rawDueNo}-${idx}`}
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
                                <td className="py-[1.2mm] px-[1.5mm] text-center font-mono text-[9pt] text-slate-500 border-r border-slate-200 truncate">
                                  {toBengaliDigits(globalIdx)}
                                </td>
                                <td className="py-[1.2mm] px-[2mm] font-mono font-bold text-[9pt] text-slate-900 border-r border-slate-200 truncate">
                                  {formatDueNumber(d.rawDueNo)}
                                </td>
                                <td className="py-[1.2mm] px-[2mm] border-r border-slate-200 leading-tight truncate">
                                  <span className="font-bold text-slate-900 text-[8.5pt] truncate block">
                                    {d.customerName}
                                    {d.shopName && d.shopName !== d.customerName ? ` (${d.shopName})` : ''}
                                  </span>
                                </td>
                                <td className="py-[1.2mm] px-[2mm] font-mono text-[8.5pt] text-slate-700 border-r border-slate-200 truncate whitespace-nowrap">
                                  {phone}
                                </td>
                                <td className="py-[1.2mm] px-[1.5mm] font-mono text-[8.5pt] text-slate-700 border-r border-slate-200 whitespace-nowrap overflow-visible">
                                  {d.date ? formatDate(d.date) : '-'}
                                </td>
                                <td className="py-[1.2mm] px-[2mm] text-[8.5pt] text-slate-700 border-r border-slate-200 truncate" title={route}>
                                  {route}
                                </td>
                                <td className="py-[1.2mm] px-[2mm] text-right font-mono font-bold text-rose-700 text-[9.5pt] truncate">
                                  {(d.amount || 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {isLastPage && (
                        <tfoot>
                          <tr
                            className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs"
                            style={{ height: '7.5mm', pageBreakInside: 'avoid', breakInside: 'avoid' }}
                          >
                            <td colSpan={6} className="py-[1.8mm] px-[2.5mm] text-right text-slate-900 font-bold text-[10.5px]">
                              সর্বমোট বকেয়া ({toBengaliDigits(activeDues.length)}টি বাকি):
                            </td>
                            <td className="py-[1.8mm] px-[2.5mm] text-right font-mono text-rose-700 text-xs font-bold">
                              {currency} {displayedTotalDue.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </>
                  ) : (
                    /* "কাস্টমার অনুযায়ী" print: ক্র. 4% | কাস্টমার ও দোকানের নাম (name + number) 38% | মোবাইল 12% | বাকির তারিখ 11% | রুট / ঠিকানা 14% | এসআর 8% | বর্তমান বকেয়া 13% */
                    <>
                      <thead>
                        <tr
                          className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold"
                          style={{ height: '7.5mm' }}
                        >
                          <th style={{ width: '4%' }} className="py-[1.8mm] px-[1.5mm] text-center border-r border-slate-300">ক্র.</th>
                          <th style={{ width: '38%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">কাস্টমার ও দোকানের নাম</th>
                          <th style={{ width: '12%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">মোবাইল</th>
                          <th style={{ width: '11%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">বাকির তারিখ</th>
                          <th style={{ width: '14%' }} className="py-[1.8mm] px-[2mm] border-r border-slate-300">রুট / ঠিকানা</th>
                          <th style={{ width: '8%' }} className="py-[1.8mm] px-[1.5mm] border-r border-slate-300">এসআর</th>
                          <th style={{ width: '13%' }} className="py-[1.8mm] px-[2mm] text-right">বর্তমান বকেয়া ({currency})</th>
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
                          pageCustomers.map((c: any, idx) => {
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

                            const custDueInfo = getCustomerDueNumbersInfo(c.id, db, false);
                            const oldestDate = custDueInfo.oldestDate;
                            const count = custDueInfo.outstandingCount || custDueInfo.dueNos.length;
                            const additionalCount = count > 1 ? count - 1 : 0;

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
                                <td className="py-[1.2mm] px-[1.5mm] text-center font-mono text-[9pt] text-slate-500 border-r border-slate-200 truncate">
                                  {toBengaliDigits(globalIdx)}
                                </td>
                                <td className="py-[1mm] px-[2mm] border-r border-slate-200 leading-tight overflow-hidden">
                                  <div className="flex items-center justify-between gap-1.5 w-full overflow-hidden">
                                    <span
                                      className="font-bold text-slate-900 truncate leading-tight"
                                      style={{ fontSize: '8.5pt' }}
                                      title={`${c.shopName || ''} ${c.name || ''}`}
                                    >
                                      {c.shopName && c.name && c.shopName !== c.name
                                        ? `${c.shopName}, ${c.name}`
                                        : c.shopName || c.name || '-'}
                                    </span>
                                    {renderCustomerDueChip(custDueInfo.dueNos)}
                                  </div>
                                </td>
                                <td className="py-[1.2mm] px-[2mm] font-mono text-[8.5pt] text-slate-700 border-r border-slate-200 truncate whitespace-nowrap">
                                  {phone}
                                </td>
                                <td className="py-[1.2mm] px-[1.5mm] font-mono text-[8.5pt] text-slate-700 border-r border-slate-200 whitespace-nowrap overflow-visible">
                                  {oldestDate ? (
                                    <span className="inline-flex items-center whitespace-nowrap">
                                      <span>{formatDate(oldestDate)}</span>
                                      {additionalCount > 0 && (
                                        <span className="font-sans font-bold text-[7.5pt] text-rose-700 ml-1">
                                          (+{toBengaliDigits(additionalCount)})
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="py-[1.2mm] px-[2mm] text-[8.5pt] text-slate-700 border-r border-slate-200 truncate" title={route}>
                                  {route}
                                </td>
                                <td className="py-[1.2mm] px-[1.5mm] text-[8.5pt] text-slate-600 border-r border-slate-200 truncate" title={srName}>
                                  {srName}
                                </td>
                                <td className="py-[1.2mm] px-[2mm] text-right font-mono font-bold text-rose-700 text-[9.5pt] truncate">
                                  {(c.currentDue || 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {isLastPage && (
                        <tfoot>
                          <tr
                            className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs"
                            style={{ height: '7.5mm', pageBreakInside: 'avoid', breakInside: 'avoid' }}
                          >
                            <td colSpan={6} className="py-[1.8mm] px-[2.5mm] text-right text-slate-900 font-bold text-[10.5px]">
                              সর্বমোট বকেয়া ({toBengaliDigits(activeCustomers.length)} জন কাস্টমার):
                            </td>
                            <td className="py-[1.8mm] px-[2.5mm] text-right font-mono text-rose-700 text-xs font-bold">
                              {currency} {totalDue.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </>
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
