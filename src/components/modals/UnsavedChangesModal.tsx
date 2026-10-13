import React, { useEffect } from 'react';
import { AlertTriangle, Save, LogOut, ArrowLeft, Loader2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSaveAndLeave: () => Promise<void> | void;
  onLeaveWithoutSaving: () => void;
  onStay: () => void;
  isSaving?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onStay,
  isSaving = false,
}) => {
  // Handle keyboard Escape to "এখানেই থাকুন"
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onStay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onStay]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        // Clicking outside the modal behaves like "এখানেই থাকুন"
        if (e.target === e.currentTarget && !isSaving) {
          onStay();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-left relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
      >
        {/* Close Button top-right (Acts as "এখানেই থাকুন") */}
        <button
          type="button"
          onClick={onStay}
          disabled={isSaving}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="বন্ধ করুন (এখানেই থাকুন)"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning Icon & Title Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border border-amber-200">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3
              id="unsaved-changes-title"
              className="text-lg font-black text-slate-900 font-bengali leading-snug"
            >
              সেভ না করা পরিবর্তন আছে
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 font-bengali leading-relaxed">
              আপনি এই হিসাবে কিছু তথ্য এন্ট্রি করেছেন যা এখনো সেভ করা হয়নি।
            </p>
          </div>
        </div>

        {/* 3 Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row-reverse sm:items-center justify-end gap-2.5 pt-4 border-t border-slate-100 font-bengali">
          {/* Button 1: সেভ করে যান (Save and Leave) */}
          <button
            type="button"
            onClick={onSaveAndLeave}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer focus:ring-2 focus:ring-emerald-400 focus:outline-none"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>সেভ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>সেভ করে যান</span>
              </>
            )}
          </button>

          {/* Button 2: সেভ ছাড়াই যান (Leave Without Saving) */}
          <button
            type="button"
            onClick={onLeaveWithoutSaving}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-rose-600" />
            <span>সেভ ছাড়াই যান</span>
          </button>

          {/* Button 3: এখানেই থাকুন (Stay Here) */}
          <button
            type="button"
            onClick={onStay}
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>এখানেই থাকুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
