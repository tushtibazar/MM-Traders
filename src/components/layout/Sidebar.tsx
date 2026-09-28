import React from 'react';
import {
  LayoutDashboard,
  Calculator,
  CalendarRange,
  Landmark,
  Wallet,
  Users,
  BookOpen,
  UserCheck,
  Package,
  Boxes,
  Receipt,
  FileBarChart,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Coins,
  AlertOctagon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../brand/BrandLogo';

export type TabType =
  | 'dashboard'
  | 'daily-sale'
  | 'due'
  | 'products'
  | 'stock'
  | 'business-position'
  | 'monthly-sales'
  | 'less'
  | 'damage'
  | 'expenses'
  | 'sr'
  | 'customers'
  | 'ledger'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenAuthModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isMobileOpen,
  setIsMobileOpen,
  onOpenAuthModal,
}) => {
  const { currentUser, db, customersWithDue } = useApp();
  const isOwner = currentUser.role === 'owner';

  const navItems: {
    id: TabType;
    labelBn: string;
    labelEn: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    ownerOnly?: boolean;
  }[] = [
    {
      id: 'dashboard',
      labelBn: 'ড্যাশবোর্ড',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'daily-sale',
      labelBn: 'ডেইলি হিসাব',
      labelEn: 'Daily Sales Entry',
      icon: Calculator,
    },
    {
      id: 'due',
      labelBn: 'বাকি',
      labelEn: 'Outstanding Due',
      icon: Wallet,
      badge: customersWithDue.length,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'products',
      labelBn: 'পণ্য ও মূল্য',
      labelEn: 'Products & Price',
      icon: Package,
    },
    {
      id: 'stock',
      labelBn: 'স্টক',
      labelEn: 'Inventory / Stock',
      icon: Boxes,
      badge: db.products.filter((p) => !p.deletedFromStock && p.currentStock <= p.minStockAlert).length || undefined,
      badgeColor: 'bg-amber-500 text-white',
      ownerOnly: false,
    },
    {
      id: 'business-position',
      labelBn: 'ব্যবসার সার্বিক হিসাব',
      labelEn: 'Overall Business Position',
      icon: Landmark,
    },
    {
      id: 'monthly-sales',
      labelBn: 'মাসিক বিক্রি হিসাব',
      labelEn: 'Monthly Sales Report',
      icon: CalendarRange,
    },
    {
      id: 'less',
      labelBn: 'লেস হিসাব',
      labelEn: 'Less Account',
      icon: Coins,
      badge: db.lessEntries?.filter((e) => e.status === 'pending').length || undefined,
      badgeColor: 'bg-amber-600 text-white',
      ownerOnly: true,
    },
    {
      id: 'damage',
      labelBn: 'ড্যামেজ হিসাব',
      labelEn: 'Damage Account',
      icon: AlertOctagon,
      ownerOnly: true,
    },
    {
      id: 'expenses',
      labelBn: 'খরচ ও ব্যয়',
      labelEn: 'Business Expenses',
      icon: Receipt,
      ownerOnly: true,
    },
    {
      id: 'sr',
      labelBn: 'এসআর / সেলস রিপ্রেজেন্টেটিভ',
      labelEn: 'Sales Representatives',
      icon: UserCheck,
      ownerOnly: true,
    },
    {
      id: 'customers',
      labelBn: 'কাস্টমার তালিকা',
      labelEn: 'Customers',
      icon: Users,
    },
    {
      id: 'ledger',
      labelBn: 'কাস্টমার লেজার',
      labelEn: 'Customer Ledger',
      icon: BookOpen,
    },
    {
      id: 'reports',
      labelBn: 'রিপোর্ট ও পিডিএফ',
      labelEn: 'Reports & Export',
      icon: FileBarChart,
    },
    {
      id: 'settings',
      labelBn: 'Settings',
      labelEn: 'Settings & Data',
      icon: Settings,
      ownerOnly: true,
    },
  ];

  const filteredNav = navItems.filter((item) => !item.ownerOnly || isOwner);

  const handleSelect = (id: TabType) => {
    setCurrentTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <BrandLogo lightText size="md" />

          {/* Current User Pill */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-800/80 px-3 py-2 border border-slate-700/60">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  isOwner ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-blue-400 ring-4 ring-blue-400/20'
                }`}
              />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-100 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                  {isOwner ? 'Owner / Admin (পূর্ণ ক্ষমতা)' : 'Sales Representative (SR)'}
                </p>
              </div>
            </div>
            <button
              id="switch-role-btn"
              onClick={onOpenAuthModal}
              title="রোল পরিবর্তন করুন (Switch User)"
              className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full group flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <div className="truncate">
                    <span className="block leading-tight font-medium font-bengali text-sm">
                      {item.labelBn}
                    </span>
                    <span
                      className={`block text-[11px] leading-tight ${
                        isActive ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {item.labelEn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full ${
                        item.badgeColor || 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 text-emerald-200" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>মুদ্রা: {db.settings.currency} (BDT)</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> অফলাইন ও ক্লাউড সেভড
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
