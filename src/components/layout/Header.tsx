import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  PlusCircle,
  HandCoins,
  FileDown,
  User,
  Wallet,
  Coins,
  LogOut,
  Users,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TabType } from './Sidebar';
import { generateDailyReportPDF } from '../../services/pdfGenerator';
import { formatDate } from '../../utils/dateUtils';

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
    logout,
    todaySales,
    todayCollection,
    todayNewDue,
    todayExpense,
    cashBalance,
    totalOutstandingDue,
    todayDateStr,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

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
          <p className="text-[11px] sm:text-xs text-slate-500">
            {formatDate(todayDateStr)} • {db.settings.businessName}
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

        {/* User Account / Role Menu with Logout */}
        <div className="relative" ref={userMenuRef}>
          <button
            id="header-user-btn"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isUserMenuOpen
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="ইউজার একাউন্ট ও লগআউট মেনু"
            aria-expanded={isUserMenuOpen}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="max-w-[80px] sm:max-w-[110px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 z-50 animate-in fade-in zoom-in-95">
              {/* User info header */}
              <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate font-bengali">{currentUser.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      currentUser.role === 'owner' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-slate-500">
                    {currentUser.role === 'owner' ? 'Owner / Admin' : 'Sales Representative (SR)'}
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-0.5">
                <button
                  id="header-switch-user-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenAuthModal();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                >
                  <Users className="h-4 w-4 text-slate-500 shrink-0" />
                  <div>
                    <span className="block leading-tight font-bengali">ইউজার পরিবর্তন (Switch User)</span>
                    <span className="block text-[10px] text-slate-400">রোল বা একাউন্ট বদলান</span>
                  </div>
                </button>

                <button
                  id="header-logout-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="block leading-tight font-bengali">লগ আউট (Log Out)</span>
                    <span className="block text-[10px] text-rose-500/80">সেশন শেষ করে লগইন স্ক্রিনে ফিরুন</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
