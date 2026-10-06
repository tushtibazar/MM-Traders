export type UserRole = 'owner' | 'sr';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  pin: string;
  phone: string;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  shopName: string;
  phone: string;
  address: string;
  assignedSrId: string;
  assignedSrName: string;
  openingBalance: number;
  currentDue: number;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  purchasePrice: number; // Hidden from SR users
  salePrice: number;
  unit: string; // e.g., 'কার্টন', 'পিস', 'বক্স', 'কেজি'
  packSize: string; // e.g., '12 pcs/ctn'
  cartonQty: number; // units per carton
  piecesPerCarton?: number; // defined conversion: 1 carton = X pieces
  perPiecePrice?: number; // Auto-calculated: salePrice / piecesPerCarton
  openingStock: number;
  currentStock: number;
  minStockAlert: number;
  status: 'active' | 'inactive';
  freePieces?: number; // Free pieces received with purchase
  profitMargin?: number; // Desired profit margin %
  adjustment?: number; // Manual price adjustment amount
  deletedFromStock?: boolean;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  rate: number; // Historical sale price captured at the moment of sale
  purchasePrice?: number; // Captured for owner profitability analytics
  quantity: number;
  returnQuantity: number;
  discount: number;
  lineTotal: number; // (quantity - returnQuantity) * rate - discount
}

