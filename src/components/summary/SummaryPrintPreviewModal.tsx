import React, { useMemo } from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
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
  // Available table height on a 281mm printable page (281mm - ~41mm fixed header/footer blocks = 240mm)
  const AVAILABLE_TABLE_HEIGHT_MM = 240;
  const MIN_ROW_HEIGHT_MM = 7;
  const MAX_ROW_HEIGHT_MM = 9;

  // Maximum items that can fit on a single page at the 7mm minimum
  const MAX_ITEMS_PER_PAGE = Math.floor(AVAILABLE_TABLE_HEIGHT_MM / MIN_ROW_HEIGHT_MM); // 34 items

  const totalProducts = products.length;

  // Pagination & Row Height calculation
  const { pages, rowHeightMm, fontPt } = useMemo(() => {
    if (totalProducts === 0) {
      return {
        pages: [[]],
        rowHeightMm: MAX_ROW_HEIGHT_MM,
        fontPt: 11,
      };
    }

    let calculatedPages: Product[][] = [];
    let heightMm: number;

    if (totalProducts <= MAX_ITEMS_PER_PAGE) {
      // Fits on ONE single page!
      calculatedPages = [products];
      // rowHeight = min(9mm, availableTableHeight / numberOfRows), never below 7mm
      heightMm = Math.min(MAX_ROW_HEIGHT_MM, Math.max(MIN_ROW_HEIGHT_MM, AVAILABLE_TABLE_HEIGHT_MM / totalProducts));
    } else {
      // List is longer than 34 items -> Split across pages
      const totalPages = Math.ceil(totalProducts / MAX_ITEMS_PER_PAGE);
      const itemsPerPage = Math.ceil(totalProducts / totalPages);

      calculatedPages = [];
      for (let i = 0; i < totalProducts; i += itemsPerPage) {
        calculatedPages.push(products.slice(i, i + itemsPerPage));
      }

      // Calculate row height based on items per page
      heightMm = Math.min(MAX_ROW_HEIGHT_MM, Math.max(MIN_ROW_HEIGHT_MM, AVAILABLE_TABLE_HEIGHT_MM / itemsPerPage));
    }

    // Font size scales smoothly from 9.5pt at 7mm to 11pt at 9mm
    const t = Math.max(0, Math.min(1, (heightMm - MIN_ROW_HEIGHT_MM) / (MAX_ROW_HEIGHT_MM - MIN_ROW_HEIGHT_MM)));
    const calculatedFontPt = Math.round((9.5 + t * (11 - 9.5)) * 10) / 10;

    return {
      pages: calculatedPages,
      rowHeightMm: heightMm,
      fontPt: calculatedFontPt,
    };
  }, [totalProducts, products]);

  const totalPages = pages.length;

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="দৈনিক মাল বের করার তালিকা প্রিন্ট প্রিভিউ (A4)"
      subtitle={`মোট পণ্য: ${toBengaliDigits(products.length)} টি ${onlyInStock ? '(শুধু স্টক বিদ্যমান)' : ''} • ${toBengaliDigits(totalPages)} পাতা • সারি উচ্চতা: ${rowHeightMm.toFixed(1)}mm`}
      fileNamePrefix={`MM_Traders_Daily_Summary_${todayDateStr}`}
      initialAction={initialAction}
    >
      {/* Injected style tag enforcing exact 8mm page margin and 194mm x 281mm printable box */}
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
          .printable-a4-page.summary-a4-page {
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
          }
          .printable-a4-page.summary-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {pages.map((pageProducts, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;
        const startSerial = pageIndex * Math.ceil(totalProducts / totalPages);

        return (
          <div
            key={pageIndex}
            className="printable-a4-page summary-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between"
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
            {/* Top Fixed Blocks + Table */}
            <div>
              {/* 1. COMPACT LETTERHEAD (Total height ~14mm) */}
              {isFirstPage ? (
                <div
                  className="flex items-center justify-between border-b border-slate-300 pb-1"
                  style={{ height: '14mm', boxSizing: 'border-box' }}
                >
                  <div className="flex items-center gap-2">
                    {/* Small Logo about 11mm */}
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
                    তারিখ: <strong>{formatDate(todayDateStr)}</strong> • পাতা: {toBengaliDigits(pageIndex + 1)}/{toBengaliDigits(totalPages)}
                  </div>
                </div>
              )}

              {/* 2. TITLE & SR/ROUTE SUB-BLOCK (Total height ~12mm) */}
              <div
                className="border-b border-slate-300 py-1"
                style={{ height: '12mm', boxSizing: 'border-box' }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="font-black text-slate-900 font-bengali"
                    style={{ fontSize: '11pt', lineHeight: '1' }}
                  >
                    দৈনিক মাল বের করার তালিকা
                  </div>
                  <div className="text-slate-700 font-medium" style={{ fontSize: '8pt', lineHeight: '1' }}>
                    তারিখ: <strong className="font-mono">{formatDate(todayDateStr)}</strong>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between text-slate-800 mt-1"
                  style={{ fontSize: '8pt', lineHeight: '1' }}
                >
                  <div>
                    <span className="font-bold">রুট:</span>{' '}
                    <span className="font-mono text-slate-400">............................................</span>
                  </div>
                  <div>
                    <span className="font-bold">SR / DSR:</span>{' '}
                    <span className="font-mono text-slate-400">............................................</span>
                  </div>
                  <div>
                    <span className="font-bold">গাড়ি নং:</span>{' '}
                    <span className="font-mono text-slate-400">........................</span>
                  </div>
                </div>
              </div>

              {/* 3. TABLE: table-layout fixed, explicit widths, exactly 7mm header, exact calculated rowHeight */}
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
                    <th style={{ width: '8%', textAlign: 'center', borderRight: '1px solid #cbd5e1', padding: '0 2px' }}>
                      নং
                    </th>
                    <th style={{ width: '44%', textAlign: 'left', borderRight: '1px solid #cbd5e1', padding: '0 6px' }}>
                      প্রোডাক্টের নাম
                    </th>
                    <th
                      style={{
                        width: '20%',
                        textAlign: 'center',
                        borderRight: '1px solid #cbd5e1',
                        padding: '0 4px',
                        backgroundColor: '#fef3c7',
                      }}
                    >
                      মোট <span style={{ fontSize: '7pt', fontWeight: 'normal' }}>(হাতে লেখার ঘর)</span>
                    </th>
                    <th style={{ width: '15%', textAlign: 'center', borderRight: '1px solid #cbd5e1', padding: '0 4px' }}>
                      স্টক
                    </th>
                    <th style={{ width: '13%', textAlign: 'right', padding: '0 6px' }}>
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

                    // Dynamically scale down font if product name is long to prevent two lines
                    const nameFontPt = p.name.length > 26 ? Math.max(8, fontPt - 1.5) : fontPt;

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
                        {/* নং (8%) */}
                        <td
                          style={{
                            width: '8%',
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

                        {/* প্রোডাক্টের নাম (44%) - no wrapping */}
                        <td
                          style={{
                            width: '44%',
                            textAlign: 'left',
                            borderRight: '1px solid #cbd5e1',
                            fontSize: `${nameFontPt}pt`,
                            fontWeight: 'bold',
                            color: '#0f172a',
                            padding: '0 6px',
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

                        {/* মোট (20%) - wide, clearly bordered empty white box for handwriting */}
                        <td
                          style={{
                            width: '20%',
                            textAlign: 'center',
                            borderRight: '1px solid #cbd5e1',
                            padding: '0 3px',
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

                        {/* স্টক (15%) */}
                        <td
                          style={{
                            width: '15%',
                            textAlign: 'center',
                            borderRight: '1px solid #cbd5e1',
                            fontSize: `${fontPt}pt`,
                            fontWeight: hasStock ? 'bold' : 'normal',
                            color: hasStock ? '#065f46' : '#64748b',
                            padding: '0 3px',
                            verticalAlign: 'middle',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.15',
                            boxSizing: 'border-box',
                          }}
                        >
                          {stockDisplay}
                        </td>

                        {/* দর (কার্টুন) (13%) */}
                        <td
                          style={{
                            width: '13%',
                            textAlign: 'right',
                            fontSize: `${fontPt}pt`,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            color: '#0f172a',
                            padding: '0 6px',
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

            {/* 4. FOOTER (Total height ~5mm) */}
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
                পাতা {toBengaliDigits(pageIndex + 1)}/{toBengaliDigits(totalPages)}
              </div>
            </div>
          </div>
        );
      })}
    </UniversalPrintPreviewModal>
  );
};
