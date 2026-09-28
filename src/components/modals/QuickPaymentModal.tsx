import React, { useState, useEffect } from 'react';
import { HandCoins, X, Check, Banknote } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerId?: string;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultCustomerId,
}) => {
  const { db, currentUser, addPayment, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';

  const [date, setDate] = useState(todayDateStr);
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile_banking' | 'other'>('cash');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultCustomerId) {
      setCustomerId(defaultCustomerId);
    }
  }, [defaultCustomerId]);

  if (!isOpen) return null;

  const selectedCustomer = db.customers.find((c) => c.id === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('অনুগ্রহ করে একজন কাস্টমার নির্বাচন করুন');
      return;
    }
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('সঠিক জমার পরিমাণ লিখুন');
      return;
    }

    try {
      addPayment({
        date,
        customerId,
        amount: num,
        paymentMethod,
        receivedBy: currentUser.name,
        note,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'টাকা জমা সংরক্ষণ করতে ব্যর্থ');
    }
  };

  return (
    <div
      id="quick-payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-bengali">
                দ্রুত টাকা আদায় (Receive Payment)
              </h3>
              <p className="text-xs text-slate-500">বাকি পরিশোধ বা কালেকশন রেকর্ড করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">তারিখ</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex justify-between">
              <span>কাস্টমার / দোকান</span>
              {selectedCustomer && (
                <span className="font-bold text-rose-600">
                  বাকি: {currency} {selectedCustomer.currentDue.toLocaleString()}
                </span>
              )}
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">-- কাস্টমার নির্বাচন করুন --</option>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName} — {c.name} ({currency} {c.currentDue.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">জমার পরিমাণ (টাকা) *</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="যেমন: ৩০০০"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-blue-700 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="cash">নগদ ক্যাশ (Cash)</option>
                <option value="mobile_banking">মোবাইল ব্যাংকিং</option>
                <option value="bank">ব্যাংক চেক</option>
                <option value="other">অন্যান্য</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">নোট / TrxID</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="রেফারেন্স"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700"
            >
              <Check className="h-4 w-4" />
              <span>আদায় সেভ করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
