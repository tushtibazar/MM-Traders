import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit,
  Calendar,
  MapPin,
  ShieldAlert,
  Coins,
  Check,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Store,
} from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/dateUtils';

interface LedgerEntryEditModalProps {
  isOpen: boolean;
  entry: CustomerLedgerEntry | null;
  customer: Customer | null;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const LedgerEntryEditModal: React.FC<LedgerEntryEditModalProps> = ({
  isOpen,
  entry,
  customer,
  onClose,
  onSuccess,
}) => {
  const { db, editDueLedgerEntry } = useApp();
  const currency = db.settings.currency || '৳';

  const [date, setDate] = useState('');
  const [amount, setAmount] = useState<number | ''>(0);
  const [route, setRoute] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Available routes
  const availableRoutes = useMemo(() => {
    const custom = db.settings.customRoutes || [];
    const srTerritories = db.salesRepresentatives
      .map((s) => s.territory)
      .filter(Boolean);
    const set = new Set([...custom, ...srTerritories]);
    return Array.from(set);
  }, [db.settings.customRoutes, db.salesRepresentatives]);

  useEffect(() => {
    if (entry && isOpen) {
      setDate(entry.date || '');
      setAmount(entry.debit ?? 0);

      // Extract existing route if present in description e.g. "(চকবাজার)"
      let parsedRoute = '';
      availableRoutes.forEach((r) => {
        if (entry.description.includes(r)) {
          parsedRoute = r;
        }
      });
      setRoute(parsedRoute);

      // Clean description
      const cleanDesc = entry.description
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/\s*\[.*?\]\s*/g, ' ')
        .trim();
      setNote(cleanDesc || entry.description);

      setReason('');
      setPin('');
      setShowPin(false);
      setErrorMsg('');
    }
  }, [entry, isOpen, availableRoutes]);

  if (!isOpen || !entry || !customer) return null;

  const originalAmount = entry.debit ?? 0;
  const currentAmountNum = amount === '' ? 0 : Number(amount);
  const diff = currentAmountNum - originalAmount;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (amount === '' || currentAmountNum < 0) {
      setErrorMsg('সঠিক টাকার পরিমাণ দিন');
      return;
    }

    if (!pin.trim()) {
      setErrorMsg('সংশোধন নিশ্চিত করতে নিরাপত্তা পিন দিন');
      return;
    }

    try {
      editDueLedgerEntry({
        entryId: entry.id,
        date: date || entry.date,
        amount: currentAmountNum,
        route: route.trim(),
        note: note.trim() || 'বাকি হিসাব',
        reason: reason.trim(),
        pin: pin.trim(),
      });

      if (onSuccess) {
        onSuccess(`বাকি ভাউচার #${entry.referenceId || entry.id}-এর তথ্য ও টাকার সংশোধন সফলভাবে সংরক্ষিত হয়েছে!`);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'সংশোধন সম্পন্ন করা যায়নি');
    }
  };

  return (
    <div
      id="ledger-entry-edit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 font-bengali">
                  বাকি ভাউচার এন্ট্রি সংশোধন
                </h3>
                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                  #{entry.referenceId || entry.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bengali">
                {customer.shopName} ({customer.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold font-bengali">{errorMsg}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed font-bengali">
            ℹ️ ভুলবশত তৈরি হওয়া বাকি এন্ট্রি সংশোধন করতে নিচের তথ্য পরিবর্তন করুন। সংশোধনের ফলে কাস্টমারের বর্তমান মোট বকেয়া এবং খতিয়ানের হিসাব স্বয়ংক্রিয়ভাবে সমন্বয় হবে।
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 font-bengali">
                তারিখ (Date) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-rose-500 focus:outline-hidden"
              />
              <p className="text-[10.5px] text-slate-400 mt-1 font-bengali">
                বর্তমান: {formatDate(entry.date)}
              </p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 font-bengali">
                টাকার পরিমাণ (বাকি) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-rose-600">{currency}</span>
                <input
                  type="number"
                  required
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === '' ? '' : Number(val));
                  }}
                  className="w-full rounded-xl border border-rose-300 bg-white pl-8 pr-3.5 py-2 text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-hidden font-mono"
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10.5px]">
                <span className="text-slate-500">পূর্বে ছিল: {currency} {originalAmount.toLocaleString()}</span>
                {diff !== 0 && (
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      diff > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    পার্থক্য: {diff > 0 ? '+' : ''}{currency} {diff.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Route */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 font-bengali">
                রুট (Route)
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-rose-500 focus:outline-hidden"
              >
                <option value="">-- কোনো নির্দিষ্ট রুট নেই --</option>
                {availableRoutes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Note / Description */}
            <div>
              <label className="block text-slate-700 font-bold mb-1 font-bengali">
                বিবরণ / নোট
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="যেমন: বাকি হিসাব"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            {/* Correction Reason */}
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1 font-bengali">
                সংশোধনের কারণ (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="যেমন: টাকার অংকে ভুল লেখা হয়েছিল"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-rose-500 focus:outline-hidden"
              />
            </div>

            {/* PIN Input */}
            <div className="sm:col-span-2 rounded-xl bg-rose-50/60 border border-rose-200 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold font-bengali">
                <KeyRound className="h-4 w-4 text-rose-600" />
                <span>মালিকের নিরাপত্তা পিন দিন (৪-৬ সংখ্যা) *</span>
              </div>
              <div className="relative max-w-xs">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="সিকিউরিটি পিন..."
                  className="w-full rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-rose-600 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10.5px] text-rose-700 font-bengali">
                ভাউচার এন্ট্রি ও বকেয়া সংশোধনের অনুমোদনের জন্য নিরাপত্তা পিন আবশ্যক।
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>সংশোধন নিশ্চিত করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
