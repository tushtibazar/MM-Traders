import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  HandCoins,
  Store,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface DueCollectionConfirmModalProps {
  isOpen: boolean;
  customer: Customer | null;
  dueNo?: string;
  defaultAmount?: number;
  defaultDate: string;
  currency?: string;
  correctPin: string;
  allCustomers?: Customer[];
  allLedgers?: CustomerLedgerEntry[];
  onConfirm: (data: {
    customerId: string;
    amount: number;
    date: string;
    dueNo?: string;
    note?: string;
  }) => void;
  onClose: () => void;
}

export const DueCollectionConfirmModal: React.FC<DueCollectionConfirmModalProps> = ({
  isOpen,
  customer,
  dueNo,
  defaultAmount,
  defaultDate,
  currency = '৳',
  correctPin,
  allCustomers = [],
  allLedgers = [],
  onConfirm,
  onClose,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customer);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(defaultDate);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const activeCust = customer || null;
      setSelectedCustomer(activeCust);
      setCustomerSearchQuery('');
      const initAmt =
        defaultAmount !== undefined && defaultAmount > 0
          ? defaultAmount
          : activeCust?.currentDue || 0;
      setCollectionAmount(initAmt > 0 ? String(initAmt) : '');
      setCollectionDate(defaultDate || new Date().toISOString().slice(0, 10));
      setPin('');
      setShowPin(false);
      setNote('');
      setError('');
    }
  }, [isOpen, customer, defaultAmount, defaultDate]);

  // Customer search suggestions for header flow when customer is not pre-selected
  const filteredCustomers = useMemo(() => {
    if (customer || selectedCustomer || !allCustomers.length) return [];
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) {
      // Show customers with current due first
      return allCustomers.filter((c) => (c.currentDue || 0) > 0).slice(0, 8);
    }

    return allCustomers
      .filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const shopMatch = c.shopName?.toLowerCase().includes(q);
        const phoneMatch = c.phone?.toLowerCase().includes(q);
        const dueNoMatch = allLedgers.some(
          (l) =>
            l.customerId === c.id &&
            l.referenceId?.toLowerCase().includes(q)
        );
        return nameMatch || shopMatch || phoneMatch || dueNoMatch;
      })
      .slice(0, 12);
  }, [allCustomers, allLedgers, customer, selectedCustomer, customerSearchQuery]);

  if (!isOpen) return null;

  const activeCustomer = selectedCustomer || customer;

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearchQuery('');
    setCollectionAmount(c.currentDue > 0 ? String(c.currentDue) : '');
    setError('');
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCollectionAmount('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!activeCustomer) {
      setError('অনুগ্রহ করে একজন কাস্টমার নির্বাচন করুন');
      return;
    }

    const amt = parseFloat(collectionAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('অনুগ্রহ করে সঠিক আদায়ের পরিমাণ (টাকা) লিখুন');
      return;
    }

    if (amt > activeCustomer.currentDue) {
      setError(
        `আদায়ের পরিমাণ বর্তমান বকেয়া (${currency} ${activeCustomer.currentDue.toLocaleString()})-এর বেশি হতে পারবে না`
      );
      return;
    }

    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setError('অনুগ্রহ করে ৪ সংখ্যার নিরাপত্তা পিন কোড প্রদান করুন');
      pinInputRef.current?.focus();
      return;
    }

    if (trimmedPin !== correctPin.trim()) {
      setError('ভুল নিরাপত্তা পিন কোড! সঠিক পিন দিন।');
      setPin('');
      pinInputRef.current?.focus();
      return;
    }

    // Call onConfirm callback with verified data
    onConfirm({
      customerId: activeCustomer.id,
      amount: amt,
      date: collectionDate,
      dueNo: dueNo?.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  const parsedAmt = parseFloat(collectionAmount) || 0;
  const remainingDue = activeCustomer
    ? Math.max(0, (activeCustomer.currentDue || 0) - parsedAmt)
    : 0;

  return (
    <div
      id="due-collection-confirm-modal-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        id="due-collection-confirm-modal"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
              <HandCoins className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold font-bengali leading-tight">
                বাকি আদায় ও জমা নিশ্চিতকরণ
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                কাস্টমার লেজারে স্বয়ংক্রিয়ভাবে কর্তন ও রসিদ তৈরি হবে
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-emerald-200 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-sans">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* If NO customer is selected yet (header flow), show Smart Search */}
          {!activeCustomer ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  কাস্টমার খুঁজুন (দোকান / নাম / ফোন / বাকি আইডি) *
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    autoFocus
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="কাস্টমারের নাম, দোকান বা মোবাইল লিখুন..."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Suggestions List */}
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                {filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    কোনো কাস্টমার পাওয়া যায়নি
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-950 flex items-center gap-1.5 truncate">
                          <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{c.shopName || c.name}</span>
                          {c.shopName && c.shopName !== c.name && (
                            <span className="text-[11px] font-normal text-slate-500">
                              ({c.name})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {c.phone && <span>📞 {c.phone}</span>}
                          {c.address && <span>📍 {c.address}</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          বকেয়া
                        </span>
                        <span className="font-mono font-bold text-rose-700 text-xs sm:text-sm">
                          {currency} {(c.currentDue || 0).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Customer / Due Information Card (Skipped when preselected or after selection) */
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-sm truncate">
                    <Store className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span className="truncate">{activeCustomer.shopName || activeCustomer.name}</span>
                  </div>
                  <div className="text-slate-600 text-xs mt-0.5">
                    স্বত্বাধিকারী: <strong className="text-slate-800">{activeCustomer.name}</strong>
                  </div>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    বর্তমান মোট বাকি
                  </span>
                  <span className="text-base font-black font-mono text-rose-700">
                    {currency} {activeCustomer.currentDue.toLocaleString()}
                  </span>
                  {!customer && (
                    <button
                      type="button"
                      onClick={handleClearSelectedCustomer}
                      className="mt-1 text-[11px] text-emerald-700 hover:text-emerald-900 underline font-medium cursor-pointer"
                    >
                      কাস্টমার পরিবর্তন
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 border-t border-emerald-200/60 pt-2">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span className="font-mono">{activeCustomer.phone || 'ফোন নম্বর নেই'}</span>
                </span>
                {activeCustomer.address && (
                  <span className="text-slate-500">ঠিকানা: {activeCustomer.address}</span>
                )}
                {dueNo && (
                  <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-900">
                    বাকি নং: {dueNo}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Form Fields Grid: Only active when customer is selected */}
          {activeCustomer && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Amount being collected */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    এই আদায়ের পরিমাণ (টাকা) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={activeCustomer.currentDue}
                      step="any"
                      value={collectionAmount}
                      onChange={(e) => setCollectionAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-sm font-bold font-mono text-emerald-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>অবশিষ্ট থাকবে:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {currency} {remainingDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Collection Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      <span>আদায়ের তারিখ *</span>
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {formatDate(collectionDate)}
                    </span>
                  </label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    যে তারিখে টাকা গ্রহণ করা হয়েছে
                  </span>
                </div>
              </div>

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>মন্তব্য / বিবরণ (ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="আদায়ের কোনো বিশেষ নোট বা রুট তথ্য..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* PIN Security Field */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                <label className="block text-xs font-bold text-amber-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-700" />
                    <span>নিরাপত্তা পিন (Security PIN) *</span>
                  </span>
                  <span className="text-[10px] font-normal text-amber-800">
                    মালিকের অনুমোদনের জন্য ৪ সংখ্যার পিন দিন
                  </span>
                </label>
                <div className="relative">
                  <input
                    ref={pinInputRef}
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="পিন কোড লিখুন..."
                    required
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-center text-base font-bold font-mono tracking-widest text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={
                !activeCustomer ||
                !collectionAmount ||
                parseFloat(collectionAmount) <= 0 ||
                !pin.trim()
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>আদায় নিশ্চিত করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
