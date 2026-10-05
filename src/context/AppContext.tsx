import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppDatabase,
  BusinessSettings,
  Customer,
  CustomerLedgerEntry,
  DailyAccountItem,
  DailyAccountSheet,
  Expense,
  LessEntry,
  LessSettlement,
  Payment,
  Product,
  Sale,
  SaleItem,
  SalesRepresentative,
  DeliveryRepresentative,
  StockTransaction,
  User,
} from '../types';
import { StorageService, DEFAULT_ROUTES } from '../services/storage';

interface AppContextType {
  db: AppDatabase;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchUserRole: (username: string, pin: string) => boolean;
  switchUser: (idOrUsername: string, pin: string) => boolean;
  isInitialized: boolean;
  refreshFromStorage: () => void;
  isLoggedIn: boolean;
  login: (userIdOrUsername: string, pin: string) => boolean;
  logout: () => void;

  // Business Actions
  addSale: (saleInput: {
    date: string;
    customerId: string;
    srId: string;
    items: {
      productId: string;
      quantity: number;
      returnQuantity: number;
      rate?: number;
      discount: number;
    }[];
    overallDiscount?: number;
    paymentReceived: number;
    paymentMethod?: 'cash' | 'bank' | 'mobile_banking' | 'other';
    note?: string;
  }) => Sale;
  voidSale: (saleId: string, reason: string) => boolean;

  addPayment: (paymentInput: {
    date: string;
    customerId: string;
    amount: number;
    paymentMethod: 'cash' | 'bank' | 'mobile_banking' | 'other';
    receivedBy?: string;
    srId?: string;
    note?: string;
  }) => Payment;
  voidPayment: (paymentId: string, reason: string) => boolean;

  recordCustomerDue: (input: {
    dueNo: string;
    customerId?: string;
    customerName: string;
    shopName?: string;
    address?: string;
    phone?: string;
    amount: number;
    date: string;
    routeOrVan?: string;
    note?: string;
  }) => { customer: Customer; dueNo: string; ledgerEntry: CustomerLedgerEntry };
  recordDueCollection: (input: {
    dueNo?: string;
    customerId: string;
    amount: number;
    date: string;
    receivedBy?: string;
    note?: string;
  }) => Payment;

  addCustomer: (customerInput: Omit<Customer, 'id' | 'currentDue' | 'createdAt' | 'updatedAt'>) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;

  // Less Tracking (Owner Advances for Business)
  addLessEntry: (input: { date: string; description: string; amount: number; status?: 'pending' | 'reimbursed'; note?: string; reimbursedDate?: string }) => LessEntry;
  updateLessStatus: (id: string, status: 'pending' | 'reimbursed', reimbursedDate?: string) => void;
  deleteLessEntry: (id: string) => void;
  addLessSettlement: (input: { date: string; amount: number; note?: string }) => LessSettlement;
  deleteLessSettlement: (id: string) => void;
  resetLessAccount: () => void;

  // Due Entry Actions (Settlement / Void with trace)
  settleDueEntry: (referenceId: string, note?: string) => void;
  voidDueEntry: (referenceId: string, note?: string) => void;

