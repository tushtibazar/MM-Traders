import React, { useState } from 'react';
import { Receipt, X, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { db, currentUser, addExpense, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';

  const [date, setDate] = useState(todayDateStr);
  const [category, setCategory] = useState('পরিবহন ও ডেলিভারি');
  const [amount, setAmount] = useState<number | ''>('');
  const [paidFrom, setPaidFrom] = useState<'cash' | 'bank' | 'personal'>('cash');
  const [description, setDescription] = useState('');

  const categories = [
    'পরিবহন ও ডেলিভারি',
    'এস আর বেতন ও কমিশন',
    'দোকান / গোডাউন ভাড়া',
    'চা ও আপ্যায়ন',
    'বিদ্যুৎ ও বিল',
    'প্যাকেজিং ও ব্যাগ',
    'মেরামত ও রক্ষণাবেক্ষণ',
    'অন্যান্য বিবিধ খরচ',
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    addExpense({
      date,
      category,
      amount: Number(amount),
      paidFrom,
      description,
      createdBy: currentUser.name,
    });
    onClose();
  };

  return (
    <div
      id="expense-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-600 p-2 text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-bengali">
                দ্রুত খরচ এন্ট্রি (Add Expense)
              </h3>
              <p className="text-xs text-slate-500">দৈনিক ব্যবসায়িক খরচ লিপিবদ্ধ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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
            <label className="block font-semibold text-slate-700 mb-1">খরচের খাত (Category)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">পরিমাণ (টাকা) *</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="যেমন: ৫০০"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-purple-700 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">বিবরণ / নোট</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: লেবার খরচ বা ভ্যান ভাড়া"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-5 py-2 font-bold text-white hover:bg-purple-700"
            >
              <Check className="h-4 w-4" />
              <span>খরচ সেভ করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
