import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Customer } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface DueCollectionConfirmModalProps {
  isOpen: boolean;
  customer: Customer | null;
  dueNo?: string;
  defaultAmount?: number;
  defaultDate: string;
  currency?: string;
  correctPin: string;
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
  onConfirm,
  onClose,
}) => {
  const [collectionAmount, setCollectionAmount] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState<string>(defaultDate);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && customer) {
      // Default amount is either defaultAmount or customer.currentDue
      const initAmt = defaultAmount !== undefined && defaultAmount > 0
        ? defaultAmount
        : customer.currentDue || 0;
      setCollectionAmount(initAmt > 0 ? String(initAmt) : '');
      setCollectionDate(defaultDate || new Date().toISOString().slice(0, 10));
      setPin('');
      setShowPin(false);
      setNote('');
      setError('');
    }
  }, [isOpen, customer, defaultAmount, defaultDate]);

  if (!isOpen || !customer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(collectionAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('অনুগ্রহ করে সঠিক আদায়ের পরিমাণ (টাকা) লিখুন');
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
      customerId: customer.id,
      amount: amt,
      date: collectionDate,
      dueNo: dueNo?.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  const parsedAmt = parseFloat(collectionAmount) || 0;
  const remainingDue = Math.max(0, (customer.currentDue || 0) - parsedAmt);

  return (
    <div
      id="due-collection-confirm-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="due-collection-confirm-modal"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
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
            className="rounded-lg p-1.5 text-emerald-200 hover:bg-white/15 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer / Due Information Card */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-sm">
                  <Store className="h-4 w-4 text-emerald-700 shrink-0" />
                  <span>{customer.shopName}</span>
                </div>
                <div className="text-slate-600 text-xs mt-0.5">
                  স্বত্বাধিকারী: <strong className="text-slate-800">{customer.name}</strong>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  বর্তমান মোট বাকি
                </span>
                <span className="text-base font-black font-mono text-rose-700">
                  {currency} {customer.currentDue.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 border-t border-emerald-200/60 pt-2">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" />
                <span className="font-mono">{customer.phone || 'ফোন নম্বর নেই'}</span>
              </span>
              {customer.address && (
                <span className="text-slate-500">ঠিকানা: {customer.address}</span>
              )}
              {dueNo && (
                <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-900">
                  বাকি নং: {dueNo}
                </span>
              )}
            </div>
          </div>

          {/* Form Fields Grid */}
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

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!collectionAmount || parseFloat(collectionAmount) <= 0 || !pin.trim()}
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
