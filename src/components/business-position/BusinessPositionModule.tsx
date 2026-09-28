import React, { useState, useMemo, useEffect } from 'react';
import {
  Landmark,
  Boxes,
  AlertOctagon,
  Wallet,
  Coins,
  Building2,
  Receipt,
  Truck,
  Layers,
  Smartphone,
  FileCheck2,
  Car,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Save,
  Check,
  RotateCcw,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  ImageDown,
  FileDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessPositionSettings, CustomPositionItem, OtherPositionItem } from '../../types';
import { BusinessPositionPrintPreviewModal } from './BusinessPositionPrintPreviewModal';

export const BusinessPositionModule: React.FC = () => {
  const {
    db,
    currentUser,
    totalOutstandingDue,
    cashBalance,
    totalOutstandingLess,
    updateSettings,
    todayDateStr,
  } = useApp();

  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  // Helper to load stored business position from settings or dedicated localStorage
  const getStoredBusinessPosition = (): BusinessPositionSettings | undefined => {
    if (db.settings?.businessPosition && Object.keys(db.settings.businessPosition).length > 0) {
      return db.settings.businessPosition;
    }
    try {
      const raw = localStorage.getItem('mm_traders_business_position_current');
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore parse error
    }
    return undefined;
  };

  // Existing saved adjustments or defaults
  const savedPos = getStoredBusinessPosition();

  // Snapshot history
  const [snapshotsHistory, setSnapshotsHistory] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('mm_traders_business_position_snapshots');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(
    savedPos?.lastSavedAt || null
  );

  // 1. AUTO-ITEM ADJUSTMENTS & NOTES
  const [stockAdjustment, setStockAdjustment] = useState<string>(
    savedPos?.stockAdjustment !== undefined ? String(savedPos.stockAdjustment) : ''
  );
  const [stockNote, setStockNote] = useState<string>(savedPos?.stockNote || '');

  const [damageAdjustment, setDamageAdjustment] = useState<string>(
    savedPos?.damageAdjustment !== undefined ? String(savedPos.damageAdjustment) : ''
  );
  const [damageNote, setDamageNote] = useState<string>(savedPos?.damageNote || '');

  const [dueAdjustment, setDueAdjustment] = useState<string>(
    savedPos?.dueAdjustment !== undefined ? String(savedPos.dueAdjustment) : ''
  );
  const [dueNote, setDueNote] = useState<string>(savedPos?.dueNote || '');

  const [cashAdjustment, setCashAdjustment] = useState<string>(
    savedPos?.cashAdjustment !== undefined ? String(savedPos.cashAdjustment) : ''
  );
  const [cashNote, setCashNote] = useState<string>(savedPos?.cashNote || '');

  // 2. SPECIFIC LINE ITEMS (আনডেলিভারি, ক্যাম্পেইন, অ্যাপ ক্যাশ, ডিও, গাড়িতে, ব্যাংক, কোম্পানি লেইস)
  const [undeliveredAmount, setUndeliveredAmount] = useState<string>(
    savedPos?.undeliveredAmount !== undefined ? String(savedPos.undeliveredAmount) : ''
  );
  const [undeliveredNote, setUndeliveredNote] = useState<string>(savedPos?.undeliveredNote || '');

  const [campaignAmount, setCampaignAmount] = useState<string>(
    savedPos?.campaignAmount !== undefined ? String(savedPos.campaignAmount) : ''
  );
  const [campaignNote, setCampaignNote] = useState<string>(savedPos?.campaignNote || '');

  const [appCashAmount, setAppCashAmount] = useState<string>(
    savedPos?.appCashAmount !== undefined ? String(savedPos.appCashAmount) : ''
  );
  const [appCashNote, setAppCashNote] = useState<string>(savedPos?.appCashNote || '');

  const [doAmount, setDoAmount] = useState<string>(
    savedPos?.doAmount !== undefined ? String(savedPos.doAmount) : ''
  );
  const [doNote, setDoNote] = useState<string>(savedPos?.doNote || '');

  const [vehicleStockAmount, setVehicleStockAmount] = useState<string>(
    savedPos?.vehicleStockAmount !== undefined ? String(savedPos.vehicleStockAmount) : ''
  );
  const [vehicleStockNote, setVehicleStockNote] = useState<string>(savedPos?.vehicleStockNote || '');

  const [bankBalance, setBankBalance] = useState<string>(
    savedPos?.bankBalance !== undefined ? String(savedPos.bankBalance) : ''
  );
  const [bankNote, setBankNote] = useState<string>(savedPos?.bankNote || '');

  const [lessAdjustment, setLessAdjustment] = useState<string>(
    savedPos?.lessAdjustment !== undefined ? String(savedPos.lessAdjustment) : ''
  );
  const [lessNote, setLessNote] = useState<string>(savedPos?.lessNote || '');

  // 3. "আদার্স" (OTHERS) LINE ITEMS LIST (Free-text label/description + amount)
  const [othersList, setOthersList] = useState<OtherPositionItem[]>(
    savedPos?.others && savedPos.others.length > 0
      ? savedPos.others
      : [{ id: `other-${Date.now()}`, description: '', amount: 0 }]
  );

  // 4. "মূল ইনভেস্টমেন্ট" (ORIGINAL INVESTMENT) INPUT FIELD
  const [originalInvestment, setOriginalInvestment] = useState<string>(
    savedPos?.originalInvestment !== undefined ? String(savedPos.originalInvestment) : ''
  );

  // 5. LIABILITIES & CUSTOM ITEMS
  const [supplierPayables, setSupplierPayables] = useState<string>(
    savedPos?.supplierPayables !== undefined ? String(savedPos.supplierPayables) : ''
  );
  const [supplierNote, setSupplierNote] = useState<string>(savedPos?.supplierNote || '');

  const [loansPayables, setLoansPayables] = useState<string>(
    savedPos?.loansPayables !== undefined ? String(savedPos.loansPayables) : ''
  );
  const [loansNote, setLoansNote] = useState<string>(savedPos?.loansNote || '');

  const [customItems, setCustomItems] = useState<CustomPositionItem[]>(
    savedPos?.customItems || []
  );

  // New Custom Item Form
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [newCustomTitle, setNewCustomTitle] = useState<string>('');
  const [newCustomType, setNewCustomType] = useState<'asset' | 'liability'>('asset');
  const [newCustomAmount, setNewCustomAmount] = useState<string>('');
  const [newCustomNote, setNewCustomNote] = useState<string>('');

  // UI feedback & toggle details
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [investmentSavedStatus, setInvestmentSavedStatus] = useState<boolean>(false);
  const [showAutoBreakdown, setShowAutoBreakdown] = useState<{ [key: string]: boolean }>({});

  // Sync if savedPos changes externally
  useEffect(() => {
    if (db.settings.businessPosition) {
      const p = db.settings.businessPosition;
      setStockAdjustment(p.stockAdjustment !== undefined ? String(p.stockAdjustment) : '');
      setStockNote(p.stockNote || '');
      setDamageAdjustment(p.damageAdjustment !== undefined ? String(p.damageAdjustment) : '');
      setDamageNote(p.damageNote || '');
      setDueAdjustment(p.dueAdjustment !== undefined ? String(p.dueAdjustment) : '');
      setDueNote(p.dueNote || '');
      setCashAdjustment(p.cashAdjustment !== undefined ? String(p.cashAdjustment) : '');
      setCashNote(p.cashNote || '');

      setUndeliveredAmount(p.undeliveredAmount !== undefined ? String(p.undeliveredAmount) : '');
      setUndeliveredNote(p.undeliveredNote || '');
      setCampaignAmount(p.campaignAmount !== undefined ? String(p.campaignAmount) : '');
      setCampaignNote(p.campaignNote || '');
      setAppCashAmount(p.appCashAmount !== undefined ? String(p.appCashAmount) : '');
      setAppCashNote(p.appCashNote || '');
      setDoAmount(p.doAmount !== undefined ? String(p.doAmount) : '');
      setDoNote(p.doNote || '');
      setVehicleStockAmount(p.vehicleStockAmount !== undefined ? String(p.vehicleStockAmount) : '');
      setVehicleStockNote(p.vehicleStockNote || '');

      setBankBalance(p.bankBalance !== undefined ? String(p.bankBalance) : '');
      setBankNote(p.bankNote || '');
      setLessAdjustment(p.lessAdjustment !== undefined ? String(p.lessAdjustment) : '');
      setLessNote(p.lessNote || '');

      if (p.others && p.others.length > 0) {
        setOthersList(p.others);
      } else {
        setOthersList([{ id: `other-${Date.now()}`, description: '', amount: 0 }]);
      }

      setOriginalInvestment(p.originalInvestment !== undefined ? String(p.originalInvestment) : '');

      setSupplierPayables(p.supplierPayables !== undefined ? String(p.supplierPayables) : '');
      setSupplierNote(p.supplierNote || '');
      setLoansPayables(p.loansPayables !== undefined ? String(p.loansPayables) : '');
      setLoansNote(p.loansNote || '');
      setCustomItems(p.customItems || []);
    }
  }, [db.settings.businessPosition]);

  // 1. AUTO-CALCULATED VALUES
  // 1.1 স্টক দ্রব্য (Stock Value): sum of current stock * sale price across all products
  const autoStockValuation = useMemo(() => {
    return (db.products || []).reduce((sum, p) => {
      const stock = Number(p.currentStock) || 0;
      const rate = Number(p.salePrice) || 0;
      return sum + stock * rate;
    }, 0);
  }, [db.products]);

  const totalStockUnits = useMemo(() => {
    return (db.products || []).reduce((sum, p) => sum + (Number(p.currentStock) || 0), 0);
  }, [db.products]);

  // 1.2 ড্যামেজ (Damage): sum of all ড্যামেজ entries' মোট টাকা across all daily records
  const autoDamageTotal = useMemo(() => {
    return (db.dailySheets || []).reduce((sum, sheet) => {
      let val = Number(sheet.totalDamageValue) || 0;
      if (val === 0 && Array.isArray(sheet.damageItems) && sheet.damageItems.length > 0) {
        val = sheet.damageItems.reduce(
          (dSum, it) =>
            dSum +
            (Number(it.damageValue) ||
              Number(it.finalNetAmount) ||
              (Number(it.damageQty || 0) * Number(it.sellingPrice || 0)) ||
              0),
          0
        );
      }
      return sum + val;
    }, 0);
  }, [db.dailySheets]);

  const totalDamageQty = useMemo(() => {
    return (db.dailySheets || []).reduce((sum, s) => sum + (Number(s.totalDamageQty) || 0), 0);
  }, [db.dailySheets]);

  // 1.3 বাকি (Due): total current outstanding due across all customers
  const autoDueTotal = useMemo(() => {
    return totalOutstandingDue;
  }, [totalOutstandingDue]);

  const customersWithDueCount = useMemo(() => {
    return (db.customers || []).filter((c) => c.status === 'active' && c.currentDue > 0).length;
  }, [db.customers]);

  // 1.4 ক্যাশ (Cash): tracked cash balance in system
  const autoCashTotal = useMemo(() => {
    return cashBalance;
  }, [cashBalance]);

  // Cash breakdown elements
  const cashBreakdown = useMemo(() => {
    const opening = Number(db.settings.openingCashBalance) || 0;
    const collections = (db.payments || [])
      .filter((p) => p.status === 'completed' && (p.paymentMethod === 'cash' || !p.paymentMethod))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const dailySheetsCash = (db.dailySheets || [])
      .filter((d) => d.status === 'confirmed')
      .reduce((sum, d) => sum + (Number(d.netCashSubmitted) || 0), 0);
    const expenses = (db.expenses || [])
      .filter((e) => e.status === 'completed' && e.paidFrom === 'cash')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { opening, collections, dailySheetsCash, expenses };
  }, [db.payments, db.dailySheets, db.expenses, db.settings.openingCashBalance]);

  // 1.5 লেইস / ক্লেইম (Company Less Receivables): auto from less module
  const autoLessTotal = useMemo(() => {
    return totalOutstandingLess || 0;
  }, [totalOutstandingLess]);

  // 2. EFFECTIVE LINE AMOUNTS (Auto + Manual Adjustment)
  const effectiveStock = autoStockValuation + (parseFloat(stockAdjustment) || 0);
  const effectiveDamage = autoDamageTotal + (parseFloat(damageAdjustment) || 0);
  const effectiveDue = autoDueTotal + (parseFloat(dueAdjustment) || 0);
  const effectiveCash = autoCashTotal + (parseFloat(cashAdjustment) || 0);

  // Manual specific fields
  const effectiveUndelivered = parseFloat(undeliveredAmount) || 0;
  const effectiveCampaign = parseFloat(campaignAmount) || 0;
  const effectiveAppCash = parseFloat(appCashAmount) || 0;
  const effectiveDO = parseFloat(doAmount) || 0;
  const effectiveVehicleStock = parseFloat(vehicleStockAmount) || 0;
  const effectiveBank = parseFloat(bankBalance) || 0;
  const effectiveLess = autoLessTotal + (parseFloat(lessAdjustment) || 0);

  // Others Total
  const totalOthersAmount = useMemo(() => {
    return othersList.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [othersList]);

  // Custom Asset Items total
  const customAssetsTotal = useMemo(() => {
    return customItems
      .filter((it) => it.type === 'asset')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [customItems]);

  // সর্বমোট (TOTAL POSITION) CALCULATION
  // Sums: স্টক দ্রব্য + ড্যামেজ + বাকি + ক্যাশ + আনডেলিভারি + ক্যাম্পেইন + অ্যাপ ক্যাশ + ডিও + গাড়িতে + ব্যাংক + কোম্পানি লেইস + আদার্স + any custom items
  const totalPosition = useMemo(() => {
    return (
      effectiveStock +
      effectiveDamage +
      effectiveDue +
      effectiveCash +
      effectiveUndelivered +
      effectiveCampaign +
      effectiveAppCash +
      effectiveDO +
      effectiveVehicleStock +
      effectiveBank +
      effectiveLess +
      totalOthersAmount +
      customAssetsTotal
    );
  }, [
    effectiveStock,
    effectiveDamage,
    effectiveDue,
    effectiveCash,
    effectiveUndelivered,
    effectiveCampaign,
    effectiveAppCash,
    effectiveDO,
    effectiveVehicleStock,
    effectiveBank,
    effectiveLess,
    totalOthersAmount,
    customAssetsTotal,
  ]);

  // Liabilities (দায় ও দেনা)
  const effectiveSupplierPayables = parseFloat(supplierPayables) || 0;
  const effectiveLoansPayables = parseFloat(loansPayables) || 0;
  const customLiabilitiesTotal = useMemo(() => {
    return customItems
      .filter((it) => it.type === 'liability')
      .reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [customItems]);

  const totalLiabilities =
    effectiveSupplierPayables + effectiveLoansPayables + customLiabilitiesTotal;

  // 3. COMPARISON CALCULATION:
  // "পার্থক্য (Difference)" = সর্বমোট (Total Position) − মূল ইনভেস্টমেন্ট (Original Investment)
  const numOriginalInvestment = parseFloat(originalInvestment) || 0;
  const investmentDifference = totalPosition - numOriginalInvestment;

  // OTHERS LIST HANDLERS
  const handleAddOther = () => {
    setOthersList((prev) => [
      ...prev,
      { id: `other-${Date.now()}-${Math.random()}`, description: '', amount: 0 },
    ]);
  };

  const handleUpdateOther = (
    id: string,
    field: 'description' | 'amount',
    val: string
  ) => {
    setOthersList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'amount') {
          const num = parseFloat(val);
          return { ...item, amount: isNaN(num) ? 0 : num };
        }
        return { ...item, description: val };
      })
    );
  };

  const handleRemoveOther = (id: string) => {
    setOthersList((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.length > 0
        ? filtered
        : [{ id: `other-${Date.now()}`, description: '', amount: 0 }];
    });
  };

  // SAVE ADJUSTMENTS HANDLER
  const handleSavePosition = () => {
    const timestamp = new Date().toISOString();
    const updatedPos: BusinessPositionSettings = {
      stockAdjustment: stockAdjustment ? parseFloat(stockAdjustment) : 0,
      stockNote: stockNote.trim(),
      damageAdjustment: damageAdjustment ? parseFloat(damageAdjustment) : 0,
      damageNote: damageNote.trim(),
      dueAdjustment: dueAdjustment ? parseFloat(dueAdjustment) : 0,
      dueNote: dueNote.trim(),
      cashAdjustment: cashAdjustment ? parseFloat(cashAdjustment) : 0,
      cashNote: cashNote.trim(),

      undeliveredAmount: undeliveredAmount ? parseFloat(undeliveredAmount) : 0,
      undeliveredNote: undeliveredNote.trim(),
      campaignAmount: campaignAmount ? parseFloat(campaignAmount) : 0,
      campaignNote: campaignNote.trim(),
      appCashAmount: appCashAmount ? parseFloat(appCashAmount) : 0,
      appCashNote: appCashNote.trim(),
      doAmount: doAmount ? parseFloat(doAmount) : 0,
      doNote: doNote.trim(),
      vehicleStockAmount: vehicleStockAmount ? parseFloat(vehicleStockAmount) : 0,
      vehicleStockNote: vehicleStockNote.trim(),

      bankBalance: bankBalance ? parseFloat(bankBalance) : 0,
      bankNote: bankNote.trim(),
      lessAdjustment: lessAdjustment ? parseFloat(lessAdjustment) : 0,
      lessNote: lessNote.trim(),

      others: othersList.filter((o) => o.description.trim() !== '' || o.amount !== 0),
      originalInvestment: originalInvestment ? parseFloat(originalInvestment) : 0,

      supplierPayables: supplierPayables ? parseFloat(supplierPayables) : 0,
      supplierNote: supplierNote.trim(),
      loansPayables: loansPayables ? parseFloat(loansPayables) : 0,
      loansNote: loansNote.trim(),
      customItems,
      lastSavedAt: timestamp,
    };

    // 1. Save in AppContext / Database settings
    updateSettings({
      ...db.settings,
      businessPosition: updatedPos,
    });

    // 2. Direct dedicated localStorage persistence
    try {
      localStorage.setItem('mm_traders_business_position_current', JSON.stringify(updatedPos));

      // 3. Append to snapshot history
      const historyRaw = localStorage.getItem('mm_traders_business_position_snapshots');
      const historyList = historyRaw ? JSON.parse(historyRaw) : [];
      const newSnapshot = {
        id: `snap-${Date.now()}`,
        savedAt: timestamp,
        totalPosition,
        originalInvestment: updatedPos.originalInvestment || 0,
        difference: investmentDifference,
        data: updatedPos,
      };
      const updatedHistory = [newSnapshot, ...historyList].slice(0, 30);
      localStorage.setItem('mm_traders_business_position_snapshots', JSON.stringify(updatedHistory));
      setSnapshotsHistory(updatedHistory);
    } catch (e) {
      console.error('Failed to save snapshots history:', e);
    }

    setLastSavedTimestamp(timestamp);
    setSaveMessage('সার্বিক হিসাব, মূল ইনভেস্টমেন্ট ও আদার্স এন্ট্রি সফলভাবে সেভ হয়েছে!');
    setTimeout(() => setSaveMessage(''), 4000);
  };

  // DEDICATED SAVE HANDLER FOR মূল ইনভেস্টমেন্ট ONLY
  const handleSaveOriginalInvestment = () => {
    const numVal = originalInvestment ? parseFloat(originalInvestment) : 0;
    const currentSettingsPos = db.settings?.businessPosition || {};

    const updatedPos: BusinessPositionSettings = {
      ...currentSettingsPos,
      originalInvestment: numVal,
      lastSavedAt: new Date().toISOString(),
    };

    // 1. Save in AppContext / Database settings
    updateSettings({
      ...db.settings,
      businessPosition: updatedPos,
    });

    // 2. Direct dedicated localStorage persistence
    try {
      localStorage.setItem('mm_traders_business_position_current', JSON.stringify(updatedPos));
    } catch (e) {
      console.error('Failed to save business position to localStorage:', e);
    }

    setInvestmentSavedStatus(true);
    setTimeout(() => setInvestmentSavedStatus(false), 3000);
  };

  // RESTORE SNAPSHOT HANDLER
  const handleRestoreSnapshot = (snapshot: any) => {
    if (!snapshot?.data) return;
    const p = snapshot.data as BusinessPositionSettings;

    setStockAdjustment(p.stockAdjustment !== undefined ? String(p.stockAdjustment) : '');
    setStockNote(p.stockNote || '');
    setDamageAdjustment(p.damageAdjustment !== undefined ? String(p.damageAdjustment) : '');
    setDamageNote(p.damageNote || '');
    setDueAdjustment(p.dueAdjustment !== undefined ? String(p.dueAdjustment) : '');
    setDueNote(p.dueNote || '');
    setCashAdjustment(p.cashAdjustment !== undefined ? String(p.cashAdjustment) : '');
    setCashNote(p.cashNote || '');

    setUndeliveredAmount(p.undeliveredAmount !== undefined ? String(p.undeliveredAmount) : '');
    setUndeliveredNote(p.undeliveredNote || '');
    setCampaignAmount(p.campaignAmount !== undefined ? String(p.campaignAmount) : '');
    setCampaignNote(p.campaignNote || '');
    setAppCashAmount(p.appCashAmount !== undefined ? String(p.appCashAmount) : '');
    setAppCashNote(p.appCashNote || '');
    setDoAmount(p.doAmount !== undefined ? String(p.doAmount) : '');
    setDoNote(p.doNote || '');
    setVehicleStockAmount(p.vehicleStockAmount !== undefined ? String(p.vehicleStockAmount) : '');
    setVehicleStockNote(p.vehicleStockNote || '');

    setBankBalance(p.bankBalance !== undefined ? String(p.bankBalance) : '');
    setBankNote(p.bankNote || '');
    setLessAdjustment(p.lessAdjustment !== undefined ? String(p.lessAdjustment) : '');
    setLessNote(p.lessNote || '');

    if (p.others && p.others.length > 0) {
      setOthersList(p.others);
    } else {
      setOthersList([{ id: `other-${Date.now()}`, description: '', amount: 0 }]);
    }

    setOriginalInvestment(p.originalInvestment !== undefined ? String(p.originalInvestment) : '');
    setSupplierPayables(p.supplierPayables !== undefined ? String(p.supplierPayables) : '');
    setSupplierNote(p.supplierNote || '');
    setLoansPayables(p.loansPayables !== undefined ? String(p.loansPayables) : '');
    setLoansNote(p.loansNote || '');
    setCustomItems(p.customItems || []);

    setShowHistoryModal(false);
    setSaveMessage(`স্ন্যাপশট (${new Date(snapshot.savedAt).toLocaleDateString('bn-BD')}) থেকে ডেটা লোড করা হয়েছে`);
    setTimeout(() => setSaveMessage(''), 4000);
  };

  // RESET HANDLER
  const handleResetToAuto = () => {
    if (window.confirm('আপনি কি সকল ম্যানুয়াল এন্ট্রি ও সমন্বয় মুছে সিস্টেমের মূল অটো-হিসাবে রিসেট করতে চান?')) {
      setStockAdjustment('');
      setStockNote('');
      setDamageAdjustment('');
      setDamageNote('');
      setDueAdjustment('');
      setDueNote('');
      setCashAdjustment('');
      setCashNote('');

      setUndeliveredAmount('');
      setUndeliveredNote('');
      setCampaignAmount('');
      setCampaignNote('');
      setAppCashAmount('');
      setAppCashNote('');
      setDoAmount('');
      setDoNote('');
      setVehicleStockAmount('');
      setVehicleStockNote('');

      setBankBalance('');
      setBankNote('');
      setLessAdjustment('');
      setLessNote('');
      setOthersList([{ id: `other-${Date.now()}`, description: '', amount: 0 }]);
      setOriginalInvestment('');

      setSupplierPayables('');
      setSupplierNote('');
      setLoansPayables('');
      setLoansNote('');
      setCustomItems([]);

      updateSettings({
        ...db.settings,
        businessPosition: undefined,
      });

      setSaveMessage('সিস্টেমের অটো-হিসাব অনুযায়ী সফলভাবে রিসেট করা হয়েছে');
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  // ADD CUSTOM ITEM
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomTitle.trim() || !newCustomAmount || Number(newCustomAmount) <= 0) return;

    const newItem: CustomPositionItem = {
      id: `custom-${Date.now()}`,
      name: newCustomTitle.trim(),
      type: newCustomType,
      amount: parseFloat(newCustomAmount),
      note: newCustomNote.trim(),
    };

    const updated = [...customItems, newItem];
    setCustomItems(updated);
    setNewCustomTitle('');
    setNewCustomAmount('');
    setNewCustomNote('');
    setIsAddingCustom(false);
  };

  const handleDeleteCustomItem = (id: string) => {
    setCustomItems(customItems.filter((it) => it.id !== id));
  };

  // Toggle breakdown accordion
  const toggleBreakdown = (key: string) => {
    setShowAutoBreakdown((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Format date helper
  const formattedToday = useMemo(() => {
    try {
      return new Date().toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return todayDateStr;
    }
  }, [todayDateStr]);

  const effectiveLastSaved = lastSavedTimestamp || savedPos?.lastSavedAt;

  const lastSavedFormatted = useMemo(() => {
    if (!effectiveLastSaved) return null;
    try {
      const d = new Date(effectiveLastSaved);
      return d.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }, [effectiveLastSaved]);

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

  const printLineItems = useMemo(() => [
    { id: 'stock', sl: '১', name: 'স্টক দ্রব্য (Stock)', desc: `বর্তমান মোট মজুদ (${totalStockUnits.toLocaleString()} একক)`, autoAmount: autoStockValuation, adjustment: parseFloat(stockAdjustment) || 0, finalAmount: effectiveStock, note: stockNote },
    { id: 'damage', sl: '২', name: 'ড্যামেজ (Damage)', desc: `নষ্ট/ফেরত পণ্য (${totalDamageQty.toLocaleString()} পিস)`, autoAmount: autoDamageTotal, adjustment: parseFloat(damageAdjustment) || 0, finalAmount: effectiveDamage, note: damageNote },
    { id: 'due', sl: '৩', name: 'বাকি (Due)', desc: `কাস্টমারদের নিকট বকেয়া (${customersWithDueCount} জন)`, autoAmount: autoDueTotal, adjustment: parseFloat(dueAdjustment) || 0, finalAmount: effectiveDue, note: dueNote },
    { id: 'cash', sl: '৪', name: 'ক্যাশ (Cash)', desc: 'ব্যবসার ক্যাশ ব্যালেন্স', autoAmount: autoCashTotal, adjustment: parseFloat(cashAdjustment) || 0, finalAmount: effectiveCash, note: cashNote },
    { id: 'undelivered', sl: '৫', name: 'আনডেলিভারি (Undelivered)', desc: 'অর্ডারকৃত কিন্তু অবিতরণকৃত মাল', autoAmount: 0, adjustment: effectiveUndelivered, finalAmount: effectiveUndelivered, note: undeliveredNote },
    { id: 'campaign', sl: '৬', name: 'ক্যাম্পেইন (Campaign)', desc: 'মার্কেট ক্যাম্পেইন খরচ / তহবিল', autoAmount: 0, adjustment: effectiveCampaign, finalAmount: effectiveCampaign, note: campaignNote },
    { id: 'appcash', sl: '৭', name: 'অ্যাপ ক্যাশ (App Cash)', desc: 'ডিজিটাল বা অনলাইন ওয়ালেট ক্যাশ', autoAmount: 0, adjustment: effectiveAppCash, finalAmount: effectiveAppCash, note: appCashNote },
    { id: 'do', sl: '৮', name: 'ডিও (DO Balance)', desc: 'কোম্পানি ডেলিভারি অর্ডার অগ্রিম জমা', autoAmount: 0, adjustment: effectiveDO, finalAmount: effectiveDO, note: doNote },
    { id: 'vehiclestock', sl: '৯', name: 'গাড়িতে মাল (Vehicle Stock)', desc: 'ডেলিভারি ভ্যানে থাকা স্টক', autoAmount: 0, adjustment: effectiveVehicleStock, finalAmount: effectiveVehicleStock, note: vehicleStockNote },
    { id: 'bank', sl: '১০', name: 'ব্যাংক ব্যালেন্স (Bank)', desc: 'ব্যবসার ব্যাংক একাউন্ট স্থিতি', autoAmount: 0, adjustment: effectiveBank, finalAmount: effectiveBank, note: bankNote },
    { id: 'less', sl: '১১', name: 'কোম্পানি লেইস (Company Less)', desc: 'কোম্পানি থেকে পাওনা ছাড়/কমিশন', autoAmount: autoLessTotal, adjustment: parseFloat(lessAdjustment) || 0, finalAmount: effectiveLess, note: lessNote },
    { id: 'others', sl: '১২', name: 'আদার্স (Others)', desc: `${othersList.length} টি অন্যান্য বিবিধ খাত`, autoAmount: 0, adjustment: totalOthersAmount, finalAmount: totalOthersAmount, note: othersList.map((o) => `${o.description}: ${o.amount}`).join(', ') },
    ...customItems.filter((c) => c.type === 'asset').map((c, i) => ({
      id: c.id, sl: `${13 + i}`, name: c.name, desc: 'অতিরিক্ত কাস্টম সম্পদ খাত', autoAmount: 0, adjustment: Number(c.amount) || 0, finalAmount: Number(c.amount) || 0, note: c.note,
    })),
  ], [
    totalStockUnits, autoStockValuation, stockAdjustment, effectiveStock, stockNote,
    totalDamageQty, autoDamageTotal, damageAdjustment, effectiveDamage, damageNote,
    customersWithDueCount, autoDueTotal, dueAdjustment, effectiveDue, dueNote,
    autoCashTotal, cashAdjustment, effectiveCash, cashNote,
    effectiveUndelivered, undeliveredNote,
    effectiveCampaign, campaignNote,
    effectiveAppCash, appCashNote,
    effectiveDO, doNote,
    effectiveVehicleStock, vehicleStockNote,
    effectiveBank, bankNote,
    autoLessTotal, lessAdjustment, effectiveLess, lessNote,
    othersList, totalOthersAmount,
    customItems,
  ]);

  return (
    <div id="business-position-module" className="space-y-6">
      {/* HEADER BANNER */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-900 text-white shadow-xs">
            <Landmark className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                ব্যবসার সার্বিক হিসাব (Overall Business Position)
              </h1>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                মালিকের ড্যাশবোর্ড
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
              <span>স্টক, ড্যামেজ, বাকি, ক্যাশ, আদার্স এবং মূল ইনভেস্টমেন্টের লাইভ হিসাব</span>
              {lastSavedFormatted && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100/80 font-medium px-2 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" />
                  সর্বশেষ সেভ: {lastSavedFormatted}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenPrintPreview(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition cursor-pointer shadow-xs"
            title="সার্বিক হিসাব প্রিন্ট প্রিভিউ দেখুন"
          >
            <Eye className="h-4 w-4 text-sky-600" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition cursor-pointer shadow-xs"
            title="A4 সাইজের PNG ডাউনলোড"
          >
            <ImageDown className="h-4 w-4 text-emerald-600" />
            <span>PNG ডাউনলোড</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
            title="ইমেজ-বেসড PDF ডাউনলোড"
          >
            <FileDown className="h-4 w-4 text-emerald-400" />
            <span>PDF ডাউনলোড</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="পূর্বে সেভ করা সকল স্ন্যাপশট দেখুন"
          >
            <History className="h-4 w-4 text-slate-500" />
            <span>হিস্ট্রি ({snapshotsHistory.length})</span>
          </button>

          <button
            onClick={handleResetToAuto}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
            title="সকল এন্ট্রি মুছে সিস্টেমের মূল অটো-হিসাবে রিসেট করুন"
          >
            <RotateCcw className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">অটো-রিসেট</span>
          </button>

          <button
            onClick={handleSavePosition}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
            title="সকল এন্ট্রি, ইনভেস্টমেন্ট ও সমন্বয় স্থায়ীভাবে সেভ করুন"
          >
            <Save className="h-4 w-4" />
            <span>সেভ করুন</span>
          </button>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveMessage}</span>
        </div>
      )}

      {/* TOP EXECUTIVE CARDS (BENTO GRID: TOTAL POSITION, ORIGINAL INVESTMENT, DIFFERENCE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: সর্বমোট (Total Position) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              সর্বমোট অবস্থান (Total Position)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-indigo-900">
              {currency} {totalPosition.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            স্টক + ড্যামেজ + বাকি + ক্যাশ + অন্যান্য খাত + আদার্স
          </p>
        </div>

        {/* KPI 2: মূল ইনভেস্টমেন্ট (Original Investment Input) */}
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              মূল ইনভেস্টমেন্ট (Original Investment)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/80 text-amber-900">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold font-mono text-amber-950">{currency}</span>
            <input
              type="number"
              value={originalInvestment}
              onChange={(e) => setOriginalInvestment(e.target.value)}
              placeholder="যেমন: ৫০,০০,০০০"
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xl sm:text-2xl font-bold font-mono text-amber-950 placeholder:text-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleSaveOriginalInvestment}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                investmentSavedStatus
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-400/50'
                  : 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
              }`}
              title="শুধু মূল ইনভেস্টমেন্ট সেভ করুন"
            >
              {investmentSavedStatus ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>সেভ হয়েছে</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>সেভ করুন</span>
                </>
              )}
            </button>
          </div>
          {investmentSavedStatus && (
            <p className="mt-1.5 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" /> মূল ইনভেস্টমেন্ট সংরক্ষিত হয়েছে!
            </p>
          )}
          <p className="mt-2 text-[11px] text-amber-800 font-medium">
            ব্যবসায় শুরুতে বা মোট মূলধন হিসেবে বিনিয়োগকৃত প্রকৃত টাকা
          </p>
        </div>

        {/* KPI 3: পার্থক্য (Difference Comparison) */}
        <div
          className={`rounded-xl border p-5 shadow-xs relative overflow-hidden transition-all ${
            numOriginalInvestment === 0
              ? 'border-slate-300 bg-slate-50 text-slate-800'
              : investmentDifference > 0
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : investmentDifference < 0
              ? 'border-rose-300 bg-rose-50 text-rose-950'
              : 'border-blue-300 bg-blue-50 text-blue-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">
              পার্থক্য (Difference / তুলনা)
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                numOriginalInvestment === 0
                  ? 'bg-slate-200 text-slate-700'
                  : investmentDifference > 0
                  ? 'bg-emerald-200 text-emerald-800'
                  : investmentDifference < 0
                  ? 'bg-rose-200 text-rose-800'
                  : 'bg-blue-200 text-blue-800'
              }`}
            >
              {numOriginalInvestment === 0 ? (
                <Scale className="h-4 w-4" />
              ) : investmentDifference > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : investmentDifference < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
            </div>
          </div>

          <div className="mt-3">
            {numOriginalInvestment === 0 ? (
              <div>
                <span className="text-sm font-semibold text-slate-500">
                  মূল ইনভেস্টমেন্ট লিখুন
                </span>
                <span className="block text-2xl font-bold font-mono text-slate-700 mt-0.5">
                  {currency} {totalPosition.toLocaleString()}
                </span>
              </div>
            ) : investmentDifference > 0 ? (
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2 py-0.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  বিনিয়োগের চেয়ে বেশি আছে
                </span>
                <span className="block text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 mt-1">
                  +{currency} {investmentDifference.toLocaleString()}
                </span>
              </div>
            ) : investmentDifference < 0 ? (
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-200/80 px-2 py-0.5 text-xs font-bold text-rose-900">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-700" />
                  বিনিয়োগের চেয়ে কম আছে
                </span>
                <span className="block text-2xl sm:text-3xl font-extrabold font-mono text-rose-700 mt-1">
                  -{currency} {Math.abs(investmentDifference).toLocaleString()}
                </span>
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-200/80 px-2 py-0.5 text-xs font-bold text-blue-900">
                  <Scale className="h-3.5 w-3.5 text-blue-700" />
                  বিনিয়োগের সমান আছে
                </span>
                <span className="block text-2xl sm:text-3xl font-extrabold font-mono text-blue-800 mt-1">
                  {currency} ০
                </span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] opacity-80">
            সর্বমোট (Total Position) − মূল ইনভেস্টমেন্ট
          </p>
        </div>
      </div>

      {/* LINE ITEMS TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-indigo-700" />
            <h2 className="text-sm font-bold text-slate-900">
              ব্যবসার খাতভিত্তিক সার্বিক হিসাবের তালিকা (Line Items)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            সর্বমোট:{' '}
            <strong className="font-mono text-indigo-800 text-sm">
              {currency} {totalPosition.toLocaleString()}
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[220px]">খাত / আইটেমের বিবরণ</th>
                <th className="py-3 px-3 min-w-[150px] text-right">১. সিস্টেমের অটো-হিসাব</th>
                <th className="py-3 px-3 min-w-[200px]">২. সমন্বয় / বিবরণ / মন্তব্য</th>
                <th className="py-3 px-4 min-w-[140px] text-right">৩. মোট কার্যকর টাকা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* LINE ITEM 1: স্টক দ্রব্য (Stock Value) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">১</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">স্টক দ্রব্য (Stock Value)</span>
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          অটো-স্টক
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        সব পণ্যের বর্তমান স্টক × বিক্রয় দর (মোট {db.products.length}টি পণ্য, {totalStockUnits.toLocaleString()} পিস)
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleBreakdown('stock')}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        {showAutoBreakdown['stock'] ? 'বিবরণ লুকান' : 'বিস্তারিত স্টক হিসাব দেখুন'}
                        {showAutoBreakdown['stock'] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {showAutoBreakdown['stock'] && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 max-h-48 overflow-y-auto space-y-1">
                          {db.products.slice(0, 15).map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-[11px] text-slate-700"
                            >
                              <span className="truncate max-w-[180px]">{p.name}</span>
                              <span className="font-mono text-slate-500">
                                {p.currentStock} {p.unit || 'পিস'} × {currency}
                                {p.salePrice} ={' '}
                                <strong className="text-slate-800">
                                  {currency} {(p.currentStock * p.salePrice).toLocaleString()}
                                </strong>
                              </span>
                            </div>
                          ))}
                          {db.products.length > 15 && (
                            <p className="text-[10px] text-slate-400 text-center pt-1">
                              + আরও {db.products.length - 15}টি পণ্য অন্তর্ভুক্ত আছে
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currency} {autoStockValuation.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400">স্টক মডিউল থেকে প্রাপ্ত</span>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">সমন্বয়:</span>
                      <input
                        type="number"
                        value={stockAdjustment}
                        onChange={(e) => setStockAdjustment(e.target.value)}
                        placeholder="± ০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={stockNote}
                      onChange={(e) => setStockNote(e.target.value)}
                      placeholder="মন্তব্য (যেমন: গোডাউন অডিট পার্থক্য)"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveStock.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 2: ড্যামেজ (Damage) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">২</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-800 shrink-0 mt-0.5">
                      <AlertOctagon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">ড্যামেজ (Damage)</span>
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          অটো-রেকর্ড
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        দৈনিক বিক্রয় খাতার মোট রেকর্ডকৃত ড্যামেজ মূল্য ({totalDamageQty.toLocaleString()} পিস নষ্ট/ফেরত)
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleBreakdown('damage')}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        {showAutoBreakdown['damage'] ? 'বিবরণ লুকান' : 'দৈনিক ড্যামেজ তালিকা দেখুন'}
                        {showAutoBreakdown['damage'] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {showAutoBreakdown['damage'] && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 max-h-48 overflow-y-auto space-y-1">
                          {db.dailySheets
                            .filter((s) => (s.totalDamageValue || 0) > 0)
                            .map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between text-[11px] text-slate-700"
                              >
                                <span>
                                  {s.date} (শীট: {s.sheetNo || s.id})
                                </span>
                                <span className="font-mono font-bold text-rose-700">
                                  {currency} {(s.totalDamageValue || 0).toLocaleString()}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currency} {autoDamageTotal.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400">Daily খাতা ড্যামেজ যোগফল</span>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">সমন্বয়/মন্তব্য:</span>
                      <input
                        type="number"
                        value={damageAdjustment}
                        onChange={(e) => setDamageAdjustment(e.target.value)}
                        placeholder="± ০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={damageNote}
                      onChange={(e) => setDamageNote(e.target.value)}
                      placeholder="মন্তব্য (যেমন: গোডাউনের বাড়তি নষ্ট মাল)"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveDamage.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 3: বাকি (Due) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৩</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 shrink-0 mt-0.5">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">বাকি (Due / বাজার বকেয়া)</span>
                        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                          লেজার অটো
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        বাজারের সকল কাস্টমারের মোট বর্তমান বকেয়া পাওনা ({customersWithDueCount} জন কাস্টমার)
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleBreakdown('due')}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        {showAutoBreakdown['due'] ? 'বিবরণ লুকান' : 'শীর্ষ বকেয়া কাস্টমার দেখুন'}
                        {showAutoBreakdown['due'] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {showAutoBreakdown['due'] && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 max-h-48 overflow-y-auto space-y-1">
                          {db.customers
                            .filter((c) => c.currentDue > 0)
                            .sort((a, b) => b.currentDue - a.currentDue)
                            .slice(0, 10)
                            .map((c) => (
                              <div
                                key={c.id}
                                className="flex items-center justify-between text-[11px] text-slate-700"
                              >
                                <span className="truncate max-w-[200px]">
                                  {c.shopName} ({c.name})
                                </span>
                                <span className="font-mono font-bold text-rose-700">
                                  {currency} {c.currentDue.toLocaleString()}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currency} {autoDueTotal.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400">কাস্টমার লেজার বাকি</span>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">সমন্বয়:</span>
                      <input
                        type="number"
                        value={dueAdjustment}
                        onChange={(e) => setDueAdjustment(e.target.value)}
                        placeholder="± ০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={dueNote}
                      onChange={(e) => setDueNote(e.target.value)}
                      placeholder="মন্তব্য (যেমন: অনাদায়ী দেনা সংশোধন)"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveDue.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 4: ক্যাশ (Cash) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৪</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                      <Coins className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">ক্যাশ (Cash in Hand)</span>
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          নগদ ব্যালেন্স
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        হাতে থাকা নগদ ড্রয়ার ক্যাশ (ওপেনিং + আদায় + ডেইলি শীট জমা - খরচ)
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleBreakdown('cash')}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        {showAutoBreakdown['cash'] ? 'বিবরণ লুকান' : 'ক্যাশ জমা-খরচ ব্রেকডাউন দেখুন'}
                        {showAutoBreakdown['cash'] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {showAutoBreakdown['cash'] && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>প্রারম্ভিক ক্যাশ ব্যালেন্স:</span>
                            <span className="font-mono font-semibold">
                              {currency} {cashBreakdown.opening.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-emerald-700">
                            <span>+ কাস্টমার পেমেন্ট আদায়:</span>
                            <span className="font-mono font-semibold">
                              {currency} {cashBreakdown.collections.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-emerald-700">
                            <span>+ ডেইলি শীটের নেট ক্যাশ জমা:</span>
                            <span className="font-mono font-semibold">
                              {currency} {cashBreakdown.dailySheetsCash.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-700">
                            <span>- নগদ খরচ প্রদান:</span>
                            <span className="font-mono font-semibold">
                              -{currency} {cashBreakdown.expenses.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currency} {autoCashTotal.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400">সিস্টেম ক্যাশ ট্র্যাকিং</span>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">সমন্বয়:</span>
                      <input
                        type="number"
                        value={cashAdjustment}
                        onChange={(e) => setCashAdjustment(e.target.value)}
                        placeholder="± ০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={cashNote}
                      onChange={(e) => setCashNote(e.target.value)}
                      placeholder="মন্তব্য (যেমন: ড্রয়ার নগদ ক্যাশ গণনা)"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveCash.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 5: আনডেলিভারি (Undelivered) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৫</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800 shrink-0 mt-0.5">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">আনডেলিভারি (Undelivered)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        অর্ডারকৃত কিন্তু এখনো ডেলিভারি না হওয়া মালের হিসাব
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 italic text-[11px]">
                  — ম্যানুয়াল এন্ট্রি —
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">টাকা:</span>
                      <input
                        type="number"
                        value={undeliveredAmount}
                        onChange={(e) => setUndeliveredAmount(e.target.value)}
                        placeholder="০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={undeliveredNote}
                      onChange={(e) => setUndeliveredNote(e.target.value)}
                      placeholder="বিবরণ / মেমো নং"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveUndelivered.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 6: ক্যাম্পেইন (Campaign) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৬</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-800 shrink-0 mt-0.5">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">ক্যাম্পেইন (Campaign)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        কোম্পানি বা বিশেষ অফার/ক্যাম্পেইন বাবদ পাওনা
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 italic text-[11px]">
                  — ম্যানুয়াল এন্ট্রি —
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">টাকা:</span>
                      <input
                        type="number"
                        value={campaignAmount}
                        onChange={(e) => setCampaignAmount(e.target.value)}
                        placeholder="০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={campaignNote}
                      onChange={(e) => setCampaignNote(e.target.value)}
                      placeholder="ক্যাম্পেইনের নাম / শর্ত"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveCampaign.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 7: অ্যাপ ক্যাশ (App Cash) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৭</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-800 shrink-0 mt-0.5">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">অ্যাপ ক্যাশ (App Cash)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        বিকাশ, নগদ বা অন্যান্য ডিজিটাল অ্যাপ একাউন্টের ব্যালেন্স
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 italic text-[11px]">
                  — ম্যানুয়াল এন্ট্রি —
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">টাকা:</span>
                      <input
                        type="number"
                        value={appCashAmount}
                        onChange={(e) => setAppCashAmount(e.target.value)}
                        placeholder="০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={appCashNote}
                      onChange={(e) => setAppCashNote(e.target.value)}
                      placeholder="বিকাশ / নগদ নম্বর"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveAppCash.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 8: ডিও (DO / Delivery Order) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৮</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-800 shrink-0 mt-0.5">
                      <FileCheck2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">ডিও (DO / Delivery Order)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        কোম্পানির ডেলিভারি অর্ডার বাবদ পরিশোধিত অগ্রিম টাকা
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 italic text-[11px]">
                  — ম্যানুয়াল এন্ট্রি —
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">টাকা:</span>
                      <input
                        type="number"
                        value={doAmount}
                        onChange={(e) => setDoAmount(e.target.value)}
                        placeholder="০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={doNote}
                      onChange={(e) => setDoNote(e.target.value)}
                      placeholder="ডিও নম্বর / তারিখ"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveDO.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 9: গাড়িতে (Stock in Vehicle / Van) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">৯</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-800 shrink-0 mt-0.5">
                      <Car className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">গাড়িতে (Stock in Vehicle)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ডেলিভারি ভ্যানে বা ডেলিভারিতে চলমান মালের মোট দর
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 italic text-[11px]">
                  — ম্যানুয়াল এন্ট্রি —
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">টাকা:</span>
                      <input
                        type="number"
                        value={vehicleStockAmount}
                        onChange={(e) => setVehicleStockAmount(e.target.value)}
                        placeholder="০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={vehicleStockNote}
                      onChange={(e) => setVehicleStockNote(e.target.value)}
                      placeholder="গাড়ির নম্বর / রুট"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveVehicleStock.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 10: ব্যাংক জমা (Bank Balance) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">১০</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800 shrink-0 mt-0.5">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm">ব্যাংক ব্যালেন্স (Bank Deposit)</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        কোম্পানি ও চলতি ব্যাংক একাউন্টের বর্তমান জমা স্থিতি
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 italic text-[11px]">
                  — ম্যানুয়াল এন্ট্রি —
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">টাকা:</span>
                      <input
                        type="number"
                        value={bankBalance}
                        onChange={(e) => setBankBalance(e.target.value)}
                        placeholder="০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={bankNote}
                      onChange={(e) => setBankNote(e.target.value)}
                      placeholder="ব্যাংক একাউন্টের নাম / হিসাব নং"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveBank.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 11: কোম্পানি লেইস / ক্লেইম (Company Less Receivables) */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-slate-400">১১</td>
                <td className="py-3 px-3">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 shrink-0 mt-0.5">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">কোম্পানি লেইস / ক্লেইম (Company Less)</span>
                        <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                          Less মডিউল
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        মালিক কর্তৃক কোম্পানির পক্ষে অগ্রিম প্রদান / বকেয়া ফেরত পাওনা দাবি
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {currency} {autoLessTotal.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-400">বকেয়া লেইস মোট</span>
                </td>
                <td className="py-3 px-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">সমন্বয়:</span>
                      <input
                        type="number"
                        value={lessAdjustment}
                        onChange={(e) => setLessAdjustment(e.target.value)}
                        placeholder="± ০"
                        className="w-28 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <input
                      type="text"
                      value={lessNote}
                      onChange={(e) => setLessNote(e.target.value)}
                      placeholder="মন্তব্য (যেমন: বিশেষ অনুমোদন বকেয়া)"
                      className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                  {currency} {effectiveLess.toLocaleString()}
                </td>
              </tr>

              {/* LINE ITEM 12: "আদার্স" (OTHERS) SECTION */}
              <tr className="bg-slate-50/90 border-t-2 border-slate-200">
                <td className="py-2.5 px-4 text-center font-bold text-indigo-700">১২</td>
                <td colSpan={3} className="py-2.5 px-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MoreHorizontal className="h-4 w-4 text-indigo-600" />
                      <span className="font-bold text-slate-900 text-sm">
                        আদার্স (Others - কাস্টম বিবরণ ও টাকার পরিমাণ)
                      </span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                        {othersList.length}টি এন্ট্রি
                      </span>
                    </div>

                    {/* Small "+ আদার্স যোগ করুন" button */}
                    <button
                      type="button"
                      onClick={handleAddOther}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                      title="নতুন আদার্স লাইন আইটেম যোগ করুন"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ আদার্স যোগ করুন</span>
                    </button>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-sm text-indigo-800">
                  {currency} {totalOthersAmount.toLocaleString()}
                </td>
              </tr>

              {/* INDIVIDUAL "আদার্স" ROWS */}
              {othersList.map((other, oIdx) => (
                <tr key={other.id} className="bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                  <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                    ১২.{oIdx + 1}
                  </td>
                  <td className="py-2.5 px-3" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">বিবরণ:</span>
                      <input
                        type="text"
                        value={other.description}
                        onChange={(e) => handleUpdateOther(other.id, 'description', e.target.value)}
                        placeholder="যেমন: খুচরা পাওনা, সিকিউরিটি, অতিরিক্ত জামানত বা অন্যান্য খাত"
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium shrink-0">টাকা:</span>
                      <input
                        type="number"
                        value={other.amount === 0 ? '' : other.amount}
                        onChange={(e) => handleUpdateOther(other.id, 'amount', e.target.value)}
                        placeholder="০"
                        className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      {othersList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOther(other.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="এই আদার্স এন্ট্রি মুছে ফেলুন"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                    {currency} {(Number(other.amount) || 0).toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* CUSTOM ASSET ITEMS (IF ANY) */}
              {customItems
                .filter((it) => it.type === 'asset')
                .map((it, idx) => (
                  <tr key={it.id} className="bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-emerald-600 font-mono">
                      +
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-sm">{it.name}</div>
                      <span className="text-[11px] text-slate-500">{it.note || 'অন্যান্য নিজস্ব সম্পদ'}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-slate-400 text-[11px]">ম্যানুয়াল কাস্টম</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">{it.note || '—'}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomItem(it.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700">
                      {currency} {it.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>

            {/* TABLE FOOTER: সর্বমোট (TOTAL POSITION) */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-900 text-white font-bold">
                <td colSpan={4} className="py-3.5 px-4 text-right text-sm">
                  সর্বমোট (Total Position):
                  <span className="block text-[11px] font-normal text-slate-300">
                    স্টক + ড্যামেজ + বাকি + ক্যাশ + আনডেলিভারি + ক্যাম্পেইন + অ্যাপ ক্যাশ + ডিও + গাড়িতে + ব্যাংক + কোম্পানি লেইস + আদার্স
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-lg text-emerald-400">
                  {currency} {totalPosition.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* CUSTOM LINE ITEM CREATION (OPTIONAL) */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
        {!isAddingCustom ? (
          <button
            type="button"
            onClick={() => setIsAddingCustom(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition"
          >
            <Plus className="h-4 w-4" />
            <span>অন্যান্য বিশেষ খাতের আইটেম যোগ করুন (যেমন: শোরুম জামানত, যানবাহন সম্পত্তি)</span>
          </button>
        ) : (
          <form onSubmit={handleAddCustomItem} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800">
                নতুন আর্থিক খাতের আইটেম যোগ করুন
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                বাতিল
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  আইটেমের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                  placeholder="যেমন: গোডাউন জামানত"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ধরন *</label>
                <select
                  value={newCustomType}
                  onChange={(e) => setNewCustomType(e.target.value as 'asset' | 'liability')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                >
                  <option value="asset">চলতি সম্পদ (+) (Asset)</option>
                  <option value="liability">চলতি দেনা (-) (Liability)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">টাকা *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newCustomAmount}
                  onChange={(e) => setNewCustomAmount(e.target.value)}
                  placeholder="০"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">মন্তব্য</label>
                <input
                  type="text"
                  value={newCustomNote}
                  onChange={(e) => setNewCustomNote(e.target.value)}
                  placeholder="সংক্ষিপ্ত বিবরণ"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCustom(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800"
              >
                তালিকায় যোগ করুন
              </button>
            </div>
          </form>
        )}
      </div>

      {/* FINAL EXECUTIVE SUMMARY CARD */}
      <div className="rounded-xl border-2 border-slate-800 bg-slate-900 p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-indigo-300 font-bold">
              সার্বিক আর্থিক হিসাব সারসংক্ষেপ
            </span>
            <h3 className="text-lg sm:text-xl font-bold font-bengali">
              {db.settings.businessName || 'MM TRADERS - DISTRIBUTOR'}
            </h3>
            <p className="text-xs text-slate-400">
              প্রোপাইটর: {db.settings.proprietorName || 'Mohammad Mamun'} | তারিখ: {formattedToday}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
            <div>
              <span className="text-xs text-slate-400 block">সর্বমোট অবস্থান</span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {currency} {totalPosition.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">মূল ইনভেস্টমেন্ট</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                {currency} {numOriginalInvestment.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60">
              <span className="text-xs text-indigo-200 block font-semibold">পার্থক্য স্থিতি</span>
              <span
                className={`text-xl font-extrabold font-mono ${
                  numOriginalInvestment === 0
                    ? 'text-slate-300'
                    : investmentDifference >= 0
                    ? 'text-emerald-300'
                    : 'text-rose-300'
                }`}
              >
                {investmentDifference >= 0 ? '+' : '-'}
                {currency} {Math.abs(investmentDifference).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM STICKY SAVE BAR */}
      <div className="sticky bottom-4 z-20 rounded-xl border border-emerald-300/80 bg-slate-900 text-white p-3.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-xs shrink-0">
            <Save className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold font-bengali">
              ব্যবসার সার্বিক হিসাব ও ইনভেস্টমেন্ট সংরক্ষণ
            </div>
            <div className="text-[11px] text-slate-400">
              {lastSavedFormatted ? `সর্বশেষ সেভ: ${lastSavedFormatted}` : 'সকল ইনপুট ও সমন্বয় স্থায়ীভাবে সংরক্ষণ করতে সেভ বাটনে চাপুন'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span>হিস্ট্রি ({snapshotsHistory.length})</span>
          </button>
          <button
            type="button"
            onClick={handleSavePosition}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 text-xs sm:text-sm shadow-md transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>সেভ করুন</span>
          </button>
        </div>
      </div>

      {/* HISTORY SNAPSHOTS MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-bengali">
                    সংরক্ষিত সার্বিক হিসাবের হিস্ট্রি (Saved Snapshots)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    পূর্বে সংরক্ষিত স্ন্যাপশটগুলোর তালিকা
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 text-xs">
              {snapshotsHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  এখনো কোনো স্ন্যাপশট হিস্ট্রি সংরক্ষিত হয়নি। উপরের "সেভ করুন" বাটনে চাপলে এখানে রেকর্ড তৈরি হবে।
                </div>
              ) : (
                snapshotsHistory.map((snap, idx) => {
                  const savedDate = new Date(snap.savedAt);
                  const dateStr = savedDate.toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={snap.id || idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{dateStr}</span>
                          {idx === 0 && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                              সর্বশেষ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            অবস্থান: <strong className="text-slate-800 font-mono">{currency} {Number(snap.totalPosition || 0).toLocaleString()}</strong>
                          </span>
                          <span>
                            ইনভেস্টমেন্ট: <strong className="text-amber-700 font-mono">{currency} {Number(snap.originalInvestment || 0).toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer shrink-0"
                      >
                        রিস্টোর করুন
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Position Print & Export Preview Modal */}
      <BusinessPositionPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={db.settings}
        currency={currency}
        lineItems={printLineItems}
        totalPosition={totalPosition}
        totalInvestment={numOriginalInvestment}
        netSurplus={investmentDifference}
        todayDateStr={todayDateStr}
        initialAction={printAction}
      />
    </div>
  );
};
