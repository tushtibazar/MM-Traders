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

export const STORAGE_KEY = 'mm_traders_business_db_v2';
export const CLEANUP_APPLIED_KEY = 'mm_traders_cleanup_applied_v3';
export const SAFETY_BACKUP_KEY = 'mm_traders_pre_cleanup_safety_backup';

export const DEFAULT_ROUTES = [
  'রুট ১: শনিবার - সদর',
  'রুট ২: তারাকান্দি - নারায়ন খোলা',
  'রুট ৩: খোরপার - করুয়া',
  'রুট ৪: কুসুমহাটী - নন্দীরবাজার',
  'রুট ৫: শেখহাটী - বালুঘাটা',
  'রুট ৬: হাজির মোড় - চন্দ্রকোনা',
];

// Clean Initial Settings for MM TRADERS DISTRIBUTOR
export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'MM TRADERS',
  subtitle: 'DISTRIBUTOR',
  address: 'কুসুমহাটী বাজার, শেরপুর সদর, শেরপুর, ঢাকা, বাংলাদেশ',
  phone: '01757200400',
  proprietorName: 'Mohammad Mamun',
  currency: '৳',
  openingCashBalance: 0,
  tradeLicenseNo: 'TRAD/MMT/092144',
  footerNote: 'MM TRADERS — বিশ্বস্ত ডিস্ট্রিবিউশন পার্টনার। হিসাব বুঝে নিন ও সঠিক সময়ে পরিশোধ করুন।',
  securityPin: '1234',
  customRoutes: DEFAULT_ROUTES,
  dsrList: [],
  businessPosition: {
    stockAdjustment: 0,
    stockNote: '',
    damageAdjustment: 0,
    damageNote: '',
    dueAdjustment: 0,
    dueNote: '',
    cashAdjustment: 0,
    cashNote: '',
    undeliveredAmount: 0,
    undeliveredNote: '',
    campaignAmount: 0,
    campaignNote: '',
    appCashAmount: 0,
    appCashNote: '',
    doAmount: 0,
    doNote: '',
    vehicleStockAmount: 0,
    vehicleStockNote: '',
    bankBalance: 0,
    bankNote: '',
    lessAdjustment: 0,
    lessNote: '',
    others: [],
    originalInvestment: 0,
    supplierPayables: 0,
    supplierNote: '',
    loansPayables: 0,
    loansNote: '',
    customItems: [],
  },
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-owner',
    username: 'owner',
    name: 'Mohammad Mamun (মালিক)',
    role: 'owner',
    pin: '1234',
    phone: '01757200400',
    active: true,
  },
  {
    id: 'user-sr-1',
    username: 'mamun_ali',
    name: 'মামুন আলী (SR)',
    role: 'sr',
    pin: '1111',
    phone: '০১৮১৯-১১২২৩৩',
    active: true,
  },
  {
    id: 'user-sr-2',
    username: 'biplob',
    name: 'মো: বিপ্লব (SR)',
    role: 'sr',
    pin: '2222',
    phone: '০১৭১১-৪৪৫৫৬৬',
    active: true,
  },
];

export const INITIAL_SRS: SalesRepresentative[] = [
  {
    id: 'sr-1',
    name: 'মামুন আলী',
    phone: '০১৮১৯-১১২২৩৩',
    username: 'mamun_ali',
    pin: '1111',
    territory: '',
    active: true,
    createdAt: '2026-09-01T08:00:00.000Z',
    dailyTarget: 0,
  },
  {
    id: 'sr-2',
    name: 'মো: বিপ্লব',
    phone: '০১৭১১-৪৪৫৫৬৬',
    username: 'biplob',
    pin: '2222',
    territory: '',
    active: true,
    createdAt: '2026-09-01T08:00:00.000Z',
    dailyTarget: 0,
  },
];