export interface Sale {
  id: string; // e.g., "MEMO-20260917-001"
  memoNo: string;
  date: string; // "YYYY-MM-DD"
  customerId: string;
  customerName: string;
  shopName: string;
  customerPhone?: string;
  customerAddress?: string;
  srId: string;
  srName: string;
  previousDue: number;
  items: SaleItem[];
  totalProductAmount: number;
  totalDiscount: number;
  netSales: number;
  paymentReceived: number;
  newDue: number; // previousDue + netSales - paymentReceived
  paymentMethod?: 'cash' | 'bank' | 'mobile_banking' | 'other';
  note?: string;
  status: 'completed' | 'void';
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface Payment {
  id: string; // "PAY-20260917-001"
  receiptNo: string;
  date: string; // "YYYY-MM-DD"
  customerId: string;
  customerName: string;
  shopName: string;
  srId?: string;
  srName?: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'mobile_banking' | 'other';
  receivedBy: string;
  note?: string;
  saleId?: string; // If collected directly with a sale memo
  status: 'completed' | 'void';
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'opening' | 'sale' | 'payment' | 'return' | 'adjustment' | 'void_sale' | 'void_payment' | 'settled_due' | 'void_due';
  referenceId: string;
  description: string;
  debit: number; // increases customer due (e.g., sales)
  credit: number; // decreases customer due (e.g., payments, returns)
  balance: number; // balance after transaction
  status?: 'active' | 'settled' | 'voided';
  settledDate?: string;
  settledNote?: string;
  createdAt: string;
}

export interface StockTransaction {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'purchase' | 'sale' | 'return' | 'damage' | 'adjustment' | 'void_reversal';
  quantity: number; // change quantity (+/-)
  previousStock: number;
  newStock: number;
  referenceId?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
}

export interface Expense {
  id: string;
  sheetId?: string;
  referenceId?: string;
  routeOrSr?: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  paidFrom: 'cash' | 'bank' | 'personal';
  note?: string;
  status: 'completed' | 'void';
  createdAt: string;
  createdBy: string;
}

export interface LessEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string; // বিবরণ / Note
  amount: number; // টাকা
  status: 'pending' | 'reimbursed'; // 'pending' = বকেয়া (Not yet reimbursed), 'reimbursed' = ফেরত পেয়েছি
  reimbursedDate?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface LessSettlement {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

export interface SalesRepresentative {
  id: string;
  name: string;
  phone: string;
  username: string;
  pin: string;
  territory: string;
  dailyTarget?: number;
  active: boolean;
  createdAt: string;
}

export interface DeliveryRepresentative {
  id: string;
  name: string;
  phone: string;
  vehicleNo?: string;
  active: boolean;
  createdAt: string;
}

export interface OtherPositionItem {
  id: string;
  description: string;
  amount: number;
}

export interface CustomPositionItem {
  id: string;
  name: string;
  type: 'asset' | 'liability';
  amount: number;
  note?: string;
}

export interface BusinessPositionSettings {
  stockOverride?: number | null;
  stockAdjustment?: number;
  stockNote?: string;
  damageAdjustment?: number;
  damageNote?: string;
  dueOverride?: number | null;
  dueAdjustment?: number;
  dueNote?: string;
  cashOverride?: number | null;
  cashAdjustment?: number;
  cashNote?: string;
  bankBalance?: number;
  bankNote?: string;
  lessOverride?: number | null;
  lessAdjustment?: number;
  lessNote?: string;
  undeliveredAmount?: number;
  undeliveredNote?: string;
  campaignAmount?: number;
  campaignNote?: string;
  appCashAmount?: number;
  appCashNote?: string;
  doAmount?: number;
  doNote?: string;
  vehicleStockAmount?: number;
  vehicleStockNote?: string;
  others?: OtherPositionItem[];
  originalInvestment?: number;
  supplierPayables?: number;
  supplierNote?: string;
  loansPayables?: number;
  loansNote?: string;
  customItems?: CustomPositionItem[];
  lastSavedAt?: string;
}

export interface BusinessSettings {
  businessName: string;
  subtitle: string;
  address: string;
  phone: string;
  proprietorName: string;
  currency: string;
  openingCashBalance: number;
  tradeLicenseNo?: string;
  footerNote?: string;
  dsrList?: string[];
  customRoutes?: string[];
  securityPin?: string; // 4-6 digit security PIN for product deletion and due collection confirmation
  ownerPin?: string;
  businessPosition?: BusinessPositionSettings;
}

export interface DailyAccountItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unit: string;
  packSize: string;
  openingStock: number; // Godown stock at the time of issue
  issuedQty: number; // What products went out today (in pieces)
  returnQty: number; // How many came back (in pieces)
  netSoldQty: number; // Actual quantity sold (issuedQty - returnQty) (in pieces)
  sellingPrice: number; // Selling rate locked at date of transaction
  grossAmount: number; // Total amount (netSoldQty * sellingPrice)
  damageQty: number; // Market damage quantity (in pieces)
  damageValue: number; // Market damage value (damageQty * sellingPrice)
  finalNetAmount: number; // Final net sales amount (grossAmount - damageValue)
  closingStock: number; // Estimated stock after this sheet
  // Carton / Piece unit tracking
  issuedUnit?: 'C' | 'P';
  returnUnit?: 'C' | 'P';
  damageUnit?: 'C' | 'P';
  rawIssuedQty?: number;
  rawReturnQty?: number;
  rawDamageQty?: number;
  piecesPerCarton?: number;
}

export interface DailyDueEntry {
  id: string;
  dueNo?: string; // Sequential due number, e.g. "DUE-0001"
  customerId?: string;
  customerName?: string;
  shopName?: string;
  description: string;
  amount: number;
  pinVerified?: boolean;
  verifiedAt?: string;
  isSavedToLedger?: boolean;
}

export interface DailyAccountSheet {
  id: string; // e.g., "DAS-2026-09-17"
  date: string; // "YYYY-MM-DD"
  sheetNo?: string;
  srId?: string;
  srName?: string;
  dsrId?: string;
  dsrName?: string;
  routeOrVan?: string;
  items: DailyAccountItem[];
  damageItems?: DailyAccountItem[];
  totalIssuedQty: number;
  totalReturnQty: number;
  totalNetSoldQty: number;
  totalGrossAmount: number;
  totalDamageQty: number;
  totalDamageValue: number;
  finalNetSalesAmount: number; // Final net sales amount for the day (Gross Sales - Total Damage)
  // Dynamic Due activity entries (আজকের বাকি ও বাকি জমা)
  todayDueEntries?: DailyDueEntry[];
  dueCollectionEntries?: DailyDueEntry[];
  // Due summary fields (বাকি হিসাব)
  previousDue?: number;
  todayDue?: number;
  dueCollection?: number;
  totalClosingDue?: number;
  dueNotes?: string;
  // Market cash and expense reconciliation
  cashCollected: number;
  marketExpense: number;
  netCashSubmitted: number; // cashCollected - marketExpense
  marketDue: number; // finalNetSalesAmount - cashCollected
  lessAmount?: number;
  dailyLess?: number;
  shortAmount?: number;
  dailyShort?: number;
  cashDenominations?: { [key: string]: any };
  isSalesTableLocked?: boolean;
  isDamageTableLocked?: boolean;
  status: 'draft' | 'confirmed' | 'pending' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AppDatabase {
  users: User[];
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  dailySheets: DailyAccountSheet[];
  customerLedgers: CustomerLedgerEntry[];
  stockTransactions: StockTransaction[];
  expenses: Expense[];
  lessEntries: LessEntry[];
  lessSettlements?: LessSettlement[];
  salesRepresentatives: SalesRepresentative[];
  deliveryRepresentatives?: DeliveryRepresentative[];
  settings: BusinessSettings;
  lastUpdated: string;
}
