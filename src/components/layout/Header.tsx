import React from 'react';
import {
  Menu,
  PlusCircle,
  HandCoins,
  FileDown,
  User,
  Wallet,
  Coins,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TabType } from './Sidebar';
import { generateDailyReportPDF } from '../../services/pdfGenerator';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenAuthModal: () => void;
  onQuickPaymentModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onNavigateTab,
  onOpenAuthModal,
  onQuickPaymentModal,
}) => {
  const {
    db,
    currentUser,
    todaySales,
    todayCollection,
    todayNewDue,
    todayExpense,
    cashBalance,
    totalOutstandingDue,
    todayDateStr,
  } = useApp();

  // Format today's date in Bengali and English
  const todayFormatted = React.useMemo(() => {
    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return now.toLocaleDateString('bn-BD', options);
    } catch {
      return todayDateStr;
    }
  }, [todayDateStr]);

  const handleDownloadTodayPDF = () => {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-xs">
      {/* Left section: Hamburger & Date */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-button"
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="মেনু খুলুন"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 font-bengali">
              {todayFormatted}
            </h2>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            {todayDateStr} • {db.settings.businessName}
          </p>
        </div>
      </div>

      {/* Center/Right: Key Quick Numbers & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick balance badge: Cash & Due */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 border border-emerald-200/60 text-xs">
            <Coins className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-slate-600">হাতে নগদ:</span>
            <span className="font-bold text-emerald-800">
              {db.settings.currency} {cashBalance.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 border border-rose-200/60 text-xs">
            <Wallet className="h-3.5 w-3.5 text-rose-600" />
            <span className="text-slate-600">মোট বাকি:</span>
            <span className="font-bold text-rose-800">
              {db.settings.currency} {totalOutstandingDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <button
          id="header-quick-sale-btn"
          onClick={() => onNavigateTab('daily-sale')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span className="hidden sm:inline">নতুন বিক্রয়</span>
          <span className="sm:hidden">বিক্রয়</span>
        </button>

        <button
          id="header-quick-pay-btn"
          onClick={() => {
            if (onQuickPaymentModal) {
              onQuickPaymentModal();
            } else {
              onNavigateTab('due');
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <HandCoins className="h-4 w-4" />
          <span className="hidden sm:inline">টাকা আদায়</span>
          <span className="sm:hidden">আদায়</span>
        </button>

        <button
          id="header-today-pdf-btn"
          onClick={handleDownloadTodayPDF}
          title="আজকের পূর্ণাঙ্গ PDF রিপোর্ট ডাউনলোড করুন"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
        >
          <FileDown className="h-4 w-4 text-slate-600" />
          <span className="hidden lg:inline">আজকের PDF</span>
        </button>

        {/* Role Switcher Button */}
        <button
          id="header-user-btn"
          onClick={onOpenAuthModal}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
          title="ইউজার পরিবর্তন বা লগআউট করুন"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700">
            <User className="h-3.5 w-3.5" />
          </div>
          <span className="max-w-[80px] sm:max-w-[110px] truncate font-medium">
            {currentUser.name.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
};
