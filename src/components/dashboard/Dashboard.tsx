import React, { useState } from 'react';
import {
  TrendingUp,
  HandCoins,
  Wallet,
  Coins,
  Receipt,
  AlertTriangle,
  PlusCircle,
  FileDown,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../layout/Sidebar';
import { generateDailyReportPDF, generateSaleMemoPDF } from '../../services/pdfGenerator';
import { Customer, Sale, DailyAccountSheet } from '../../types';
import { BrandLogo } from '../brand/BrandLogo';
import { PinPromptModal } from '../modals/PinPromptModal';

interface DashboardProps {
  onNavigateTab: (tab: TabType) => void;
  onOpenQuickSale: () => void;
  onOpenQuickPayment: (customerId?: string) => void;
  onOpenAddCustomer: () => void;
  onOpenAddExpense: () => void;
  onViewMemo: (sale: Sale) => void;
  onOpenDailySheet?: (sheetId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateTab,
  onOpenQuickSale,
  onOpenQuickPayment,
  onOpenAddCustomer,
  onOpenAddExpense,
  onViewMemo,
  onOpenDailySheet,
}) => {
  const {
    db,
    currentUser,
    todaySales,
    todayCollection,
    todayNewDue,
    totalOutstandingDue,
    todayExpense,
    todayLessAmount,
    totalOutstandingLess,
    totalAllTimeLess,
    cashBalance,
    todayDateStr,
    customersWithDue,
    deleteDailySheet,
  } = useApp();

  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';
  const ownerPin =
    db.settings.ownerPin ||
    db.settings.securityPin ||
    db.users.find((u) => u.role === 'owner')?.pin ||
    '1234';

  const [dueSortOrder, setDueSortOrder] = useState<'desc' | 'asc'>('desc');

  // Deletion of duplicate/accidental Open/Pending Daily sheet
  const [sheetToDelete, setSheetToDelete] = useState<DailyAccountSheet | null>(null);
  const [isDeleteSheetPinOpen, setIsDeleteSheetPinOpen] = useState(false);
  const [deleteSuccessNotice, setDeleteSuccessNotice] = useState<string>('');

  const handleConfirmDeletePendingSheet = () => {
    if (!sheetToDelete) return;
    deleteDailySheet(sheetToDelete.id);
    setDeleteSuccessNotice(
      `চলমান খাতাটি (${sheetToDelete.routeOrVan || 'রুট'} - ${sheetToDelete.date}) সফলভাবে মুছে ফেলা হয়েছে`
    );
    setIsDeleteSheetPinOpen(false);
    setSheetToDelete(null);
    setTimeout(() => setDeleteSuccessNotice(''), 3500);
  };

  // Format today's date
  const formattedDate = React.useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString('bn-BD', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return todayDateStr;
    }
  }, [todayDateStr]);

  // SR today sales breakdown
  const srSummary = React.useMemo(() => {
    const todaySalesList = db.sales.filter((s) => s.date === todayDateStr && s.status === 'completed');
    const todayPaymentsList = db.payments.filter((p) => p.date === todayDateStr && p.status === 'completed');

    return db.salesRepresentatives.map((sr) => {
      const srSales = todaySalesList.filter((s) => s.srId === sr.id);
      const srPayments = todayPaymentsList.filter((p) => p.srId === sr.id);

      const uniqueCustomers = new Set(srSales.map((s) => s.customerId));
      const totalSales = srSales.reduce((sum, s) => sum + s.netSales, 0);
      const totalCollection = srPayments.reduce((sum, p) => sum + p.amount, 0);
      const newDue = srSales.reduce((sum, s) => sum + Math.max(0, s.netSales - s.paymentReceived), 0);

      return {
        id: sr.id,
        name: sr.name,
        territory: sr.territory,
        customerCount: uniqueCustomers.size,
        sales: totalSales,
        collection: totalCollection,
        newDue,
      };
    });
  }, [db.sales, db.payments, db.salesRepresentatives, todayDateStr]);

  // Combined recent transactions (sales + payments)
  const recentTransactions = React.useMemo(() => {
    const salesTx = db.sales.slice(0, 10).map((s) => ({
      id: s.id,
      refNo: s.memoNo,
      type: 'sale' as const,
      customer: s.shopName ? `${s.customerName} (${s.shopName})` : s.customerName,
      srName: s.srName,
      amount: s.netSales,
      dueChange: s.newDue - s.previousDue,
      status: s.status,
      date: s.date,
      time: s.createdAt,
      rawSale: s,
    }));

    const paymentTx = db.payments.slice(0, 10).map((p) => ({
      id: p.id,
      refNo: p.receiptNo,
      type: 'payment' as const,
      customer: p.shopName ? `${p.customerName} (${p.shopName})` : p.customerName,
      srName: p.srName || p.receivedBy,
      amount: p.amount,
      dueChange: -p.amount,
      status: p.status,
      date: p.date,
      time: p.createdAt,
      rawPayment: p,
    }));

    return [...salesTx, ...paymentTx]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 7);
  }, [db.sales, db.payments]);

  // Sorted due customers
  const sortedDueCustomers = React.useMemo(() => {
    const list = [...customersWithDue];
    if (dueSortOrder === 'desc') {
      list.sort((a, b) => b.currentDue - a.currentDue);
    } else {
      list.sort((a, b) => a.currentDue - b.currentDue);
    }
    return list.slice(0, 6);
  }, [customersWithDue, dueSortOrder]);

  // Open / pending daily account sheets
  const todayPendingDailySheets = React.useMemo(() => {
    return (db.dailySheets || []).filter(
      (s) => s.status === 'pending' || s.status === 'draft'
    );
  }, [db.dailySheets]);

  const handleDownloadPDF = () => {
    const todaySalesList = db.sales.filter((s) => s.date === todayDateStr && s.status === 'completed');
    const todayCollectionsList = db.payments
      .filter((p) => p.date === todayDateStr && p.status === 'completed')
      .map((p) => ({
        srName: p.srName || '-',
        amount: p.amount,
        customerName: p.shopName ? `${p.customerName} (${p.shopName})` : p.customerName,
        method: p.paymentMethod || 'cash',
      }));
    const todayExpensesList = db.expenses
      .filter((e) => e.date === todayDateStr && e.status === 'completed')
      .map((e) => ({
        category: e.category,
        amount: e.amount,
        description: e.description,
      }));

    generateDailyReportPDF(
      db.settings,
      todayDateStr,
      todaySalesList,
      todayCollectionsList,
      todayExpensesList,
      {
        totalSales: todaySales,
        totalCollection: todayCollection,
        totalNewDue: todayNewDue,
        totalExpense: todayExpense,
        netCash: todayCollection - todayExpense,
      },
    );
  };

  return (
    <div id="dashboard-module" className="space-y-6">
      {/* Top Banner: Prominent Date and Business Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandLogo size="lg" />
            <div className="hidden sm:block h-10 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2 text-emerald-700 font-medium text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>দৈনিক হিসাব বিবরণী ও ড্যাশবোর্ড</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-bengali">
                {formattedDate}
              </h2>
              <p className="text-xs text-slate-500">
                মালিক: {db.settings.proprietorName} • ফোন: {db.settings.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('daily-sale')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Daily হিসাব খুলুন</span>
            </button>
            <button
              id="dashboard-pdf-report-btn"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-slate-900 transition-colors"
            >
              <FileDown className="h-4 w-4 text-emerald-400" />
              <span>রিপোর্ট (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pending Daily Sheets Notice (Reopening Evening Returns) */}
      {todayPendingDailySheets.length > 0 && (
        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>আজকের চলমান হিসাব (Morning Distribution — Awaiting Return)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    {todayPendingDailySheets.length} টি চলমান
                  </span>
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  সন্ধ্যায় ভ্যান ফেরত আসার পর ফেরত (Return) এন্ট্রি ও চূড়ান্ত হিসাব সম্পন্ন করতে ক্লিক করুন
                </p>
              </div>
            </div>
          </div>

          {deleteSuccessNotice && (
            <div className="mb-3 rounded-xl bg-emerald-100/90 border border-emerald-300 p-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>{deleteSuccessNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayPendingDailySheets.map((sheet) => (
              <div
                key={sheet.id}
                className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-all gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      {sheet.routeOrVan || 'রুট চালান'}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      SR: <span className="font-semibold text-slate-800">{sheet.srName || '-'}</span> • DSR:{' '}
                      <span className="font-semibold text-slate-800">{sheet.dsrName || '-'}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">তারিখ: {sheet.date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      চলমান
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetToDelete(sheet);
                        setIsDeleteSheetPinOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ভুল বা ডুপ্লিকেট চলমান হিসাবটি মুছে ফেলুন (PIN আবশ্যক)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 font-medium">
                    মোট বিতরণ: <strong className="text-blue-700">{sheet.totalIssuedQty}</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenDailySheet) {
                          onOpenDailySheet(sheet.id);
                        } else {
                          onNavigateTab('daily-sale');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <span>ফেরত এন্ট্রি করুন</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Summary Cards (6 Key Metric Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {/* Today's Sales */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">আজকের মোট বিক্রয়</span>
            <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-slate-900 truncate">
            {currency} {todaySales.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Today's Sales</span>
        </div>

        {/* Today's Collection */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">আজকের টাকা আদায়</span>
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-blue-700 truncate">
            {currency} {todayCollection.toLocaleString()}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">Today's Collection</span>
        </div>

        {/* Today's New Due */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">আজকের নতুন বাকি</span>
            <div className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-amber-700 truncate">
            {currency} {todayNewDue.toLocaleString()}
          </p>
          <span className="text-[11px] text-amber-600 font-medium">Today's New Due</span>
        </div>

        {/* Total Outstanding Due */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-800">সর্বমোট বকেয়া (বাকি)</span>
            <div className="rounded-md bg-rose-100 p-1.5 text-rose-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-rose-700 truncate">
            {currency} {totalOutstandingDue.toLocaleString()}
          </p>
          <span className="text-[11px] text-rose-600 font-medium">Total Outstanding</span>
        </div>

        {/* Today's Expense */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">আজকের খরচ</span>
            <div className="rounded-md bg-purple-50 p-1.5 text-purple-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-purple-700 truncate">
            {currency} {todayExpense.toLocaleString()}
          </p>
          <span className="text-[11px] text-purple-600 font-medium">Today's Expense</span>
        </div>

        {/* Current Cash Balance */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-900">হাতে নগদ (Cash Balance)</span>
            <div className="rounded-md bg-emerald-100 p-1.5 text-emerald-700">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl font-bold text-emerald-800 truncate">
            {currency} {cashBalance.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Net Cash In Hand</span>
        </div>
      </div>

      {/* Less / Owner Advance Reference Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs shrink-0">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-950 font-bengali">
                লেস হিসাব রেফারেন্স (Owner Advance / Less)
              </span>
              <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 border border-amber-200">
                স্বতন্ত্র হিসাব
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80">
              মালিকের নিজস্ব পকেট থেকে পরিশোধিত অর্থ যা পরবর্তীতে ডিলার হতে সমন্বয়যোগ্য
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="rounded-lg bg-white px-3 py-1.5 border border-amber-200 text-right shadow-2xs">
            <span className="text-[10px] font-medium text-amber-700 block">আজকের লেস</span>
            <span className="text-sm font-bold text-amber-900">
              {currency} {todayLessAmount.toLocaleString()}
            </span>
          </div>

          <div className="rounded-lg bg-white px-3 py-1.5 border border-rose-200 text-right shadow-2xs">
            <span className="text-[10px] font-medium text-rose-700 block">মোট বকেয়া লেস</span>
            <span className="text-sm font-bold text-rose-900">
              {currency} {totalOutstandingLess.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('expenses')}
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200/90 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition"
            title="খরচ ও লেস মডিউলে যান"
          >
            <span>লেস তালিকা</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Buttons (Large & Accessible) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          দ্রুত অ্যাকশন (Quick Actions)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <button
            id="quick-action-new-sale"
            onClick={onOpenQuickSale}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-center hover:bg-emerald-100/70 hover:border-emerald-300 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-emerald-900 font-bengali">
                নতুন দৈনিক বিক্রয়
              </span>
              <span className="block text-[11px] text-emerald-700">New Daily Sale</span>
            </div>
          </button>

          <button
            id="quick-action-receive-payment"
            onClick={() => onOpenQuickPayment()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-center hover:bg-blue-100/70 hover:border-blue-300 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-blue-900 font-bengali">
                টাকা আদায় / জমা
              </span>
              <span className="block text-[11px] text-blue-700">Receive Payment</span>
            </div>
          </button>

          <button
            id="quick-action-add-customer"
            onClick={onOpenAddCustomer}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-center hover:bg-slate-100 hover:border-slate-300 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white shadow-xs group-hover:scale-105 transition-transform">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-800 font-bengali">
                নতুন কাস্টমার
              </span>
              <span className="block text-[11px] text-slate-600">Add Customer</span>
            </div>
          </button>

          {isOwner && (
            <button
              id="quick-action-add-expense"
              onClick={onOpenAddExpense}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50/60 p-4 text-center hover:bg-purple-100/70 hover:border-purple-300 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-sm font-bold text-purple-900 font-bengali">
                  খরচ এন্ট্রি
                </span>
                <span className="block text-[11px] text-purple-700">Add Expense</span>
              </div>
            </button>
          )}

          <button
            id="quick-action-today-pdf"
            onClick={handleDownloadPDF}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-center hover:bg-slate-100 hover:border-slate-300 transition-colors group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white shadow-xs group-hover:scale-105 transition-transform">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-800 font-bengali">
                আজকের PDF
              </span>
              <span className="block text-[11px] text-slate-600">Generate Report</span>
            </div>
          </button>
        </div>
      </div>

      {/* Two Column Section: SR Sales Summary & Due Alert */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Today's Sales Summary by SR (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-bengali">
                  আজকের সেলস সামারি (SR অনুযায়ী)
                </h3>
                <p className="text-xs text-slate-500">Today's Sales Summary by Sales Representative</p>
              </div>
              <button
                onClick={() => onNavigateTab('sr')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                বিস্তারিত দেখুন →
              </button>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                    <th className="py-2.5 px-3 font-semibold">SR নাম</th>
                    <th className="py-2.5 px-3 font-semibold text-center">দোকান সংখ্যা</th>
                    <th className="py-2.5 px-3 font-semibold text-right">বিক্রয়</th>
                    <th className="py-2.5 px-3 font-semibold text-right">আদায়</th>
                    <th className="py-2.5 px-3 font-semibold text-right">নতুন বাকি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {srSummary.map((sr) => (
                    <tr key={sr.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {sr.name}
                        <span className="block text-[10px] text-slate-400">{sr.territory}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 font-bold">
                          {sr.customerCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {currency} {sr.sales.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                        {currency} {sr.collection.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                        {currency} {sr.newDue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {srSummary.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        কোন SR তথ্য পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Due Alert (Top Outstanding Customers) (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-rose-50 p-1 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-bengali">
                    বকেয়া সতর্কতা (Due Alert)
                  </h3>
                  <p className="text-xs text-slate-500">শীর্ষ বকেয়া থাকা কাস্টমারদের তালিকা</p>
                </div>
              </div>
              <button
                onClick={() => setDueSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-1 rounded"
              >
                {dueSortOrder === 'desc' ? 'সর্বোচ্চ বাকি আগে ↓' : 'সর্বনিম্ন বাকি আগে ↑'}
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {sortedDueCustomers.map((cust) => (
                <div
                  key={cust.id}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{cust.shopName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {cust.name} • {cust.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-rose-700">
                      {currency} {cust.currentDue.toLocaleString()}
                    </span>
                    <button
                      id={`pay-due-btn-${cust.id}`}
                      onClick={() => onOpenQuickPayment(cust.id)}
                      className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                      title="টাকা আদায় রেকর্ড করুন"
                    >
                      আদায়
                    </button>
                  </div>
                </div>
              ))}
              {sortedDueCustomers.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400">
                  কোন কাস্টমারের বকেয়া নেই
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-right">
            <button
              onClick={() => onNavigateTab('due')}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              সকল {customersWithDue.length} জন বকেয়া কাস্টমার দেখুন →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-bengali">
              সাম্প্রতিক লেনদেন (Recent Transactions)
            </h3>
            <p className="text-xs text-slate-500">সর্বশেষ বিক্রয় ও টাকা আদায় রেকর্ড</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('daily-sale')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              সকল বিক্রয় →
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => onNavigateTab('due')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              সকল আদায় →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60">
                <th className="py-2.5 px-3 font-semibold">ধরণ / ভাউচার #</th>
                <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                <th className="py-2.5 px-3 font-semibold">কাস্টমার / দোকান</th>
                <th className="py-2.5 px-3 font-semibold">এস আর (SR)</th>
                <th className="py-2.5 px-3 font-semibold text-right">পরিমাণ</th>
                <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const isSale = tx.type === 'sale';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isSale ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isSale ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">{tx.refNo}</span>
                          <span className="block text-[10px] text-slate-500">
                            {isSale ? 'দৈনিক বিক্রয়' : 'টাকা আদায়'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{tx.date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{tx.customer}</td>
                    <td className="py-2.5 px-3 text-slate-500">{tx.srName || '-'}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        isSale ? 'text-emerald-700' : 'text-blue-700'
                      }`}
                    >
                      {currency} {tx.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {tx.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> সফল
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          <XCircle className="h-3 w-3" /> বাতিল
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isSale && tx.rawSale && (
                        <button
                          onClick={() => onViewMemo(tx.rawSale)}
                          className="text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                        >
                          মেমো দেখুন
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIN Prompt Modal for Deleting Open/Pending Daily Sheet */}
      <PinPromptModal
        isOpen={isDeleteSheetPinOpen}
        title="চলমান Daily হিসাব মুছে ফেলার নিশ্চিতকরণ"
        subtitle="ভুলবশত বা ডুপ্লিকেট তৈরি হওয়া এই চলমান হিসাবটি চিরতরে মুছে ফেলতে আপনার ওনার পিন (PIN) লিখুন।"
        itemName={
          sheetToDelete
            ? `${sheetToDelete.routeOrVan || 'রুট'} (তারিখ: ${sheetToDelete.date}, মোট বিতরণ: ${sheetToDelete.totalIssuedQty} পণ্য)`
            : ''
        }
        correctPin={ownerPin}
        confirmButtonText="হ্যাঁ, হিসাবটি মুছে ফেলুন"
        confirmButtonVariant="danger"
        onSuccess={handleConfirmDeletePendingSheet}
        onClose={() => {
          setIsDeleteSheetPinOpen(false);
          setSheetToDelete(null);
        }}
      />
    </div>
  );
};
