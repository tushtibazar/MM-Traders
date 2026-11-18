import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  RotateCcw,
  CheckCircle2,
  Filter,
  Search,
  History,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { toBengaliDigits } from '../../utils/dateUtils';
import {
  copyTextToClipboard,
  copyTextSyncForOpen,
  formatBanglaTimeOnly,
  formatStockUnitDisplay,
  generateStockShareMessage,
  splitStockShareMessage,
} from '../../utils/shareUtils';
import {
  useRecipientPickerState,
  RecipientPickerSection,
  SplitPartButtonsBar,
  ShareActionFooter,
  ShareHistoryPanel,
  GroupPrivacyConfirmModal,
} from './ShareCommonControls';

interface StockShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

type StockScopeFilter = 'all' | 'in_stock' | 'out_of_stock' | 'low_stock';
type StockSortOrder = 'summary' | 'name_asc' | 'stock_desc';

export const StockShareModal: React.FC<StockShareModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { db, todayDateStr, addDueMessageRecord, updateSavedRecipient } = useApp();
  const currency = db.settings.currency || '৳';

  // Recipient Picker (includes "কাস্টমার থেকে বেছে নিন" and WhatsApp groups)
  const picker = useRecipientPickerState({
    isOpen,
    allowCustomerPicker: true,
  });

  // Scope & Order State
  const [scopeFilter, setScopeFilter] = useState<StockScopeFilter>('in_stock');
  const [sortOrder, setSortOrder] = useState<StockSortOrder>('summary');
  const [includePrice, setIncludePrice] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
  const [excludedProductIds, setExcludedProductIds] = useState<Set<string>>(new Set());

  // Message & Splitting State
  const [generatedAt, setGeneratedAt] = useState<Date>(new Date());
  const [messageText, setMessageText] = useState<string>('');
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);
  const [clickedPartIndices, setClickedPartIndices] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [pendingPrivacyAction, setPendingPrivacyAction] = useState<(() => void) | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Reset modal options when opened
  useEffect(() => {
    if (!isOpen) return;
    setScopeFilter('in_stock');
    setSortOrder('summary');
    setIncludePrice(false);
    setSearchQuery('');
    setIsChecklistOpen(false);
    setExcludedProductIds(new Set());
    setGeneratedAt(new Date());
    setIsManuallyEdited(false);
    setClickedPartIndices([]);
    setShowHistory(false);
    setPendingPrivacyAction(null);
    setToastMessage(null);
  }, [isOpen]);

  // All active non-deleted products
  const activeProducts = useMemo(() => {
    return (db.products || []).filter((p) => !p.deletedFromStock && p.status !== 'inactive');
  }, [db.products]);

  // Count products skipped in "low_stock" due to missing minimum stock threshold
  const noMinLimitCount = useMemo(() => {
    return activeProducts.filter((p) => !p.minStockAlert || Number(p.minStockAlert) <= 0).length;
  }, [activeProducts]);

  // Apply scope filter + search filter + sort order
  const scopedAndSortedProducts = useMemo(() => {
    let list = activeProducts.filter((p) => {
      const stock = Number(p.currentStock) || 0;
      const minAlert = Number(p.minStockAlert) || 0;

      if (scopeFilter === 'in_stock') {
        if (stock <= 0) return false;
      } else if (scopeFilter === 'out_of_stock') {
        if (stock > 0) return false;
      } else if (scopeFilter === 'low_stock') {
        // Skip products without a configured minimum stock alert (> 0)
        if (minAlert <= 0) return false;
        if (stock > minAlert) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q));
        if (!hit) return false;
      }

      return true;
    });

    if (sortOrder === 'summary') {
      const savedOrder = db.summaryProductOrder || db.settings?.summaryProductOrder || [];
      if (savedOrder.length === 0) {
        list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn'));
      } else {
        const orderMap = new Map<string, number>();
        savedOrder.forEach((id, idx) => orderMap.set(id, idx));
        list = [...list].sort((a, b) => {
          const posA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
          const posB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
          if (posA !== posB) return posA - posB;
          return (a.name || '').localeCompare(b.name || '', 'bn');
        });
      }
    } else if (sortOrder === 'name_asc') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn'));
    } else if (sortOrder === 'stock_desc') {
      list = [...list].sort((a, b) => (Number(b.currentStock) || 0) - (Number(a.currentStock) || 0));
    }

    return list;
  }, [activeProducts, scopeFilter, searchQuery, sortOrder, db.summaryProductOrder, db.settings?.summaryProductOrder]);

  // Final checked products included in the share message
  const includedProducts = useMemo(() => {
    return scopedAndSortedProducts.filter((p) => !excludedProductIds.has(p.id));
  }, [scopedAndSortedProducts, excludedProductIds]);

  const handleToggleProductCheck = (id: string) => {
    setExcludedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsManuallyEdited(false);
  };

  const handleSelectAllProducts = () => {
    setExcludedProductIds((prev) => {
      const next = new Set(prev);
      scopedAndSortedProducts.forEach((p) => next.delete(p.id));
      return next;
    });
    setIsManuallyEdited(false);
  };

  const handleDeselectAllProducts = () => {
    setExcludedProductIds((prev) => {
      const next = new Set(prev);
      scopedAndSortedProducts.forEach((p) => next.add(p.id));
      return next;
    });
    setIsManuallyEdited(false);
  };

  // Build message from live stock
  const generatedMessage = useMemo(() => {
    return generateStockShareMessage({
      products: includedProducts,
      settings: db.settings,
      includePrice,
      dateStr: todayDateStr,
      generatedAt,
    });
  }, [includedProducts, db.settings, includePrice, todayDateStr, generatedAt]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isManuallyEdited) {
      setMessageText(generatedMessage);
      setClickedPartIndices([]);
    }
  }, [isOpen, generatedMessage, isManuallyEdited]);

  const handleRefresh = () => {
    setGeneratedAt(new Date());
    setIsManuallyEdited(false);
    setClickedPartIndices([]);
    setToastMessage({
      text: 'বর্তমান লাইভ স্টক অনুযায়ী তালিকা রিফ্রেশ হয়েছে।',
      type: 'info',
    });
  };

  const messageParts = useMemo(() => {
    return splitStockShareMessage(
      messageText,
      db.settings.businessName || 'MM TRADERS',
      todayDateStr,
      1600
    );
  }, [messageText, db.settings.businessName, todayDateStr]);

  const scopeSummaryLabel = useMemo(() => {
    const scopeLabels: Record<StockScopeFilter, string> = {
      all: 'সব পণ্য',
      in_stock: 'স্টক আছে',
      out_of_stock: 'স্টক নেই',
      low_stock: 'কম স্টক',
    };
    const parts = [scopeLabels[scopeFilter]];
    if (includePrice) parts.push('দরসহ');
    if (searchQuery.trim()) parts.push(`খোঁজ: "${searchQuery.trim()}"`);
    return parts.join(' | ');
  }, [scopeFilter, includePrice, searchQuery]);

  const isGroupMode = picker.activeRecipient.mode === 'whatsapp_group';
  const groupRecord = picker.activeRecipient.groupRecord;
  const hasGroupLink = Boolean(groupRecord?.groupLink);

  // Share log helper (for stock: stores filters, product count, generation time — NEVER stores group link or full text)
  const logStockShare = (
    channel: 'whatsapp' | 'whatsapp_group' | 'messenger' | 'copy',
    partNumberLabel?: string
  ) => {
    const recName = isGroupMode
      ? picker.activeRecipient.name
      : picker.activeRecipient.mode === 'pick_contact'
      ? 'কন্টাক্ট বাছাই'
      : `${picker.activeRecipient.name} (${picker.activeRecipient.designation})`;

    addDueMessageRecord({
      type: 'stock',
      customerId: picker.activeRecipient.customerRecord?.id || 'stock-share',
      customerName: recName,
      recipientName: recName,
      channel,
      partNumber: partNumberLabel,
      scopeSummary: scopeSummaryLabel,
      productCount: includedProducts.length,
      generationTime: formatBanglaTimeOnly(generatedAt),
      includedDueIds: [],
      totalOutstanding: 0,
      recipientPhone: isGroupMode ? undefined : picker.waNorm.normalized || undefined,
      recipientFacebook: isGroupMode ? undefined : picker.fbNorm.usernameOrId || undefined,
    });
  };

  // For Stock share: ask group privacy confirmation only if "দর (কার্টুন) সহ" is ON
  const runWithGroupPrivacyCheck = (actionFn: () => void) => {
    if (isGroupMode && includePrice && !groupRecord?.skipPrivacyPrompt) {
      setPendingPrivacyAction(() => actionFn);
      return;
    }
    actionFn();
  };

  const executeSendWhatsAppPart = (
    partIdx: number,
    partLabel: string,
    partText: string
  ) => {
    if (includedProducts.length === 0) return;
    const isPickContact = picker.activeRecipient.mode === 'pick_contact' || isGroupMode;

    if (!isPickContact && !picker.waNorm.normalized) {
      setToastMessage({
        text: 'WhatsApp নম্বর নেই বা সঠিক নয়। নম্বর দিন অথবা "কন্টাক্ট বেছে নিন" ব্যবহার করুন।',
        type: 'warning',
      });
      return;
    }

    picker.maybeSaveRecipientChanges();

    const encoded = encodeURIComponent(partText);
    const waUrl = isPickContact
      ? `https://wa.me/?text=${encoded}`
      : `https://wa.me/${picker.waNorm.normalized}?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    logStockShare(
      isGroupMode ? 'whatsapp_group' : 'whatsapp',
      messageParts.length > 1 ? partLabel : undefined
    );

    setClickedPartIndices((prev) =>
      prev.includes(partIdx) ? prev : [...prev, partIdx]
    );

    setToastMessage({
      text: isGroupMode
        ? messageParts.length > 1
          ? `অংশ ${partLabel} WhatsApp-এ খোলা হয়েছে — গ্রুপ "${picker.activeRecipient.name}" বেছে Send চাপুন।`
          : `WhatsApp খোলা হয়েছে — গ্রুপ "${picker.activeRecipient.name}" বেছে Send চাপুন।`
        : messageParts.length > 1
        ? `অংশ ${partLabel} WhatsApp-এ খোলা হয়েছে — চ্যাটে Send চাপুন।`
        : 'WhatsApp খোলা হয়েছে — চ্যাটে Send চাপুন।',
      type: 'success',
    });

    if (onSuccess) {
      onSuccess(`"${picker.activeRecipient.name}"-এর জন্য স্টক তালিকা WhatsApp-এ খোলা হয়েছে`);
    }
  };

  const handleSendWhatsAppPart = (
    partIdx: number,
    partLabel: string,
    partText: string
  ) => {
    runWithGroupPrivacyCheck(() =>
      executeSendWhatsAppPart(partIdx, partLabel, partText)
    );
  };

  const executeOpenGroupAndCopy = () => {
    if (includedProducts.length === 0 || !groupRecord?.groupLink) return;
    copyTextSyncForOpen(messageText);
    setToastMessage({
      text: 'মেসেজ কপি হয়েছে — গ্রুপে Ctrl+V দিয়ে পেস্ট করে Send চাপুন',
      type: 'info',
    });
    window.open(groupRecord.groupLink, '_blank', 'noopener');
    logStockShare('whatsapp_group');
    if (onSuccess) {
      onSuccess(`"${picker.activeRecipient.name}" গ্রুপ খোলা হয়েছে এবং সম্পূর্ণ স্টক তালিকা কপি হয়েছে`);
    }
  };

  const handleOpenGroupAndCopy = () => {
    runWithGroupPrivacyCheck(executeOpenGroupAndCopy);
  };

  const handleCopyAll = async () => {
    if (!messageText.trim() || includedProducts.length === 0) return;
    picker.maybeSaveRecipientChanges();
    const ok = await copyTextToClipboard(messageText);
    if (ok) {
      logStockShare('copy');
      setToastMessage({
        text: 'সম্পূর্ণ স্টক তালিকা একসাথে কপি হয়েছে — WhatsApp-এ পেস্ট করতে পারেন।',
        type: 'success',
      });
    } else {
      setToastMessage({
        text: 'কপি করা যায়নি। টেক্সট বক্স থেকে ম্যানুয়ালি কপি করুন।',
        type: 'warning',
      });
    }
  };

  const handleSendMessenger = async () => {
    if (includedProducts.length === 0) return;
    if (!picker.fbNorm.isValid || !picker.fbNorm.usernameOrId) {
      picker.setShowFbInputBox(true);
      setToastMessage({
        text: 'Messenger লিংকের জন্য প্রাপকের Facebook username বা ID দিন।',
        type: 'warning',
      });
      return;
    }

    picker.maybeSaveRecipientChanges();
    await copyTextToClipboard(messageText);
    const targetUrl = `https://m.me/${picker.fbNorm.usernameOrId}`;

    logStockShare('messenger');
    setToastMessage({
      text: 'মেসেজ কপি হয়েছে — Messenger চ্যাটে Ctrl+V দিয়ে পেস্ট করুন',
      type: 'info',
    });

    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    if (onSuccess) {
      onSuccess(`"${picker.activeRecipient.name}"-এর জন্য Messenger খোলা হয়েছে`);
    }
  };

  // Last 10 stock shares
  const stockShareHistory = useMemo(() => {
    return (db.dueMessages || [])
      .filter((m) => m.type === 'stock')
      .slice(0, 10);
  }, [db.dueMessages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-bengali">
                স্টকের তালিকা পাঠান
              </h2>
              <p className="text-[11px] text-slate-500 font-bengali">
                SR, DSR, ম্যানেজার বা দোকানদার কাস্টমারকে বর্তমান স্টকের তালিকা WhatsApp বা Messenger-এ পাঠান
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                showHistory
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>শেয়ার ইতিহাস ({toBengaliDigits(stockShareHistory.length)})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="বন্ধ করুন"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {showHistory && (
            <ShareHistoryPanel
              entries={stockShareHistory}
              mode="stock"
              onHide={() => setShowHistory(false)}
            />
          )}

          {/* 1. Recipient Picker (includes Customer picker) */}
          <RecipientPickerSection picker={picker} />

          {/* 2. Scope, Sort & Options */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
                <Filter className="h-4 w-4 text-amber-600" />
                ২. কোন পণ্যগুলো পাঠাবেন (ফিল্টার ও সাজানো)
              </span>
              <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                {toBengaliDigits(includedProducts.length)} টি পণ্য
              </span>
            </div>

            {/* Scope Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'সব পণ্য' },
                  { id: 'in_stock', label: 'শুধু স্টক আছে এমন' },
                  { id: 'out_of_stock', label: 'শুধু স্টক নেই এমন' },
                  { id: 'low_stock', label: 'কম স্টক' },
                ] as Array<{ id: StockScopeFilter; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setScopeFilter(opt.id);
                    setIsManuallyEdited(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    scopeFilter === opt.id
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {scopeFilter === 'low_stock' && noMinLimitCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  ন্যূনতম স্টক সীমা সেট না থাকায় {toBengaliDigits(noMinLimitCount)} টি পণ্য কম স্টক ফিল্টার থেকে বাদ দেওয়া হয়েছে।
                </span>
              </div>
            )}

            {/* Search, Order & Price Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsManuallyEdited(false);
                  }}
                  placeholder="পণ্যের নাম বা কোড খুঁজুন..."
                  className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">ক্রম:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as StockSortOrder);
                    setIsManuallyEdited(false);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="summary">সামারি ক্রম</option>
                  <option value="name_asc">A-Z (নাম অনুযায়ী)</option>
                  <option value="stock_desc">স্টক বেশি থেকে কম</option>
                </select>
              </div>

              <label className="inline-flex items-center justify-center sm:justify-start gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={(e) => {
                    setIncludePrice(e.target.checked);
                    setIsManuallyEdited(false);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>দর (কার্টুন) সহ</span>
              </label>
            </div>

            {/* Collapsed Product Checklist */}
            <div className="border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsChecklistOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer"
                >
                  {isChecklistOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                  <PackageCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    পণ্য বাছাই ({toBengaliDigits(includedProducts.length)}/{toBengaliDigits(scopedAndSortedProducts.length)})
                  </span>
                </button>

                {isChecklistOpen && scopedAndSortedProducts.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllProducts}
                      className="font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      সব নির্বাচন
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllProducts}
                      className="font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      সব বাদ
                    </button>
                  </div>
                )}
              </div>

              {isChecklistOpen && (
                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
                  {scopedAndSortedProducts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      ফিল্টার অনুযায়ী কোনো পণ্য পাওয়া যায়নি
                    </div>
                  ) : (
                    scopedAndSortedProducts.map((p: Product) => {
                      const isChecked = !excludedProductIds.has(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-white cursor-pointer select-none"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleProductCheck(p.id)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="font-semibold text-slate-800 truncate">
                              {p.name}
                            </span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-600 shrink-0">
                            {formatStockUnitDisplay(p)}
                            {includePrice
                              ? ` • ${currency}${(Number(p.salePrice) || 0).toLocaleString('bn-BD')}`
                              : ''}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 3. Message Preview & Edit */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                ৩. মেসেজ প্রিভিউ (পাঠানোর আগে সম্পাদনা করতে পারবেন)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {toBengaliDigits(messageText.length)} অক্ষর
                  {messageParts.length > 1
                    ? ` • ${toBengaliDigits(messageParts.length)} টি অংশ`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            {includedProducts.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-bold text-amber-900">
                নির্বাচিত ফিল্টার ও বাছাই অনুযায়ী কোনো পণ্য নেই।
              </div>
            ) : (
              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  setIsManuallyEdited(true);
                  setClickedPartIndices([]);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-sans text-slate-900 leading-relaxed focus:border-emerald-500 focus:outline-none"
              />
            )}
          </div>

          {/* Toast */}
          {toastMessage && (
            <div
              className={`rounded-xl border p-3 text-xs font-bold flex items-center gap-2 ${
                toastMessage.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : toastMessage.type === 'warning'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-sky-300 bg-sky-50 text-sky-900'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Multi-part Split Buttons */}
          {includedProducts.length > 0 && (
            <SplitPartButtonsBar
              parts={messageParts}
              clickedPartIndices={clickedPartIndices}
              hasValidWaTarget={picker.hasValidWaTarget}
              isGroupMode={isGroupMode}
              groupName={picker.activeRecipient.name}
              onSendPart={handleSendWhatsAppPart}
            />
          )}
        </div>

        {/* Action Footer */}
        <ShareActionFooter
          disabled={includedProducts.length === 0}
          hasValidWaTarget={picker.hasValidWaTarget}
          isMultiPart={messageParts.length > 1}
          isPickContactMode={picker.activeRecipient.mode === 'pick_contact'}
          isGroupMode={isGroupMode}
          groupName={picker.activeRecipient.name}
          hasGroupLink={hasGroupLink}
          onSendSingleWhatsApp={() =>
            handleSendWhatsAppPart(
              1,
              '১/১',
              messageParts[0]?.text || messageText
            )
          }
          onOpenGroupAndCopy={handleOpenGroupAndCopy}
          onCopyAll={handleCopyAll}
          onSendMessenger={handleSendMessenger}
          onClose={onClose}
        />

        {/* Group Privacy Confirmation */}
        <GroupPrivacyConfirmModal
          isOpen={Boolean(pendingPrivacyAction)}
          groupName={picker.activeRecipient.name}
          onCancel={() => setPendingPrivacyAction(null)}
          onConfirm={(dontAskAgain) => {
            if (dontAskAgain && groupRecord) {
              updateSavedRecipient({
                ...groupRecord,
                skipPrivacyPrompt: true,
              });
            }
            const fn = pendingPrivacyAction;
            setPendingPrivacyAction(null);
            if (fn) fn();
          }}
        />
      </div>
    </div>
  );
};
