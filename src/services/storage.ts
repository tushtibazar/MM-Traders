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
  StockTransaction,
  User,
} from '../types';
import { SEED_CUSTOMERS } from '../data/seedCustomers';

const STORAGE_KEY = 'mm_traders_business_db_v2';

export const DEFAULT_ROUTES = [
  'রুট ১: চকবাজার ও বেগম বাজার',
  'রুট ২: লালবাগ ও ইসলামবাগ',
  'রুট ৩: নিউমার্কেট ও আজিমপুর',
  'রুট ৪: সদরঘাট ও বাবুবাজার',
  'রুট ৫: মৌলভীবাজার ও মিটফোর্ড',
  'রুট ৬: বংশাল ও নাজিরাবাজার',
];

// Initial Seed Data for MM TRADERS DISTRIBUTOR
export const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'MM TRADERS',
  subtitle: 'DISTRIBUTOR',
  address: 'বাণিজ্যিক এলাকা, ঢাকা, বাংলাদেশ',
  phone: '০১৭১১-XXXXXX / ০১৮১৯-XXXXXX',
  proprietorName: 'Mohammad Mamun',
  currency: '৳',
  openingCashBalance: 50000,
  tradeLicenseNo: 'TRAD/MMT/092144',
  footerNote: 'MM TRADERS — বিশ্বস্ত ডিস্ট্রিবিউশন পার্টনার। হিসাব বুঝে নিন ও সঠিক সময়ে পরিশোধ করুন।',
  securityPin: '1234',
  customRoutes: DEFAULT_ROUTES,
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-owner',
    username: 'owner',
    name: 'Mohammad Mamun (মালিক)',
    role: 'owner',
    pin: '1234',
    phone: '০১৭১১-XXXXXX',
    active: true,
  },
  {
    id: 'user-sr-1',
    username: 'ariful',
    name: 'মো: আরিফুল ইসলাম (SR)',
    role: 'sr',
    pin: '1111',
    phone: '০১৮১৯-১১২২৩৩',
    active: true,
  },
  {
    id: 'user-sr-2',
    username: 'shafiqul',
    name: 'মো: শফিকুল আলম (SR)',
    role: 'sr',
    pin: '2222',
    phone: '০১৭১১-৪৪৫৫৬৬',
    active: true,
  },
];

