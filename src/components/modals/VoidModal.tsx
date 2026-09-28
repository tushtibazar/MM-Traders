import React, { useState } from 'react';
import { Ban, AlertTriangle, Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface VoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'sale' | 'payment';
  targetId: string;
  referenceNo: string;
}

export const VoidModal: React.FC<VoidModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  referenceNo,
}) => {
  const { voidSale, voidPayment } = useApp();
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('ভাউচার বাতিল করার কারণ উল্লেখ করা বাধ্যতামূলক');
      return;
    }

    try {
      if (targetType === 'sale') {
        voidSale(targetId, reason);
      } else {
        voidPayment(targetId, reason);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'বাতিল করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div
      id="void-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-rose-200">
        <div className="flex items-center gap-3 text-rose-600 mb-3">
          <div className="rounded-full bg-rose-100 p-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-bengali">
              {targetType === 'sale' ? 'বিক্রয় মেমো বাতিল (Void Sale)' : 'আদায় রশিদ বাতিল (Void Payment)'}
            </h3>
            <p className="text-xs text-rose-600 font-semibold">ভাউচার নং: {referenceNo}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4">
          সতর্কতা: এই ভাউচারটি বাতিল করলে স্বয়ংক্রিয়ভাবে কাস্টমারের লেজার ও বর্তমান বাকি পূর্বাবস্থায় ফিরে যাবে।
          স্টক থাকলে তা পুনরায় গুদামে যুক্ত হবে। এই অ্যাকশন রেকর্ড হিসেবে থাকবে।
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              বাতিল করার কারণ (Reason for Void) *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: ভুল এন্ট্রি / ডুপ্লিকেট ভাউচার / অর্ডার বাতিল"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              ফিরে যান
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
            >
              <Ban className="h-4 w-4" />
              <span>নিশ্চিত বাতিল করুন</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
