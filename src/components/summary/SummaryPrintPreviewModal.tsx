import React, { useState, useMemo, useEffect } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { BusinessSettings, Product } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import { RouteDueItem } from '../../utils/dueUtils';

interface SummaryPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  products: Product[];
  todayDateStr?: string;
  generationDateTimeStr: string;
  onlyInStock: boolean;
  selectedRoute?: string;
  routeDues?: RouteDueItem[];
  routeCustomerCount?: number;
  routeTotalAmount?: number;
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
  selectedRoute = '',
  routeDues = [],
  routeCustomerCount = 0,
  routeTotalAmount = 0,
  initialAction = null,
}) => {
  // Checkbox states in control bar
  const [includeProducts, setIncludeProducts] = useState<boolean>(true);
  const [includeRouteDues, setIncludeRouteDues] = useState<boolean>(Boolean(selectedRoute));

  // Sync checkboxes when route changes or modal opens
  useEffect(() => {
    if (selectedRoute) {
      setIncludeRouteDues(true);
    } else {
      setIncludeRouteDues(false);
    }
    setIncludeProducts(true);
  }, [selectedRoute, isOpen]);

  // Display label for selected route
  const selectedRouteDisplayName = useMemo(() => {
    if (!selectedRoute) return 'রুট নির্বাচন করা নেই';
    if (selectedRoute === 'no_route') return 'রুট উল্লেখ নেই';
    return selectedRoute;
  }, [selectedRoute]);

  // -------------------------------------------------------------
  // 1. PRODUCT PAGES CALCULATION (Exact 1-page fit preserved)
  // -------------------------------------------------------------
  // Available table height on a 271mm printable page (271mm - ~36mm header/footer blocks = ~235mm)
  const AVAILABLE_TABLE_HEIGHT_MM = 235;
  const MIN_ROW_HEIGHT_MM = 7;
  const MAX_ROW_HEIGHT_MM = 9;

  // Maximum items that can fit on a single page at the 7mm minimum
  const MAX_ITEMS_PER_PAGE = Math.floor(AVAILABLE_TABLE_HEIGHT_MM / MIN_ROW_HEIGHT_MM); // ~33 items

  const totalProducts = products.length;

  const { productPages, rowHeightMm, fontPt } = useMemo(() => {
    if (totalProducts === 0) {
      return {
        productPages: [[]],
        rowHeightMm: MAX_ROW_HEIGHT_MM,
        fontPt: 11,
      };
    }

    let calculatedPages: Product[][] = [];
    let heightMm: number;

    if (totalProducts <= MAX_ITEMS_PER_PAGE) {
      // Fits on ONE single page!
      calculatedPages = [products];
      heightMm = Math.min(MAX_ROW_HEIGHT_MM, Math.max(MIN_ROW_HEIGHT_MM, AVAILABLE_TABLE_HEIGHT_MM / totalProducts));
    } else {
      // List is longer than ~33 items -> Split across pages
      const totalPgs = Math.ceil(totalProducts / MAX_ITEMS_PER_PAGE);
      const itemsPerPage = Math.ceil(totalProducts / totalPgs);

      calculatedPages = [];
      for (let i = 0; i < totalProducts; i += itemsPerPage) {
        calculatedPages.push(products.slice(i, i + itemsPerPage));
      }

      heightMm = Math.min(MAX_ROW_HEIGHT_MM, Math.max(MIN_ROW_HEIGHT_MM, AVAILABLE_TABLE_HEIGHT_MM / itemsPerPage));
    }

    // Font size scales smoothly from 9.5pt at 7mm to 11pt at 9mm
    const t = Math.max(0, Math.min(1, (heightMm - MIN_ROW_HEIGHT_MM) / (MAX_ROW_HEIGHT_MM - MIN_ROW_HEIGHT_MM)));
    const calculatedFontPt = Math.round((9.5 + t * (11 - 9.5)) * 10) / 10;

    return {
      productPages: calculatedPages,
      rowHeightMm: heightMm,
      fontPt: calculatedFontPt,
    };
  }, [totalProducts, products]);

  // -------------------------------------------------------------
  // 2. ROUTE DUES PAGES CALCULATION (Two-Block Compact Pagination)
  // -------------------------------------------------------------
  const safeRouteDues = routeDues || [];

  const duesPages: RouteDueItem[][] = useMemo(() => {
    if (safeRouteDues.length === 0) return [[]];

    // Page 1 capacity: 34 rows per block * 2 blocks = 68 items
    const P1_LIMIT = 68;
    // Continued pages capacity: 38 rows per block * 2 blocks = 76 items
    const CONT_LIMIT = 76;

    if (safeRouteDues.length <= P1_LIMIT) {
      return [safeRouteDues];
    }

    const chunks: RouteDueItem[][] = [];
    let remaining = [...safeRouteDues];
    let isFirst = true;

    while (remaining.length > 0) {
      const limit = isFirst ? P1_LIMIT : CONT_LIMIT;
      if (remaining.length <= limit) {
        chunks.push(remaining);
        break;
      }

      // If the remaining items left for the next page would be fewer than 4,
      // take slightly fewer from this page so the last page keeps at least 4 items with the totals line
      let take = limit;
      const leftAfter = remaining.length - take;
      if (leftAfter > 0 && leftAfter < 4) {
        take = remaining.length - 4;
      }

      chunks.push(remaining.slice(0, take));
      remaining = remaining.slice(take);
      isFirst = false;
    }

    return chunks;
  }, [safeRouteDues]);

  // Total pages across the entire printed document
  const activeProductPages = includeProducts ? productPages : [];
  const activeDuesPages = includeRouteDues && selectedRoute ? duesPages : [];
  const totalDocumentPages = Math.max(1, activeProductPages.length + activeDuesPages.length);

  // Subtitle for preview header
  const modalSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (includeProducts) {
      parts.push(`পণ্য তালিকা: ${toBengaliDigits(products.length)} টি`);
    }
    if (includeRouteDues && selectedRoute) {
      parts.push(`রুটের বাকি: ${toBengaliDigits(safeRouteDues.length)} টি (৳ ${routeTotalAmount.toLocaleString('en-US')})`);
    }
    parts.push(`সর্বমোট ${toBengaliDigits(totalDocumentPages)} পাতা`);
    return parts.join(' • ');
  }, [includeProducts, includeRouteDues, selectedRoute, products.length, safeRouteDues.length, routeTotalAmount, totalDocumentPages]);

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="দৈনিক সামারি ও রুটের বকেয়া প্রিন্ট প্রিভিউ (A4)"
      subtitle={modalSubtitle}
      fileNamePrefix={`MM_Traders_Summary_${selectedRoute ? 'Route_' : ''}${todayDateStr}`}
      initialAction={initialAction}
      headerActions={
        <div className="flex items-center gap-2.5 bg-slate-800/95 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-white">
          {/* 1. Checkbox for Product List */}
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-400 select-none">
            <input
              type="checkbox"
              checked={includeProducts}
              onChange={(e) => {
                if (!e.target.checked && (!includeRouteDues || !selectedRoute)) return;
                setIncludeProducts(e.target.checked);
              }}
              className="rounded border-slate-600 text-emerald-600 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="font-bengali font-bold">পণ্য তালিকা</span>
          </label>

          <div className="h-3.5 w-px bg-slate-700" />

          {/* 2. Checkbox for Route Dues */}
          <label
            className={`flex items-center gap-1.5 select-none ${
              !selectedRoute
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer hover:text-emerald-400'
            }`}
            title={!selectedRoute ? 'রুট সিলেক্ট করা নেই (নিচে রুট সিলেক্ট করুন)' : 'রুটের বাকি প্রিন্ট অন্তর্ভুক্ত করুন'}
          >
            <input
              type="checkbox"
              disabled={!selectedRoute}
              checked={includeRouteDues && Boolean(selectedRoute)}
              onChange={(e) => {
                if (!e.target.checked && !includeProducts) return;
                setIncludeRouteDues(e.target.checked);
              }}
              className="rounded border-slate-600 text-emerald-600 focus:ring-0 h-3.5 w-3.5 disabled:opacity-30 cursor-pointer"
            />
            <span className="font-bengali font-bold">রুটের বাকি</span>
            {selectedRoute && (
              <span className="text-[10px] text-emerald-400 font-mono">
                ({toBengaliDigits(safeRouteDues.length)})
              </span>
            )}
          </label>
        </div>
      }
    >
      {/* Scoped print CSS: Exact A4 portrait margins (12mm top, 10mm sides, 14mm bottom) */}
      <style>{`
        @page {
          size: A4 portrait !important;
          margin: 12mm 10mm 14mm 10mm !important;
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
          .printable-a4-page {
            width: 190mm !important;
            max-width: 190mm !important;
            height: 271mm !important;
            min-height: 271mm !important;
            max-height: 271mm !important;
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
          .printable-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* ============================================================= */}
      {/* PART A: PRODUCT LIST SHEETS (পণ্য তালিকা) */}
      {/* ============================================================= */}
      {includeProducts &&
        productPages.map((pageProducts, pageIndex) => {
          const isFirstProductPage = pageIndex === 0;
          const isLastDocPage =
            pageIndex === productPages.length - 1 &&
            (!includeRouteDues || !selectedRoute || safeRouteDues.length === 0);
          const startSerial = pageIndex * Math.ceil(totalProducts / Math.max(1, productPages.length));
          const docPageNumber = pageIndex + 1;

          return (
            <div
              key={`prod-${pageIndex}`}
              className="printable-a4-page summary-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
              style={{
                width: '190mm',
                height: '271mm',
                minHeight: '271mm',
                maxHeight: '271mm',
                padding: '0',
                margin: '0 auto',
                boxSizing: 'border-box',
                overflow: 'hidden',
                pageBreakAfter: isLastDocPage ? 'auto' : 'always',
                breakAfter: isLastDocPage ? 'auto' : 'page',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
              }}
            >
              {/* Top Fixed Blocks + Table */}
              <div>
                {/* 1. COMPACT LETTERHEAD (~14mm) */}
                {isFirstProductPage ? (
                  <div
                    className="flex items-center justify-between border-b border-slate-300 pb-1"
                    style={{ height: '14mm', boxSizing: 'border-box' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded bg-slate-900 text-white font-black tracking-tight"
                        style={{ width: '11mm', height: '11mm', fontSize: '7.5pt' }}
                      >
                        MM
                      </div>
                      <div>
                        <div
                          className="font-black text-slate-950 font-bengali tracking-tight"
                          style={{ fontSize: '13pt', lineHeight: '1.05' }}
                        >
                          {settings.businessName || 'MM TRADERS'}
                        </div>
                        <div
                          className="text-slate-600 font-medium truncate max-w-[125mm]"
                          style={{ fontSize: '8pt', lineHeight: '1.2' }}
                        >
                          {settings.subtitle || 'ডিস্ট্রিবিউটর'} • {settings.address || 'কুসুমহাটী বাজার, শেরপুর'} {settings.phone ? `• মোবা: ${toBengaliDigits(settings.phone)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-800 font-bengali" style={{ fontSize: '8pt', lineHeight: '1.1' }}>
                        {settings.proprietorName ? `স্বত্বাধিকারী: ${settings.proprietorName}` : 'ডিস্ট্রিবিউশন সেলস'}
                      </div>
                      <div className="text-slate-500 font-mono" style={{ fontSize: '7.5pt', lineHeight: '1.1' }}>
                        লাইসেন্স: {settings.tradeLicenseNo || 'TRAD/MMT/092144'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Compact Continued Header on subsequent pages (~11mm) */
                  <div
                    className="flex items-center justify-between border-b border-slate-300 pb-1"
                    style={{ height: '11mm', boxSizing: 'border-box' }}
                  >
                    <div className="font-black text-slate-950 font-bengali" style={{ fontSize: '11pt', lineHeight: '1' }}>
                      {settings.businessName || 'MM TRADERS'} — দৈনিক মাল বের করার তালিকা (চলমান)
                    </div>
                    <div className="text-slate-600 font-medium" style={{ fontSize: '8pt', lineHeight: '1' }}>
                      পাতা: {toBengaliDigits(docPageNumber)}/{toBengaliDigits(totalDocumentPages)}
                    </div>
                  </div>
                )}

                {/* 2. TITLE & 4 EQUAL HAND-WRITTEN BLANK FIELDS (~12.5mm) */}
                <div
                  className="border-b border-slate-300 py-1"
                  style={{ height: '12.5mm', boxSizing: 'border-box' }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="font-black text-slate-900 font-bengali tracking-tight"
                      style={{ fontSize: '11pt', lineHeight: '1' }}
                    >
                      দৈনিক মাল বের করার তালিকা
                    </div>
                  </div>

                  {/* 4 equal blank fields: তারিখ | রুট | SR/DSR | গাড়ি নং */}
                  <div
                    className="grid grid-cols-4 gap-3 text-slate-800 mt-1.5 items-baseline"
                    style={{ fontSize: '8pt', lineHeight: '1' }}
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold shrink-0">তারিখ:</span>{' '}
                      <span className="font-mono text-slate-600 text-[8pt] tracking-wider border-b border-slate-400 pb-0.5 inline-block flex-1 text-center">
                        ___ / ___ / ______
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold shrink-0">রুট:</span>{' '}
                      <span className="border-b border-slate-400 pb-0.5 inline-block flex-1">
                        &nbsp;
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold shrink-0">SR/DSR:</span>{' '}
                      <span className="border-b border-slate-400 pb-0.5 inline-block flex-1">
                        &nbsp;
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold shrink-0">গাড়ি নং:</span>{' '}
                      <span className="border-b border-slate-400 pb-0.5 inline-block flex-1">
                        &nbsp;
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. TABLE: 8 Columns, exactly calculated rowHeight */}
                <table
                  style={{
                    tableLayout: 'fixed',
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        height: '7mm',
                        maxHeight: '7mm',
                        backgroundColor: '#f1f5f9',
                        borderBottom: '1.5px solid #64748b',
                        fontSize: '8.5pt',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        boxSizing: 'border-box',
                      }}
                    >
                      <th style={{ width: '5%', textAlign: 'center', borderRight: '1px solid #cbd5e1', padding: '0 2px' }}>
                        নং
                      </th>
                      <th style={{ width: '27%', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 6px' }}>
                        প্রোডাক্টের নাম
                      </th>
                      <th
                        style={{
                          width: '12%',
                          textAlign: 'center',
                          borderRight: '1px solid #cbd5e1',
                          padding: '0 2px',
                          backgroundColor: '#fef3c7',
                        }}
                      >
                        মোট
                      </th>
                      <th
                        style={{
                          width: '12%',
                          textAlign: 'center',
                          borderRight: '1px solid #cbd5e1',
                          padding: '0 2px',
                          backgroundColor: '#fef3c7',
                        }}
                      >
                        ফেরত
                      </th>
                      <th
                        style={{
                          width: '12%',
                          textAlign: 'center',
                          borderRight: '1px solid #cbd5e1',
                          padding: '0 2px',
                          backgroundColor: '#fef3c7',
                        }}
                      >
                        মোট বিক্রি
                      </th>
                      <th
                        style={{
                          width: '12%',
                          textAlign: 'center',
                          borderRight: '1px solid #cbd5e1',
                          padding: '0 2px',
                          backgroundColor: '#fef3c7',
                        }}
                      >
                        অবশিষ্ট স্টক
                      </th>
                      <th style={{ width: '10%', textAlign: 'center', borderRight: '1px solid #cbd5e1', padding: '0 2px' }}>
                        স্টক
                      </th>
                      <th style={{ width: '10%', textAlign: 'right', padding: '0 5px' }}>
                        দর (কার্টুন)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageProducts.map((p, idx) => {
                      const globalSerial = startSerial + idx + 1;
                      const stockDisplay = formatStockForSummary(p);
                      const hasStock = (Number(p.currentStock) || 0) > 0;
                      const salePrice = Number(p.salePrice) || 0;
                      const nameFontPt = p.name.length > 18 ? Math.max(9, fontPt - 1.5) : fontPt;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            height: `${rowHeightMm}mm`,
                            maxHeight: `${rowHeightMm}mm`,
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                          }}
                        >
                          {/* নং (5%) */}
                          <td
                            style={{
                              width: '5%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              fontSize: `${fontPt}pt`,
                              fontFamily: 'monospace',
                              color: '#475569',
                              padding: '0 2px',
                              verticalAlign: 'middle',
                              lineHeight: '1.15',
                              boxSizing: 'border-box',
                            }}
                          >
                            {toBengaliDigits(globalSerial)}
                          </td>

                          {/* প্রোডাক্টের নাম (27%) */}
                          <td
                            style={{
                              width: '27%',
                              textAlign: 'left',
                              borderRight: '1px solid #cbd5e1',
                              fontSize: `${nameFontPt}pt`,
                              fontWeight: 'bold',
                              color: '#0f172a',
                              padding: '0 5px',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.15',
                              boxSizing: 'border-box',
                            }}
                            title={p.name}
                          >
                            {p.name}
                          </td>

                          {/* মোট (12%) - empty bordered cell */}
                          <td
                            style={{
                              width: '12%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              padding: '0 2px',
                              verticalAlign: 'middle',
                              backgroundColor: '#ffffff',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                height: `${Math.max(5, rowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>

                          {/* ফেরত (12%) - empty bordered cell */}
                          <td
                            style={{
                              width: '12%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              padding: '0 2px',
                              verticalAlign: 'middle',
                              backgroundColor: '#ffffff',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                height: `${Math.max(5, rowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>

                          {/* মোট বিক্রি (12%) - empty bordered cell */}
                          <td
                            style={{
                              width: '12%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              padding: '0 2px',
                              verticalAlign: 'middle',
                              backgroundColor: '#ffffff',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                height: `${Math.max(5, rowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>

                          {/* অবশিষ্ট স্টক (12%) - empty bordered cell */}
                          <td
                            style={{
                              width: '12%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              padding: '0 2px',
                              verticalAlign: 'middle',
                              backgroundColor: '#ffffff',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div
                              style={{
                                height: `${Math.max(5, rowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>

                          {/* স্টক (10%) */}
                          <td
                            style={{
                              width: '10%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              fontSize: `${fontPt}pt`,
                              fontWeight: hasStock ? 'bold' : 'normal',
                              color: hasStock ? '#065f46' : '#64748b',
                              padding: '0 2px',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.15',
                              boxSizing: 'border-box',
                            }}
                          >
                            {stockDisplay}
                          </td>

                          {/* দর (কার্টুন) (10%) */}
                          <td
                            style={{
                              width: '10%',
                              textAlign: 'right',
                              fontSize: `${fontPt}pt`,
                              fontWeight: 'bold',
                              fontFamily: 'monospace',
                              color: '#0f172a',
                              padding: '0 4px',
                              verticalAlign: 'middle',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.15',
                              boxSizing: 'border-box',
                            }}
                          >
                            ৳ {salePrice.toLocaleString('en-US')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4. FOOTER (~5mm) */}
              <div
                className="flex items-center justify-between text-slate-500 border-t border-slate-300 pt-0.5"
                style={{
                  height: '5mm',
                  maxHeight: '5mm',
                  fontSize: '7.5pt',
                  boxSizing: 'border-box',
                  lineHeight: '1',
                }}
              >
                <div>
                  মুদ্রণ: {generationDateTimeStr} • {settings.businessName || 'MM TRADERS'}
                </div>
                <div className="font-mono font-bold text-slate-800">
                  পাতা {toBengaliDigits(docPageNumber)}/{toBengaliDigits(totalDocumentPages)}
                </div>
              </div>
            </div>
          );
        })}

      {/* ============================================================= */}
      {/* PART B: ROUTE DUES SHEETS (রুটের বাকির তালিকা - OWN PAGE) */}
      {/* ============================================================= */}
      {includeRouteDues &&
        selectedRoute &&
        duesPages.map((pageDues, duesPageIndex) => {
          const isFirstDuesPage = duesPageIndex === 0;
          const isLastDuesPage = duesPageIndex === duesPages.length - 1;
          const docPageNumber = activeProductPages.length + duesPageIndex + 1;

          // Start serial for this dues page
          let startDuesSerial = 0;
          for (let p = 0; p < duesPageIndex; p++) {
            startDuesSerial += duesPages[p].length;
          }

          // Split page items into Two Side-by-Side Blocks
          const half = Math.ceil(pageDues.length / 2);
          const leftItems = pageDues.slice(0, half);
          const rightItems = pageDues.slice(half);

          return (
            <div
              key={`dues-${duesPageIndex}`}
              className="printable-a4-page summary-dues-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
              style={{
                width: '190mm',
                height: '271mm',
                minHeight: '271mm',
                maxHeight: '271mm',
                padding: '0',
                margin: '0 auto',
                boxSizing: 'border-box',
                overflow: 'hidden',
                pageBreakAfter: isLastDuesPage ? 'auto' : 'always',
                breakAfter: isLastDuesPage ? 'auto' : 'page',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
              }}
            >
              {/* Top Section + Tables */}
              <div>
                {/* 1. COMPACT LETTERHEAD (~14mm) */}
                {isFirstDuesPage ? (
                  <div
                    className="flex items-center justify-between border-b border-slate-300 pb-1"
                    style={{ height: '14mm', boxSizing: 'border-box' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded bg-slate-900 text-white font-black tracking-tight"
                        style={{ width: '11mm', height: '11mm', fontSize: '7.5pt' }}
                      >
                        MM
                      </div>
                      <div>
                        <div
                          className="font-black text-slate-950 font-bengali tracking-tight"
                          style={{ fontSize: '13pt', lineHeight: '1.05' }}
                        >
                          {settings.businessName || 'MM TRADERS'}
                        </div>
                        <div
                          className="text-slate-600 font-medium truncate max-w-[125mm]"
                          style={{ fontSize: '8pt', lineHeight: '1.2' }}
                        >
                          {settings.subtitle || 'ডিস্ট্রিবিউটর'} • {settings.address || 'কুসুমহাটী বাজার, শেরপুর'} {settings.phone ? `• মোবা: ${toBengaliDigits(settings.phone)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-800 font-bengali" style={{ fontSize: '8pt', lineHeight: '1.1' }}>
                        {settings.proprietorName ? `স্বত্বাধিকারী: ${settings.proprietorName}` : 'ডিস্ট্রিবিউশন সেলস'}
                      </div>
                      <div className="text-slate-500 font-mono" style={{ fontSize: '7.5pt', lineHeight: '1.1' }}>
                        লাইসেন্স: {settings.tradeLicenseNo || 'TRAD/MMT/092144'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Compact Continued Header on subsequent dues pages (~11mm) */
                  <div
                    className="flex items-center justify-between border-b border-slate-300 pb-1"
                    style={{ height: '11mm', boxSizing: 'border-box' }}
                  >
                    <div className="font-black text-slate-950 font-bengali" style={{ fontSize: '11pt', lineHeight: '1' }}>
                      {settings.businessName || 'MM TRADERS'} — রুটের বাকির তালিকা (চলমান) • রুট: {selectedRouteDisplayName}
                    </div>
                    <div className="text-slate-600 font-medium" style={{ fontSize: '8pt', lineHeight: '1' }}>
                      পাতা: {toBengaliDigits(docPageNumber)}/{toBengaliDigits(totalDocumentPages)}
                    </div>
                  </div>
                )}

                {/* 2. TITLE, ROUTE NAME (PRINTED) & DATE (~10mm) */}
                <div
                  className="border-b border-slate-300 py-1 flex items-center justify-between"
                  style={{ height: '10mm', boxSizing: 'border-box' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-black text-slate-900 font-bengali tracking-tight"
                      style={{ fontSize: '11pt', lineHeight: '1' }}
                    >
                      রুটের বাকির তালিকা
                    </span>
                    <span className="text-slate-400">•</span>
                    <span
                      className="font-bold text-emerald-950 font-bengali px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200"
                      style={{ fontSize: '8.5pt' }}
                    >
                      রুট: <strong>{selectedRouteDisplayName}</strong>
                    </span>
                  </div>

                  <div className="text-slate-600 text-right" style={{ fontSize: '8pt', lineHeight: '1.1' }}>
                    <span>প্রস্তুত সময়: </span>
                    <span className="font-mono font-bold text-slate-800">{generationDateTimeStr}</span>
                  </div>
                </div>

                {/* 3. SUMMARY STRIP (মোট বাকি সংখ্যা, কাস্টমার সংখ্যা, মোট টাকা) (~7mm) */}
                {isFirstDuesPage && (
                  <div
                    className="flex items-center justify-between px-2.5 bg-slate-50 border-b border-slate-200 text-slate-700"
                    style={{ height: '7mm', fontSize: '8pt', boxSizing: 'border-box' }}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        মোট বাকি: <strong className="font-mono font-bold text-slate-900">{toBengaliDigits(safeRouteDues.length)}</strong> টি
                      </div>
                      <div className="h-3 w-px bg-slate-300" />
                      <div>
                        কাস্টমার সংখ্যা: <strong className="font-mono font-bold text-slate-900">{toBengaliDigits(routeCustomerCount)}</strong> জন
                      </div>
                      <div className="h-3 w-px bg-slate-300" />
                      <div>
                        মোট বকেয়া: <strong className="font-mono font-bold text-rose-700">৳ {routeTotalAmount.toLocaleString('en-US')}</strong>
                      </div>
                    </div>
                    <div className="text-[7.5pt] text-slate-500 italic">
                      * প্রতিটি বাকির বর্তমান অবশিষ্ট বকেয়া পরিমাণ
                    </div>
                  </div>
                )}

                {/* 4. TWO SIDE-BY-SIDE COMPACT LIST BLOCKS */}
                <div className="mt-1" style={{ width: '100%' }}>
                  {pageDues.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-bengali">
                      এই রুটে কোনো বকেয়া বাকি রেকর্ড পাওয়া যায়নি (সব বাকি পরিশোধিত)
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        columnGap: '4mm',
                        width: '100%',
                      }}
                    >
                      {/* Left Block Table */}
                      <div>
                        <table
                          style={{
                            width: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                height: '6mm',
                                maxHeight: '6mm',
                                backgroundColor: '#f1f5f9',
                                borderBottom: '1px solid #94a3b8',
                                fontSize: '8pt',
                                fontWeight: 'bold',
                                color: '#1e293b',
                                boxSizing: 'border-box',
                              }}
                            >
                              <th style={{ width: '8mm', textAlign: 'center', borderRight: '1px solid #cbd5e1', padding: '0 2px' }}>
                                নং
                              </th>
                              <th style={{ width: '22mm', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 3px' }}>
                                বাকি নং
                              </th>
                              <th style={{ width: '43mm', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 3px' }}>
                                নাম
                              </th>
                              <th style={{ width: '20mm', textAlign: 'right', padding: '0 3px' }}>
                                টাকা (৳)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {leftItems.map((item, idx) => {
                              const serial = startDuesSerial + idx + 1;
                              const nameLength = (item.customerName || '').length;
                              const itemFontPt = nameLength > 22 ? '7.5pt' : '8.2pt';

                              return (
                                <tr
                                  key={item.id}
                                  style={{
                                    height: '6mm',
                                    maxHeight: '6mm',
                                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    boxSizing: 'border-box',
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid',
                                  }}
                                >
                                  <td
                                    style={{
                                      width: '8mm',
                                      textAlign: 'center',
                                      borderRight: '1px solid #e2e8f0',
                                      fontFamily: 'monospace',
                                      fontSize: '7.5pt',
                                      color: '#64748b',
                                      padding: '0 1px',
                                      verticalAlign: 'middle',
                                      lineHeight: '1.1',
                                    }}
                                  >
                                    {toBengaliDigits(serial)}
                                  </td>
                                  <td
                                    style={{
                                      width: '22mm',
                                      textAlign: 'left',
                                      borderRight: '1px solid #e2e8f0',
                                      fontFamily: 'monospace',
                                      fontSize: '8pt',
                                      fontWeight: 'bold',
                                      color: '#0f172a',
                                      padding: '0 3px',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.1',
                                    }}
                                    title={item.dueNo}
                                  >
                                    {item.dueNo}
                                  </td>
                                  <td
                                    style={{
                                      width: '43mm',
                                      textAlign: 'left',
                                      borderRight: '1px solid #e2e8f0',
                                      fontSize: itemFontPt,
                                      fontWeight: '600',
                                      color: '#1e293b',
                                      padding: '0 3px',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.1',
                                    }}
                                    title={item.customerName}
                                  >
                                    {item.customerName}
                                  </td>
                                  <td
                                    style={{
                                      width: '20mm',
                                      textAlign: 'right',
                                      fontFamily: 'monospace',
                                      fontSize: '8.2pt',
                                      fontWeight: 'bold',
                                      color: '#9f1239',
                                      padding: '0 3px',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                      lineHeight: '1.1',
                                    }}
                                  >
                                    {item.amount.toLocaleString('en-US')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Right Block Table */}
                      <div>
                        <table
                          style={{
                            width: '100%',
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            border: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                height: '6mm',
                                maxHeight: '6mm',
                                backgroundColor: '#f1f5f9',
                                borderBottom: '1px solid #94a3b8',
                                fontSize: '8pt',
                                fontWeight: 'bold',
                                color: '#1e293b',
                                boxSizing: 'border-box',
                              }}
                            >
                              <th style={{ width: '8mm', textAlign: 'center', borderRight: '1px solid #cbd5e1', padding: '0 2px' }}>
                                নং
                              </th>
                              <th style={{ width: '22mm', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 3px' }}>
                                বাকি নং
                              </th>
                              <th style={{ width: '43mm', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 3px' }}>
                                নাম
                              </th>
                              <th style={{ width: '20mm', textAlign: 'right', padding: '0 3px' }}>
                                টাকা (৳)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rightItems.map((item, idx) => {
                              const serial = startDuesSerial + half + idx + 1;
                              const nameLength = (item.customerName || '').length;
                              const itemFontPt = nameLength > 22 ? '7.5pt' : '8.2pt';

                              return (
                                <tr
                                  key={item.id}
                                  style={{
                                    height: '6mm',
                                    maxHeight: '6mm',
                                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                    borderBottom: '1px solid #e2e8f0',
                                    boxSizing: 'border-box',
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid',
                                  }}
                                >
                                  <td
                                    style={{
                                      width: '8mm',
                                      textAlign: 'center',
                                      borderRight: '1px solid #e2e8f0',
                                      fontFamily: 'monospace',
                                      fontSize: '7.5pt',
                                      color: '#64748b',
                                      padding: '0 1px',
                                      verticalAlign: 'middle',
                                      lineHeight: '1.1',
                                    }}
                                  >
                                    {toBengaliDigits(serial)}
                                  </td>
                                  <td
                                    style={{
                                      width: '22mm',
                                      textAlign: 'left',
                                      borderRight: '1px solid #e2e8f0',
                                      fontFamily: 'monospace',
                                      fontSize: '8pt',
                                      fontWeight: 'bold',
                                      color: '#0f172a',
                                      padding: '0 3px',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.1',
                                    }}
                                    title={item.dueNo}
                                  >
                                    {item.dueNo}
                                  </td>
                                  <td
                                    style={{
                                      width: '43mm',
                                      textAlign: 'left',
                                      borderRight: '1px solid #e2e8f0',
                                      fontSize: itemFontPt,
                                      fontWeight: '600',
                                      color: '#1e293b',
                                      padding: '0 3px',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: '1.1',
                                    }}
                                    title={item.customerName}
                                  >
                                    {item.customerName}
                                  </td>
                                  <td
                                    style={{
                                      width: '20mm',
                                      textAlign: 'right',
                                      fontFamily: 'monospace',
                                      fontSize: '8.2pt',
                                      fontWeight: 'bold',
                                      color: '#9f1239',
                                      padding: '0 3px',
                                      verticalAlign: 'middle',
                                      whiteSpace: 'nowrap',
                                      lineHeight: '1.1',
                                    }}
                                  >
                                    {item.amount.toLocaleString('en-US')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. HIGHLIGHTED "মোট বকেয়া" LINE AT THE END (On Last Dues Page) */}
                {isLastDuesPage && safeRouteDues.length > 0 && (
                  <div
                    style={{
                      marginTop: '3mm',
                      padding: '2mm 3.5mm',
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '8.5pt',
                      boxSizing: 'border-box',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9pt' }}>★</span>
                      <span>
                        মোট বকেয়া ({selectedRouteDisplayName} • বাকিদার: {toBengaliDigits(routeCustomerCount)} জন, বাকি: {toBengaliDigits(safeRouteDues.length)} টি)
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '10.5pt', color: '#9f1239' }}>
                      মোট বকেয়া: ৳ {routeTotalAmount.toLocaleString('en-US')}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. DUES PAGE FOOTER (~5mm) */}
              <div
                className="flex items-center justify-between text-slate-500 border-t border-slate-300 pt-0.5"
                style={{
                  height: '5mm',
                  maxHeight: '5mm',
                  fontSize: '7.5pt',
                  boxSizing: 'border-box',
                  lineHeight: '1',
                }}
              >
                <div>
                  মুদ্রণ: {generationDateTimeStr} • {settings.businessName || 'MM TRADERS'}
                </div>
                <div className="font-mono font-bold text-slate-800">
                  পাতা {toBengaliDigits(docPageNumber)}/{toBengaliDigits(totalDocumentPages)}
                </div>
              </div>
            </div>
          );
        })}
    </UniversalPrintPreviewModal>
  );
};

