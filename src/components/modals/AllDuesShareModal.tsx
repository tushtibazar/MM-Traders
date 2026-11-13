import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Phone,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Send,
  Filter,
  Users,
  MapPin,
  Search,
  Printer,
  History,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import {
  Customer,
  DueMessageRecord,
  RecipientDesignation,
  SavedRecipient,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { toBengaliDigits } from '../../utils/dateUtils';
import {
  calculateCustomerDueAllocation,
  matchesDueNumber,
  toEnglishDigits,
} from '../../utils/dueUtils';
import {
  normalizeWhatsAppNumber,
  normalizeFacebookProfile,
  copyTextToClipboard,
  formatMessageDateTime,
  generateAllDuesMessageText,
  splitDueListMessage,
  DueListShareItem,
} from '../../utils/shareUtils';

export interface AllDuesPrintScopeParams {
  routes: string[];
  srIds: string[];
  minAmount: number;
  search: string;
  groupByRoute: boolean;
  combineByCustomer: boolean;
  sortBy: 'due_no' | 'amount_desc' | 'name';
}

interface AllDuesShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRoutes: string[];
  customerRouteMap: Map<string, Set<string>>;
  initialRouteFilter?: string;
  initialSrFilter?: string;
  initialSearchQuery?: string;
  onOpenPrintPreviewWithScope?: (params: AllDuesPrintScopeParams) => void;
  onSuccess?: (msg: string) => void;
}

const DESIGNATION_OPTIONS: RecipientDesignation[] = [
  'SR',
  'DSR',
  'TSM',
  'হেড অফ সেলস',
  'অন্যান্য',
];

function formatFullCustomerName(customer: Customer): string {
  const shop = (customer.shopName || '').trim();
  const name = (customer.name || '').trim();
  if (shop && name && shop !== name) {
    return `${shop}, ${name}`;
  }
  return shop || name || 'কাস্টমার';
}

