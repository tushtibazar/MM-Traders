import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Trash2,
  CheckCircle,
  AlertCircle,
  Plus,
  Calendar,
  MapPin,
  Search,
  UserCheck,
  Truck,
  FileDown,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ListFilter,
  FileText,
  Keyboard,
  Eye,
  ImageDown,
  Printer,
  Edit2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyAccountItem, DailyAccountSheet, DailyDueEntry, Product, Customer } from '../../types';
import { generateDailySalesPDF } from '../../services/pdfGenerator';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import { CashDenominationTable, DenominationMap, DENOMINATION_LIST } from './CashDenominationTable';
import { SalesReconciliationPanel } from './SalesReconciliationPanel';
import { PinPromptModal } from '../modals/PinPromptModal';
import { DueCollectionConfirmModal } from '../modals/DueCollectionConfirmModal';
import { ProductSuggestionDropdown } from './ProductSuggestionDropdown';
import { DailySalesPrintPreviewModal } from './DailySalesPrintPreviewModal';
import { RouteDueModal } from './RouteDueModal';

interface RowData {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantityOut: number | '';
  quantityOutUnit?: 'C' | 'P';
  returned: number | '';
  returnedUnit?: 'C' | 'P';
  rate: number | '';
  showSuggestions: boolean;
}

interface DueItemRow {
  id: string;
  dueNo?: string;
  customerId?: string;
  customerName?: string;
  shopName?: string;
  description: string;
  amount: number | '';
  isSavedToLedger?: boolean;
  pinVerified?: boolean;
}

interface DailySalesModuleProps {
  initialSheetId?: string | null;
  onClearInitialSheetId?: () => void;
  onViewMemo?: (sale: any) => void;
  onOpenVoidModal?: (saleId: string, memoNo: string) => void;
}

const DEFAULT_ROUTES = [
  'রুট ১: চকবাজার ও বেগম বাজার',
  'রুট ২: লালবাগ ও ইসলামবাগ',
  'রুট ৩: নিউমার্কেট ও আজিমপুর',
  'রুট ৪: সদরঘাট ও বাবুবাজার',
  'রুট ৫: মৌলভীবাজার ও মিটফোর্ড',
  'রুট ৬: বংশাল ও নাজিরাবাজার',
];

const DEFAULT_DSRS = [
  'মো: রফিকুল ইসলাম (DSR / ভ্যান চালক)',
  'মো: বাবুল মিয়া (DSR / ডেলিভারি)',
  'মো: হাসান আলী (DSR / ভ্যান চালক)',
  'মো: সুমন আহমেদ (DSR / ডেলিভারি)',
  'মো: তারেক হোসেন (DSR)',
];

const createEmptyRow = (): RowData => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  productCode: '',
  productName: '',
  quantityOut: '',
  returned: '',
  rate: '',
  showSuggestions: false,
});

const createEmptyDamageRow = (): RowData => ({
  id: `dmg-row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  productCode: '',
  productName: '',
  quantityOut: '',
  quantityOutUnit: 'P',
  returned: '',
  rate: '',
  showSuggestions: false,
});

const createEmptyDueRow = (dueNo?: string): DueItemRow => ({
  id: `due-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  dueNo: dueNo || '',
  customerId: '',
  customerName: '',
  shopName: '',
  description: '',
  amount: '',
  isSavedToLedger: false,
  pinVerified: false,
});