export const INITIAL_SRS: SalesRepresentative[] = [
  {
    id: 'sr-1',
    name: 'মো: আরিফুল ইসলাম',
    phone: '০১৮১৯-১১২২৩৩',
    username: 'ariful',
    pin: '1111',
    territory: 'চকবাজার ও লালবাগ এলাকা',
    active: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'sr-2',
    name: 'মো: শফিকুল আলম',
    phone: '০১৭১১-৪৪৫৫৬৬',
    username: 'shafiqul',
    pin: '2222',
    territory: 'নিউমার্কেট ও আজিমপুর এলাকা',
    active: true,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-pran-1',
    code: 'PRAN-MJ-250',
    name: 'PRAN Mango Juice 250ml',
    category: 'জুস ও বেভারেজ',
    purchasePrice: 500,
    salePrice: 600,
    unit: 'কার্টন',
    packSize: '২৪ পিস / কার্টন',
    cartonQty: 24,
    openingStock: 120,
    currentStock: 97,
    minStockAlert: 20,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-pran-2',
    code: 'PRAN-FRO-500',
    name: 'PRAN Frooto 500ml',
    category: 'জুস ও বেভারেজ',
    purchasePrice: 700,
    salePrice: 840,
    unit: 'কার্টন',
    packSize: '২৪ বোতল / কার্টন',
    cartonQty: 24,
    openingStock: 90,
    currentStock: 72,
    minStockAlert: 15,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-pran-3',
    code: 'PRAN-POT-CRK',
    name: 'PRAN Potato Crackers',
    category: 'স্ন্যাকস ও চিপস',
    purchasePrice: 580,
    salePrice: 720,
    unit: 'কার্টন',
    packSize: '৪৮ প্যাকেট / কার্টন',
    cartonQty: 48,
    openingStock: 70,
    currentStock: 57,
    minStockAlert: 15,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-pran-4',
    code: 'PRAN-SPC-200',
    name: 'PRAN Spice Powder 200g',
    category: 'মসলা সামগ্রী',
    purchasePrice: 2200,
    salePrice: 2550,
    unit: 'কার্টন',
    packSize: '২৪ প্যাকেট / কার্টন',
    cartonQty: 24,
    openingStock: 50,
    currentStock: 42,
    minStockAlert: 10,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-pran-5',
    code: 'PRAN-WAT-500',
    name: 'PRAN Drinking Water 500ml',
    category: 'মিনারেল ওয়াটার',
    purchasePrice: 260,
    salePrice: 320,
    unit: 'কার্টন',
    packSize: '২৪ বোতল / কার্টন',
    cartonQty: 24,
    openingStock: 150,
    currentStock: 120,
    minStockAlert: 25,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-1',
    code: 'CC-500',
    name: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
    category: 'কোমল পানীয়',
    purchasePrice: 720,
    salePrice: 840,
    unit: 'কার্টন',
    packSize: '২৪ বোতল / কার্টন',
    cartonQty: 24,
    openingStock: 100,
    currentStock: 65,
    minStockAlert: 20,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-2',
    code: 'FO-5L',
    name: 'ফ্রেশ সয়াবিন তেল ৫ লিটার',
    category: 'ভোজ্যতেল',
    purchasePrice: 3100,
    salePrice: 3350,
    unit: 'কার্টন',
    packSize: '৪ বোতল / কার্টন',
    cartonQty: 4,
    openingStock: 50,
    currentStock: 38,
    minStockAlert: 15,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-3',
    code: 'RICE-50',
    name: 'মিনিকেট চাল প্রিমিয়াম ৫০ কেজি',
    category: 'চাল ও খাদ্যশস্য',
    purchasePrice: 3450,
    salePrice: 3700,
    unit: 'বস্তা',
    packSize: '৫০ কেজি / বস্তা',
    cartonQty: 1,
    openingStock: 40,
    currentStock: 30,
    minStockAlert: 10,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-4',
    code: 'RCP-200',
    name: 'রাঁধুনী গুঁড়া মরিচ ২০০ গ্রাম',
    category: 'মসলা সামগ্রী',
    purchasePrice: 2600,
    salePrice: 2950,
    unit: 'কার্টন',
    packSize: '৩৬ প্যাক / কার্টন',
    cartonQty: 36,
    openingStock: 35,
    currentStock: 25,
    minStockAlert: 8,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'prod-6',
    code: 'LUX-100',
    name: 'লাক্স বিউটি সোপ ১০০ গ্রাম',
    category: 'টয়লেট্রিজ',
    purchasePrice: 3600,
    salePrice: 4100,
    unit: 'কার্টন',
    packSize: '৭২ পিস / কার্টন',
    cartonQty: 72,
    openingStock: 30,
    currentStock: 22,
    minStockAlert: 10,
    status: 'active',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

export const INITIAL_CUSTOMERS: Customer[] = SEED_CUSTOMERS;

export const INITIAL_LEDGERS: CustomerLedgerEntry[] = [
  // Customer 1
  {
    id: 'ledg-1-op',
    customerId: 'cust-1',
    date: '2026-09-01',
    type: 'opening',
    referenceId: 'OPENING',
    description: 'প্রারম্ভিক বকেয়া ব্যালেন্স (Opening Balance)',
    debit: 15000,
    credit: 0,
    balance: 15000,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'ledg-1-sale-1',
    customerId: 'cust-1',
    date: '2026-09-15',
    type: 'sale',
    referenceId: 'MEMO-20260915-001',
    description: 'দৈনিক বিক্রয় মেমো # MEMO-20260915-001',
    debit: 11550,
    credit: 0,
    balance: 26550,
    createdAt: '2026-09-15T10:30:00.000Z',
  },
  {
    id: 'ledg-1-pay-1',
    customerId: 'cust-1',
    date: '2026-09-16',
    type: 'payment',
    referenceId: 'PAY-20260916-001',
    description: 'টাকা আদায় রশিদ # PAY-20260916-001 (নগদ)',
    debit: 0,
    credit: 5000,
    balance: 21550,
    createdAt: '2026-09-16T14:15:00.000Z',
  },
  // Customer 2
  {
    id: 'ledg-2-op',
    customerId: 'cust-2',
    date: '2026-09-01',
    type: 'opening',
    referenceId: 'OPENING',
    description: 'প্রারম্ভিক বকেয়া ব্যালেন্স',
    debit: 12000,
    credit: 0,
    balance: 12000,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'ledg-2-sale-1',
    customerId: 'cust-2',
    date: '2026-09-16',
    type: 'sale',
    referenceId: 'MEMO-20260916-002',
    description: 'দৈনিক বিক্রয় মেমো # MEMO-20260916-002',
    debit: 8750,
    credit: 0,
    balance: 20750,
    createdAt: '2026-09-16T11:00:00.000Z',
  },
  {
    id: 'ledg-2-pay-1',
    customerId: 'cust-2',
    date: '2026-09-17',
    type: 'payment',
    referenceId: 'PAY-20260917-001',
    description: 'টাকা আদায় রশিদ # PAY-20260917-001 (বিকাশ)',
    debit: 0,
    credit: 6000,
    balance: 14750,
    createdAt: '2026-09-17T09:30:00.000Z',
  },
  // Customer 3
  {
    id: 'ledg-3-op',
    customerId: 'cust-3',
    date: '2026-09-01',
    type: 'opening',
    referenceId: 'OPENING',
    description: 'প্রারম্ভিক বকেয়া ব্যালেন্স',
    debit: 8000,
    credit: 0,
    balance: 8000,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'ledg-3-sale-1',
    customerId: 'cust-3',
    date: '2026-09-16',
    type: 'sale',
    referenceId: 'MEMO-20260916-003',
    description: 'দৈনিক বিক্রয় মেমো # MEMO-20260916-003',
    debit: 5400,
    credit: 0,
    balance: 13400,
    createdAt: '2026-09-16T15:00:00.000Z',
  },
  {
    id: 'ledg-3-pay-1',
    customerId: 'cust-3',
    date: '2026-09-17',
    type: 'payment',
    referenceId: 'PAY-20260917-002',
    description: 'টাকা আদায় রশিদ # PAY-20260917-002 (নগদ)',
    debit: 0,
    credit: 2000,
    balance: 11400,
    createdAt: '2026-09-17T10:00:00.000Z',
  },
  // Customer 4
  {
    id: 'ledg-4-op',
    customerId: 'cust-4',
    date: '2026-09-01',
    type: 'opening',
    referenceId: 'OPENING',
    description: 'প্রারম্ভিক বকেয়া ব্যালেন্স',
    debit: 5000,
    credit: 0,
    balance: 5000,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'ledg-4-sale-1',
    customerId: 'cust-4',
    date: '2026-09-17',
    type: 'sale',
    referenceId: 'MEMO-20260917-001',
    description: 'দৈনিক বিক্রয় মেমো # MEMO-20260917-001',
    debit: 4900,
    credit: 0,
    balance: 9900,
    createdAt: '2026-09-17T09:15:00.000Z',
  },
  {
    id: 'ledg-4-pay-1',
    customerId: 'cust-4',
    date: '2026-09-17',
    type: 'payment',
    referenceId: 'PAY-20260917-003',
    description: 'টাকা আদায় রশিদ (নগদ বিক্রয় জমা)',
    debit: 0,
    credit: 2000,
    balance: 7900,
    createdAt: '2026-09-17T09:15:00.000Z',
  },
  // Customer 5
  {
    id: 'ledg-5-op',
    customerId: 'cust-5',
    date: '2026-09-01',
    type: 'opening',
    referenceId: 'OPENING',
    description: 'প্রারম্ভিক বকেয়া ব্যালেন্স (Opening Balance)',
    debit: 12000,
    credit: 0,
    balance: 12000,
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'ledg-5-sale-1',
    customerId: 'cust-5',
    date: '2026-09-17',
    type: 'sale',
    referenceId: 'MEMO-20260917-005',
    description: 'দৈনিক বিক্রয় মেমো # MEMO-20260917-005',
    debit: 4500,
    credit: 0,
    balance: 16500,
    createdAt: '2026-09-17T11:00:00.000Z',
  },
];

export const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-1',
    memoNo: 'MEMO-20260915-001',
    date: '2026-09-15',
    customerId: 'cust-1',
    customerName: 'মো: নজরুল ইসলাম',
    shopName: 'জননী জেনারেল স্টোর',
    customerPhone: '০১৭১২-৯৯৮৮৭৭',
    customerAddress: '১২/এ চক সার্কুলার রোড, চকবাজার',
    srId: 'sr-1',
    srName: 'মো: আরিফুল ইসলাম',
    previousDue: 15000,
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productCode: 'CC-500',
        productName: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
        unit: 'কার্টন (২৪ বোতল)',
        rate: 840,
        purchasePrice: 720,
        quantity: 10,
        returnQuantity: 0,
        discount: 100,
        lineTotal: 8300,
      },
      {
        id: 'item-2',
        productId: 'prod-5',
        productCode: 'PW-500',
        productName: 'প্রাণ ড্রিংকিং ওয়াটার ৫০০ মি.লি.',
        unit: 'কার্টন (২৪ বোতল)',
        rate: 320,
        purchasePrice: 260,
        quantity: 10,
        returnQuantity: 0,
        discount: 50,
        lineTotal: 3150,
      },
      {
        id: 'item-3',
        productId: 'prod-4',
        productCode: 'RCP-200',
        productName: 'রাঁধুনী গুঁড়া মরিচ ২০০ গ্রাম',
        unit: 'কার্টন (৩৬ প্যাক)',
        rate: 2950,
        purchasePrice: 2600,
        quantity: 1,
        returnQuantity: 0,
        discount: 0,
        lineTotal: 2950,
      },
    ],
    totalProductAmount: 14500,
    totalDiscount: 150,
    netSales: 11550,
    paymentReceived: 0,
    newDue: 26550,
    note: 'মালের ডেলিভারি সম্পন্ন',
    status: 'completed',
    createdAt: '2026-09-15T10:30:00.000Z',
    createdBy: 'user-sr-1',
  },
  {
    id: 'sale-2',
    memoNo: 'MEMO-20260916-002',
    date: '2026-09-16',
    customerId: 'cust-2',
    customerName: 'হাজী আব্দুল কাদের',
    shopName: 'বিসমিল্লাহ ডিপার্টমেন্টাল স্টোর',
    customerPhone: '০১৮১৫-৬৬৭৭৮৮',
    customerAddress: '৪৫ লালবাগ শাহী মসজিদ মোড়',
    srId: 'sr-1',
    srName: 'মো: আরিফুল ইসলাম',
    previousDue: 12000,
    items: [
      {
        id: 'item-4',
        productId: 'prod-2',
        productCode: 'FO-5L',
        productName: 'ফ্রেশ সয়াবিন তেল ৫ লিটার',
        unit: 'কার্টন (৪ বোতল)',
        rate: 3350,
        purchasePrice: 3100,
        quantity: 2,
        returnQuantity: 0,
        discount: 50,
        lineTotal: 6650,
      },
      {
        id: 'item-5',
        productId: 'prod-6',
        productCode: 'LUX-100',
        productName: 'লাক্স বিউটি সোপ ১০০ গ্রাম',
        unit: 'কার্টন (৭২ পিস)',
        rate: 4100,
        purchasePrice: 3600,
        quantity: 1,
        returnQuantity: 0,
        discount: 0,
        lineTotal: 4100,
      },
    ],
    totalProductAmount: 10800,
    totalDiscount: 50,
    netSales: 8750,
    paymentReceived: 0,
    newDue: 20750,
    note: 'সকাল ১০টায় ডেলিভারি',
    status: 'completed',
    createdAt: '2026-09-16T11:00:00.000Z',
    createdBy: 'user-sr-1',
  },
  {
    id: 'sale-3',
    memoNo: 'MEMO-20260917-001',
    date: '2026-09-17',
    customerId: 'cust-4',
    customerName: 'মো: তারেক রহমান',
    shopName: 'নিউ ঢাকা কনফেকশনারি',
    customerPhone: '০১৬১১-২২৩৩৪৪',
    customerAddress: '১৮ আজিমপুর বাসস্ট্যান্ড, ঢাকা',
    srId: 'sr-2',
    srName: 'মো: শফিকুল আলম',
    previousDue: 5000,
    items: [
      {
        id: 'item-6',
        productId: 'prod-1',
        productCode: 'CC-500',
        productName: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
        unit: 'কার্টন (২৪ বোতল)',
        rate: 840,
        purchasePrice: 720,
        quantity: 4,
        returnQuantity: 0,
        discount: 60,
        lineTotal: 3300,
      },
      {
        id: 'item-7',
        productId: 'prod-5',
        productCode: 'PW-500',
        productName: 'প্রাণ ড্রিংকিং ওয়াটার ৫০০ মি.লি.',
        unit: 'কার্টন (২৪ বোতল)',
        rate: 320,
        purchasePrice: 260,
        quantity: 5,
        returnQuantity: 0,
        discount: 0,
        lineTotal: 1600,
      },
    ],
    totalProductAmount: 4960,
    totalDiscount: 60,
    netSales: 4900,
    paymentReceived: 2000,
    newDue: 7900,
    paymentMethod: 'cash',
    note: 'নগদ ২,০০০ টাকা আদায়সহ মেমো তৈরি করা হয়েছে',
    status: 'completed',
    createdAt: '2026-09-17T09:15:00.000Z',
    createdBy: 'user-sr-2',
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    receiptNo: 'PAY-20260916-001',
    date: '2026-09-16',
    customerId: 'cust-1',
    customerName: 'মো: নজরুল ইসলাম',
    shopName: 'জননী জেনারেল স্টোর',
    srId: 'sr-1',
    srName: 'মো: আরিফুল ইসলাম',
    amount: 5000,
    paymentMethod: 'cash',
    receivedBy: 'মো: আরিফুল ইসলাম (SR)',
    note: 'সাপ্তাহিক কিস্তি জমা',
    status: 'completed',
    createdAt: '2026-09-16T14:15:00.000Z',
    createdBy: 'user-sr-1',
  },
  {
    id: 'pay-2',
    receiptNo: 'PAY-20260917-001',
    date: '2026-09-17',
    customerId: 'cust-2',
    customerName: 'হাজী আব্দুল কাদের',
    shopName: 'বিসমিল্লাহ ডিপার্টমেন্টাল স্টোর',
    srId: 'sr-1',
    srName: 'মো: আরিফুল ইসলাম',
    amount: 6000,
    paymentMethod: 'mobile_banking',
    receivedBy: 'মো: আরিফুল ইসলাম (SR)',
    note: 'বিকাশ ট্রান্সফার TrxID: BK9284920',
    status: 'completed',
    createdAt: '2026-09-17T09:30:00.000Z',
    createdBy: 'user-sr-1',
  },
  {
    id: 'pay-3',
    receiptNo: 'PAY-20260917-002',
    date: '2026-09-17',
    customerId: 'cust-3',
    customerName: 'মো: বেলাল হোসেন',
    shopName: 'আল-মদিনা ভ্যারাইটিজ স্টোর',
    srId: 'sr-2',
    srName: 'মো: শফিকুল আলম',
    amount: 2000,
    paymentMethod: 'cash',
    receivedBy: 'মো: শফিকুল আলম (SR)',
    note: 'নগদ ক্যাশ গ্রহণ',
    status: 'completed',
    createdAt: '2026-09-17T10:00:00.000Z',
    createdBy: 'user-sr-2',
  },
  {
    id: 'pay-4',
    receiptNo: 'PAY-20260917-003',
    date: '2026-09-17',
    customerId: 'cust-4',
    customerName: 'মো: তারেক রহমান',
    shopName: 'নিউ ঢাকা কনফেকশনারি',
    srId: 'sr-2',
    srName: 'মো: শফিকুল আলম',
    amount: 2000,
    paymentMethod: 'cash',
    receivedBy: 'মো: শফিকুল আলম (SR)',
    saleId: 'sale-3',
    note: 'মেমো # MEMO-20260917-001 বিক্রয়কালীন নগদ গ্রহণ',
    status: 'completed',
    createdAt: '2026-09-17T09:15:00.000Z',
    createdBy: 'user-sr-2',
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: '2026-09-17',
    category: 'গাড়ি / পরিবহন',
    amount: 850,
    description: 'লালবাগ ও চকবাজার রুটে ভ্যান ভাড়া',
    paidFrom: 'cash',
    note: 'ভ্যান চালক রফিকের ভাড়া',
    status: 'completed',
    createdAt: '2026-09-17T08:30:00.000Z',
    createdBy: 'user-owner',
  },
  {
    id: 'exp-2',
    date: '2026-09-17',
    category: 'চা / আপ্যায়ন',
    amount: 180,
    description: 'সকালের নাস্তা ও চা খরচ',
    paidFrom: 'cash',
    note: 'স্টাফ ও অতিথি আপ্যায়ন',
    status: 'completed',
    createdAt: '2026-09-17T10:15:00.000Z',
    createdBy: 'user-owner',
  },
  {
    id: 'exp-3',
    date: '2026-09-15',
    category: 'বিদ্যুৎ বিল',
    amount: 3200,
    description: 'গোডাউন ও অফিসের আগস্ট মাসের বিদ্যুৎ বিল',
    paidFrom: 'bank',
    note: 'অনলাইন ব্যাংক পেমেন্ট',
    status: 'completed',
    createdAt: '2026-09-15T12:00:00.000Z',
    createdBy: 'user-owner',
  },
];

