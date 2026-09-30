import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, X, Check, AlertTriangle } from 'lucide-react';

interface PinPromptModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  itemName?: string;
  warning?: string;
  confirmButtonText?: string;
  confirmButtonVariant?: 'danger' | 'primary' | 'success';
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PinPromptModal: React.FC<PinPromptModalProps> = ({
  isOpen,
  title,
  subtitle,
  itemName,
  warning,
  confirmButtonText = 'নিশ্চিত করুন',
  confirmButtonVariant = 'danger',
  correctPin,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setShowPin(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedPin = pin.trim();
    if (trimmedPin.length < 4 || trimmedPin.length > 6) {
      setError('অনুগ্রহ করে ৪ থেকে ৬ সংখ্যার পিন দিন');
      inputRef.current?.focus();
      return;
    }

    const validPins = correctPin
      ? correctPin
          .split(/[|,]/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    if (validPins.includes(trimmedPin) || trimmedPin === correctPin.trim()) {
      setPin('');
      setError('');
      onSuccess();
    } else {
      setError('ভুল পিন কোড! সঠিক নিরাপত্তা পিন প্রদান করুন।');
      setPin('');
      inputRef.current?.focus();
    }
  };

  const getButtonClass = () => {
    switch (confirmButtonVariant) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'primary':
      default:
        return 'bg-slate-900 hover:bg-slate-800 text-white';
    }
  };

  return (
    <div
      id="pin-prompt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-bengali">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Item details if specified */}
        {itemName && (
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">
            <span className="text-slate-500 block">লক্ষ্যবস্তু:</span>
            <span className="font-bold text-slate-900 text-sm">{itemName}</span>
          </div>
        )}

        {/* Warning message if specified */}
        {warning && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2.5 leading-relaxed">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>{warning}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              <span>নিরাপত্তা পিন (Security PIN - ৪-৬ সংখ্যা) *</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  if (error) setError('');
                }}
                placeholder="••••"
                className="w-full text-center tracking-widest text-lg font-mono font-bold rounded-xl border border-slate-300 bg-white px-4 py-2.5 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              সেটিংস-এ নির্ধারিত ৪-৬ সংখ্যার নিরাপত্তা পিন লিখুন।
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-medium flex items-center gap-1.5 animate-in shake">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer ${getButtonClass()}`}
            >
              <Check className="h-4 w-4" />
              <span>{confirmButtonText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
