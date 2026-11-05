import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ExpenseDuplicateReport } from '../../services/expenseCleanupService';
import { formatDate } from '../../utils/dateUtils';

interface ExpenseCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ExpenseDuplicateReport;
  currency: string;
  onConfirm: (pin: string) => { success: boolean; message: string; count: number; amount: number };
  onSuccess: (count: number, amount: number) => void;
}

export const ExpenseCleanupModal: React.FC<ExpenseCleanupModalProps> = ({
  isOpen,
  onClose,
  report,
  currency,
  onConfirm,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('দয়া করে আপনার নিরাপত্তা পিন (PIN) লিখুন');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = onConfirm(pin);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || 'ভুল পিন (PIN), আবার চেষ্টা করুন');
    } else {
      onSuccess(res.count, res.amount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden font-bengali animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                খরচ ডুপ্লিকেট ঠিক করুন
              </h2>
              <p className="text-xs text-slate-500">
                Daily হিসাব থেকে অতিরিক্ত তৈরি হওয়া খরচ বাদ দেওয়া
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Summary Box */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs">
            <p className="text-sm font-bold text-amber-950">
              {report.duplicateCount}টি ডুপ্লিকেট খরচ এন্ট্রি পাওয়া গেছে, মোট {currency}{' '}
              {report.duplicateAmount.toLocaleString()} বাদ যাবে।
            </p>
            <p className="text-[11.5px] text-amber-800 mt-1 leading-relaxed">
              সতর্কতা: প্রতিটি Daily হিসাব শিটের জন্য শুধুমাত্র একটি বৈধ খরচ রাখা হবে। মালিক কর্তৃক হাতে তৈরি কোনো ম্যানুয়াল খরচ মুছে ফেলা হবে না। ডেটা মুছে ফেলার পূর্বে একটি সেফটি ব্যাকআপ স্বয়ংক্রিয়ভাবে তৈরি হবে।
            </p>
          </div>

          {/* List of duplicate entries to be removed */}
          {report.duplicateEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                যেসব ডুপ্লিকেট এন্ট্রি বাদ যাবে ({report.duplicateEntries.length}টি):
              </h4>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                {report.duplicateEntries.map((exp, idx) => (
                  <div key={exp.id || idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="pr-3 truncate">
                      <div className="font-semibold text-slate-800 truncate">
                        {exp.description || exp.category || 'খরচ'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatDate(exp.date)} {exp.routeOrSr ? `| ${exp.routeOrSr}` : ''}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-rose-700 shrink-0">
                      -{currency} {Number(exp.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PIN Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>নিরাপত্তা পিন (Security PIN) লিখুন:</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                placeholder="মালিকের ৪ সংখ্যার পিন লিখুন"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-widest text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
              {error && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600 text-center">
                  {error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !pin.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>ঠিক করুন</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