export const INITIAL_LESS_ENTRIES: LessEntry[] = [
  {
    id: 'less-1',
    date: '2026-09-17',
    description: 'চকবাজার রুটে কোম্পানি শর্টফেল সমন্বয় অগ্রিম',
    amount: 1200,
    status: 'pending',
    createdAt: '2026-09-17T09:00:00.000Z',
    createdBy: 'Mohammad Mamun (মালিক)',
  },
  {
    id: 'less-2',
    date: '2026-09-16',
    description: 'ডিলার ঘাটতি ক্যাশ প্রদান (পরবর্তীতে ফেরত সমন্বয়)',
    amount: 800,
    status: 'reimbursed',
    reimbursedDate: '2026-09-18',
    createdAt: '2026-09-16T11:00:00.000Z',
    createdBy: 'Mohammad Mamun (মালিক)',
  },
];

export const INITIAL_LESS_SETTLEMENTS: LessSettlement[] = [];

export const INITIAL_STOCK_TRANSACTIONS: StockTransaction[] = [
  {
    id: 'st-1',
    date: '2026-09-01',
    productId: 'prod-1',
    productName: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
    type: 'purchase',
    quantity: 100,
    previousStock: 0,
    newStock: 100,
    note: 'প্রারম্ভিক স্টক ইনওয়ার্ড',
    createdAt: '2026-09-01T08:00:00.000Z',
    createdBy: 'user-owner',
  },
  {
    id: 'st-2',
    date: '2026-09-15',
    productId: 'prod-1',
    productName: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
    type: 'sale',
    quantity: -10,
    previousStock: 100,
    newStock: 90,
    referenceId: 'MEMO-20260915-001',
    note: 'বিক্রয় মেমো # MEMO-20260915-001',
    createdAt: '2026-09-15T10:30:00.000Z',
    createdBy: 'user-sr-1',
  },
  {
    id: 'st-3',
    date: '2026-09-17',
    productId: 'prod-1',
    productName: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
    type: 'sale',
    quantity: -4,
    previousStock: 80,
    newStock: 76,
    referenceId: 'MEMO-20260917-001',
    note: 'বিক্রয় মেমো # MEMO-20260917-001',
    createdAt: '2026-09-17T09:15:00.000Z',
    createdBy: 'user-sr-2',
  },
];