export const AllDuesShareModal: React.FC<AllDuesShareModalProps> = ({
  isOpen,
  onClose,
  availableRoutes,
  customerRouteMap,
  initialRouteFilter = 'all',
  initialSrFilter = 'all',
  initialSearchQuery = '',
  onOpenPrintPreviewWithScope,
  onSuccess,
}) => {
  const {
    db,
    todayDateStr,
    addDueMessageRecord,
    addSavedRecipient,
    updateSavedRecipient,
  } = useApp();
  const currency = db.settings.currency || '৳';

  // Scope filter state
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedSrIds, setSelectedSrIds] = useState<string[]>([]);
  const [minDueInput, setMinDueInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(true);

  // Format option state
  const [groupByRoute, setGroupByRoute] = useState<boolean>(true);
  const [combineByCustomer, setCombineByCustomer] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'due_no' | 'amount_desc' | 'name'>('due_no');
  const [includePhone, setIncludePhone] = useState<boolean>(false);
  const [summaryOnly, setSummaryOnly] = useState<boolean>(false);

  // Recipient selection state
  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string>('custom');
  const [customName, setCustomName] = useState<string>('');
  const [customDesignation, setCustomDesignation] = useState<RecipientDesignation>('SR');
  const [customDesignationText, setCustomDesignationText] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customFacebook, setCustomFacebook] = useState<string>('');
  const [saveCustomToRecipients, setSaveCustomToRecipients] = useState<boolean>(false);
  const [customSavedThisSession, setCustomSavedThisSession] = useState<boolean>(false);
  const [inlinePhoneOverride, setInlinePhoneOverride] = useState<string>('');
  const [inlineFbOverride, setInlineFbOverride] = useState<string>('');
  const [showFbInputBox, setShowFbInputBox] = useState<boolean>(false);

  // Message & splitting state
  const [messageText, setMessageText] = useState<string>('');
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);
  const [clickedPartIndices, setClickedPartIndices] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const savedRecipients = useMemo(
    () => (Array.isArray(db.savedRecipients) ? db.savedRecipients : []),
    [db.savedRecipients]
  );

  // Active SRs & DSRs with phone numbers (do not duplicate into savedRecipients)
  const staffRecipients = useMemo(() => {
    const list: Array<{
      key: string;
      id: string;
      name: string;
      designation: string;
      phone: string;
      type: 'SR' | 'DSR';
    }> = [];

    (db.salesRepresentatives || []).forEach((sr) => {
      if (sr.active !== false && sr.phone && sr.phone.trim()) {
        list.push({
          key: `sr:${sr.id}`,
          id: sr.id,
          name: sr.name,
          designation: 'SR',
          phone: sr.phone.trim(),
          type: 'SR',
        });
      }
    });

    (db.deliveryRepresentatives || []).forEach((dsr) => {
      if (dsr.active !== false && dsr.phone && dsr.phone.trim()) {
        list.push({
          key: `dsr:${dsr.id}`,
          id: dsr.id,
          name: dsr.name,
          designation: 'DSR',
          phone: dsr.phone.trim(),
          type: 'DSR',
        });
      }
    });

    return list;
  }, [db.salesRepresentatives, db.deliveryRepresentatives]);

  // Initialize state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSelectedRoutes(
      initialRouteFilter && initialRouteFilter !== 'all' ? [initialRouteFilter] : []
    );
    setSelectedSrIds(
      initialSrFilter && initialSrFilter !== 'all' ? [initialSrFilter] : []
    );
    setSearchQuery(initialSearchQuery || '');
    setMinDueInput('');

    setGroupByRoute(true);
    setCombineByCustomer(false);
    setSortBy('due_no');
    setIncludePhone(false);
    setSummaryOnly(false);

    setIsManuallyEdited(false);
    setClickedPartIndices([]);
    setToastMessage(null);
    setShowHistory(false);
    setShowFbInputBox(false);
    setCustomSavedThisSession(false);
    setSaveCustomToRecipients(false);
    setCustomName('');
    setCustomDesignation('SR');
    setCustomDesignationText('');
    setCustomPhone('');
    setCustomFacebook('');
    setInlinePhoneOverride('');
    setInlineFbOverride('');

    // Auto-select sensible default recipient
    if (initialSrFilter && initialSrFilter !== 'all') {
      const matchingSr = staffRecipients.find((s) => s.key === `sr:${initialSrFilter}`);
      if (matchingSr) {
        setSelectedRecipientKey(matchingSr.key);
        return;
      }
    }
    if (savedRecipients.length > 0) {
      setSelectedRecipientKey(`saved:${savedRecipients[0].id}`);
    } else if (staffRecipients.length > 0) {
      setSelectedRecipientKey(staffRecipients[0].key);
    } else {
      setSelectedRecipientKey('custom');
    }
  }, [
    isOpen,
    initialRouteFilter,
    initialSrFilter,
    initialSearchQuery,
    savedRecipients,
    staffRecipients,
  ]);

  // Build map of dueNo/ledgerId -> route from daily sheets & ledgers for exact per-due route attribution
  const dueSpecificRouteMap = useMemo(() => {
    const map = new Map<string, string>();
    (db.dailySheets || []).forEach((s) => {
      const sheetRoute = s.routeOrVan?.trim();
      if (!sheetRoute) return;
      (s.todayDueEntries || []).forEach((e) => {
        if (e.dueNo) map.set(`due:${e.dueNo.toLowerCase()}`, sheetRoute);
        if (e.ledgerId) map.set(`ledger:${e.ledgerId}`, sheetRoute);
      });
    });
    (db.customerLedgers || []).forEach((l) => {
      if (l.status === 'voided' || !l.description) return;
      const matched = availableRoutes.find((r) => l.description.includes(r));
      if (matched) {
        if (l.dueNo) map.set(`due:${l.dueNo.toLowerCase()}`, matched);
        map.set(`ledger:${l.id}`, matched);
      }
    });
    return map;
  }, [db.dailySheets, db.customerLedgers, availableRoutes]);

  // Compute all outstanding items across all customers using the shared allocation helper
  const allOutstandingItems = useMemo(() => {
    const result: Array<
      DueListShareItem & {
        customerRoutes: string[];
        assignedSrId?: string;
        address?: string;
      }
    > = [];

    (db.customers || []).forEach((customer) => {
      if ((Number(customer.currentDue) || 0) <= 0) return;

      const allocation = calculateCustomerDueAllocation(customer, db);
      if (!allocation.hasAnyOutstanding) return;

      const custRoutes = Array.from(customerRouteMap.get(customer.id) || []);
      const defaultRoute = custRoutes[0] || 'রুট উল্লেখ নেই';
      const fullName = formatFullCustomerName(customer);

      allocation.outstandingDues.forEach((d) => {
        if (d.remainingAmount <= 0) return;
        const specificRoute =
          (d.ledgerId && dueSpecificRouteMap.get(`ledger:${d.ledgerId}`)) ||
          (d.rawDueNo && dueSpecificRouteMap.get(`due:${d.rawDueNo.toLowerCase()}`)) ||
          defaultRoute;

        result.push({
          id: d.id,
          rawDueNo: d.rawDueNo,
          dueNo: d.dueNo,
          customerId: customer.id,
          customerName: fullName,
          phone: customer.phone || customer.whatsappNumber || '',
          amount: d.remainingAmount,
          originalAmount: d.originalAmount,
          route: specificRoute,
          date: d.date,
          customerRoutes: custRoutes.length > 0 ? custRoutes : ['রুট উল্লেখ নেই'],
          assignedSrId: customer.assignedSrId,
          address: customer.address || '',
        });
      });

      // Include any unallocated positive adjustment (e.g. previous/opening balance) so total matches বাকি page total
      if (allocation.adjustmentAmount > 0.5) {
        result.push({
          id: `adj-${customer.id}`,
          rawDueNo: 'পূর্বের',
          dueNo: 'পূর্বের',
          customerId: customer.id,
          customerName: fullName,
          phone: customer.phone || customer.whatsappNumber || '',
          amount: Math.round(allocation.adjustmentAmount),
          originalAmount: Math.round(allocation.adjustmentAmount),
          route: defaultRoute,
          date: customer.createdAt ? customer.createdAt.slice(0, 10) : todayDateStr,
          customerRoutes: custRoutes.length > 0 ? custRoutes : ['রুট উল্লেখ নেই'],
          assignedSrId: customer.assignedSrId,
          address: customer.address || '',
        });
      }
    });

    return result;
  }, [db, customerRouteMap, dueSpecificRouteMap, todayDateStr]);

  // Apply scope filters
  const minAmountParsed = useMemo(() => {
    const cleaned = toEnglishDigits(minDueInput).replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    return !isNaN(n) && n > 0 ? n : 0;
  }, [minDueInput]);

  const filteredItems = useMemo(() => {
    return allOutstandingItems.filter((item) => {
      // 1. Route filter
      if (selectedRoutes.length > 0) {
        const hasNoRoute =
          item.route === 'রুট উল্লেখ নেই' ||
          item.customerRoutes.includes('রুট উল্লেখ নেই');
        const matchesNoRoute = selectedRoutes.includes('no_route') && hasNoRoute;
        const matchesRoute =
          selectedRoutes.includes(item.route) ||
          item.customerRoutes.some((r) => selectedRoutes.includes(r));
        if (!matchesNoRoute && !matchesRoute) return false;
      }

      // 2. SR filter
      if (selectedSrIds.length > 0) {
        if (!item.assignedSrId || !selectedSrIds.includes(item.assignedSrId)) {
          return false;
        }
      }

      // 3. Minimum due amount
      if (minAmountParsed > 0 && item.amount < minAmountParsed) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.customerName.toLowerCase().includes(q);
        const matchPhone = (item.phone || '').toLowerCase().includes(q);
        const matchAddress = (item.address || '').toLowerCase().includes(q);
        const matchRoute = item.route.toLowerCase().includes(q);
        const matchDue =
          matchesDueNumber(item.rawDueNo, searchQuery.trim()) ||
          item.dueNo.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchAddress && !matchRoute && !matchDue) {
          return false;
        }
      }

      return true;
    });
  }, [allOutstandingItems, selectedRoutes, selectedSrIds, minAmountParsed, searchQuery]);

  // Live statistics
  const liveStats = useMemo(() => {
    const duesCount = filteredItems.length;
    const customerIds = new Set(filteredItems.map((i) => i.customerId));
    const totalAmount = filteredItems.reduce((sum, i) => sum + i.amount, 0);
    return {
      duesCount,
      customerCount: customerIds.size,
      totalAmount,
    };
  }, [filteredItems]);

  // Resolve active recipient details
  const activeRecipient = useMemo(() => {
    if (selectedRecipientKey === 'pick_contact') {
      return {
        mode: 'pick_contact' as const,
        name: 'প্রাপক',
        designation: 'কন্টাক্ট',
        phoneRaw: '',
        fbRaw: inlineFbOverride,
        savedRecord: null as SavedRecipient | null,
      };
    }

    if (selectedRecipientKey === 'custom') {
      const desigLabel =
        customDesignation === 'অন্যান্য' && customDesignationText.trim()
          ? customDesignationText.trim()
          : customDesignation;
      return {
        mode: 'custom' as const,
        name: customName.trim() || 'কর্মী',
        designation: desigLabel,
        phoneRaw: customPhone,
        fbRaw: customFacebook,
        savedRecord: null as SavedRecipient | null,
      };
    }

    if (selectedRecipientKey.startsWith('saved:')) {
      const id = selectedRecipientKey.slice(6);
      const rec = savedRecipients.find((r) => r.id === id) || null;
      const desigLabel =
        rec?.designation === 'অন্যান্য' && rec.customDesignation
          ? rec.customDesignation
          : rec?.designation || 'SR';
      return {
        mode: 'saved' as const,
        name: rec?.name || 'কর্মী',
        designation: desigLabel,
        phoneRaw: inlinePhoneOverride || rec?.whatsappNumber || rec?.phone || '',
        fbRaw: inlineFbOverride || rec?.facebookProfile || '',
        savedRecord: rec,
      };
    }

    const staff = staffRecipients.find((s) => s.key === selectedRecipientKey);
    if (staff) {
      return {
        mode: 'staff' as const,
        name: staff.name,
        designation: staff.designation,
        phoneRaw: inlinePhoneOverride || staff.phone || '',
        fbRaw: inlineFbOverride,
        savedRecord: null as SavedRecipient | null,
      };
    }

    return {
      mode: 'custom' as const,
      name: 'কর্মী',
      designation: 'SR',
      phoneRaw: customPhone,
      fbRaw: customFacebook,
      savedRecord: null as SavedRecipient | null,
    };
  }, [
    selectedRecipientKey,
    savedRecipients,
    staffRecipients,
    customName,
    customDesignation,
    customDesignationText,
    customPhone,
    customFacebook,
    inlinePhoneOverride,
    inlineFbOverride,
  ]);

  const waNorm = useMemo(
    () => normalizeWhatsAppNumber(activeRecipient.phoneRaw),
    [activeRecipient.phoneRaw]
  );

  const fbNorm = useMemo(
    () => normalizeFacebookProfile(activeRecipient.fbRaw),
    [activeRecipient.fbRaw]
  );

  // Reset inline overrides when switching recipient
  const handleRecipientChange = (newKey: string) => {
    setSelectedRecipientKey(newKey);
    setInlinePhoneOverride('');
    setInlineFbOverride('');
    setShowFbInputBox(false);
    setCustomSavedThisSession(false);
  };

  // Scope summary string for logs
  const scopeSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (selectedRoutes.length > 0) {
      const routeLabels = selectedRoutes.map((r) =>
        r === 'no_route' ? 'রুট উল্লেখ নেই' : r
      );
      parts.push(`রুট: ${routeLabels.join(', ')}`);
    } else {
      parts.push('সব রুট');
    }
    if (selectedSrIds.length > 0) {
      const srNames = selectedSrIds.map(
        (id) =>
          (db.salesRepresentatives || []).find((s) => s.id === id)?.name || id
      );
      parts.push(`SR: ${srNames.join(', ')}`);
    }
    if (minAmountParsed > 0) {
      parts.push(`≥৳${minAmountParsed.toLocaleString('bn-BD')}`);
    }
    if (searchQuery.trim()) {
      parts.push(`খোঁজ: "${searchQuery.trim()}"`);
    }
    if (summaryOnly) {
      parts.push('সারসংক্ষেপ');
    } else if (combineByCustomer) {
      parts.push('কাস্টমার অনুযায়ী');
    }
    return parts.join(' | ');
  }, [
    selectedRoutes,
    selectedSrIds,
    minAmountParsed,
    searchQuery,
    summaryOnly,
    combineByCustomer,
    db.salesRepresentatives,
  ]);

  // Generate formatted message whenever inputs change unless manually edited
  const generatedMessage = useMemo(() => {
    return generateAllDuesMessageText({
      items: filteredItems,
      recipientName: activeRecipient.name,
      designation: activeRecipient.designation,
      settings: db.settings,
      dateStr: todayDateStr,
      groupByRoute,
      combineByCustomer,
      sortBy,
      includePhone,
      summaryOnly,
    });
  }, [
    filteredItems,
    activeRecipient.name,
    activeRecipient.designation,
    db.settings,
    todayDateStr,
    groupByRoute,
    combineByCustomer,
    sortBy,
    includePhone,
    summaryOnly,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isManuallyEdited) {
      setMessageText(generatedMessage);
      setClickedPartIndices([]);
    }
  }, [isOpen, generatedMessage, isManuallyEdited]);

  const handleRefreshMessage = () => {
    setIsManuallyEdited(false);
    setMessageText(generatedMessage);
    setClickedPartIndices([]);
    setToastMessage({ text: 'মেসেজ নতুন করে তৈরি হয়েছে।', type: 'info' });
  };

  // Split message into WhatsApp-safe parts
  const messageParts = useMemo(() => {
    return splitDueListMessage(messageText, activeRecipient.name, 1600);
  }, [messageText, activeRecipient.name]);

  // Persist custom recipient if checkbox ticked
  const maybeSaveCustomRecipient = () => {
    if (
      activeRecipient.mode === 'custom' &&
      saveCustomToRecipients &&
      !customSavedThisSession &&
      (waNorm.normalized || customPhone.trim())
    ) {
      addSavedRecipient({
        name: customName.trim() || 'কর্মী',
        designation: customDesignation,
        customDesignation:
          customDesignation === 'অন্যান্য'
            ? customDesignationText.trim() || undefined
            : undefined,
        phone: waNorm.normalized || customPhone.trim(),
        whatsappNumber: waNorm.normalized || customPhone.trim(),
        facebookProfile: fbNorm.usernameOrId || customFacebook.trim() || undefined,
      });
      setCustomSavedThisSession(true);
    } else if (
      activeRecipient.mode === 'saved' &&
      activeRecipient.savedRecord &&
      (inlinePhoneOverride.trim() || inlineFbOverride.trim())
    ) {
      updateSavedRecipient({
        ...activeRecipient.savedRecord,
        whatsappNumber:
          waNorm.normalized || activeRecipient.savedRecord.whatsappNumber,
        phone:
          waNorm.normalized || activeRecipient.savedRecord.phone,
        facebookProfile:
          fbNorm.usernameOrId || activeRecipient.savedRecord.facebookProfile,
      });
    }
  };

  // Log share click in dueMessages
  const logListShare = (
    channel: 'whatsapp' | 'messenger' | 'copy',
    partNumberLabel?: string
  ) => {
    const rec: Omit<DueMessageRecord, 'id' | 'createdAt'> = {
      type: 'list',
      customerId: 'all-dues-list',
      customerName: `${activeRecipient.name} (${activeRecipient.designation})`,
      recipientName: `${activeRecipient.name} (${activeRecipient.designation})`,
      channel,
      partNumber: partNumberLabel,
      scopeSummary: scopeSummaryText,
      duesCount: liveStats.duesCount,
      customerCount: liveStats.customerCount,
      includedDueIds: filteredItems.map((i) => i.id),
      totalOutstanding: liveStats.totalAmount,
      recipientPhone: waNorm.normalized || undefined,
      recipientFacebook: fbNorm.usernameOrId || undefined,
      messageText,
    };
    addDueMessageRecord(rec);
  };

  // Click handler for WhatsApp (single or specific part)
  const handleSendWhatsAppPart = (partIdx: number, partLabel: string, partText: string) => {
    if (liveStats.duesCount === 0) return;

    const isPickContact = activeRecipient.mode === 'pick_contact';
    if (!isPickContact && !waNorm.normalized) {
      setToastMessage({
        text: 'WhatsApp নম্বর নেই বা সঠিক নয়। নম্বর দিন অথবা "কন্টাক্ট বেছে নিন" ব্যবহার করুন।',
        type: 'warning',
      });
      return;
    }

    maybeSaveCustomRecipient();

    const encoded = encodeURIComponent(partText);
    const waUrl = isPickContact
      ? `https://wa.me/?text=${encoded}`
      : `https://wa.me/${waNorm.normalized}?text=${encoded}`;

    // Open synchronously inside click handler so pop-ups are not blocked
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    logListShare('whatsapp', messageParts.length > 1 ? partLabel : undefined);

    setClickedPartIndices((prev) =>
      prev.includes(partIdx) ? prev : [...prev, partIdx]
    );

    setToastMessage({
      text:
        messageParts.length > 1
          ? `অংশ ${partLabel} WhatsApp-এ খোলা হয়েছে — চ্যাটে Send চাপুন।`
          : 'WhatsApp খোলা হয়েছে — চ্যাটে Send চাপুন।',
      type: 'success',
    });

    if (onSuccess) {
      onSuccess(`"${activeRecipient.name}"-এর জন্য WhatsApp খোলা হয়েছে`);
    }
  };

  // Copy all as single text
  const handleCopyAll = async () => {
    if (!messageText.trim()) return;
    maybeSaveCustomRecipient();
    const ok = await copyTextToClipboard(messageText);
    if (ok) {
      logListShare('copy');
      setToastMessage({
        text: 'সম্পূর্ণ তালিকা একসাথে কপি হয়েছে — WhatsApp-এ পেস্ট করে পাঠাতে পারেন।',
        type: 'success',
      });
    } else {
      setToastMessage({
        text: 'কপি করা যায়নি। টেক্সট বক্স থেকে ম্যানুয়ালি কপি করুন।',
        type: 'warning',
      });
    }
  };

  // Messenger share: copy first, show toast, then open m.me/<username-or-id>
  const handleSendMessenger = async () => {
    if (liveStats.duesCount === 0) return;

    if (!fbNorm.isValid || !fbNorm.usernameOrId) {
      setShowFbInputBox(true);
      setToastMessage({
        text: 'Messenger লিংকের জন্য প্রাপকের Facebook username বা ID দিন।',
        type: 'warning',
      });
      return;
    }

    maybeSaveCustomRecipient();

    await copyTextToClipboard(messageText);
    const targetUrl = `https://m.me/${fbNorm.usernameOrId}`;

    logListShare('messenger');
    setToastMessage({
      text: 'মেসেজ কপি হয়েছে — Messenger চ্যাটে Ctrl+V দিয়ে পেস্ট করুন',
      type: 'info',
    });

    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    if (onSuccess) {
      onSuccess(`"${activeRecipient.name}"-এর জন্য Messenger খোলা হয়েছে`);
    }
  };

  const handleToggleRoute = (routeVal: string) => {
    setSelectedRoutes((prev) =>
      prev.includes(routeVal) ? prev.filter((r) => r !== routeVal) : [...prev, routeVal]
    );
  };

  const handleToggleSr = (srId: string) => {
    setSelectedSrIds((prev) =>
      prev.includes(srId) ? prev.filter((id) => id !== srId) : [...prev, srId]
    );
  };

  // Last 10 list shares
  const shareHistory = useMemo(() => {
    return (db.dueMessages || [])
      .filter((m) => m.type === 'list')
      .slice(0, 10);
  }, [db.dueMessages]);

  if (!isOpen) return null;

  const hasValidWaTarget =
    activeRecipient.mode === 'pick_contact' || Boolean(waNorm.normalized);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-bengali">
                বাকি তালিকা পাঠান (সকল বাকি শেয়ার)
              </h2>
              <p className="text-[11px] text-slate-500 font-bengali">
                SR, DSR, TSM বা ম্যানেজারকে WhatsApp বা Messenger-এ এক ক্লিকে বকেয়া তালিকা পাঠান
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
              <span>শেয়ার ইতিহাস ({toBengaliDigits(shareHistory.length)})</span>
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Share History Drawer (last 10 list shares) */}
          {showHistory && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 font-bengali">
                  <History className="h-4 w-4 text-indigo-600" />
                  সর্বশেষ ১০টি তালিকা শেয়ার ইতিহাস
                </h3>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                  লুকান
                </button>
              </div>
              {shareHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 font-bengali">
                  এখনো কোনো তালিকা শেয়ার করা হয়নি।
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-indigo-100 bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-2.5 py-1.5">তারিখ ও সময়</th>
                        <th className="px-2.5 py-1.5">প্রাপক</th>
                        <th className="px-2.5 py-1.5">মাধ্যম</th>
                        <th className="px-2.5 py-1.5">সীমা (Scope)</th>
                        <th className="px-2.5 py-1.5 text-right">মোট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shareHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="px-2.5 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                            {formatMessageDateTime(h.createdAt)}
                          </td>
                          <td className="px-2.5 py-1.5 font-bold text-slate-800">
                            {h.recipientName || h.customerName}
                          </td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                                h.channel === 'whatsapp'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : h.channel === 'messenger'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {h.channel === 'whatsapp'
                                ? 'WhatsApp'
                                : h.channel === 'messenger'
                                ? 'Messenger'
                                : 'কপি'}
                              {h.partNumber ? ` (${h.partNumber})` : ''}
                            </span>
                            <span className="ml-1 text-[10px] text-emerald-700 font-semibold">
                              শেয়ার করা হয়েছে
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-slate-600 max-w-[200px] truncate" title={h.scopeSummary}>
                            {h.scopeSummary || 'সব বাকি'}
                          </td>
                          <td className="px-2.5 py-1.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {currency} {(h.totalOutstanding || 0).toLocaleString('bn-BD')}
                            {h.duesCount ? ` (${toBengaliDigits(h.duesCount)}টি)` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 1. RECIPIENT SELECTION */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
                <Users className="h-4 w-4 text-emerald-600" />
                ১. প্রাপক নির্বাচন করুন (কাকে পাঠাবেন)
              </label>
              <span className="text-[11px] text-slate-500 font-bengali">
                সংরক্ষিত প্রাপক + SR পেজের ফোন নম্বরসমূহ স্বয়ংক্রিয়ভাবে যুক্ত
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select
                  value={selectedRecipientKey}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {savedRecipients.length > 0 && (
                    <optgroup label="সংরক্ষিত প্রাপক তালিকা">
                      {savedRecipients.map((r) => {
                        const desig =
                          r.designation === 'অন্যান্য' && r.customDesignation
                            ? r.customDesignation
                            : r.designation;
                        return (
                          <option key={r.id} value={`saved:${r.id}`}>
                            {r.name} ({desig}) — {r.whatsappNumber || r.phone || 'নম্বর নেই'}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}

                  {staffRecipients.length > 0 && (
                    <optgroup label="SR ও DSR তালিকা (SR পেজ থেকে)">
                      {staffRecipients.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.name} ({s.designation}) — {s.phone}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="অন্যান্য বিকল্প">
                    <option value="custom">অন্য নম্বর (নতুন নম্বর লিখুন)</option>
                    <option value="pick_contact">কন্টাক্ট বেছে নিন (WhatsApp অ্যাপে বাছাই)</option>
                  </optgroup>
                </select>
              </div>

              {/* Active Recipient Phone Status */}
              <div className="flex items-center gap-2">
                {selectedRecipientKey === 'pick_contact' ? (
                  <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-medium">
                    WhatsApp খোলার পর সরাসরি অ্যাপ থেকে কন্টাক্ট বাছাই করতে পারবেন।
                  </div>
                ) : waNorm.normalized ? (
                  <div className="w-full flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      WhatsApp: <span className="font-mono">{waNorm.normalized}</span>
                    </span>
                    {waNorm.isValid ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        সঠিক ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        যাচাই করুন
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        WhatsApp নম্বর নেই
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRecipientChange('pick_contact')}
                        className="text-emerald-700 underline cursor-pointer"
                      >
                        কন্টাক্ট বেছে নিন
                      </button>
                    </div>
                    {selectedRecipientKey !== 'custom' && (
                      <input
                        type="text"
                        value={inlinePhoneOverride}
                        onChange={(e) => setInlinePhoneOverride(e.target.value)}
                        placeholder="01XXXXXXXXX নম্বর লিখুন..."
                        className="w-full rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Number Inputs */}
            {selectedRecipientKey === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    প্রাপকের নাম
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="যেমন: রফিক ভাই"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    পদবী
                  </label>
                  <select
                    value={customDesignation}
                    onChange={(e) =>
                      setCustomDesignation(e.target.value as RecipientDesignation)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {DESIGNATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {customDesignation === 'অন্যান্য' && (
                    <input
                      type="text"
                      value={customDesignationText}
                      onChange={(e) => setCustomDesignationText(e.target.value)}
                      placeholder="পদবী লিখুন..."
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WhatsApp নম্বর
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  {waNorm.warning && customPhone.trim() && (
                    <p className="mt-0.5 text-[10px] text-amber-700">{waNorm.warning}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Facebook (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={customFacebook}
                    onChange={(e) => setCustomFacebook(e.target.value)}
                    placeholder="username বা লিংক"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveCustomToRecipients}
                      onChange={(e) => setSaveCustomToRecipients(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>প্রাপক তালিকায় সেভ করুন</span>
                  </label>
                  {customSavedThisSession && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      ✓ প্রাপক তালিকায় সংরক্ষিত হয়েছে
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Inline Facebook input when Messenger clicked without FB profile */}
            {(showFbInputBox || fbNorm.usernameOrId) && selectedRecipientKey !== 'custom' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200">
                <label className="text-[11px] font-bold text-sky-900 shrink-0">
                  Facebook ইউজারনেম / প্রোফাইল লিংক:
                </label>
                <input
                  type="text"
                  value={inlineFbOverride || activeRecipient.savedRecord?.facebookProfile || ''}
                  onChange={(e) => setInlineFbOverride(e.target.value)}
                  placeholder="যেমন: john.doe বা https://facebook.com/john.doe"
                  className="flex-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs focus:border-sky-500 focus:outline-none"
                />
                {fbNorm.isValid && (
                  <span className="text-[11px] font-mono text-sky-700">
                    m.me/{fbNorm.usernameOrId}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. SCOPE & LIVE COUNTER */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowFiltersPanel((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <Filter className="h-4 w-4 text-rose-600" />
                <span>২. কোন বাকিগুলো পাঠাবেন (ফিল্টার ও সীমা)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({showFiltersPanel ? 'লুকান' : 'দেখুন'})
                </span>
              </button>

              {/* Live Count Badge */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-900">
                <span>{toBengaliDigits(liveStats.duesCount)} টি বাকি,</span>
                <span>{toBengaliDigits(liveStats.customerCount)} জন কাস্টমার,</span>
                <span className="text-rose-700 font-extrabold">
                  মোট {currency}
                  {liveStats.totalAmount.toLocaleString('bn-BD')}
                </span>
              </div>
            </div>

            {showFiltersPanel && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Route multi-select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      রুট (একাধিক বাছাই করা যাবে):
                    </span>
                    {selectedRoutes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedRoutes([])}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        সব রুট নিন
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedRoutes([])}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        selectedRoutes.length === 0
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      সকল রুট
                    </button>
                    {availableRoutes.map((route) => {
                      const active = selectedRoutes.includes(route);
                      return (
                        <button
                          key={route}
                          type="button"
                          onClick={() => handleToggleRoute(route)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {route}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleToggleRoute('no_route')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        selectedRoutes.includes('no_route')
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      রুট উল্লেখ নেই
                    </button>
                  </div>
                </div>

                {/* SR multi-select */}
                {(db.salesRepresentatives || []).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">
                        এসআর (SR — একাধিক বাছাই করা যাবে):
                      </span>
                      {selectedSrIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedSrIds([])}
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          সব এসআর নিন
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedSrIds([])}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          selectedSrIds.length === 0
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        সকল SR
                      </button>
                      {(db.salesRepresentatives || []).map((sr) => {
                        const active = selectedSrIds.includes(sr.id);
                        return (
                          <button
                            key={sr.id}
                            type="button"
                            onClick={() => handleToggleSr(sr.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                              active
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {sr.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Min due amount & search */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      ন্যূনতম বকেয়া (খালি = কোনো সীমা নেই)
                    </label>
                    <input
                      type="text"
                      value={minDueInput}
                      onChange={(e) => setMinDueInput(e.target.value)}
                      placeholder="যেমন: ৫০০ টাকার বেশি হলে লিখুন 500"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      সার্চ (নাম, দোকান, ফোন বা বাকি নং)
                    </label>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="কাস্টমার বা বাকি নং খুঁজুন..."
                        className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. FORMAT OPTIONS */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block font-bengali">
              ৩. মেসেজ সাজানোর ধরন (Format)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Group by route */}
              <label className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={groupByRoute}
                  onChange={(e) => {
                    setGroupByRoute(e.target.checked);
                    setIsManuallyEdited(false);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>রুট অনুযায়ী গ্রুপ</span>
              </label>

              {/* Individual vs Combine by customer */}
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCombineByCustomer(false);
                    setIsManuallyEdited(false);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    !combineByCustomer
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  প্রতি বাকি আলাদা লাইন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCombineByCustomer(true);
                    setIsManuallyEdited(false);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    combineByCustomer
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  কাস্টমার অনুযায়ী একত্র
                </button>
              </div>

              {/* Sort selector */}
              <div className="inline-flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600">সাজান:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as 'due_no' | 'amount_desc' | 'name');
                    setIsManuallyEdited(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="due_no">বাকি নং</option>
                  <option value="amount_desc">টাকা বেশি থেকে কম</option>
                  <option value="name">নাম</option>
                </select>
              </div>

              {/* Include mobile number */}
              <label className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePhone}
                  onChange={(e) => {
                    setIncludePhone(e.target.checked);
                    setIsManuallyEdited(false);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>মোবাইল নম্বর সহ</span>
              </label>

              {/* Summary only */}
              <label className="inline-flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={summaryOnly}
                  onChange={(e) => {
                    setSummaryOnly(e.target.checked);
                    setIsManuallyEdited(false);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>শুধু সারসংক্ষেপ</span>
              </label>
            </div>
          </div>

          {/* 4. LIVE MESSAGE PREVIEW & EDIT */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                ৪. মেসেজ প্রিভিউ (পাঠানোর আগে সম্পাদনা করতে পারবেন)
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
                  onClick={handleRefreshMessage}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            {liveStats.duesCount === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-bold text-amber-900">
                বর্তমান ফিল্টার অনুযায়ী কোনো বকেয়া বাকি নেই।
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

          {/* Toast message inside modal */}
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

          {/* Very long list (> 4 parts) PDF Print Preview Tip */}
          {messageParts.length > 4 && (
            <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-sky-950 font-medium leading-relaxed">
                বড় তালিকা হলে প্রিন্ট প্রিভিউ থেকে ব্রাউজারের প্রিন্ট ডায়ালগে PDF সেভ করে
                WhatsApp-এ ফাইল হিসেবে দিন।
              </div>
              {onOpenPrintPreviewWithScope && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenPrintPreviewWithScope({
                      routes: selectedRoutes,
                      srIds: selectedSrIds,
                      minAmount: minAmountParsed,
                      search: searchQuery.trim(),
                      groupByRoute,
                      combineByCustomer,
                      sortBy,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-800 shrink-0 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>প্রিন্ট প্রিভিউ খুলুন</span>
                </button>
              )}
            </div>
          )}

          {/* Multi-part split instructions & buttons */}
          {liveStats.duesCount > 0 && messageParts.length > 1 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-950">
                  তালিকাটি {toBengaliDigits(messageParts.length)} টি নিরাপদ অংশে ভাগ হয়েছে — প্রতিটি অংশে Send চাপতে হবে।
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  খোলা হয়েছে: {toBengaliDigits(clickedPartIndices.length)}/
                  {toBengaliDigits(messageParts.length)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {messageParts.map((part) => {
                  const isOpened = clickedPartIndices.includes(part.partIndex);
                  return (
                    <button
                      key={part.partIndex}
                      type="button"
                      disabled={!hasValidWaTarget}
                      onClick={() =>
                        handleSendWhatsAppPart(
                          part.partIndex,
                          part.partLabel,
                          part.text
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isOpened
                          ? 'bg-emerald-100 border border-emerald-400 text-emerald-900'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {isOpened ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-700" />
                          <span>{part.partLabel} — খোলা হয়েছে ✓</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>{part.partLabel} পাঠান</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Action Bar */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Single-part WhatsApp send button */}
            {messageParts.length <= 1 && (
              <button
                type="button"
                disabled={liveStats.duesCount === 0 || !hasValidWaTarget}
                onClick={() =>
                  handleSendWhatsAppPart(1, '১/১', messageParts[0]?.text || messageText)
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span>
                  {activeRecipient.mode === 'pick_contact'
                    ? 'কন্টাক্ট বেছে WhatsApp-এ পাঠান'
                    : 'WhatsApp-এ পাঠান'}
                </span>
                <ExternalLink className="h-3.5 w-3.5 opacity-80" />
              </button>
            )}

            {/* Copy all as one text */}
            <button
              type="button"
              disabled={liveStats.duesCount === 0}
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4 text-slate-600" />
              <span>সব একসাথে কপি করুন</span>
            </button>

            {/* Messenger button */}
            <button
              type="button"
              disabled={liveStats.duesCount === 0}
              onClick={handleSendMessenger}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Messenger-এ পাঠান</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
