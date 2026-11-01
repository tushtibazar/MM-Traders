import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  History,
  Printer,
  Calendar,
  Filter,
  PlusCircle,
  AlertTriangle,
  Lock,
  Ban,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import { toEnglishDigits } from '../../utils/dueUtils';
import { UniversalPrintPreviewModal } from './UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { CashAdjustment } from '../../types';

interface CashAdjustmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewAdjustment: () => void;
}

type DateFilterType = 'today' | 'this-month' | 'last-month' | 'all' | 'custom';

export const CashAdjustmentHistoryModal: React.FC<CashAdjustmentHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenNewAdjustment,
}) => {
  const { db, cashAdjustments, voidCashAdjustment, todayDateStr, cashBalance, currentUser } =
    useApp();
  const currency = db.settings.currency || '৳';

  // Filters
  const [filterType, setFilterType] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState(todayDateStr);
  const [customEndDate, setCustomEndDate] = useState(todayDateStr);

  // Voiding state
  const [voidTarget, setVoidTarget] = useState<CashAdjustment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidPin, setVoidPin] = useState('');
  const [voidError, setVoidError] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Print Preview state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Success message toast
  const [toastMessage, setToastMessage] = useState('');

  // Date range calculation
  const { filteredAdjustments, summary } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Format YYYY-MM-DD
    const pad = (n: number) => n.toString().padStart(2, '0');

    const thisMonthStart = `${currentYear}-${pad(currentMonth + 1)}-01`;
    const lastDayOfThisMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const thisMonthEnd = `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDayOfThisMonth)}`;

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthNum = lastMonthDate.getMonth();
    const lastMonthStart = `${lastMonthYear}-${pad(lastMonthNum + 1)}-01`;
    const lastDayOfLastMonth = new Date(lastMonthYear, lastMonthNum + 1, 0).getDate();
    const lastMonthEnd = `${lastMonthYear}-${pad(lastMonthNum + 1)}-${pad(lastDayOfLastMonth)}`;

    const all = cashAdjustments || [];

    const filtered = all.filter((adj) => {
      if (filterType === 'today') {
        return adj.date === todayDateStr;
      }
      if (filterType === 'this-month') {
        return adj.date >= thisMonthStart && adj.date <= thisMonthEnd;
      }
      if (filterType === 'last-month') {
        return adj.date >= lastMonthStart && adj.date <= lastMonthEnd;
      }
      if (filterType === 'custom') {
        const start = customStartDate || '1970-01-01';
        const end = customEndDate || '2099-12-31';
        return adj.date >= start && adj.date <= end;
      }
      return true; // 'all'
    });

    // Summary calculations (only active count towards cash totals)
    let totalIncreased = 0;
    let totalDecreased = 0;
    let activeCount = 0;
    let voidedCount = 0;

    filtered.forEach((adj) => {
      if (adj.status === 'active') {
        activeCount++;
        if (adj.amount > 0) {
          totalIncreased += adj.amount;
        } else if (adj.amount < 0) {
          totalDecreased += Math.abs(adj.amount);
        }
      } else {
        voidedCount++;
      }
    });

    const netAdjustment = totalIncreased - totalDecreased;

    return {
      filteredAdjustments: filtered,
      summary: {
        totalIncreased,
        totalDecreased,
        netAdjustment,
        activeCount,
        voidedCount,
        totalCount: filtered.length,
      },
    };
  }, [cashAdjustments, filterType, customStartDate, customEndDate, todayDateStr]);

  const handleOpenVoid = (adj: CashAdjustment) => {
    setVoidTarget(adj);
    setVoidReason('');
    setVoidPin('');
    setVoidError('');
  };

  const handleConfirmVoid = () => {
    if (!voidTarget) return;
    if (!voidPin.trim()) {
      setVoidError('নিরাপত্তা পিন প্রদান করুন');
      return;
    }

    setIsVoiding(true);
    setVoidError('');

    const res = voidCashAdjustment(voidTarget.id, voidReason, voidPin);
    setIsVoiding(false);

    if (!res.success) {
      setVoidError(res.error || 'বাতিল করা সম্ভব হয়নি');
    } else {
      setVoidTarget(null);
      setToastMessage('সমন্বয়টি সফলভাবে বাতিল করা হয়েছে');
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const getTypeLabel = (type: CashAdjustment['type']) => {
    switch (type) {
      case 'set-to-actual':
        return 'আসল ক্যাশ নির্ধারণ';
      case 'increase':
        return 'ক্যাশ বৃদ্ধি (+)';
      case 'decrease':
        return 'ক্যাশ হ্রাস (−)';
      default:
        return 'ক্যাশ সমন্বয়';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-linear-to-r from-emerald-50/80 via-teal-50/40 to-white px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-bengali">
                    হাতে নগদ ক্যাশ সমন্বয় ইতিহাস (Cash Adjustment Ledger)
                  </h3>
                  <p className="text-xs text-slate-500 font-bengali">
                    বর্তমান সমন্বিত ক্যাশ ব্যালেন্স: <span className="font-mono font-bold text-emerald-700">{currency} {cashBalance.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs font-bengali"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>প্রিন্ট প্রিভিউ (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewAdjustment();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs font-bengali"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>নতুন সমন্বয়</span>
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Toast alert */}
            {toastMessage && (
              <div className="bg-emerald-600 text-white px-5 py-2 text-xs font-bold font-bengali flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{toastMessage}</span>
                </div>
                <button onClick={() => setToastMessage('')} className="text-emerald-100 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 font-bengali flex items-center gap-1 mr-1">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    সময়কাল:
                  </span>
                  {(
                    [
                      { id: 'today', label: 'আজ' },
                      { id: 'this-month', label: 'এই মাস' },
                      { id: 'last-month', label: 'গত মাস' },
                      { id: 'all', label: 'সব সময়' },
                      { id: 'custom', label: 'কাস্টম' },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setFilterType(btn.id)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold font-bengali transition-all ${
                        filterType === btn.id
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="sm:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs font-bengali"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>প্রিন্ট</span>
                </button>
              </div>

              {/* Custom Date Pickers */}
              {filterType === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 font-bengali">শুরু:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 font-bengali">শেষ:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="rounded-xl border border-emerald-200 bg-white p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 font-bengali">
                    <span>মোট বাড়ানো (+)</span>
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-black font-mono text-emerald-700 mt-0.5">
                    +{currency} {summary.totalIncreased.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border border-rose-200 bg-white p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-rose-800 font-bengali">
                    <span>মোট কমানো (−)</span>
                    <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  </div>
                  <p className="text-sm font-black font-mono text-rose-700 mt-0.5">
                    −{currency} {summary.totalDecreased.toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 font-bengali">
                    <span>নিট সমন্বয়</span>
                    <Scale className="h-3.5 w-3.5 text-slate-600" />
                  </div>
                  <p
                    className={`text-sm font-black font-mono mt-0.5 ${
                      summary.netAdjustment > 0
                        ? 'text-emerald-700'
                        : summary.netAdjustment < 0
                        ? 'text-rose-700'
                        : 'text-slate-800'
                    }`}
                  >
                    {summary.netAdjustment >= 0 ? '+' : '−'}
                    {currency} {Math.abs(summary.netAdjustment).toLocaleString()}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 font-bengali">
                    <span>মোট এন্ট্রি</span>
                    <span className="text-[10px] font-bold text-slate-400">সক্রিয়: {summary.activeCount}</span>
                  </div>
                  <p className="text-sm font-black font-mono text-slate-800 mt-0.5">
                    {summary.totalCount} টি
                  </p>
                </div>
              </div>
            </div>

            {/* History Table */}
            <div className="flex-1 overflow-auto p-4">
              {filteredAdjustments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bengali">
                  <Scale className="h-12 w-12 mx-auto mb-2.5 text-slate-300 stroke-1" />
                  <p className="text-sm font-bold text-slate-600">কোনো ক্যাশ সমন্বয় রেকর্ড পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-400 mt-1">
                    বাস্তব ক্যাশ মেলাতে উপরে "নতুন সমন্বয়" বাটনে ক্লিক করুন
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 font-bengali">
                        <th className="py-2.5 px-3 font-bold w-12 text-center">ক্রমিক</th>
                        <th className="py-2.5 px-3 font-bold whitespace-nowrap">তারিখ</th>
                        <th className="py-2.5 px-3 font-bold">ধরন</th>
                        <th className="py-2.5 px-3 font-bold text-right">আগের ক্যাশ</th>
                        <th className="py-2.5 px-3 font-bold text-right">সমন্বয় (+/−)</th>
                        <th className="py-2.5 px-3 font-bold text-right">পরের ক্যাশ</th>
                        <th className="py-2.5 px-3 font-bold">কারণ / নোট</th>
                        <th className="py-2.5 px-3 font-bold">কে করেছে</th>
                        <th className="py-2.5 px-3 font-bold text-center">অবস্থা</th>
                        <th className="py-2.5 px-3 font-bold text-center">অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-bengali">
                      {filteredAdjustments.map((adj, index) => {
                        const isVoided = adj.status === 'voided';
                        const isPositive = adj.amount > 0;

                        return (
                          <tr
                            key={adj.id}
                            className={`transition-colors ${
                              isVoided ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-slate-50/90'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                              {toBengaliDigits((index + 1).toString())}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] font-medium text-slate-700">
                              {formatDate(adj.date)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  isVoided
                                    ? 'bg-slate-100 text-slate-500'
                                    : adj.type === 'set-to-actual'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : isPositive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {getTypeLabel(adj.type)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-600">
                              {currency} {adj.cashBefore.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black">
                              <span
                                className={`${
                                  isVoided
                                    ? 'line-through text-slate-400'
                                    : isPositive
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {isPositive ? '+' : '−'}
                                {currency} {Math.abs(adj.amount).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                              {currency} {adj.cashAfter.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 max-w-[200px]">
                              <p className={`truncate text-xs ${isVoided ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {adj.note || '—'}
                              </p>
                              {isVoided && adj.voidReason && (
                                <p className="text-[10px] text-rose-600 font-medium truncate mt-0.5">
                                  বাতিলের কারণ: {adj.voidReason}
                                </p>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                              {adj.createdBy}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {isVoided ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                  বাতিল
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  সক্রিয়
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {!isVoided ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenVoid(adj)}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                                  title="এই সমন্বয়টি বাতিল করুন"
                                >
                                  <Ban className="h-3 w-3" />
                                  <span>বাতিল</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {adj.voidedAt ? formatDate(adj.voidedAt.slice(0, 10)) : 'বাতিলকৃত'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-bengali">
                সমন্বয় বাতিল করলে হিসাব থেকে স্বয়ংক্রিয়ভাবে সংশোধিত হয়ে পূর্বের অবস্থায় ফিরে যাবে।
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 font-bengali shadow-2xs"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Void Confirmation Submodal */}
      {voidTarget &&
        createPortal(
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                    <Ban className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-bengali">
                      ক্যাশ সমন্বয় বাতিলকরণ (Void)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-bengali">
                      তারিখ: {formatDate(voidTarget.date)} • পরিমাণ: {voidTarget.amount > 0 ? '+' : '−'}{currency}{Math.abs(voidTarget.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setVoidTarget(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-bengali">
                <p className="font-bold">মনোযোগ দিন:</p>
                <p className="text-[11px] mt-1 text-amber-800">
                  এই সমন্বয়টি বাতিল করলে বর্তমান হাতে নগদ ক্যাশ থেকে{' '}
                  <span className="font-mono font-bold">
                    {voidTarget.amount > 0 ? `−${currency}${Math.abs(voidTarget.amount).toLocaleString()}` : `+${currency}${Math.abs(voidTarget.amount).toLocaleString()}`}
                  </span>{' '}
                  সমন্বয় স্বয়ংক্রিয়ভাবে পরিবর্তিত হবে। এন্ট্রিটি ডাটাবেজে "বাতিল" অবস্থায় থেকে যাবে।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
                  বাতিলের কারণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="যেমন: ভুল এন্ট্রি হয়েছিল..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bengali text-slate-800 focus:border-rose-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-slate-500" />
                    মালিকের নিরাপত্তা পিন কোড <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400">৪-৬ ডিজিট</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={voidPin}
                  onChange={(e) => {
                    setVoidPin(toEnglishDigits(e.target.value));
                    setVoidError('');
                  }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono tracking-widest text-slate-900 focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              {voidError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-800 font-bengali flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{voidError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVoidTarget(null)}
                  disabled={isVoiding}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 font-bengali"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={isVoiding || !voidPin.trim()}
                  className={`rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-xs font-bengali flex items-center gap-1.5 ${
                    isVoiding || !voidPin.trim()
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                      : 'bg-rose-600 hover:bg-rose-700 active:scale-98'
                  }`}
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>{isVoiding ? 'বাতিল হচ্ছে...' : 'বাতিল নিশ্চিত করুন'}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Print Preview A4 Modal */}
      {showPrintModal && (
        <UniversalPrintPreviewModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="হাতে নগদ ক্যাশ সমন্বয় বিবরণী (A4)"
          subtitle={`মোট বাড়ানো: +${currency}${summary.totalIncreased.toLocaleString()} • মোট কমানো: −${currency}${summary.totalDecreased.toLocaleString()} • নিট: ${summary.netAdjustment >= 0 ? '+' : '−'}${currency}${Math.abs(summary.netAdjustment).toLocaleString()}`}
          fileNamePrefix={`Cash_Adjustment_Report_${todayDateStr}`}
        >
          <div
            className="printable-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden"
            style={{
              width: '794px',
              minHeight: '1123px',
              padding: '28px 32px',
              boxSizing: 'border-box',
            }}
          >
            <div>
              {/* Header */}
              <PrintHeader
                settings={db.settings}
                reportTitle="হাতে নগদ ক্যাশ সমন্বয় খতিয়ান"
                reportSubtitle="বাস্তব ক্যাশ সমন্বয়ের পূর্ণাঙ্গ বিবরণী"
                metadata={[
                  { label: 'প্রতিবেদন তারিখ', value: formatDate(todayDateStr) },
                  {
                    label: 'সময়কাল',
                    value:
                      filterType === 'today'
                        ? 'আজ'
                        : filterType === 'this-month'
                        ? 'এই মাস'
                        : filterType === 'last-month'
                        ? 'গত মাস'
                        : filterType === 'custom'
                        ? `${formatDate(customStartDate)} হতে ${formatDate(customEndDate)}`
                        : 'সব সময় (All Time)',
                  },
                  { label: 'বর্তমান ক্যাশ', value: `${currency} ${cashBalance.toLocaleString()}` },
                ]}
              />

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4 mt-2">
                <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-600 block">মোট সমন্বয় বৃদ্ধি (+)</span>
                  <span className="text-sm font-black font-mono text-emerald-700">
                    +{currency} {summary.totalIncreased.toLocaleString()}
                  </span>
                </div>
                <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-600 block">মোট সমন্বয় হ্রাস (−)</span>
                  <span className="text-sm font-black font-mono text-rose-700">
                    −{currency} {summary.totalDecreased.toLocaleString()}
                  </span>
                </div>
                <div className="border border-slate-300 rounded p-2 text-center bg-slate-100">
                  <span className="text-[10px] font-bold text-slate-800 block">নিট সমন্বয় পরিমাণ</span>
                  <span
                    className={`text-sm font-black font-mono ${
                      summary.netAdjustment >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {summary.netAdjustment >= 0 ? '+' : '−'}
                    {currency} {Math.abs(summary.netAdjustment).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse text-xs border border-slate-300 font-bengali">
                <thead>
                  <tr className="bg-slate-200/90 text-slate-900 border-b border-slate-300 font-bold text-center">
                    <th className="border-r border-slate-300 p-1.5 w-10">ক্র:</th>
                    <th className="border-r border-slate-300 p-1.5 w-24 text-left">তারিখ</th>
                    <th className="border-r border-slate-300 p-1.5 text-left">ধরন</th>
                    <th className="border-r border-slate-300 p-1.5 text-right w-24">আগের ক্যাশ</th>
                    <th className="border-r border-slate-300 p-1.5 text-right w-24">সমন্বয় (+/−)</th>
                    <th className="border-r border-slate-300 p-1.5 text-right w-24">পরের ক্যাশ</th>
                    <th className="border-r border-slate-300 p-1.5 text-left">কারণ / বিবরণ</th>
                    <th className="border-r border-slate-300 p-1.5 text-center w-16">অবস্থা</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdjustments.map((adj, idx) => {
                    const isVoided = adj.status === 'voided';
                    const isPos = adj.amount > 0;
                    return (
                      <tr
                        key={adj.id}
                        className={`border-b border-slate-200 text-xs ${
                          isVoided ? 'bg-slate-100 text-slate-400' : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                        }`}
                      >
                        <td className="border-r border-slate-300 p-1.5 text-center font-mono">
                          {toBengaliDigits((idx + 1).toString())}
                        </td>
                        <td className="border-r border-slate-300 p-1.5 whitespace-nowrap font-mono">
                          {formatDate(adj.date)}
                        </td>
                        <td className="border-r border-slate-300 p-1.5">
                          {getTypeLabel(adj.type)}
                        </td>
                        <td className="border-r border-slate-300 p-1.5 text-right font-mono font-bold">
                          {currency} {adj.cashBefore.toLocaleString()}
                        </td>
                        <td className="border-r border-slate-300 p-1.5 text-right font-mono font-black">
                          <span className={isVoided ? 'line-through' : isPos ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPos ? '+' : '−'}
                            {currency} {Math.abs(adj.amount).toLocaleString()}
                          </span>
                        </td>
                        <td className="border-r border-slate-300 p-1.5 text-right font-mono font-bold">
                          {currency} {adj.cashAfter.toLocaleString()}
                        </td>
                        <td className="border-r border-slate-300 p-1.5 text-xs">
                          {adj.note || '—'}
                          {isVoided && adj.voidReason && (
                            <span className="block text-[10px] text-rose-600 font-semibold">
                              (বাতিল: {adj.voidReason})
                            </span>
                          )}
                        </td>
                        <td className="border-r border-slate-300 p-1.5 text-center font-bold text-[10px]">
                          {isVoided ? 'বাতিল' : 'সক্রিয়'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signature Line */}
            <div className="pt-8 pb-4 flex items-end justify-between border-t border-slate-300 mt-6 text-xs font-bengali">
              <div className="text-center w-40">
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold text-slate-800">ক্যাশিয়ারের স্বাক্ষর</p>
                </div>
              </div>

              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1">
                  <p className="font-bold text-slate-950">মালিক / স্বত্বাধিকারীর স্বাক্ষর</p>
                </div>
              </div>
            </div>
          </div>
        </UniversalPrintPreviewModal>
      )}
    </>
  );
};