export const INITIAL_DSRS: DeliveryRepresentative[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_LEDGERS: CustomerLedgerEntry[] = [];
export const INITIAL_SALES: Sale[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_LESS_ENTRIES: LessEntry[] = [];
export const INITIAL_LESS_SETTLEMENTS: LessSettlement[] = [];
export const INITIAL_STOCK_TRANSACTIONS: StockTransaction[] = [];
export const INITIAL_DAILY_SHEETS: DailyAccountSheet[] = [];

export function getBlankDatabase(preservedSettings?: BusinessSettings, ownerUser?: User): AppDatabase {
  const currentOwner: User = {
    id: ownerUser?.id || 'user-owner',
    username: ownerUser?.username || 'owner',
    name: preservedSettings?.proprietorName
      ? `${preservedSettings.proprietorName} (মালিক)`
      : (ownerUser?.name || 'মালিক'),
    role: 'owner',
    pin: preservedSettings?.securityPin || ownerUser?.pin || '1234',
    phone: preservedSettings?.phone || ownerUser?.phone || '',
    active: true,
  };

  return {
    users: [currentOwner],
    customers: [],
    products: [],
    sales: [],
    payments: [],
    dailySheets: [],
    customerLedgers: [],
    stockTransactions: [],
    expenses: [],
    lessEntries: [],
    lessSettlements: [],
    salesRepresentatives: [],
    deliveryRepresentatives: [],
    settings: {
      businessName: preservedSettings?.businessName || INITIAL_SETTINGS.businessName,
      subtitle: preservedSettings?.subtitle || INITIAL_SETTINGS.subtitle,
      address: preservedSettings?.address || INITIAL_SETTINGS.address,
      phone: preservedSettings?.phone || INITIAL_SETTINGS.phone,
      proprietorName: preservedSettings?.proprietorName || INITIAL_SETTINGS.proprietorName,
      currency: preservedSettings?.currency || INITIAL_SETTINGS.currency || '৳',
      openingCashBalance: 0,
      tradeLicenseNo: preservedSettings?.tradeLicenseNo || '',
      footerNote: preservedSettings?.footerNote || '',
      securityPin: preservedSettings?.securityPin || '1234',
      customRoutes: [],
      dsrList: [],
      businessPosition: {
        stockAdjustment: 0,
        stockNote: '',
        damageAdjustment: 0,
        damageNote: '',
        dueAdjustment: 0,
        dueNote: '',
        cashAdjustment: 0,
        cashNote: '',
        undeliveredAmount: 0,
        undeliveredNote: '',
        campaignAmount: 0,
        campaignNote: '',
        appCashAmount: 0,
        appCashNote: '',
        doAmount: 0,
        doNote: '',
        vehicleStockAmount: 0,
        vehicleStockNote: '',
        bankBalance: 0,
        bankNote: '',
        lessAdjustment: 0,
        lessNote: '',
        others: [],
        originalInvestment: 0,
        supplierPayables: 0,
        supplierNote: '',
        loansPayables: 0,
        loansNote: '',
        customItems: [],
      },
    },
    lastUpdated: new Date().toISOString(),
  };
}

export function getInitialDatabase(): AppDatabase {
  return {
    users: INITIAL_USERS,
    customers: INITIAL_CUSTOMERS,
    products: INITIAL_PRODUCTS,
    sales: INITIAL_SALES,
    payments: INITIAL_PAYMENTS,
    dailySheets: INITIAL_DAILY_SHEETS,
    customerLedgers: INITIAL_LEDGERS,
    stockTransactions: INITIAL_STOCK_TRANSACTIONS,
    expenses: INITIAL_EXPENSES,
    lessEntries: INITIAL_LESS_ENTRIES,
    lessSettlements: INITIAL_LESS_SETTLEMENTS,
    salesRepresentatives: INITIAL_SRS,
    deliveryRepresentatives: INITIAL_DSRS,
    settings: INITIAL_SETTINGS,
    lastUpdated: new Date().toISOString(),
  };
}

// Storage API with localStorage and server sync
export class StorageService {
  private static dbCache: AppDatabase | null = null;

  public static loadDatabase(): AppDatabase {
    if (this.dbCache) {
      return this.dbCache;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const cleanupApplied = localStorage.getItem(CLEANUP_APPLIED_KEY);

      // Perform internal safety snapshot/backup before one-time clean reset
      if (cleanupApplied !== 'true') {
        if (stored) {
          try {
            localStorage.setItem(SAFETY_BACKUP_KEY, stored);
            localStorage.removeItem('mm_traders_business_position_current');
            localStorage.removeItem('mm_traders_business_position_snapshots');
          } catch (e) {
            console.warn('Could not store pre-cleanup backup in localStorage:', e);
          }
        }
        localStorage.setItem(CLEANUP_APPLIED_KEY, 'true');
        const clean = getInitialDatabase();
        this.saveDatabase(clean);
        this.dbCache = clean;
        return clean;
      }

      if (stored) {
        const parsed: AppDatabase = JSON.parse(stored);
        if (parsed && parsed.settings) {
          if (!parsed.settings.businessName) parsed.settings.businessName = INITIAL_SETTINGS.businessName;
          if (!parsed.settings.subtitle) parsed.settings.subtitle = INITIAL_SETTINGS.subtitle;
          if (!parsed.settings.proprietorName) parsed.settings.proprietorName = INITIAL_SETTINGS.proprietorName;

          // Safe normalization of all collections to avoid undefined errors
          if (!Array.isArray(parsed.customers)) parsed.customers = [];
          if (!Array.isArray(parsed.products)) parsed.products = [];
          if (!Array.isArray(parsed.sales)) parsed.sales = [];
          if (!Array.isArray(parsed.payments)) parsed.payments = [];
          if (!Array.isArray(parsed.dailySheets)) parsed.dailySheets = [];
          if (!Array.isArray(parsed.customerLedgers)) parsed.customerLedgers = [];
          if (!Array.isArray(parsed.stockTransactions)) parsed.stockTransactions = [];
          if (!Array.isArray(parsed.expenses)) parsed.expenses = [];
          if (!Array.isArray(parsed.lessEntries)) parsed.lessEntries = [];
          if (!Array.isArray(parsed.lessSettlements)) parsed.lessSettlements = [];
          if (!Array.isArray(parsed.salesRepresentatives)) {
            parsed.salesRepresentatives = [];
          }
          if (!Array.isArray(parsed.deliveryRepresentatives)) {
            parsed.deliveryRepresentatives = [];
          }
          if (!Array.isArray(parsed.settings.customRoutes)) {
            parsed.settings.customRoutes = [];
          }

          // Restore businessPosition if present in dedicated storage
          if (!parsed.settings.businessPosition) {
            try {
              const fallbackPos = localStorage.getItem('mm_traders_business_position_current');
              if (fallbackPos) {
                parsed.settings.businessPosition = JSON.parse(fallbackPos);
              }
            } catch {
              // Ignore fallback parse error
            }
          }

          this.dbCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage database:', e);
    }

    // Default to clean initial database
    const initial = getInitialDatabase();
    this.saveDatabase(initial);
    this.dbCache = initial;
    return initial;
  }

  public static saveDatabase(db: AppDatabase): void {
    try {
      db.lastUpdated = new Date().toISOString();
      this.dbCache = db;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

      if (db.settings?.businessPosition) {
        try {
          localStorage.setItem('mm_traders_business_position_current', JSON.stringify(db.settings.businessPosition));
        } catch {
          // Ignore localStorage quota or private mode error
        }
      }

      // Asynchronously backup to server if available
      this.syncToServer(db).catch(() => {});
    } catch (e) {
      console.error('Failed to save database to localStorage:', e);
    }
  }

  private static async syncToServer(db: AppDatabase): Promise<void> {
    try {
      await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db),
      });
    } catch {
      // Offline or dev server mode without express API
    }
  }

  public static async pullFromServer(): Promise<AppDatabase | null> {
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const remoteDb = await res.json();
        if (remoteDb && remoteDb.settings && Array.isArray(remoteDb.products)) {
          this.saveDatabase(remoteDb);
          return remoteDb;
        }
      }
    } catch {
      // Ignored
    }
    return null;
  }

  public static resetToDemo(): AppDatabase {
    const initial = getInitialDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  public static resetToBlank(preservedSettings?: BusinessSettings, ownerUser?: User): AppDatabase {
    try {
      localStorage.removeItem('mm_traders_business_position_current');
      localStorage.removeItem('mm_traders_business_position_snapshots');
    } catch {
      // Ignore localStorage error
    }
    const blankDb = getBlankDatabase(preservedSettings, ownerUser);
    this.saveDatabase(blankDb);
    this.dbCache = blankDb;
    return blankDb;
  }

  public static clearAllData(): AppDatabase {
    return this.resetToBlank();
  }
}