export const INITIAL_DAILY_SHEETS: DailyAccountSheet[] = [
  {
    id: 'das-20260917-001',
    sheetNo: 'DAS-20260917-001',
    date: '2026-09-17',
    routeOrVan: 'গাড়ি নং ০১ (চকবাজার ও লালবাগ রুট)',
    srId: 'sr-1',
    srName: 'মো: আরিফুল ইসলাম (SR)',
    items: [
      {
        id: 'item-1',
        productId: 'prod-pran-1',
        productCode: 'PRAN-MJ-250',
        productName: 'PRAN Mango Juice 250ml',
        unit: 'কার্টন',
        packSize: '২৪ পিস / কার্টন',
        openingStock: 120,
        issuedQty: 25,
        returnQty: 3,
        netSoldQty: 22,
        sellingPrice: 600,
        grossAmount: 13200,
        damageQty: 1,
        damageValue: 600,
        finalNetAmount: 12600,
        closingStock: 97,
      },
      {
        id: 'item-2',
        productId: 'prod-pran-2',
        productCode: 'PRAN-FRO-500',
        productName: 'PRAN Frooto 500ml',
        unit: 'কার্টন',
        packSize: '২৪ বোতল / কার্টন',
        openingStock: 90,
        issuedQty: 20,
        returnQty: 2,
        netSoldQty: 18,
        sellingPrice: 840,
        grossAmount: 15120,
        damageQty: 0,
        damageValue: 0,
        finalNetAmount: 15120,
        closingStock: 72,
      },
      {
        id: 'item-3',
        productId: 'prod-1',
        productCode: 'CC-500',
        productName: 'কোকা-কোলা ৫০০ মি.লি. বোতল',
        unit: 'কার্টন',
        packSize: '২৪ বোতল / কার্টন',
        openingStock: 100,
        issuedQty: 36,
        returnQty: 1,
        netSoldQty: 35,
        sellingPrice: 840,
        grossAmount: 29400,
        damageQty: 0,
        damageValue: 0,
        finalNetAmount: 29400,
        closingStock: 65,
      },
      {
        id: 'item-4',
        productId: 'prod-pran-3',
        productCode: 'PRAN-POT-CRK',
        productName: 'PRAN Potato Crackers',
        unit: 'কার্টন',
        packSize: '৪৮ প্যাকেট / কার্টন',
        openingStock: 70,
        issuedQty: 15,
        returnQty: 2,
        netSoldQty: 13,
        sellingPrice: 720,
        grossAmount: 9360,
        damageQty: 0,
        damageValue: 0,
        finalNetAmount: 9360,
        closingStock: 57,
      },
    ],
    totalIssuedQty: 96,
    totalReturnQty: 8,
    totalNetSoldQty: 88,
    totalGrossAmount: 67080,
    totalDamageQty: 1,
    totalDamageValue: 600,
    finalNetSalesAmount: 66480,
    cashCollected: 58000,
    marketExpense: 850,
    netCashSubmitted: 57150,
    marketDue: 8480,
    status: 'confirmed',
    notes: 'চকবাজার রুটে দৈনিক মাল ডেলিভারি সম্পন্ন। ১ কার্টন জুস নষ্ট/ড্যামেজ হয়েছে।',
    createdAt: '2026-09-17T08:00:00.000Z',
    updatedAt: '2026-09-17T17:30:00.000Z',
    createdBy: 'Mohammad Mamun (মালিক)',
  },
];

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
    settings: INITIAL_SETTINGS,
    lastUpdated: new Date().toISOString(),
  };
}