export const DailySalesModule: React.FC<DailySalesModuleProps> = ({
  initialSheetId,
  onClearInitialSheetId,
}) => {
  const {
    db,
    todayDateStr,
    saveDailySheet,
    deleteDailySheet,
    currentUser,
    recordCustomerDue,
    recordDueCollection,
    todayLessAmount,
    totalOutstandingLess,
    addRoute,
    updateRoute,
    deleteRoute,
  } = useApp();
  const currency = db.settings.currency || '৳';

  // Navigation mode: 'entry' or 'history'
  const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');

  // Route Add/Edit/Delete Modals state
  const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState<boolean>(false);
  const [newRouteInput, setNewRouteInput] = useState<string>('');
  const [isEditRouteModalOpen, setIsEditRouteModalOpen] = useState<boolean>(false);
  const [editRouteInput, setEditRouteInput] = useState<string>('');
  const [isDeleteRouteModalOpen, setIsDeleteRouteModalOpen] = useState<boolean>(false);

  // Daily Sheet History Delete state & modal
  const [sheetToDeleteHistory, setSheetToDeleteHistory] = useState<DailyAccountSheet | null>(null);
  const [isDeleteHistoryModalOpen, setIsDeleteHistoryModalOpen] = useState<boolean>(false);

  // Configured routes list
  const availableRoutes = useMemo(() => {
    const baseRoutes =
      db.settings.customRoutes !== undefined && Array.isArray(db.settings.customRoutes)
        ? db.settings.customRoutes
        : DEFAULT_ROUTES;
    const srRoutes = db.salesRepresentatives
      .map((sr) => sr.territory)
      .filter((t): t is string => Boolean(t && t.trim()));
    return Array.from(new Set([...baseRoutes, ...srRoutes]));
  }, [db.salesRepresentatives, db.settings.customRoutes]);

  // Configured SR list
  const availableSRs = useMemo(() => {
    const active = db.salesRepresentatives.filter((s) => s.active !== false).map((s) => s.name);
    if (active.length > 0) return active;
    return ['মো: আরিফুল ইসলাম (SR)', 'মো: শফিকুল আলম (SR)'];
  }, [db.salesRepresentatives]);

  // Configured DSR list
  const availableDSRs = useMemo(() => {
    const fromSettings = db.settings.dsrList || [];
    return Array.from(new Set([...DEFAULT_DSRS, ...fromSettings]));
  }, [db.settings.dsrList]);

  // HEADER STATE (In exact order: Route, Date, SR Name, DSR Name)
  const [selectedRoute, setSelectedRoute] = useState<string>(availableRoutes[0] || 'রুট ১: চকবাজার ও বেগম বাজার');
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [selectedSR, setSelectedSR] = useState<string>(availableSRs[0] || 'মো: আরিফুল ইসলাম (SR)');
  const [selectedDSR, setSelectedDSR] = useState<string>(availableDSRs[0] || 'মো: রফিকুল ইসলাম (DSR / ভ্যান চালক)');

  // Active loaded Sheet ID (if editing an existing record)
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [currentSheetStatus, setCurrentSheetStatus] = useState<'pending' | 'completed'>('pending');

  // Locked state for completed sheets (admin confirmation required to edit)
  const [isLockedForEdit, setIsLockedForEdit] = useState<boolean>(false);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);

  // Table-level convenience lock states (for daily sales table and damage table)
  const [isSalesTableLocked, setIsSalesTableLocked] = useState<boolean>(false);
  const [isDamageTableLocked, setIsDamageTableLocked] = useState<boolean>(false);

  // Effective lock states: locked if either table-level lock is ON or entire record is locked for edit
  const isSalesLocked = isSalesTableLocked || isLockedForEdit;
  const isDamageLocked = isDamageTableLocked || isLockedForEdit;

  const handleToggleSalesLock = () => {
    if (isLockedForEdit) {
      setShowUnlockModal(true);
      return;
    }
    setIsSalesTableLocked((prev) => {
      const next = !prev;
      if (next) {
        showNotification('বিক্রি হিসাব টেবিল লক করা হয়েছে। নতুন লাইন যোগ বা পরিবর্তন বন্ধ রয়েছে।', 'info');
      } else {
        showNotification('বিক্রি হিসাব টেবিল আনলক করা হয়েছে। এখন নতুন লাইন ও পরিবর্তন করা যাবে।', 'info');
      }
      return next;
    });
  };

  const handleToggleDamageLock = () => {
    if (isLockedForEdit) {
      setShowUnlockModal(true);
      return;
    }
    setIsDamageTableLocked((prev) => {
      const next = !prev;
      if (next) {
        showNotification('ড্যামেজ টেবিল লক করা হয়েছে। নতুন লাইন যোগ বা পরিবর্তন বন্ধ রয়েছে।', 'info');
      } else {
        showNotification('ড্যামেজ টেবিল আনলক করা হয়েছে। এখন নতুন লাইন ও পরিবর্তন করা যাবে।', 'info');
      }
      return next;
    });
  };

  // Table Rows
  const [rows, setRows] = useState<RowData[]>([createEmptyRow()]);

  // Success / Error Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Last saved sheet reference for PDF export
  const [lastSavedSheet, setLastSavedSheet] = useState<DailyAccountSheet | null>(null);

  // Print Preview & Export Modal State
  const [previewSheet, setPreviewSheet] = useState<DailyAccountSheet | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewInitialAction, setPreviewInitialAction] = useState<'png' | 'pdf' | null>(null);

  // Input refs for mouse-free keyboard navigation and quick focus
  const prodNameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const qtyInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const returnInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const morningSaveBtnRef = useRef<HTMLButtonElement | null>(null);
  const eveningSaveBtnRef = useRef<HTMLButtonElement | null>(null);

  // DAMAGE TABLE STATE & REFS
  const [damageRows, setDamageRows] = useState<RowData[]>([createEmptyDamageRow()]);
  const damageProdNameInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const damageQtyInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [damageHighlightedSuggestionIndex, setDamageHighlightedSuggestionIndex] = useState<number>(0);

  // TWO DYNAMIC DUE TABLES STATE:
  // A) আজকের বাকি (Today's New Due)
  // B) বাকি জমা (Due Collection Today)
  const [todayDueRows, setTodayDueRows] = useState<DueItemRow[]>([createEmptyDueRow()]);
  const [dueCollectionRows, setDueCollectionRows] = useState<DueItemRow[]>([createEmptyDueRow()]);

  // Cash Denomination & Reconciliation State
  const [cashDenominations, setCashDenominations] = useState<DenominationMap>({
    1000: '',
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    10: '',
    5: '',
    other: '',
  });
  const [dailyExpense, setDailyExpense] = useState<number>(0);
  const [dailyLess, setDailyLess] = useState<number>(0);

  // Total Cash from Denominations (Subtotal of all notes + অন্যান্য amount)
  const totalDenominationCash = useMemo(() => {
    const notesTotal = DENOMINATION_LIST.reduce((sum, denom) => {
      return sum + denom * (Number(cashDenominations[denom]) || 0);
    }, 0);
    const otherTotal = Number(cashDenominations.other) || 0;
    return notesTotal + otherTotal;
  }, [cashDenominations]);

  // Security PIN verification modal state for Due Collection
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [pendingDueCollectionRow, setPendingDueCollectionRow] = useState<DueItemRow | null>(null);

  // DUE COLLECTION CONFIRMATION POPUP MODAL STATE
  const [dueConfirmModalOpen, setDueConfirmModalOpen] = useState<boolean>(false);
  const [confirmModalCustomer, setConfirmModalCustomer] = useState<Customer | null>(null);
  const [confirmModalDueNo, setConfirmModalDueNo] = useState<string | undefined>(undefined);
  const [confirmModalDefaultAmount, setConfirmModalDefaultAmount] = useState<number | undefined>(undefined);
  const [confirmModalTargetRowId, setConfirmModalTargetRowId] = useState<string | null>(null);
  const [isRouteDueModalOpen, setIsRouteDueModalOpen] = useState<boolean>(false);

  // Route Add/Edit action handlers
  const handleOpenAddRoute = () => {
    setNewRouteInput('');
    setIsAddRouteModalOpen(true);
  };

  const handleSaveNewRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRouteInput.trim();
    if (!trimmed) return;
    addRoute(trimmed);
    setSelectedRoute(trimmed);
    setIsAddRouteModalOpen(false);
    setNewRouteInput('');
    showNotification(`নতুন রুট "${trimmed}" সফলভাবে যোগ করা হয়েছে`, 'success');
  };

  const handleOpenEditRoute = () => {
    setEditRouteInput(selectedRoute || '');
    setIsEditRouteModalOpen(true);
  };

  const handleSaveEditRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editRouteInput.trim();
    if (!trimmed || trimmed === selectedRoute) {
      setIsEditRouteModalOpen(false);
      return;
    }
    const oldRoute = selectedRoute;
    updateRoute(oldRoute, trimmed);
    setSelectedRoute(trimmed);
    setIsEditRouteModalOpen(false);
    showNotification(`রুট "${trimmed}" সফলভাবে আপডেট করা হয়েছে`, 'success');
  };

  // Helper to generate next sequential Due Number (e.g. DUE-0001, DUE-0002)
  const getNextDueNumber = (existingRows?: DueItemRow[]) => {
    let maxSeq = 0;
    (db.customerLedgers || []).forEach((l) => {
      if (l.referenceId && l.referenceId.startsWith('DUE-')) {
        const num = parseInt(l.referenceId.replace('DUE-', ''), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    (db.dailySheets || []).forEach((s) => {
      (s.todayDueEntries || []).forEach((e) => {
        if (e.dueNo && e.dueNo.startsWith('DUE-')) {
          const num = parseInt(e.dueNo.replace('DUE-', ''), 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });
    });
    const checkRows = existingRows || todayDueRows;
    checkRows.forEach((r) => {
      if (r.dueNo && r.dueNo.startsWith('DUE-')) {
        const num = parseInt(r.dueNo.replace('DUE-', ''), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    return `DUE-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  // List of all outstanding dues for Due Number / Customer lookup in Table B
  const outstandingDuesList = useMemo(() => {
    const list: { dueNo: string; customerId: string; customerName: string; shopName: string; currentDue: number }[] = [];
    
    // Map known DUE numbers from ledgers
    (db.customerLedgers || []).forEach((l) => {
      if (l.referenceId && l.referenceId.startsWith('DUE-') && l.debit > 0) {
        const cust = db.customers.find((c) => c.id === l.customerId);
        if (cust && cust.currentDue > 0 && !list.some((item) => item.dueNo === l.referenceId)) {
          list.push({
            dueNo: l.referenceId,
            customerId: cust.id,
            customerName: cust.name,
            shopName: cust.shopName,
            currentDue: cust.currentDue,
          });
        }
      }
    });

    // Also include all customers with currentDue > 0
    (db.customers || []).forEach((cust) => {
      if (cust.currentDue > 0 && !list.some((item) => item.customerId === cust.id)) {
        list.push({
          dueNo: '',
          customerId: cust.id,
          customerName: cust.name,
          shopName: cust.shopName,
          currentDue: cust.currentDue,
        });
      }
    });

    return list;
  }, [db.customers, db.customerLedgers]);

  // Initialize initial row's Due Number if empty
  useEffect(() => {
    setTodayDueRows((prev) => {
      if (prev.length === 1 && !prev[0].dueNo && !prev[0].description) {
        return [{ ...prev[0], dueNo: getNextDueNumber(prev) }];
      }
      return prev;
    });
  }, [db.customerLedgers, db.dailySheets]);

  const totalTodayDueAmount = useMemo(() => {
    return todayDueRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [todayDueRows]);

  const totalDueCollectionAmount = useMemo(() => {
    return dueCollectionRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [dueCollectionRows]);

  // Product conversion ratio & default unit helper
  const getProductInfo = (productId: string) => {
    const p = db.products.find((prod) => prod.id === productId);
    const ratio = p?.piecesPerCarton || p?.cartonQty || 1;
    const isCarton = p?.unit === 'কার্টন' || p?.unit === 'কার্টুন' || ratio > 1;
    const defaultUnit: 'C' | 'P' = isCarton ? 'C' : 'P';
    return { product: p, ratio, defaultUnit, isCarton };
  };

  // Active highlighted suggestion index for keyboard product search
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState<number>(0);

  // History search & filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Calculations per row for MAIN SALES TABLE (converting C -> pieces, unit-aware rate & amount)
  const computedRows = useMemo(() => {
    return rows.map((row) => {
      const { product, ratio, defaultUnit } = getProductInfo(row.productId);
      const qUnit = row.quantityOutUnit || defaultUnit;
      const rUnit = row.returnedUnit || defaultUnit;

      const qRaw = Number(row.quantityOut) || 0;
      const rRaw = Number(row.returned) || 0;

      // Pieces conversions for godown stock tracking
      const qOutPieces = qUnit === 'C' ? qRaw * ratio : qRaw;
      const retPieces = rUnit === 'C' ? rRaw * ratio : rRaw;
      const netPieces = Math.max(0, qOutPieces - retPieces);

      // Net Quantity for row display in the current row unit
      let netSaleQty = 0;
      if (qUnit === 'C') {
        const retInCartons = rUnit === 'C' ? rRaw : (ratio > 0 ? rRaw / ratio : rRaw);
        netSaleQty = Math.max(0, qRaw - retInCartons);
      } else {
        const retInPieces = rUnit === 'P' ? rRaw : rRaw * ratio;
        netSaleQty = Math.max(0, qRaw - retInPieces);
      }
      const netSale = Number(netSaleQty.toFixed(2));

      // Rate handling
      const cartonPrice = product?.salePrice || 0;
      const exactPiecePrice = ratio > 0 ? cartonPrice / ratio : cartonPrice;
      const roundedPiecePrice = Math.round(exactPiecePrice * 100) / 100;

      let currentRate = Number(row.rate) || 0;
      if (currentRate === 0 && product) {
        currentRate = qUnit === 'C' ? cartonPrice : roundedPiecePrice;
      } else if (qUnit === 'P' && currentRate === cartonPrice && ratio > 1) {
        // Auto-fix if rate was holding carton rate in piece mode
        currentRate = roundedPiecePrice;
      } else if (qUnit === 'C' && currentRate === roundedPiecePrice && ratio > 1) {
        currentRate = cartonPrice;
      }

      // Amount calculation:
      // CASE 1 (unit C): পরিমাণ (cartons) × কার্টন রেট
      // CASE 2 (unit P): পরিমাণ (pieces) × প্রতি পিস মূল্য
      let amount = 0;
      if (qUnit === 'C') {
        amount = Math.round(netSaleQty * currentRate * 100) / 100;
      } else {
        if (product && Math.abs(currentRate - roundedPiecePrice) < 0.01) {
          // Standard piece rate: use exact ratio to avoid floating precision issues on multiples of full carton
          // e.g. 6 pieces × (470 / 6) = ৳470 exact; 1 piece = ৳78.33
          amount = Math.round(netSaleQty * exactPiecePrice * 100) / 100;
        } else {
          // Custom rate entered by user
          amount = Math.round(netSaleQty * currentRate * 100) / 100;
        }
      }

      return {
        ...row,
        ratio,
        defaultUnit,
        qUnit,
        rUnit,
        qRaw,
        rRaw,
        qOutPieces,
        retPieces,
        netPieces,
        netSale,
        rate: currentRate > 0 ? currentRate : row.rate,
        amount,
      };
    });
  }, [rows, db.products]);

  // Overall Total Amount (Gross Sales)
  const totalAmount = useMemo(() => {
    return computedRows.reduce((sum, r) => sum + r.amount, 0);
  }, [computedRows]);
  const grossSalesAmount = totalAmount;

  // Total Quantity Out in Pieces
  const totalQuantityOut = useMemo(() => {
    return computedRows.reduce((sum, r) => sum + r.qOutPieces, 0);
  }, [computedRows]);

  // Total Returned in Pieces
  const totalReturned = useMemo(() => {
    return computedRows.reduce((sum, r) => sum + r.retPieces, 0);
  }, [computedRows]);

  // Total Net Sale Quantity in Pieces
  const totalNetSaleQty = useMemo(() => {
    return computedRows.reduce((sum, r) => sum + r.netPieces, 0);
  }, [computedRows]);

  // Calculations per row for DAMAGE TABLE (converting C -> pieces, unit-aware rate & amount)
  const computedDamageRows = useMemo(() => {
    return damageRows.map((row) => {
      const { product, ratio } = getProductInfo(row.productId);
      const dUnit = row.quantityOutUnit || 'P';
      const dRaw = Number(row.quantityOut) || 0;
      const damagePieces = dUnit === 'C' ? dRaw * ratio : dRaw;
      const damageQty = dRaw;

      // Rate handling
      const cartonPrice = product?.salePrice || 0;
      const exactPiecePrice = ratio > 0 ? cartonPrice / ratio : cartonPrice;
      const roundedPiecePrice = Math.round(exactPiecePrice * 100) / 100;

      let currentRate = Number(row.rate) || 0;
      if (currentRate === 0 && product) {
        currentRate = dUnit === 'C' ? cartonPrice : roundedPiecePrice;
      } else if (dUnit === 'P' && currentRate === cartonPrice && ratio > 1) {
        currentRate = roundedPiecePrice;
      } else if (dUnit === 'C' && currentRate === roundedPiecePrice && ratio > 1) {
        currentRate = cartonPrice;
      }

      // Amount calculation
      let amount = 0;
      if (dUnit === 'C') {
        amount = Math.round(damageQty * currentRate * 100) / 100;
      } else {
        if (product && Math.abs(currentRate - roundedPiecePrice) < 0.01) {
          amount = Math.round(damageQty * exactPiecePrice * 100) / 100;
        } else {
          amount = Math.round(damageQty * currentRate * 100) / 100;
        }
      }

      return {
        ...row,
        ratio,
        defaultUnit: 'P' as const,
        dUnit,
        dRaw,
        damagePieces,
        damageQty,
        netSale: damageQty,
        rate: currentRate > 0 ? currentRate : row.rate,
        amount,
      };
    });
  }, [damageRows, db.products]);

  // Total Damage Value (ড্যামেজ মোট টাকা যোগফল)
  const totalDamageValue = useMemo(() => {
    return computedDamageRows.reduce((sum, r) => sum + r.amount, 0);
  }, [computedDamageRows]);
  const totalDamageAmount = totalDamageValue;

  // Total Damage Quantity in Pieces
  const totalDamageQty = useMemo(() => {
    return computedDamageRows.reduce((sum, r) => sum + r.damagePieces, 0);
  }, [computedDamageRows]);

  // Net Daily Sales = Gross Sales − Total Damage
  const netDailySalesAmount = useMemo(() => {
    return Math.max(0, grossSalesAmount - totalDamageAmount);
  }, [grossSalesAmount, totalDamageAmount]);

  // Total Closing Due = Today's New Due (from table A)
  const totalClosingDue = totalTodayDueAmount;

  // Determine stage: Is any return entered?
  const hasAnyReturnEntered = useMemo(() => {
    return rows.some((r) => r.returned !== '' && Number(r.returned) > 0);
  }, [rows]);

  // Find all pending / open sheets across the database
  const pendingSheets = useMemo(() => {
    return (db.dailySheets || []).filter((s) => s.status === 'pending' || s.status === 'draft');
  }, [db.dailySheets]);

  // Load a sheet into the editor form
  const loadSheetIntoForm = (sheet: DailyAccountSheet) => {
    setSelectedDate(sheet.date);
    if (sheet.routeOrVan) setSelectedRoute(sheet.routeOrVan);
    if (sheet.srName) setSelectedSR(sheet.srName);
    if (sheet.dsrName) setSelectedDSR(sheet.dsrName);

    setCurrentSheetId(sheet.id);
    const status = sheet.status === 'confirmed' || sheet.status === 'completed' ? 'completed' : 'pending';
    setCurrentSheetStatus(status);

    if (status === 'completed') {
      setIsLockedForEdit(true);
      setIsSalesTableLocked(false);
      setIsDamageTableLocked(false);
    } else {
      setIsLockedForEdit(false);
      setIsSalesTableLocked(false);
      setIsDamageTableLocked(false);
    }

    if (sheet.items && sheet.items.length > 0) {
      const loadedRows: RowData[] = sheet.items.map((it) => ({
        id: it.id || `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        quantityOut: it.rawIssuedQty !== undefined ? it.rawIssuedQty : it.issuedQty,
        quantityOutUnit: it.issuedUnit || (it.unit === 'কার্টন' || it.unit === 'কার্টুন' ? 'C' : 'P'),
        returned: it.rawReturnQty !== undefined ? (it.rawReturnQty > 0 ? it.rawReturnQty : '') : (it.returnQty > 0 ? it.returnQty : ''),
        returnedUnit: it.returnUnit || (it.unit === 'কার্টন' || it.unit === 'কার্টুন' ? 'C' : 'P'),
        rate: it.sellingPrice,
        showSuggestions: false,
      }));
      setRows(loadedRows);

      // If opening an existing sheet with items in pending status (evening return workflow),
      // automatically focus the return field of the first item for instant keyboard entry
      if (status === 'pending' && loadedRows.length > 0) {
        setTimeout(() => {
          const firstRowId = loadedRows[0]?.id;
          if (firstRowId && returnInputRefs.current[firstRowId]) {
            returnInputRefs.current[firstRowId]?.focus();
            returnInputRefs.current[firstRowId]?.select();
          }
        }, 150);
      }
    } else {
      setRows([createEmptyRow()]);
    }

    // Load Damage items if present
    if (sheet.damageItems && sheet.damageItems.length > 0) {
      const loadedDamageRows: RowData[] = sheet.damageItems.map((it) => ({
        id: it.id || `dmg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        quantityOut: it.rawDamageQty !== undefined ? it.rawDamageQty : (it.damageQty || it.issuedQty),
        quantityOutUnit: it.damageUnit || 'P',
        returned: '',
        rate: it.sellingPrice,
        showSuggestions: false,
      }));
      setDamageRows(loadedDamageRows);
    } else {
      setDamageRows([createEmptyDamageRow()]);
    }

    // Load Due (বাকি) dynamic tables if present
    if (sheet.todayDueEntries && sheet.todayDueEntries.length > 0) {
      setTodayDueRows(
        sheet.todayDueEntries.map((e) => ({
          id: e.id,
          dueNo: e.dueNo,
          customerId: e.customerId,
          customerName: e.customerName,
          shopName: e.shopName,
          description: e.description,
          amount: e.amount,
          isSavedToLedger: e.isSavedToLedger ?? true,
        }))
      );
    } else if (sheet.todayDue && sheet.todayDue > 0) {
      setTodayDueRows([{ id: `due-init-1`, dueNo: getNextDueNumber(), description: sheet.dueNotes || 'আজকের বাকি', amount: sheet.todayDue, isSavedToLedger: true }]);
    } else {
      setTodayDueRows([createEmptyDueRow(getNextDueNumber())]);
    }

    if (sheet.dueCollectionEntries && sheet.dueCollectionEntries.length > 0) {
      setDueCollectionRows(
        sheet.dueCollectionEntries.map((e) => ({
          id: e.id,
          dueNo: e.dueNo,
          customerId: e.customerId,
          customerName: e.customerName,
          shopName: e.shopName,
          description: e.description,
          amount: e.amount,
          isSavedToLedger: e.isSavedToLedger ?? true,
          pinVerified: e.pinVerified ?? true,
        }))
      );
    } else if (sheet.dueCollection && sheet.dueCollection > 0) {
      setDueCollectionRows([{ id: `coll-init-1`, description: 'বকেয়া আদায়', amount: sheet.dueCollection, isSavedToLedger: true, pinVerified: true }]);
    } else {
      setDueCollectionRows([createEmptyDueRow()]);
    }

    // Load Cash Denominations and Expense
    if (sheet.cashDenominations) {
      setCashDenominations(sheet.cashDenominations as DenominationMap);
    } else {
      setCashDenominations({ 1000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', other: '' });
    }
    setDailyExpense(sheet.marketExpense || 0);
    setDailyLess(sheet.lessAmount || 0);

    setLastSavedSheet(sheet);
    setActiveTab('entry');
  };

  // Check if an initialSheetId was provided
  useEffect(() => {
    if (initialSheetId) {
      const sheet = (db.dailySheets || []).find((s) => s.id === initialSheetId);
      if (sheet) {
        loadSheetIntoForm(sheet);
        showNotification(`হিসাব লোড হয়েছে: ${sheet.routeOrVan} (${sheet.date})`, 'info');
      }
      if (onClearInitialSheetId) {
        onClearInitialSheetId();
      }
    }
  }, [initialSheetId]);

  // Duplicate Prevention & Existing Record Matching:
  // "A Date + Route + SR + DSR combination should have only ONE Daily হিসাব record.
  // Do not allow creating a duplicate entry for the same combination on the same date; instead open the existing one."
  const findExistingCombinationSheet = (date: string, route: string, sr: string, dsr: string) => {
    return (db.dailySheets || []).find(
      (s) =>
        s.date === date &&
        s.routeOrVan?.trim() === route.trim() &&
        s.srName?.trim() === sr.trim() &&
        s.dsrName?.trim() === dsr.trim()
    );
  };

  // When Route, Date, SR, or DSR changes by user selection, check if an existing record exists
  const handleHeaderFieldChange = (
    field: 'route' | 'date' | 'sr' | 'dsr',
    newVal: string
  ) => {
    const newRoute = field === 'route' ? newVal : selectedRoute;
    const newDate = field === 'date' ? newVal : selectedDate;
    const newSR = field === 'sr' ? newVal : selectedSR;
    const newDSR = field === 'dsr' ? newVal : selectedDSR;

    if (field === 'route') setSelectedRoute(newVal);
    if (field === 'date') setSelectedDate(newVal);
    if (field === 'sr') setSelectedSR(newVal);
    if (field === 'dsr') setSelectedDSR(newVal);

    // Look for matching sheet
    const existing = findExistingCombinationSheet(newDate, newRoute, newSR, newDSR);
    if (existing) {
      // Reopen existing record!
      loadSheetIntoForm(existing);
      const stLabel = existing.status === 'completed' || existing.status === 'confirmed' ? 'সম্পন্ন' : 'চলমান';
      showNotification(
        `এই তারিখ ও রুটের বিদ্যমান হিসাব লোড করা হয়েছে [অবস্থা: ${stLabel}]। ডুপ্লিকেট এন্ট্রি প্রতিরোধ করা হয়েছে।`,
        'info'
      );
    } else {
      // Fresh new combination
      setCurrentSheetId(null);
      setCurrentSheetStatus('pending');
      setIsLockedForEdit(false);
      setIsSalesTableLocked(false);
      setIsDamageTableLocked(false);
      setRows([createEmptyRow()]);
      setDamageRows([createEmptyDamageRow()]);
      setTodayDueRows([createEmptyDueRow()]);
      setDueCollectionRows([createEmptyDueRow()]);
      setDailyExpense(0);
      setDailyLess(0);
      setLastSavedSheet(null);
    }
  };

  // Start a fresh new sheet (reset)
  const handleStartNewSheet = () => {
    setCurrentSheetId(null);
    setCurrentSheetStatus('pending');
    setIsLockedForEdit(false);
    setIsSalesTableLocked(false);
    setIsDamageTableLocked(false);
    setRows([createEmptyRow()]);
    setDamageRows([createEmptyDamageRow()]);
    setTodayDueRows([createEmptyDueRow(getNextDueNumber())]);
    setDueCollectionRows([createEmptyDueRow()]);
    setCashDenominations({ 1000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', other: '' });
    setDailyExpense(0);
    setDailyLess(0);
    setLastSavedSheet(null);
    showNotification('নতুন দৈনিক হিসাব খাতা খোলা হয়েছে।', 'info');
  };

  // Dynamic Due Table Handlers
  const handleAddTodayDueRow = () => {
    if (isLockedForEdit) return;
    const nextDue = getNextDueNumber(todayDueRows);
    setTodayDueRows((prev) => [...prev, createEmptyDueRow(nextDue)]);
  };

  const handleUpdateTodayDueRow = (id: string, field: keyof DueItemRow, value: any) => {
    if (isLockedForEdit) return;
    setTodayDueRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSelectCustomerForTodayDue = (rowId: string, customer: Customer) => {
    if (isLockedForEdit) return;
    setTodayDueRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              customerId: customer.id,
              customerName: customer.name,
              shopName: customer.shopName,
              description: customer.shopName,
            }
          : r
      )
    );
  };

  const handleSaveTodayDueRowToLedger = (rowId: string) => {
    const row = todayDueRows.find((r) => r.id === rowId);
    if (!row) return;
    const amt = Number(row.amount) || 0;
    if (amt <= 0) {
      showNotification('অনুগ্রহ করে বাকির পরিমাণ দিন', 'error');
      return;
    }
    if (!row.description.trim()) {
      showNotification('অনুগ্রহ করে কাস্টমার বা দোকানের নাম দিন', 'error');
      return;
    }

    const assignedDueNo = row.dueNo || getNextDueNumber();
    const res = recordCustomerDue({
      dueNo: assignedDueNo,
      customerId: row.customerId,
      customerName: row.customerName || row.description,
      shopName: row.shopName || row.description,
      amount: amt,
      date: selectedDate,
      routeOrVan: selectedRoute,
      note: `দৈনিক হিসাব বাকি #${assignedDueNo}`,
    });

    setTodayDueRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              dueNo: res.dueNo,
              customerId: res.customer.id,
              customerName: res.customer.name,
              shopName: res.customer.shopName,
              isSavedToLedger: true,
            }
          : r
      )
    );

    showNotification(
      `বাকি #${res.dueNo} সেন্ট্রাল কাস্টমার লেজারে যুক্ত হয়েছে! (${res.customer.shopName} - বর্তমান মোট বাকি: ${currency} ${res.customer.currentDue.toLocaleString()})`,
      'success'
    );
  };

  const handleDeleteTodayDueRow = (id: string) => {
    if (isLockedForEdit) return;
    setTodayDueRows((prev) => {
      if (prev.length <= 1) return [createEmptyDueRow(getNextDueNumber())];
      return prev.filter((r) => r.id !== id);
    });
  };

  const handleAddDueCollectionRow = () => {
    if (isLockedForEdit) return;
    setDueCollectionRows((prev) => [...prev, createEmptyDueRow()]);
  };

  const handleUpdateDueCollectionRow = (id: string, field: keyof DueItemRow, value: any) => {
    if (isLockedForEdit) return;
    setDueCollectionRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSelectCustomerForDueCollection = (rowId: string, customer: Customer) => {
    if (isLockedForEdit) return;
    const match = outstandingDuesList.find((item) => item.customerId === customer.id && item.dueNo);
    setDueCollectionRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              customerId: customer.id,
              customerName: customer.name,
              shopName: customer.shopName,
              description: customer.shopName,
              dueNo: match?.dueNo || r.dueNo || '',
            }
          : r
      )
    );
  };

  // Open confirmation modal for an existing row in the table
  const handleOpenRowConfirmModal = (row: DueItemRow) => {
    let cust = db.customers.find((c) => c.id === row.customerId);
    if (!cust && row.description.trim()) {
      cust = db.customers.find(
        (c) =>
          c.shopName.trim().toLowerCase() === row.description.trim().toLowerCase() ||
          c.name.trim().toLowerCase() === row.description.trim().toLowerCase()
      );
    }

    if (!cust) {
      showNotification('অনুগ্রহ করে একজন কাস্টমার নির্বাচন করুন', 'error');
      return;
    }

    setConfirmModalCustomer(cust);
    setConfirmModalDueNo(row.dueNo);
    setConfirmModalDefaultAmount(
      row.amount !== '' && Number(row.amount) > 0 ? Number(row.amount) : cust.currentDue
    );
    setConfirmModalTargetRowId(row.id);
    setDueConfirmModalOpen(true);
  };

  // Extract key area words from selectedRoute (e.g. 'চকবাজার', 'বেগম বাজার', etc.)
  const currentRouteKeywords = useMemo(() => {
    if (!selectedRoute) return [];
    const clean = selectedRoute
      .replace(/^রুট\s*[\d০-৯\w]+[:\s\-]*/i, '')
      .replace(/^Route\s*[\d০-৯\w]+[:\s\-]*/i, '');
    const words = clean
      .split(/[\s,;&|/ও+]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 2 && w !== 'বাজার' && w !== 'রোড' && w !== 'রুট');
    return words;
  }, [selectedRoute]);

  // Customer IDs associated with this route through past daily sheets
  const customerIdsOnThisRoute = useMemo(() => {
    const set = new Set<string>();
    (db.dailySheets || []).forEach((sheet) => {
      if (sheet.routeOrVan?.trim() === selectedRoute.trim()) {
        (sheet.todayDueEntries || []).forEach((d) => {
          if (d.customerId) set.add(d.customerId);
        });
        (sheet.dueCollectionEntries || []).forEach((d) => {
          if (d.customerId) set.add(d.customerId);
        });
      }
    });
    return set;
  }, [db.dailySheets, selectedRoute]);

  // Customers on this route who currently have outstanding due (> 0)
  const routeCustomersWithDue = useMemo(() => {
    return db.customers
      .filter((c) => {
        if (c.status === 'inactive' || (Number(c.currentDue) || 0) <= 0) return false;

        // 1. Direct past association with this route
        if (customerIdsOnThisRoute.has(c.id)) return true;

        // 2. Keyword matching in customer's address, shopName, or notes
        const addr = (c.address || '').toLowerCase();
        const shop = (c.shopName || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();

        if (addr.includes(selectedRoute.toLowerCase())) return true;

        if (currentRouteKeywords.length > 0) {
          return currentRouteKeywords.some(
            (kw) => addr.includes(kw) || shop.includes(kw) || notes.includes(kw)
          );
        }

        return false;
      })
      .sort((a, b) => (b.currentDue || 0) - (a.currentDue || 0));
  }, [db.customers, customerIdsOnThisRoute, currentRouteKeywords, selectedRoute]);

  // Check referencing records (daily sheets or due entries) for the currently selected route
  const routeReferencingInfo = useMemo(() => {
    if (!selectedRoute) return { sheetCount: 0, dueEntriesCount: 0, customersWithDueCount: 0 };
    const trimmed = selectedRoute.trim();

    // 1. Daily হিসাব records (sheets)
    const matchingSheets = (db.dailySheets || []).filter(
      (s) => (s.routeOrVan || '').trim() === trimmed
    );
    const sheetCount = matchingSheets.length;

    // 2. Due entries inside those sheets
    let dueEntriesCount = 0;
    matchingSheets.forEach((s) => {
      dueEntriesCount += (s.todayDueEntries || []).length;
      dueEntriesCount += (s.dueCollectionEntries || []).length;
    });

    // 3. Customers associated with this route with current outstanding due
    const customersWithDueCount = routeCustomersWithDue.length;

    return { sheetCount, dueEntriesCount, customersWithDueCount };
  }, [selectedRoute, db.dailySheets, routeCustomersWithDue]);

  const deleteRouteWarningSubtitle = useMemo(() => {
    const { sheetCount, dueEntriesCount, customersWithDueCount } = routeReferencingInfo;
    const parts: string[] = [];
    if (sheetCount > 0) {
      parts.push(`${sheetCount}টি দৈনিক হিসাব খতিয়ান`);
    }
    if (dueEntriesCount > 0) {
      parts.push(`${dueEntriesCount}টি বকেয়া/আদায় এন্ট্রি`);
    } else if (customersWithDueCount > 0) {
      parts.push(`${customersWithDueCount} জন বাকির কাস্টমার`);
    }

    if (parts.length > 0) {
      return `⚠️ সতর্কতা: এই রুটে ${parts.join(' ও ')} রয়েছে! রুটটি মুছে ফেললেও পূর্বের সংরক্ষিত হিসাবের তথ্য অক্ষত থাকবে, তবে রুটটি তালিকা থেকে স্থায়ীভাবে মুছে যাবে। নিশ্চিত করতে নিরাপত্তা পিন দিন:`;
    }
    return `রুট '${selectedRoute}' স্থায়ীভাবে মুছে ফেলতে ৪-৬ সংখ্যার নিরাপত্তা পিন দিন:`;
  }, [routeReferencingInfo, selectedRoute]);

  const handleOpenDeleteRoute = () => {
    if (!selectedRoute) return;
    setIsDeleteRouteModalOpen(true);
  };

  const handleConfirmDeleteRoute = () => {
    if (!selectedRoute) return;
    const routeToDelete = selectedRoute;
    deleteRoute(routeToDelete);
    setIsDeleteRouteModalOpen(false);

    // Pick next available route immediately
    const remainingRoutes = availableRoutes.filter((r) => r !== routeToDelete);
    const nextRoute = remainingRoutes[0] || '';
    setSelectedRoute(nextRoute);

    showNotification(`রুট "${routeToDelete}" সফলভাবে মুছে ফেলা হয়েছে`, 'success');
  };

  // Handler when clicking a customer from "এই রোডের বাকি" modal
  const handleSelectCustomerFromRouteModal = (customer: Customer) => {
    setIsRouteDueModalOpen(false);
    if (isLockedForEdit) return;

    // Check if there is already an existing unverified row for this customer, or create a new row
    let targetRowId: string | null = null;
    const existingUnverified = dueCollectionRows.find(
      (r) => !r.isSavedToLedger && (r.customerId === customer.id || !r.customerId)
    );

    if (existingUnverified) {
      targetRowId = existingUnverified.id;
      setDueCollectionRows((prev) =>
        prev.map((r) =>
          r.id === targetRowId
            ? {
                ...r,
                customerId: customer.id,
                customerName: customer.name,
                shopName: customer.shopName,
                description: customer.shopName || customer.name,
                amount: customer.currentDue,
              }
            : r
        )
      );
    } else {
      const newRowId = `due-col-${Date.now()}`;
      targetRowId = newRowId;
      setDueCollectionRows((prev) => [
        ...prev,
        {
          id: newRowId,
          customerId: customer.id,
          customerName: customer.name,
          shopName: customer.shopName,
          description: customer.shopName || customer.name,
          amount: customer.currentDue,
        },
      ]);
    }

    // Open confirmation popup immediately so the owner can confirm and enter PIN
    setConfirmModalCustomer(customer);
    setConfirmModalDueNo(undefined);
    setConfirmModalDefaultAmount(customer.currentDue);
    setConfirmModalTargetRowId(targetRowId);
    setDueConfirmModalOpen(true);
  };

  // Execute collection when confirmed with correct PIN in DueCollectionConfirmModal
  const handleExecuteConfirmedDueCollection = (collectionData: {
    customerId: string;
    dueNo?: string;
    amount: number;
    date: string;
  }) => {
    const cust = db.customers.find((c) => c.id === collectionData.customerId);
    if (!cust) {
      showNotification('কাস্টমার খুঁজে পাওয়া যায়নি', 'error');
      return;
    }

    try {
      const payment = recordDueCollection({
        dueNo: collectionData.dueNo,
        customerId: cust.id,
        amount: collectionData.amount,
        date: collectionData.date,
        receivedBy: selectedSR,
        note: `দৈনিক হিসাব বাকি আদায় #${collectionData.dueNo || ''} (${selectedRoute})`,
      });

      // Update the row in dueCollectionRows
      setDueCollectionRows((prev) => {
        let updated = false;
        const mapped = prev.map((r) => {
          if (r.id === confirmModalTargetRowId || (!r.isSavedToLedger && r.customerId === cust.id)) {
            updated = true;
            return {
              ...r,
              customerId: cust.id,
              customerName: cust.name,
              shopName: cust.shopName,
              description: cust.shopName,
              dueNo: collectionData.dueNo || r.dueNo,
              amount: collectionData.amount,
              isSavedToLedger: true,
              pinVerified: true,
            };
          }
          return r;
        });

        if (!updated) {
          mapped.push({
            id: `due-col-${Date.now()}`,
            customerId: cust.id,
            customerName: cust.name,
            shopName: cust.shopName,
            description: cust.shopName,
            dueNo: collectionData.dueNo,
            amount: collectionData.amount,
            isSavedToLedger: true,
            pinVerified: true,
          });
        }
        return mapped;
      });

      const updatedCust = db.customers.find((c) => c.id === cust.id);
      const remainingDue = updatedCust
        ? updatedCust.currentDue
        : Math.max(0, cust.currentDue - collectionData.amount);

      showNotification(
        `✅ বাকি আদায় সফল! রশিদ #${payment.receiptNo} (${cust.shopName} - অবশিষ্ট বাকি: ${currency} ${remainingDue.toLocaleString()})`,
        'success'
      );
    } catch (err: any) {
      showNotification(`কালেকশন সেভ করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`, 'error');
    } finally {
      setDueConfirmModalOpen(false);
      setConfirmModalCustomer(null);
      setConfirmModalTargetRowId(null);
    }
  };

  const handleSelectDueNumberForDueCollection = (rowId: string, selectedDueNo: string) => {
    if (isLockedForEdit) return;
    const match = outstandingDuesList.find((item) => item.dueNo === selectedDueNo);
    if (match) {
      setDueCollectionRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                dueNo: match.dueNo,
                customerId: match.customerId,
                customerName: match.customerName,
                shopName: match.shopName,
                description: match.shopName,
              }
            : r
        )
      );
    } else {
      setDueCollectionRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, dueNo: selectedDueNo } : r))
      );
    }
  };

  const handleOpenDueCollectionPinModal = (row: DueItemRow) => {
    handleOpenRowConfirmModal(row);
  };

  const handleConfirmDueCollectionPin = () => {
    if (!pendingDueCollectionRow) return;
    const row = pendingDueCollectionRow;
    const amt = Number(row.amount) || 0;
    if (amt <= 0) {
      showNotification('আদায়ের পরিমাণ শূন্য হতে পারবে না', 'error');
      setPinModalOpen(false);
      setPendingDueCollectionRow(null);
      return;
    }

    let cust = db.customers.find((c) => c.id === row.customerId);
    if (!cust && row.description.trim()) {
      cust = db.customers.find(
        (c) =>
          c.shopName.trim().toLowerCase() === row.description.trim().toLowerCase() ||
          c.name.trim().toLowerCase() === row.description.trim().toLowerCase()
      );
    }

    if (!cust) {
      showNotification('অনুগ্রহ করে একজন কাস্টমার নির্বাচন করুন', 'error');
      setPinModalOpen(false);
      setPendingDueCollectionRow(null);
      return;
    }

    try {
      const payment = recordDueCollection({
        dueNo: row.dueNo,
        customerId: cust.id,
        amount: amt,
        date: selectedDate,
        receivedBy: selectedSR,
        note: `দৈনিক হিসাব বাকি আদায় #${row.dueNo || ''} (${selectedRoute})`,
      });

      setDueCollectionRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                customerId: cust!.id,
                customerName: cust!.name,
                shopName: cust!.shopName,
                isSavedToLedger: true,
                pinVerified: true,
              }
            : r
        )
      );

      const updatedCust = db.customers.find((c) => c.id === cust!.id);
      const remainingDue = updatedCust ? updatedCust.currentDue : Math.max(0, cust.currentDue - amt);

      showNotification(
        `✅ বাকি আদায় সফল! রশিদ #${payment.receiptNo} (${cust.shopName} - অবশিষ্ট বাকি: ${currency} ${remainingDue.toLocaleString()})`,
        'success'
      );
    } catch (err: any) {
      showNotification(`কালেকশন সেভ করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`, 'error');
    } finally {
      setPinModalOpen(false);
      setPendingDueCollectionRow(null);
    }
  };

  const handleDeleteDueCollectionRow = (id: string) => {
    if (isLockedForEdit) return;
    setDueCollectionRows((prev) => {
      if (prev.length <= 1) return [createEmptyDueRow()];
      return prev.filter((r) => r.id !== id);
    });
  };

  // DAMAGE TABLE HANDLERS
  const updateDamageRowField = (id: string, field: keyof RowData, value: any) => {
    if (isDamageLocked) return;
    setDamageRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  const handleDamageProductNameChange = (id: string, value: string) => {
    if (isDamageLocked) return;
    setDamageHighlightedSuggestionIndex(0);
    setDamageRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            productName: value,
            showSuggestions: true,
            productId: value === r.productName ? r.productId : '',
          };
        }
        return r;
      })
    );
  };

  const handleDamageSelectProduct = (rowId: string, product: Product) => {
    if (isDamageLocked) return;
    const ratio = product.piecesPerCarton || product.cartonQty || 1;
    const isCarton = product.unit === 'কার্টন' || product.unit === 'কার্টুন' || ratio > 1;
    const defUnit: 'C' | 'P' = isCarton ? 'C' : 'P';
    const cartonPrice = product.salePrice;
    const piecePrice = ratio > 0 ? Math.round((cartonPrice / ratio) * 100) / 100 : cartonPrice;

    setDamageRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const unit = r.quantityOutUnit || 'P'; // Damage rows default to P
          const rateForUnit = unit === 'C' ? cartonPrice : piecePrice;
          return {
            ...r,
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            quantityOutUnit: unit,
            rate: rateForUnit,
            showSuggestions: false,
          };
        }
        return r;
      })
    );

    // Auto focus and select on the quantity field of the damage row
    setTimeout(() => {
      const qtyEl = damageQtyInputRefs.current[rowId];
      if (qtyEl) {
        qtyEl.focus();
        qtyEl.select();
      }
    }, 40);
  };

  // Toggle unit for damage row (switches C/P and immediately recalculates rate)
  const handleDamageUnitToggle = (rowId: string, unit: 'C' | 'P') => {
    if (isDamageLocked) return;
    setDamageRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const product = db.products.find((p) => p.id === r.productId);
          let newRate: number | '' = r.rate;
          if (product) {
            const cartonPrice = product.salePrice;
            const ratio = product.piecesPerCarton || product.cartonQty || 1;
            const piecePrice = ratio > 0 ? Math.round((cartonPrice / ratio) * 100) / 100 : cartonPrice;
            newRate = unit === 'C' ? cartonPrice : piecePrice;
          }
          return {
            ...r,
            quantityOutUnit: unit,
            rate: newRate,
          };
        }
        return r;
      })
    );
  };

  const handleDamageQuantityChange = (rowIndex: number, rowId: string, value: string) => {
    if (isDamageLocked) return;
    const numVal: number | '' = value === '' ? '' : Math.max(0, Number(value) || 0);

    setDamageRows((prev) => {
      const updated = prev.map((r) => (r.id === rowId ? { ...r, quantityOut: numVal } : r));

      const currentRow = updated[rowIndex];
      const isLastRow = rowIndex === updated.length - 1;
      const hasProduct = Boolean(currentRow.productId || currentRow.productName.trim());
      const hasEnteredQty = numVal !== '' && Number(numVal) > 0;

      if (isLastRow && hasProduct && hasEnteredQty) {
        return [...updated, createEmptyDamageRow()];
      }

      return updated;
    });
  };

  const handleDamageDeleteRow = (id: string) => {
    if (isDamageLocked) return;
    setDamageRows((prev) => {
      if (prev.length <= 1) {
        return [createEmptyDamageRow()];
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const handleManualAddDamageRow = () => {
    if (isDamageLocked) {
      showNotification('লক করা আছে, প্রথমে আনলক করুন', 'error');
      return;
    }
    setDamageRows((prev) => [...prev, createEmptyDamageRow()]);
  };

  // Update a field in a specific row
  const updateRowField = (id: string, field: keyof RowData, value: any) => {
    if (isSalesLocked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // Handle Product Name text change (search-as-you-type)
  const handleProductNameChange = (id: string, value: string) => {
    if (isSalesLocked) return;
    setHighlightedSuggestionIndex(0);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            productName: value,
            showSuggestions: true,
            productId: value === r.productName ? r.productId : '',
          };
        }
        return r;
      })
    );
  };

  // Handle suggestion selection
  const handleSelectProduct = (rowId: string, product: Product) => {
    if (isSalesLocked) return;
    const ratio = product.piecesPerCarton || product.cartonQty || 1;
    const isCarton = product.unit === 'কার্টন' || product.unit === 'কার্টুন' || ratio > 1;
    const defUnit: 'C' | 'P' = isCarton ? 'C' : 'P';
    const cartonPrice = product.salePrice;
    const piecePrice = ratio > 0 ? Math.round((cartonPrice / ratio) * 100) / 100 : cartonPrice;

    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const unit = r.quantityOutUnit || defUnit;
          const rateForUnit = unit === 'C' ? cartonPrice : piecePrice;
          return {
            ...r,
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            quantityOutUnit: unit,
            returnedUnit: r.returnedUnit || unit,
            rate: rateForUnit,
            showSuggestions: false,
          };
        }
        return r;
      })
    );

    // Auto focus and select on the quantity field of the row
    setTimeout(() => {
      const qtyEl = qtyInputRefs.current[rowId];
      if (qtyEl) {
        qtyEl.focus();
        qtyEl.select();
      }
    }, 40);
  };

  // Toggle unit for main sales row (switches C/P and immediately recalculates rate)
  const handleRowUnitToggle = (rowId: string, unit: 'C' | 'P') => {
    if (isSalesLocked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          const product = db.products.find((p) => p.id === r.productId);
          let newRate: number | '' = r.rate;
          if (product) {
            const cartonPrice = product.salePrice;
            const ratio = product.piecesPerCarton || product.cartonQty || 1;
            const piecePrice = ratio > 0 ? Math.round((cartonPrice / ratio) * 100) / 100 : cartonPrice;
            newRate = unit === 'C' ? cartonPrice : piecePrice;
          }
          return {
            ...r,
            quantityOutUnit: unit,
            rate: newRate,
          };
        }
        return r;
      })
    );
  };

  // Handle quantity change with automatic row addition
  const handleQuantityChange = (rowIndex: number, rowId: string, value: string) => {
    if (isSalesLocked) return;
    const numVal: number | '' = value === '' ? '' : Math.max(0, Number(value) || 0);

    setRows((prev) => {
      const updated = prev.map((r) => (r.id === rowId ? { ...r, quantityOut: numVal } : r));

      const currentRow = updated[rowIndex];
      const isLastRow = rowIndex === updated.length - 1;
      const hasProduct = Boolean(currentRow.productId || currentRow.productName.trim());
      const hasEnteredQty = numVal !== '' && Number(numVal) > 0;

      if (isLastRow && hasProduct && hasEnteredQty) {
        return [...updated, createEmptyRow()];
      }

      return updated;
    });
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    if (isSalesLocked) return;
    setRows((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRow()];
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  // Manual add row button
  const handleManualAddRow = () => {
    if (isSalesLocked) {
      showNotification('লক করা আছে, প্রথমে আনলক করুন', 'error');
      return;
    }
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  // TWO-STAGE SAVE ACTION
  // stage: 'morning' (চলমান/বিতরণ) or 'evening' (সম্পন্ন/চূড়ান্ত)
  const handleSaveSheet = (stage: 'morning' | 'evening') => {
    if (isLockedForEdit) {
      showNotification('এই হিসাবটি সম্পন্ন ও লক করা আছে। এডিট করার জন্য আগে আনলক করুন।', 'error');
      return;
    }

    const filledRows = computedRows.filter(
      (r) => r.productName.trim() && (Number(r.quantityOut) > 0 || Number(r.rate) > 0)
    );

    if (filledRows.length === 0) {
      showNotification('অনুগ্রহ করে অন্তত একটি পণ্যের নাম ও পরিমাণ লিখুন।', 'error');
      return;
    }

    try {
      const items: DailyAccountItem[] = filledRows.map((r) => {
        const matchedProd = db.products.find((p) => p.id === r.productId);
        const ratio = r.ratio;
        const qUnit = r.qUnit;
        const rUnit = r.rUnit;
        const rawIssued = r.qRaw;
        const rawRet = r.rRaw;
        const qtyOut = r.qOutPieces;
        const ret = r.retPieces;
        const netSale = r.netSale;
        const rate = Number(r.rate) || 0;
        const amt = r.amount;

        return {
          id: r.id.startsWith('row-') ? `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : r.id,
          productId: r.productId || `prod-${Date.now()}`,
          productCode: r.productCode || 'GEN',
          productName: r.productName,
          unit: matchedProd?.unit || 'কার্টন',
          packSize: matchedProd?.packSize || matchedProd?.unit || '',
          openingStock: matchedProd?.currentStock || 0,
          rawIssuedQty: rawIssued,
          rawReturnQty: rawRet,
          issuedUnit: qUnit,
          returnUnit: rUnit,
          piecesPerCarton: ratio,
          issuedQty: qtyOut,
          returnQty: ret,
          netSoldQty: netSale,
          sellingPrice: rate,
          grossAmount: amt,
          damageQty: 0,
          damageValue: 0,
          finalNetAmount: amt,
          closingStock: Math.max(0, (matchedProd?.currentStock || 0) - netSale),
        };
      });

      const totalQtyOut = items.reduce((sum, i) => sum + i.issuedQty, 0);
      const totalRet = items.reduce((sum, i) => sum + i.returnQty, 0);
      const totalSold = items.reduce((sum, i) => sum + i.netSoldQty, 0);
      const totalGross = items.reduce((sum, i) => sum + i.grossAmount, 0);

      // Process Damage Rows
      const filledDamageRows = computedDamageRows.filter(
        (r) => r.productName.trim() && (Number(r.quantityOut) > 0 || Number(r.rate) > 0)
      );

      const damageItems: DailyAccountItem[] = filledDamageRows.map((r) => {
        const matchedProd = db.products.find((p) => p.id === r.productId);
        const ratio = r.ratio;
        const dUnit = r.dUnit;
        const rawDmg = r.dRaw;
        const dmgPieces = r.damagePieces;
        const rate = Number(r.rate) || 0;
        const amt = r.amount;

        return {
          id: r.id.startsWith('row-') || r.id.startsWith('dmg-') ? `dmg-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : r.id,
          productId: r.productId || `prod-${Date.now()}`,
          productCode: r.productCode || 'GEN',
          productName: r.productName,
          unit: matchedProd?.unit || 'কার্টন',
          packSize: matchedProd?.packSize || matchedProd?.unit || '',
          openingStock: matchedProd?.currentStock || 0,
          rawDamageQty: rawDmg,
          damageUnit: dUnit,
          piecesPerCarton: ratio,
          issuedQty: dmgPieces,
          returnQty: 0,
          netSoldQty: dmgPieces,
          sellingPrice: rate,
          grossAmount: amt,
          damageQty: dmgPieces,
          damageValue: amt,
          finalNetAmount: amt,
          closingStock: Math.max(0, (matchedProd?.currentStock || 0) - dmgPieces),
        };
      });

      const totalDmgQty = damageItems.reduce((sum, i) => sum + i.damageQty, 0);
      const totalDmgVal = damageItems.reduce((sum, i) => sum + i.damageValue, 0);
      const netDailySales = Math.max(0, totalGross - totalDmgVal);

      // Status logic:
      // 'morning' -> status: 'pending' (চলমান), updateStock: false
      // 'evening' -> status: 'completed' (সম্পন্ন), updateStock: true
      const sheetStatus = stage === 'evening' ? 'completed' : 'pending';
      const shouldUpdateStock = stage === 'evening';

      // When saving evening stage, ensure any unsaved today's due rows are synced to central ledger
      const syncedTodayDueRows = todayDueRows.map((r) => {
        const amt = Number(r.amount) || 0;
        if (stage === 'evening' && amt > 0 && !r.isSavedToLedger) {
          const assignedDueNo = r.dueNo || getNextDueNumber();
          const res = recordCustomerDue({
            dueNo: assignedDueNo,
            customerId: r.customerId,
            customerName: r.customerName || r.description,
            shopName: r.shopName || r.description,
            amount: amt,
            date: selectedDate,
            routeOrVan: selectedRoute,
            note: `দৈনিক হিসাব বাকি #${assignedDueNo}`,
          });
          return {
            ...r,
            dueNo: res.dueNo,
            customerId: res.customer.id,
            customerName: res.customer.name,
            shopName: res.customer.shopName,
            isSavedToLedger: true,
          };
        }
        return r;
      });
      if (stage === 'evening') {
        setTodayDueRows(syncedTodayDueRows);
      }

      const validTodayDue: DailyDueEntry[] = syncedTodayDueRows
        .filter((r) => r.description.trim() || Number(r.amount) > 0)
        .map((r) => ({
          id: r.id,
          dueNo: r.dueNo,
          customerId: r.customerId,
          customerName: r.customerName,
          shopName: r.shopName,
          description: r.description.trim(),
          amount: Number(r.amount) || 0,
          isSavedToLedger: r.isSavedToLedger,
        }));

      const validDueCollection: DailyDueEntry[] = dueCollectionRows
        .filter((r) => r.description.trim() || Number(r.amount) > 0)
        .map((r) => ({
          id: r.id,
          dueNo: r.dueNo,
          customerId: r.customerId,
          customerName: r.customerName,
          shopName: r.shopName,
          description: r.description.trim(),
          amount: Number(r.amount) || 0,
          isSavedToLedger: r.isSavedToLedger,
          pinVerified: r.pinVerified,
        }));

      const sheetDataToSave: Omit<DailyAccountSheet, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> & { id?: string } = {
        ...(currentSheetId ? { id: currentSheetId } : {}),
        date: selectedDate,
        routeOrVan: selectedRoute,
        srName: selectedSR,
        dsrName: selectedDSR,
        items,
        damageItems,
        totalIssuedQty: totalQtyOut,
        totalReturnQty: totalRet,
        totalNetSoldQty: totalSold,
        totalGrossAmount: totalGross,
        totalDamageQty: totalDmgQty,
        totalDamageValue: totalDmgVal,
        finalNetSalesAmount: netDailySales,
        previousDue: 0,
        todayDue: totalTodayDueAmount,
        dueCollection: totalDueCollectionAmount,
        totalClosingDue: totalTodayDueAmount,
        todayDueEntries: validTodayDue,
        dueCollectionEntries: validDueCollection,
        dueNotes: '',
        cashCollected: totalDenominationCash > 0 ? totalDenominationCash : Math.max(0, netDailySales - totalTodayDueAmount - dailyExpense),
        marketExpense: dailyExpense,
        lessAmount: dailyLess,
        cashDenominations: cashDenominations,
        netCashSubmitted: totalDenominationCash > 0 ? totalDenominationCash : Math.max(0, netDailySales - totalTodayDueAmount - dailyExpense),
        marketDue: totalTodayDueAmount,
        status: sheetStatus,
      };

      const saved = saveDailySheet(sheetDataToSave, shouldUpdateStock);

      setCurrentSheetId(saved.id);
      setCurrentSheetStatus(sheetStatus);
      setLastSavedSheet(saved);

      if (stage === 'morning') {
        showNotification(
          `সকালের মাল বিতরণ সফলভাবে সেভ হয়েছে! অবস্থা: [চলমান]। সন্ধ্যায় ফেরত আসার পর চূড়ান্ত হিসাব সেভ করুন। (${selectedRoute})`,
          'success'
        );
      } else {
        // Completed
        setIsLockedForEdit(true);
        showNotification(
          `চূড়ান্ত হিসাব সফলভাবে সম্পন্ন হয়েছে ও স্টক আপডেট করা হয়েছে! PDF প্রস্তুত রয়েছে।`,
          'success'
        );
      }
    } catch (err: any) {
      showNotification(`সেভ করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`, 'error');
    }
  };

  // Get complete sheet data for Print Preview and Export (works for current state and saved records)
  const getCurrentSheetData = (sheetToUse?: DailyAccountSheet): DailyAccountSheet => {
    if (sheetToUse) {
      return {
        ...sheetToUse,
        items: sheetToUse.items || [],
        damageItems: sheetToUse.damageItems || [],
      };
    }

    // Build ad-hoc sheet from current live table state
    const filledRows = computedRows.filter((r) => r.productName && r.productName.trim());
    const items: DailyAccountItem[] = filledRows.map((r) => {
      const matchedProd = db.products.find((p) => p.id === r.productId);
      return {
        id: r.id,
        productId: r.productId || 'p',
        productCode: r.productCode || 'GEN',
        productName: r.productName,
        unit: matchedProd?.unit || 'কার্টন',
        packSize: matchedProd?.packSize || '',
        openingStock: 0,
        rawIssuedQty: r.qRaw,
        rawReturnQty: r.rRaw,
        issuedUnit: r.qUnit,
        returnUnit: r.rUnit,
        piecesPerCarton: r.ratio,
        issuedQty: r.qOutPieces,
        returnQty: r.retPieces,
        netSoldQty: r.netSale,
        sellingPrice: Number(r.rate) || 0,
        grossAmount: r.amount,
        damageQty: 0,
        damageValue: 0,
        finalNetAmount: r.amount,
        closingStock: 0,
      };
    });

    // Process Damage Rows
    const filledDamageRows = computedDamageRows.filter(
      (r) => r.productName && r.productName.trim() && (Number(r.quantityOut) > 0 || Number(r.rate) > 0)
    );
    const damageItems: DailyAccountItem[] = filledDamageRows.map((r) => {
      const matchedProd = db.products.find((p) => p.id === r.productId);
      return {
        id: r.id,
        productId: r.productId || 'dp',
        productCode: r.productCode || 'GEN',
        productName: r.productName,
        unit: matchedProd?.unit || 'কার্টন',
        packSize: matchedProd?.packSize || '',
        openingStock: 0,
        rawDamageQty: r.dRaw,
        damageUnit: r.dUnit,
        piecesPerCarton: r.ratio,
        issuedQty: r.damagePieces,
        returnQty: 0,
        netSoldQty: r.damagePieces,
        sellingPrice: Number(r.rate) || 0,
        grossAmount: r.amount,
        damageQty: r.damagePieces,
        damageValue: r.amount,
        finalNetAmount: r.amount,
        closingStock: 0,
      };
    });

    const totalDmgQty = damageItems.reduce((sum, i) => sum + i.damageQty, 0);
    const totalDmgVal = damageItems.reduce((sum, i) => sum + i.damageValue, 0);
    const netDailySales = Math.max(0, totalAmount - totalDmgVal);

    const validTodayDue: DailyDueEntry[] = todayDueRows
      .filter((r) => r.description.trim() || Number(r.amount) > 0)
      .map((r) => ({
        id: r.id,
        dueNo: r.dueNo,
        customerId: r.customerId,
        customerName: r.customerName,
        shopName: r.shopName,
        description: r.description.trim(),
        amount: Number(r.amount) || 0,
      }));

    const validDueCollection: DailyDueEntry[] = dueCollectionRows
      .filter((r) => r.description.trim() || Number(r.amount) > 0)
      .map((r) => ({
        id: r.id,
        dueNo: r.dueNo,
        customerId: r.customerId,
        customerName: r.customerName,
        shopName: r.shopName,
        description: r.description.trim(),
        amount: Number(r.amount) || 0,
      }));

    return {
      id: currentSheetId || `DAS-${selectedDate.replace(/-/g, '')}`,
      date: selectedDate,
      routeOrVan: selectedRoute,
      srName: selectedSR,
      dsrName: selectedDSR,
      items,
      damageItems,
      totalIssuedQty: totalQuantityOut,
      totalReturnQty: totalReturned,
      totalNetSoldQty: totalNetSaleQty,
      totalGrossAmount: totalAmount,
      totalDamageQty: totalDmgQty,
      totalDamageValue: totalDmgVal,
      finalNetSalesAmount: netDailySales,
      previousDue: 0,
      todayDue: totalTodayDueAmount,
      dueCollection: totalDueCollectionAmount,
      totalClosingDue: totalTodayDueAmount,
      todayDueEntries: validTodayDue,
      dueCollectionEntries: validDueCollection,
      dueNotes: '',
      cashCollected: totalDenominationCash > 0 ? totalDenominationCash : Math.max(0, netDailySales - totalTodayDueAmount - dailyExpense),
      marketExpense: dailyExpense,
      lessAmount: dailyLess,
      dailyLess: dailyLess,
      cashDenominations: cashDenominations,
      netCashSubmitted: totalDenominationCash > 0 ? totalDenominationCash : Math.max(0, netDailySales - totalTodayDueAmount - dailyExpense),
      marketDue: totalTodayDueAmount,
      status: currentSheetStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };
  };

  // Open Print Preview Modal (A4 full page view with Bengali font)
  const handleOpenPrintPreview = (sheetToPrint?: DailyAccountSheet, action?: 'png' | 'pdf' | null) => {
    const sheet = getCurrentSheetData(sheetToPrint);
    setPreviewSheet(sheet);
    setPreviewInitialAction(action || null);
    setIsPreviewModalOpen(true);
  };

  // Direct PNG Download (triggers high-res A4 DOM capture)
  const handleDownloadPNG = (sheetToPrint?: DailyAccountSheet) => {
    handleOpenPrintPreview(sheetToPrint, 'png');
  };

  // PDF Download (triggers high-res image-based PDF)
  const handleDownloadPDF = (sheetToPrint?: DailyAccountSheet) => {
    handleOpenPrintPreview(sheetToPrint, 'pdf');
  };

  // Unlock completed sheet with admin confirmation
  const handleConfirmUnlock = () => {
    setIsLockedForEdit(false);
    setIsSalesTableLocked(false);
    setIsDamageTableLocked(false);
    setShowUnlockModal(false);
    showNotification('হিসাব সম্পাদনার জন্য আনলক করা হয়েছে। সংশোধনের পর পুনরায় সেভ করুন।', 'info');
  };

  // Filtered History list
  const filteredHistory = useMemo(() => {
    let list = [...(db.dailySheets || [])];

    if (historyStatusFilter === 'pending') {
      list = list.filter((s) => s.status === 'pending' || s.status === 'draft');
    } else if (historyStatusFilter === 'completed') {
      list = list.filter((s) => s.status === 'completed' || s.status === 'confirmed');
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter(
        (s) =>
          s.date.includes(q) ||
          (s.routeOrVan && s.routeOrVan.toLowerCase().includes(q)) ||
          (s.srName && s.srName.toLowerCase().includes(q)) ||
          (s.dsrName && s.dsrName.toLowerCase().includes(q))
      );
    }

    // Sort by date desc
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.dailySheets, historySearch, historyStatusFilter]);

  // Handle Delete Daily Sheet from History (with PIN verification)
  const handleRequestDeleteSheet = (sheet: DailyAccountSheet) => {
    setSheetToDeleteHistory(sheet);
    setIsDeleteHistoryModalOpen(true);
  };

  const handleConfirmDeleteHistorySheet = () => {
    if (!sheetToDeleteHistory) return;
    const targetId = sheetToDeleteHistory.id;
    const targetLabel = `${sheetToDeleteHistory.date} - ${sheetToDeleteHistory.routeOrVan || 'রুট'}`;

    try {
      deleteDailySheet(targetId);

      // If the currently loaded sheet in the editor is this deleted sheet, reset to fresh sheet
      if (currentSheetId === targetId) {
        handleStartNewSheet();
      }

      showNotification(
        `দৈনিক খাতা (${targetLabel}) সফলভাবে মুছে ফেলা হয়েছে এবং প্রয়োজনীয় স্টক ও বাকি হিসাব সমন্বয় করা হয়েছে।`,
        'success'
      );
    } catch (err: any) {
      showNotification(`খাতা মুছতে ব্যর্থ হয়েছে: ${err.message || 'অজানা ত্রুটি'}`, 'error');
    } finally {
      setIsDeleteHistoryModalOpen(false);
      setSheetToDeleteHistory(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 2. PDF LETTERHEAD STYLE (At the very top) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-900" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Business Logo Emblem */}
            <div className="h-16 w-16 shrink-0 relative overflow-hidden rounded-xl bg-slate-900 border border-amber-400/40 shadow-sm flex items-center justify-center">
              <img
                src="/mm_traders_logo.jpg"
                alt="MM TRADERS DISTRIBUTOR"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = `
                      <div class="h-full w-full flex flex-col items-center justify-center bg-slate-950 text-amber-400 font-black">
                        <span class="text-base tracking-wider leading-none">MM</span>
                        <span class="text-[8px] text-slate-300 font-bold tracking-tight">TRADERS</span>
                      </div>
                    `;
                  }
                }}
              />
            </div>

            <div>
              {/* Business Name: MM TRADERS — DISTRIBUTOR */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                  MM TRADERS — DISTRIBUTOR
                </h1>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                  অফিসিয়াল খাতা
                </span>
              </div>

              {/* Address & contact info (from Settings) */}
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                {db.settings.address || 'Dhaka, Bangladesh'} • ফোন: {db.settings.phone || '01711-XXXXXX'}
                {db.settings.proprietorName ? ` • স্বত্বাধিকারী: ${db.settings.proprietorName}` : ''}
              </p>
            </div>
          </div>

          {/* Tab Navigation Switcher / Actions (Top-Right) */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('entry')}
              className={`flex-1 sm:flex-none px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                activeTab === 'entry'
                  ? 'bg-white text-emerald-800 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
              }`}
            >
              <FileText className="h-4 w-4 text-emerald-600" />
              <span>দৈনিক খাতা এন্ট্রি</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                activeTab === 'history'
                  ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-400 ring-offset-1'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-sm hover:shadow'
              }`}
              title="সকল পূর্বের দৈনিক হিসাব ও খতিয়ান তালিকা দেখুন"
            >
              <ListFilter className="h-4 w-4 text-white" />
              <span>পূর্বের খতিয়ান তালিকা</span>
              <span className="px-1.5 py-0.5 text-[11px] font-black rounded-md bg-white/25 text-white border border-white/30">
                {db.dailySheets?.length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Horizontal divider line below the letterhead */}
        <div className="border-b border-slate-200 my-4" />

        {/* Pending Sheets Quick-Reopen Banner (Step 2 Helper) */}
        {pendingSheets.length > 0 && activeTab === 'entry' && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 mb-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                <span>আজকের চলমান হিসাব (সন্ধ্যায় ফেরত এন্ট্রি বাকি):</span>
              </div>
              <span className="text-[11px] text-amber-700">
                এক ক্লিকে ফেরত এন্ট্রি করতে রুট নির্বাচন করুন:
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {pendingSheets.map((ps) => {
                const isCurrent = currentSheetId === ps.id;
                return (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => loadSheetIntoForm(ps)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white text-slate-800 border-amber-300 hover:bg-amber-100/60'
                    }`}
                  >
                    <span>{ps.routeOrVan}</span>
                    <span className="text-[10px] opacity-85 font-mono">({ps.date})</span>
                    <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded text-[10px]">
                      চলমান
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-xl text-sm font-medium transition-all shadow-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border border-rose-200 text-rose-900'
              : 'bg-blue-50 border border-blue-200 text-blue-900'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
          {notification.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />}
          {notification.type === 'info' && <AlertTriangle className="h-5 w-5 shrink-0 text-blue-600" />}
          <span className="flex-1">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer"
          >
            বন্ধ
          </button>
        </div>
      )}

      {/* VIEW 1: DAILY ENTRY FORM (TWO-STAGE WORKFLOW) */}
      {activeTab === 'entry' && (
        <div className="space-y-5">
          {/* 1. HEADER FIELDS (Exact order: Route, Date, SR Name, DSR Name) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  চালান বিবরণী ও টিম তথ্য
                </span>
                {currentSheetStatus === 'completed' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    সম্পন্ন (Completed)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    চলমান (Morning Distributed / Open)
                  </span>
                )}
              </div>

              {/* Reset to fresh sheet button */}
              {currentSheetId && (
                <button
                  type="button"
                  onClick={handleStartNewSheet}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>+ নতুন হিসাব শুরু করুন</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Route */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span>১. Route (রুট নির্বাচন)</span>
                </label>
                <select
                  value={selectedRoute}
                  onChange={(e) => handleHeaderFieldChange('route', e.target.value)}
                  disabled={isLockedForEdit}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {availableRoutes.map((route) => (
                    <option key={route} value={route}>
                      {route}
                    </option>
                  ))}
                </select>

              </div>

              {/* 2. Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  <span>২. Date (তারিখ)</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleHeaderFieldChange('date', e.target.value)}
                  disabled={isLockedForEdit}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {/* 3. SR Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>৩. SR Name (বিক্রয় প্রতিনিধি)</span>
                </label>
                <select
                  value={selectedSR}
                  onChange={(e) => handleHeaderFieldChange('sr', e.target.value)}
                  disabled={isLockedForEdit}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {availableSRs.map((sr) => (
                    <option key={sr} value={sr}>
                      {sr}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. DSR Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>৪. DSR Name (ডেলিভারি প্রতিনিধি)</span>
                </label>
                <select
                  value={selectedDSR}
                  onChange={(e) => handleHeaderFieldChange('dsr', e.target.value)}
                  disabled={isLockedForEdit}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {availableDSRs.map((dsr) => (
                    <option key={dsr} value={dsr}>
                      {dsr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lock status banner for finalized records */}
            {isLockedForEdit && (
              <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
                  <Lock className="h-4 w-4 text-slate-600" />
                  <span>
                    এই হিসাবটি চূড়ান্তভাবে সম্পন্ন করা হয়েছে। ভুল এড়াতে এটি সংরক্ষিত ও লক অবস্থায় আছে।
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>হিসাব আনলক করে এডিট করুন</span>
                </button>
              </div>
            )}
          </div>

          {/* 1. PAGE TITLE */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 pb-1">
            <div className="flex items-center gap-3">
              <div className="h-7 w-1.5 bg-emerald-600 rounded-full" />
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">দৈনিক বিক্রি হিসাব</h2>
                <p className="text-xs text-slate-500 font-medium">
                  সকালে মালামাল বিতরণ, সন্ধ্যায় ফেরত গ্রহণ ও মোট বিক্রয় হিসাব
                </p>
              </div>
            </div>
          </div>

          {/* MAIN TABLE (Exact 6 Columns kept completely intact) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-visible">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">পণ্যের হিসাব তালিকা</span>
                <span className="text-xs text-slate-500">
                  (১. পণ্যের নাম, ২. পরিমাণ, ৩. ফেরত, ৪. মোট বিক্রি, ৫. দর, ৬. মোট টাকা)
                </span>
              </div>

              {/* Stage indicator */}
              <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                {hasAnyReturnEntered || currentSheetStatus === 'completed' ? (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                    পর্যায় ২: সন্ধ্যায় ফেরত হিসাব ও চূড়ান্তকরণ
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    পর্যায় ১: সকালে মাল বিতরণ এন্ট্রি
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs">
                    <th className="py-3 px-4 min-w-[500px] sm:min-w-[580px] lg:min-w-[640px] w-auto">১. পণ্যের নাম (Product Name)</th>
                    <th className="py-3 px-1 text-center w-20 sm:w-22 shrink-0">২. পরিমাণ (Issue)</th>
                    <th className="py-3 px-1 text-center w-20 sm:w-22 shrink-0">৩. ফেরত (Return)</th>
                    <th className="py-3 px-2 text-center w-20 sm:w-22 shrink-0">৪. মোট বিক্রি (Sold)</th>
                    <th className="py-3 px-2 text-right w-20 sm:w-24 shrink-0">৫. দর ({currency})</th>
                    <th className="py-3 px-3 text-right w-28 sm:w-32 shrink-0">৬. মোট টাকা ({currency})</th>
                    <th className="py-3 px-2 text-center w-10 shrink-0"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {computedRows.map((row, idx) => {
                    const query = row.productName.trim().toLowerCase();
                    const suggestions = query
                      ? db.products
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(query) ||
                              p.code.toLowerCase().includes(query)
                          )
                          .slice(0, 8)
                      : [];

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. পণ্যের নাম (Product Name with keyboard arrow & Tab selection) */}
                        <td className="py-2 px-4 relative min-w-[500px] sm:min-w-[580px] lg:min-w-[640px]">
                          <div className="relative">
                            <input
                              ref={(el) => {
                                prodNameInputRefs.current[row.id] = el;
                              }}
                              type="text"
                              value={row.productName}
                              disabled={isSalesLocked}
                              onChange={(e) => handleProductNameChange(row.id, e.target.value)}
                              onFocus={() => {
                                setHighlightedSuggestionIndex(0);
                                if (row.productName.trim() && !isSalesLocked) {
                                  updateRowField(row.id, 'showSuggestions', true);
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  updateRowField(row.id, 'showSuggestions', false);
                                }, 250);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                  if (suggestions.length > 0) {
                                    e.preventDefault();
                                    setHighlightedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
                                  }
                                } else if (e.key === 'ArrowUp') {
                                  if (suggestions.length > 0) {
                                    e.preventDefault();
                                    setHighlightedSuggestionIndex(
                                      (prev) => (prev - 1 + suggestions.length) % suggestions.length
                                    );
                                  }
                                } else if (e.key === 'Escape') {
                                  updateRowField(row.id, 'showSuggestions', false);
                                } else if (e.key === 'Tab' || e.key === 'Enter') {
                                  if (e.shiftKey) {
                                    if (e.key === 'Tab') {
                                      // Backward navigation to previous row's quantity
                                      if (idx > 0) {
                                        e.preventDefault();
                                        const prevRow = rows[idx - 1];
                                        const prevQty = qtyInputRefs.current[prevRow.id];
                                        if (prevQty) {
                                          prevQty.focus();
                                          prevQty.select();
                                        }
                                      }
                                      // If idx === 0, allow default browser Shift+Tab flow to preceding elements
                                    }
                                  } else {
                                    // Forward Tab:
                                    if (row.showSuggestions && suggestions.length > 0) {
                                      e.preventDefault();
                                      const selectedProduct =
                                        suggestions[highlightedSuggestionIndex] || suggestions[0];
                                      handleSelectProduct(row.id, selectedProduct);
                                    } else {
                                      // No suggestions open: move directly to Quantity field of this row
                                      e.preventDefault();
                                      const qtyEl = qtyInputRefs.current[row.id];
                                      if (qtyEl) {
                                        qtyEl.focus();
                                        qtyEl.select();
                                      }
                                    }
                                  }
                                }
                              }}
                              placeholder="পণ্যের নাম বা কোড লিখুন..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600"
                            />

                            {/* Suggestion Dropdown with default highlight & keyboard navigation */}
                            {row.showSuggestions && suggestions.length > 0 && !isSalesLocked && (
                              <ProductSuggestionDropdown
                                suggestions={suggestions}
                                highlightedIndex={highlightedSuggestionIndex}
                                currency={currency}
                                variant="emerald"
                                onSelect={(p) => handleSelectProduct(row.id, p)}
                                onHighlight={(sIdx) => setHighlightedSuggestionIndex(sIdx)}
                              />
                            )}
                          </div>
                        </td>

                        {/* 2. পরিমাণ (Quantity Out) with C/P unit toggle */}
                        <td className="py-2 px-1 text-center w-20 sm:w-22 shrink-0">
                          <div className="flex items-center justify-center gap-0.5">
                            <input
                              ref={(el) => {
                                qtyInputRefs.current[row.id] = el;
                              }}
                              type="number"
                              min="0"
                              value={row.quantityOut}
                              disabled={isSalesLocked}
                              onChange={(e) => handleQuantityChange(idx, row.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  handleRowUnitToggle(row.id, 'C');
                                  return;
                                }
                                if (e.key === 'ArrowRight') {
                                  e.preventDefault();
                                  handleRowUnitToggle(row.id, 'P');
                                  return;
                                }
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  if (e.shiftKey) {
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      const prodEl = prodNameInputRefs.current[row.id];
                                      if (prodEl) {
                                        prodEl.focus();
                                        prodEl.select();
                                      }
                                    }
                                  } else {
                                    e.preventDefault();
                                    if (isSalesLocked) return;
                                    setRows((prev) => {
                                      const nextIdx = idx + 1;
                                      if (nextIdx < prev.length) {
                                        const nextRow = prev[nextIdx];
                                        setTimeout(() => {
                                          const nextProdEl = prodNameInputRefs.current[nextRow.id];
                                          if (nextProdEl) {
                                            nextProdEl.focus();
                                            nextProdEl.select();
                                          }
                                        }, 30);
                                        return prev;
                                      } else {
                                        const hasData = Boolean(
                                          row.productName.trim() ||
                                            (row.quantityOut !== '' && Number(row.quantityOut) > 0)
                                        );
                                        if (hasData) {
                                          const newRow = createEmptyRow();
                                          setTimeout(() => {
                                            const nextProdEl = prodNameInputRefs.current[newRow.id];
                                            if (nextProdEl) {
                                              nextProdEl.focus();
                                              nextProdEl.select();
                                            }
                                          }, 30);
                                          return [...prev, newRow];
                                        } else {
                                          setTimeout(() => {
                                            morningSaveBtnRef.current?.focus();
                                          }, 30);
                                          return prev;
                                        }
                                      }
                                    });
                                  }
                                }
                              }}
                              placeholder="0"
                              className="w-10 sm:w-11 text-center rounded-lg border border-slate-300 bg-white px-1 py-1.5 text-xs sm:text-sm font-mono font-bold text-blue-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                            {/* C / P Unit Toggle */}
                            <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5 shrink-0 shadow-2xs">
                              <button
                                type="button"
                                disabled={isSalesLocked}
                                onClick={() => handleRowUnitToggle(row.id, 'C')}
                                className={`px-1 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                  row.quantityOutUnit === 'C'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="কার্টন (Carton)"
                              >
                                C
                              </button>
                              <button
                                type="button"
                                disabled={isSalesLocked}
                                onClick={() => handleRowUnitToggle(row.id, 'P')}
                                className={`px-1 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                  row.quantityOutUnit === 'P'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="পিস (Piece)"
                              >
                                P
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. ফেরত (Return) with C/P unit toggle */}
                        <td className="py-2 px-1 text-center w-20 sm:w-22 shrink-0">
                          <div className="flex items-center justify-center gap-0.5">
                            <input
                              ref={(el) => {
                                returnInputRefs.current[row.id] = el;
                              }}
                              type="number"
                              min="0"
                              value={row.returned}
                              disabled={isSalesLocked}
                              onChange={(e) =>
                                updateRowField(
                                  row.id,
                                  'returned',
                                  e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  updateRowField(row.id, 'returnedUnit', 'C');
                                  return;
                                }
                                if (e.key === 'ArrowRight') {
                                  e.preventDefault();
                                  updateRowField(row.id, 'returnedUnit', 'P');
                                  return;
                                }
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  if (e.shiftKey) {
                                    if (e.key === 'Tab') {
                                      if (idx > 0) {
                                        e.preventDefault();
                                        const prevRow = rows[idx - 1];
                                        const prevEl = returnInputRefs.current[prevRow.id];
                                        if (prevEl) {
                                          prevEl.focus();
                                          prevEl.select();
                                        }
                                      } else {
                                        e.preventDefault();
                                        const qEl = qtyInputRefs.current[row.id];
                                        if (qEl) {
                                          qEl.focus();
                                          qEl.select();
                                        }
                                      }
                                    }
                                  } else {
                                    e.preventDefault();
                                    const nextIdx = idx + 1;
                                    if (nextIdx < rows.length) {
                                      const nextRow = rows[nextIdx];
                                      const nextEl = returnInputRefs.current[nextRow.id];
                                      if (nextEl) {
                                        nextEl.focus();
                                        nextEl.select();
                                      }
                                    } else {
                                      eveningSaveBtnRef.current?.focus();
                                    }
                                  }
                                }
                              }}
                              placeholder="0"
                              className="w-10 sm:w-11 text-center rounded-lg border border-slate-300 bg-white px-1 py-1.5 text-xs sm:text-sm font-mono font-bold text-amber-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                            {/* C / P Unit Toggle */}
                            <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5 shrink-0 shadow-2xs">
                              <button
                                type="button"
                                disabled={isSalesLocked}
                                onClick={() => updateRowField(row.id, 'returnedUnit', 'C')}
                                className={`px-1 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                  row.returnedUnit === 'C'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="কার্টন (Carton)"
                              >
                                C
                              </button>
                              <button
                                type="button"
                                disabled={isSalesLocked}
                                onClick={() => updateRowField(row.id, 'returnedUnit', 'P')}
                                className={`px-1 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                  row.returnedUnit === 'P'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="পিস (Piece)"
                              >
                                P
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 4. মোট বিক্রি (Net Sale) — auto calculated */}
                        <td className="py-2 px-2 text-center w-20 sm:w-22 shrink-0">
                          <span className="inline-block py-1 px-2 rounded-md bg-emerald-50 border border-emerald-200/50 font-mono font-black text-xs sm:text-sm text-emerald-800">
                            {row.netSale}
                          </span>
                        </td>

                        {/* 5. দর (Rate) — auto filled from product */}
                        <td className="py-2 px-2 w-20 sm:w-24 shrink-0">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.rate}
                            disabled={isSalesLocked}
                            onChange={(e) =>
                              updateRowField(
                                row.id,
                                'rate',
                                e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            placeholder="0"
                            className="w-full text-right rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs sm:text-sm font-mono font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
                          />
                        </td>

                        {/* 6. মোট টাকা (Amount) — auto calculated */}
                        <td className="py-2 px-3 text-right w-28 sm:w-32 shrink-0">
                          <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                            {currency} {row.amount.toLocaleString()}
                          </span>
                        </td>

                        {/* Delete Row Button */}
                        <td className="py-2 px-2 text-center w-10 shrink-0">
                          {!isSalesLocked ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="লাইন মুছুন"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-300 inline-block cursor-not-allowed" title="লক করা আছে">
                              <Trash2 className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Total Row */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900">
                    <td className="py-3 px-4 text-left font-bold text-slate-800 min-w-[500px] sm:min-w-[580px] lg:min-w-[640px]">
                      সর্বমোট ({computedRows.filter((r) => r.productName.trim()).length} টি পণ্য)
                    </td>
                    <td className="py-3 px-1 text-center font-mono font-bold text-blue-800 w-20 sm:w-22 shrink-0">
                      {totalQuantityOut}
                    </td>
                    <td className="py-3 px-1 text-center font-mono font-bold text-amber-800 w-20 sm:w-22 shrink-0">
                      {totalReturned}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-black text-emerald-800 w-20 sm:w-22 shrink-0">
                      {totalNetSaleQty}
                    </td>
                    <td className="w-20 sm:w-24 shrink-0"></td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 text-sm sm:text-base w-28 sm:w-32 shrink-0">
                      {currency} {totalAmount.toLocaleString()}
                    </td>
                    <td className="w-10 shrink-0"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Continuous Row Addition & Lock Controls */}
            <div className="p-3 bg-white border-t border-slate-100 flex justify-between items-center text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualAddRow}
                  className={`inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isSalesLocked
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-200/70'
                      : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200/60 bg-emerald-50/40 cursor-pointer'
                  }`}
                  title={isSalesLocked ? 'লক করা আছে, প্রথমে আনলক করুন' : 'নতুন লাইন যোগ করুন'}
                >
                  <Plus className="h-4 w-4" />
                  <span>+ নতুন লাইন যোগ করুন</span>
                </button>

                {/* Lock / Unlock Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleSalesLock}
                  className={`inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                    isSalesLocked
                      ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={isSalesLocked ? 'বিক্রি টেবিল আনলক করুন (সম্পাদনা চালু)' : 'বিক্রি টেবিল লক করুন (নতুন লাইন বা এডিট বন্ধ)'}
                >
                  {isSalesLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-700" />
                      <span>লক করা আছে (🔓 আনলক করুন)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-slate-600" />
                      <span>🔒 লক করুন</span>
                    </>
                  )}
                </button>
              </div>

              {isSalesLocked && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>বিক্রি তালিকা লক করা (নতুন লাইন বা পরিবর্তন বন্ধ)</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. DAMAGE SECTION — SAME TABLE STYLE AS MAIN SALES TABLE */}
          <div className="rounded-2xl border border-rose-200 bg-white shadow-xs overflow-visible">
            <div className="p-4 border-b border-rose-100 flex items-center justify-between flex-wrap gap-2 bg-rose-50/40">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                <span className="font-bold text-slate-900 text-sm">ড্যামেজ</span>
                <span className="text-xs text-rose-700 font-medium">
                  (মার্কেট ড্যামেজ / নষ্ট পণ্যের হিসাব)
                </span>
              </div>
              <div className="text-xs font-semibold text-rose-800 bg-rose-100/70 border border-rose-200 px-2.5 py-1 rounded-md">
                মোট ড্যামেজ টাকা মূল বিক্রি থেকে স্বয়ংক্রিয়ভাবে বাদ যাবে
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-700">
                    <th className="py-3 px-2 text-center w-10 sm:w-12 shrink-0">#</th>
                    <th className="py-3 px-4 min-w-[500px] sm:min-w-[580px] lg:min-w-[640px] w-auto">১. পণ্যের নাম (Product Name)</th>
                    <th className="py-3 px-1 text-center w-20 sm:w-22 shrink-0">২. পরিমাণ (Damage)</th>
                    <th className="py-3 px-1 text-center w-14 sm:w-16 shrink-0 text-slate-400">৩. ফেরত (Return)</th>
                    <th className="py-3 px-2 text-center w-20 sm:w-22 shrink-0">৪. মোট বিক্রি (Net)</th>
                    <th className="py-3 px-2 text-right w-20 sm:w-24 shrink-0">৫. দর (Rate)</th>
                    <th className="py-3 px-3 text-right w-28 sm:w-32 shrink-0">৬. মোট টাকা (Amount)</th>
                    <th className="py-3 px-2 text-center w-10 sm:w-12 shrink-0">মুছুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {computedDamageRows.map((row, idx) => {
                    // Match suggestions
                    const query = row.productName.trim().toLowerCase();
                    const suggestions = query
                      ? db.products
                          .filter(
                            (p) =>
                              p.status === 'active' &&
                              (p.name.toLowerCase().includes(query) ||
                                p.code.toLowerCase().includes(query))
                          )
                          .slice(0, 8)
                      : [];

                    const isSuggestionsVisible = row.showSuggestions && suggestions.length > 0 && !isDamageLocked;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        } hover:bg-rose-50/30`}
                      >
                        {/* Index */}
                        <td className="py-2 px-2 text-center font-mono font-medium text-slate-400 text-xs w-10 sm:w-12 shrink-0">
                          {idx + 1}
                        </td>

                        {/* 1. পণ্যের নাম with Tab autocomplete */}
                        <td className="py-2 px-4 relative min-w-[500px] sm:min-w-[580px] lg:min-w-[640px]">
                          <div className="relative">
                            <input
                              ref={(el) => {
                                damageProdNameInputRefs.current[row.id] = el;
                              }}
                              type="text"
                              value={row.productName}
                              disabled={isDamageLocked}
                              onChange={(e) => handleDamageProductNameChange(row.id, e.target.value)}
                              onFocus={() => {
                                if (row.productName.trim() && !isDamageLocked) {
                                  updateDamageRowField(row.id, 'showSuggestions', true);
                                }
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  updateDamageRowField(row.id, 'showSuggestions', false);
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (isSuggestionsVisible) {
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setDamageHighlightedSuggestionIndex((prev) =>
                                      prev < suggestions.length - 1 ? prev + 1 : prev
                                    );
                                    return;
                                  }
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setDamageHighlightedSuggestionIndex((prev) =>
                                      prev > 0 ? prev - 1 : 0
                                    );
                                    return;
                                  }
                                  if (e.key === 'Tab' || e.key === 'Enter') {
                                    if (!e.shiftKey) {
                                      e.preventDefault();
                                      const pickedProduct = suggestions[damageHighlightedSuggestionIndex] || suggestions[0];
                                      if (pickedProduct) {
                                        handleDamageSelectProduct(row.id, pickedProduct);
                                      }
                                      return;
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    updateDamageRowField(row.id, 'showSuggestions', false);
                                    return;
                                  }
                                }

                                if (e.key === 'Tab' && !e.shiftKey) {
                                  e.preventDefault();
                                  const qtyEl = damageQtyInputRefs.current[row.id];
                                  if (qtyEl) {
                                    qtyEl.focus();
                                    qtyEl.select();
                                  }
                                }
                              }}
                              placeholder="পণ্যের নাম লিখুন..."
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                            />

                            {/* Dropdown Suggestions */}
                            {isSuggestionsVisible && (
                              <ProductSuggestionDropdown
                                suggestions={suggestions}
                                highlightedIndex={damageHighlightedSuggestionIndex}
                                currency={currency}
                                variant="rose"
                                onSelect={(p) => handleDamageSelectProduct(row.id, p)}
                                onHighlight={(sIdx) => setDamageHighlightedSuggestionIndex(sIdx)}
                              />
                            )}
                          </div>
                        </td>

                        {/* 2. পরিমাণ (Damage Qty) with C/P unit toggle */}
                        <td className="py-2 px-1 text-center w-20 sm:w-22 shrink-0">
                          <div className="flex items-center justify-center gap-0.5">
                            <input
                              ref={(el) => {
                                damageQtyInputRefs.current[row.id] = el;
                              }}
                              type="number"
                              min="0"
                              value={row.quantityOut}
                              disabled={isDamageLocked}
                              onChange={(e) =>
                                handleDamageQuantityChange(idx, row.id, e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') {
                                  e.preventDefault();
                                  handleDamageUnitToggle(row.id, 'C');
                                  return;
                                }
                                if (e.key === 'ArrowRight') {
                                  e.preventDefault();
                                  handleDamageUnitToggle(row.id, 'P');
                                  return;
                                }
                                if (e.key === 'Tab' || e.key === 'Enter') {
                                  if (e.shiftKey) {
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      const prodEl = damageProdNameInputRefs.current[row.id];
                                      if (prodEl) {
                                        prodEl.focus();
                                        prodEl.select();
                                      }
                                    }
                                  } else {
                                    e.preventDefault();
                                    if (isDamageLocked) return;
                                    setDamageRows((prev) => {
                                      const nextIdx = idx + 1;
                                      if (nextIdx < prev.length) {
                                        const nextRow = prev[nextIdx];
                                        setTimeout(() => {
                                          const nextProdEl = damageProdNameInputRefs.current[nextRow.id];
                                          if (nextProdEl) {
                                            nextProdEl.focus();
                                            nextProdEl.select();
                                          }
                                        }, 30);
                                        return prev;
                                      } else {
                                        const hasData = Boolean(
                                          row.productName.trim() ||
                                            (row.quantityOut !== '' && Number(row.quantityOut) > 0)
                                        );
                                        if (hasData) {
                                          const newRow = createEmptyDamageRow();
                                          setTimeout(() => {
                                            const nextProdEl = damageProdNameInputRefs.current[newRow.id];
                                            if (nextProdEl) {
                                              nextProdEl.focus();
                                              nextProdEl.select();
                                            }
                                          }, 30);
                                          return [...prev, newRow];
                                        } else {
                                          return prev;
                                        }
                                      }
                                    });
                                  }
                                }
                              }}
                              placeholder="0"
                              className="w-10 sm:w-11 text-center rounded-lg border border-slate-300 bg-white px-1 py-1.5 text-xs sm:text-sm font-mono font-bold text-rose-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-50"
                            />
                            {/* C / P Unit Toggle - Default is P */}
                            <div className="inline-flex rounded border border-slate-200 bg-slate-100 p-0.5 shrink-0 shadow-2xs">
                              <button
                                type="button"
                                disabled={isDamageLocked}
                                onClick={() => handleDamageUnitToggle(row.id, 'C')}
                                className={`px-1 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                  row.quantityOutUnit === 'C'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="কার্টন (Carton - Left Arrow)"
                              >
                                C
                              </button>
                              <button
                                type="button"
                                disabled={isDamageLocked}
                                onClick={() => handleDamageUnitToggle(row.id, 'P')}
                                className={`px-1 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${
                                  row.quantityOutUnit === 'P' || !row.quantityOutUnit
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="পিস (Piece - Right Arrow)"
                              >
                                P
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. ফেরত (Return) — unused / 0 for damage rows */}
                        <td className="py-2 px-1 text-center w-14 sm:w-16 shrink-0">
                          <input
                            type="text"
                            disabled
                            value="0"
                            className="w-10 text-center rounded-lg border border-slate-200 bg-slate-100/70 px-1 py-1.5 text-xs sm:text-sm font-mono text-slate-400 cursor-not-allowed mx-auto"
                          />
                        </td>

                        {/* 4. মোট ড্যামেজ পিস (Damage Pieces) */}
                        <td className="py-2 px-2 text-center w-20 sm:w-22 shrink-0">
                          <span className="inline-block py-1 px-2 rounded-md bg-rose-50 border border-rose-200/50 font-mono font-black text-xs sm:text-sm text-rose-800">
                            {row.damagePieces}
                          </span>
                        </td>

                        {/* 5. দর (Rate) */}
                        <td className="py-2 px-2 w-20 sm:w-24 shrink-0">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.rate}
                            disabled={isDamageLocked}
                            onChange={(e) =>
                              updateDamageRowField(
                                row.id,
                                'rate',
                                e.target.value === '' ? '' : Number(e.target.value) || 0
                              )
                            }
                            placeholder="0.00"
                            className="w-full text-right rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs sm:text-sm font-mono font-semibold text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-50"
                          />
                        </td>

                        {/* 6. মোট টাকা (Amount = Qty × Rate) */}
                        <td className="py-2 px-3 text-right w-28 sm:w-32 shrink-0">
                          <span className="font-mono font-black text-xs sm:text-sm text-rose-800">
                            {currency} {row.amount.toLocaleString()}
                          </span>
                        </td>

                        {/* Action: Delete */}
                        <td className="py-2 px-2 text-center w-10 sm:w-12 shrink-0">
                          {!isDamageLocked ? (
                            <button
                              type="button"
                              onClick={() => handleDamageDeleteRow(row.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ড্যামেজ লাইন মুছুন"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="p-1.5 text-slate-300 inline-block cursor-not-allowed" title="লক করা আছে">
                              <Trash2 className="h-4 w-4" />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-rose-50/50 font-bold text-xs sm:text-sm">
                    <td className="w-10 sm:w-12 shrink-0"></td>
                    <td className="py-3 px-4 text-slate-900 font-extrabold min-w-[500px] sm:min-w-[580px] lg:min-w-[640px]">
                      মোট ড্যামেজ ({computedDamageRows.filter((r) => r.productName.trim()).length} টি পণ্য)
                    </td>
                    <td className="py-3 px-1 text-center font-mono font-black text-rose-700 text-sm sm:text-base w-20 sm:w-22 shrink-0">
                      {totalDamageQty}
                    </td>
                    <td className="py-3 px-1 text-center font-mono font-semibold text-slate-400 w-14 sm:w-16 shrink-0">
                      0
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-black text-rose-700 text-sm sm:text-base w-20 sm:w-22 shrink-0">
                      {totalDamageQty}
                    </td>
                    <td className="w-20 sm:w-24 shrink-0"></td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-800 text-sm sm:text-base w-28 sm:w-32 shrink-0">
                      {currency} {totalDamageAmount.toLocaleString()}
                    </td>
                    <td className="w-10 sm:w-12 shrink-0"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Continuous Damage Row Addition Button & Lock Controls */}
            <div className="p-3 bg-white border-t border-rose-100 flex justify-between items-center text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualAddDamageRow}
                  className={`inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    isDamageLocked
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed hover:bg-slate-200/70'
                      : 'text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/60 bg-rose-50/40 cursor-pointer'
                  }`}
                  title={isDamageLocked ? 'লক করা আছে, প্রথমে আনলক করুন' : 'নতুন ড্যামেজ লাইন যোগ করুন'}
                >
                  <Plus className="h-4 w-4" />
                  <span>+ নতুন ড্যামেজ লাইন যোগ করুন</span>
                </button>

                {/* Lock / Unlock Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleDamageLock}
                  className={`inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                    isDamageLocked
                      ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={isDamageLocked ? 'ড্যামেজ টেবিল আনলক করুন (সম্পাদনা চালু)' : 'ড্যামেজ টেবিল লক করুন (নতুন লাইন বা এডিট বন্ধ)'}
                >
                  {isDamageLocked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-700" />
                      <span>লক করা আছে (🔓 আনলক করুন)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-slate-600" />
                      <span>🔒 লক করুন</span>
                    </>
                  )}
                </button>
              </div>

              {isDamageLocked && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                  <Lock className="h-3 w-3 text-amber-600" />
                  <span>ড্যামেজ তালিকা লক করা (নতুন লাইন বা পরিবর্তন বন্ধ)</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. TODAY'S DUE & DUE COLLECTION SECTION (Table A & Table B) */}
          <div className="rounded-2xl border border-amber-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-amber-100 flex items-center justify-between flex-wrap gap-2 bg-amber-50/40">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                <span className="font-bold text-slate-900 text-sm">বাকি ও কালেকশন হিসাব</span>
                <span className="text-xs text-amber-800 font-medium">
                  (আজকের নতুন বাকি ও বকেয়া আদায়)
                </span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Table A: আজকের নতুন বাকি (Today's New Due) */}
              <div className="rounded-xl border border-amber-200/80 bg-white overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2.5 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    টেবিল ১: আজকের নতুন বাকি (Today's New Due)
                  </span>
                  <span className="font-mono font-bold text-xs text-amber-900">
                    মোট: {currency} {totalTodayDueAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 space-y-2.5">
                  {/* Table Header (Desktop/Tablet) */}
                  <div className="hidden sm:flex items-center gap-3 px-2 text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-2">
                    <span className="w-5 text-center shrink-0">#</span>
                    <span className="flex-1">দোকান / কাস্টমার নাম</span>
                    <span className="w-28 sm:w-32 text-right shrink-0">বাকি টাকা ({currency})</span>
                    <span className="w-20 text-center shrink-0">লেজার এন্ট্রি</span>
                    <span className="w-7 shrink-0"></span>
                  </div>

                  {todayDueRows.map((row, idx) => {
                    const matchedCustomer = db.customers.find(
                      (c) =>
                        c.id === row.customerId ||
                        (row.description &&
                          (c.shopName.trim().toLowerCase() === row.description.trim().toLowerCase() ||
                            c.name.trim().toLowerCase() === row.description.trim().toLowerCase()))
                    );

                    return (
                      <div
                        key={row.id}
                        className="p-3 sm:p-1.5 rounded-xl sm:rounded-none bg-slate-50/70 sm:bg-transparent border border-slate-200/80 sm:border-0 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-3 text-xs"
                      >
                        {/* Row Index (Desktop) */}
                        <span className="hidden sm:block w-5 text-center font-mono text-slate-400 shrink-0">
                          {idx + 1}
                        </span>

                        {/* Mobile Header: Index & Delete button */}
                        <div className="flex sm:hidden items-center justify-between text-xs text-slate-500 font-medium">
                          <span className="font-bold text-slate-700">বাকি এন্ট্রি #{idx + 1}</span>
                          {!isLockedForEdit && todayDueRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTodayDueRow(row.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              title="মুছুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* 1. Customer Name (Enlarged to take all flexible horizontal space) */}
                        <div className="flex-1 min-w-0">
                          <CustomerAutocomplete
                            value={row.description}
                            customers={db.customers}
                            selectedCustomer={matchedCustomer || null}
                            currency={currency}
                            onSelectCustomer={(c) => handleSelectCustomerForTodayDue(row.id, c)}
                            onChange={(t: string) => handleUpdateTodayDueRow(row.id, 'description', t)}
                            placeholder="দোকান বা কাস্টমারের নাম লিখুন..."
                            disabled={isLockedForEdit || row.isSavedToLedger}
                          />
                          {matchedCustomer && matchedCustomer.currentDue > 0 && (
                            <span className="text-[10px] text-amber-800 font-medium block mt-0.5 pl-1">
                              পূর্বের বাকি: {currency} {matchedCustomer.currentDue.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* 2. Amount & Actions (Paired on mobile, inline on desktop) */}
                        <div className="flex items-center gap-2 sm:contents">
                          {/* Amount Input */}
                          <div className="flex-1 sm:flex-initial sm:w-28 sm:w-32 shrink-0">
                            <input
                              type="number"
                              min="0"
                              disabled={isLockedForEdit || row.isSavedToLedger}
                              value={row.amount === 0 ? '' : row.amount}
                              onChange={(e) =>
                                handleUpdateTodayDueRow(
                                  row.id,
                                  'amount',
                                  e.target.value === '' ? 0 : Number(e.target.value) || 0
                                )
                              }
                              placeholder="টাকা (০.০০)"
                              className="w-full text-right rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-amber-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none disabled:bg-slate-50 transition-colors"
                            />
                          </div>

                          {/* Save / Status Badge */}
                          <div className="w-20 shrink-0 text-center flex justify-center">
                            {row.isSavedToLedger ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                যুক্ত
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSaveTodayDueRowToLedger(row.id)}
                                disabled={isLockedForEdit || !row.description.trim() || Number(row.amount) <= 0}
                                className="w-full px-2.5 py-1.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap shadow-xs"
                                title="সেন্ট্রাল কাস্টমার লেজারে যোগ করুন"
                              >
                                সেভ
                              </button>
                            )}
                          </div>

                          {/* Delete action (Desktop) */}
                          <div className="hidden sm:flex w-7 justify-center shrink-0">
                            {!isLockedForEdit && todayDueRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTodayDueRow(row.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="মুছুন"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!isLockedForEdit && (
                    <button
                      type="button"
                      onClick={handleAddTodayDueRow}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950 px-2 py-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ নতুন বাকি যোগ করুন</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Table B: বাকি আদায় / কালেকশন (Due Collection) */}
              <div className="rounded-xl border border-emerald-200/80 bg-white overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      টেবিল ২: বাকি আদায় / কালেকশন (Due Collection)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRouteDueModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                      title="এই রুটের সকল কাস্টমারের বকেয়া তালিকা দেখুন, খুঁজুন ও দ্রুত আদায় জমা করুন"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-200" />
                      <span>এই রুটের বাকি</span>
                      {routeCustomersWithDue.length > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-900 text-emerald-100 text-[10px] font-mono">
                          {routeCustomersWithDue.length}
                        </span>
                      )}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-xs text-emerald-900">
                    মোট আদায়: {currency} {totalDueCollectionAmount.toLocaleString()}
                  </span>
                </div>

                {/* Informational Due Collection note */}
                <div className="p-2.5 bg-emerald-50/50 border-b border-emerald-100 text-[11px] text-emerald-900 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>তথ্যমূলক এন্ট্রি:</strong> পূর্বের বকেয়া আদায় সরাসরি সেন্ট্রাল লেজারে জমা হয় — এটি আজকের পণ্য বিক্রয় (Net Sales)-এর সাথে যোগ বা বিয়োগ হয় না।
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-1 text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-1.5">
                    <span className="col-span-1 text-center">#</span>
                    <span className="col-span-6">দোকান / কাস্টমার ও ফোন</span>
                    <span className="col-span-3 text-right">আদায়ের পরিমাণ (টাকা)</span>
                    <span className="col-span-2 text-center">অবস্থা / নিশ্চিতকরণ</span>
                  </div>

                  {dueCollectionRows.map((row, idx) => {
                    const matchedCustomer = db.customers.find(
                      (c) =>
                        c.id === row.customerId ||
                        (row.description &&
                          (c.shopName.trim().toLowerCase() === row.description.trim().toLowerCase() ||
                            c.name.trim().toLowerCase() === row.description.trim().toLowerCase()))
                    );

                    return (
                      <div key={row.id} className="grid grid-cols-12 gap-2 items-center text-xs py-1 border-b border-slate-50 last:border-0">
                        <span className="col-span-1 text-center font-mono text-slate-400">
                          {idx + 1}
                        </span>

                        {/* Customer Autocomplete & Phone */}
                        <div className="col-span-6">
                          {row.isSavedToLedger ? (
                            <div>
                              <span className="font-bold text-slate-900 block truncate">
                                {row.shopName || row.description}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                {matchedCustomer?.phone && (
                                  <span className="font-mono">{matchedCustomer.phone}</span>
                                )}
                                {row.dueNo && (
                                  <span className="font-mono text-slate-400">({row.dueNo})</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <CustomerAutocomplete
                                value={row.description}
                                customers={db.customers}
                                selectedCustomer={matchedCustomer || null}
                                currency={currency}
                                onSelectCustomer={(c) => handleSelectCustomerForDueCollection(row.id, c)}
                                onChange={(t: string) => handleUpdateDueCollectionRow(row.id, 'description', t)}
                                placeholder="দোকান বা কাস্টমার নির্বাচন করুন..."
                                disabled={isLockedForEdit}
                              />
                              {matchedCustomer && (
                                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                  <span className="text-rose-700 font-bold">
                                    মোট বাকি: {currency} {matchedCustomer.currentDue.toLocaleString()}
                                  </span>
                                  {matchedCustomer.phone && (
                                    <span className="font-mono text-slate-500">
                                      {matchedCustomer.phone}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="col-span-3 text-right">
                          {row.isSavedToLedger ? (
                            <span className="font-mono font-bold text-emerald-800 text-xs">
                              {currency} {Number(row.amount).toLocaleString()}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              disabled={isLockedForEdit}
                              value={row.amount === 0 ? '' : row.amount}
                              onChange={(e) =>
                                handleUpdateDueCollectionRow(
                                  row.id,
                                  'amount',
                                  e.target.value === '' ? 0 : Number(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                              className="w-full text-right rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono font-bold text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
                            />
                          )}
                        </div>

                        {/* PIN Verification & Save */}
                        <div className="col-span-2 text-center flex items-center justify-center gap-1.5">
                          {row.isSavedToLedger ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-md whitespace-nowrap">
                              <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                              আদায়কৃত
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenRowConfirmModal(row)}
                              disabled={isLockedForEdit || (!row.description.trim() && !row.customerId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors disabled:opacity-40 cursor-pointer whitespace-nowrap"
                              title="পপআপ ওপেন করে পিন দিয়ে আদায় নিশ্চিত করুন"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              জমা দিন
                            </button>
                          )}

                          {!isLockedForEdit && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDueCollectionRow(row.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="মুছুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {!isLockedForEdit && (
                    <button
                      type="button"
                      onClick={handleAddDueCollectionRow}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 px-2 py-1 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ নতুন কালেকশন সারি যোগ করুন</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Below both tables summary */}
            <div className="p-4 bg-amber-50/30 border-t border-amber-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">মোট আজকের নতুন বাকি</span>
                <span className="text-base sm:text-lg font-mono font-black text-amber-800">
                  {currency} {totalTodayDueAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">মোট বকেয়া আদায় (আজকের)</span>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-800">
                  {currency} {totalDueCollectionAmount.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-300 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-900 block">আজকের বাকি নিট বৃদ্ধি</span>
                <span className="text-lg sm:text-xl font-mono font-black text-amber-950">
                  {currency} {totalTodayDueAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* 4. TOTAL CALCULATIONS & ACTION BUTTONS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-6">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">দৈনিক বিক্রি ও জমা সারাংশ</h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span>মূল বিক্রি: {totalNetSaleQty} পিস</span>
                  <span>•</span>
                  <span className="text-rose-600">ড্যামেজ: {totalDamageQty} পিস</span>
                </div>
              </div>

              {/* 3 Prominent Sales Totals (Gross, Damage, Net Daily Sales) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                {/* 1. Gross Sales */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    ১. মূল বিক্রি (Gross)
                  </p>
                  <p className="text-lg sm:text-xl font-mono font-black text-slate-800 mt-1">
                    {currency} {grossSalesAmount.toLocaleString()}
                  </p>
                </div>

                {/* 2. Total Damage */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                  <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                    ২. মোট ড্যামেজ (Damage)
                  </p>
                  <p className="text-lg sm:text-xl font-mono font-black text-rose-700 mt-1">
                    - {currency} {totalDamageAmount.toLocaleString()}
                  </p>
                </div>

                {/* 3. Net Daily Sales */}
                <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/70">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    ৩. প্রকৃত বিক্রি (Net Sales)
                  </p>
                  <p className="text-xl sm:text-2xl font-mono font-black text-emerald-700 mt-0.5">
                    {currency} {netDailySalesAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium pb-2 border-b border-slate-100 mb-2">
                <span>* চূড়ান্ত নিট বিক্রি = মূল বিক্রি ({currency} {grossSalesAmount.toLocaleString()}) − মোট ড্যামেজ ({currency} {totalDamageAmount.toLocaleString()})</span>
                <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-md text-[11px] font-semibold shrink-0">
                  <span>লেস রেফারেন্স:</span>
                  <span>আজকের লেস {currency} {todayLessAmount.toLocaleString()}</span>
                  <span>|</span>
                  <span>মোট বকেয়া লেস {currency} {totalOutstandingLess.toLocaleString()}</span>
                </span>
              </div>
            </div>

            {/* 5 & 6. TWO-COLUMN LAYOUT: নোট হিসাব & ক্যাশ হিসাব */}
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* LEFT COLUMN: নোট হিসাব (Cash Denomination Count) */}
                <div>
                  <CashDenominationTable
                    values={cashDenominations}
                    onChange={setCashDenominations}
                    currency={currency}
                    disabled={isLockedForEdit}
                  />
                </div>

                {/* RIGHT COLUMN: ক্যাশ হিসাব (Cash Reconciliation) */}
                <div>
                  <SalesReconciliationPanel
                    netDailySales={netDailySalesAmount}
                    newDue={totalTodayDueAmount}
                    expense={dailyExpense}
                    onExpenseChange={setDailyExpense}
                    less={dailyLess}
                    onLessChange={setDailyLess}
                    totalCash={totalDenominationCash}
                    currency={currency}
                    disabled={isLockedForEdit}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3 flex-wrap justify-end">
              {/* Print Preview Button */}
              <button
                type="button"
                onClick={() => handleOpenPrintPreview()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition-all cursor-pointer shadow-xs"
                title="প্রিন্ট প্রিভিউ দেখুন"
              >
                <Eye className="h-4 w-4 text-sky-600" />
                <span>প্রিন্ট প্রিভিউ</span>
              </button>

              {/* PNG Download Button (Primary) */}
              <button
                type="button"
                onClick={() => handleDownloadPNG()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition-all cursor-pointer shadow-xs"
                title="হাই-রেজোলিউশন A4 সাইজের PNG ডাউনলোড"
              >
                <ImageDown className="h-4 w-4 text-emerald-600" />
                <span>PNG ডাউনলোড (A4)</span>
              </button>

              {/* PDF Download Button */}
              <button
                type="button"
                onClick={() => handleDownloadPDF()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer shadow-xs"
                title="ইমেজ-বেসড PDF ডাউনলোড"
              >
                <FileDown className="h-4 w-4 text-slate-600" />
                <span>PDF ডাউনলোড</span>
              </button>

              {/* STEP 1: Morning (বিতরণ সেভ করুন) */}
              <button
                ref={morningSaveBtnRef}
                type="button"
                onClick={() => handleSaveSheet('morning')}
                disabled={isLockedForEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                <Clock className="h-4 w-4" />
                <span>বিতরণ সেভ করুন (সকাল)</span>
              </button>

              {/* STEP 2: Evening (চূড়ান্ত হিসাব সেভ করুন) */}
              <button
                ref={eveningSaveBtnRef}
                type="button"
                onClick={() => handleSaveSheet('evening')}
                disabled={isLockedForEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-900/15 transition-all disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              >
                <CheckCircle className="h-4 w-4" />
                <span>চূড়ান্ত হিসাব সেভ করুন (সন্ধ্যা)</span>
              </button>
            </div>
          </div>
          </div>
      )}

      {/* VIEW 2: DAILY হিসাব LIST / HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-black text-slate-900">সকল দৈনিক হিসাব খতিয়ান</h2>
              <p className="text-xs text-slate-500">
                চলমান ও সম্পন্ন হিসাবের তালিকা এবং সরাসরি ফেরত এন্ট্রি
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    historyStatusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সব ({db.dailySheets?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('pending')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    historyStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  চলমান ({pendingSheets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('completed')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    historyStatusFilter === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  সম্পন্ন ({(db.dailySheets?.length || 0) - pendingSheets.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="রুট, তারিখ বা নাম খুঁজুন..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 w-48 sm:w-56"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-3">রুট (Route)</th>
                  <th className="py-3 px-3">SR / DSR</th>
                  <th className="py-3 px-3 text-center">বিতরণ</th>
                  <th className="py-3 px-3 text-center">ফেরত</th>
                  <th className="py-3 px-3 text-center">বিক্রি</th>
                  <th className="py-3 px-3 text-right">মোট টাকা</th>
                  <th className="py-3 px-3 text-center">অবস্থা</th>
                  <th className="py-3 px-4 text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      কোন দৈনিক হিসাব রেকর্ড পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((s) => {
                    const isFinal = s.status === 'confirmed' || s.status === 'completed';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {s.date}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {s.routeOrVan || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800">{s.srName || '-'}</p>
                          <p className="text-[11px] text-slate-500">{s.dsrName || '-'}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                          {s.totalIssuedQty}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                          {s.totalReturnQty}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                          {s.totalNetSoldQty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {currency} {s.finalNetSalesAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isFinal ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              সম্পন্ন
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="h-3 w-3 text-amber-600" />
                              চলমান
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Reopen / Edit Button */}
                          <button
                            type="button"
                            onClick={() => loadSheetIntoForm(s)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              !isFinal
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                            }`}
                          >
                            {!isFinal ? (
                              <>
                                <span>ফেরত এন্ট্রি</span>
                                <ArrowRight className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3 text-slate-500" />
                                <span>দেখুন</span>
                              </>
                            )}
                          </button>

                          {/* Print Preview Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrintPreview(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
                            title="প্রিন্ট প্রিভিউ দেখুন"
                          >
                            <Eye className="h-3.5 w-3.5 text-sky-600" />
                            <span>প্রিভিউ</span>
                          </button>

                          {/* PNG Download Button (Primary) */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPNG(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                            title="A4 সাইজ PNG ডাউনলোড"
                          >
                            <ImageDown className="h-3.5 w-3.5 text-emerald-600" />
                            <span>PNG</span>
                          </button>

                          {/* PDF Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                            title="PDF ডাউনলোড"
                          >
                            <FileDown className="h-3.5 w-3.5 text-slate-600" />
                            <span>PDF</span>
                          </button>

                          {/* Delete with PIN prompt */}
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteSheet(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="খাতাটি স্থায়ীভাবে মুছে ফেলুন (PIN নিশ্চিতকরণ)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADMIN CONFIRMATION MODAL TO UNLOCK COMPLETED RECORD */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">হিসাব আনলক নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-500">এডমিন অনুমতি প্রয়োজন</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              এই হিসাবটি আগে থেকেই <strong>সম্পন্ন</strong> হিসেবে সেভ করা হয়েছে এবং গোডাউন স্টক সমন্বয় করা হয়েছে।
              আপনি কি নিশ্চিত যে এই খাতাটি পুনরায় সম্পাদনা বা পরিবর্তন করতে চান?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                হ্যাঁ, আনলক করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Due Collection Security PIN Modal */}
      <PinPromptModal
        isOpen={pinModalOpen}
        title="বকেয়া আদায় নিশ্চিতকরণ (PIN)"
        subtitle="সেন্ট্রাল কাস্টমার লেজারে বকেয়া জমা করতে ৪-৬ সংখ্যার নিরাপত্তা পিন কোড দিন"
        itemName={
          pendingDueCollectionRow
            ? `${pendingDueCollectionRow.description || 'কাস্টমার'} — আদায়: ${currency} ${(Number(pendingDueCollectionRow.amount) || 0).toLocaleString()}`
            : undefined
        }
        confirmButtonText="জমা নিশ্চিত করুন"
        confirmButtonVariant="success"
        correctPin={db.settings.securityPin || currentUser.pin || '1234'}
        onSuccess={handleConfirmDueCollectionPin}
        onClose={() => {
          setPinModalOpen(false);
          setPendingDueCollectionRow(null);
        }}
      />

      {/* Due Collection Confirmation & PIN Modal (New Unified Flow) */}
      <DueCollectionConfirmModal
        isOpen={dueConfirmModalOpen}
        customer={confirmModalCustomer}
        dueNo={confirmModalDueNo}
        defaultAmount={confirmModalDefaultAmount}
        defaultDate={selectedDate}
        correctPin={db.settings.securityPin || currentUser.pin || '1234'}
        onConfirm={handleExecuteConfirmedDueCollection}
        onClose={() => {
          setDueConfirmModalOpen(false);
          setConfirmModalCustomer(null);
          setConfirmModalTargetRowId(null);
        }}
      />

      {/* Route-wise Due Customers Modal */}
      <RouteDueModal
        isOpen={isRouteDueModalOpen}
        onClose={() => setIsRouteDueModalOpen(false)}
        selectedRoute={selectedRoute}
        customers={routeCustomersWithDue}
        ledgers={db.customerLedgers || []}
        currency={currency}
        onSelectCustomer={handleSelectCustomerFromRouteModal}
      />

      {/* Add New Route Modal */}
      {isAddRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    + নতুন রুট যোগ করুন (Add New Route)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    দৈনিক চালান ও মাল বিতরণের জন্য নতুন রুট এর নাম দিন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRouteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রুটের নাম (Route Name) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newRouteInput}
                  onChange={(e) => setNewRouteInput(e.target.value)}
                  placeholder="যেমন: রুট ৭: মিরপুর ও মোহাম্মদপুর"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRouteModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!newRouteInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>রুট সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Route Modal */}
      {isEditRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    রুট এডিট / পরিবর্তন করুন (Edit Route)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    বিদ্যমান রুটের নাম পরিবর্তন করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditRouteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রুটের পরিবর্তিত নাম (Route Name) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editRouteInput}
                  onChange={(e) => setEditRouteInput(e.target.value)}
                  placeholder="রুটের নাম লিখুন"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-slate-500">
                  নোট: রুটের নাম পরিবর্তন করলে তা সকল খতিয়ানে হালনাগাদ হবে এবং কোনো পূর্বের রেকর্ড ক্ষতিগ্রস্ত হবে না।
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditRouteModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!editRouteInput.trim() || editRouteInput.trim() === selectedRoute}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>আপডেট সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Page Bengali Print Preview & Image-Based Export Modal */}
      {previewSheet && (
        <DailySalesPrintPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewInitialAction(null);
          }}
          sheet={previewSheet}
          settings={db.settings}
          currency={currency}
          initialAction={previewInitialAction}
        />
      )}

      {/* Route Delete PIN Modal */}
      <PinPromptModal
        isOpen={isDeleteRouteModalOpen}
        title="রুট মুছে ফেলার অনুমোদন (PIN)"
        subtitle={deleteRouteWarningSubtitle}
        itemName={selectedRoute}
        confirmButtonText="রুট ডিলিট করুন"
        confirmButtonVariant="danger"
        correctPin={[
          db.settings.securityPin,
          db.settings.ownerPin,
          currentUser.pin,
          db.users?.find((u) => u.role === 'owner')?.pin,
          '1234',
        ]
          .filter(Boolean)
          .join('|')}
        onSuccess={handleConfirmDeleteRoute}
        onClose={() => setIsDeleteRouteModalOpen(false)}
      />

      {/* Daily Sheet History Delete Security PIN Modal */}
      <PinPromptModal
        isOpen={isDeleteHistoryModalOpen}
        title="দৈনিক খাতা মুছে ফেলা নিশ্চিতকরণ (PIN)"
        subtitle="এই দৈনিক হিসাব খতিয়ানটি স্থায়ীভাবে মুছে ফেলতে ৪-৬ সংখ্যার নিরাপত্তা পিন কোড দিন"
        itemName={
          sheetToDeleteHistory
            ? `${sheetToDeleteHistory.date} — ${sheetToDeleteHistory.routeOrVan || 'রুট'} (বিক্রি: ${currency} ${(Number(sheetToDeleteHistory.finalNetSalesAmount) || 0).toLocaleString()})`
            : undefined
        }
        confirmButtonText="স্থায়ীভাবে মুছে ফেলুন"
        confirmButtonVariant="danger"
        correctPin={[
          db.settings.securityPin,
          db.settings.ownerPin,
          currentUser.pin,
          db.users?.find((u) => u.role === 'owner')?.pin,
          '1234',
        ]
          .filter(Boolean)
          .join('|')}
        onSuccess={handleConfirmDeleteHistorySheet}
        onClose={() => {
          setIsDeleteHistoryModalOpen(false);
          setSheetToDeleteHistory(null);
        }}
      />
    </div>
  );
};
