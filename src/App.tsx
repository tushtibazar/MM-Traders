import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { DailySalesModule } from './components/daily-sales/DailySalesModule';
import { MonthlySalesModule } from './components/monthly-sales/MonthlySalesModule';
import { LessModule } from './components/less/LessModule';
import { DamageModule } from './components/damage/DamageModule';
import { BusinessPositionModule } from './components/business-position/BusinessPositionModule';
import { DueModule } from './components/due/DueModule';
import { CustomerList } from './components/customers/CustomerList';
import { CustomerLedger } from './components/customers/CustomerLedger';
import { SRModule } from './components/sr/SRModule';
import { ProductModule } from './components/products/ProductModule';
import { StockModule } from './components/stock/StockModule';
import { ExpenseModule } from './components/expenses/ExpenseModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { AuthModal } from './components/modals/AuthModal';
import { SaleMemoModal } from './components/modals/SaleMemoModal';
import { VoidModal } from './components/modals/VoidModal';
import { QuickPaymentModal } from './components/modals/QuickPaymentModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { Customer, Sale } from './types';

function MainLayout() {
  const { currentUser, isInitialized } = useApp();
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedSaleForMemo, setSelectedSaleForMemo] = useState<Sale | null>(null);
  const [voidModalState, setVoidModalState] = useState<{
    isOpen: boolean;
    type: 'sale' | 'payment';
    id: string;
    refNo: string;
  }>({
    isOpen: false,
    type: 'sale',
    id: '',
    refNo: '',
  });

  const [quickPaymentState, setQuickPaymentState] = useState<{
    isOpen: boolean;
    customerId?: string;
  }>({
    isOpen: false,
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [selectedDailySheetId, setSelectedDailySheetId] = useState<string | null>(null);

  // When clicking customer to open ledger
  const handleOpenLedger = (cust: Customer) => {
    setLedgerCustomer(cust);
    setCurrentTab('ledger');
  };

  const handleOpenVoidSale = (saleId: string, memoNo: string) => {
    setVoidModalState({
      isOpen: true,
      type: 'sale',
      id: saleId,
      refNo: memoNo,
    });
  };

  const handleOpenVoidPayment = (paymentId: string, receiptNo: string) => {
    setVoidModalState({
      isOpen: true,
      type: 'payment',
      id: paymentId,
      refNo: receiptNo,
    });
  };

  const handleOpenQuickPayment = (customerId?: string) => {
    setQuickPaymentState({
      isOpen: true,
      customerId,
    });
  };

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-medium">Dealer Business Manager লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab !== 'ledger') {
            // keep ledger customer if switched back, or null if navigating away
          }
          setCurrentTab(tab);
        }}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onQuickPaymentModal={() => handleOpenQuickPayment()}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {currentTab === 'dashboard' && (
              <Dashboard
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenQuickSale={() => setCurrentTab('daily-sale')}
                onOpenQuickPayment={(cId) => handleOpenQuickPayment(cId)}
                onOpenAddCustomer={() => setCurrentTab('customers')}
                onOpenAddExpense={() => setIsExpenseModalOpen(true)}
                onViewMemo={(s) => setSelectedSaleForMemo(s)}
                onOpenDailySheet={(sheetId) => {
                  setSelectedDailySheetId(sheetId);
                  setCurrentTab('daily-sale');
                }}
              />
            )}

            {currentTab === 'daily-sale' && (
              <DailySalesModule
                initialSheetId={selectedDailySheetId}
                onClearInitialSheetId={() => setSelectedDailySheetId(null)}
                onViewMemo={(s) => setSelectedSaleForMemo(s)}
                onOpenVoidModal={handleOpenVoidSale}
              />
            )}

            {currentTab === 'monthly-sales' && <MonthlySalesModule />}

            {currentTab === 'less' && currentUser.role === 'owner' && <LessModule />}

            {currentTab === 'damage' && currentUser.role === 'owner' && (
              <DamageModule
                onOpenDailySheet={(sheetId) => {
                  setSelectedDailySheetId(sheetId);
                  setCurrentTab('daily-sale');
                }}
                onNavigateToDailySales={() => setCurrentTab('daily-sale')}
              />
            )}

            {currentTab === 'business-position' && <BusinessPositionModule />}

            {currentTab === 'due' && (
              <DueModule
                onOpenQuickPayment={(cId) => handleOpenQuickPayment(cId)}
                onOpenCustomerLedger={handleOpenLedger}
              />
            )}

            {currentTab === 'customers' && (
              <CustomerList
                onSelectCustomer={handleOpenLedger}
                onOpenQuickPayment={(cId) => handleOpenQuickPayment(cId)}
              />
            )}

            {currentTab === 'ledger' && (
              <CustomerLedger
                customer={ledgerCustomer}
                onBackToList={() => setCurrentTab('customers')}
                onOpenQuickPayment={(cId) => handleOpenQuickPayment(cId)}
              />
            )}

            {currentTab === 'sr' && currentUser.role === 'owner' && <SRModule />}

            {currentTab === 'products' && <ProductModule />}

            {currentTab === 'stock' && <StockModule />}

            {currentTab === 'expenses' && currentUser.role === 'owner' && <ExpenseModule />}

            {currentTab === 'reports' && <ReportsModule />}

            {currentTab === 'settings' && currentUser.role === 'owner' && <SettingsModule />}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <SaleMemoModal
        sale={selectedSaleForMemo}
        onClose={() => setSelectedSaleForMemo(null)}
      />

      <VoidModal
        isOpen={voidModalState.isOpen}
        targetType={voidModalState.type}
        targetId={voidModalState.id}
        referenceNo={voidModalState.refNo}
        onClose={() =>
          setVoidModalState({
            isOpen: false,
            type: 'sale',
            id: '',
            refNo: '',
          })
        }
      />

      <QuickPaymentModal
        isOpen={quickPaymentState.isOpen}
        defaultCustomerId={quickPaymentState.customerId}
        onClose={() =>
          setQuickPaymentState({
            isOpen: false,
            customerId: undefined,
          })
        }
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