// Storage API with localStorage and optional server sync
export class StorageService {
  private static dbCache: AppDatabase | null = null;

  public static loadDatabase(): AppDatabase {
    if (this.dbCache) {
      return this.dbCache;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: AppDatabase = JSON.parse(stored);
        // Validate basic integrity
        if (parsed.products && parsed.settings) {
          // Guarantee MM TRADERS branding and schema evolution
          parsed.settings.businessName = 'MM TRADERS';
          parsed.settings.subtitle = 'DISTRIBUTOR';
          parsed.settings.proprietorName = 'Mohammad Mamun';
          if (!Array.isArray(parsed.dailySheets)) {
            parsed.dailySheets = INITIAL_DAILY_SHEETS;
          }
          if (!Array.isArray(parsed.salesRepresentatives)) {
            parsed.salesRepresentatives = INITIAL_SRS;
          }
          if (!Array.isArray(parsed.lessEntries)) {
            parsed.lessEntries = INITIAL_LESS_ENTRIES;
          }
          if (!Array.isArray(parsed.lessSettlements)) {
            parsed.lessSettlements = [];
          }
          if (!Array.isArray(parsed.settings.customRoutes) || parsed.settings.customRoutes.length === 0) {
            parsed.settings.customRoutes = DEFAULT_ROUTES;
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
          // Keep only 10 sample customer entries in the system
          if (Array.isArray(parsed.customers) && parsed.customers.length > 10) {
            // Check if there are user-created customers (not beginning with cust-)
            const userCreatedCustomers = parsed.customers.filter((c: any) => !c.id.startsWith('cust-'));
            const seedIds = new Set(SEED_CUSTOMERS.map((c) => c.id));
            const existingSeedMatches = parsed.customers.filter((c: any) => seedIds.has(c.id));
            
            // If less than 10 seed matches, take up to 10
            const sampleTen = existingSeedMatches.length >= 10 ? existingSeedMatches.slice(0, 10) : SEED_CUSTOMERS.slice(0, 10);
            parsed.customers = [...sampleTen, ...userCreatedCustomers];

            // Clean up customer ledgers for deleted sample customers (keeping only active 10 sample customers & user created)
            const remainingCustomerIds = new Set(parsed.customers.map((c: any) => c.id));
            if (Array.isArray(parsed.customerLedgers)) {
              parsed.customerLedgers = parsed.customerLedgers.filter((l: any) =>
                remainingCustomerIds.has(l.customerId)
              );
            }

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            } catch (err) {
              // Ignore storage write error
            }
          }
          this.dbCache = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage database:', e);
    }

    // Default to initial database
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
        if (remoteDb && remoteDb.settings && remoteDb.products) {
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

  public static clearAllData(): AppDatabase {
    const emptyDb: AppDatabase = {
      users: INITIAL_USERS,
      customers: [],
      products: INITIAL_PRODUCTS,
      sales: [],
      payments: [],
      dailySheets: [],
      customerLedgers: [],
      stockTransactions: [],
      expenses: [],
      lessEntries: [],
      lessSettlements: [],
      salesRepresentatives: INITIAL_SRS,
      settings: INITIAL_SETTINGS,
      lastUpdated: new Date().toISOString(),
    };
    this.saveDatabase(emptyDb);
    return emptyDb;
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

export function resetToInitialSeed(): AppDatabase {
  return StorageService.resetToDemo();
}