  addProduct: (productInput: Omit<Product, 'id' | 'currentStock' | 'createdAt'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;

  addStockInward: (productId: string, quantity: number, note: string) => void;
  addStockDamage: (productId: string, quantity: number, note: string) => void;
  adjustStock: (input: { productId: string; quantity: number; type: 'in' | 'out'; reason: string; date: string }) => void;
  deleteStockEntry: (productId: string) => void;

  addExpense: (expenseInput: Omit<Expense, 'id' | 'createdAt' | 'status'>) => Expense;
  voidExpense: (expenseId: string, reason: string) => void;
  deleteExpense: (expenseId: string) => void;

  // Daily Accounting Sheet Actions (Core Workflow)
  saveDailySheet: (
    sheetInput: Omit<DailyAccountSheet, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { id?: string },
    updateStock?: boolean
  ) => DailyAccountSheet;
  deleteDailySheet: (sheetId: string) => void;
  getDailySheetByDate: (date: string) => DailyAccountSheet | undefined;

  addSR: (srInput: Omit<SalesRepresentative, 'id' | 'createdAt'>) => SalesRepresentative;
  addSalesRepresentative: (srInput: Omit<SalesRepresentative, 'id' | 'createdAt'>) => SalesRepresentative;
  updateSalesRepresentative: (sr: SalesRepresentative) => void;
  addDSR: (dsrInput: Omit<DeliveryRepresentative, 'id' | 'createdAt'>) => DeliveryRepresentative;
  updateDSR: (dsr: DeliveryRepresentative) => void;
  deleteDSR: (dsrId: string) => void;
  updateSettings: (settings: BusinessSettings) => void;
  addRoute: (routeName: string) => void;
  updateRoute: (oldName: string, newName: string) => void;
  deleteRoute: (routeName: string) => void;

  resetToDemoData: () => void;
  resetToBlankData: () => void;
  importDatabase: (importedDb: AppDatabase) => void;

  // Computations
  todaySales: number;
  todayCollection: number;
  todayNewDue: number;
  totalOutstandingDue: number;
  todayExpense: number;
  todayLessAmount: number;
  totalOutstandingLess: number;
  totalAllTimeLess: number;
  cashBalance: number;
  todayDateStr: string;
  customersWithDue: Customer[];
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => StorageService.loadDatabase());
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return db.users.find((u) => u.role === 'owner') || db.users[0];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const stored = sessionStorage.getItem('mm_traders_session_active');
      if (stored === 'false') return false;
      return true;
    } catch {
      return true;
    }
  });

  const logout = () => {
    setIsLoggedIn(false);
    try {
      sessionStorage.setItem('mm_traders_session_active', 'false');
    } catch (e) {
      console.error(e);
    }
  };

  const login = (userIdOrUsername: string, pin: string): boolean => {
    const found = db.users.find(
      (u) =>
        u.id.toLowerCase() === userIdOrUsername.toLowerCase() ||
        u.username.toLowerCase() === userIdOrUsername.toLowerCase()
    );
    if (!found) return false;

    const validPins: string[] = [];
    if (found.pin) validPins.push(found.pin);
    if (found.role === 'owner') {
      if (db.settings.securityPin) validPins.push(db.settings.securityPin);
      if ((db.settings as any).ownerPin) validPins.push((db.settings as any).ownerPin);
    }
    if (validPins.length === 0) validPins.push('1234');

    if (validPins.includes(pin.trim())) {
      setCurrentUser(found);
      setIsLoggedIn(true);
      try {
        sessionStorage.setItem('mm_traders_session_active', 'true');
        sessionStorage.setItem('mm_traders_last_user_id', found.id);
      } catch (e) {
        console.error(e);
      }
      return true;
    }
    return false;
  };

  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Save to persistence on db changes
  const updateDb = (newDb: AppDatabase) => {
    setDb(newDb);
    StorageService.saveDatabase(newDb);
  };

  // Auto-sync any existing daily sheets that have marketExpense > 0 into db.expenses
  useEffect(() => {
    if (!db.dailySheets || db.dailySheets.length === 0) return;

    let hasChanges = false;
    let syncedExpenses = [...(db.expenses || [])];

    db.dailySheets.forEach((sheet) => {
      const expenseAmt = Number(sheet.marketExpense) || 0;
      const expenseId = `exp-sheet-${sheet.id}`;
      const existingIdx = syncedExpenses.findIndex(
        (e) => e.sheetId === sheet.id || e.id === expenseId
      );

      if (expenseAmt > 0) {
        if (existingIdx === -1) {
          hasChanges = true;
          syncedExpenses.push({
            id: expenseId,
            sheetId: sheet.id,
            referenceId: sheet.sheetNo || sheet.id,
            routeOrSr: `${sheet.routeOrVan || ''}${sheet.srName ? ` / SR: ${sheet.srName}` : ''}`,
            date: sheet.date,
            category: 'মার্কেট খরচ (Daily হিসাব)',
            amount: expenseAmt,
            description: `Daily হিসাব খরচ #${sheet.sheetNo || ''}${sheet.routeOrVan ? ` (রুট: ${sheet.routeOrVan})` : ''}${sheet.srName ? ` [SR: ${sheet.srName}]` : ''}`,
            paidFrom: 'cash',
            note: 'Daily হিসাব থেকে স্বয়ংক্রিয় এন্ট্রি',
            status: 'completed',
            createdAt: sheet.createdAt || new Date().toISOString(),
            createdBy: sheet.createdBy || 'Daily হিসাব',
          });
        }
      }
    });

    if (hasChanges) {
      updateDb({
        ...db,
        expenses: syncedExpenses,
      });
    }
  }, []);

  const switchUserRole = (username: string, pin: string): boolean => {
    const found = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (found && (!found.pin || found.pin === pin)) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  // 1. ADD SALE
  const addSale = (input: {
    date: string;
    customerId: string;
    srId: string;
    items: {
      productId: string;
      quantity: number;
      returnQuantity: number;
      rate?: number;
      discount: number;
    }[];
    overallDiscount?: number;
    paymentReceived: number;
    paymentMethod?: 'cash' | 'bank' | 'mobile_banking' | 'other';
    note?: string;
  }): Sale => {
    const customer = db.customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error('Customer not found');

    const sr = db.salesRepresentatives.find((s) => s.id === input.srId);
    const srName = sr ? sr.name : currentUser.name;

    // Sequence for memo number
    const dateCompact = input.date.replace(/-/g, '');
    const todaysCount = db.sales.filter((s) => s.date === input.date).length + 1;
    const memoNo = `MEMO-${dateCompact}-${String(todaysCount).padStart(3, '0')}`;
    const saleId = `sale-${Date.now()}`;

    // Process items
    let totalProductAmount = 0;
    let totalItemsDiscount = 0;

    const saleItems: SaleItem[] = input.items.map((itemInput, idx) => {
      const prod = db.products.find((p) => p.id === itemInput.productId);
      if (!prod) throw new Error(`Product ${itemInput.productId} not found`);

      const rate = itemInput.rate !== undefined ? itemInput.rate : prod.salePrice;
      const netQty = itemInput.quantity - itemInput.returnQuantity;
      const lineTotal = Math.max(0, netQty * rate - itemInput.discount);

      totalProductAmount += itemInput.quantity * rate;
      totalItemsDiscount += itemInput.discount;

      return {
        id: `item-${Date.now()}-${idx}`,
        productId: prod.id,
        productCode: prod.code,
        productName: prod.name,
        unit: prod.unit,
        rate,
        purchasePrice: prod.purchasePrice,
        quantity: itemInput.quantity,
        returnQuantity: itemInput.returnQuantity,
        discount: itemInput.discount,
        lineTotal,
      };
    });

    const extraDiscount = input.overallDiscount || 0;
    const totalDiscount = totalItemsDiscount + extraDiscount;
    const netSales = Math.max(0, saleItems.reduce((acc, it) => acc + it.lineTotal, 0) - extraDiscount);
    const paymentReceived = Number(input.paymentReceived) || 0;

    // Previous due
    const previousDue = customer.currentDue;
    // Formula: previousDue + netSales - paymentReceived = newDue
    const newDue = previousDue + netSales - paymentReceived;

    const newSale: Sale = {
      id: saleId,
      memoNo,
      date: input.date,
      customerId: customer.id,
      customerName: customer.name,
      shopName: customer.shopName,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      srId: input.srId,
      srName,
      previousDue,
      items: saleItems,
      totalProductAmount,
      totalDiscount,
      netSales,
      paymentReceived,
      newDue,
      paymentMethod: input.paymentMethod || 'cash',
      note: input.note,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    // Customer ledger entry for Sale (Debit)
    const ledgerSaleEntry: CustomerLedgerEntry = {
      id: `ledg-sale-${Date.now()}`,
      customerId: customer.id,
      date: input.date,
      type: 'sale',
      referenceId: memoNo,
      description: `বিক্রয় মেমো # ${memoNo} (${saleItems.length} টি পণ্য)`,
      debit: netSales,
      credit: 0,
      balance: previousDue + netSales,
      createdAt: new Date().toISOString(),
    };

    const newLedgers = [...db.customerLedgers, ledgerSaleEntry];
    const newPayments = [...db.payments];

    // If payment collected at time of sale
    if (paymentReceived > 0) {
      const payCount = db.payments.filter((p) => p.date === input.date).length + 1;
      const receiptNo = `PAY-${dateCompact}-${String(payCount).padStart(3, '0')}`;

      const newPayment: Payment = {
        id: `pay-${Date.now()}`,
        receiptNo,
        date: input.date,
        customerId: customer.id,
        customerName: customer.name,
        shopName: customer.shopName,
        srId: input.srId,
        srName,
        amount: paymentReceived,
        paymentMethod: input.paymentMethod || 'cash',
        receivedBy: `${srName} (${currentUser.role.toUpperCase()})`,
        saleId: saleId,
        note: `মেমো # ${memoNo} বিক্রয় জমা`,
        status: 'completed',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
      };

      newPayments.push(newPayment);

      // Customer ledger entry for Payment (Credit)
      const ledgerPayEntry: CustomerLedgerEntry = {
        id: `ledg-pay-${Date.now()}`,
        customerId: customer.id,
        date: input.date,
        type: 'payment',
        referenceId: receiptNo,
        description: `নগদ আদায় রশিদ # ${receiptNo} (${input.paymentMethod || 'নগদ'})`,
        debit: 0,
        credit: paymentReceived,
        balance: newDue,
        createdAt: new Date().toISOString(),
      };
      newLedgers.push(ledgerPayEntry);
    }

    // Update customer currentDue
    const updatedCustomers = db.customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          currentDue: newDue,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    // Update product stock and record stock transactions
    const newStockTransactions = [...db.stockTransactions];
    const updatedProducts = db.products.map((p) => {
      const soldItem = saleItems.find((it) => it.productId === p.id);
      if (soldItem) {
        const netQtySold = soldItem.quantity - soldItem.returnQuantity;
        const previousStock = p.currentStock;
        const newStock = previousStock - netQtySold;

        newStockTransactions.push({
          id: `st-${Date.now()}-${p.id}`,
          date: input.date,
          productId: p.id,
          productName: p.name,
          type: 'sale',
          quantity: -netQtySold,
          previousStock,
          newStock,
          referenceId: memoNo,
          note: `বিক্রয় মেমো # ${memoNo} (বিক্রয়: ${soldItem.quantity}, ফেরত: ${soldItem.returnQuantity})`,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.id,
        });

        return {
          ...p,
          currentStock: newStock,
        };
      }
      return p;
    });

    const newDb: AppDatabase = {
      ...db,
      sales: [newSale, ...db.sales],
      payments: newPayments,
      customers: updatedCustomers,
      products: updatedProducts,
      customerLedgers: newLedgers,
      stockTransactions: newStockTransactions,
    };

    updateDb(newDb);
    return newSale;
  };

  // 2. VOID SALE (Financial Reversal)
  const voidSale = (saleId: string, reason: string): boolean => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'void') return false;

    const customer = db.customers.find((c) => c.id === sale.customerId);
    if (!customer) return false;

    // Reverse customer balance:
    // When sale happened: due += (netSales - paymentReceived)
    // To reverse: due -= (netSales - paymentReceived)
    const netImpact = sale.netSales - sale.paymentReceived;
    const restoredDue = customer.currentDue - netImpact;

    // Reversal ledger entry
    const ledgerReversal: CustomerLedgerEntry = {
      id: `ledg-void-${Date.now()}`,
      customerId: customer.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'void_sale',
      referenceId: sale.memoNo,
      description: `[বাতিল/REVERSED] মেমো # ${sale.memoNo} বাতিলকরণ - কারণ: ${reason}`,
      debit: 0,
      credit: netImpact > 0 ? netImpact : 0,
      balance: restoredDue,
      createdAt: new Date().toISOString(),
    };

    // Reverse stock for items
    const newStockTransactions = [...db.stockTransactions];
    const updatedProducts = db.products.map((p) => {
      const item = sale.items.find((it) => it.productId === p.id);
      if (item) {
        const netQtySold = item.quantity - item.returnQuantity;
        const prevStock = p.currentStock;
        const newStock = prevStock + netQtySold;

        newStockTransactions.push({
          id: `st-void-${Date.now()}-${p.id}`,
          date: new Date().toISOString().slice(0, 10),
          productId: p.id,
          productName: p.name,
          type: 'void_reversal',
          quantity: netQtySold,
          previousStock: prevStock,
          newStock,
          referenceId: sale.memoNo,
          note: `মেমো # ${sale.memoNo} বাতিল করায় স্টক ফেরত`,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.id,
        });

        return { ...p, currentStock: newStock };
      }
      return p;
    });

    const updatedSales = db.sales.map((s) => {
      if (s.id === saleId) {
        return {
          ...s,
          status: 'void' as const,
          voidReason: reason,
          voidedAt: new Date().toISOString(),
          voidedBy: currentUser.name,
        };
      }
      return s;
    });

    const updatedCustomers = db.customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          currentDue: restoredDue,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    // Also void linked payment if any
    const updatedPayments = db.payments.map((pay) => {
      if (pay.saleId === saleId && pay.status !== 'void') {
        return {
          ...pay,
          status: 'void' as const,
          voidReason: `মেমো # ${sale.memoNo} বাতিলের কারণে পেমেন্ট বাতিল`,
          voidedAt: new Date().toISOString(),
          voidedBy: currentUser.name,
        };
      }
      return pay;
    });

    const newDb: AppDatabase = {
      ...db,
      sales: updatedSales,
      payments: updatedPayments,
      customers: updatedCustomers,
      products: updatedProducts,
      customerLedgers: [...db.customerLedgers, ledgerReversal],
      stockTransactions: newStockTransactions,
    };

    updateDb(newDb);
    return true;
  };

  // 3. ADD PAYMENT / COLLECTION
  const addPayment = (input: {
    date: string;
    customerId: string;
    amount: number;
    paymentMethod: 'cash' | 'bank' | 'mobile_banking' | 'other';
    receivedBy?: string;
    srId?: string;
    note?: string;
  }): Payment => {
    const customer = db.customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error('Customer not found');

    const dateCompact = input.date.replace(/-/g, '');
    const payCount = db.payments.filter((p) => p.date === input.date).length + 1;
    const receiptNo = `PAY-${dateCompact}-${String(payCount).padStart(3, '0')}`;
    const paymentId = `pay-${Date.now()}`;

    const amount = Number(input.amount) || 0;
    const previousDue = customer.currentDue;
    const currentDue = Math.max(0, previousDue - amount);

    const sr = db.salesRepresentatives.find((s) => s.id === (input.srId || customer.assignedSrId));

    const newPayment: Payment = {
      id: paymentId,
      receiptNo,
      date: input.date,
      customerId: customer.id,
      customerName: customer.name,
      shopName: customer.shopName,
      srId: sr ? sr.id : undefined,
      srName: sr ? sr.name : undefined,
      amount,
      paymentMethod: input.paymentMethod,
      receivedBy: input.receivedBy || currentUser.name,
      note: input.note,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    // Ledger entry for payment
    const ledgerEntry: CustomerLedgerEntry = {
      id: `ledg-pay-${Date.now()}`,
      customerId: customer.id,
      date: input.date,
      type: 'payment',
      referenceId: receiptNo,
      description: `টাকা আদায় রশিদ # ${receiptNo} (${input.paymentMethod}) ${input.note ? `- ${input.note}` : ''}`,
      debit: 0,
      credit: amount,
      balance: currentDue,
      createdAt: new Date().toISOString(),
    };

    const updatedCustomers = db.customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          currentDue,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    const newDb: AppDatabase = {
      ...db,
      payments: [newPayment, ...db.payments],
      customers: updatedCustomers,
      customerLedgers: [...db.customerLedgers, ledgerEntry],
    };

    updateDb(newDb);
    return newPayment;
  };

  // 4. VOID PAYMENT
  const voidPayment = (paymentId: string, reason: string): boolean => {
    const payment = db.payments.find((p) => p.id === paymentId);
    if (!payment || payment.status === 'void') return false;

    const customer = db.customers.find((c) => c.id === payment.customerId);
    if (!customer) return false;

    const restoredDue = customer.currentDue + payment.amount;

    const ledgerReversal: CustomerLedgerEntry = {
      id: `ledg-voidpay-${Date.now()}`,
      customerId: customer.id,
      date: new Date().toISOString().slice(0, 10),
      type: 'void_payment',
      referenceId: payment.receiptNo,
      description: `[বাতিল] আদায় রশিদ # ${payment.receiptNo} বাতিলকরণ - কারণ: ${reason}`,
      debit: payment.amount,
      credit: 0,
      balance: restoredDue,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = db.payments.map((p) => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: 'void' as const,
          voidReason: reason,
          voidedAt: new Date().toISOString(),
          voidedBy: currentUser.name,
        };
      }
      return p;
    });

    const updatedCustomers = db.customers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          currentDue: restoredDue,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    const newDb: AppDatabase = {
      ...db,
      payments: updatedPayments,
      customers: updatedCustomers,
      customerLedgers: [...db.customerLedgers, ledgerReversal],
    };

    updateDb(newDb);
    return true;
  };

  // 4b. CENTRALIZED DUE FLOW FROM DAILY HISHAB
  const recordCustomerDue = (input: {
    dueNo: string;
    customerId?: string;
    customerName: string;
    shopName?: string;
    address?: string;
    phone?: string;
    amount: number;
    date: string;
    routeOrVan?: string;
    note?: string;
  }): { customer: Customer; dueNo: string; ledgerEntry: CustomerLedgerEntry } => {
    const amount = Number(input.amount) || 0;
    let targetCustomer: Customer | undefined;

    if (input.customerId) {
      targetCustomer = db.customers.find((c) => c.id === input.customerId);
    }

    if (!targetCustomer && (input.shopName || input.customerName)) {
      const searchName = (input.shopName || input.customerName || '').trim().toLowerCase();
      targetCustomer = db.customers.find(
        (c) =>
          c.shopName.toLowerCase() === searchName ||
          c.name.toLowerCase() === searchName
      );
    }

    let updatedCustomers = [...db.customers];
    let customer: Customer;

    if (!targetCustomer) {
      // Auto-create new customer inline
      const newCustId = `cust-${Date.now()}`;
      customer = {
        id: newCustId,
        name: input.customerName || input.shopName || 'নতুন কাস্টমার',
        shopName: input.shopName || input.customerName || 'নতুন দোকান',
        phone: input.phone || '',
        address: input.address || input.routeOrVan || '',
        assignedSrId: '',
        assignedSrName: '',
        openingBalance: 0,
        currentDue: amount,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedCustomers = [customer, ...updatedCustomers];
    } else {
      const newDue = targetCustomer.currentDue + amount;
      customer = {
        ...targetCustomer,
        currentDue: newDue,
        updatedAt: new Date().toISOString(),
      };
      updatedCustomers = updatedCustomers.map((c) => (c.id === customer.id ? customer : c));
    }

    const ledgerEntry: CustomerLedgerEntry = {
      id: `ledg-due-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerId: customer.id,
      date: input.date,
      type: 'sale',
      referenceId: input.dueNo,
      description: input.note
        ? `${input.note}${input.routeOrVan ? ` (${input.routeOrVan})` : ''}`
        : `বাকি হিসাব # ${input.dueNo}${input.routeOrVan ? ` (${input.routeOrVan})` : ''}`,
      debit: amount,
      credit: 0,
      balance: customer.currentDue,
      createdAt: new Date().toISOString(),
    };

    updateDb({
      ...db,
      customers: updatedCustomers,
      customerLedgers: [...db.customerLedgers, ledgerEntry],
    });

    return { customer, dueNo: input.dueNo, ledgerEntry };
  };

  const recordDueCollection = (input: {
    dueNo?: string;
    customerId: string;
    amount: number;
    date: string;
    receivedBy?: string;
    note?: string;
  }): Payment => {
    const amount = Number(input.amount) || 0;
    const customer = db.customers.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error('কাস্টমার পাওয়া যায়নি');
    }

    const newDue = Math.max(0, customer.currentDue - amount);
    const receiptNo = `REC-${input.dueNo || Date.now().toString().slice(-6)}`;

    const newPayment: Payment = {
      id: `pay-due-${Date.now()}`,
      receiptNo,
      date: input.date,
      customerId: customer.id,
      customerName: customer.name,
      shopName: customer.shopName,
      amount,
      paymentMethod: 'cash',
      receivedBy: input.receivedBy || currentUser.name,
      note: input.note || `বাকি আদায় (${input.dueNo ? `Due #${input.dueNo}` : 'দৈনিক হিসাব'})`,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    const ledgerEntry: CustomerLedgerEntry = {
      id: `ledg-pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerId: customer.id,
      date: input.date,
      type: 'payment',
      referenceId: input.dueNo || receiptNo,
      description: `বাকি জমা # ${input.dueNo || receiptNo} (${customer.shopName || customer.name})`,
      debit: 0,
      credit: amount,
      balance: newDue,
      createdAt: new Date().toISOString(),
    };

    const updatedCustomers = db.customers.map((c) =>
      c.id === customer.id
        ? {
            ...c,
            currentDue: newDue,
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    updateDb({
      ...db,
      payments: [newPayment, ...db.payments],
      customers: updatedCustomers,
      customerLedgers: [...db.customerLedgers, ledgerEntry],
    });

    return newPayment;
  };

  // 5. CUSTOMER CRUD
  const addCustomer = (input: Omit<Customer, 'id' | 'currentDue' | 'createdAt' | 'updatedAt'>): Customer => {
    const custId = `cust-${Date.now()}`;
    const openingBalance = Number(input.openingBalance) || 0;

    const newCustomer: Customer = {
      ...input,
      id: custId,
      openingBalance,
      currentDue: openingBalance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newLedgers = [...db.customerLedgers];
    if (openingBalance > 0) {
      newLedgers.push({
        id: `ledg-open-${Date.now()}`,
        customerId: custId,
        date: new Date().toISOString().slice(0, 10),
        type: 'opening',
        referenceId: 'OPENING',
        description: 'প্রারম্ভিক বকেয়া ব্যালেন্স (Opening Due)',
        debit: openingBalance,
        credit: 0,
        balance: openingBalance,
        createdAt: new Date().toISOString(),
      });
    }

    const newDb: AppDatabase = {
      ...db,
      customers: [newCustomer, ...db.customers],
      customerLedgers: newLedgers,
    };

    updateDb(newDb);
    return newCustomer;
  };

  const updateCustomer = (customer: Customer) => {
    const updated = db.customers.map((c) => (c.id === customer.id ? { ...customer, updatedAt: new Date().toISOString() } : c));
    updateDb({ ...db, customers: updated });
  };

  const deleteCustomer = (customerId: string) => {
    const customerToDelete = db.customers.find((c) => c.id === customerId);
    const updatedCustomers = db.customers.filter((c) => c.id !== customerId);
    // Annotate customer ledger entries to preserve audit trail without orphaning
    const updatedLedgers = (db.customerLedgers || []).map((l) =>
      l.customerId === customerId
        ? {
            ...l,
            description: `${l.description} [মুছে ফেলা কাস্টমার: ${customerToDelete?.shopName || customerToDelete?.name || customerId}]`,
          }
        : l
    );
    updateDb({
      ...db,
      customers: updatedCustomers,
      customerLedgers: updatedLedgers,
    });
  };

  // Less Tracking Actions (Owner advances to be reimbursed)
  const addLessEntry = (input: {
    date: string;
    description: string;
    amount: number;
    status?: 'pending' | 'reimbursed';
    note?: string;
    reimbursedDate?: string;
  }): LessEntry => {
    const newLess: LessEntry = {
      id: `less-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: input.date,
      description: input.description,
      amount: Number(input.amount) || 0,
      status: input.status || 'pending',
      note: input.note,
      reimbursedDate: input.reimbursedDate || (input.status === 'reimbursed' ? input.date : undefined),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };

    updateDb({
      ...db,
      lessEntries: [newLess, ...(db.lessEntries || [])],
    });
    return newLess;
  };

  const updateLessStatus = (id: string, status: 'pending' | 'reimbursed', reimbursedDate?: string) => {
    const updated = (db.lessEntries || []).map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          reimbursedDate: status === 'reimbursed' ? (reimbursedDate || new Date().toISOString().slice(0, 10)) : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    updateDb({ ...db, lessEntries: updated });
  };

  const deleteLessEntry = (id: string) => {
    const updated = (db.lessEntries || []).filter((item) => item.id !== id);
    updateDb({ ...db, lessEntries: updated });
  };

  const addLessSettlement = (input: {
    date: string;
    amount: number;
    note?: string;
  }): LessSettlement => {
    const newSettlement: LessSettlement = {
      id: `lset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: input.date,
      amount: Number(input.amount) || 0,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };

    updateDb({
      ...db,
      lessSettlements: [newSettlement, ...(db.lessSettlements || [])],
    });
    return newSettlement;
  };

  const deleteLessSettlement = (id: string) => {
    const updated = (db.lessSettlements || []).filter((item) => item.id !== id);
    updateDb({ ...db, lessSettlements: updated });
  };

  const resetLessAccount = () => {
    updateDb({
      ...db,
      lessEntries: [],
      lessSettlements: [],
    });
  };

  // Due Entry Actions (Settlement & Void with history trace)
  const settleDueEntry = (referenceId: string, note?: string) => {
    const match = (db.customerLedgers || []).find(
      (l) => (l.id === referenceId || l.referenceId === referenceId) && l.debit > 0
    );
    if (!match) return;
    const customer = db.customers.find((c) => c.id === match.customerId);
    if (!customer) return;

    const dueAmount = match.debit;
    const newDue = Math.max(0, customer.currentDue - dueAmount);
    const today = new Date().toISOString().slice(0, 10);

    // Update original entry status
    const updatedLedgers = (db.customerLedgers || []).map((l) => {
      if (l.id === match.id) {
        return {
          ...l,
          status: 'settled' as const,
          settledDate: today,
          settledNote: note || 'মালিক কর্তৃক সম্পূর্ণ নিষ্পত্তি',
        };
      }
      return l;
    });

    // Add explicit audit trace entry
    const traceEntry: CustomerLedgerEntry = {
      id: `ledg-settle-${Date.now()}`,
      customerId: customer.id,
      date: today,
      type: 'settled_due',
      referenceId,
      description: `বাকি নিষ্পত্তি (Settled): #${referenceId}${note ? ` (${note})` : ''}`,
      debit: 0,
      credit: dueAmount,
      balance: newDue,
      status: 'settled',
      settledDate: today,
      settledNote: note || 'মালিক কর্তৃক সম্পূর্ণ নিষ্পত্তি',
      createdAt: new Date().toISOString(),
    };

    const updatedCustomers = db.customers.map((c) =>
      c.id === customer.id ? { ...c, currentDue: newDue, updatedAt: new Date().toISOString() } : c
    );

    updateDb({
      ...db,
      customers: updatedCustomers,
      customerLedgers: [...updatedLedgers, traceEntry],
    });
  };

  const voidDueEntry = (referenceId: string, note?: string) => {
    const match = (db.customerLedgers || []).find(
      (l) => (l.id === referenceId || l.referenceId === referenceId) && l.debit > 0
    );
    if (!match) return;
    const customer = db.customers.find((c) => c.id === match.customerId);
    if (!customer) return;

    const dueAmount = match.debit;
    const newDue = Math.max(0, customer.currentDue - dueAmount);
    const today = new Date().toISOString().slice(0, 10);

    // Mark original entry as voided
    const updatedLedgers = (db.customerLedgers || []).map((l) => {
      if (l.id === match.id) {
        return {
          ...l,
          status: 'voided' as const,
          settledDate: today,
          settledNote: note || 'ভুলবশত এন্ট্রি বাতিল/মুছে ফেলা',
        };
      }
      return l;
    });

    // Add audit trace entry
    const traceEntry: CustomerLedgerEntry = {
      id: `ledg-voiddue-${Date.now()}`,
      customerId: customer.id,
      date: today,
      type: 'void_due',
      referenceId,
      description: `ভুলবশত এন্ট্রি বাতিল/মুছে ফেলা: #${referenceId}${note ? ` (${note})` : ''}`,
      debit: 0,
      credit: dueAmount,
      balance: newDue,
      status: 'voided',
      settledDate: today,
      settledNote: note || 'ভুলবশত এন্ট্রি বাতিল/মুছে ফেলা',
      createdAt: new Date().toISOString(),
    };

    const updatedCustomers = db.customers.map((c) =>
      c.id === customer.id ? { ...c, currentDue: newDue, updatedAt: new Date().toISOString() } : c
    );

    updateDb({
      ...db,
      customers: updatedCustomers,
      customerLedgers: [...updatedLedgers, traceEntry],
    });
  };

  // 6. PRODUCT CRUD
  const addProduct = (input: Omit<Product, 'id' | 'currentStock' | 'createdAt'>): Product => {
    const prodId = `prod-${Date.now()}`;
    const openingStock = Number(input.openingStock) || 0;

    const newProduct: Product = {
      ...input,
      id: prodId,
      purchasePrice: Number(input.purchasePrice) || 0,
      salePrice: Number(input.salePrice) || 0,
      openingStock,
      currentStock: openingStock,
      minStockAlert: Number(input.minStockAlert) || 5,
      createdAt: new Date().toISOString(),
    };

    const newStockTransactions = [...db.stockTransactions];
    if (openingStock > 0) {
      newStockTransactions.push({
        id: `st-open-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        productId: prodId,
        productName: newProduct.name,
        type: 'purchase',
        quantity: openingStock,
        previousStock: 0,
        newStock: openingStock,
        note: 'প্রারম্ভিক স্টক এন্ট্রি',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
      });
    }

    const newDb: AppDatabase = {
      ...db,
      products: [newProduct, ...db.products],
      stockTransactions: newStockTransactions,
    };

    updateDb(newDb);
    return newProduct;
  };

  const updateProduct = (product: Product) => {
    const updated = db.products.map((p) => (p.id === product.id ? product : p));
    updateDb({ ...db, products: updated });
  };

  const deleteProduct = (productId: string) => {
    const updated = db.products.filter((p) => p.id !== productId);
    updateDb({ ...db, products: updated });
  };

  // 7. STOCK MOVEMENTS
  const addStockInward = (productId: string, quantity: number, note: string) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;

    const qty = Number(quantity) || 0;
    const prev = prod.currentStock;
    const next = prev + qty;

    const newTx: StockTransaction = {
      id: `st-in-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      productId: prod.id,
      productName: prod.name,
      type: 'purchase',
      quantity: qty,
      previousStock: prev,
      newStock: next,
      note: note || 'নতুন স্টক যোগ / ক্রয়',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    const updatedProducts = db.products.map((p) =>
      p.id === productId ? { ...p, currentStock: next, deletedFromStock: false } : p
    );
    updateDb({
      ...db,
      products: updatedProducts,
      stockTransactions: [newTx, ...db.stockTransactions],
    });
  };

  const deleteStockEntry = (productId: string) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;

    const prevStock = prod.currentStock;
    const newTx: StockTransaction = {
      id: `st-del-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      productId: prod.id,
      productName: prod.name,
      type: 'adjustment',
      quantity: -prevStock,
      previousStock: prevStock,
      newStock: 0,
      note: 'গুদাম স্টক তালিকা থেকে রেকর্ড অপসারিত / ডিলিট করা হয়েছে',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    const updatedProducts = db.products.map((p) =>
      p.id === productId ? { ...p, currentStock: 0, deletedFromStock: true } : p
    );

    updateDb({
      ...db,
      products: updatedProducts,
      stockTransactions: [newTx, ...db.stockTransactions],
    });
  };

  const addStockDamage = (productId: string, quantity: number, note: string) => {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;

    const qty = Math.abs(Number(quantity) || 0);
    const prev = prod.currentStock;
    const next = Math.max(0, prev - qty);

    const newTx: StockTransaction = {
      id: `st-dmg-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      productId: prod.id,
      productName: prod.name,
      type: 'damage',
      quantity: -qty,
      previousStock: prev,
      newStock: next,
      note: note || 'নষ্ট / ক্ষতিপূরণ স্টক বাদ',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    const updatedProducts = db.products.map((p) => (p.id === productId ? { ...p, currentStock: next } : p));
    updateDb({
      ...db,
      products: updatedProducts,
      stockTransactions: [newTx, ...db.stockTransactions],
    });
  };

  // 8. EXPENSES
  const addExpense = (input: Omit<Expense, 'id' | 'createdAt' | 'status'>): Expense => {
    const newExpense: Expense = {
      ...input,
      id: `exp-${Date.now()}`,
      amount: Number(input.amount) || 0,
      status: 'completed',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };

    updateDb({
      ...db,
      expenses: [newExpense, ...db.expenses],
    });
    return newExpense;
  };

  const voidExpense = (expenseId: string, reason: string) => {
    const updated = db.expenses.map((e) => {
      if (e.id === expenseId) {
        return {
          ...e,
          status: 'void' as const,
          note: `${e.note || ''} (বাতিল কারণ: ${reason})`,
        };
      }
      return e;
    });
    updateDb({ ...db, expenses: updated });
  };

  const deleteExpense = (expenseId: string) => {
    const updated = (db.expenses || []).filter((e) => e.id !== expenseId);
    updateDb({ ...db, expenses: updated });
  };

  // Daily Accounting Sheet Actions (Core Workflow)
  const saveDailySheet = (
    input: Omit<DailyAccountSheet, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { id?: string },
    updateStock: boolean = true
  ): DailyAccountSheet => {
    const sheetId = input.id || `das-${input.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const existingSheet = (db.dailySheets || []).find((s) => s.id === sheetId);

    // Recalculate totals defensively
    const totalIssuedQty = input.items.reduce((sum, i) => sum + (Number(i.issuedQty) || 0), 0);
    const totalReturnQty = input.items.reduce((sum, i) => sum + (Number(i.returnQty) || 0), 0);
    const totalNetSoldQty = input.items.reduce((sum, i) => sum + (Number(i.netSoldQty) || 0), 0);
    const totalGrossAmount = input.items.reduce((sum, i) => sum + (Number(i.grossAmount) || 0), 0);
    const totalDamageQty = input.items.reduce((sum, i) => sum + (Number(i.damageQty) || 0), 0);
    const totalDamageValue = input.items.reduce((sum, i) => sum + (Number(i.damageValue) || 0), 0);
    const finalNetSalesAmount = Math.max(0, totalGrossAmount - totalDamageValue);

    const cashCollected = Number(input.cashCollected) || 0;
    const marketExpense = Number(input.marketExpense) || 0;
    const netCashSubmitted = cashCollected - marketExpense;
    const marketDue = Math.max(0, finalNetSalesAmount - cashCollected);

    const nowIso = new Date().toISOString();
    const newSheet: DailyAccountSheet = {
      ...input,
      id: sheetId,
      sheetNo: input.sheetNo || `DAS-${input.date.replace(/-/g, '')}-001`,
      totalIssuedQty,
      totalReturnQty,
      totalNetSoldQty,
      totalGrossAmount,
      totalDamageQty,
      totalDamageValue,
      finalNetSalesAmount,
      cashCollected,
      marketExpense,
      netCashSubmitted,
      marketDue,
      status: input.status || 'confirmed',
      createdAt: existingSheet ? existingSheet.createdAt : nowIso,
      updatedAt: nowIso,
      createdBy: currentUser.name,
    };

    // Manage product stock adjustments
    let updatedProducts = [...db.products];
    const newStockTransactions: StockTransaction[] = [];

    const isNowFinalized = newSheet.status === 'confirmed' || newSheet.status === 'completed';
    const wasPreviouslyFinalized = existingSheet && (existingSheet.status === 'confirmed' || existingSheet.status === 'completed');

    if (updateStock && isNowFinalized) {
      // If previous sheet was confirmed/completed, revert old stock changes first
      if (wasPreviouslyFinalized) {
        existingSheet.items.forEach((oldItem) => {
          const pIndex = updatedProducts.findIndex((p) => p.id === oldItem.productId);
          if (pIndex !== -1) {
            const prev = updatedProducts[pIndex];
            const ratio = prev.piecesPerCarton || prev.cartonQty || 1;
            const isCartonStock = (prev.unit === 'কার্টন' || prev.unit === 'কার্টুন') && ratio > 1;
            const prevNetPieces = (oldItem.issuedQty !== undefined && oldItem.returnQty !== undefined)
              ? Math.max(0, oldItem.issuedQty - oldItem.returnQty)
              : (oldItem.issuedUnit === 'C' ? (oldItem.netSoldQty || 0) * ratio : (oldItem.netSoldQty || 0));
            const pieces = prevNetPieces + (oldItem.damageQty || 0);
            const restoredUnits = isCartonStock ? pieces / ratio : pieces;
            const restored = Math.round((prev.currentStock + restoredUnits) * 100) / 100;
            updatedProducts[pIndex] = { ...prev, currentStock: restored };
          }
        });
      }

      // Apply new stock deductions
      newSheet.items.forEach((newItem) => {
        const pIndex = updatedProducts.findIndex((p) => p.id === newItem.productId);
        if (pIndex !== -1) {
          const prod = updatedProducts[pIndex];
          const ratio = prod.piecesPerCarton || prod.cartonQty || 1;
          const isCartonStock = (prod.unit === 'কার্টন' || prod.unit === 'কার্টুন') && ratio > 1;
          const netPieces = (newItem.issuedQty !== undefined && newItem.returnQty !== undefined)
            ? Math.max(0, newItem.issuedQty - newItem.returnQty)
            : (newItem.issuedUnit === 'C' ? (newItem.netSoldQty || 0) * ratio : (newItem.netSoldQty || 0));
          const piecesSold = netPieces + (newItem.damageQty || 0);
          const deduction = isCartonStock ? piecesSold / ratio : piecesSold;
          const newStock = Math.max(0, Math.round((prod.currentStock - deduction) * 100) / 100);
          updatedProducts[pIndex] = { ...prod, currentStock: newStock };

          // Log stock transaction for audit trail
          newStockTransactions.push({
            id: `st-das-${Date.now()}-${newItem.productId}`,
            date: newSheet.date,
            productId: prod.id,
            productName: prod.name,
            type: 'sale',
            quantity: -newItem.netSoldQty,
            previousStock: prod.currentStock,
            newStock: newStock,
            referenceId: newSheet.sheetNo || newSheet.id,
            note: `Daily হিসাব: ইস্যু ${newItem.issuedQty}, ফেরত ${newItem.returnQty}, বিক্রয় ${newItem.netSoldQty} ${newItem.unit}`,
            createdAt: nowIso,
            createdBy: currentUser.name,
          });

          if (newItem.damageQty > 0) {
            newStockTransactions.push({
              id: `st-dmg-${Date.now()}-${newItem.productId}`,
              date: newSheet.date,
              productId: prod.id,
              productName: prod.name,
              type: 'damage',
              quantity: -newItem.damageQty,
              previousStock: newStock + newItem.damageQty,
              newStock: newStock,
              referenceId: newSheet.sheetNo || newSheet.id,
              note: `মার্কেট ড্যামেজ: ${newItem.damageQty} ${newItem.unit} (মূল্য: ${newItem.damageValue} ৳)`,
              createdAt: nowIso,
              createdBy: currentUser.name,
            });
          }
        }
      });
    }

    // Sync auto-populated expense from Daily হিসাব's marketExpense
    let updatedExpenses = [...(db.expenses || [])];
    const expenseId = `exp-sheet-${sheetId}`;
    const existingExpenseIdx = updatedExpenses.findIndex(
      (e) => e.sheetId === sheetId || e.id === expenseId
    );

    if (marketExpense > 0) {
      const expEntry: Expense = {
        id: existingExpenseIdx !== -1 ? updatedExpenses[existingExpenseIdx].id : expenseId,
        sheetId: sheetId,
        referenceId: newSheet.sheetNo || sheetId,
        routeOrSr: `${newSheet.routeOrVan || ''}${newSheet.srName ? ` / SR: ${newSheet.srName}` : ''}`,
        date: newSheet.date,
        category: 'মার্কেট খরচ (Daily হিসাব)',
        amount: marketExpense,
        description: `Daily হিসাব খরচ #${newSheet.sheetNo || ''}${newSheet.routeOrVan ? ` (রুট: ${newSheet.routeOrVan})` : ''}${newSheet.srName ? ` [SR: ${newSheet.srName}]` : ''}`,
        paidFrom: 'cash',
        note: 'Daily হিসাব থেকে স্বয়ংক্রিয় এন্ট্রি',
        status: 'completed',
        createdAt: existingExpenseIdx !== -1 ? updatedExpenses[existingExpenseIdx].createdAt : nowIso,
        createdBy: currentUser.name || newSheet.createdBy || 'Daily হিসাব',
      };

      if (existingExpenseIdx !== -1) {
        updatedExpenses[existingExpenseIdx] = expEntry;
      } else {
        updatedExpenses = [expEntry, ...updatedExpenses];
      }
    } else if (existingExpenseIdx !== -1) {
      // If marketExpense is 0, remove the auto-populated expense
      updatedExpenses = updatedExpenses.filter((_, idx) => idx !== existingExpenseIdx);
    }

    // Sync auto-populated less entry from Daily হিসাব's dailyLess
    const dailyLessAmt = Number(newSheet.dailyLess ?? newSheet.lessAmount ?? 0);
    let updatedLessEntries = [...(db.lessEntries || [])];
    const lessEntryId = `less-sheet-${sheetId}`;
    const existingLessIdx = updatedLessEntries.findIndex(
      (l) => l.id === lessEntryId || (l.date === newSheet.date && l.description.includes(`Daily হিসাব লেস #${newSheet.sheetNo || sheetId}`))
    );

    if (dailyLessAmt > 0) {
      const lessEntryItem: LessEntry = {
        id: existingLessIdx !== -1 ? updatedLessEntries[existingLessIdx].id : lessEntryId,
        date: newSheet.date,
        description: `Daily হিসাব লেস #${newSheet.sheetNo || ''}${newSheet.routeOrVan ? ` (রুট: ${newSheet.routeOrVan})` : ''}${newSheet.srName ? ` [SR: ${newSheet.srName}]` : ''}`,
        amount: dailyLessAmt,
        status: existingLessIdx !== -1 ? updatedLessEntries[existingLessIdx].status : 'pending',
        note: 'Daily হিসাব থেকে স্বয়ংক্রিয় এন্ট্রি',
        createdAt: existingLessIdx !== -1 ? updatedLessEntries[existingLessIdx].createdAt : nowIso,
        createdBy: currentUser.name || newSheet.createdBy || 'Daily হিসাব',
      };

      if (existingLessIdx !== -1) {
        updatedLessEntries[existingLessIdx] = lessEntryItem;
      } else {
        updatedLessEntries = [lessEntryItem, ...updatedLessEntries];
      }
    } else if (existingLessIdx !== -1) {
      updatedLessEntries = updatedLessEntries.filter((_, idx) => idx !== existingLessIdx);
    }

    const otherSheets = (db.dailySheets || []).filter((s) => s.id !== sheetId);
    const newDb: AppDatabase = {
      ...db,
      dailySheets: [newSheet, ...otherSheets],
      products: updatedProducts,
      stockTransactions: [...newStockTransactions, ...db.stockTransactions],
      expenses: updatedExpenses,
      lessEntries: updatedLessEntries,
    };

    updateDb(newDb);
    return newSheet;
  };

  const deleteDailySheet = (sheetId: string) => {
    const sheet = (db.dailySheets || []).find((s) => s.id === sheetId);
    if (!sheet) return false;

    let updatedProducts = [...db.products];
    if (sheet.status === 'confirmed' || sheet.status === 'completed') {
      // 1. Restore product stock for all issued/sold items
      (sheet.items || []).forEach((item) => {
        const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
        if (pIndex !== -1) {
          const p = updatedProducts[pIndex];
          const ratio = p.piecesPerCarton || p.cartonQty || 1;
          const isCartonStock = (p.unit === 'কার্টন' || p.unit === 'কার্টুন') && ratio > 1;
          const netPieces = (item.issuedQty !== undefined && item.returnQty !== undefined)
            ? Math.max(0, item.issuedQty - item.returnQty)
            : (item.issuedUnit === 'C' ? (Number(item.netSoldQty) || 0) * ratio : (Number(item.netSoldQty) || 0));
          const piecesSold = netPieces + (Number(item.damageQty) || 0);
          const restoredUnits = isCartonStock ? piecesSold / ratio : piecesSold;
          const restored = Math.round((p.currentStock + restoredUnits) * 100) / 100;
          updatedProducts[pIndex] = {
            ...p,
            currentStock: restored,
          };
        }
      });

      // 2. Restore any separate damage items
      if (sheet.damageItems && sheet.damageItems.length > 0) {
        sheet.damageItems.forEach((dmgItem) => {
          const alreadyInItems = (sheet.items || []).some((it) => it.productId === dmgItem.productId);
          if (!alreadyInItems) {
            const pIndex = updatedProducts.findIndex((p) => p.id === dmgItem.productId);
            if (pIndex !== -1) {
              const p = updatedProducts[pIndex];
              const ratio = p.piecesPerCarton || p.cartonQty || 1;
              const isCartonStock = (p.unit === 'কার্টন' || p.unit === 'কার্টুন') && ratio > 1;
              const pieces = Number(dmgItem.damageQty) || Number(dmgItem.issuedQty) || 0;
              const restoredUnits = isCartonStock ? pieces / ratio : pieces;
              const restored = Math.round((p.currentStock + restoredUnits) * 100) / 100;
              updatedProducts[pIndex] = { ...p, currentStock: restored };
            }
          }
        });
      }
    }

    // 3. Reverse customer dues created from this sheet if any
    let updatedCustomers = [...db.customers];
    let updatedLedgers = [...(db.customerLedgers || [])];

    if (sheet.todayDueEntries && sheet.todayDueEntries.length > 0) {
      sheet.todayDueEntries.forEach((dueEntry) => {
        const amt = Number(dueEntry.amount) || 0;
        if (dueEntry.customerId && amt > 0) {
          const cIndex = updatedCustomers.findIndex((c) => c.id === dueEntry.customerId);
          if (cIndex !== -1) {
            const cust = updatedCustomers[cIndex];
            const newDue = Math.max(0, (cust.currentDue || 0) - amt);
            updatedCustomers[cIndex] = {
              ...cust,
              currentDue: newDue,
              updatedAt: new Date().toISOString(),
            };
          }
          if (dueEntry.dueNo) {
            updatedLedgers = updatedLedgers.filter(
              (l) => l.referenceId !== dueEntry.dueNo && l.id !== dueEntry.dueNo
            );
          }
        }
      });
    }

    // 4. Remove corresponding stock audit transactions
    const cleanStockTx = (db.stockTransactions || []).filter(
      (tx) => tx.referenceId !== sheet.id && (!sheet.sheetNo || tx.referenceId !== sheet.sheetNo)
    );

    // 5. Remove corresponding auto-generated expense entry
    const cleanExpenses = (db.expenses || []).filter(
      (e) => e.sheetId !== sheetId && e.id !== `exp-sheet-${sheetId}`
    );

    // 5b. Remove corresponding auto-generated less entry
    const cleanLessEntries = (db.lessEntries || []).filter(
      (l) => l.id !== `less-sheet-${sheetId}` && !(sheet.sheetNo && l.description && l.description.includes(`Daily হিসাব লেস #${sheet.sheetNo}`))
    );

    // 6. Remove sheet from dailySheets and persist
    const remaining = (db.dailySheets || []).filter((s) => s.id !== sheetId);
    updateDb({
      ...db,
      dailySheets: remaining,
      products: updatedProducts,
      stockTransactions: cleanStockTx,
      customers: updatedCustomers,
      customerLedgers: updatedLedgers,
      expenses: cleanExpenses,
      lessEntries: cleanLessEntries,
    });
    return true;
  };

  const getDailySheetByDate = (date: string): DailyAccountSheet | undefined => {
    return (db.dailySheets || []).find((s) => s.date === date);
  };

  // 9. SR MANAGEMENT
  const addSR = (input: Omit<SalesRepresentative, 'id' | 'createdAt'>): SalesRepresentative => {
    const newSr: SalesRepresentative = {
      ...input,
      id: `sr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Also add as user
    const newUser: User = {
      id: `user-${newSr.id}`,
      username: input.username,
      name: `${input.name} (SR)`,
      role: 'sr',
      pin: input.pin,
      phone: input.phone,
      active: input.active,
    };

    updateDb({
      ...db,
      salesRepresentatives: [...db.salesRepresentatives, newSr],
      users: [...db.users, newUser],
    });
    return newSr;
  };

  const updateSettings = (settings: BusinessSettings) => {
    const updatedUsers = (db.users || []).map((u) => {
      if (u.role === 'owner' || u.id === 'user-owner') {
        return {
          ...u,
          name: settings.proprietorName ? `${settings.proprietorName} (মালিক)` : u.name,
          phone: settings.phone || u.phone,
          pin: settings.securityPin || u.pin,
        };
      }
      return u;
    });

    updateDb({ ...db, settings, users: updatedUsers });

    if (currentUser?.role === 'owner') {
      setCurrentUser((prev) => ({
        ...prev,
        name: settings.proprietorName ? `${settings.proprietorName} (মালিক)` : prev.name,
        phone: settings.phone || prev.phone,
        pin: settings.securityPin || prev.pin,
      }));
    }
  };

  const addRoute = (routeName: string) => {
    const trimmed = routeName.trim();
    if (!trimmed) return;
    const currentCustom =
      Array.isArray(db.settings.customRoutes)
        ? db.settings.customRoutes
        : DEFAULT_ROUTES;
    if (!currentCustom.includes(trimmed)) {
      updateSettings({
        ...db.settings,
        customRoutes: [...currentCustom, trimmed],
      });
    }
  };

  const updateRoute = (oldName: string, newName: string) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) return;

    // 1. Update in customRoutes
    const currentCustom =
      Array.isArray(db.settings.customRoutes)
        ? db.settings.customRoutes
        : DEFAULT_ROUTES;
    let updatedCustom: string[];
    if (currentCustom.includes(trimmedOld)) {
      updatedCustom = currentCustom.map((r) => (r === trimmedOld ? trimmedNew : r));
    } else {
      updatedCustom = [...currentCustom, trimmedNew];
    }

    // 2. Also update in any SR territory referencing this route so SR assignments stay synced
    const updatedSRs = (db.salesRepresentatives || []).map((sr) => {
      if (sr.territory === trimmedOld) {
        return { ...sr, territory: trimmedNew };
      }
      return sr;
    });

    // 3. Update existing Daily Sheets if they reference the old route name so historical display is preserved smoothly
    const updatedDailySheets = (db.dailySheets || []).map((sheet) => {
      if (sheet.routeOrVan === trimmedOld) {
        return { ...sheet, routeOrVan: trimmedNew };
      }
      return sheet;
    });

    updateDb({
      ...db,
      settings: {
        ...db.settings,
        customRoutes: updatedCustom,
      },
      salesRepresentatives: updatedSRs,
      dailySheets: updatedDailySheets,
    });
  };

  const deleteRoute = (routeName: string) => {
    const trimmed = routeName.trim();
    if (!trimmed) return;
    const currentCustom =
      db.settings.customRoutes !== undefined && Array.isArray(db.settings.customRoutes)
        ? db.settings.customRoutes
        : DEFAULT_ROUTES;
    const updatedCustom = currentCustom.filter((r) => r !== trimmed);

    // Also clear territory on any SR referencing this route so it doesn't reappear in available routes
    const updatedSRs = (db.salesRepresentatives || []).map((sr) => {
      if (sr.territory === trimmed) {
        return { ...sr, territory: '' };
      }
      return sr;
    });

    updateDb({
      ...db,
      settings: {
        ...db.settings,
        customRoutes: updatedCustom,
      },
      salesRepresentatives: updatedSRs,
    });
  };

  const resetToBlankData = () => {
    const ownerUser = db.users.find((u) => u.role === 'owner') || currentUser;
    const blank = StorageService.resetToBlank(db.settings, ownerUser);
    setDb(blank);
    const owner = blank.users.find((u) => u.role === 'owner') || blank.users[0];
    setCurrentUser(owner);
  };

  const resetToDemoData = () => {
    resetToBlankData();
  };

  const importDatabase = (imported: AppDatabase) => {
    updateDb(imported);
  };

  // COMPUTED DASHBOARD SUMMARIES
  const todaySales = useMemo(() => {
    const fromSales = db.sales
      .filter((s) => s.date === todayDateStr && s.status === 'completed')
      .reduce((acc, s) => acc + s.netSales, 0);
    const fromDailySheets = (db.dailySheets || [])
      .filter((d) => d.date === todayDateStr && (d.status === 'confirmed' || d.status === 'completed'))
      .reduce((acc, d) => acc + d.finalNetSalesAmount, 0);
    return fromSales + fromDailySheets;
  }, [db.sales, db.dailySheets, todayDateStr]);

  const todayCollection = useMemo(() => {
    const fromPayments = db.payments
      .filter((p) => p.date === todayDateStr && p.status === 'completed')
      .reduce((acc, p) => acc + p.amount, 0);
    const fromDailySheets = (db.dailySheets || [])
      .filter((d) => d.date === todayDateStr && (d.status === 'confirmed' || d.status === 'completed'))
      .reduce((acc, d) => acc + d.cashCollected, 0);
    return fromPayments + fromDailySheets;
  }, [db.payments, db.dailySheets, todayDateStr]);

  const todayNewDue = useMemo(() => {
    const fromSales = db.sales
      .filter((s) => s.date === todayDateStr && s.status === 'completed')
      .reduce((acc, s) => acc + Math.max(0, s.netSales - s.paymentReceived), 0);
    const fromDailySheets = (db.dailySheets || [])
      .filter((d) => d.date === todayDateStr && (d.status === 'confirmed' || d.status === 'completed'))
      .reduce((acc, d) => acc + d.marketDue, 0);
    return fromSales + fromDailySheets;
  }, [db.sales, db.dailySheets, todayDateStr]);

  const totalOutstandingDue = useMemo(() => {
    return db.customers
      .filter((c) => c.status === 'active')
      .reduce((acc, c) => acc + (c.currentDue || 0), 0);
  }, [db.customers]);

  const todayExpense = useMemo(() => {
    return (db.expenses || [])
      .filter((e) => e.date === todayDateStr && e.status === 'completed')
      .reduce((acc, e) => acc + e.amount, 0);
  }, [db.expenses, todayDateStr]);

  const todayLessAmount = useMemo(() => {
    return (db.lessEntries || [])
      .filter((l) => l.date === todayDateStr)
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  }, [db.lessEntries, todayDateStr]);

  const totalOutstandingLess = useMemo(() => {
    return (db.lessEntries || [])
      .filter((l) => l.status === 'pending')
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  }, [db.lessEntries]);

  const totalAllTimeLess = useMemo(() => {
    return (db.lessEntries || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  }, [db.lessEntries]);

  const cashBalance = useMemo(() => {
    const opening = db.settings.openingCashBalance || 0;
    const totalCashCollections = db.payments
      .filter((p) => p.status === 'completed' && (p.paymentMethod === 'cash' || !p.paymentMethod))
      .reduce((acc, p) => acc + p.amount, 0);
    const dailySheetCash = (db.dailySheets || [])
      .filter((d) => d.status === 'confirmed' || d.status === 'completed')
      .reduce((acc, d) => acc + d.netCashSubmitted, 0);
    const totalCashExpenses = (db.expenses || [])
      .filter((e) => e.status === 'completed' && e.paidFrom === 'cash' && !e.sheetId && !e.id.startsWith('exp-sheet-'))
      .reduce((acc, e) => acc + e.amount, 0);

    return opening + totalCashCollections + dailySheetCash - totalCashExpenses;
  }, [db.payments, db.dailySheets, db.expenses, db.settings.openingCashBalance]);

  const customersWithDue = useMemo(() => {
    return db.customers
      .filter((c) => c.status === 'active' && c.currentDue > 0)
      .sort((a, b) => b.currentDue - a.currentDue);
  }, [db.customers]);

  const switchUser = (idOrUsername: string, pin: string): boolean => {
    const found = db.users.find(
      (u) =>
        u.id.toLowerCase() === idOrUsername.toLowerCase() ||
        u.username.toLowerCase() === idOrUsername.toLowerCase()
    );
    if (!found) return false;

    const validPins: string[] = [];
    if (found.pin) validPins.push(found.pin);
    if (found.role === 'owner') {
      if (db.settings.securityPin) validPins.push(db.settings.securityPin);
      if ((db.settings as any).ownerPin) validPins.push((db.settings as any).ownerPin);
    }
    if (validPins.length === 0) validPins.push('1234');

    if (validPins.includes(pin.trim())) {
      setCurrentUser(found);
      setIsLoggedIn(true);
      try {
        sessionStorage.setItem('mm_traders_session_active', 'true');
        sessionStorage.setItem('mm_traders_last_user_id', found.id);
      } catch (e) {
        console.error(e);
      }
      return true;
    }
    return false;
  };

  const refreshFromStorage = () => {
    const loaded = StorageService.loadDatabase();
    setDb({ ...loaded });
  };

  const adjustStock = (input: { productId: string; quantity: number; type: 'in' | 'out'; reason: string; date: string }) => {
    if (input.type === 'in') {
      addStockInward(input.productId, input.quantity, input.reason);
    } else {
      addStockDamage(input.productId, input.quantity, input.reason);
    }
  };

  const addSalesRepresentative = addSR;

  const updateSalesRepresentative = (updatedSR: SalesRepresentative) => {
    const updatedList = db.salesRepresentatives.map((sr) =>
      sr.id === updatedSR.id ? updatedSR : sr
    );
    updateDb({ ...db, salesRepresentatives: updatedList });
  };

  // 10. DSR MANAGEMENT
  const addDSR = (input: Omit<DeliveryRepresentative, 'id' | 'createdAt'>): DeliveryRepresentative => {
    const newDsr: DeliveryRepresentative = {
      ...input,
      id: `dsr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedDeliveryList = [...(db.deliveryRepresentatives || []), newDsr];
    const updatedDsrList = updatedDeliveryList.filter((d) => d.active !== false).map((d) => d.name);

    updateDb({
      ...db,
      deliveryRepresentatives: updatedDeliveryList,
      settings: {
        ...db.settings,
        dsrList: updatedDsrList,
      },
    });
    return newDsr;
  };

  const updateDSR = (updatedDsr: DeliveryRepresentative) => {
    const oldDsr = (db.deliveryRepresentatives || []).find((d) => d.id === updatedDsr.id);
    const oldName = oldDsr?.name?.trim();
    const newName = updatedDsr.name.trim();

    const updatedDeliveryList = (db.deliveryRepresentatives || []).map((d) =>
      d.id === updatedDsr.id ? updatedDsr : d
    );

    // Update existing daily sheets referencing this DSR (by dsrId or by oldName)
    // so records continue pointing to the same underlying DSR ID without breaking or disappearing
    const updatedDailySheets = (db.dailySheets || []).map((sheet) => {
      if (sheet.dsrId === updatedDsr.id || (oldName && sheet.dsrName?.trim() === oldName)) {
        return {
          ...sheet,
          dsrId: updatedDsr.id,
          dsrName: newName,
        };
      }
      return sheet;
    });

    const updatedDsrList = updatedDeliveryList.filter((d) => d.active !== false).map((d) => d.name);

    updateDb({
      ...db,
      deliveryRepresentatives: updatedDeliveryList,
      dailySheets: updatedDailySheets,
      settings: {
        ...db.settings,
        dsrList: updatedDsrList,
      },
    });
  };

  const deleteDSR = (dsrId: string) => {
    const updatedDeliveryList = (db.deliveryRepresentatives || []).filter((d) => d.id !== dsrId);
    const updatedDsrList = updatedDeliveryList.filter((d) => d.active !== false).map((d) => d.name);

    updateDb({
      ...db,
      deliveryRepresentatives: updatedDeliveryList,
      settings: {
        ...db.settings,
        dsrList: updatedDsrList,
      },
    });
  };

  return (
    <AppContext.Provider
      value={{
        db,
        currentUser,
        setCurrentUser,
        switchUserRole,
        switchUser,
        isInitialized: true,
        refreshFromStorage,
        isLoggedIn,
        login,
        logout,
        addSale,
        voidSale,
        addPayment,
        voidPayment,
        recordCustomerDue,
        recordDueCollection,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addLessEntry,
        updateLessStatus,
        deleteLessEntry,
        addLessSettlement,
        deleteLessSettlement,
        resetLessAccount,
        settleDueEntry,
        voidDueEntry,
        addProduct,
        updateProduct,
        deleteProduct,
        addStockInward,
        addStockDamage,
        adjustStock,
        deleteStockEntry,
        addExpense,
        voidExpense,
        deleteExpense,
        saveDailySheet,
        deleteDailySheet,
        getDailySheetByDate,
        addSR,
        addSalesRepresentative,
        updateSalesRepresentative,
        addDSR,
        updateDSR,
        deleteDSR,
        updateSettings,
        addRoute,
        updateRoute,
        deleteRoute,
        resetToDemoData,
        resetToBlankData,
        importDatabase,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
