import React, { useState, useRef } from 'react';
import {
  Printer,
  ImageDown,
  FileDown,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { BusinessSettings, DailyAccountSheet, DailyAccountItem } from '../../types';
import { DENOMINATION_LIST } from './CashDenominationTable';
import {
  downloadCanvasAsPNG,
  downloadPdfFromCanvases,
  capturePagesAsCanvases as captureSharedPages,
} from '../../services/printExportService';

interface DailySalesPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: DailyAccountSheet;
  settings: BusinessSettings;
  currency: string;
  initialAction?: 'png' | 'pdf' | null;
}

export const DailySalesPrintPreviewModal: React.FC<DailySalesPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  sheet,
  settings,
  currency,
  initialAction = null,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const printAreaRef = useRef<HTMLDivElement>(null);
  const lastTriggeredActionRef = useRef<string | null>(null);

  // Auto trigger export on open if requested
  React.useEffect(() => {
    if (isOpen && initialAction && lastTriggeredActionRef.current !== initialAction) {
      lastTriggeredActionRef.current = initialAction;
      const timer = setTimeout(() => {
        if (initialAction === 'png') {
          handleExportPNG();
        } else if (initialAction === 'pdf') {
          handleExportPDF();
        }
      }, 400);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      lastTriggeredActionRef.current = null;
    }
  }, [isOpen, initialAction]);

  if (!isOpen) return null;

  // Filter valid items
  const validItems = (sheet.items || []).filter(
    (item) => item.productName && item.productName.trim() !== ''
  );
  const validDamageItems = (sheet.damageItems || []).filter(
    (item) => item.productName && item.productName.trim() !== '' && (item.damageQty > 0 || item.grossAmount > 0)
  );

  // Bengali Date Formatter
  const formatBengaliDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);

      const months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const weekdays = [
        'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
      ];

      const toBnDigits = (num: number | string) => {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(num).replace(/\d/g, (w) => bnDigits[+w]);
      };

      return `${toBnDigits(d)} ${months[m - 1]} ${toBnDigits(y)} (${weekdays[dateObj.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  // Calculations
  const grossSales = sheet.totalGrossAmount || 0;
  const damageTotal = sheet.totalDamageValue || 0;
  const netSales = sheet.finalNetSalesAmount || Math.max(0, grossSales - damageTotal);
  const todayDueTotal = sheet.todayDue || 0;
  const expenseTotal = sheet.marketExpense || 0;
  const lessTotal = sheet.lessAmount || sheet.dailyLess || 0;
  const shortTotal = sheet.shortAmount || sheet.dailyShort || 0;

  // Cash Denominations
  const denoms = sheet.cashDenominations || {};
  const denomRows = DENOMINATION_LIST.map((denom) => {
    const count = Number(denoms[denom]) || 0;
    return {
      denom,
      count,
      subtotal: denom * count,
    };
  });
  const otherEntries = (denoms as any).otherEntries;
  const otherCash = Array.isArray(otherEntries) && otherEntries.length > 0
    ? otherEntries.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)
    : (Number(denoms.other) || 0);
  const totalCashCalculated = denomRows.reduce((sum, r) => sum + r.subtotal, 0) + otherCash;
  const actualCash = sheet.cashCollected > 0 ? sheet.cashCollected : totalCashCalculated;

  // Reconciliation: Expected Cash = Net Sales - Today's New Due - Expense - Less - Short
  const expectedCash = Math.max(0, netSales - todayDueTotal - expenseTotal - lessTotal - shortTotal);
  const diff = actualCash - expectedCash;
  const isMatch = Math.abs(diff) < 1;
  const isExcess = diff >= 1;
  const isShortage = diff <= -1;

  // Multi-page Pagination Logic:
  // If products are <= 14 and damage items <= 3, all fit in 1 single A4 page.
  // Otherwise split into Page 1 (products 0..18) and Page 2 (products 19..end + damage + notes + summary).
  const MAX_ITEMS_SINGLE_PAGE = 14;
  const MAX_ITEMS_PAGE_1_MULTI = 20;

  let pagesOfItems: DailyAccountItem[][] = [];
  if (validItems.length <= MAX_ITEMS_SINGLE_PAGE && validDamageItems.length <= 4) {
    pagesOfItems = [validItems];
  } else {
    // Page 1
    const p1 = validItems.slice(0, MAX_ITEMS_PAGE_1_MULTI);
    pagesOfItems.push(p1);
    // Remaining pages
    let remaining = validItems.slice(MAX_ITEMS_PAGE_1_MULTI);
    while (remaining.length > 0) {
      const chunkSize = 22;
      pagesOfItems.push(remaining.slice(0, chunkSize));
      remaining = remaining.slice(chunkSize);
    }
  }

  const totalPages = pagesOfItems.length;

  // Capture helper for high-resolution A4 image
  const capturePagesAsCanvases = async (): Promise<HTMLCanvasElement[]> => {
    if (!printAreaRef.current) return [];

    let pageElements = printAreaRef.current.querySelectorAll<HTMLElement>('.daily-print-a4-page');
    let attempts = 0;
    while ((!pageElements || pageElements.length === 0) && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (printAreaRef.current) {
        pageElements = printAreaRef.current.querySelectorAll<HTMLElement>('.daily-print-a4-page');
      }
      attempts++;
    }

    if (!pageElements || pageElements.length === 0) {
      return [];
    }

    return captureSharedPages(Array.from(pageElements), (current, total) => {
      setExportProgress(`পৃষ্ঠা ${current}/${total} রেন্ডার হচ্ছে...`);
    });
  };

  // 1. Export as PNG (Primary Format)
  const handleExportPNG = async () => {
    try {
      setIsExporting(true);
      setExportProgress('ঝকঝকে A4 সাইজের PNG তৈরি হচ্ছে...');

      const canvases = await capturePagesAsCanvases();
      if (canvases.length === 0) {
        alert('কোনো প্রিভিউ পৃষ্ঠা পাওয়া যায়নি। অনুগ্রহ করে প্রিভিউ লোড হওয়া পর্যন্ত অপেক্ষা করুন।');
        return;
      }

      const baseName = `Daily_Sales_${sheet.date || 'Record'}_${(sheet.routeOrVan || 'Sheet').replace(/\s+/g, '_')}`;

      if (canvases.length === 1) {
        setExportProgress('PNG ডাউনলোড হচ্ছে...');
        await downloadCanvasAsPNG(canvases[0], `${baseName}.png`);
      } else {
        // Multi-page sequential download
        for (let i = 0; i < canvases.length; i++) {
          setExportProgress(`পৃষ্ঠা ${i + 1}/${canvases.length} ডাউনলোড হচ্ছে...`);
          await downloadCanvasAsPNG(canvases[i], `${baseName}_Page_${i + 1}.png`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch (err: any) {
      console.error('PNG Export failed', err);
      alert('PNG এক্সপোর্ট করতে সমস্যা হয়েছে: ' + (err.message || 'অজানা ত্রুটি'));
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // 2. Export as PDF (Secondary Format using same crisp image-based method)
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setExportProgress('PDF এর জন্য পেজ ক্যাপচার হচ্ছে...');

      const canvases = await capturePagesAsCanvases();
      if (canvases.length === 0) {
        alert('কোনো পৃষ্ঠা পাওয়া যায়নি।');
        return;
      }

      setExportProgress('PDF ফাইল ডাউনলোড হচ্ছে...');
      const fileName = `Daily_Sales_${sheet.date}_${(sheet.routeOrVan || 'Sheet').replace(/\s+/g, '_')}.pdf`;
      downloadPdfFromCanvases(canvases, fileName);
    } catch (err: any) {
      console.error('PDF Export failed', err);
      alert('PDF তৈরিতে সমস্যা হয়েছে: ' + (err.message || 'অজানা ত্রুটি'));
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // 3. Print directly via browser dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm">
      {/* Top Action Toolbar (Hidden in @media print) */}
      <div className="no-print flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-700 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-bengali">
              দৈনিক হিসাব প্রিন্ট ও এক্সপোর্ট প্রিভিউ (A4)
            </h2>
            <p className="text-xs text-slate-300">
              তারিখ: {sheet.date} • রুট: {sheet.routeOrVan || 'সব'} • {totalPages} পৃষ্ঠা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition-colors cursor-pointer"
            title="ব্রাউজার প্রিন্টার দিয়ে সরাসরি প্রিন্ট করুন"
          >
            <Printer className="h-4 w-4 text-sky-400" />
            <span>প্রিন্ট করুন</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            title="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-800/60 flex justify-center">
        <div
          ref={printAreaRef}
          id="daily-sales-print-area"
          className="space-y-8 print:space-y-0"
          style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif" }}
        >
          {pagesOfItems.map((pageItems, pageIndex) => {
            const isFirstPage = pageIndex === 0;
            const isLastPage = pageIndex === totalPages - 1;

            return (
              <div
                key={pageIndex}
                className="daily-print-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden"
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
                  {/* Top Letterhead (On First Page) */}
                  {isFirstPage ? (
                    <div className="border-b-2 border-slate-900 pb-2 mb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 font-bengali">
                            {settings.businessName || 'MM TRADERS'}
                          </h1>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {settings.subtitle || 'ডিস্ট্রিবিউটর ও পাইকারি বিক্রেতা'}
                          </p>
                          {settings.proprietorName && (
                            <p className="text-[11px] font-semibold text-slate-600">
                              স্বত্বাধিকারী: {settings.proprietorName}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            ঠিকানা: {settings.address} {settings.phone ? `• মোবাইল: ${settings.phone}` : ''}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded">
                            দৈনিক বিক্রয় ও হিসাব খতিয়ান
                          </span>
                          <p className="text-[10px] font-mono text-slate-500 mt-1">
                            আইডি: {sheet.sheetNo || sheet.id}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-600">
                            অবস্থা: {sheet.status === 'completed' ? 'চূড়ান্ত হিসাব (সন্ধ্যা)' : 'চলমান বিতরণ (সকাল)'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Continued Page Header */
                    <div className="border-b border-slate-300 pb-1.5 mb-3 flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="font-bold text-slate-900">
                        {settings.businessName} — দৈনিক বিক্রয় খতিয়ান (চলমান)
                      </span>
                      <span>
                        তারিখ: {formatBengaliDate(sheet.date)} • রুট: {sheet.routeOrVan}
                      </span>
                    </div>
                  )}

                  {/* Metadata Row (On First Page) */}
                  {isFirstPage && (
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-md p-2 mb-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">তারিখ:</span>
                        <span className="font-bold text-slate-900">{formatBengaliDate(sheet.date)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">রুট / ডেলিভারি ভ্যান:</span>
                        <span className="font-bold text-slate-900">{sheet.routeOrVan || 'নির্ধারিত নয়'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">বিক্রয় প্রতিনিধি (SR):</span>
                        <span className="font-bold text-slate-900">{sheet.srName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">ডেলিভারি প্রতিনিধি (DSR):</span>
                        <span className="font-bold text-slate-900">{sheet.dsrName || '—'}</span>
                      </div>
                    </div>
                  )}

                  {/* 1. PRODUCT SALES TABLE */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        ১. দৈনিক পণ্য বিক্রয় হিসাব {totalPages > 1 ? `(পৃষ্ঠা ${pageIndex + 1})` : ''}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        দর ও পরিমাণ (কার্টন / পিস)
                      </span>
                    </div>

                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 border-y border-slate-300 text-slate-800 font-bold">
                          <th className="py-1 px-1.5 text-center w-7 border-r border-slate-200">#</th>
                          <th className="py-1 px-2 text-left border-r border-slate-200">পণ্যের নাম ও বিবরণ</th>
                          <th className="py-1 px-2 text-center w-16 border-r border-slate-200">দর ({currency})</th>
                          <th className="py-1 px-2 text-center w-24 border-r border-slate-200">দেওয়া মাল</th>
                          <th className="py-1 px-2 text-center w-24 border-r border-slate-200">ফেরত মাল</th>
                          <th className="py-1 px-2 text-center w-16 border-r border-slate-200">বিক্রি পিস</th>
                          <th className="py-1 px-2 text-right w-24">মোট টাকা ({currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 font-bengali text-xs border-b border-slate-200">
                              কোনো পণ্যের এন্ট্রি যুক্ত করা হয়নি (খালি খতিয়ান পাতা)
                            </td>
                          </tr>
                        )}
                        {pageItems.map((item, idx) => {
                          const globalIdx = (pageIndex === 0 ? 0 : MAX_ITEMS_PAGE_1_MULTI) + idx + 1;
                          const rawIssued = item.rawIssuedQty ?? item.issuedQty ?? 0;
                          const rawRet = item.rawReturnQty ?? item.returnQty ?? 0;
                          const issuedUnit = item.issuedUnit || 'P';
                          const returnUnit = item.returnUnit || 'P';

                          return (
                            <tr
                              key={item.id || idx}
                              className={`border-b border-slate-200 ${
                                idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                              }`}
                            >
                              <td className="py-1 px-1.5 text-center font-mono text-slate-500 border-r border-slate-200">
                                {globalIdx}
                              </td>
                              <td className="py-1 px-2 border-r border-slate-200">
                                <span className="font-bold text-slate-900">{item.productName}</span>
                                {item.packSize && (
                                  <span className="text-[10px] text-slate-500 ml-1">
                                    ({item.packSize})
                                  </span>
                                )}
                              </td>
                              <td className="py-1 px-2 text-center font-mono font-semibold border-r border-slate-200">
                                {item.sellingPrice}
                              </td>
                              <td className="py-1 px-2 text-center font-mono border-r border-slate-200">
                                {rawIssued} {issuedUnit === 'C' ? 'কা.' : 'পিস'}
                              </td>
                              <td className="py-1 px-2 text-center font-mono border-r border-slate-200 text-amber-900">
                                {rawRet} {returnUnit === 'C' ? 'কা.' : 'পিস'}
                              </td>
                              <td className="py-1 px-2 text-center font-mono font-bold text-emerald-800 border-r border-slate-200">
                                {item.netSoldQty} {issuedUnit === 'C' ? 'কা.' : 'পিস'}
                              </td>
                              <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">
                                {Number(item.grossAmount || 0).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}

                        {/* If last page, show product table total */}
                        {isLastPage && (
                          <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
                            <td colSpan={3} className="py-1.5 px-2 text-right border-r border-slate-200">
                              মোট মূল বিক্রয় (Gross Sales):
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200">
                              {sheet.totalIssuedQty} পিস
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200 text-amber-900">
                              {sheet.totalReturnQty} পিস
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-emerald-800 border-r border-slate-200">
                              {sheet.totalNetSoldQty} পিস
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono text-emerald-900 text-xs">
                              {currency} {grossSales.toLocaleString()}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. DAMAGE TABLE (If on last page and damage items exist) */}
                  {isLastPage && validDamageItems.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          ২. ফেরত / ড্যামেজ পণ্যের হিসাব
                        </span>
                        <span className="text-[11px] font-mono font-bold text-rose-800">
                          মোট ড্যামেজ: {currency} {damageTotal.toLocaleString()}
                        </span>
                      </div>

                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-rose-50 border-y border-rose-200 text-rose-950 font-bold">
                            <th className="py-1 px-1.5 text-center w-7 border-r border-rose-200">#</th>
                            <th className="py-1 px-2 text-left border-r border-rose-200">পণ্যের নাম</th>
                            <th className="py-1 px-2 text-center w-16 border-r border-rose-200">দর ({currency})</th>
                            <th className="py-1 px-2 text-center w-24 border-r border-rose-200">পরিমাণ</th>
                            <th className="py-1 px-2 text-center w-20 border-r border-rose-200">মোট পিস</th>
                            <th className="py-1 px-2 text-right w-24">মোট টাকা ({currency})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validDamageItems.map((dItem, dIdx) => {
                            const rawDamage = dItem.rawDamageQty ?? dItem.damageQty ?? 0;
                            const dUnit = dItem.damageUnit || 'P';
                            return (
                              <tr
                                key={dItem.id || dIdx}
                                className={`border-b border-rose-100 ${
                                  dIdx % 2 === 1 ? 'bg-rose-50/30' : 'bg-white'
                                }`}
                              >
                                <td className="py-1 px-1.5 text-center font-mono text-slate-500 border-r border-rose-100">
                                  {dIdx + 1}
                                </td>
                                <td className="py-1 px-2 font-bold text-slate-900 border-r border-rose-100">
                                  {dItem.productName}
                                </td>
                                <td className="py-1 px-2 text-center font-mono border-r border-rose-100">
                                  {dItem.sellingPrice}
                                </td>
                                <td className="py-1 px-2 text-center font-mono border-r border-rose-100">
                                  {rawDamage} {dUnit === 'C' ? 'কা.' : 'পিস'}
                                </td>
                                <td className="py-1 px-2 text-center font-mono font-bold text-rose-800 border-r border-rose-100">
                                  {dItem.rawDamageQty !== undefined ? dItem.rawDamageQty : dItem.damageQty} {dUnit === 'C' ? 'কা.' : 'পিস'}
                                </td>
                                <td className="py-1 px-2 text-right font-mono font-bold text-rose-800">
                                  {Number(dItem.grossAmount || dItem.damageValue || 0).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-rose-50 font-bold border-t border-rose-300 text-rose-950">
                            <td colSpan={4} className="py-1 px-2 text-right border-r border-rose-200">
                              মোট ড্যামেজ:
                            </td>
                            <td className="py-1 px-2 text-center font-mono border-r border-rose-200">
                              {sheet.totalDamageQty} পিস
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-rose-900">
                              {currency} {damageTotal.toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 3. DUES & COLLECTIONS (If any) on Last Page */}
                  {isLastPage && (todayDueTotal > 0 || (sheet.dueCollection || 0) > 0) && (
                    <div className="grid grid-cols-2 gap-2 mb-2.5 text-xs">
                      <div className="border border-amber-200 bg-amber-50/50 p-1.5 rounded flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900">আজকের নতুন বাকি (Due):</span>
                        <span className="font-mono font-black text-amber-900">{currency} {todayDueTotal.toLocaleString()}</span>
                      </div>
                      <div className="border border-emerald-200 bg-emerald-50/50 p-1.5 rounded flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900">আজকের বকেয়া আদায় (Collection):</span>
                        <span className="font-mono font-black text-emerald-900">{currency} {(sheet.dueCollection || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* 4. SALES SUMMARY (3 Cards) on Last Page */}
                  {isLastPage && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="border border-slate-300 bg-slate-50 p-2 rounded text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          ১. মূল বিক্রি (Gross)
                        </span>
                        <span className="text-sm font-mono font-black text-slate-900">
                          {currency} {grossSales.toLocaleString()}
                        </span>
                      </div>
                      <div className="border border-rose-200 bg-rose-50/60 p-2 rounded text-center">
                        <span className="text-[10px] text-rose-700 font-bold uppercase block">
                          ২. মোট ড্যামেজ (Damage)
                        </span>
                        <span className="text-sm font-mono font-black text-rose-800">
                          - {currency} {damageTotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="border border-emerald-300 bg-emerald-50 p-2 rounded text-center">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                          ৩. চূড়ান্ত প্রকৃত বিক্রি (Net)
                        </span>
                        <span className="text-sm font-mono font-black text-emerald-800">
                          {currency} {netSales.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4 & 5. TWO-COLUMN: নোট হিসাব (Left) & ক্যাশ ও রিকনসিলিয়েশন (Right) on Last Page */}
                  {isLastPage && (
                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      {/* Left: নোট হিসাব (Cash Denominations) */}
                      <div className="border border-slate-300 rounded p-2 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 font-bold text-slate-900">
                          <span>নোট হিসাব (Denomination)</span>
                          <span className="font-mono text-emerald-800">
                            মোট: {currency} {actualCash.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] font-mono">
                          {denomRows.map((r) => (
                            <div key={r.denom} className="flex justify-between border-b border-slate-100 py-0.5">
                              <span className="text-slate-600">{r.denom} × {r.count}</span>
                              <span className="font-bold text-slate-900">{r.subtotal.toLocaleString()}</span>
                            </div>
                          ))}
                          {Array.isArray(otherEntries) && otherEntries.length > 0 ? (
                            otherEntries.map((e: any, idx: number) => {
                              const amt = Number(e.amount) || 0;
                              if (amt <= 0 && otherEntries.length > 1) return null;
                              return (
                                <div key={e.id || idx} className="flex justify-between border-b border-slate-100 py-0.5 col-span-2">
                                  <span className="text-slate-600">{e.label || `অন্যান্য ${idx + 1}`}:</span>
                                  <span className="font-bold text-slate-900">{amt.toLocaleString()}</span>
                                </div>
                              );
                            })
                          ) : otherCash > 0 ? (
                            <div className="flex justify-between border-b border-slate-100 py-0.5 col-span-2">
                              <span className="text-slate-600">খুচরা / অন্যান্য:</span>
                              <span className="font-bold text-slate-900">{otherCash.toLocaleString()}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Right: ক্যাশ রিকনসিলিয়েশন হিসাব */}
                      <div className="border border-slate-300 rounded p-2 bg-white flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5 font-bold text-slate-900">
                            <span>ক্যাশ ও খরচ সমন্বয় (Reconciliation)</span>
                            {isMatch ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> মিলেছে
                              </span>
                            ) : isExcess ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                <AlertCircle className="h-3 w-3 text-blue-600" /> +{currency} {diff.toLocaleString()} বেশি
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                <XCircle className="h-3 w-3 text-rose-600" /> -{currency} {Math.abs(diff).toLocaleString()} ঘাটতি
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-600">১. প্রকৃত বিক্রি (Net Sales):</span>
                              <span className="font-mono font-bold text-slate-900">{currency} {netSales.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-amber-900">
                              <span>২. বাদ: আজকের বাকি (New Due):</span>
                              <span className="font-mono font-bold">- {currency} {todayDueTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-rose-800">
                              <span>৩. বাদ: দৈনিক খরচ (Expense):</span>
                              <span className="font-mono font-bold">- {currency} {expenseTotal.toLocaleString()}</span>
                            </div>
                            {lessTotal > 0 && (
                              <div className="flex justify-between text-amber-800">
                                <span>৪. বাদ: লেস হিসাব (Less):</span>
                                <span className="font-mono font-bold">- {currency} {lessTotal.toLocaleString()}</span>
                              </div>
                            )}
                            {shortTotal > 0 && (
                              <div className="flex justify-between text-orange-800">
                                <span>৫. বাদ: শর্ট (Short{sheet.dsrName ? ` - ${sheet.dsrName}` : ''}):</span>
                                <span className="font-mono font-bold">- {currency} {shortTotal.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-800">
                              <span>হিসাবকৃত প্রত্যাশিত ক্যাশ:</span>
                              <span className="font-mono">{currency} {expectedCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                              <span>প্রকৃত জমা ক্যাশ (নোট হিসাব):</span>
                              <span className="font-mono">{currency} {actualCash.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. SIGNATURES (On Last Page) */}
                  {isLastPage && (
                    <div className="pt-6 mt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-1">
                          <p className="font-bold text-slate-800">বিক্রয় প্রতিনিধি (SR)</p>
                          <p className="text-[10px] text-slate-500">{sheet.srName || 'স্বাক্ষর'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-1">
                          <p className="font-bold text-slate-800">ক্যাশিয়ার / ডিএসআর</p>
                          <p className="text-[10px] text-slate-500">{sheet.dsrName || 'স্বাক্ষর'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-1">
                          <p className="font-bold text-slate-800">মালিক / হিসাবরক্ষক</p>
                          <p className="text-[10px] text-slate-500">{settings.proprietorName || 'অনুমোদিত স্বাক্ষর'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Page Footer */}
                <div className="border-t border-slate-200 pt-1 text-[10px] text-slate-400 flex items-center justify-between mt-2">
                  <span>
                    {settings.businessName} • সফটওয়্যার প্রস্তুতকৃত রিপোর্ট
                  </span>
                  <span>
                    পৃষ্ঠা {pageIndex + 1} / {totalPages}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
