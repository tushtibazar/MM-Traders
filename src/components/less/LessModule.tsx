import React, { useState, useMemo } from 'react';
import {
  Coins,
  Check,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Search,
  Building2,
  Receipt,
  ShieldCheck,
  KeyRound,
  ArrowDownLeft,
  History,
  AlertCircle,
  AlertTriangle,
  Users,
  Filter,
  Eye,
  ImageDown,
  FileDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessEntry, LessSettlement } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';
import { LessPrintPreviewModal } from './LessPrintPreviewModal';
import { formatDate } from '../../utils/dateUtils';

export const LessModule: React.FC = () => {
  const {
    db,
    currentUser,
    updateLessStatus,
    deleteLessEntry,
    addLessSettlement,
    deleteLessSettlement,
    todayDateStr,
    todayLessAmount,
    totalOutstandingLess,
    totalAllTimeLess,
  } = useApp();

  const currency = db.settings.currency || '৳';
  const ownerPin =
    db.settings.ownerPin ||
    db.settings.securityPin ||
    db.users.find((u) => u.role === 'owner')?.pin ||
    '1234';

  // 1. Month Filter State (for monthly view & monthly total)
  const currentMonthStr = todayDateStr.slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // 2. Search & Status Filter for Less Entries
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reimbursed'>('all');

  // 3. Less Settlement (লেস জমা) Form State
  const [settlementDate, setSettlementDate] = useState<string>(todayDateStr);
  const [settlementAmount, setSettlementAmount] = useState<number | ''>('');
  const [settlementNote, setSettlementNote] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // 4. PIN Prompt Modal State for Settlement Confirmation
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingSettlement, setPendingSettlement] = useState<{
    date: string;
    amount: number;
    note?: string;
  } | null>(null);

  // 5. Delete Settlement PIN Modal State
  const [settlementToDelete, setSettlementToDelete] = useState<LessSettlement | null>(null);
  const [isDeleteSettlementPinOpen, setIsDeleteSettlementPinOpen] = useState(false);

  // 6. Print & Export Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printAction, setPrintAction] = useState<'png' | 'pdf' | null>(null);

  // 7. Short (ঘাটতি) Column State & Filters
  const [shortDsrFilter, setShortDsrFilter] = useState<string>('all');
  const [shortSearchQuery, setShortSearchQuery] = useState<string>('');

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

  // --- Calculations ---

  // All settlements list
  const settlements = useMemo(() => {
    return [...(db.lessSettlements || [])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [db.lessSettlements]);

  // Total All-Time Settlements
  const totalSettlementsAmount = useMemo(() => {
    return (db.lessSettlements || []).reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );
  }, [db.lessSettlements]);

  // Net Outstanding Less: Total Less accumulated − Total Less Settlements made
  const netOutstandingLess = useMemo(() => {
    return Math.max(0, totalAllTimeLess - totalSettlementsAmount);
  }, [totalAllTimeLess, totalSettlementsAmount]);

  // Date-wise Less entries filtered by selected month, search, and status
  const filteredEntries = useMemo(() => {
    return (db.lessEntries || [])
      .filter((item) => {
        if (selectedMonth && !item.date.startsWith(selectedMonth)) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchDate = item.date.includes(q) || formatDate(item.date).includes(q);
          const matchNote = (item.note || '').toLowerCase().includes(q);
          if (!matchDesc && !matchDate && !matchNote) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.lessEntries, selectedMonth, statusFilter, searchQuery]);

  // Monthly Total of Less entries for the selected month
  const monthlyTotalLess = useMemo(() => {
    return (db.lessEntries || [])
      .filter((item) => !selectedMonth || item.date.startsWith(selectedMonth))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [db.lessEntries, selectedMonth]);

  // Monthly Total Settlements for the selected month
  const monthlyTotalSettlements = useMemo(() => {
    return (db.lessSettlements || [])
      .filter((s) => !selectedMonth || s.date.startsWith(selectedMonth))
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  }, [db.lessSettlements, selectedMonth]);

  // --- SHORT (ঘাটতি) Calculations pulled automatically from Daily হিসাব sheets ---
  const allShortRecords = useMemo(() => {
    const list: Array<{
      id: string;
      sheetId: string;
      sheetNo?: string;
      date: string;
      dsrName: string;
      dsrId?: string;
      routeOrVan?: string;
      srName?: string;
      amount: number;
    }> = [];

    (db.dailySheets || []).forEach((sheet) => {
      const amt = Number(sheet.shortAmount ?? sheet.dailyShort ?? 0);
      if (amt > 0) {
        list.push({
          id: `short-${sheet.id}`,
          sheetId: sheet.id,
          sheetNo: sheet.sheetNo || sheet.id,
          date: sheet.date,
          dsrName: sheet.dsrName?.trim() || 'অনির্দিষ্ট DSR',
          dsrId: sheet.dsrId,
          routeOrVan: sheet.routeOrVan,
          srName: sheet.srName,
          amount: amt,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.dailySheets]);

  // Unique list of DSRs for filter
  const availableDsrList = useMemo(() => {
    const names = new Set<string>();
    (db.deliveryRepresentatives || []).forEach((d) => {
      if (d.name?.trim()) names.add(d.name.trim());
    });
    allShortRecords.forEach((r) => {
      if (r.dsrName && r.dsrName !== 'অনির্দিষ্ট DSR') names.add(r.dsrName);
    });
    return Array.from(names);
  }, [db.deliveryRepresentatives, allShortRecords]);

  // Filtered Short records by selectedMonth, DSR filter, and search query
  const filteredShortRecords = useMemo(() => {
    return allShortRecords.filter((item) => {
      if (selectedMonth && !item.date.startsWith(selectedMonth)) return false;
      if (shortDsrFilter !== 'all' && item.dsrName !== shortDsrFilter) return false;
      if (shortSearchQuery.trim()) {
        const q = shortSearchQuery.toLowerCase();
        const matchDate = item.date.includes(q) || formatDate(item.date).includes(q);
        const matchDsr = item.dsrName.toLowerCase().includes(q);
        const matchRoute = (item.routeOrVan || '').toLowerCase().includes(q);
        if (!matchDate && !matchDsr && !matchRoute) return false;
      }
      return true;
    });
  }, [allShortRecords, selectedMonth, shortDsrFilter, shortSearchQuery]);

  // Monthly Total Short (এই মাসের মোট শর্ট)
  const monthlyTotalShort = useMemo(() => {
    return allShortRecords
      .filter((item) => !selectedMonth || item.date.startsWith(selectedMonth))
      .reduce((sum, item) => sum + item.amount, 0);
  }, [allShortRecords, selectedMonth]);

  // Filtered Total Short
  const filteredTotalShort = useMemo(() => {
    return filteredShortRecords.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredShortRecords]);

  // DSR summaries for tracking and breakdown over time
  const dsrShortSummaries = useMemo(() => {
    const map: Record<string, { allTimeTotal: number; count: number; monthlyTotal: number }> = {};
    allShortRecords.forEach((r) => {
      const dsr = r.dsrName;
      if (!map[dsr]) {
        map[dsr] = { allTimeTotal: 0, count: 0, monthlyTotal: 0 };
      }
      map[dsr].allTimeTotal += r.amount;
      map[dsr].count += 1;
      if (selectedMonth && r.date.startsWith(selectedMonth)) {
        map[dsr].monthlyTotal += r.amount;
      }
    });
    return map;
  }, [allShortRecords, selectedMonth]);

  // Handle Form Submit for লেস জমা
  const handleInitiateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numericAmount = Number(settlementAmount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError('সঠিক জমার পরিমাণ (টাকা) লিখুন');
      return;
    }

    setPendingSettlement({
      date: settlementDate,
      amount: numericAmount,
      note: settlementNote.trim() || undefined,
    });
    setIsPinModalOpen(true);
  };

  // Called when PIN is verified successfully
  const handleConfirmSettlement = () => {
    if (!pendingSettlement) return;

    try {
      addLessSettlement({
        date: pendingSettlement.date,
        amount: pendingSettlement.amount,
        note: pendingSettlement.note,
      });

      setSuccessMessage(
        `লেস জমা সফলভাবে সম্পন্ন হয়েছে: ${currency} ${pendingSettlement.amount.toLocaleString()} (তারিখ: ${formatDate(pendingSettlement.date)})`
      );
      setSettlementAmount('');
      setSettlementNote('');
      setPendingSettlement(null);
      setIsPinModalOpen(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setFormError(err.message || 'লেস জমা সংরক্ষণ করতে সমস্যা হয়েছে');
      setIsPinModalOpen(false);
    }
  };

  // Toggle status of a less entry
  const handleToggleStatus = (entry: LessEntry) => {
    const nextStatus = entry.status === 'pending' ? 'reimbursed' : 'pending';
    updateLessStatus(
      entry.id,
      nextStatus,
      nextStatus === 'reimbursed' ? todayDateStr : undefined
    );
  };

  // Confirm delete of a settlement
  const handleConfirmDeleteSettlement = () => {
    if (!settlementToDelete) return;
    deleteLessSettlement(settlementToDelete.id);
    setIsDeleteSettlementPinOpen(false);
    setSettlementToDelete(null);
    setSuccessMessage('লেস জমা রেকর্ড মুছে ফেলা হয়েছে');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div id="less-account-module" className="space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                লেস হিসাব (Less Account)
              </h1>
              <span className="rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 border border-amber-300">
                মালিকানা খতিয়ান
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 font-bengali">
              Daily হিসাব থেকে স্বয়ংক্রিয় লেস অন্তর্ভুক্তি, লেস জমা (Settlement) ও নিট বকেয়া লেস হিসাব
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenPrintPreview(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition shadow-xs cursor-pointer"
            title="লেস হিসাব প্রিন্ট প্রিভিউ দেখুন"
          >
            <Eye className="h-4 w-4 text-sky-600" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>
        </div>
      </div>

      {/* TOP SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: নিট বকেয়া লেস (Net Outstanding Less) - Highlighted */}
        <div className="rounded-xl bg-linear-to-br from-rose-50 via-white to-amber-50/40 p-4 border-2 border-rose-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 font-bengali">
              নিট বকেয়া লেস (Net Outstanding)
            </span>
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <span className="text-xl sm:text-2xl font-black font-mono text-rose-900 mt-2 block">
            {currency} {netOutstandingLess.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 font-bengali mt-1 block">
            (সর্বমোট লেস - মোট লেস জমা)
          </span>
        </div>

        {/* Metric 2: সর্বমোট লেস (All-Time Less) */}
        <div className="rounded-xl bg-white p-4 border border-amber-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-800 font-bengali block">
            সর্বমোট অর্জিত লেস (Daily হিসাব)
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-950 mt-2 block">
            {currency} {totalAllTimeLess.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 font-bengali mt-1 block">
            সকল Daily হিসাবের মোট লেস
          </span>
        </div>

        {/* Metric 3: মোট লেস জমা (Total Settlements) */}
        <div className="rounded-xl bg-white p-4 border border-emerald-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 font-bengali block">
            মোট লেস জমা / পরিশোধ (Settlements)
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-900 mt-2 block">
            {currency} {totalSettlementsAmount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 font-bengali mt-1 block">
            মোট {settlements.length} টি জমা এন্ট্রি
          </span>
        </div>

        {/* Metric 4: নির্বাচিত মাসের লেস */}
        <div className="rounded-xl bg-white p-4 border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 font-bengali block">
              নির্বাচিত মাসের লেস
            </span>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
              {selectedMonth || 'সকল'}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-bold font-mono text-blue-900 mt-2 block">
            {currency} {monthlyTotalLess.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 font-bengali mt-1 block">
            মাসের মোট জমা: {currency} {monthlyTotalSettlements.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3.5 text-xs text-emerald-900 font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {formError && (
        <div className="rounded-xl bg-rose-50 border border-rose-300 p-3.5 text-xs text-rose-900 font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* SECTION 3: লেস জমা (LESS SETTLEMENT / DEPOSIT) SYSTEM */}
      <div className="rounded-xl border-2 border-emerald-300 bg-linear-to-r from-emerald-50/60 via-white to-emerald-50/40 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-950 font-bengali">
                লেস জমা (Less Settlement)
              </h2>
              <p className="text-xs text-emerald-800 font-bengali">
                কোম্পানি বা ডিলারের কাছ থেকে লেস বাবদ প্রাপ্ত অর্থ জমা দিন — এটি নিট বকেয়া লেস হ্রাস করবে
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-900 font-semibold bg-emerald-100/80 px-3 py-1 rounded-lg border border-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>নিরাপদ ওনার পিন (PIN) দ্বারা সংরক্ষিত</span>
          </div>
        </div>

        <form onSubmit={handleInitiateSettlement} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* তারিখ (Date) */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
              তারিখ (Date) *
            </label>
            <input
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:outline-hidden"
              required
            />
          </div>

          {/* জমার পরিমাণ (Settlement Amount) */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
              জমার পরিমাণ (Amount) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700 font-mono">
                {currency}
              </span>
              <input
                type="number"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value ? Number(e.target.value) : '')}
                placeholder="যেমন: ৫০০০"
                min="1"
                step="any"
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm font-bold font-mono text-emerald-950 focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* নোট (Note) */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
              নোট / রেফারেন্স (Note - ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
              placeholder="যেমন: কোম্পানি চেক নং / ক্যাশ ভাউচার বা মন্তব্য..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Submit Button */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-98 transition cursor-pointer shadow-xs"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>জমা করুন</span>
            </button>
          </div>
        </form>

        {/* Real-time Preview */}
        {settlementAmount !== '' && Number(settlementAmount) > 0 && (
          <div className="rounded-lg bg-white p-3 border border-emerald-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-700">
            <div className="flex items-center gap-4">
              <span>
                বর্তমান বকেয়া লেস: <strong className="font-mono text-rose-700">{currency} {netOutstandingLess.toLocaleString()}</strong>
              </span>
              <span>
                নতুন জমা: <strong className="font-mono text-emerald-700">+{currency} {Number(settlementAmount).toLocaleString()}</strong>
              </span>
            </div>
            <div>
              জমার পর নিট বকেয়া লেস হবে:{' '}
              <strong className="font-mono text-base text-rose-800 font-black">
                {currency} {Math.max(0, netOutstandingLess - Number(settlementAmount)).toLocaleString()}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3B: লেস জমা খতিয়ান / ইতিহাস (SETTLEMENT HISTORY) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 font-bengali">
              লেস জমা খতিয়ান ও ইতিহাস (Settlement History)
            </h3>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
              মোট {settlements.length} টি
            </span>
          </div>

          <div className="text-xs text-slate-600 font-bengali">
            সর্বমোট জমা: <strong className="font-mono font-bold text-emerald-700">{currency} {totalSettlementsAmount.toLocaleString()}</strong>
          </div>
        </div>

        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-3">জমার তারিখ</th>
                <th className="py-2.5 px-3">নোট / রেফারেন্স</th>
                <th className="py-2.5 px-3 text-right">জমার পরিমাণ ({currency})</th>
                <th className="py-2.5 px-3">এন্ট্রি সময় / গ্রহণকারী</th>
                <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settlements.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap font-mono">
                    {formatDate(item.date)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {item.note || <span className="text-slate-400 italic">কোন নোট নেই</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-sm whitespace-nowrap font-mono text-emerald-700">
                    {currency} {item.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                    {item.createdBy || 'মালিক'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSettlementToDelete(item);
                        setIsDeleteSettlementPinOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="এই জমা এন্ট্রিটি মুছুন (PIN আবশ্যক)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {settlements.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-bengali">
                    এখনও কোন লেস জমা (Settlement) রেকর্ড করা হয়নি। উপরে ফরম পূরণ করে জমা দিন।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: TWO-COLUMN LAYOUT — লেস (LEFT) + শর্ট (RIGHT) SIDE BY SIDE */}
      <div className="space-y-4">
        {/* Month Selector Bar Synchronized Across Both Columns */}
        <div className="rounded-xl border border-slate-200 bg-linear-to-r from-amber-50/50 via-white to-orange-50/50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-bengali">
                মাস নির্বাচন ও সমন্বিত সারসংক্ষেপ (Monthly Filter)
              </h3>
              <p className="text-xs text-slate-500 font-bengali">
                নির্বাচিত মাসের ভিত্তিতে লেস এবং শর্ট উভয় কলাম একসাথে সমন্বিত হবে
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 font-bengali">মাস:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-mono font-bold text-slate-900 focus:outline-none bg-transparent cursor-pointer"
              />
              {selectedMonth && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('')}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer ml-1"
                >
                  সকল মাস
                </button>
              )}
            </div>

            {/* Quick Summary Pill for Current Month */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-md">
                মোট লেস: {currency} {monthlyTotalLess.toLocaleString()}
              </span>
              <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2.5 py-1 rounded-md">
                মোট শর্ট: {currency} {monthlyTotalShort.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN GRID: Stacks on mobile/tablet, side-by-side on lg screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ============================================================ */}
          {/* LEFT COLUMN: লেস (Existing date-wise লেস list + monthly total) */}
          {/* ============================================================ */}
          <div className="rounded-xl border border-amber-200 bg-white shadow-xs overflow-hidden flex flex-col">
            {/* Left Header */}
            <div className="p-4 border-b border-amber-200 bg-amber-50/60 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-bengali">
                      লেস তালিকা (Less Account)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bengali">
                      Daily হিসাবের ৪ নম্বর আইটেম (লেস) থেকে সংগৃহীত
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-bengali block">মোট লেস (এই মাসে)</span>
                  <span className="font-mono font-black text-sm text-amber-950">
                    {currency} {monthlyTotalLess.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status and Search Filters */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-amber-200/60">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    সব
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-rose-700 text-white'
                        : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    বকেয়া
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('reimbursed')}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      statusFilter === 'reimbursed'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    ফেরত
                  </button>
                </div>

                <div className="relative flex-1 min-w-[140px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="লেস বিবরণ বা তারিখ..."
                    className="w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Left Table: Date-wise লেস */}
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">বিবরণ</th>
                    <th className="py-2.5 px-3 text-right">লেস ({currency})</th>
                    <th className="py-2.5 px-2 text-center">স্ট্যাটাস</th>
                    <th className="py-2.5 px-2 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap font-mono">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[150px] sm:max-w-xs" title={item.description}>
                          {item.description}
                        </div>
                        {item.note && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px] font-bengali">
                            {item.note}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-xs sm:text-sm whitespace-nowrap">
                        <span className={item.status === 'pending' ? 'text-rose-700 font-mono' : 'text-emerald-700 font-mono'}>
                          {currency} {item.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                            item.status === 'pending'
                              ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                          }`}
                          title="স্ট্যাটাস পরিবর্তন করুন"
                        >
                          {item.status === 'pending' ? (
                            <span>বকেয়া</span>
                          ) : (
                            <span>ফেরত</span>
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `আপনি কি নিশ্চিতভাবে এই লেস এন্ট্রিটি (${currency} ${item.amount.toLocaleString()}) মুছে ফেলতে চান?`
                              )
                            ) {
                              deleteLessEntry(item.id);
                            }
                          }}
                          className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="মুছুন"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 font-bengali">
                        {selectedMonth
                          ? `${selectedMonth} মাসে কোনো লেস এন্ট্রি পাওয়া যায়নি`
                          : 'কোনো লেস এন্ট্রি পাওয়া যায়নি'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Left Footer: Monthly Total of Less */}
            <div className="p-3 border-t-2 border-amber-200 bg-amber-50/70 flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="font-bengali">
                {selectedMonth ? `${selectedMonth} মাসের মোট লেস:` : 'মোট লেস:'}
              </span>
              <span className="font-mono text-base font-black text-amber-950">
                {currency}{' '}
                {filteredEntries
                  .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: শর্ট (Short) — Date-wise list | তারিখ | DSR | শর্ট | */}
          {/* ============================================================ */}
          <div className="rounded-xl border border-orange-200 bg-white shadow-xs overflow-hidden flex flex-col">
            {/* Right Header */}
            <div className="p-4 border-b border-orange-200 bg-orange-50/60 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-orange-100 text-orange-800">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-bengali">
                      শর্ট তালিকা (Shortage by DSR)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bengali">
                      Daily হিসাবের ৫ নম্বর আইটেম (শর্ট) থেকে স্বয়ংক্রিয়ভাবে সংগৃহীত
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-bengali block">মোট শর্ট (এই মাসে)</span>
                  <span className="font-mono font-black text-sm text-orange-950">
                    {currency} {monthlyTotalShort.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* DSR Filter Dropdown and Search */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-orange-200/60">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 font-bengali">DSR:</span>
                  <select
                    value={shortDsrFilter}
                    onChange={(e) => setShortDsrFilter(e.target.value)}
                    className="rounded-md border border-orange-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:border-orange-500 focus:outline-none cursor-pointer"
                  >
                    <option value="all">সকল DSR ({allShortRecords.length} টি শর্ট)</option>
                    {availableDsrList.map((dsrName) => {
                      const summary = dsrShortSummaries[dsrName];
                      const amountStr = summary ? ` (${currency} ${summary.allTimeTotal.toLocaleString()})` : '';
                      return (
                        <option key={dsrName} value={dsrName}>
                          {dsrName}{amountStr}
                        </option>
                      );
                    })}
                  </select>
                  {shortDsrFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setShortDsrFilter('all')}
                      className="text-[11px] text-orange-700 hover:text-orange-900 underline font-bold cursor-pointer"
                    >
                      রিসেট
                    </button>
                  )}
                </div>

                <div className="relative flex-1 min-w-[140px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    value={shortSearchQuery}
                    onChange={(e) => setShortSearchQuery(e.target.value)}
                    placeholder="তারিখ বা DSR খুঁজুন..."
                    className="w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 py-1 text-xs text-slate-800 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Right Table: Exact Columns | তারিখ (Date) | DSR | শর্ট (Amount) | */}
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">তারিখ (Date)</th>
                    <th className="py-2.5 px-3">DSR</th>
                    <th className="py-2.5 px-4 text-right">শর্ট (Amount) ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShortRecords.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-orange-50/40 transition">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatDate(item.date)}</span>
                        </div>
                        {item.sheetNo && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            শিট: {item.sheetNo}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 bg-orange-50 border border-orange-200 text-orange-950 px-2 py-0.5 rounded text-xs">
                            {item.dsrName}
                          </span>
                          {item.routeOrVan && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.routeOrVan}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-xs sm:text-sm text-orange-800 whitespace-nowrap">
                        {currency} {item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {filteredShortRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 font-bengali">
                        {selectedMonth
                          ? `${selectedMonth} মাসে কোনো শর্ট রেকর্ড পাওয়া যায়নি`
                          : shortDsrFilter !== 'all'
                          ? `DSR "${shortDsrFilter}" এর কোনো শর্ট রেকর্ড নেই`
                          : 'কোনো শর্ট রেকর্ড নেই (Daily হিসাবের ৫ নম্বর শর্ট আইটেমে এন্ট্রি দিলে এখানে স্বয়ংক্রিয়ভাবে দেখাবে)'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right Footer: Monthly Total of Short */}
            <div className="p-3 border-t-2 border-orange-200 bg-orange-50/70 flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="font-bengali">
                {shortDsrFilter !== 'all'
                  ? `DSR [${shortDsrFilter}] মোট শর্ট:`
                  : selectedMonth
                  ? `মোট শর্ট (এই মাসে):`
                  : 'মোট শর্ট:'}
              </span>
              <span className="font-mono text-base font-black text-orange-950">
                {currency} {filteredTotalShort.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* DSR Lifetime & Monthly Short Summary Pills */}
        {Object.keys(dsrShortSummaries).length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-orange-600" />
                <span>DSR ভিত্তিক মোট শর্ট ওভারভিউ (ক্লিক করে ফিল্টার করুন):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                মোট {Object.keys(dsrShortSummaries).length} জন DSR এর শর্ট রেকর্ড রয়েছে
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dsrShortSummaries).map(([dsrName, sum]) => (
                <button
                  key={dsrName}
                  type="button"
                  onClick={() => setShortDsrFilter(shortDsrFilter === dsrName ? 'all' : dsrName)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    shortDsrFilter === dsrName
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-orange-50 hover:border-orange-300'
                  }`}
                >
                  <span className="font-bold">{dsrName}</span>
                  <span className="font-mono text-[11px] opacity-90">
                    সর্বমোট: {currency} {sum.allTimeTotal.toLocaleString()}
                  </span>
                  {selectedMonth && sum.monthlyTotal > 0 && (
                    <span className="text-[10px] bg-white/20 px-1 rounded">
                      এই মাসে: {currency} {sum.monthlyTotal.toLocaleString()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: FINAL NET/OUTSTANDING লেস BALANCE SUMMARY BANNER */}
      <div className="rounded-xl border-2 border-rose-300 bg-linear-to-r from-rose-50 via-white to-amber-50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800 font-bengali block">
              চূড়ান্ত সমন্বিত হিসাব (Running Balance)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-bengali mt-0.5">
              নিট বকেয়া লেস (Net Outstanding Less)
            </h2>
            <p className="text-xs text-slate-600 font-bengali mt-1">
              সর্বমোট অর্জিত লেস ({currency} {totalAllTimeLess.toLocaleString()}) − সর্বমোট লেস জমা ({currency} {totalSettlementsAmount.toLocaleString()}) = নিট পাওনা
            </p>
          </div>

          <div className="text-left md:text-right bg-white px-6 py-4 rounded-xl border-2 border-rose-300 shadow-xs">
            <span className="text-xs font-semibold text-rose-700 block font-bengali">
              বর্তমান নিট বকেয়া লেস ব্যালেন্স
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-900 mt-1 block">
              {currency} {netOutstandingLess.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-700 font-bengali block mt-0.5">
              ● লাইভ আপডেট সক্রিয়
            </span>
          </div>
        </div>
      </div>

      {/* PIN Prompt Modal for Less Settlement (লেস জমা) */}
      <PinPromptModal
        isOpen={isPinModalOpen}
        title="লেস জমা নিশ্চিতকরণ (PIN দিন)"
        subtitle="কোম্পানি/ডিলারের প্রাপ্ত লেস বাবদ টাকা জমা নিশ্চিত করতে আপনার ওনার পিন (PIN) লিখুন।"
        itemName={
          pendingSettlement
            ? `${formatDate(pendingSettlement.date)} তারিখে ${currency} ${pendingSettlement.amount.toLocaleString()}${
                pendingSettlement.note ? ` (${pendingSettlement.note})` : ''
              }`
            : ''
        }
        correctPin={ownerPin}
        confirmButtonText="হ্যাঁ, লেস জমা করুন"
        confirmButtonVariant="success"
        onSuccess={handleConfirmSettlement}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingSettlement(null);
        }}
      />

      {/* PIN Prompt Modal for Delete Settlement */}
      <PinPromptModal
        isOpen={isDeleteSettlementPinOpen}
        title="লেস জমা রেকর্ড মুছে ফেলার নিশ্চিতকরণ"
        subtitle="এই জমা রেকর্ডটি মুছে ফেললে নিট বকেয়া লেস সমপরিমাণ বৃদ্ধি পাবে। নিশ্চিত করতে ওনার পিন দিন।"
        itemName={
          settlementToDelete
            ? `${formatDate(settlementToDelete.date)} তারিখে জমা ${currency} ${settlementToDelete.amount.toLocaleString()}`
            : ''
        }
        correctPin={ownerPin}
        confirmButtonText="হ্যাঁ, মুছে ফেলুন"
        confirmButtonVariant="danger"
        onSuccess={handleConfirmDeleteSettlement}
        onClose={() => {
          setIsDeleteSettlementPinOpen(false);
          setSettlementToDelete(null);
        }}
      />

      {/* Less Account Print & Export Preview Modal */}
      <LessPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={db.settings}
        currency={currency}
        entries={filteredEntries}
        settlements={settlements}
        selectedMonth={selectedMonth}
        totalLess={monthlyTotalLess || totalAllTimeLess}
        totalSettlement={monthlyTotalSettlements || totalSettlementsAmount}
        netOutstanding={netOutstandingLess}
        initialAction={printAction}
      />
    </div>
  );
};
