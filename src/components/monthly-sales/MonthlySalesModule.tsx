import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Coins,
  Receipt,
  Calendar,
  Printer,
  ArrowDownRight,
  FileSpreadsheet,
  Eye,
  ImageDown,
  FileDown,
  TrendingDown,
  AlertOctagon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MonthlySalesPrintPreviewModal } from './MonthlySalesPrintPreviewModal';

const BENGALI_MONTHS = [
  { value: 1, nameBn: 'জানুয়ারি', nameEn: 'January' },
  { value: 2, nameBn: 'ফেব্রুয়ারি', nameEn: 'February' },
  { value: 3, nameBn: 'মার্চ', nameEn: 'March' },
  { value: 4, nameBn: 'এপ্রিল', nameEn: 'April' },
  { value: 5, nameBn: 'মে', nameEn: 'May' },
  { value: 6, nameBn: 'জুন', nameEn: 'June' },
  { value: 7, nameBn: 'জুলাই', nameEn: 'July' },
  { value: 8, nameBn: 'আগস্ট', nameEn: 'August' },
  { value: 9, nameBn: 'সেপ্টেম্বর', nameEn: 'September' },
  { value: 10, nameBn: 'অক্টোবর', nameEn: 'October' },
  { value: 11, nameBn: 'নভেম্বর', nameEn: 'November' },
  { value: 12, nameBn: 'ডিসেম্বর', nameEn: 'December' },
];

