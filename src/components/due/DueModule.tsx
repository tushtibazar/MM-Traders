import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Search,
  Filter,
  ArrowUpDown,
  HandCoins,
  FileDown,
  BookOpen,
  Phone,
  Store,
  Calendar,
  AlertCircle,
  Coins,
  CheckCircle2,
  Trash2,
  History,
  ShieldCheck,
  Check,
  AlertTriangle,
  RotateCcw,
  MapPin,
  Eye,
  ImageDown,
  Printer,
  Plus,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DEFAULT_ROUTES } from '../../services/storage';
import { generateDueReportPDF } from '../../services/pdfGenerator';
import { Customer, CustomerLedgerEntry } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';
import { DueSmartSearch, DueSearchResultItem } from '../common/DueSmartSearch';
import { DueCollectionConfirmModal } from '../modals/DueCollectionConfirmModal';
import { DuePrintPreviewModal } from './DuePrintPreviewModal';

interface DueModuleProps {
  onOpenQuickPayment: (customerId: string) => void;
  onOpenCustomerLedger: (customer: Customer) => void;
}

export const DueModule: React.FC<DueModuleProps> = ({
  onOpenQuickPayment,
  onOpenCustomerLedger,
}) => {
  const {
    db,
    currentUser,
    totalOutstandingDue,
    todayNewDue,
    todayCollection,
    customersWithDue,
    todayDateStr,
    todayLessAmount,
    totalOutstandingLess,
    recordCustomerDue,
    recordDueCollection,
    settleDueEntry,
    voidDueEntry,
    deleteCustomer,
  } = useApp();

  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  // Helper to generate next sequential Due Number (e.g. DUE-0001, DUE-0002)
  const getNextDueNumber = () => {
    let maxSeq = 0;
    (db.customerLedgers || []).forEach((l) => {
      if (l.referenceId && l.referenceId.startsWith('DUE-')) {
        const match = l.referenceId.match(/^DUE-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      }
    });
    return `DUE-${String(maxSeq + 1).padStart(4, '0')}`;
  };

  // Manual Due Entry Modal State ("+ বাকি এন্ট্রি" - Add Existing/Opening Due)
  const [isAddDueModalOpen, setIsAddDueModalOpen] = useState<boolean>(false);
  const [addDueCustomerName, setAddDueCustomerName] = useState<string>('');
  const [addDueSelectedCustomer, setAddDueSelectedCustomer] = useState<Customer | null>(null);
  const [addDuePhone, setAddDuePhone] = useState<string>('');
  const [addDueRoute, setAddDueRoute] = useState<string>('');
  const [addDueAmount, setAddDueAmount] = useState<string>('');
  const [addDueDate, setAddDueDate] = useState<string>(todayDateStr);
  const [addDueNote, setAddDueNote] = useState<string>('');
  const [addDueSuccessMsg, setAddDueSuccessMsg] = useState<string>('');
  const [addDueErrorMsg, setAddDueErrorMsg] = useState<string>('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState<boolean>(false);

  // Customer delete state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteCustomerPinModalOpen, setIsDeleteCustomerPinModalOpen] = useState<boolean>(false);

  // Sub-tabs: 'customers' | 'search_collect' | 'collection_history' | 'due_vouchers'
  const [activeTab, setActiveTab] = useState<
    'customers' | 'search_collect' | 'collection_history' | 'due_vouchers'
  >('customers');

  // Customer List Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSrFilter, setSelectedSrFilter] = useState<string>('all');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Configured & known routes list
  const availableRoutes = useMemo(() => {
    const baseRoutes =
      db.settings.customRoutes !== undefined && Array.isArray(db.settings.customRoutes)
        ? db.settings.customRoutes
        : DEFAULT_ROUTES;
    const srRoutes = db.salesRepresentatives
      .map((sr) => sr.territory)
      .filter((t): t is string => Boolean(t && t.trim()));
    const sheetRoutes = (db.dailySheets || [])
      .map((s) => s.routeOrVan)
      .filter((r): r is string => Boolean(r && r.trim()));
    return Array.from(new Set([...baseRoutes, ...srRoutes, ...sheetRoutes]));
  }, [db.salesRepresentatives, db.settings.customRoutes, db.dailySheets]);

  // Extract key area words from route string (e.g. 'চকবাজার', 'বেগম বাজার', etc.)
  const getRouteKeywords = (route: string): string[] => {
    if (!route) return [];
    const clean = route
      .replace(/^রুট\s*[\d০-৯\w]+[:\s\-]*/i, '')
      .replace(/^Route\s*[\d০-৯\w]+[:\s\-]*/i, '');
    return clean
      .split(/[\s,;&|/ও+]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 2 && w !== 'বাজার' && w !== 'রোড' && w !== 'রুট');
  };

  // Customer Route mapping (routes associated with each customer through sheets, ledgers, SR, or address)
  const customerRouteMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    const addRouteToCustomer = (custId: string, route: string) => {
      if (!custId || !route) return;
      const trimmed = route.trim();
      if (!trimmed) return;
      let set = map.get(custId);
      if (!set) {
        set = new Set<string>();
        map.set(custId, set);
      }
      set.add(trimmed);
    };

    // 1. From past daily sheets (both todayDueEntries and dueCollectionEntries)
    (db.dailySheets || []).forEach((sheet) => {
      const sheetRoute = sheet.routeOrVan?.trim();
      if (!sheetRoute) return;

      (sheet.todayDueEntries || []).forEach((entry) => {
        if (entry.customerId) {
          addRouteToCustomer(entry.customerId, sheetRoute);
        } else {
          const matched = db.customers.find(
            (c) =>
              (entry.shopName && c.shopName.toLowerCase() === entry.shopName.toLowerCase()) ||
              (entry.customerName && c.name.toLowerCase() === entry.customerName.toLowerCase())
          );
          if (matched) addRouteToCustomer(matched.id, sheetRoute);
        }
      });

      (sheet.dueCollectionEntries || []).forEach((entry) => {
        if (entry.customerId) {
          addRouteToCustomer(entry.customerId, sheetRoute);
        } else {
          const matched = db.customers.find(
            (c) =>
              (entry.shopName && c.shopName.toLowerCase() === entry.shopName.toLowerCase()) ||
              (entry.customerName && c.name.toLowerCase() === entry.customerName.toLowerCase())
          );
          if (matched) addRouteToCustomer(matched.id, sheetRoute);
        }
      });
    });

    // 2. From customer ledgers (e.g. description containing route name or "(রুট: ...)")
    (db.customerLedgers || []).forEach((entry) => {
      if (!entry.customerId || !entry.description) return;
      const desc = entry.description;
      availableRoutes.forEach((route) => {
        if (desc.includes(route)) {
          addRouteToCustomer(entry.customerId, route);
        }
      });
    });

    // 3. Keyword and name matching in customer's address, shopName, notes, or assigned SR territory
    const routeKeywordMap = availableRoutes.map((r) => ({
      route: r,
      lowerRoute: r.toLowerCase(),
      keywords: getRouteKeywords(r),
    }));

    db.customers.forEach((c) => {
      const addr = (c.address || '').toLowerCase();
      const shop = (c.shopName || '').toLowerCase();
      const notes = (c.notes || '').toLowerCase();

      routeKeywordMap.forEach(({ route, lowerRoute, keywords }) => {
        if (addr.includes(lowerRoute) || shop.includes(lowerRoute) || notes.includes(lowerRoute)) {
          addRouteToCustomer(c.id, route);
        } else if (keywords.length > 0) {
          const match = keywords.some(
            (kw) => addr.includes(kw) || shop.includes(kw) || notes.includes(kw)
          );
          if (match) {
            addRouteToCustomer(c.id, route);
          }
        }
      });

      // 4. From customer's assigned SR territory
      if (c.assignedSrId) {
        const sr = db.salesRepresentatives.find((s) => s.id === c.assignedSrId);
        if (sr && sr.territory) {
          const terr = sr.territory.trim();
          if (terr) {
            const matchedRoute = availableRoutes.find(
              (r) =>
                r.toLowerCase() === terr.toLowerCase() ||
                terr.toLowerCase().includes(r.toLowerCase()) ||
                r.toLowerCase().includes(terr.toLowerCase())
            );
            if (matchedRoute) {
              addRouteToCustomer(c.id, matchedRoute);
            } else {
              addRouteToCustomer(c.id, terr);
            }
          }
        }
      }
    });

    return map;
  }, [db.dailySheets, db.customerLedgers, db.customers, db.salesRepresentatives, availableRoutes]);

  // 1. Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let list = db.customers.filter((c) => c.status === 'active');

    // SR restriction
    if (!isOwner && currentUser.role === 'sr') {
      const match = db.salesRepresentatives.find((s) => s.username === currentUser.username);
      if (match) {
        list = list.filter((c) => !c.assignedSrId || c.assignedSrId === match.id);
      }
    }

    if (selectedSrFilter !== 'all') {
      list = list.filter((c) => c.assignedSrId === selectedSrFilter);
    }

    // Route filter
    if (selectedRouteFilter !== 'all') {
      if (selectedRouteFilter === 'no_route') {
        list = list.filter((c) => {
          const routes = customerRouteMap.get(c.id);
          return !routes || routes.size === 0;
        });
      } else {
        list = list.filter((c) => {
          const routes = customerRouteMap.get(c.id);
          return routes ? routes.has(selectedRouteFilter) : false;
        });
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shopName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)),
      );
    }

    // Sort by currentDue
    return list.sort((a, b) => {
      return sortOrder === 'desc' ? b.currentDue - a.currentDue : a.currentDue - b.currentDue;
    });
  }, [db.customers, isOwner, currentUser, selectedSrFilter, selectedRouteFilter, customerRouteMap, searchQuery, sortOrder]);

  const totalFilteredDue = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  }, [filteredCustomers]);

  // Total Due for the Selected Route (all customers on this route)
  const totalRouteDue = useMemo(() => {
    if (selectedRouteFilter === 'all') return 0;
    const targetCustomers = db.customers.filter((c) => {
      if (c.status !== 'active') return false;
      const routes = customerRouteMap.get(c.id);
      if (selectedRouteFilter === 'no_route') {
        return !routes || routes.size === 0;
      }
      return routes ? routes.has(selectedRouteFilter) : false;
    });
    return targetCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  }, [db.customers, customerRouteMap, selectedRouteFilter]);

  const totalRouteCustomersWithDueCount = useMemo(() => {
    if (selectedRouteFilter === 'all') return 0;
    return db.customers.filter((c) => {
      if (c.status !== 'active' || (c.currentDue || 0) <= 0) return false;
      const routes = customerRouteMap.get(c.id);
      if (selectedRouteFilter === 'no_route') {
        return !routes || routes.size === 0;
      }
      return routes ? routes.has(selectedRouteFilter) : false;
    }).length;
  }, [db.customers, customerRouteMap, selectedRouteFilter]);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printAction, setPrintAction] = useState<'png' | 'pdf' | null>(null);

  const handleOpenPrintPreview = (action?: 'png' | 'pdf' | null) => {
    setPrintAction(action || null);
    setIsPrintModalOpen(true);
  };

  const handleDownloadPDF = () => {
    handleOpenPrintPreview('pdf');
  };

  const handleDownloadPNG = () => {
    handleOpenPrintPreview('png');
  };

  // -------------------------------------------------------------
  // MANUAL DUE ENTRY ("+ বাকি এন্ট্রি") LOGIC & HANDLERS
  // -------------------------------------------------------------
  const addDueCustomerSuggestions = useMemo(() => {
    const q = addDueCustomerName.trim().toLowerCase();
    if (!q || addDueSelectedCustomer) return [];
    return db.customers
      .filter((c) => {
        return (
          c.name.toLowerCase().includes(q) ||
          c.shopName.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
        );
      })
      .slice(0, 6);
  }, [db.customers, addDueCustomerName, addDueSelectedCustomer]);

  const handleSelectCustomerSuggestion = (cust: Customer) => {
    setAddDueSelectedCustomer(cust);
    setAddDueCustomerName(cust.shopName || cust.name);
    setShowCustomerSuggestions(false);
    setAddDueErrorMsg('');
    // Auto-detect route if customer has one
    const custRoutes = customerRouteMap.get(cust.id);
    if (custRoutes && custRoutes.size > 0) {
      const firstRoute = Array.from(custRoutes)[0];
      setAddDueRoute(firstRoute);
    }
  };

  const handleClearSelectedCustomer = () => {
    setAddDueSelectedCustomer(null);
    setAddDueCustomerName('');
    setAddDuePhone('');
    setAddDueRoute('');
    setAddDueErrorMsg('');
  };

  const handleSaveAddDue = (e: React.FormEvent) => {
    e.preventDefault();
    setAddDueErrorMsg('');
    setAddDueSuccessMsg('');

    const targetName = addDueSelectedCustomer
      ? addDueSelectedCustomer.name
      : addDueCustomerName.trim();
    const targetShop = addDueSelectedCustomer
      ? addDueSelectedCustomer.shopName
      : addDueCustomerName.trim();

    if (!targetName && !targetShop) {
      setAddDueErrorMsg('অনুগ্রহ করে কাস্টমার বা দোকানের নাম লিখুন');
      return;
    }

    const amt = parseFloat(addDueAmount);
    if (isNaN(amt) || amt <= 0) {
      setAddDueErrorMsg('অনুগ্রহ করে সঠিক বাকির পরিমাণ (টাকা) দিন');
      return;
    }

    if (!addDueDate) {
      setAddDueErrorMsg('অনুগ্রহ করে তারিখ নির্বাচন করুন');
      return;
    }

    const dueNo = getNextDueNumber();
    const noteText = addDueNote.trim() || 'পূর্বের বকেয়া বাকি এন্ট্রি';

    try {
      const res = recordCustomerDue({
        dueNo,
        customerId: addDueSelectedCustomer ? addDueSelectedCustomer.id : undefined,
        customerName: targetName,
        shopName: targetShop,
        phone: addDueSelectedCustomer ? addDueSelectedCustomer.phone : addDuePhone.trim(),
        amount: amt,
        date: addDueDate,
        routeOrVan: addDueRoute.trim() || undefined,
        note: noteText,
      });

      setAddDueSuccessMsg(
        `✅ বাকি এন্ট্রি সফল হয়েছে! ভাউচার #${dueNo} | কাস্টমার: ${res.customer.shopName || res.customer.name} | পরিমাণ: ${currency} ${amt.toLocaleString()}`
      );

      // Reset form
      setAddDueCustomerName('');
      setAddDueSelectedCustomer(null);
      setAddDuePhone('');
      setAddDueAmount('');
      setAddDueRoute('');
      setAddDueDate(todayDateStr);
      setAddDueNote('');

      setTimeout(() => {
        setIsAddDueModalOpen(false);
        setAddDueSuccessMsg('');
      }, 2200);
    } catch (err: any) {
      setAddDueErrorMsg(`সংরক্ষণ করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: SEARCH & DIRECT DUE COLLECTION STATE
  // -------------------------------------------------------------
  const [collectSearchQuery, setCollectSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [collectDate, setCollectDate] = useState<string>(todayDateStr);
  const [collectDueNo, setCollectDueNo] = useState<string>('');
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<'cash' | 'bank' | 'mobile'>('cash');
  const [collectNote, setCollectNote] = useState<string>('');
  const [collectSuccessMsg, setCollectSuccessMsg] = useState<string>('');
  const [isCollectPinModalOpen, setIsCollectPinModalOpen] = useState<boolean>(false);

  // Smart search modal state
  const [isDueConfirmModalOpen, setIsDueConfirmModalOpen] = useState<boolean>(false);
  const [modalCustomer, setModalCustomer] = useState<Customer | null>(null);
  const [modalDueNo, setModalDueNo] = useState<string | undefined>(undefined);
  const [modalDefaultAmount, setModalDefaultAmount] = useState<number | undefined>(undefined);

  const selectedCollectCustomer = useMemo(() => {
    return db.customers.find((c) => c.id === selectedCustomerId) || null;
  }, [db.customers, selectedCustomerId]);

  const eligibleCollectCustomers = useMemo(() => {
    const q = collectSearchQuery.toLowerCase().trim();
    if (!q) return db.customers.filter((c) => c.currentDue > 0).slice(0, 8);
    return db.customers.filter(
      (c) =>
        c.shopName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (db.customerLedgers || []).some(
          (l) => l.customerId === c.id && l.referenceId?.toLowerCase().includes(q)
        )
    ).slice(0, 10);
  }, [db.customers, db.customerLedgers, collectSearchQuery]);

  // Handler for smart search selection: automatically open confirmation popup
  const handleSelectSmartSearchItem = (item: DueSearchResultItem) => {
    setSelectedCustomerId(item.customer.id);
    setCollectDueNo(item.dueNo || '');
    setCollectAmount(item.totalDue.toString());

    setModalCustomer(item.customer);
    setModalDueNo(item.dueNo);
    setModalDefaultAmount(item.totalDue);
    setIsDueConfirmModalOpen(true);
  };

  const handleExecuteConfirmedDueCollection = (collectionData: {
    customerId: string;
    dueNo?: string;
    amount: number;
    date: string;
  }) => {
    const cust = db.customers.find((c) => c.id === collectionData.customerId);
    if (!cust) return;

    try {
      const payment = recordDueCollection({
        customerId: collectionData.customerId,
        amount: collectionData.amount,
        date: collectionData.date,
        dueNo: collectionData.dueNo || undefined,
        note: `সরাসরি বাকি আদায় #${collectionData.dueNo || ''} [পদ্ধতি: নগদ ক্যাশ]`,
      });

      const updatedCust = db.customers.find((c) => c.id === cust.id);
      const remainingDue = updatedCust
        ? updatedCust.currentDue
        : Math.max(0, cust.currentDue - collectionData.amount);

      setCollectSuccessMsg(
        `✅ বাকি আদায় সফল! রশিদ #${payment.receiptNo} (${cust.shopName}) — আদায়: ${currency} ${collectionData.amount.toLocaleString()} | অবশিষ্ট বকেয়া: ${currency} ${remainingDue.toLocaleString()}`
      );
      setCollectAmount('');
      setCollectNote('');
      setCollectDueNo('');
      setIsDueConfirmModalOpen(false);
      setModalCustomer(null);

      setTimeout(() => {
        setCollectSuccessMsg('');
      }, 8000);
    } catch (err: any) {
      alert(`কালেকশন সংরক্ষণ করতে ব্যর্থ হয়েছে: ${err.message || 'অজানা সমস্যা'}`);
    }
  };

  const handleInitiateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('অনুগ্রহ করে কাস্টমার নির্বাচন করুন');
      return;
    }
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('সঠিক জমার পরিমাণ (টাকা) দিন');
      return;
    }
    
    // Open the comprehensive confirmation modal
    const cust = db.customers.find((c) => c.id === selectedCustomerId);
    if (cust) {
      setModalCustomer(cust);
      setModalDueNo(collectDueNo || undefined);
      setModalDefaultAmount(amt);
      setIsDueConfirmModalOpen(true);
    } else {
      setIsCollectPinModalOpen(true);
    }
  };

  const handleConfirmCollection = () => {
    const amt = parseFloat(collectAmount);
    if (!selectedCustomerId || isNaN(amt) || amt <= 0) return;

    recordDueCollection({
      customerId: selectedCustomerId,
      amount: amt,
      date: collectDate || todayDateStr,
      dueNo: collectDueNo.trim() || undefined,
      note: collectNote.trim() ? `${collectNote.trim()} [পদ্ধতি: ${collectMethod}]` : `বাকি জমা [পদ্ধতি: ${collectMethod}]`,
    });

    setCollectSuccessMsg(
      `সফলভাবে ${currency} ${amt.toLocaleString()} টাকা বাকি জমা হিসেবে রেকর্ড করা হয়েছে (তারিখ: ${collectDate})`
    );
    setCollectAmount('');
    setCollectNote('');
    setCollectDueNo('');
    setIsCollectPinModalOpen(false);

    setTimeout(() => {
      setCollectSuccessMsg('');
    }, 6000);
  };

  // -------------------------------------------------------------
  // TAB 3: DATE-WISE COLLECTION TRACKING STATE
  // -------------------------------------------------------------
  const [historyDateFilter, setHistoryDateFilter] = useState<string>(todayDateStr);
  const [historyShowAllDates, setHistoryShowAllDates] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');

  const dateWisePayments = useMemo(() => {
    let list = [...(db.payments || [])];

    if (!historyShowAllDates && historyDateFilter) {
      list = list.filter((p) => p.date === historyDateFilter);
    }

    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.receiptNo.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.shopName.toLowerCase().includes(q) ||
          (p.note && p.note.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.payments, historyDateFilter, historyShowAllDates, historySearch]);

  const historyTotalAmount = useMemo(() => {
    return dateWisePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [dateWisePayments]);

  // -------------------------------------------------------------
  // TAB 4: DUE ENTRIES & SETTLE / VOID AUDIT TRACE STATE
  // -------------------------------------------------------------
  const [dueVoucherFilter, setDueVoucherFilter] = useState<'all' | 'active' | 'settled' | 'voided'>('all');
  const [dueVoucherSearch, setDueVoucherSearch] = useState<string>('');

  // Settle / Void Action Modal State
  const [voucherActionType, setVoucherActionType] = useState<'settle' | 'void' | null>(null);
  const [voucherTarget, setVoucherTarget] = useState<CustomerLedgerEntry | null>(null);
  const [voucherActionNote, setVoucherActionNote] = useState<string>('');
  const [isVoucherPinModalOpen, setIsVoucherPinModalOpen] = useState<boolean>(false);

  // Extract all due entries (where debit > 0)
  const dueVoucherEntries = useMemo(() => {
    const list = (db.customerLedgers || []).filter((l) => {
      // Any record representing an addition of due (due sale, opening balance, daily sheet due)
      return (
        l.debit > 0 &&
        (l.type === 'sale' ||
          l.type === 'opening' ||
          l.type === 'adjustment' ||
          l.referenceId?.startsWith('DUE-') ||
          l.referenceId?.startsWith('MEMO-') ||
          l.referenceId?.startsWith('SALE-') ||
          l.referenceId === 'OPENING')
      );
    });

    let filtered = list;

    if (dueVoucherFilter === 'active') {
      filtered = filtered.filter((l) => !l.status || l.status === 'active');
    } else if (dueVoucherFilter === 'settled') {
      filtered = filtered.filter((l) => l.status === 'settled');
    } else if (dueVoucherFilter === 'voided') {
      filtered = filtered.filter((l) => l.status === 'voided');
    }

    if (dueVoucherSearch.trim()) {
      const q = dueVoucherSearch.toLowerCase();
      filtered = filtered.filter((l) => {
        const cust = db.customers.find((c) => c.id === l.customerId);
        return (
          l.referenceId?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          cust?.shopName.toLowerCase().includes(q) ||
          cust?.name.toLowerCase().includes(q)
        );
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.customerLedgers, db.customers, dueVoucherFilter, dueVoucherSearch]);

  const openSettleModal = (item: CustomerLedgerEntry) => {
    setVoucherActionType('settle');
    setVoucherTarget(item);
    setVoucherActionNote('দোকানদারের সাথে সম্পূর্ণ সমন্বয় সম্পন্ন');
    setIsVoucherPinModalOpen(true);
  };

  const openVoidModal = (item: CustomerLedgerEntry) => {
    setVoucherActionType('void');
    setVoucherTarget(item);
    setVoucherActionNote('ভুলবশত এন্ট্রি রেকর্ড বাতিল করা হলো');
    setIsVoucherPinModalOpen(true);
  };

  const handleConfirmVoucherAction = () => {
    if (!voucherTarget || !voucherActionType) return;
    const refKey = voucherTarget.referenceId || voucherTarget.id;

    if (voucherActionType === 'settle') {
      settleDueEntry(refKey, voucherActionNote);
    } else if (voucherActionType === 'void') {
      voidDueEntry(refKey, voucherActionNote);
    }

    setIsVoucherPinModalOpen(false);
    setVoucherTarget(null);
    setVoucherActionType(null);
    setVoucherActionNote('');
  };

  return (
    <div id="due-module" className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                Due / বাকি খাতা ও বকেয়া ব্যবস্থাপনা
              </h1>
              <p className="text-xs text-slate-500">
                সকল কাস্টমারের বর্তমান বকেয়া পর্যবেক্ষণ, তারিখভিত্তিক আদায় ট্র্যাকিং ও ভাউচার নিষ্পত্তি
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              id="add-manual-due-btn"
              type="button"
              onClick={() => {
                setAddDueErrorMsg('');
                setAddDueSuccessMsg('');
                setIsAddDueModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer active:scale-[0.98]"
              title="নতুন বা পূর্বের বকেয়া বাকি এন্ট্রি যোগ করুন"
            >
              <Plus className="h-4 w-4" />
              <span>+ বাকি এন্ট্রি</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenPrintPreview(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition-colors shadow-xs cursor-pointer"
              title="প্রিন্ট প্রিভিউ দেখুন"
            >
              <Eye className="h-4 w-4 text-sky-600" />
              <span>প্রিন্ট প্রিভিউ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Summary Cards (4 Primary Metrics) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <span className="text-xs font-medium text-rose-800">মোট বকেয়া (Total Outstanding)</span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-rose-700 truncate">
            {currency} {totalOutstandingDue.toLocaleString()}
          </p>
          <span className="text-[11px] text-rose-600 font-medium">কাস্টমারদের নিকট পাওনা</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-600">বাকি থাকা কাস্টমার</span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">
            {customersWithDue.length} <span className="text-xs font-normal text-slate-400">জন</span>
          </p>
          <span className="text-[11px] text-slate-500">মোট {db.customers.length} জন কাস্টমারের মধ্যে</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-600">আজকের নতুন বাকি (New Due)</span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-600 truncate">
            {currency} {todayNewDue.toLocaleString()}
          </p>
          <span className="text-[11px] text-amber-600">আজকের বিক্রয় বকেয়া</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-600">আজকের আদায় (Today's Collection)</span>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-600 truncate">
            {currency} {todayCollection.toLocaleString()}
          </p>
          <span className="text-[11px] text-emerald-600">আজকে ক্যাশ ও ব্যাংকে প্রাপ্তি</span>
        </div>
      </div>

      {/* Less / Owner Advance Reference Banner (Fully Independent Figure) */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                স্বতন্ত্র রেফারেন্স (বাকি/বিক্রির বাইরে)
              </span>
            </div>
            <p className="text-[11px] text-amber-800/80">
              মালিকের নিজস্ব পকেট থেকে পরিশোধিত অর্থ যা পরবর্তীতে ডিলার হতে সমন্বয়যোগ্য
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white px-3 py-1.5 border border-amber-200 text-right shadow-2xs">
            <span className="text-[10px] font-medium text-amber-700 block">আজকের লেস</span>
            <span className="text-sm font-bold text-amber-900">
              {currency} {todayLessAmount.toLocaleString()}
            </span>
          </div>

          <div className="rounded-lg bg-white px-3 py-1.5 border border-rose-200 text-right shadow-2xs">
            <span className="text-[10px] font-medium text-rose-700 block">মোট বকেয়া লেস (ফেরত আসবে)</span>
            <span className="text-sm font-bold text-rose-900">
              {currency} {totalOutstandingLess.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <Wallet className="h-4 w-4" />
          <span>১. কাস্টমার বকেয়া তালিকা ({filteredCustomers.filter((c) => c.currentDue > 0).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('search_collect')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'search_collect'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <HandCoins className="h-4 w-4" />
          <span>২. বাকি সার্চ ও সরাসরি জমা (Due Collection)</span>
        </button>

        <button
          onClick={() => setActiveTab('collection_history')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'collection_history'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>৩. তারিখভিত্তিক বাকি আদায় ({dateWisePayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('due_vouchers')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'due_vouchers'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <History className="h-4 w-4" />
          <span>৪. বাকি ভাউচার ও নিষ্পত্তি ({dueVoucherEntries.length})</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: CUSTOMER DUE LIST */}
      {/* ============================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Filters and Search Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    id="due-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="কাস্টমার / দোকান / ফোন খুঁজুন..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                {/* SR Filter (Owner only) */}
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                      id="due-sr-filter"
                      value={selectedSrFilter}
                      onChange={(e) => setSelectedSrFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                    >
                      <option value="all">সকল এসআর (All SR)</option>
                      {db.salesRepresentatives.map((sr) => (
                        <option key={sr.id} value={sr.id}>
                          {sr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Route Filter */}
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <select
                    id="due-route-filter"
                    value={selectedRouteFilter}
                    onChange={(e) => setSelectedRouteFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:border-rose-500 focus:bg-white focus:outline-hidden"
                  >
                    <option value="all">সকল রুট (All Routes)</option>
                    {availableRoutes.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                    <option value="no_route">রুট উল্লেখ নেই (No Route Specified)</option>
                  </select>
                </div>
              </div>

              {/* Add Due Button & Sort Order Toggle */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAddDueErrorMsg('');
                    setAddDueSuccessMsg('');
                    setIsAddDueModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-2xs cursor-pointer"
                  title="পূর্বের বা নতুন বাকি এন্ট্রি"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ বাকি এন্ট্রি</span>
                </button>

                <span className="text-xs text-slate-500 hidden sm:inline">সাজান:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                  <span>{sortOrder === 'desc' ? 'সর্বোচ্চ বাকি আগে' : 'সর্বনিম্ন বাকি আগে'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selected Route Summary Banner ("এই রুটের মোট বাকি") */}
          {selectedRouteFilter !== 'all' && (
            <div
              id="route-due-summary-banner"
              className="rounded-xl border border-rose-200 bg-linear-to-r from-rose-50 via-white to-rose-50/70 p-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs shrink-0">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-rose-950 font-bengali">
                        {selectedRouteFilter === 'no_route'
                          ? 'রুটবিহীন কাস্টমারদের মোট বাকি'
                          : 'এই রুটের মোট বাকি'}
                      </span>
                      <span className="rounded-full bg-rose-100 text-rose-800 text-[10px] font-semibold px-2.5 py-0.5 border border-rose-200">
                        Total Due for this Route
                      </span>
                    </div>
                    <p className="text-xs text-rose-700/90 mt-1 flex flex-wrap items-center gap-2 font-medium">
                      <span>রুট:</span>
                      <strong className="text-rose-900 font-bold bg-white px-2 py-0.5 rounded border border-rose-200/80">
                        {selectedRouteFilter === 'no_route'
                          ? 'রুট উল্লেখ নেই (No Route Specified)'
                          : selectedRouteFilter}
                      </strong>
                      <span className="text-rose-400">•</span>
                      <span>
                        বকেয়া কাস্টমার:{' '}
                        <strong className="text-rose-900 font-bold">
                          {totalRouteCustomersWithDueCount} জন
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white px-4 py-2 border border-rose-200 text-right shadow-2xs self-start sm:self-auto shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                    {selectedRouteFilter === 'no_route' ? 'রুটবিহীন মোট বকেয়া' : 'এই রুটের মোট বাকি'}
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-rose-700">
                    {currency} {totalRouteDue.toLocaleString()}
                  </p>
                  {(selectedSrFilter !== 'all' || searchQuery.trim()) && (
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      ফিল্টার ভিউ: {currency} {totalFilteredDue.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Customer Due Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">কাস্টমার / দোকান</th>
                    <th className="py-3 px-3">যোগাযোগ ও ঠিকানা</th>
                    <th className="py-3 px-3">এসআর</th>
                    <th className="py-3 px-3 text-right">পূর্বের বকেয়া</th>
                    <th className="py-3 px-3 text-right">বর্তমান বকেয়া</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => {
                    const hasDue = cust.currentDue > 0;
                    const isHighDue = cust.currentDue > 10000;
                    const custRoutes = Array.from(customerRouteMap.get(cust.id) || []);

                    return (
                      <tr
                        key={cust.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          hasDue ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Customer / Shop */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cust.shopName}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cust.name}</p>
                        </td>

                        {/* Contact & Address */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                          {cust.address && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5">
                              {cust.address}
                            </p>
                          )}
                          {custRoutes.length > 0 ? (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                              <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[170px]" title={custRoutes.join(', ')}>
                                {custRoutes[0]}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                              <MapPin className="h-3 w-3 text-slate-300 shrink-0" />
                              <span>রুট উল্লেখ নেই</span>
                            </div>
                          )}
                        </td>

                        {/* SR */}
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {cust.assignedSrName || '-'}
                        </td>

                        {/* Opening Balance */}
                        <td className="py-3 px-3 text-right text-slate-500">
                          {currency} {cust.openingBalance.toLocaleString()}
                        </td>

                        {/* Current Due */}
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`font-bold text-sm ${
                              hasDue ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {currency} {cust.currentDue.toLocaleString()}
                          </span>
                          {isHighDue && (
                            <span className="block text-[10px] font-semibold text-rose-500">
                              উচ্চ বকেয়া
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onOpenCustomerLedger(cust)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              title="খতিয়ান দেখুন"
                            >
                              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                              <span>খতিয়ান</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedCustomerId(cust.id);
                                setCollectAmount(cust.currentDue > 0 ? cust.currentDue.toString() : '');
                                setActiveTab('search_collect');
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                              title="বাকি আদায় এন্ট্রি করুন"
                            >
                              <HandCoins className="h-3.5 w-3.5" />
                              <span>টাকা আদায়</span>
                            </button>

                            {isOwner && (
                              <button
                                onClick={() => {
                                  setCustomerToDelete(cust);
                                  setIsDeleteCustomerPinModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition"
                                title="কাস্টমার ডিলিট করুন (মালিকের পিন আবশ্যক)"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                <span className="hidden sm:inline">ডিলিট</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-1">
                            <Wallet className="h-5 w-5" />
                          </div>
                          <p className="font-bold text-slate-700 text-sm">কোন কাস্টমারের বকেয়া তথ্য পাওয়া যায়নি</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            সিস্টেম ব্যবহারের পূর্বের বকেয়া বাকি বা নতুন বাকি এন্ট্রি যোগ করতে নিচের বাটনে ক্লিক করুন।
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setAddDueErrorMsg('');
                              setAddDueSuccessMsg('');
                              setIsAddDueModalOpen(true);
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>+ বাকি এন্ট্রি যোগ করুন</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: SEARCH & DIRECT DUE COLLECTION (WITH PIN) */}
      {/* ============================================================= */}
      {activeTab === 'search_collect' && (
        <div className="space-y-5">
          {collectSuccessMsg && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{collectSuccessMsg}</span>
            </div>
          )}

          {/* Unified Smart Search Section */}
          <div className="rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50/70 via-white to-emerald-50/40 p-5 shadow-xs">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    স্মার্ট সার্চ বাকি আদায় (Unified Due Search)
                  </h3>
                  <p className="text-xs text-slate-600">
                    দোকানের নাম, কাস্টমারের নাম, ফোন নম্বর অথবা বাকি নম্বর লিখে সরাসরি সার্চ করুন
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <DueSmartSearch
                  placeholder="দোকান / কাস্টমার নাম, ফোন নম্বর বা বাকি নং লিখুন..."
                  onSelectRecord={handleSelectSmartSearchItem}
                />
              </div>

              <p className="text-[11px] text-emerald-800 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>সার্চ করে ক্লিক করলে সরাসরি পিন ভেরিফিকেশন ও পরিমাণ সম্পাদনার পপআপ ওপেন হবে।</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Quick Select from Top Due Customers */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:col-span-1 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-slate-500" />
                  <span>বকেয়া কাস্টমার তালিকা</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {eligibleCollectCustomers.length} জন
                </span>
              </h3>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pt-1">
                {eligibleCollectCustomers.map((c) => {
                  const isSelected = c.id === selectedCustomerId;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCollectAmount(c.currentDue.toString());
                        // Also prepare for modal
                        setModalCustomer(c);
                        setModalDueNo(undefined);
                        setModalDefaultAmount(c.currentDue);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div>
                        <p className="font-bold flex items-center gap-1">
                          <Store className="h-3.5 w-3.5 text-slate-400" />
                          <span>{c.shopName}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.name} {c.phone && `(${c.phone})`}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-rose-700 font-bold block">
                          {currency} {c.currentDue.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">বর্তমান বকেয়া</span>
                      </div>
                    </button>
                  );
                })}

                {eligibleCollectCustomers.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-xs">
                    কোন বকেয়া কাস্টমার পাওয়া যায়নি
                  </p>
                )}
              </div>
            </div>

            {/* Right: Selected Customer Details & Quick Confirm */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:col-span-2 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <HandCoins className="h-4 w-4 text-emerald-600" />
                <span>নির্বাচিত কাস্টমারের বাকি আদায় ফর্ম</span>
              </h3>

              {selectedCollectCustomer ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="text-blue-900 font-bold text-sm">
                      {selectedCollectCustomer.shopName} ({selectedCollectCustomer.name})
                    </p>
                    <p className="text-[11px] text-blue-700">
                      ফোন: {selectedCollectCustomer.phone || 'তথ্য নেই'} | ঠিকানা: {selectedCollectCustomer.address || 'তথ্য নেই'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-blue-700 font-medium block">বর্তমান মোট বকেয়া</span>
                    <span className="text-base font-black text-rose-700">
                      {currency} {selectedCollectCustomer.currentDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4 text-center text-xs text-amber-800">
                  বাম পাশের তালিকা থেকে কাস্টমার বাছুন অথবা উপরের সার্চবারে নাম/ফোন/বাকি নং খুঁজুন
                </div>
              )}

              <form onSubmit={handleInitiateCollection} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Explicit Collection Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      <span>আদায়ের তারিখ (Collection Date) *</span>
                    </label>
                    <input
                      type="date"
                      value={collectDate}
                      onChange={(e) => setCollectDate(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      এই আদায়ের পরিমাণ (টাকা) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                        {currency}
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(e.target.value)}
                        required
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মন্তব্য / নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={collectNote}
                    onChange={(e) => setCollectNote(e.target.value)}
                    placeholder="আদায় সংক্রান্ত কোনো মন্তব্য থাকলে লিখুন..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={!selectedCustomerId || !collectAmount || parseFloat(collectAmount) <= 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>পপআপ ওপেন করে পিন দিয়ে আদায় নিশ্চিত করুন</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Today's Collection Records Table with "আদায়কৃত" Status */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                আজকের সংগৃহীত বাকি আদায় (Today's Collections)
              </span>
              <span className="font-bold font-mono text-xs text-emerald-700">
                মোট আদায়: {currency} {todayCollection.toLocaleString()}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">রশিদ নং</th>
                    <th className="py-2.5 px-3">দোকান / কাস্টমার</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3 text-right">আদায়ের পরিমাণ</th>
                    <th className="py-2.5 px-3 text-center">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(db.payments || [])
                    .filter((p) => p.date === todayDateStr)
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">{p.receiptNo}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{p.customerName}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">{p.date}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {currency} {p.amount.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            আদায়কৃত
                          </span>
                        </td>
                      </tr>
                    ))}

                  {!(db.payments || []).some((p) => p.date === todayDateStr) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        আজকের তারিখে এখনো কোনো বাকি আদায় এন্ট্রি নেই
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: DATE-WISE COLLECTION TRACKING */}
      {/* ============================================================= */}
      {activeTab === 'collection_history' && (
        <div className="space-y-4">
          {/* Date Picker & Search Filter */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Picker */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-700">আদায়ের তারিখ:</span>
                  <input
                    type="date"
                    value={historyDateFilter}
                    disabled={historyShowAllDates}
                    onChange={(e) => {
                      setHistoryDateFilter(e.target.value);
                      setHistoryShowAllDates(false);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                {/* Quick Date Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryDateFilter(todayDateStr);
                      setHistoryShowAllDates(false);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border ${
                      !historyShowAllDates && historyDateFilter === todayDateStr
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    আজকের আদায়
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryShowAllDates(!historyShowAllDates)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border ${
                      historyShowAllDates
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    সকল তারিখের আদায়
                  </button>
                </div>
              </div>

              {/* Search in History */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="রসিদ নং / দোকান / কাস্টমার..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Date-wise Total Banner */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600">
              <span>
                ফিল্টার:{' '}
                <strong className="text-slate-900">
                  {historyShowAllDates ? 'সকল তারিখ' : `তারিখ: ${historyDateFilter}`}
                </strong>{' '}
                (মোট <strong className="text-slate-900">{dateWisePayments.length}</strong> টি আদায় রেকর্ড)
              </span>

              <span className="font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                মোট আদায়: {currency} {historyTotalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Collection Records Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">আদায়ের তারিখ</th>
                    <th className="py-3 px-3">রসিদ নং / ভাউচার</th>
                    <th className="py-3 px-3">কাস্টমার ও দোকান</th>
                    <th className="py-3 px-3">মাধ্যম ও গ্রহণকারী</th>
                    <th className="py-3 px-3">নোট / বিবরণ</th>
                    <th className="py-3 px-4 text-right">আদায়ের পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dateWisePayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {p.date}
                      </td>

                      {/* Receipt No */}
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {p.receiptNo}
                      </td>

                      {/* Customer / Shop */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{p.shopName}</span>
                        <span className="text-[11px] text-slate-500">{p.customerName}</span>
                      </td>

                      {/* Method & Received By */}
                      <td className="py-3 px-3 text-slate-600">
                        <span className="capitalize font-semibold">{p.paymentMethod}</span>
                        <span className="text-[11px] text-slate-400 block">
                          আদায়কারী: {p.receivedBy || '-'}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate">
                        {p.note || '-'}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-sm text-emerald-700 font-mono">
                          {currency} {p.amount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {dateWisePayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        নির্বাচিত তারিখে কোনো আদায়ের তথ্য পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: DUE ENTRIES & SETTLE / VOID AUDIT TRACE */}
      {/* ============================================================= */}
      {activeTab === 'due_vouchers' && (
        <div className="space-y-4">
          {/* Filter and Search */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700">অবস্থা ফিল্টার:</span>
                {(['all', 'active', 'settled', 'voided'] as const).map((filterVal) => {
                  const labels = {
                    all: 'সকল ভাউচার',
                    active: 'সক্রিয় বকেয়া',
                    settled: 'নিষ্পত্তি সম্পন্ন',
                    voided: 'বাতিলকৃত',
                  };
                  return (
                    <button
                      key={filterVal}
                      type="button"
                      onClick={() => setDueVoucherFilter(filterVal)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                        dueVoucherFilter === filterVal
                          ? 'border-purple-500 bg-purple-50 text-purple-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {labels[filterVal]}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={dueVoucherSearch}
                  onChange={(e) => setDueVoucherSearch(e.target.value)}
                  placeholder="ভাউচার নং / দোকান / কাস্টমার..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              * কোনো বাকি নিষ্পত্তি (Settled) বা বাতিল (Void) করলে ইতিহাস মুছে ফেলা হয় না; তারিখ ও নোটসহ অডিট রেকর্ড সংরক্ষিত থাকে।
            </p>
          </div>

          {/* Due Entries Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-3">ভাউচার নং / রেফারেন্স</th>
                    <th className="py-3 px-3">কাস্টমার ও দোকান</th>
                    <th className="py-3 px-3 text-right">বাকির পরিমাণ</th>
                    <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-3">অডিট বিবরণ ও নোট</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dueVoucherEntries.map((entry) => {
                    const cust = db.customers.find((c) => c.id === entry.customerId);
                    const isSettled = entry.status === 'settled';
                    const isVoided = entry.status === 'voided';
                    const isActive = !isSettled && !isVoided;

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        {/* Date */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                          {entry.date}
                        </td>

                        {/* Voucher / Ref */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {entry.referenceId || entry.id}
                        </td>

                        {/* Customer / Shop */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">
                            {cust?.shopName || 'অজানা দোকান'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {cust?.name || 'কাস্টমার'}
                          </span>
                        </td>

                        {/* Due Amount */}
                        <td className="py-3 px-3 text-right font-bold font-mono text-rose-700">
                          {currency} {entry.debit.toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          {isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              বকেয়া বিদ্যমান
                            </span>
                          )}
                          {isSettled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              নিষ্পত্তি সম্পন্ন
                            </span>
                          )}
                          {isVoided && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              বাতিলকৃত
                            </span>
                          )}
                        </td>

                        {/* Audit Note */}
                        <td className="py-3 px-3 text-slate-600 max-w-[200px]">
                          {isSettled && (
                            <div className="text-[11px]">
                              <span className="font-semibold text-emerald-700 block">
                                তারিখ: {entry.settledDate || entry.date}
                              </span>
                              <span className="text-slate-500">{entry.settledNote || 'নিষ্পত্তি করা হয়েছে'}</span>
                            </div>
                          )}
                          {isVoided && (
                            <div className="text-[11px]">
                              <span className="font-semibold text-rose-700 block">
                                বাতিলের তারিখ: {entry.settledDate || entry.date}
                              </span>
                              <span className="text-slate-500">{entry.settledNote || 'এন্ট্রি বাতিল'}</span>
                            </div>
                          )}
                          {isActive && (
                            <span className="text-[11px] text-slate-400">
                              {entry.description || '-'}
                            </span>
                          )}
                        </td>

                        {/* Actions (Only active entries can be settled or voided by owner) */}
                        <td className="py-3 px-4 text-right">
                          {isActive && isOwner && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openSettleModal(entry)}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-1 text-xs font-semibold transition"
                                title="সম্পূর্ণ নিষ্পত্তি করুন (পিন আবশ্যক)"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>নিষ্পত্তি</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openVoidModal(entry)}
                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 px-2 py-1 text-xs font-semibold transition"
                                title="ভুল এন্ট্রি বাতিল/মুছুন (পিন আবশ্যক)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>বাতিল</span>
                              </button>
                            </div>
                          )}

                          {(!isActive || !isOwner) && (
                            <span className="text-[11px] text-slate-400">
                              {isSettled ? 'নিষ্পন্ন' : isVoided ? 'বাতিল' : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {dueVoucherEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        কোনো বাকি ভাউচার পাওয়া যায়নি
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* PIN CONFIRMATION MODALS */}
      {/* ============================================================= */}
      {/* 1. Due Collection Pin Modal */}
      {isCollectPinModalOpen && selectedCollectCustomer && (
        <PinPromptModal
          isOpen={isCollectPinModalOpen}
          title="বাকি জমা অনুমোদন"
          subtitle={`কাস্টমার '${selectedCollectCustomer.shopName}'-এর নিকট হতে ${currency} ${parseFloat(collectAmount || '0').toLocaleString()} টাকা বাকি জমা হিসেবে রেকর্ড করতে নিরাপত্তা পিন দিন (তারিখ: ${collectDate}):`}
          itemName={`${selectedCollectCustomer.shopName} (জমা: ${currency} ${collectAmount})`}
          confirmButtonText="বাকি জমা নিশ্চিত করুন"
          confirmButtonVariant="primary"
          correctPin={db.settings.securityPin || currentUser.pin || '1234'}
          onSuccess={handleConfirmCollection}
          onClose={() => setIsCollectPinModalOpen(false)}
        />
      )}

      {/* 2. Settle / Void Due Entry Pin Modal */}
      {isVoucherPinModalOpen && voucherTarget && (
        <PinPromptModal
          isOpen={isVoucherPinModalOpen}
          title={
            voucherActionType === 'settle'
              ? 'বাকি ভাউচার নিষ্পত্তি অনুমোদন'
              : 'বাকি ভাউচার বাতিল/মুছে ফেলার অনুমোদন'
          }
          subtitle={
            voucherActionType === 'settle'
              ? `ভাউচার #${voucherTarget.referenceId || voucherTarget.id} (${currency} ${voucherTarget.debit.toLocaleString()} টাকা) নিষ্পত্তি হিসেবে মার্ক করতে নিরাপত্তা পিন দিন। কাস্টমারের বকেয়া থেকে এই পরিমাণ কর্তন হবে এবং ইতিহাসে রেকর্ড অক্ষুণ্ণ থাকবে:`
              : `ভাউচার #${voucherTarget.referenceId || voucherTarget.id} (${currency} ${voucherTarget.debit.toLocaleString()} টাকা) ভুলবশত এন্ট্রি হিসেবে বাতিল করতে নিরাপত্তা পিন দিন। কাস্টমারের বকেয়া থেকে এই পরিমাণ কর্তন হবে এবং অডিট ট্রেইল সংরক্ষিত থাকবে:`
          }
          itemName={`ভাউচার #${voucherTarget.referenceId || voucherTarget.id} (টাকা: ${currency} ${voucherTarget.debit.toLocaleString()})`}
          confirmButtonText={voucherActionType === 'settle' ? 'নিষ্পত্তি নিশ্চিত করুন' : 'বাতিল নিশ্চিত করুন'}
          confirmButtonVariant={voucherActionType === 'settle' ? 'primary' : 'danger'}
          correctPin={db.settings.securityPin || currentUser.pin || '1234'}
          onSuccess={handleConfirmVoucherAction}
          onClose={() => {
            setIsVoucherPinModalOpen(false);
            setVoucherTarget(null);
            setVoucherActionType(null);
          }}
        />
      )}

      {/* 3. Delete Customer Pin Modal */}
      {isDeleteCustomerPinModalOpen && customerToDelete && (
        <PinPromptModal
          isOpen={isDeleteCustomerPinModalOpen}
          title="কাস্টমার মুছে ফেলা অনুমোদন"
          subtitle={
            customerToDelete.currentDue > 0
              ? `⚠️ সতর্কতা: ${customerToDelete.shopName}-এর ${currency} ${customerToDelete.currentDue.toLocaleString()} টাকা বকেয়া বাকি আছে! মুছে ফেললে কাস্টমার ডিরেক্টরি থেকে সরানো হবে। নিশ্চিত করতে নিরাপত্তা পিন দিন:`
              : (db.customerLedgers || []).some((l) => l.customerId === customerToDelete.id)
              ? `ℹ️ এই কাস্টমারের পূর্বের লেনদেনের হিসাব রয়েছে। মুছে ফেলতে মালিকের নিরাপত্তা পিন দিন:`
              : `কাস্টমার '${customerToDelete.shopName}' নিশ্চিতভাবে মুছে ফেলতে মালিকের নিরাপত্তা পিন দিন:`
          }
          itemName={`${customerToDelete.shopName} (${customerToDelete.name})`}
          confirmButtonText="কাস্টমার ডিলিট করুন"
          confirmButtonVariant="danger"
          correctPin={db.settings.securityPin || currentUser.pin || '1234'}
          onSuccess={() => {
            deleteCustomer(customerToDelete.id);
            setIsDeleteCustomerPinModalOpen(false);
            setCustomerToDelete(null);
          }}
          onClose={() => {
            setIsDeleteCustomerPinModalOpen(false);
            setCustomerToDelete(null);
          }}
        />
      )}

      {/* 4. Due Collection Confirmation & PIN Modal (New Unified Flow) */}
      <DueCollectionConfirmModal
        isOpen={isDueConfirmModalOpen}
        customer={modalCustomer}
        dueNo={modalDueNo}
        defaultAmount={modalDefaultAmount}
        defaultDate={collectDate || todayDateStr}
        correctPin={db.settings.securityPin || currentUser.pin || '1234'}
        onConfirm={handleExecuteConfirmedDueCollection}
        onClose={() => {
          setIsDueConfirmModalOpen(false);
          setModalCustomer(null);
          setModalDueNo(undefined);
          setModalDefaultAmount(undefined);
        }}
      />

      {/* 5. Due Print & Export Preview Modal */}
      <DuePrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={db.settings}
        currency={currency}
        customers={filteredCustomers}
        totalDue={totalFilteredDue}
        srFilter={selectedSrFilter}
        routeFilter={selectedRouteFilter}
        customerRouteMap={customerRouteMap}
        todayDateStr={todayDateStr}
        initialAction={printAction}
      />

      {/* 6. Manual Due Entry Modal ("+ বাকি এন্ট্রি" - Add Existing/Opening Due) */}
      {isAddDueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-bengali">
                    + বাকি এন্ট্রি (পূর্বের বা নতুন বকেয়া বাকি)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bengali">
                    সিস্টেম ব্যবহারের পূর্বের বকেয়া বাকি অথবা কাস্টমারের বকেয়া সরাসরি যোগ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddDueModalOpen(false);
                  setAddDueErrorMsg('');
                  setAddDueSuccessMsg('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success message */}
            {addDueSuccessMsg && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold font-bengali">{addDueSuccessMsg}</span>
              </div>
            )}

            {/* Error message */}
            {addDueErrorMsg && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-semibold font-bengali">{addDueErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddDue} className="space-y-4">
              {/* Field 1: Customer / Shop Name with Autocomplete */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 font-bengali">
                    কাস্টমার / দোকানের নাম *
                  </label>
                  {addDueSelectedCustomer && (
                    <button
                      type="button"
                      onClick={handleClearSelectedCustomer}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                    >
                      কাস্টমার পরিবর্তন করুন
                    </button>
                  )}
                </div>

                {addDueSelectedCustomer ? (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Store className="h-4 w-4 text-emerald-700 shrink-0" />
                        <span className="font-bold text-emerald-950 text-xs font-bengali">
                          {addDueSelectedCustomer.shopName}
                        </span>
                        {addDueSelectedCustomer.name !== addDueSelectedCustomer.shopName && (
                          <span className="text-[11px] text-emerald-800">
                            ({addDueSelectedCustomer.name})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-800">
                        {addDueSelectedCustomer.phone && (
                          <span>ফোন: {addDueSelectedCustomer.phone}</span>
                        )}
                        <span>
                          বর্তমান বকেয়া: {currency} {addDueSelectedCustomer.currentDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      <Check className="h-3 w-3" />
                      তালিকাভুক্ত
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={addDueCustomerName}
                        onChange={(e) => {
                          setAddDueCustomerName(e.target.value);
                          setShowCustomerSuggestions(true);
                          setAddDueErrorMsg('');
                        }}
                        onFocus={() => setShowCustomerSuggestions(true)}
                        placeholder="কাস্টমার বা দোকানের নাম লিখুন বা খুঁজুন..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                      />
                      {addDueCustomerName && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddDueCustomerName('');
                            setShowCustomerSuggestions(false);
                          }}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Suggestions Dropdown */}
                    {showCustomerSuggestions && addDueCustomerSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-xs">
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          বিদ্যমান কাস্টমার তালিকা থেকে নির্বাচন করুন:
                        </div>
                        {addDueCustomerSuggestions.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => handleSelectCustomerSuggestion(cust)}
                            className="w-full text-left px-3 py-2 hover:bg-rose-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {cust.shopName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {cust.name} {cust.phone ? `• ${cust.phone}` : ''}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-400 block">বর্তমান বকেয়া</span>
                              <span className="font-bold text-rose-600 text-xs">
                                {currency} {cust.currentDue.toLocaleString()}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {addDueCustomerName.trim() && !addDueSelectedCustomer && (
                      <p className="mt-1 text-[11px] text-emerald-600 font-bengali flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>নতুন নাম দেওয়া হয়েছে — সেভ করার সাথে সাথে নতুন কাস্টমার হিসেবে তৈরি হবে।</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Field 2: Phone Number (shown/used only when creating a new customer) */}
              {!addDueSelectedCustomer && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
                    ফোন নম্বর (নতুন কাস্টমারের ক্ষেত্রে)
                  </label>
                  <input
                    type="tel"
                    value={addDuePhone}
                    onChange={(e) => setAddDuePhone(e.target.value)}
                    placeholder="যেমন: 017xxxxxxxx"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                  />
                  <p className="mt-0.5 text-[10.5px] text-slate-400">
                    বিদ্যমান কাস্টমারের ক্ষেত্রে ফোন নম্বর স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে।
                  </p>
                </div>
              )}

              {/* Field 3: Route (dropdown of configured routes) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
                  রুট (Route)
                </label>
                <div className="relative">
                  <select
                    value={addDueRoute}
                    onChange={(e) => setAddDueRoute(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                  >
                    <option value="">-- কোনো নির্দিষ্ট রুট নেই / সাধারণ --</option>
                    {availableRoutes.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-0.5 text-[10.5px] text-slate-400">
                  রুট নির্বাচন করলে রুটভিত্তিক ফিল্টারে এই কাস্টমারের বাকি সঠিকভাবে প্রতিফলিত হবে।
                </p>
              </div>

              {/* Field 4 & 5: Amount and Date (in 2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
                    বাকির পরিমাণ (টাকা) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={addDueAmount}
                    onChange={(e) => setAddDueAmount(e.target.value)}
                    placeholder="যেমন: 5000"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-none font-mono"
                  />
                  {addDueAmount && !isNaN(parseFloat(addDueAmount)) && (
                    <p className="mt-0.5 text-[11px] font-semibold text-rose-600">
                      {currency} {parseFloat(addDueAmount).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
                    তারিখ (Date) *
                  </label>
                  <input
                    type="date"
                    required
                    value={addDueDate}
                    onChange={(e) => setAddDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                  />
                  <p className="mt-0.5 text-[10.5px] text-slate-400">
                    পূর্বের কোনো তারিখের বাকি হলে তারিখটি পরিবর্তন করে দিতে পারেন।
                  </p>
                </div>
              </div>

              {/* Field 6: Note (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
                  নোট বা বিবরণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={addDueNote}
                  onChange={(e) => setAddDueNote(e.target.value)}
                  placeholder="যেমন: পূর্বের খাতার বকেয়া জের / উদ্বোধনী বাকি"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Informational banner about non-interference with daily reconciliation */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed font-bengali">
                ℹ️ <strong>নোট:</strong> এই এন্ট্রিটি সরাসরি কেন্দ্রীয় কাস্টমার বকেয়া খতিয়ানে (Due Ledger) অন্তর্ভুক্ত হবে এবং কাস্টমারের মোট বাকি বৃদ্ধি পাবে। এটি কোনো নির্দিষ্ট দিনের Daily হিসাবের ক্যাশ বা সেলস রিকনসিলিয়েশন পরিবর্তন করবে না। কোনো পিন আবশ্যক নয়।
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddDueModalOpen(false);
                    setAddDueErrorMsg('');
                    setAddDueSuccessMsg('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>বাকি সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