export function exportDatabaseJson(database?: AppDatabase): string {
  const db = database ? JSON.parse(JSON.stringify(database)) : StorageService.loadDatabase();
  // Ensure businessPosition is preserved from localStorage fallback if missing
  if (!db.settings.businessPosition) {
    try {
      const fallbackPos = localStorage.getItem('mm_traders_business_position_current');
      if (fallbackPos) {
        db.settings.businessPosition = JSON.parse(fallbackPos);
      }
    } catch {
      // Ignore parse error
    }
  }
  const jsonString = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `mm-traders-backup-${dateStr}.json`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', url);
  downloadAnchor.setAttribute('download', fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  data?: AppDatabase;
  summary?: {
    customersCount: number;
    productsCount: number;
    sheetsCount: number;
    expensesCount: number;
    dueEntriesCount: number;
    routesCount: number;
    date: string;
  };
}

export function validateBackupJson(jsonStr: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'ফাইলটি কোনো বৈধ JSON ডাটা ধারণ করে না।' };
    }
    if (!parsed.settings || typeof parsed.settings !== 'object') {
      return { isValid: false, error: 'ব্যাকআপ ফাইলে ব্যবসায়ের সেটিংস (settings) তথ্য পাওয়া যায়নি।' };
    }
    if (!Array.isArray(parsed.products)) {
      return { isValid: false, error: 'ব্যাকআপ ফাইলে পণ্যের তালিকা (products) পাওয়া যায়নি।' };
    }
    if (!Array.isArray(parsed.customers)) {
      return { isValid: false, error: 'ব্যাকআপ ফাইলে কাস্টমার তালিকা (customers) পাওয়া যায়নি।' };
    }

    // Normalized AppDatabase structure to safely ensure all expected collections are arrays
    const currentDb = StorageService.loadDatabase();
    const normalizedDb: AppDatabase = {
      users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : currentDb.users,
      customers: parsed.customers,
      products: parsed.products,
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      dailySheets: Array.isArray(parsed.dailySheets) ? parsed.dailySheets : [],
      customerLedgers: Array.isArray(parsed.customerLedgers) ? parsed.customerLedgers : [],
      stockTransactions: Array.isArray(parsed.stockTransactions) ? parsed.stockTransactions : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      lessEntries: Array.isArray(parsed.lessEntries) ? parsed.lessEntries : [],
      lessSettlements: Array.isArray(parsed.lessSettlements) ? parsed.lessSettlements : [],
      salesRepresentatives: Array.isArray(parsed.salesRepresentatives) && parsed.salesRepresentatives.length > 0
        ? parsed.salesRepresentatives
        : currentDb.salesRepresentatives,
      deliveryRepresentatives: Array.isArray(parsed.deliveryRepresentatives)
        ? parsed.deliveryRepresentatives
        : (currentDb.deliveryRepresentatives || []),
      settings: {
        ...currentDb.settings,
        ...parsed.settings,
        businessPosition: parsed.settings?.businessPosition || currentDb.settings.businessPosition,
      },
      lastUpdated: new Date().toISOString(),
    };

    return {
      isValid: true,
      data: normalizedDb,
      summary: {
        customersCount: normalizedDb.customers.length,
        productsCount: normalizedDb.products.length,
        sheetsCount: normalizedDb.dailySheets.length,
        expensesCount: normalizedDb.expenses.length,
        dueEntriesCount: normalizedDb.customerLedgers.length,
        routesCount: (normalizedDb.settings.customRoutes || []).length,
        date: parsed.lastUpdated ? new Date(parsed.lastUpdated).toLocaleDateString('bn-BD') : 'অজানা',
      },
    };
  } catch (err: any) {
    return { isValid: false, error: `ফাইল পার্স করার সময় ত্রুটি ঘটেছে: ${err.message || 'অজানা ত্রুটি'}` };
  }
}

export function importDatabaseJson(jsonStr: string): { success: boolean; error?: string; data?: AppDatabase; summary?: BackupValidationResult['summary'] } {
  const result = validateBackupJson(jsonStr);
  if (!result.isValid || !result.data) {
    return { success: false, error: result.error || 'অবৈধ ব্যাকআপ ফাইল' };
  }
  try {
    StorageService.saveDatabase(result.data);
    if (result.data.settings?.businessPosition) {
      try {
        localStorage.setItem('mm_traders_business_position_current', JSON.stringify(result.data.settings.businessPosition));
      } catch {
        // Ignore localStorage error
      }
    }
    return { success: true, data: result.data, summary: result.summary };
  } catch (err: any) {
    return { success: false, error: `ডাটাবেজ সেভ করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}` };
  }
}

export function resetToInitialSeed(preservedSettings?: BusinessSettings, ownerUser?: User): AppDatabase {
  return StorageService.resetToBlank(preservedSettings, ownerUser);
}
