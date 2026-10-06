import React, { useState, useRef, useMemo } from 'react';
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
  Calendar,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useApp } from '../../context/AppContext';
import { BusinessSettings, DailyAccountSheet, DailyAccountItem } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
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
  const { db } = useApp();
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

  // Customer-wise due entries resolution (for live sheet and historical records)
  const validTodayDues = useMemo(() => {
    let entries = (sheet.todayDueEntries || []).filter(
      (e) => (e.customerName || e.shopName || e.description || '').trim() !== '' || Number(e.amount) > 0
    );

    // If empty but sheet has todayDue, fall back to customerLedgers for this date
    if (entries.length === 0 && (sheet.todayDue || 0) > 0) {
      const matchedLedgers = (db.customerLedgers || []).filter(
        (l) => l.date === sheet.date && l.debit > 0
      );
      if (matchedLedgers.length > 0) {
        entries = matchedLedgers.map((l) => {
          const cust = (db.customers || []).find((c) => c.id === l.customerId);
          return {
            id: l.id,
            customerId: l.customerId,
            customerName: cust?.name,
            shopName: cust?.shopName,
            description: cust?.shopName || cust?.name || l.description,
            amount: l.debit,
          };
        });
      }
    } else {
      // Ensure customerName & shopName are resolved if only id or description was saved
      entries = entries.map((e) => {
        let custName = e.customerName;
        let sName = e.shopName;
        if (!custName || !sName) {
          const matched = (db.customers || []).find(
            (c) =>
              c.id === e.customerId ||
              (e.description &&
                (c.shopName.trim().toLowerCase() === e.description.trim().toLowerCase() ||
                  c.name.trim().toLowerCase() === e.description.trim().toLowerCase()))
          );
          if (matched) {
            custName = custName || matched.name;
            sName = sName || matched.shopName;
          }
        }
        return {
          ...e,
          customerName: custName,
          shopName: sName,
        };
      });
    }
    return entries;
  }, [sheet.todayDueEntries, sheet.todayDue, sheet.date, db.customerLedgers, db.customers]);

  const validDueCollections = useMemo(() => {
    let entries = (sheet.dueCollectionEntries || []).filter(
      (e) => (e.customerName || e.shopName || e.description || '').trim() !== '' || Number(e.amount) > 0
    );

    // If empty but sheet has dueCollection, fall back to payments for this date
    if (entries.length === 0 && (sheet.dueCollection || 0) > 0) {
      const matchedPayments = (db.payments || []).filter(
        (p) => p.date === sheet.date && p.amount > 0
      );
      if (matchedPayments.length > 0) {
        entries = matchedPayments.map((p) => ({
          id: p.id,
          customerId: p.customerId,
          customerName: p.customerName,
          shopName: p.shopName,
          description: p.shopName || p.customerName,
          amount: p.amount,
        }));
      }
    } else {
      // Ensure customerName & shopName are resolved if only id or description was saved
      entries = entries.map((e) => {
        let custName = e.customerName;
        let sName = e.shopName;
        if (!custName || !sName) {
          const matched = (db.customers || []).find(
            (c) =>
              c.id === e.customerId ||
              (e.description &&
                (c.shopName.trim().toLowerCase() === e.description.trim().toLowerCase() ||
                  c.name.trim().toLowerCase() === e.description.trim().toLowerCase()))
          );
          if (matched) {
            custName = custName || matched.name;
            sName = sName || matched.shopName;
          }
        }
        return {
          ...e,
          customerName: custName,
          shopName: sName,
        };
      });
    }
    return entries;
  }, [sheet.dueCollectionEntries, sheet.dueCollection, sheet.date, db.payments, db.customers]);

  // Helper to format customer / shop name clearly
  const formatCustomerShopName = (entry: {
    customerName?: string;
    shopName?: string;
    description?: string;
  }) => {
    const shop = (entry.shopName || '').trim();
    const cust = (entry.customerName || '').trim();
    const desc = (entry.description || '').trim();

    if (shop && cust && shop.toLowerCase() !== cust.toLowerCase()) {
      return `${shop} (${cust})`;
    }
    return shop || cust || desc || 'কাস্টমার';
  };

  // Filter valid items
  const validItems = (sheet.items || []).filter(
    (item) => item.productName && item.productName.trim() !== ''
  );
  const validDamageItems = (sheet.damageItems || []).filter(
    (item) => item.productName && item.productName.trim() !== '' && (item.damageQty > 0 || item.grossAmount > 0)
  );

  // Bengali Digit Converter
  const toBnDigits = (num: number | string) => {
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, (w) => bnDigits[+w]);
  };

  // Safe numeric extraction and currency formatting (guards against NaN, undefined, empty, or Infinity values)
  const safeNumber = (val: any): number => {
    if (val === null || val === undefined || val === '') return 0;
    const n = Number(val);
    return isNaN(n) || !isFinite(n) ? 0 : n;
  };

  const formatMoney = (val: any): string => {
    const n = safeNumber(val);
    const curr = currency || '৳';
    return `${curr} ${n.toLocaleString()}`;
  };

  const formatAmount = (val: any): string => {
    const n = safeNumber(val);
    return n.toLocaleString();
  };

  // Bengali Date Formatter
  const formatBengaliDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      let y = NaN, m = NaN, d = NaN;
      const clean = String(dateStr).split('T')[0].trim();
      if (clean.includes('-')) {
        const parts = clean.split('-');
        if (parts.length === 3) {
          y = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        }
      } else if (clean.includes('/')) {
        const parts = clean.split('/');
        if (parts.length === 3) {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
          y = parseInt(parts[2], 10);
        }
      } else {
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          y = dateObj.getFullYear();
          m = dateObj.getMonth() + 1;
          d = dateObj.getDate();
        }
      }

      if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
      const dateObj = new Date(y, m - 1, d);

      const months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const weekdays = [
        'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'
      ];

      return `${toBnDigits(d)} ${months[m - 1] || ''} ${toBnDigits(y)} (${weekdays[dateObj.getDay()] || ''})`;
    } catch {
      return dateStr;
    }
  };

  // Month-to-Date Calculations for the previewed record's month (1st of month up to sheet.date)
  const monthToDateTotals = useMemo(() => {
    if (!sheet.date) {
      return { totalSales: 0, totalDue: 0, totalDamage: 0, totalExpense: 0, monthName: '', dayBn: '' };
    }

    let y = NaN, m = NaN, d = NaN;
    const cleanDate = String(sheet.date).split('T')[0].trim();
    if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      }
    } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        d = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
      }
    } else {
      const dt = new Date(sheet.date);
      if (!isNaN(dt.getTime())) {
        y = dt.getFullYear();
        m = dt.getMonth() + 1;
        d = dt.getDate();
      }
    }

    const targetMonthPrefix = !isNaN(y) && !isNaN(m) ? `${y}-${String(m).padStart(2, '0')}` : '';
    const targetDate = cleanDate;

    // Combine db.dailySheets with the currently previewed sheet to ensure live values
    const existingSheets = db.dailySheets || [];
    const sheetIndex = existingSheets.findIndex((s) => s.id === sheet.id);
    let allSheets: DailyAccountSheet[];
    if (sheetIndex >= 0) {
      allSheets = [...existingSheets];
      allSheets[sheetIndex] = sheet;
    } else {
      const sameComboIndex = existingSheets.findIndex(
        (s) =>
          s.date === sheet.date &&
          s.routeOrVan?.trim() === sheet.routeOrVan?.trim() &&
          s.srName?.trim() === sheet.srName?.trim()
      );
      if (sameComboIndex >= 0) {
        allSheets = [...existingSheets];
        allSheets[sameComboIndex] = sheet;
      } else {
        allSheets = [...existingSheets, sheet];
      }
    }

    // Filter sheets from 1st of the month up to sheet.date
    const mtdSheets = allSheets.filter(
      (s) => s.date && (targetMonthPrefix ? s.date.startsWith(targetMonthPrefix) : true) && s.date <= targetDate
    );

    const coveredDates = new Set<string>();

    let totalSales = 0;
    let totalDue = 0;
    let totalDueCollection = 0;
    let totalDamage = 0;
    let totalExpense = 0;

    mtdSheets.forEach((s) => {
      coveredDates.add(s.date);
      // Net Sales (or Gross - Damage)
      const sGross = safeNumber(s.totalGrossAmount);
      const sDamage = safeNumber(s.totalDamageValue);
      const salesAmt =
        s.finalNetSalesAmount !== undefined && !isNaN(Number(s.finalNetSalesAmount)) && Number(s.finalNetSalesAmount) > 0
          ? safeNumber(s.finalNetSalesAmount)
          : Math.max(0, sGross - sDamage);
      totalSales += salesAmt;

      // Today's New Due
      totalDue += safeNumber(s.todayDue);

      // Today's Due Collection (বাকি জমা / উত্তোলন)
      totalDueCollection += safeNumber(s.dueCollection);

      // Damage
      totalDamage += sDamage;

      // Expense
      totalExpense += safeNumber(s.marketExpense);
    });

    // Also include legacy direct sales if any (for dates not in daily sheets)
    (db.sales || []).forEach((s) => {
      if (
        s.date &&
        (targetMonthPrefix ? s.date.startsWith(targetMonthPrefix) : true) &&
        s.date <= targetDate &&
        s.status === 'completed' &&
        !coveredDates.has(s.date)
      ) {
        totalSales += safeNumber(s.netSales);
      }
    });

    // Also include standalone collections/payments from db.payments not covered in daily sheets
    (db.payments || []).forEach((p) => {
      if (
        p.date &&
        (targetMonthPrefix ? p.date.startsWith(targetMonthPrefix) : true) &&
        p.date <= targetDate &&
        p.status === 'completed' &&
        !coveredDates.has(p.date)
      ) {
        totalDueCollection += safeNumber(p.amount);
      }
    });

    // Also include standalone expenses (if not from daily sheet)
    (db.expenses || []).forEach((exp) => {
      if (
        exp.date &&
        (targetMonthPrefix ? exp.date.startsWith(targetMonthPrefix) : true) &&
        exp.date <= targetDate &&
        (exp as any).status !== 'void'
      ) {
        const isFromDailySheet =
          Boolean(exp.sheetId) ||
          (exp as any).source === 'daily_sheet' ||
          exp.category === 'মার্কেট খরচ (Daily Sheet)';
        if (!isFromDailySheet) {
          totalExpense += safeNumber(exp.amount);
        }
      }
    });

    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const monthName = !isNaN(m) && m >= 1 && m <= 12 ? months[m - 1] : '';
    const dayBn = !isNaN(d) && d >= 1 && d <= 31 ? toBnDigits(d) : '';

    return {
      totalSales: safeNumber(totalSales),
      totalDue: safeNumber(totalDue),
      totalDueCollection: safeNumber(totalDueCollection),
      totalDamage: safeNumber(totalDamage),
      totalExpense: safeNumber(totalExpense),
      monthName,
      dayBn,
    };
  }, [db.dailySheets, db.sales, db.expenses, sheet]);

  // Calculations with safe fallbacks
  const grossSales = safeNumber(sheet.totalGrossAmount);
  const damageTotal = safeNumber(sheet.totalDamageValue);
  const netSales = sheet.finalNetSalesAmount !== undefined && !isNaN(Number(sheet.finalNetSalesAmount))
    ? safeNumber(sheet.finalNetSalesAmount)
    : Math.max(0, grossSales - damageTotal);
  const todayDueTotal = safeNumber(sheet.todayDue);
  const expenseTotal = safeNumber(sheet.marketExpense);
  const lessTotal = safeNumber(sheet.lessAmount || sheet.dailyLess);
  const shortTotal = safeNumber(sheet.shortAmount || sheet.dailyShort);

  // Cash Denominations
  const denoms = sheet.cashDenominations || {};
  const denomRows = DENOMINATION_LIST.map((denom) => {
    const count = safeNumber(denoms[denom]);
    return {
      denom,
      count,
      subtotal: denom * count,
    };
  });
  const otherEntries = (denoms as any).otherEntries;
  const otherCash = Array.isArray(otherEntries) && otherEntries.length > 0
    ? otherEntries.reduce((sum: number, r: any) => sum + safeNumber(r.amount), 0)
    : safeNumber(denoms.other);
  const totalCashCalculated = denomRows.reduce((sum, r) => sum + r.subtotal, 0) + otherCash;
  const actualCash = safeNumber(sheet.cashCollected) > 0 ? safeNumber(sheet.cashCollected) : totalCashCalculated;

  // Reconciliation:
  // "সর্বমোট" (Total) = ক্যাশ + খরচ + বাকি + লেস + শর্ট
  const grandTotal = actualCash + expenseTotal + todayDueTotal + lessTotal + shortTotal;
  const diff = grandTotal - netSales;
  const isMatch = Math.abs(diff) < 0.01;
  const isExcess = diff > 0.01;
  const isShortage = diff < -0.01;

  // Multi-page Pagination Logic:
  // Dynamically estimate content height to guarantee overflow flows onto Page 2+ without being cut off
  const dueEntriesMaxCount = Math.max(validTodayDues.length, validDueCollections.length);
  const damageHeight = validDamageItems.length > 0 ? (40 + validDamageItems.length * 20 + 20) : 0;
  const duesHeight = (todayDueTotal > 0 || safeNumber(sheet.dueCollection) > 0)
    ? (40 + Math.max(dueEntriesMaxCount, 1) * 19 + 22)
    : 0;
  const bottomSectionsHeight = damageHeight + duesHeight + 45 /* 3 cards */ + 175 /* cash */ + 65 /* signs */ + 45 /* footers */;

  // Total required height if all content were squeezed on a single page (A4 comfortable safe content height is ~1040px)
  const singlePageTopHeight = 180 /* letterhead, monthly strip, metadata */ + 45 /* prod header/footer */;
  const totalSinglePageEstimatedHeight = singlePageTopHeight + (validItems.length * 20) + bottomSectionsHeight;

  let pagesOfItems: DailyAccountItem[][] = [];

  // When content comfortably fits on 1 page:
  if (totalSinglePageEstimatedHeight <= 1040 && validItems.length <= 11) {
    pagesOfItems = [validItems];
  } else {
    // Requires MULTI-PAGE pagination (2 or more pages)
    // Page 1 contains: Letterhead, Monthly strip, Metadata, Product items
    // Page 2 (or last page) contains: Continued header, Remaining products (if any), Product table totals,
    // Damage table, Customer Dues & Collections, Sales Summary, Cash Denominations & Reconciliation, Signatures
    const remainingHeightLastPage = Math.max(0, 1040 - 65 - bottomSectionsHeight);
    const maxItemsLastPage = Math.max(0, Math.floor(remainingHeightLastPage / 20));

    const MAX_ITEMS_PAGE_1 = 14;
    const MAX_ITEMS_PAGE_MIDDLE = 18;

    if (validItems.length <= MAX_ITEMS_PAGE_1 + maxItemsLastPage) {
      // Exactly 2 pages
      let p1Count = Math.min(validItems.length, MAX_ITEMS_PAGE_1);
      if (validItems.length - p1Count > maxItemsLastPage && p1Count < 18) {
        p1Count = Math.min(validItems.length, 18);
      }
      const p1 = validItems.slice(0, p1Count);
      const p2 = validItems.slice(p1Count);
      pagesOfItems = [p1, p2];
    } else {
      // 3 or more pages
      const p1 = validItems.slice(0, MAX_ITEMS_PAGE_1);
      pagesOfItems.push(p1);
      let remaining = validItems.slice(MAX_ITEMS_PAGE_1);
      while (remaining.length > maxItemsLastPage && remaining.length > 0) {
        pagesOfItems.push(remaining.slice(0, MAX_ITEMS_PAGE_MIDDLE));
        remaining = remaining.slice(MAX_ITEMS_PAGE_MIDDLE);
      }
      pagesOfItems.push(remaining);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm print-modal-overlay">
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
              তারিখ: {formatDate(sheet.date)} • রুট: {sheet.routeOrVan || 'সব'} • {totalPages} পৃষ্ঠা
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-800/60 flex justify-center print-preview-scroll">
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
                className="daily-print-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-visible"
                style={{
                  width: '794px',
                  minHeight: '1123px',
                  padding: '12px 18px 8px 18px',
                  boxSizing: 'border-box',
                  pageBreakAfter: isLastPage ? 'auto' : 'always',
                  breakAfter: isLastPage ? 'auto' : 'page',
                }}
              >
                <div>
                  {/* Top Letterhead (On First Page) - Compact */}
                  {isFirstPage ? (
                    <div className="border-b border-slate-900 pb-0.5 mb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <h1 className="text-base sm:text-[15px] font-black tracking-tight text-slate-950 font-bengali leading-none">
                              {settings.businessName || 'MM TRADERS'}
                            </h1>
                            <span className="text-[9px] font-bold text-slate-700 font-bengali">
                              {settings.subtitle || 'ডিস্ট্রিবিউটর ও পাইকারি বিক্রেতা'}
                            </span>
                          </div>
                          <p className="text-[8.5px] text-slate-600 mt-0.5 font-bengali leading-none">
                            {settings.proprietorName ? `স্বত্বাধিকারী: ${settings.proprietorName} • ` : ''}ঠিকানা: {settings.address} {settings.phone ? `• মোবাইল: ${settings.phone}` : ''}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="inline-block px-1.5 py-0.5 bg-slate-900 text-white text-[8.5px] font-bold rounded">
                            দৈনিক বিক্রয় ও হিসাব খতিয়ান
                          </span>
                          <p className="text-[8px] font-mono text-slate-500 mt-0.5 leading-none">
                            আইডি: {sheet.sheetNo || sheet.id} • {sheet.status === 'completed' ? 'চূড়ান্ত হিসাব' : 'চলমান বিতরণ'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Continued Page Header */
                    <div className="border-b border-slate-300 pb-0.5 mb-1 flex items-center justify-between text-[10px] font-semibold text-slate-600">
                      <span className="font-bold text-slate-900">
                        {settings.businessName} — দৈনিক বিক্রয় খতিয়ান (চলমান)
                      </span>
                      <span>
                        তারিখ: {formatDate(sheet.date)} • রুট: {sheet.routeOrVan}
                      </span>
                    </div>
                  )}

                  {/* Monthly Summary Strip (Compact Single Line / Bengali Only) */}
                  {isFirstPage && (
                    <div className="mb-1">
                      <div className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 flex items-center justify-between text-[8px] sm:text-[8.5px] leading-tight">
                        <div className="flex items-center gap-1 font-bold text-slate-700 shrink-0">
                          <Calendar className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                          <span>চলতি মাসের হিসাব {monthToDateTotals.dayBn ? `(${monthToDateTotals.monthName || 'চলতি মাস'} ১–${monthToDateTotals.dayBn} তারিখ)` : ''}:</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2.5 font-bengali">
                          <div className="flex items-center gap-0.5">
                            <span className="text-slate-600">মোট বিক্রি:</span>
                            <strong className="font-mono font-bold text-slate-900 text-[8.5px] sm:text-[9px]">{formatMoney(monthToDateTotals.totalSales)}</strong>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-amber-800">মোট বাকি:</span>
                            <strong className="font-mono font-bold text-amber-900 text-[8.5px] sm:text-[9px]">{formatMoney(monthToDateTotals.totalDue)}</strong>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-emerald-800">মোট বাকি উত্তোলন:</span>
                            <strong className="font-mono font-bold text-emerald-900 text-[8.5px] sm:text-[9px]">{formatMoney(monthToDateTotals.totalDueCollection)}</strong>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-rose-800">মোট ড্যামেজ:</span>
                            <strong className="font-mono font-bold text-rose-900 text-[8.5px] sm:text-[9px]">{formatMoney(monthToDateTotals.totalDamage)}</strong>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-slate-700">মোট খরচ:</span>
                            <strong className="font-mono font-bold text-slate-900 text-[8.5px] sm:text-[9px]">{formatMoney(monthToDateTotals.totalExpense)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata Row (On First Page) - Compact */}
                  {isFirstPage && (
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 mb-1 text-[8.5px]">
                      <div>
                        <span className="text-[7.5px] text-slate-500 block leading-tight">তারিখ:</span>
                        <span className="font-bold text-slate-900 font-mono text-[9px] leading-tight block">
                          {formatDate(sheet.date)} <span className="font-normal text-[8px] text-slate-500 font-bengali">({formatBengaliDate(sheet.date)})</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-slate-500 block leading-tight">রুট / ডেলিভারি ভ্যান:</span>
                        <span className="font-bold text-slate-900 truncate block leading-tight">{sheet.routeOrVan || 'নির্ধারিত নয়'}</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-slate-500 block leading-tight">বিক্রয় প্রতিনিধি (SR):</span>
                        <span className="font-bold text-slate-900 truncate block leading-tight">{sheet.srName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] text-slate-500 block leading-tight">ডেলিভারি প্রতিনিধি (DSR):</span>
                        <span className="font-bold text-slate-900 truncate block leading-tight">{sheet.dsrName || '—'}</span>
                      </div>
                    </div>
                  )}

                  {/* 1. PRODUCT SALES TABLE - Compact */}
                  <div className="mb-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9.5px] font-black text-slate-900 flex items-center gap-1 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                        ১. দৈনিক পণ্য বিক্রয় হিসাব {totalPages > 1 ? `(পৃষ্ঠা ${pageIndex + 1})` : ''}
                      </span>
                      <span className="text-[8px] text-slate-500 leading-none">
                        দর ও পরিমাণ (কার্টন / পিস)
                      </span>
                    </div>

                    <table className="w-full border-collapse text-[8.5px]">
                      <thead>
                        <tr className="bg-slate-100 border-y border-slate-300 text-slate-800 font-bold leading-tight">
                          <th className="py-[2px] px-1 text-center w-6 border-r border-slate-200">#</th>
                          <th className="py-[2px] px-1.5 text-left border-r border-slate-200">পণ্যের নাম ও বিবরণ</th>
                          <th className="py-[2px] px-1 text-center w-14 border-r border-slate-200">দর ({currency})</th>
                          <th className="py-[2px] px-1.5 text-center w-16 border-r border-slate-200">দেওয়া মাল</th>
                          <th className="py-[2px] px-1.5 text-center w-16 border-r border-slate-200">ফেরত মাল</th>
                          <th className="py-[2px] px-1.5 text-center w-16 border-r border-slate-200">বিক্রি পিস</th>
                          <th className="py-[2px] px-1.5 text-right w-20">মোট টাকা ({currency})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-2 text-center text-slate-400 font-bengali text-xs border-b border-slate-200">
                              {pageIndex > 0 ? 'পূর্ববর্তী পাতায় পণ্যের তালিকা সম্পন্ন হয়েছে (নিচে সারসংক্ষেপ দ্রষ্টব্য)' : 'কোনো পণ্যের এন্ট্রি যুক্ত করা হয়নি (খালি খতিয়ান পাতা)'}
                            </td>
                          </tr>
                        )}
                        {pageItems.map((item, idx) => {
                          const itemsBeforeThisPage = pagesOfItems.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0);
                          const globalIdx = itemsBeforeThisPage + idx + 1;
                          const rawIssued = safeNumber(item.rawIssuedQty ?? item.issuedQty);
                          const rawRet = safeNumber(item.rawReturnQty ?? item.returnQty);
                          const issuedUnit = item.issuedUnit || 'P';
                          const returnUnit = item.returnUnit || 'P';

                          return (
                            <tr
                              key={item.id || idx}
                              className={`border-b border-slate-200 ${
                                idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                              }`}
                            >
                              <td className="py-[2px] px-1 text-center font-mono text-slate-500 border-r border-slate-200">
                                {toBengaliDigits(globalIdx)}
                              </td>
                              <td className="py-[2px] px-1.5 border-r border-slate-200">
                                <span className="font-bold text-slate-900">{item.productName || 'অজানা পণ্য'}</span>
                                {item.packSize && (
                                  <span className="text-[8px] text-slate-500 ml-1">
                                    ({item.packSize})
                                  </span>
                                )}
                              </td>
                              <td className="py-[2px] px-1 text-center font-mono font-semibold border-r border-slate-200">
                                {formatAmount(item.sellingPrice)}
                              </td>
                              <td className="py-[2px] px-1.5 text-center font-mono border-r border-slate-200">
                                {rawIssued} {issuedUnit === 'C' ? 'কা.' : 'পিস'}
                              </td>
                              <td className="py-[2px] px-1.5 text-center font-mono border-r border-slate-200 text-amber-900">
                                {rawRet} {returnUnit === 'C' ? 'কা.' : 'পিস'}
                              </td>
                              <td className="py-[2px] px-1.5 text-center font-mono font-bold text-emerald-800 border-r border-slate-200">
                                {safeNumber(item.netSoldQty)} {issuedUnit === 'C' ? 'কা.' : 'পিস'}
                              </td>
                              <td className="py-[2px] px-1.5 text-right font-mono font-bold text-slate-900">
                                {formatAmount(item.grossAmount || item.finalNetAmount)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* If last page, show product table total */}
                        {isLastPage && (
                          <tr className="bg-slate-100 font-bold border-t border-slate-400 text-slate-900 leading-tight">
                            <td colSpan={3} className="py-[2px] px-1.5 text-right border-r border-slate-200 text-[8.5px]">
                              মোট মূল বিক্রয়:
                            </td>
                            <td className="py-[2px] px-1.5 text-center font-mono border-r border-slate-200 text-[8.5px]">
                              {safeNumber(sheet.totalIssuedQty)} পিস
                            </td>
                            <td className="py-[2px] px-1.5 text-center font-mono border-r border-slate-200 text-amber-900 text-[8.5px]">
                              {safeNumber(sheet.totalReturnQty)} পিস
                            </td>
                            <td className="py-[2px] px-1.5 text-center font-mono text-emerald-800 border-r border-slate-200 text-[8.5px]">
                              {safeNumber(sheet.totalNetSoldQty)} পিস
                            </td>
                            <td className="py-[2px] px-1.5 text-right font-mono text-emerald-900 text-[9px] font-black">
                              {formatMoney(grossSales)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. DAMAGE TABLE (If on last page and damage items exist) - Compact */}
                  {isLastPage && validDamageItems.length > 0 && (
                    <div className="mb-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9.5px] font-black text-rose-900 flex items-center gap-1 leading-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                          ২. ফেরত / ড্যামেজ পণ্যের হিসাব
                        </span>
                        <span className="text-[8px] font-mono font-bold text-rose-800 leading-none">
                          মোট ড্যামেজ: {formatMoney(damageTotal)}
                        </span>
                      </div>

                      <table className="w-full border-collapse text-[8.5px]">
                        <thead>
                          <tr className="bg-rose-50 border-y border-rose-200 text-rose-950 font-bold leading-tight">
                            <th className="py-[2px] px-1 text-center w-6 border-r border-rose-200">#</th>
                            <th className="py-[2px] px-1.5 text-left border-r border-rose-200">পণ্যের নাম</th>
                            <th className="py-[2px] px-1 text-center w-14 border-r border-rose-200">দর ({currency})</th>
                            <th className="py-[2px] px-1.5 text-center w-16 border-r border-rose-200">পরিমাণ</th>
                            <th className="py-[2px] px-1.5 text-center w-16 border-r border-rose-200">মোট পিস</th>
                            <th className="py-[2px] px-1.5 text-right w-20">মোট টাকা ({currency})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validDamageItems.map((dItem, dIdx) => {
                            const rawDamage = safeNumber(dItem.rawDamageQty ?? dItem.damageQty);
                            const dUnit = dItem.damageUnit || 'P';
                            const dRate = safeNumber(dItem.sellingPrice || (dItem as any).rate);
                            const dAmount = safeNumber(dItem.grossAmount || dItem.damageValue);
                            return (
                              <tr
                                key={dItem.id || dIdx}
                                className={`border-b border-rose-100 ${
                                  dIdx % 2 === 1 ? 'bg-rose-50/30' : 'bg-white'
                                }`}
                              >
                                <td className="py-[2px] px-1 text-center font-mono text-slate-500 border-r border-rose-100">
                                  {toBengaliDigits(dIdx + 1)}
                                </td>
                                <td className="py-[2px] px-1.5 font-bold text-slate-900 border-r border-rose-100">
                                  {dItem.productName || 'অজানা পণ্য'}
                                </td>
                                <td className="py-[2px] px-1 text-center font-mono border-r border-rose-100">
                                  {formatAmount(dRate)}
                                </td>
                                <td className="py-[2px] px-1.5 text-center font-mono border-r border-rose-100">
                                  {rawDamage} {dUnit === 'C' ? 'কা.' : 'পিস'}
                                </td>
                                <td className="py-[2px] px-1.5 text-center font-mono font-bold text-rose-800 border-r border-rose-100">
                                  {safeNumber(dItem.damageQty || rawDamage)} {dUnit === 'C' ? 'কা.' : 'পিস'}
                                </td>
                                <td className="py-[2px] px-1.5 text-right font-mono font-bold text-rose-800">
                                  {formatAmount(dAmount)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-rose-50 font-bold border-t border-rose-300 text-rose-950 leading-tight">
                            <td colSpan={4} className="py-[2px] px-1.5 text-right border-r border-rose-200 text-[8.5px]">
                              মোট ড্যামেজ:
                            </td>
                            <td className="py-[2px] px-1.5 text-center font-mono border-r border-rose-200 text-[8.5px]">
                              {safeNumber(sheet.totalDamageQty)} পিস
                            </td>
                            <td className="py-[2px] px-1.5 text-right font-mono text-rose-900 font-bold text-[8.5px]">
                              {formatMoney(damageTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 3. CUSTOMER-WISE DUES & COLLECTIONS (On Last Page) - Compact */}
                  {isLastPage && (todayDueTotal > 0 || safeNumber(sheet.dueCollection) > 0) && (
                    <div
                      className={`grid ${
                        todayDueTotal > 0 && safeNumber(sheet.dueCollection) > 0
                          ? 'grid-cols-2'
                          : 'grid-cols-1'
                      } gap-1.5 mb-1 text-[8.5px]`}
                    >
                      {/* A) আজকের বাকি */}
                      {todayDueTotal > 0 && (
                        <div className="border border-amber-300 rounded overflow-hidden bg-white">
                          <div className="bg-amber-100/90 px-1.5 py-0.5 border-b border-amber-300 flex items-center justify-between">
                            <span className="font-bold text-amber-950 font-bengali text-[9px] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                              আজকের বাকি
                            </span>
                            <span className="font-mono text-[8px] text-amber-800 font-bold">
                              {validTodayDues.length} টি খতিয়ান
                            </span>
                          </div>
                          <table className="w-full text-left border-collapse text-[8.5px]">
                            <thead>
                              <tr className="bg-amber-50/80 border-b border-amber-200 text-amber-900 font-bold leading-tight">
                                <th className="py-[2px] px-1 text-center w-5 border-r border-amber-200">#</th>
                                <th className="py-[2px] px-1.5 border-r border-amber-200">
                                  কাস্টমার/দোকানের নাম
                                </th>
                                <th className="py-[2px] px-1.5 text-right w-16">টাকা</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                              {validTodayDues.length > 0 ? (
                                validTodayDues.map((due, dIdx) => (
                                  <tr key={due.id || dIdx} className="hover:bg-amber-50/30">
                                    <td className="py-[1.5px] px-1 text-center font-mono text-slate-500 border-r border-amber-100">
                                      {toBengaliDigits(dIdx + 1)}
                                    </td>
                                    <td className="py-[1.5px] px-1.5 text-slate-800 border-r border-amber-100 font-medium">
                                      {formatCustomerShopName(due)}
                                    </td>
                                    <td className="py-[1.5px] px-1.5 text-right font-mono font-bold text-amber-950">
                                      {formatMoney(due.amount)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td className="py-[1.5px] px-1 text-center font-mono text-slate-400 border-r border-amber-100">১</td>
                                  <td className="py-[1.5px] px-1.5 text-slate-700 italic border-r border-amber-100">
                                    সাধারণ বাকি খতিয়ান
                                  </td>
                                  <td className="py-[1.5px] px-1.5 text-right font-mono font-bold text-amber-950">
                                    {formatMoney(todayDueTotal)}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="bg-amber-100/90 font-black border-t border-amber-300 text-amber-950 leading-tight">
                                <td colSpan={2} className="py-[2px] px-1.5 font-bengali border-r border-amber-200">
                                  মোট নতুন বাকি:
                                </td>
                                <td className="py-[2px] px-1.5 text-right font-mono font-bold">
                                  {formatMoney(todayDueTotal)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* B) বাকি জমা */}
                      {safeNumber(sheet.dueCollection) > 0 && (
                        <div className="border border-emerald-300 rounded overflow-hidden bg-white">
                          <div className="bg-emerald-100/90 px-1.5 py-0.5 border-b border-emerald-300 flex items-center justify-between">
                            <span className="font-bold text-emerald-950 font-bengali text-[9px] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                              বাকি জমা
                            </span>
                            <span className="font-mono text-[8px] text-emerald-800 font-bold">
                              {validDueCollections.length} টি আদায়
                            </span>
                          </div>
                          <table className="w-full text-left border-collapse text-[8.5px]">
                            <thead>
                              <tr className="bg-emerald-50/80 border-b border-emerald-200 text-emerald-900 font-bold leading-tight">
                                <th className="py-[2px] px-1 text-center w-5 border-r border-emerald-200">#</th>
                                <th className="py-[2px] px-1.5 border-r border-emerald-200">
                                  কাস্টমার/দোকানের নাম
                                </th>
                                <th className="py-[2px] px-1.5 text-right w-16">টাকা</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100">
                              {validDueCollections.length > 0 ? (
                                validDueCollections.map((col, cIdx) => (
                                  <tr key={col.id || cIdx} className="hover:bg-emerald-50/30">
                                    <td className="py-[1.5px] px-1 text-center font-mono text-slate-500 border-r border-emerald-100">
                                      {toBengaliDigits(cIdx + 1)}
                                    </td>
                                    <td className="py-[1.5px] px-1.5 text-slate-800 border-r border-emerald-100 font-medium">
                                      {formatCustomerShopName(col)}
                                    </td>
                                    <td className="py-[1.5px] px-1.5 text-right font-mono font-bold text-emerald-950">
                                      {formatMoney(col.amount)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td className="py-[1.5px] px-1 text-center font-mono text-slate-400 border-r border-emerald-100">১</td>
                                  <td className="py-[1.5px] px-1.5 text-slate-700 italic border-r border-emerald-100">
                                    সাধারণ বাকি জমা
                                  </td>
                                  <td className="py-[1.5px] px-1.5 text-right font-mono font-bold text-emerald-950">
                                    {formatMoney(sheet.dueCollection)}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr className="bg-emerald-100/90 font-black border-t border-emerald-300 text-emerald-950 leading-tight">
                                <td colSpan={2} className="py-[2px] px-1.5 font-bengali border-r border-emerald-200">
                                  মোট বাকি জমা:
                                </td>
                                <td className="py-[2px] px-1.5 text-right font-mono font-bold">
                                  {formatMoney(sheet.dueCollection)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. SALES SUMMARY (3 Cards) on Last Page - Compact */}
                  {isLastPage && (
                    <div className="grid grid-cols-3 gap-1 mb-1">
                      <div className="border border-slate-300 bg-slate-50 py-0.5 px-1 rounded text-center">
                        <span className="text-[8px] text-slate-600 font-bold block leading-none">
                          ১. মূল বিক্রি
                        </span>
                        <span className="text-[11px] font-mono font-black text-slate-900 leading-tight">
                          {formatMoney(grossSales)}
                        </span>
                      </div>
                      <div className="border border-rose-200 bg-rose-50/60 py-0.5 px-1 rounded text-center">
                        <span className="text-[8px] text-rose-700 font-bold block leading-none">
                          ২. মোট ড্যামেজ
                        </span>
                        <span className="text-[11px] font-mono font-black text-rose-800 leading-tight">
                          - {formatMoney(damageTotal)}
                        </span>
                      </div>
                      <div className="border border-emerald-300 bg-emerald-50 py-0.5 px-1 rounded text-center">
                        <span className="text-[8px] text-emerald-800 font-bold block leading-none">
                          ৩. চূড়ান্ত প্রকৃত বিক্রি
                        </span>
                        <span className="text-[11px] font-mono font-black text-emerald-800 leading-tight">
                          {formatMoney(netSales)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4 & 5. TWO-COLUMN: নোট হিসাব (Left) & ক্যাশ ও রিকনসিলিয়েশন (Right) on Last Page - Compact */}
                  {isLastPage && (
                    <div className="grid grid-cols-2 gap-1.5 mb-1 text-[8.5px]">
                      {/* Left: নোট হিসাব (Cash Denominations) */}
                      <div className="border border-slate-300 rounded p-1 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-0.5 font-bold text-slate-900 text-[9px] leading-tight">
                          <span>নোট হিসাব</span>
                          <span className="font-mono text-emerald-800 font-bold">
                            মোট: {formatMoney(actualCash)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-[1px] text-[8px] font-mono">
                          {denomRows.map((r) => (
                            <div key={r.denom} className="flex justify-between border-b border-slate-100 py-[1px]">
                              <span className="text-slate-600">{r.denom} × {r.count}</span>
                              <span className="font-bold text-slate-900">{formatAmount(r.subtotal)}</span>
                            </div>
                          ))}
                          {Array.isArray(otherEntries) && otherEntries.length > 0 ? (
                            otherEntries.map((e: any, idx: number) => {
                              const amt = safeNumber(e.amount);
                              if (amt <= 0 && otherEntries.length > 1) return null;
                              return (
                                <div key={e.id || idx} className="flex justify-between border-b border-slate-100 py-[1px] col-span-2">
                                  <span className="text-slate-600">{e.label || `অন্যান্য ${toBengaliDigits(idx + 1)}`}:</span>
                                  <span className="font-bold text-slate-900">{formatAmount(amt)}</span>
                                </div>
                              );
                            })
                          ) : otherCash > 0 ? (
                            <div className="flex justify-between border-b border-slate-100 py-[1px] col-span-2">
                              <span className="text-slate-600">খুচরা / অন্যান্য:</span>
                              <span className="font-bold text-slate-900">{formatAmount(otherCash)}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Right: ক্যাশ রিকনসিলিয়েশন হিসাব */}
                      <div className="border border-slate-300 rounded p-1 bg-white flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-0.5 font-bold text-slate-900 text-[9px] leading-tight">
                            <span>ক্যাশ ও খরচ সমন্বয়</span>
                            {isMatch ? (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> মিলেছে
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200">
                                <XCircle className="h-2.5 w-2.5 text-rose-600" /> অমিল
                              </span>
                            )}
                          </div>

                          <div className="space-y-[1px] text-[8.5px] leading-tight">
                            {/* 1. ক্যাশ */}
                            <div className="flex justify-between text-slate-800">
                              <span className="text-slate-700 font-medium">১. মোট ক্যাশ:</span>
                              <span className="font-mono font-bold text-slate-900">{formatMoney(actualCash)}</span>
                            </div>

                            {/* 2. খরচ */}
                            <div className="flex justify-between text-slate-800">
                              <span className="text-slate-700 font-medium">২. খরচ:</span>
                              <span className="font-mono font-bold text-slate-900">{formatMoney(expenseTotal)}</span>
                            </div>

                            {/* 3. বাকি */}
                            <div className="flex justify-between text-slate-800">
                              <span className="text-slate-700 font-medium">৩. নতুন বাকি:</span>
                              <span className="font-mono font-bold text-slate-900">{formatMoney(todayDueTotal)}</span>
                            </div>

                            {/* 4. লেস */}
                            <div className="flex justify-between text-slate-800">
                              <span className="text-slate-700 font-medium">৪. লেস:</span>
                              <span className="font-mono font-bold text-slate-900">{formatMoney(lessTotal)}</span>
                            </div>

                            {/* 5. শর্ট */}
                            <div className="flex justify-between text-slate-800">
                              <span className="text-slate-700 font-medium">
                                ৫. শর্ট {sheet.dsrName ? `(${sheet.dsrName})` : ''}:
                              </span>
                              <span className="font-mono font-bold text-slate-900">{formatMoney(shortTotal)}</span>
                            </div>

                            {/* 6. সর্বমোট = ক্যাশ + খরচ + বাকি + লেস + শর্ট */}
                            <div className="flex justify-between font-black text-slate-950 bg-emerald-50/90 border border-emerald-300 py-0.5 px-1 rounded mt-0.5 text-[9px]">
                              <span className="font-bengali">সর্বমোট:</span>
                              <span className="font-mono font-black text-emerald-950">{formatMoney(grandTotal)}</span>
                            </div>
                          </div>
                        </div>

                        {/* তুলনা: প্রকৃত বিক্রি বনাম সর্বমোট */}
                        <div className="mt-0.5 pt-0.5 border-t border-slate-200">
                          <div className="text-[8px] font-bold text-slate-700 mb-0.5 flex items-center justify-between leading-none">
                            <span>তুলনা: প্রকৃত বিক্রি বনাম সর্বমোট</span>
                          </div>

                          {isMatch ? (
                            <div className="py-0.5 px-1 rounded bg-emerald-50 border border-emerald-300 flex items-center justify-between text-emerald-950 text-[8.5px]">
                              <div className="flex items-center gap-1 font-bold">
                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                                <span>হিসাব মিলেছে</span>
                              </div>
                              <span className="font-mono font-bold text-[8px] text-emerald-800 bg-white/90 border border-emerald-300 px-1 py-0.2 rounded">
                                পার্থক্য: {formatMoney(0)}
                              </span>
                            </div>
                          ) : (
                            <div className="py-0.5 px-1 rounded bg-rose-50 border border-rose-300 flex items-center justify-between text-rose-950 text-[8.5px]">
                              <div className="flex items-center gap-1 font-bold">
                                <XCircle className="h-2.5 w-2.5 text-rose-600 shrink-0" />
                                <span>হিসাব মিলছে না</span>
                              </div>
                              <span className="font-mono font-bold text-[8px] text-rose-800 bg-white/90 border border-rose-300 px-1 py-0.2 rounded">
                                পার্থক্য: {formatMoney(Math.abs(diff))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. SIGNATURES (On Last Page) - Compact */}
                  {isLastPage && (
                    <div className="pt-1 mt-0.5 border-t border-slate-300 grid grid-cols-3 gap-3 text-center text-[8.5px]">
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-0.5">
                          <p className="font-bold text-slate-800">বিক্রয় প্রতিনিধি (SR)</p>
                          <p className="text-[8px] text-slate-500">{sheet.srName || 'স্বাক্ষর'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-0.5">
                          <p className="font-bold text-slate-800">ক্যাশিয়ার / ডিএসআর</p>
                          <p className="text-[8px] text-slate-500">{sheet.dsrName || 'স্বাক্ষর'}</p>
                        </div>
                      </div>
                      <div>
                        <div className="border-t border-dashed border-slate-400 pt-0.5">
                          <p className="font-bold text-slate-800">মালিক / হিসাবরক্ষক</p>
                          <p className="text-[8px] text-slate-500">{settings.proprietorName || 'অনুমোদিত স্বাক্ষর'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Page Footer - Compact */}
                <div className="border-t border-slate-200 pt-0.5 text-[8px] text-slate-400 flex items-center justify-between mt-0.5 leading-none">
                  <span>
                    {settings.businessName} • প্রস্তুতকৃত: {formatDate(new Date())} {new Date().toLocaleTimeString('bn-BD')}
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
