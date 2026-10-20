import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Save,
  Printer,
  Edit2,
  Trash2,
  PlusCircle,
  Filter,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Clock,
  Coins,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DOPayment } from '../../types';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import { PinPromptModal } from '../modals/PinPromptModal';
import { DOPrintPreviewModal } from './DOPrintPreviewModal';

export const DOModule: React.FC = () => {
  const { db, currentUser, addDOPayment, updateDOPayment, deleteDOPayment, todayDateStr } = useApp();

  // Form State
  const [date, setDate] = useState<string>(todayDateStr || new Date().toISOString().split('T')[0]);
  const [amountRaw, setAmountRaw] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [editingItem, setEditingItem] = useState<DOPayment | null>(null);

  // Filter State
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'this_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showVoided, setShowVoided] = useState<boolean>(false);

  // Modals & Feedback
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PIN modal state
  const [pinAction, setPinAction] = useState<{
    type: 'edit' | 'delete';
    item: DOPayment;
  } | null>(null);

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Current Month String (YYYY-MM)
  const currentMonthPrefix = useMemo(() => {
    const today = todayDateStr || new Date().toISOString().split('T')[0];
    return today.slice(0, 7);
  }, [todayDateStr]);

  // All non-voided or all payments
  const allDoPayments = useMemo(() => {
    return db.doPayments || [];
  }, [db.doPayments]);

  // Metrics:
  // 1. আজকের ডিও
  const todayTotal = useMemo(() => {
    return allDoPayments
      .filter((p) => (p.status === 'active' || !p.status) && p.date === todayDateStr)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [allDoPayments, todayDateStr]);

  // 2. এই মাসের মোট ডিও
  const thisMonthTotal = useMemo(() => {
    return allDoPayments
      .filter((p) => (p.status === 'active' || !p.status) && p.date.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [allDoPayments, currentMonthPrefix]);

  // 3. মোট ডিও (সর্বমোট)
  const grandTotal = useMemo(() => {
    return allDoPayments
      .filter((p) => p.status === 'active' || !p.status)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [allDoPayments]);

  // Filtered List for Table & Print
  const filteredPayments = useMemo(() => {
    let list = [...allDoPayments];

    if (!showVoided) {
      list = list.filter((p) => p.status === 'active' || !p.status);
    }

    if (timeFilter === 'today') {
      list = list.filter((p) => p.date === todayDateStr);
    } else if (timeFilter === 'this_month') {
      list = list.filter((p) => p.date.startsWith(currentMonthPrefix));
    } else if (timeFilter === 'custom') {
      if (customStartDate) {
        list = list.filter((p) => p.date >= customStartDate);
      }
      if (customEndDate) {
        list = list.filter((p) => p.date <= customEndDate);
      }
    }

    // Sort newest first
    return list.sort((a, b) => {
      const dateCompare = (b.date || '').localeCompare(a.date || '');
      if (dateCompare !== 0) return dateCompare;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [allDoPayments, showVoided, timeFilter, todayDateStr, currentMonthPrefix, customStartDate, customEndDate]);

  const filteredTotal = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === 'active' || !p.status)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  // Filter label for Print
  const filterLabel = useMemo(() => {
    if (timeFilter === 'today') return `আজকের ডিও (${formatDate(todayDateStr)})`;
    if (timeFilter === 'this_month') return 'চলতি মাসের ডিও';
    if (timeFilter === 'custom') {
      return `${customStartDate ? formatDate(customStartDate) : 'শুরু'} হতে ${customEndDate ? formatDate(customEndDate) : 'আজ'}`;
    }
    return 'সর্বমোট ডিও পরিশোধ';
  }, [timeFilter, todayDateStr, customStartDate, customEndDate]);

  // Form Amount handler (removes non-digits, formats display)
  const handleAmountChange = (val: string) => {
    // Keep only numbers
    const clean = val.replace(/[^\d]/g, '');
    setAmountRaw(clean);
  };

  const formattedAmountDisplay = useMemo(() => {
    if (!amountRaw) return '';
    return Number(amountRaw).toLocaleString('en-US');
  }, [amountRaw]);

  // Form Submit: Add or Edit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountRaw);
    if (!num || num <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    if (editingItem) {
      // Editing requires PIN (handled before activating editingItem or upon save)
      updateDOPayment(editingItem.id, {
        date,
        amount: num,
        note: note.trim(),
      });
      setToastMessage('ডিও পেমেন্ট সফলভাবে আপডেট হয়েছে');
      setEditingItem(null);
    } else {
      // Adding new entry does not require PIN
      addDOPayment({
        date,
        amount: num,
        note: note.trim(),
      });
      setToastMessage('ডিও এন্ট্রি সফলভাবে সেভ হয়েছে');
    }

    // Reset inputs
    setAmountRaw('');
    setNote('');
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setAmountRaw('');
    setNote('');
    setDate(todayDateStr || new Date().toISOString().split('T')[0]);
  };

  // Trigger Edit with PIN
  const handleInitiateEdit = (item: DOPayment) => {
    setPinAction({ type: 'edit', item });
  };

  // Trigger Delete with PIN
  const handleInitiateDelete = (item: DOPayment) => {
    setPinAction({ type: 'delete', item });
  };

  // On PIN success
  const handlePinSuccess = () => {
    if (!pinAction) return;

    if (pinAction.type === 'edit') {
      const it = pinAction.item;
      setEditingItem(it);
      setDate(it.date);
      setAmountRaw(String(it.amount));
      setNote(it.note || '');
      setPinAction(null);
      // Smooth scroll to top form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (pinAction.type === 'delete') {
      deleteDOPayment(pinAction.item.id, 'মালিক কর্তৃক ডিও বাতিল');
      setToastMessage('ডিও এন্ট্রি বাতিল করা হয়েছে এবং টাকা ক্যাশে ফেরত এসেছে');
      setPinAction(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-bengali">
                কোম্পানি ডিও (D.O. Payments)
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                কোম্পানি ডেলিভারি অর্ডার
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              কোম্পানিকে পরিশোধিত ডিও (Delivery Order) টাকার হিসাব। পরিশোধিত ডিও মালিকের নগদ ক্যাশ ব্যালেন্স থেকে বিয়োগ হয়।
            </p>
          </div>
        </div>

        {/* Print Preview Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPrintPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>
        </div>
      </div>

      {/* Top 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* আজকের ডিও */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">আজকের ডিও (Today&apos;s D.O.)</span>
            <div className="rounded-md bg-blue-50 p-1.5 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold font-mono text-slate-900 truncate">
            ৳ {todayTotal.toLocaleString('en-US')}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">আজকের পরিশোধিত ডিও</span>
        </div>

        {/* এই মাসের মোট ডিও */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">এই মাসের মোট ডিও</span>
            <div className="rounded-md bg-blue-100 p-1.5 text-blue-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold font-mono text-blue-800 truncate">
            ৳ {thisMonthTotal.toLocaleString('en-US')}
          </p>
          <span className="text-[11px] text-blue-600 font-medium">চলতি মাসের মোট ডিও খরচ</span>
        </div>

        {/* মোট ডিও (সর্বমোট) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">মোট ডিও (সর্বমোট)</span>
            <div className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold font-mono text-amber-700 truncate">
            ৳ {grandTotal.toLocaleString('en-US')}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">হাতে নগদ থেকে বাদ পড়া মোট ডিও</span>
        </div>
      </div>

      {/* Entry Form: তারিখ, টাকা, নোট & সেভ বাটন */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle className={`h-5 w-5 ${editingItem ? 'text-amber-600' : 'text-blue-600'}`} />
            <h2 className="text-sm font-bold text-slate-900 font-bengali">
              {editingItem ? 'ডিও পেমেন্ট সংশোধন করুন (Edit D.O.)' : 'নতুন ডিও এন্ট্রি করুন (Add D.O. Payment)'}
            </h2>
          </div>
          {editingItem && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              সংশোধন বাতিল
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* তারিখ (দিন/মাস/বছর) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                পরিশোধের তারিখ <span className="text-slate-400 font-normal">(দিন/মাস/বছর)</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                বাংলা ফরম্যাট: <strong>{formatDate(date)}</strong>
              </p>
            </div>

            {/* টাকা (fixed-width, comma formatted, no spinner arrows) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                টাকার পরিমাণ <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">৳</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="যেমন: ১০,০০০"
                  value={formattedAmountDisplay}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full sm:w-48 rounded-xl border border-slate-300 bg-slate-50/50 pl-8 pr-3.5 py-2.5 text-sm text-slate-900 font-bold font-mono focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                ক্যাশ ব্যালেন্স থেকে স্বয়ংক্রিয়ভাবে বিয়োগ হবে
              </p>
            </div>

            {/* নোট / রেফারেন্স (optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                নোট / কোম্পানি নাম / ডিও রেফারেন্স <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span>
              </label>
              <input
                type="text"
                placeholder="যেমন: আবুল খায়ের টোব্যাকো / মেঘনা গ্রুপ"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs cursor-pointer transition-all active:scale-95 ${
                editingItem
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{editingItem ? 'আপডেট সম্পন্ন করুন' : 'সেভ করুন'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bar & List Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Time Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            ফিল্টার:
          </span>
          <button
            type="button"
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              timeFilter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            আজকে
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('this_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              timeFilter === 'this_month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            চলতি মাস
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              timeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            সব সময়
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              timeFilter === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            কাস্টম তারিখ
          </button>
        </div>

        {/* Custom Date Pickers & Voided Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {timeFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
              />
            </div>
          )}

          {/* Show Voided Checkbox for audit transparency */}
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showVoided}
              onChange={(e) => setShowVoided(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>বাতিলকৃত ডিও দেখুন</span>
          </label>
        </div>
      </div>

      {/* Date-wise List Table (Newest First) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">পরিশোধিত ডিও তালিকা (নতুন থেকে পুরাতন)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ফিল্টারকৃত মোট ডিও: <strong className="text-slate-900 font-mono">৳ {filteredTotal.toLocaleString('en-US')}</strong>
            </p>
          </div>
          <span className="text-xs text-slate-500">
            মোট এন্ট্রি: <strong>{toBengaliDigits(filteredPayments.length)}</strong> টি
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold text-xs">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-200">ক্রমিক</th>
                <th className="py-3 px-4 text-center w-32 border-r border-slate-200">তারিখ</th>
                <th className="py-3 px-4 text-right w-40 border-r border-slate-200">টাকার পরিমাণ</th>
                <th className="py-3 px-4 border-r border-slate-200">নোট / রেফারেন্স</th>
                <th className="py-3 px-3 text-center w-24 border-r border-slate-200">স্ট্যাটাস</th>
                <th className="py-3 px-3 text-center w-28">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">কোনো ডিও পেমেন্ট পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      উপরে ফর্ম থেকে নতুন ডিও পেমেন্ট যুক্ত করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((item, idx) => {
                  const isVoided = item.status === 'voided';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isVoided ? 'bg-rose-50/30 line-through text-slate-400' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'
                      }`}
                    >
                      {/* ক্রমিক নং */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500 border-r border-slate-100">
                        {toBengaliDigits(idx + 1)}
                      </td>

                      {/* তারিখ */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>

                      {/* টাকা */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900 border-r border-slate-100 whitespace-nowrap">
                        <span className={isVoided ? 'text-slate-400' : 'text-blue-700'}>
                          ৳ {Number(item.amount || 0).toLocaleString('en-US')}
                        </span>
                      </td>

                      {/* নোট */}
                      <td className="py-3 px-4 border-r border-slate-100">
                        <span className="text-slate-700">{item.note || '—'}</span>
                        {isVoided && item.voidReason && (
                          <span className="block text-[10px] text-rose-600 no-underline font-normal mt-0.5">
                            (বাতিল কারণ: {item.voidReason} • {item.voidedAt ? formatDate(item.voidedAt) : ''})
                          </span>
                        )}
                      </td>

                      {/* স্ট্যাটাস */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        {isVoided ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold no-underline">
                            বাতিলকৃত
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            সক্রিয়
                          </span>
                        )}
                      </td>

                      {/* অ্যাকশন (Edit & Delete with PIN) */}
                      <td className="py-3 px-3 text-center">
                        {isVoided ? (
                          <span className="text-[11px] text-slate-400 no-underline">—</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInitiateEdit(item)}
                              title="পিন দিয়ে এডিট করুন"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInitiateDelete(item)}
                              title="পিন দিয়ে বাতিল / ডিলিট করুন"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            মোট সক্রিয় ডিও এন্ট্রি: <strong>{toBengaliDigits(filteredPayments.filter((p) => p.status === 'active' || !p.status).length)}</strong> টি
          </div>
          <div className="font-mono text-sm font-bold text-slate-900">
            ফিল্টারকৃত মোট: ৳ {filteredTotal.toLocaleString('en-US')}
          </div>
        </div>
      </div>

      {/* Security PIN Modal for Edit and Delete */}
      {pinAction && (
        <PinPromptModal
          isOpen={Boolean(pinAction)}
          title={pinAction.type === 'edit' ? 'ডিও সম্পাদনার অনুমতি' : 'ডিও মুছে ফেলার নিশ্চিতকরণ'}
          subtitle={
            pinAction.type === 'edit'
              ? 'ডিও এন্ট্রি সংশোধন করতে আপনার সিকিউরিটি পিন লিখুন।'
              : 'ডিও এন্ট্রিটি বাতিল করলে পরিশোধিত টাকা স্বয়ংক্রিয়ভাবে ক্যাশ ব্যালেন্সে ফিরে আসবে।'
          }
          itemName={`তারিখ: ${formatDate(pinAction.item.date)} • পরিমাণ: ৳ ${Number(pinAction.item.amount).toLocaleString('en-US')}`}
          warning={
            pinAction.type === 'delete'
              ? 'সতর্কতা: বাতিলকৃত এন্ট্রি অডিট লগ হিসেবে সংরক্ষিত থাকবে এবং ক্যাশ ব্যালেন্সে টাকা যুক্ত হবে।'
              : undefined
          }
          confirmButtonText={pinAction.type === 'edit' ? 'এডিট করুন' : 'বাতিল নিশ্চিত করুন'}
          confirmButtonVariant={pinAction.type === 'edit' ? 'primary' : 'danger'}
          correctPin={db.settings.securityPin || '1234'}
          onSuccess={handlePinSuccess}
          onClose={() => setPinAction(null)}
        />
      )}

      {/* Print Preview Modal */}
      <DOPrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        settings={db.settings}
        payments={filteredPayments}
        filterLabel={filterLabel}
        todayDateStr={todayDateStr}
      />
    </div>
  );
};
