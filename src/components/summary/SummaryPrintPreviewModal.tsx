import React, { useState, useMemo, useEffect } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { BusinessSettings, Product } from '../../types';
import { toBengaliDigits } from '../../utils/dateUtils';
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

/**
 * 3-Column Compact Route Dues Block Component
 * Displays dues in 3 balanced columns with mini headers: | বাকি নং (22%) | নাম (53%) | টাকা (25%) |
 */
interface ThreeColumnDuesBlockProps {
  dues: RouteDueItem[];
  selectedRouteDisplayName: string;
  totalDuesCount: number;
  totalDuesAmount: number;
  isContinuation?: boolean;
}

const ThreeColumnDuesBlock: React.FC<ThreeColumnDuesBlockProps> = ({
  dues,
  selectedRouteDisplayName,
  totalDuesCount,
  totalDuesAmount,
  isContinuation = false,
}) => {
  const rowsPerCol = Math.max(1, Math.ceil(dues.length / 3));
  const col1 = dues.slice(0, rowsPerCol);
  const col2 = dues.slice(rowsPerCol, rowsPerCol * 2);
  const col3 = dues.slice(rowsPerCol * 2, rowsPerCol * 3);
  const columns = [col1, col2, col3];

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        marginTop: '2.5mm',
      }}
    >
      {/* 1. Thin Header Bar (~5.5mm) */}
      <div
        style={{
          height: '5.5mm',
          maxHeight: '5.5mm',
          backgroundColor: '#f1f5f9',
          border: '1px solid #94a3b8',
          borderBottom: 'none',
          padding: '0 2.5mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '8pt',
          boxSizing: 'border-box',
          lineHeight: '1',
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#059669', fontSize: '9pt' }}>●</span>
          <span>
            {isContinuation ? 'রুটের বাকি (চলমান)' : 'রুটের বাকি'} — রুট: <span className="font-extrabold text-slate-950">{selectedRouteDisplayName}</span>
          </span>
        </div>
        <div style={{ fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            মোট <strong className="text-slate-950">{toBengaliDigits(totalDuesCount)}</strong> টি
          </span>
          <span className="text-slate-400">•</span>
          <span>
            মোট বকেয়া: <strong style={{ color: '#9f1239', fontFamily: 'monospace' }}>৳ {totalDuesAmount.toLocaleString('en-US')}</strong>
          </span>
        </div>
      </div>

      {/* 2. 3-Column Grid of mini tables */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          columnGap: '2.5mm',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {columns.map((colItems, cIdx) => (
          <div key={`col-${cIdx}`} style={{ width: '100%', boxSizing: 'border-box' }}>
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
                    height: '4.5mm',
                    maxHeight: '4.5mm',
                    backgroundColor: '#e2e8f0',
                    borderBottom: '1px solid #94a3b8',
                    fontSize: '7.5pt',
                    fontWeight: 'bold',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                >
                  <th style={{ width: '22%', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 2px' }}>
                    বাকি নং
                  </th>
                  <th style={{ width: '53%', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 3px' }}>
                    নাম
                  </th>
                  <th style={{ width: '25%', textAlign: 'right', padding: '0 3px' }}>
                    টাকা
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rowsPerCol }).map((_, rIdx) => {
                  const item = colItems[rIdx];
                  if (!item) {
                    return (
                      <tr
                        key={`empty-${cIdx}-${rIdx}`}
                        style={{
                          height: '5.2mm',
                          maxHeight: '5.2mm',
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                          boxSizing: 'border-box',
                        }}
                      >
                        <td style={{ borderRight: '1px solid #f1f5f9', padding: '0 2px' }}>&nbsp;</td>
                        <td style={{ borderRight: '1px solid #f1f5f9', padding: '0 3px' }}>&nbsp;</td>
                        <td style={{ padding: '0 3px' }}>&nbsp;</td>
                      </tr>
                    );
                  }

                  const nameLength = (item.customerName || '').length;
                  const fontPt = nameLength > 20 ? '7pt' : nameLength > 15 ? '7.5pt' : '8pt';

                  return (
                    <tr
                      key={item.id || `${item.dueNo}-${rIdx}`}
                      style={{
                        height: '5.2mm',
                        maxHeight: '5.2mm',
                        backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* বাকি নং: 22% */}
                      <td
                        style={{
                          width: '22%',
                          textAlign: 'left',
                          borderRight: '1px solid #e2e8f0',
                          fontFamily: 'monospace',
                          fontSize: '7.5pt',
                          fontWeight: 'bold',
                          color: '#0f172a',
                          padding: '0 2px',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.1',
                          boxSizing: 'border-box',
                        }}
                        title={item.dueNo}
                      >
                        {item.dueNo}
                      </td>

                      {/* নাম: 53% */}
                      <td
                        style={{
                          width: '53%',
                          textAlign: 'left',
                          borderRight: '1px solid #e2e8f0',
                          fontSize: fontPt,
                          fontWeight: '600',
                          color: '#1e293b',
                          padding: '0 3px',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.1',
                          boxSizing: 'border-box',
                        }}
                        title={item.customerName}
                      >
                        {item.customerName}
                      </td>

                      {/* টাকা: 25% */}
                      <td
                        style={{
                          width: '25%',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '8pt',
                          fontWeight: 'bold',
                          color: '#9f1239',
                          padding: '0 3px',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap',
                          lineHeight: '1.1',
                          boxSizing: 'border-box',
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
        ))}
      </div>
    </div>
  );
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

  const safeRouteDues = routeDues || [];
  const totalProducts = products.length;

  // -------------------------------------------------------------
  // BUDGET & LAYOUT CALCULATION (Fits on ONE A4 Page)
  // -------------------------------------------------------------
  // Total printable page height = 269mm (271mm printable area minus 2mm safety)
  const PAGE_HEIGHT_MM = 269;
  const FIXED_HEADER_MM = 13.5; // Letterhead
  const FIXED_DATELINE_MM = 12.0; // Handwritten line (তারিখ, রুট, SR/DSR, গাড়ি নং)
  const FIXED_THEAD_MM = 7.0; // Product table thead
  const FIXED_FOOTER_MM = 5.0; // Footer
  const SEPARATOR_GAP_MM = 2.5; // Gap before dues block

  // Fixed overhead without route dues
  const FIXED_OVERHEAD_BASE_MM = FIXED_HEADER_MM + FIXED_DATELINE_MM + FIXED_THEAD_MM + FIXED_FOOTER_MM; // 37.5mm

  const isRouteActive = Boolean(selectedRoute) && safeRouteDues.length > 0;
  const showDuesCombined = includeProducts && includeRouteDues && isRouteActive;

  // Max dues on Page 1: up to 12 items (4 rows per column)
  const duesP1 = useMemo(() => {
    if (!showDuesCombined) return [];
    return safeRouteDues.slice(0, 12);
  }, [showDuesCombined, safeRouteDues]);

  const duesP2 = useMemo(() => {
    if (!showDuesCombined) return [];
    return safeRouteDues.slice(12);
  }, [showDuesCombined, safeRouteDues]);

  // Dues block height on Page 1
  const rowsPerColP1 = duesP1.length > 0 ? Math.max(1, Math.ceil(duesP1.length / 3)) : 0;
  const duesBlockHeightP1 = duesP1.length > 0 ? (10.0 + rowsPerColP1 * 5.2 + SEPARATOR_GAP_MM) : 0;

  // Available height for products table rows on Page 1
  const availForProductsP1 = PAGE_HEIGHT_MM - FIXED_OVERHEAD_BASE_MM - duesBlockHeightP1;

  // Check if all products fit on Page 1 at min 7mm row height
  const canFitAllProductsP1 = totalProducts === 0 || (totalProducts * 7.0 <= availForProductsP1);

  // Dynamic row height for products on Page 1 (clamped between 7.0mm and 9.0mm)
  const p1RowHeightMm = useMemo(() => {
    if (totalProducts === 0) return 9.0;
    const raw = availForProductsP1 / totalProducts;
    return Math.min(9.0, Math.max(7.0, raw));
  }, [totalProducts, availForProductsP1]);

  // Dynamic font size scaling between 9.5pt (at 7mm) and 11pt (at 9mm)
  const p1FontPt = useMemo(() => {
    const t = Math.max(0, Math.min(1, (p1RowHeightMm - 7.0) / (9.0 - 7.0)));
    return Math.round((9.5 + t * 1.5) * 10) / 10;
  }, [p1RowHeightMm]);

  // -------------------------------------------------------------
  // MULTI-PAGE FALLBACK (Only for unusually large datasets: > 33 products)
  // -------------------------------------------------------------
  const { multiProductPages, multiRowHeightMm, multiFontPt } = useMemo(() => {
    if (canFitAllProductsP1 || !includeProducts) {
      return {
        multiProductPages: [products],
        multiRowHeightMm: p1RowHeightMm,
        multiFontPt: p1FontPt,
      };
    }

    const availSolo = PAGE_HEIGHT_MM - FIXED_OVERHEAD_BASE_MM; // ~231.5mm
    const maxItemsPerPage = Math.floor(availSolo / 7.0); // ~33 items
    const numPages = Math.ceil(totalProducts / maxItemsPerPage);
    const itemsPerPage = Math.ceil(totalProducts / numPages);

    const pages: Product[][] = [];
    for (let i = 0; i < totalProducts; i += itemsPerPage) {
      pages.push(products.slice(i, i + itemsPerPage));
    }

    const rHeight = Math.min(9.0, Math.max(7.0, availSolo / itemsPerPage));
    const t = Math.max(0, Math.min(1, (rHeight - 7.0) / (9.0 - 7.0)));
    const fPt = Math.round((9.5 + t * 1.5) * 10) / 10;

    return {
      multiProductPages: pages,
      multiRowHeightMm: rHeight,
      multiFontPt: fPt,
    };
  }, [canFitAllProductsP1, includeProducts, products, totalProducts, p1RowHeightMm, p1FontPt]);

  // Total pages determination
  const totalPages = useMemo(() => {
    if (includeProducts && includeRouteDues && isRouteActive) {
      if (canFitAllProductsP1) {
        // Fits combined on Page 1! If dues > 12, Page 2 handles overflow
        return duesP2.length > 0 ? 2 : 1;
      } else {
        // Multi-page products + dues on separate page
        return multiProductPages.length + 1;
      }
    } else if (includeProducts) {
      return multiProductPages.length;
    } else if (includeRouteDues && isRouteActive) {
      // Dues only: 3 columns fit ~100 items per page
      return Math.max(1, Math.ceil(safeRouteDues.length / 99));
    }
    return 1;
  }, [includeProducts, includeRouteDues, isRouteActive, canFitAllProductsP1, duesP2.length, multiProductPages.length, safeRouteDues.length]);

  // Subtitle for preview header
  const modalSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (includeProducts) {
      parts.push(`পণ্য তালিকা: ${toBengaliDigits(products.length)} টি`);
    }
    if (includeRouteDues && selectedRoute) {
      parts.push(`রুটের বাকি: ${toBengaliDigits(safeRouteDues.length)} টি (৳ ${routeTotalAmount.toLocaleString('en-US')})`);
    }
    parts.push(`সর্বমোট ${toBengaliDigits(totalPages)} পাতা`);
    return parts.join(' • ');
  }, [includeProducts, includeRouteDues, selectedRoute, products.length, safeRouteDues.length, routeTotalAmount, totalPages]);

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
            height: 269mm !important;
            min-height: 269mm !important;
            max-height: 269mm !important;
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
      {/* SCENARIO 1: BOTH PRODUCTS & ROUTE DUES COMBINED ON PAGE 1    */}
      {/* (Standard single page layout for 21-25 products + 2-9 dues) */}
      {/* ============================================================= */}
      {showDuesCombined && canFitAllProductsP1 && (
        <>
          {/* PAGE 1: Product Table + 3-Column Dues Block + Footer */}
          <div
            className="printable-a4-page summary-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
            style={{
              width: '190mm',
              height: '269mm',
              minHeight: '269mm',
              maxHeight: '269mm',
              padding: '0',
              margin: '0 auto',
              boxSizing: 'border-box',
              overflow: 'hidden',
              pageBreakAfter: duesP2.length > 0 ? 'always' : 'auto',
              breakAfter: duesP2.length > 0 ? 'page' : 'auto',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
            }}
          >
            {/* Top Container: Letterhead + Date Line + Product Table + Dues Block */}
            <div>
              {/* 1. Letterhead (~13.5mm) */}
              <div
                className="flex items-center justify-between border-b border-slate-300 pb-1"
                style={{ height: '13.5mm', boxSizing: 'border-box' }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center rounded bg-slate-900 text-white font-black tracking-tight"
                    style={{ width: '10.5mm', height: '10.5mm', fontSize: '7.5pt' }}
                  >
                    MM
                  </div>
                  <div>
                    <div
                      className="font-black text-slate-950 font-bengali tracking-tight"
                      style={{ fontSize: '12.5pt', lineHeight: '1.05' }}
                    >
                      {settings.businessName || 'MM TRADERS'}
                    </div>
                    <div
                      className="text-slate-600 font-medium truncate max-w-[125mm]"
                      style={{ fontSize: '7.5pt', lineHeight: '1.2' }}
                    >
                      {settings.subtitle || 'ডিস্ট্রিবিউটর'} • {settings.address || 'কুসুমহাটী বাজার, শেরপুর'} {settings.phone ? `• মোবা: ${toBengaliDigits(settings.phone)}` : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-800 font-bengali" style={{ fontSize: '7.5pt', lineHeight: '1.1' }}>
                    {settings.proprietorName ? `স্বত্বাধিকারী: ${settings.proprietorName}` : 'ডিস্ট্রিবিউশন সেলস'}
                  </div>
                  <div className="text-slate-500 font-mono" style={{ fontSize: '7pt', lineHeight: '1.1' }}>
                    লাইসেন্স: {settings.tradeLicenseNo || 'TRAD/MMT/092144'}
                  </div>
                </div>
              </div>

              {/* 2. Title & 4 Handwritten Fields (~12mm) */}
              <div
                className="border-b border-slate-300 py-1"
                style={{ height: '12mm', boxSizing: 'border-box' }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="font-black text-slate-900 font-bengali tracking-tight"
                    style={{ fontSize: '10.5pt', lineHeight: '1' }}
                  >
                    দৈনিক মাল বের করার তালিকা
                  </div>
                </div>

                {/* 4 blank fields: তারিখ | রুট | SR/DSR | গাড়ি নং */}
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
                    <span className="border-b border-slate-400 pb-0.5 inline-block flex-1 font-bold text-slate-900 text-center truncate">
                      {selectedRouteDisplayName}
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

              {/* 3. Product Table with Dynamic Row Height */}
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
                  {products.map((p, idx) => {
                    const stockDisplay = formatStockForSummary(p);
                    const hasStock = (Number(p.currentStock) || 0) > 0;
                    const salePrice = Number(p.salePrice) || 0;
                    const nameFontPt = p.name.length > 18 ? Math.max(8.5, p1FontPt - 1.2) : p1FontPt;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          height: `${p1RowHeightMm}mm`,
                          maxHeight: `${p1RowHeightMm}mm`,
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #cbd5e1',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* নং (5%) */}
                        <td
                          style={{
                            width: '5%',
                            textAlign: 'center',
                            borderRight: '1px solid #cbd5e1',
                            fontSize: `${p1FontPt}pt`,
                            fontFamily: 'monospace',
                            color: '#475569',
                            padding: '0 2px',
                            verticalAlign: 'middle',
                            lineHeight: '1.15',
                            boxSizing: 'border-box',
                          }}
                        >
                          {toBengaliDigits(idx + 1)}
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
                              height: `${Math.max(4.5, p1RowHeightMm - 2)}mm`,
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
                              height: `${Math.max(4.5, p1RowHeightMm - 2)}mm`,
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
                              height: `${Math.max(4.5, p1RowHeightMm - 2)}mm`,
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
                              height: `${Math.max(4.5, p1RowHeightMm - 2)}mm`,
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
                            fontSize: `${p1FontPt}pt`,
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
                            fontSize: `${p1FontPt}pt`,
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

              {/* 4. Compact 3-Column Route Dues Block (Placed directly under product table) */}
              {duesP1.length > 0 && (
                <ThreeColumnDuesBlock
                  dues={duesP1}
                  selectedRouteDisplayName={selectedRouteDisplayName}
                  totalDuesCount={safeRouteDues.length}
                  totalDuesAmount={routeTotalAmount}
                  isContinuation={false}
                />
              )}
            </div>

            {/* 5. Footer Line (Inside fixed-height container, pinned at bottom) */}
            <div
              className="flex items-center justify-between text-slate-500 border-t border-slate-300 pt-0.5"
              style={{
                height: '5mm',
                maxHeight: '5mm',
                fontSize: '7.5pt',
                boxSizing: 'border-box',
                lineHeight: '1',
                marginTop: 'auto',
              }}
            >
              <div>
                মুদ্রণ: {generationDateTimeStr} • {settings.businessName || 'MM TRADERS'}
              </div>
              <div className="font-mono font-bold text-slate-800">
                পাতা {toBengaliDigits(1)}/{toBengaliDigits(totalPages)}
              </div>
            </div>
          </div>

          {/* PAGE 2 (Overflow dues if route has > 12 dues) */}
          {duesP2.length > 0 && (
            <div
              className="printable-a4-page summary-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
              style={{
                width: '190mm',
                height: '269mm',
                minHeight: '269mm',
                maxHeight: '269mm',
                padding: '0',
                margin: '0 auto',
                boxSizing: 'border-box',
                overflow: 'hidden',
                pageBreakAfter: 'auto',
                breakAfter: 'auto',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
              }}
            >
              <div>
                {/* Continued Header (~11mm) */}
                <div
                  className="flex items-center justify-between border-b border-slate-300 pb-1"
                  style={{ height: '11mm', boxSizing: 'border-box' }}
                >
                  <div className="font-black text-slate-950 font-bengali" style={{ fontSize: '11pt', lineHeight: '1' }}>
                    {settings.businessName || 'MM TRADERS'} — রুটের বাকির তালিকা (চলমান) • রুট: {selectedRouteDisplayName}
                  </div>
                  <div className="text-slate-600 font-medium" style={{ fontSize: '8pt', lineHeight: '1' }}>
                    পাতা: {toBengaliDigits(2)}/{toBengaliDigits(totalPages)}
                  </div>
                </div>

                {/* 3-Column Block for overflow items */}
                <ThreeColumnDuesBlock
                  dues={duesP2}
                  selectedRouteDisplayName={selectedRouteDisplayName}
                  totalDuesCount={safeRouteDues.length}
                  totalDuesAmount={routeTotalAmount}
                  isContinuation={true}
                />

                {/* Highlighted Total Summary Line */}
                <div
                  style={{
                    marginTop: '4mm',
                    padding: '2mm 3.5mm',
                    backgroundColor: '#f0fdf4',
                    border: '1.5px solid #86efac',
                    borderRadius: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '8.5pt',
                    boxSizing: 'border-box',
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
              </div>

              {/* Page 2 Footer */}
              <div
                className="flex items-center justify-between text-slate-500 border-t border-slate-300 pt-0.5"
                style={{
                  height: '5mm',
                  maxHeight: '5mm',
                  fontSize: '7.5pt',
                  boxSizing: 'border-box',
                  lineHeight: '1',
                  marginTop: 'auto',
                }}
              >
                <div>
                  মুদ্রণ: {generationDateTimeStr} • {settings.businessName || 'MM TRADERS'}
                </div>
                <div className="font-mono font-bold text-slate-800">
                  পাতা {toBengaliDigits(2)}/{toBengaliDigits(totalPages)}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================= */}
      {/* SCENARIO 2: PRODUCTS ONLY (or no route selected / > 33 items)  */}
      {/* ============================================================= */}
      {includeProducts && (!showDuesCombined || !canFitAllProductsP1) &&
        multiProductPages.map((pageProducts, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastDocPage =
            pageIdx === multiProductPages.length - 1 &&
            (!includeRouteDues || !isRouteActive);
          const startSerial = pageIdx * Math.ceil(totalProducts / Math.max(1, multiProductPages.length));
          const pageNo = pageIdx + 1;

          return (
            <div
              key={`multi-prod-${pageIdx}`}
              className="printable-a4-page summary-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
              style={{
                width: '190mm',
                height: '269mm',
                minHeight: '269mm',
                maxHeight: '269mm',
                padding: '0',
                margin: '0 auto',
                boxSizing: 'border-box',
                overflow: 'hidden',
                pageBreakAfter: isLastDocPage ? 'auto' : 'always',
                breakAfter: isLastDocPage ? 'auto' : 'page',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
              }}
            >
              <div>
                {/* 1. Letterhead */}
                {isFirstPage ? (
                  <div
                    className="flex items-center justify-between border-b border-slate-300 pb-1"
                    style={{ height: '13.5mm', boxSizing: 'border-box' }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded bg-slate-900 text-white font-black tracking-tight"
                        style={{ width: '10.5mm', height: '10.5mm', fontSize: '7.5pt' }}
                      >
                        MM
                      </div>
                      <div>
                        <div
                          className="font-black text-slate-950 font-bengali tracking-tight"
                          style={{ fontSize: '12.5pt', lineHeight: '1.05' }}
                        >
                          {settings.businessName || 'MM TRADERS'}
                        </div>
                        <div
                          className="text-slate-600 font-medium truncate max-w-[125mm]"
                          style={{ fontSize: '7.5pt', lineHeight: '1.2' }}
                        >
                          {settings.subtitle || 'ডিস্ট্রিবিউটর'} • {settings.address || 'কুসুমহাটী বাজার, শেরপুর'} {settings.phone ? `• মোবা: ${toBengaliDigits(settings.phone)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-800 font-bengali" style={{ fontSize: '7.5pt', lineHeight: '1.1' }}>
                        {settings.proprietorName ? `স্বত্বাধিকারী: ${settings.proprietorName}` : 'ডিস্ট্রিবিউশন সেলস'}
                      </div>
                      <div className="text-slate-500 font-mono" style={{ fontSize: '7pt', lineHeight: '1.1' }}>
                        লাইসেন্স: {settings.tradeLicenseNo || 'TRAD/MMT/092144'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between border-b border-slate-300 pb-1"
                    style={{ height: '11mm', boxSizing: 'border-box' }}
                  >
                    <div className="font-black text-slate-950 font-bengali" style={{ fontSize: '11pt', lineHeight: '1' }}>
                      {settings.businessName || 'MM TRADERS'} — দৈনিক মাল বের করার তালিকা (চলমান)
                    </div>
                    <div className="text-slate-600 font-medium" style={{ fontSize: '8pt', lineHeight: '1' }}>
                      পাতা: {toBengaliDigits(pageNo)}/{toBengaliDigits(totalPages)}
                    </div>
                  </div>
                )}

                {/* 2. Handwritten Fields line */}
                <div
                  className="border-b border-slate-300 py-1"
                  style={{ height: '12mm', boxSizing: 'border-box' }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="font-black text-slate-900 font-bengali tracking-tight"
                      style={{ fontSize: '10.5pt', lineHeight: '1' }}
                    >
                      দৈনিক মাল বের করার তালিকা
                    </div>
                  </div>

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
                      <span className="border-b border-slate-400 pb-0.5 inline-block flex-1 font-bold text-slate-900 text-center truncate">
                        {selectedRoute ? selectedRouteDisplayName : '\u00A0'}
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

                {/* 3. Product Table */}
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
                      const nameFontPt = p.name.length > 18 ? Math.max(8.5, multiFontPt - 1.2) : multiFontPt;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            height: `${multiRowHeightMm}mm`,
                            maxHeight: `${multiRowHeightMm}mm`,
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                            borderBottom: '1px solid #cbd5e1',
                            boxSizing: 'border-box',
                          }}
                        >
                          <td
                            style={{
                              width: '5%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              fontSize: `${multiFontPt}pt`,
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
                                height: `${Math.max(4.5, multiRowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
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
                                height: `${Math.max(4.5, multiRowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
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
                                height: `${Math.max(4.5, multiRowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
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
                                height: `${Math.max(4.5, multiRowHeightMm - 2)}mm`,
                                width: '100%',
                                border: '1px solid #94a3b8',
                                borderRadius: '2px',
                                backgroundColor: '#ffffff',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
                          <td
                            style={{
                              width: '10%',
                              textAlign: 'center',
                              borderRight: '1px solid #cbd5e1',
                              fontSize: `${multiFontPt}pt`,
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
                          <td
                            style={{
                              width: '10%',
                              textAlign: 'right',
                              fontSize: `${multiFontPt}pt`,
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

              {/* Footer */}
              <div
                className="flex items-center justify-between text-slate-500 border-t border-slate-300 pt-0.5"
                style={{
                  height: '5mm',
                  maxHeight: '5mm',
                  fontSize: '7.5pt',
                  boxSizing: 'border-box',
                  lineHeight: '1',
                  marginTop: 'auto',
                }}
              >
                <div>
                  মুদ্রণ: {generationDateTimeStr} • {settings.businessName || 'MM TRADERS'}
                </div>
                <div className="font-mono font-bold text-slate-800">
                  পাতা {toBengaliDigits(pageNo)}/{toBengaliDigits(totalPages)}
                </div>
              </div>
            </div>
          );
        })}

      {/* ============================================================= */}
      {/* SCENARIO 3: ROUTE DUES ONLY (User unchecked "পণ্য তালিকা")    */}
      {/* ============================================================= */}
      {!includeProducts && includeRouteDues && isRouteActive && (
        <div
          className="printable-a4-page summary-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between mb-8 print:mb-0"
          style={{
            width: '190mm',
            height: '269mm',
            minHeight: '269mm',
            maxHeight: '269mm',
            padding: '0',
            margin: '0 auto',
            boxSizing: 'border-box',
            overflow: 'hidden',
            pageBreakAfter: 'auto',
            breakAfter: 'auto',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
          }}
        >
          <div>
            {/* Letterhead */}
            <div
              className="flex items-center justify-between border-b border-slate-300 pb-1"
              style={{ height: '13.5mm', boxSizing: 'border-box' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded bg-slate-900 text-white font-black tracking-tight"
                  style={{ width: '10.5mm', height: '10.5mm', fontSize: '7.5pt' }}
                >
                  MM
                </div>
                <div>
                  <div
                    className="font-black text-slate-950 font-bengali tracking-tight"
                    style={{ fontSize: '12.5pt', lineHeight: '1.05' }}
                  >
                    {settings.businessName || 'MM TRADERS'}
                  </div>
                  <div
                    className="text-slate-600 font-medium truncate max-w-[125mm]"
                    style={{ fontSize: '7.5pt', lineHeight: '1.2' }}
                  >
                    {settings.subtitle || 'ডিস্ট্রিবিউটর'} • {settings.address || 'কুসুমহাটী বাজার, শেরপুর'} {settings.phone ? `• মোবা: ${toBengaliDigits(settings.phone)}` : ''}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-slate-800 font-bengali" style={{ fontSize: '7.5pt', lineHeight: '1.1' }}>
                  {settings.proprietorName ? `স্বত্বাধিকারী: ${settings.proprietorName}` : 'ডিস্ট্রিবিউশন সেলস'}
                </div>
                <div className="text-slate-500 font-mono" style={{ fontSize: '7pt', lineHeight: '1.1' }}>
                  লাইসেন্স: {settings.tradeLicenseNo || 'TRAD/MMT/092144'}
                </div>
              </div>
            </div>

            {/* Dues only title */}
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

            {/* 3-Column Dues Block */}
            <ThreeColumnDuesBlock
              dues={safeRouteDues}
              selectedRouteDisplayName={selectedRouteDisplayName}
              totalDuesCount={safeRouteDues.length}
              totalDuesAmount={routeTotalAmount}
              isContinuation={false}
            />

            {/* Highlighted Total Summary Line */}
            <div
              style={{
                marginTop: '4mm',
                padding: '2mm 3.5mm',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '8.5pt',
                boxSizing: 'border-box',
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
          </div>

          {/* Dues only Footer */}
          <div
            className="flex items-center justify-between text-slate-500 border-t border-slate-300 pt-0.5"
            style={{
              height: '5mm',
              maxHeight: '5mm',
              fontSize: '7.5pt',
              boxSizing: 'border-box',
              lineHeight: '1',
              marginTop: 'auto',
            }}
          >
            <div>
              মুদ্রণ: {generationDateTimeStr} • {settings.businessName || 'MM TRADERS'}
            </div>
            <div className="font-mono font-bold text-slate-800">
              পাতা ১/১
            </div>
          </div>
        </div>
      )}
    </UniversalPrintPreviewModal>
  );
};
