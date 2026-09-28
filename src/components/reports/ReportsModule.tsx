import React, { useState } from 'react';
import {
  FileBarChart,
  FileDown,
  Calendar,
  Wallet,
  TrendingUp,
  HandCoins,
  Boxes,
  UserCheck,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  generateDailyReportPDF,
  generateMonthlyReportPDF,
  generateDueReportPDF,
  generateStockValuationPDF,
  generateSRPerformancePDF,
} from '../../services/pdfGenerator';

export const ReportsModule: React.FC = () => {
  const {
    db,
    currentUser,
    todaySales,
    todayCollection,
    todayNewDue,
    todayExpense,
    totalOutstandingDue,
    todayDateStr,
  } = useApp();

  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  const [reportDate, setReportDate] = useState(todayDateStr);
  const [reportMonth, setReportMonth] = useState(todayDateStr.slice(0, 7)); // YYYY-MM

  // Download Daily Report
  const handleDownloadDailyPDF = () => {
    const sales = db.sales.filter((s) => s.date === reportDate && s.status === 'completed');
    const collections = db.payments
      .filter((p) => p.date === reportDate && p.status === 'completed')
      .map((p) => ({
        srName: p.srName || '-',
        amount: p.amount,
        customerName: p.shopName ? `${p.customerName} (${p.shopName})` : p.customerName,
        method: p.paymentMethod || 'cash',
      }));
    const expenses = db.expenses
      .filter((e) => e.date === reportDate && e.status === 'completed')
      .map((e) => ({
        category: e.category,
        amount: e.amount,
        description: e.description,
      }));

    const totSales = sales.reduce((sum, s) => sum + s.netSales, 0);
    const totCollection = collections.reduce((sum, c) => sum + c.amount, 0);
    const totNewDue = sales.reduce((sum, s) => sum + Math.max(0, s.netSales - s.paymentReceived), 0);
    const totExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    generateDailyReportPDF(db.settings, reportDate, sales, collections, expenses, {
      totalSales: totSales,
      totalCollection: totCollection,
      totalNewDue: totNewDue,
      totalExpense: totExpense,
      netCash: totCollection - totExpense,
    });
  };

  // Download Monthly Report
  const handleDownloadMonthlyPDF = () => {
    const monthSales = db.sales.filter((s) => s.date.startsWith(reportMonth) && s.status === 'completed');
    const monthPayments = db.payments.filter((p) => p.date.startsWith(reportMonth) && p.status === 'completed');
    const monthExpenses = db.expenses.filter((e) => e.date.startsWith(reportMonth) && e.status === 'completed');

    const totSales = monthSales.reduce((sum, s) => sum + s.netSales, 0);
    const totCollection = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const totNewDue = monthSales.reduce((sum, s) => sum + Math.max(0, s.netSales - s.paymentReceived), 0);
    const totExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Group daily breakdown
    const daysMap = new Map<string, { sales: number; collection: number; newDue: number; expense: number }>();
    monthSales.forEach((s) => {
      const cur = daysMap.get(s.date) || { sales: 0, collection: 0, newDue: 0, expense: 0 };
      cur.sales += s.netSales;
      cur.newDue += Math.max(0, s.netSales - s.paymentReceived);
      daysMap.set(s.date, cur);
    });
    monthPayments.forEach((p) => {
      const cur = daysMap.get(p.date) || { sales: 0, collection: 0, newDue: 0, expense: 0 };
      cur.collection += p.amount;
      daysMap.set(p.date, cur);
    });
    monthExpenses.forEach((e) => {
      const cur = daysMap.get(e.date) || { sales: 0, collection: 0, newDue: 0, expense: 0 };
      cur.expense += e.amount;
      daysMap.set(e.date, cur);
    });

    const dailyBreakdown = Array.from(daysMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, val]) => ({
        date: d,
        sales: val.sales,
        collection: val.collection,
        newDue: val.newDue,
        expense: val.expense,
      }));

    const srStats = db.salesRepresentatives.map((sr) => {
      const srSales = monthSales.filter((s) => s.srId === sr.id);
      const srPayments = monthPayments.filter((p) => p.srId === sr.id);
      return {
        name: sr.name,
        sales: srSales.reduce((sum, s) => sum + s.netSales, 0),
        collections: srPayments.reduce((sum, p) => sum + p.amount, 0),
        newDue: srSales.reduce((sum, s) => sum + Math.max(0, s.netSales - s.paymentReceived), 0),
      };
    });

    generateMonthlyReportPDF(
      db.settings,
      reportMonth,
      {
        totalSales: totSales,
        totalCollection: totCollection,
        totalNewDue: totNewDue,
        totalExpense: totExpenses,
      },
      srStats,
    );
  };

  // Download Due PDF
  const handleDownloadDuePDF = () => {
    const dueCusts = db.customers.filter((c) => c.currentDue > 0);
    generateDueReportPDF(db.settings, dueCusts, totalOutstandingDue);
  };

  // Download Stock PDF
  const handleDownloadStockPDF = () => {
    generateStockValuationPDF(db.settings, db.products);
  };

  // Download SR PDF
  const handleDownloadSrPDF = () => {
    const list = db.salesRepresentatives.map((sr) => {
      const srSales = db.sales.filter((s) => s.srId === sr.id && s.status === 'completed');
      const srPayments = db.payments.filter((p) => p.srId === sr.id && p.status === 'completed');
      const customers = db.customers.filter((c) => c.assignedSrId === sr.id);

      return {
        name: sr.name,
        territory: sr.territory,
        customerCount: customers.length,
        sales: srSales.reduce((sum, s) => sum + s.netSales, 0),
        collection: srPayments.reduce((sum, p) => sum + p.amount, 0),
        due: customers.reduce((sum, c) => sum + c.currentDue, 0),
      };
    });

    generateSRPerformancePDF(db.settings, list);
  };

  return (
    <div id="reports-module" className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <FileBarChart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-bengali">
              ব্যবসায়িক রিপোর্ট ও PDF তৈরি (Reports)
            </h1>
            <p className="text-xs text-slate-500">
              দৈনিক হিসাব, মাসিক স্টেটমেন্ট, কাস্টমার বকেয়া তালিকা ও স্টক ভ্যালুয়েশন
            </p>
          </div>
        </div>
      </div>

      {/* Reports Grid (Cards for each report) */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Report 1: Daily Business Report */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Calendar className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-base">দৈনিক হিসাব রিপোর্ট (Daily Report)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              নির্দিষ্ট দিনের বিক্রয়, আদায়, নতুন বাকি, খরচ ও ক্যাশ জমার পূর্ণাঙ্গ প্রিন্ট উপযোগী বিবরণী।
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ নির্বাচন:</label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleDownloadDailyPDF}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <FileDown className="h-4 w-4" />
            <span>দৈনিক রিপোর্ট PDF ডাউনলোড</span>
          </button>
        </div>

        {/* Report 2: Monthly Business Report */}
        {isOwner && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-bold text-slate-900 text-base">মাসিক ব্যবসা রিপোর্ট (Monthly Report)</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                সম্পূর্ণ মাসের মোট বিক্রয়, মোট আদায়, পরিচালন ব্যয় ও দিনভিত্তিক ব্রেকডাউন সারসংক্ষেপ।
              </p>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">মাস নির্বাচন (YYYY-MM):</label>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleDownloadMonthlyPDF}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              <FileDown className="h-4 w-4" />
              <span>মাসিক রিপোর্ট PDF ডাউনলোড</span>
            </button>
          </div>
        )}

        {/* Report 3: Due Report */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Wallet className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-base">বাকি খাতা তালিকা (Outstanding Due)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              সকল কাস্টমারের বর্তমান বাকি, দোকান নাম, ফোন ও এরিয়া ভিত্তিক আদায়যোগ্য টাকার শীট।
            </p>

            <div className="rounded-lg bg-rose-50 p-3 border border-rose-100 text-xs mb-4">
              <span className="text-rose-700 block">বর্তমান মোট বাকি:</span>
              <strong className="text-rose-900 text-base font-bold">
                {currency} {totalOutstandingDue.toLocaleString()}
              </strong>
            </div>
          </div>

          <button
            onClick={handleDownloadDuePDF}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
          >
            <FileDown className="h-4 w-4" />
            <span>বকেয়া তালিকা PDF ডাউনলোড</span>
          </button>
        </div>

        {/* Report 4: Stock Valuation Report */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Boxes className="h-5 w-5" />
              <h3 className="font-bold text-slate-900 text-base">স্টক ভ্যালুয়েশন রিপোর্ট (Stock)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              গুদামের বর্তমান মজুদ পণ্যের পরিমাণ, ক্রয় ও বিক্রয় মূল্যের আর্থিক পরিমাপ বিবরণী।
            </p>

            <div className="rounded-lg bg-amber-50 p-3 border border-amber-100 text-xs mb-4">
              <span className="text-amber-800 block">মোট তালিকাভুক্ত পণ্য:</span>
              <strong className="text-amber-900 text-base font-bold">{db.products.length} ধরণের পণ্য</strong>
            </div>
          </div>

          <button
            onClick={handleDownloadStockPDF}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            <FileDown className="h-4 w-4" />
            <span>স্টক ভ্যালুয়েশন PDF ডাউনলোড</span>
          </button>
        </div>

        {/* Report 5: SR Performance Report */}
        {isOwner && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 mb-2">
                <UserCheck className="h-5 w-5" />
                <h3 className="font-bold text-slate-900 text-base">SR পারফরম্যান্স রিপোর্ট</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                মাঠ পর্যায়ের বিক্রয় প্রতিনিধিদের অর্জিত বিক্রয়, আদায় এবং তাঁদের এরিয়ার বাকি হিসাব।
              </p>

              <div className="rounded-lg bg-slate-100 p-3 border border-slate-200 text-xs mb-4">
                <span className="text-slate-600 block">মোট সক্রিয় এস আর:</span>
                <strong className="text-slate-900 text-base font-bold">
                  {db.salesRepresentatives.length} জন
                </strong>
              </div>
            </div>

            <button
              onClick={handleDownloadSrPDF}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-900"
            >
              <FileDown className="h-4 w-4" />
              <span>SR পারফরম্যান্স PDF ডাউনলোড</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