export const MonthlySalesModule: React.FC = () => {
  const { db, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';

  // Parse today's year and month as default
  const todayParts = todayDateStr.split('-');
  const currentYear = parseInt(todayParts[0], 10) || new Date().getFullYear();
  const currentMonth = parseInt(todayParts[1], 10) || new Date().getMonth() + 1;

  // Month & Year state
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Available years from database records or default span
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear + 1]);
    (db.dailySheets || []).forEach((sheet) => {
      if (sheet.date) {
        const y = parseInt(sheet.date.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    (db.lessEntries || []).forEach((entry) => {
      if (entry.date) {
        const y = parseInt(entry.date.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    (db.expenses || []).forEach((expense) => {
      if (expense.date) {
        const y = parseInt(expense.date.split('-')[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [db.dailySheets, db.lessEntries, db.expenses, currentYear]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Reset to current month
  const handleCurrentMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  // Format YYYY-MM prefix
  const targetMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Bengali label for selected month
  const selectedMonthObj = BENGALI_MONTHS.find((m) => m.value === selectedMonth);
  const selectedMonthLabel = `${selectedMonthObj?.nameBn || ''} ${selectedYear} (${selectedMonthObj?.nameEn || ''})`;

  // =========================================================================
  // COLUMN 1: DAILY SALES (date-wise)
  // =========================================================================
  const dailySalesData = useMemo(() => {
    const monthSheets = (db.dailySheets || []).filter(
      (s) => s.date && s.date.startsWith(targetMonthPrefix)
    );

    const dateMap = new Map<string, { totalSales: number; count: number; routes: string[] }>();

    monthSheets.forEach((sheet) => {
      const d = sheet.date;
      const salesAmt =
        typeof sheet.finalNetSalesAmount === 'number'
          ? sheet.finalNetSalesAmount
          : (sheet.totalGrossAmount || 0) - (sheet.totalDamageValue || 0);

      const existing = dateMap.get(d) || { totalSales: 0, count: 0, routes: [] };
      existing.totalSales += salesAmt;
      existing.count += 1;
      if (sheet.routeOrVan && !existing.routes.includes(sheet.routeOrVan)) {
        existing.routes.push(sheet.routeOrVan);
      }
      dateMap.set(d, existing);
    });

    // Also include legacy direct sales if present
    (db.sales || []).forEach((s) => {
      if (s.date && s.date.startsWith(targetMonthPrefix) && s.status === 'completed') {
        const d = s.date;
        const existing = dateMap.get(d) || { totalSales: 0, count: 0, routes: [] };
        // Avoid duplicate counting if sheet already accounts for it
        if (!dateMap.has(d)) {
          existing.totalSales += s.netSales || 0;
          existing.count += 1;
          dateMap.set(d, existing);
        }
      }
    });

    const list = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      salesAmount: data.totalSales,
      sheetCount: data.count,
      routes: data.routes,
    }));

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [db.dailySheets, db.sales, targetMonthPrefix]);

  const totalMonthlySales = useMemo(() => {
    return dailySalesData.reduce((sum, item) => sum + item.salesAmount, 0);
  }, [dailySalesData]);

  // =========================================================================
  // COLUMN 2: DAILY LESS (date-wise)
  // =========================================================================
  const dailyLessData = useMemo(() => {
    const monthLess = (db.lessEntries || []).filter(
      (l) => l.date && l.date.startsWith(targetMonthPrefix)
    );

    const dateMap = new Map<
      string,
      { totalLess: number; count: number; descriptions: string[] }
    >();

    monthLess.forEach((entry) => {
      const d = entry.date;
      const amt = Number(entry.amount) || 0;
      const existing = dateMap.get(d) || { totalLess: 0, count: 0, descriptions: [] };
      existing.totalLess += amt;
      existing.count += 1;
      if (entry.description && !existing.descriptions.includes(entry.description)) {
        existing.descriptions.push(entry.description);
      }
      dateMap.set(d, existing);
    });

    // Also include dailyLess from dailySheets if any
    (db.dailySheets || []).forEach((s) => {
      if (s.date && s.date.startsWith(targetMonthPrefix) && (s.dailyLess || 0) > 0) {
        const d = s.date;
        const amt = Number(s.dailyLess) || 0;
        const existing = dateMap.get(d) || { totalLess: 0, count: 0, descriptions: [] };
        // Add if not already tracked under lessEntries
        const note = `খতিয়ান লেস [${s.routeOrVan || 'রুট'}]`;
        if (!existing.descriptions.some((desc) => desc.includes('খতিয়ান লেস'))) {
          existing.totalLess += amt;
          existing.count += 1;
          existing.descriptions.push(note);
          dateMap.set(d, existing);
        }
      }
    });

    const list = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      lessAmount: data.totalLess,
      count: data.count,
      descriptions: data.descriptions,
    }));

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [db.lessEntries, db.dailySheets, targetMonthPrefix]);

  const totalMonthlyLess = useMemo(() => {
    return dailyLessData.reduce((sum, item) => sum + item.lessAmount, 0);
  }, [dailyLessData]);

  // =========================================================================
  // COLUMN 3: DAILY EXPENSE (date-wise)
  // =========================================================================
  const dailyExpenseData = useMemo(() => {
    const dateMap = new Map<
      string,
      { totalExpense: number; count: number; items: string[] }
    >();

    // 1. From db.expenses
    (db.expenses || []).forEach((e) => {
      if (e.date && e.date.startsWith(targetMonthPrefix) && e.status !== 'void') {
        const d = e.date;
        const amt = Number(e.amount) || 0;
        const existing = dateMap.get(d) || { totalExpense: 0, count: 0, items: [] };
        existing.totalExpense += amt;
        existing.count += 1;
        const label = e.category
          ? `${e.category}${e.description ? ` (${e.description})` : ''}`
          : e.description || 'খরচ';
        if (!existing.items.includes(label)) {
          existing.items.push(label);
        }
        dateMap.set(d, existing);
      }
    });

    // 2. From dailySheets marketExpense
    (db.dailySheets || []).forEach((s) => {
      if (s.date && s.date.startsWith(targetMonthPrefix) && (s.marketExpense || 0) > 0) {
        const d = s.date;
        const amt = Number(s.marketExpense) || 0;
        const existing = dateMap.get(d) || { totalExpense: 0, count: 0, items: [] };
        const label = `বাজার খরচ [রুট: ${s.routeOrVan || 'ডেলিভারি'}]`;
        if (!existing.items.includes(label)) {
          existing.totalExpense += amt;
          existing.count += 1;
          existing.items.push(label);
          dateMap.set(d, existing);
        }
      }
    });

    const list = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      expenseAmount: data.totalExpense,
      count: data.count,
      items: data.items,
    }));

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [db.expenses, db.dailySheets, targetMonthPrefix]);

  const totalMonthlyExpense = useMemo(() => {
    return dailyExpenseData.reduce((sum, item) => sum + item.expenseAmount, 0);
  }, [dailyExpenseData]);

  // =========================================================================
  // COLUMN 4: DAILY SHORT (date-wise)
  // =========================================================================
  const dailyShortData = useMemo(() => {
    const dateMap = new Map<
      string,
      { totalShort: number; count: number; dsrs: string[] }
    >();

    (db.dailySheets || []).forEach((sheet) => {
      if (sheet.date && sheet.date.startsWith(targetMonthPrefix)) {
        const amt = Number(sheet.shortAmount ?? sheet.dailyShort ?? 0);
        if (amt > 0) {
          const d = sheet.date;
          const existing = dateMap.get(d) || { totalShort: 0, count: 0, dsrs: [] };
          existing.totalShort += amt;
          existing.count += 1;
          const dsrLabel = sheet.dsrName?.trim() || sheet.routeOrVan || sheet.srName;
          if (dsrLabel && !existing.dsrs.includes(dsrLabel)) {
            existing.dsrs.push(dsrLabel);
          }
          dateMap.set(d, existing);
        }
      }
    });

    const list = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      shortAmount: data.totalShort,
      count: data.count,
      dsrs: data.dsrs,
    }));

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [db.dailySheets, targetMonthPrefix]);

  const totalMonthlyShort = useMemo(() => {
    return dailyShortData.reduce((sum, item) => sum + item.shortAmount, 0);
  }, [dailyShortData]);

  // =========================================================================
  // COLUMN 5: DAILY DAMAGE (date-wise)
  // =========================================================================
  const dailyDamageData = useMemo(() => {
    const dateMap = new Map<
      string,
      { totalDamage: number; count: number; items: string[] }
    >();

    (db.dailySheets || []).forEach((sheet) => {
      if (sheet.date && sheet.date.startsWith(targetMonthPrefix)) {
        let sheetDamageValue = Number(sheet.totalDamageValue) || 0;
        const itemNames: string[] = [];

        if (Array.isArray(sheet.damageItems) && sheet.damageItems.length > 0) {
          let itemsValue = 0;
          sheet.damageItems.forEach((it) => {
            const val =
              Number(it.damageValue) ||
              (Number(it.damageQty) || 0) * (Number(it.sellingPrice) || 0);
            if (val > 0 || (Number(it.damageQty) || 0) > 0) {
              itemsValue += val;
              if (it.productName && !itemNames.includes(it.productName)) {
                itemNames.push(`${it.productName} (${it.damageQty || 0}টি)`);
              }
            }
          });
          if (itemsValue > 0) {
            sheetDamageValue = Math.max(sheetDamageValue, itemsValue);
          }
        }

        if (sheetDamageValue > 0) {
          const d = sheet.date;
          const existing = dateMap.get(d) || { totalDamage: 0, count: 0, items: [] };
          existing.totalDamage += sheetDamageValue;
          existing.count += 1;
          itemNames.forEach((name) => {
            if (!existing.items.includes(name)) {
              existing.items.push(name);
            }
          });
          if (sheet.routeOrVan && existing.items.length === 0) {
            existing.items.push(sheet.routeOrVan);
          }
          dateMap.set(d, existing);
        }
      }
    });

    const list = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      damageAmount: data.totalDamage,
      count: data.count,
      items: data.items,
    }));

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [db.dailySheets, targetMonthPrefix]);

  const totalMonthlyDamage = useMemo(() => {
    return dailyDamageData.reduce((sum, item) => sum + item.damageAmount, 0);
  }, [dailyDamageData]);

  // Format date helper with weekday name in Bengali
  const formatDateBn = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(y, m - 1, d);

      const daysBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
      const dayName = daysBn[dateObj.getDay()];

      return `${dateStr} (${dayName})`;
    } catch {
      return dateStr;
    }
  };

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printAction, setPrintAction] = useState<'png' | 'pdf' | null>(null);

  const handleOpenPrintPreview = (action?: 'png' | 'pdf' | null) => {
    setPrintAction(action || null);
    setIsPrintModalOpen(true);
  };

  const handleDownloadPDF = () => {
    handleOpenPrintPreview('pdf');
  };

  const handleDownloadPNG = () => {
    handleOpenPrintPreview('png');
  };

  const handlePrint = () => {
    handleOpenPrintPreview(null);
  };

  return (
    <div id="monthly-sales-module" className="space-y-6 pb-12">
      {/* 1. TOP HEADER & MONTH / YEAR SELECTOR */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CalendarRange className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                মাসিক বিক্রি হিসাব (Monthly Sales & Financial Report)
              </h1>
              <p className="text-xs text-slate-500">
                ৫ কলামের পাশাপাশি লেআউটে নির্বাচিত মাসের প্রতিদিনের বিক্রি, লেস, খরচ, শর্ট এবং ড্যামেজ হিসাব
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleOpenPrintPreview(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition shadow-xs cursor-pointer"
              title="প্রিন্ট প্রিভিউ দেখুন"
            >
              <Eye className="h-4 w-4 text-sky-600" />
              <span>প্রিন্ট প্রিভিউ</span>
            </button>
          </div>
        </div>

        {/* Month + Year Selector Control Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                title="পূর্ববর্তী মাস"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                title="পরবর্তী মাস"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Month Select */}
            <div className="flex items-center gap-1">
              <label htmlFor="select-month" className="text-xs font-bold text-slate-600 sr-only">
                মাস নির্বাচন
              </label>
              <select
                id="select-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {BENGALI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.nameBn} ({m.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div className="flex items-center gap-1">
              <label htmlFor="select-year" className="text-xs font-bold text-slate-600 sr-only">
                বছর নির্বাচন
              </label>
              <select
                id="select-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-hidden cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Month Quick Button */}
            {(selectedYear !== currentYear || selectedMonth !== currentMonth) && (
              <button
                type="button"
                onClick={handleCurrentMonth}
                className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                চলতি মাস
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">নির্বাচিত সময়কাল:</span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 text-xs font-bold">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" />
              <span>{selectedMonthLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP METRIC SUMMARY CARDS (5 FIGURES: SALES, LESS, EXPENSE, SHORT, DAMAGE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Monthly Sales */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 font-bengali">
              ১. মোট বিক্রি (Sales)
            </span>
            <div className="rounded-lg bg-emerald-200/80 p-1.5 text-emerald-800">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-emerald-800">
            {currency} {totalMonthlySales.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            মোট {dailySalesData.length} দিনের বিক্রির হিসাব
          </p>
        </div>

        {/* Card 2: Total Monthly Less */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-950 font-bengali">
              ২. মোট লেস (Less)
            </span>
            <div className="rounded-lg bg-amber-200/80 p-1.5 text-amber-900">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-amber-900">
            {currency} {totalMonthlyLess.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-amber-800 font-medium">
            মোট {dailyLessData.length} দিনের লেস এন্ট্রি
          </p>
        </div>

        {/* Card 3: Total Monthly Expense */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-950 font-bengali">
              ৩. মোট খরচ (Expense)
            </span>
            <div className="rounded-lg bg-rose-200/80 p-1.5 text-rose-800">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-rose-800">
            {currency} {totalMonthlyExpense.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-rose-700 font-medium">
            মোট {dailyExpenseData.length} দিনের খরচের এন্ট্রি
          </p>
        </div>

        {/* Card 4: Total Monthly Short */}
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-950 font-bengali">
              ৪. মোট শর্ট (Short)
            </span>
            <div className="rounded-lg bg-orange-200/80 p-1.5 text-orange-800">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-orange-900">
            {currency} {totalMonthlyShort.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-orange-800 font-medium">
            মোট {dailyShortData.length} দিনের শর্ট হিসাব
          </p>
        </div>

        {/* Card 5: Total Monthly Damage */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-950 font-bengali">
              ৫. মোট ড্যামেজ (Damage)
            </span>
            <div className="rounded-lg bg-purple-200/80 p-1.5 text-purple-800">
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black font-mono text-purple-900">
            {currency} {totalMonthlyDamage.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-purple-800 font-medium">
            মোট {dailyDamageData.length} দিনের ড্যামেজ হিসাব
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-COLUMN SIDE-BY-SIDE RESPONSIVE LAYOUT */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 1: প্রতিদিনের বিক্রি হিসাব (Daily Sales) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="rounded-xl border border-emerald-200 bg-white shadow-xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-emerald-100 bg-emerald-50/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ১
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-bengali">
                  প্রতিদিনের বিক্রি হিসাব
                </h2>
                <p className="text-[10px] text-slate-500">Daily Sales, Date-wise</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
              {dailySalesData.length} দিন
            </span>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3.5 text-left">তারিখ (Date)</th>
                  <th className="py-2.5 px-3.5 text-right">বিক্রি (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailySalesData.map((item) => (
                  <tr key={item.date} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatDateBn(item.date)}
                        </span>
                      </div>
                      {item.routes && item.routes.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          {item.routes.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-xs sm:text-sm text-emerald-800">
                      {currency} {item.salesAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {dailySalesData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 text-xs">
                      এই মাসে কোনো বিক্রির রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Column Bottom Total */}
          <div className="border-t-2 border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center justify-between font-bold">
            <span className="text-xs font-black text-emerald-950 font-bengali uppercase">
              মোট বিক্রি:
            </span>
            <span className="font-mono font-black text-base text-emerald-800">
              {currency} {totalMonthlySales.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 2: প্রতিদিনের লেস হিসাব (Daily Less) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="rounded-xl border border-amber-200 bg-white shadow-xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                ২
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-bengali">
                  প্রতিদিনের লেস হিসাব
                </h2>
                <p className="text-[10px] text-slate-500">Daily Less, Date-wise</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
              {dailyLessData.length} দিন
            </span>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3.5 text-left">তারিখ (Date)</th>
                  <th className="py-2.5 px-3.5 text-right">লেস (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyLessData.map((item) => (
                  <tr key={item.date} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatDateBn(item.date)}
                        </span>
                      </div>
                      {item.descriptions && item.descriptions.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          {item.descriptions.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-xs sm:text-sm text-amber-900">
                      {currency} {item.lessAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {dailyLessData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 text-xs">
                      এই মাসে কোনো লেস রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Column Bottom Total */}
          <div className="border-t-2 border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between font-bold">
            <span className="text-xs font-black text-amber-950 font-bengali uppercase">
              মোট লেস:
            </span>
            <span className="font-mono font-black text-base text-amber-900">
              {currency} {totalMonthlyLess.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 3: প্রতিদিনের খরচ হিসাব (Daily Expense) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="rounded-xl border border-rose-200 bg-white shadow-xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-rose-100 bg-rose-50/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                ৩
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-bengali">
                  প্রতিদিনের খরচ হিসাব
                </h2>
                <p className="text-[10px] text-slate-500">Daily Expense, Date-wise</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md">
              {dailyExpenseData.length} দিন
            </span>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3.5 text-left">তারিখ (Date)</th>
                  <th className="py-2.5 px-3.5 text-right">খরচ (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyExpenseData.map((item) => (
                  <tr key={item.date} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatDateBn(item.date)}
                        </span>
                      </div>
                      {item.items && item.items.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          {item.items.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-xs sm:text-sm text-rose-800">
                      {currency} {item.expenseAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {dailyExpenseData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 text-xs">
                      এই মাসে কোনো খরচের রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Column Bottom Total */}
          <div className="border-t-2 border-rose-300 bg-rose-50 px-4 py-3 flex items-center justify-between font-bold">
            <span className="text-xs font-black text-rose-950 font-bengali uppercase">
              মোট খরচ:
            </span>
            <span className="font-mono font-black text-base text-rose-800">
              {currency} {totalMonthlyExpense.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 4: শর্ট হিসাব (Daily Short) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="rounded-xl border border-orange-200 bg-white shadow-xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-orange-100 bg-orange-50/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                ৪
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-bengali">
                  শর্ট (Short)
                </h2>
                <p className="text-[10px] text-slate-500">Daily Short, Date-wise</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-orange-800 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-md">
              {dailyShortData.length} দিন
            </span>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-left">তারিখ (Date)</th>
                  <th className="py-2.5 px-3 text-right">শর্ট (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyShortData.map((item) => (
                  <tr key={item.date} className="hover:bg-orange-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-3 w-3 text-orange-500 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatDateBn(item.date)}
                        </span>
                      </div>
                      {item.dsrs && item.dsrs.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                          {item.dsrs.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-xs sm:text-sm text-orange-900">
                      {currency} {item.shortAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {dailyShortData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 text-xs">
                      এই মাসে কোনো শর্ট রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Column Bottom Total */}
          <div className="border-t-2 border-orange-300 bg-orange-50 px-4 py-3 flex items-center justify-between font-bold">
            <span className="text-xs font-black text-orange-950 font-bengali uppercase">
              মোট শর্ট (এই মাসে):
            </span>
            <span className="font-mono font-black text-base text-orange-900">
              {currency} {totalMonthlyShort.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 5: ড্যামেজ হিসাব (Daily Damage) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="rounded-xl border border-purple-200 bg-white shadow-xs overflow-hidden flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-purple-100 bg-purple-50/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                ৫
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-bengali">
                  ড্যামেজ (Damage)
                </h2>
                <p className="text-[10px] text-slate-500">Daily Damage, Date-wise</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
              {dailyDamageData.length} দিন
            </span>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 text-left">তারিখ (Date)</th>
                  <th className="py-2.5 px-3 text-right">ড্যামেজ টাকা (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyDamageData.map((item) => (
                  <tr key={item.date} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <AlertOctagon className="h-3 w-3 text-purple-500 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {formatDateBn(item.date)}
                        </span>
                      </div>
                      {item.items && item.items.length > 0 && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                          {item.items.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-xs sm:text-sm text-purple-900">
                      {currency} {item.damageAmount.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {dailyDamageData.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400 text-xs">
                      এই মাসে কোনো ড্যামেজ রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Column Bottom Total */}
          <div className="border-t-2 border-purple-300 bg-purple-50 px-4 py-3 flex items-center justify-between font-bold">
            <span className="text-xs font-black text-purple-950 font-bengali uppercase">
              মোট ড্যামেজ (এই মাসে):
            </span>
            <span className="font-mono font-black text-base text-purple-900">
              {currency} {totalMonthlyDamage.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Sales Print Preview & Export Modal */}
      <MonthlySalesPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={db.settings}
        currency={currency}
        monthNameBn={selectedMonthObj?.nameBn || 'চলতি মাস'}
        year={selectedYear}
        dailySales={dailySalesData}
        dailyLess={dailyLessData}
        dailyExpense={dailyExpenseData}
        dailyShort={dailyShortData}
        dailyDamage={dailyDamageData}
        totalSales={totalMonthlySales}
        totalLess={totalMonthlyLess}
        totalExpense={totalMonthlyExpense}
        totalShort={totalMonthlyShort}
        totalDamage={totalMonthlyDamage}
        initialAction={printAction}
      />
    </div>
  );
};
