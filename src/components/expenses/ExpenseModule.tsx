import React, { useState } from 'react';
import {
  Receipt,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Expense } from '../../types';
import { LessSection } from './LessSection';
import { PinPromptModal } from '../modals/PinPromptModal';
import { formatDate } from '../../utils/dateUtils';

export const ExpenseModule: React.FC = () => {
  const { db, deleteExpense, todayExpense, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';
  const ownerPin = db.settings.ownerPin || db.settings.securityPin || db.users.find((u) => u.role === 'owner')?.pin || '1234';

  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const totalMonthlyExpenses = React.useMemo(() => {
    const currentMonth = todayDateStr.slice(0, 7); // YYYY-MM
    return (db.expenses || [])
      .filter((e) => e.date.startsWith(currentMonth) && e.status === 'completed')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [db.expenses, todayDateStr]);

  const totalAllTimeExpenses = React.useMemo(() => {
    return (db.expenses || [])
      .filter((e) => e.status === 'completed')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [db.expenses]);

  const handleDeleteClick = (expense: Expense) => {
    setDeleteTarget(expense);
    setIsPinModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteExpense(deleteTarget.id);
    setIsPinModalOpen(false);
    setNotification({
      message: `খরচ এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে (${currency} ${deleteTarget.amount.toLocaleString()})`,
      type: 'success',
    });
    setDeleteTarget(null);
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div id="expenses-module" className="space-y-6">
      {/* Header & Totals Display */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-bengali">
              দৈনিক ও মাসিক ব্যবসা খরচ (Expenses)
            </h1>
            <p className="text-xs text-slate-500">
              Daily হিসাবের খরচের স্বয়ংক্রিয় তালিকা ও সার্বিক ব্যয়ের হিসাব
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-3 border border-purple-200 text-right min-w-[130px]">
            <span className="text-[11px] text-purple-700 block font-medium">আজকের মোট খরচ</span>
            <span className="text-base font-bold text-purple-900 font-mono">
              {currency} {todayExpense.toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg bg-purple-50 p-3 border border-purple-200 text-right min-w-[130px]">
            <span className="text-[11px] text-purple-700 block font-medium">চলতি মাসের খরচ</span>
            <span className="text-base font-bold text-purple-900 font-mono">
              {currency} {totalMonthlyExpenses.toLocaleString()}
            </span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-right min-w-[130px] hidden md:block">
            <span className="text-[11px] text-slate-600 block font-medium">সর্বমোট রেকর্ডকৃত খরচ</span>
            <span className="text-base font-bold text-slate-800 font-mono">
              {currency} {totalAllTimeExpenses.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Auto-populate info badge */}
      <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 text-xs text-purple-900 flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
        <div>
          <p className="font-semibold">স্বয়ংক্রিয় খরচ ট্র্যাকিং:</p>
          <p className="text-purple-800 mt-0.5">
            এই তালিকার খরচসমূহ প্রতিটি <strong>Daily হিসাব</strong> রেকর্ডের সমন্বয় ও সামারির &quot;খরচ&quot; ফিল্ড থেকে স্বয়ংক্রিয়ভাবে যুক্ত হয়। কোনো এন্ট্রি তালিকার বাইরে রাখতে চাইলে পাশের &quot;মুছুন&quot; বাটনে ক্লিক করে ওনার পিন দিয়ে তা মুছে ফেলতে পারবেন।
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-bengali">
              সকল খরচের বিবরণ ও ইতিহাস ({db.expenses.length}টি এন্ট্রি)
            </h2>
            <p className="text-[11px] text-slate-500">
              Daily হিসাব থেকে স্বয়ংক্রিয়ভাবে সংগৃহীত খরচের পূর্ণাঙ্গ রেকর্ড
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">তারিখ</th>
                <th className="py-2.5 px-3 font-semibold">রুট / এস আর / খাত</th>
                <th className="py-2.5 px-3 font-semibold">বিবরণ / রেফারেন্স</th>
                <th className="py-2.5 px-3 font-semibold">মাধ্যম</th>
                <th className="py-2.5 px-3 font-semibold">উৎস / প্রদানকারী</th>
                <th className="py-2.5 px-4 font-semibold text-right">পরিমাণ (টাকা)</th>
                <th className="py-2.5 px-4 font-semibold text-center w-20">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                    {formatDate(exp.date)}
                  </td>
                  <td className="py-3 px-3">
                    {exp.routeOrSr ? (
                      <div>
                        <span className="font-semibold text-slate-800 block">{exp.routeOrSr}</span>
                        <span className="text-[11px] text-purple-700">{exp.category}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-800">{exp.category}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs">
                    <span className="line-clamp-2">{exp.description}</span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {exp.paidFrom === 'cash' ? 'ক্যাশ' : exp.paidFrom === 'bank' ? 'ব্যাংক' : 'ব্যক্তিগত'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                    {exp.createdBy || 'Daily হিসাব'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-purple-900 text-sm whitespace-nowrap">
                    {currency} {exp.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(exp)}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors font-semibold cursor-pointer"
                      title="এই খরচ এন্ট্রিটি মুছে ফেলুন (PIN আবশ্যক)"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>মুছুন</span>
                    </button>
                  </td>
                </tr>
              ))}
              {db.expenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    কোন খরচের তথ্য পাওয়া যায়নি। Daily হিসাব সেভ করলে তার খরচ এখানে স্বয়ংক্রিয়ভাবে দৃশ্যমান হবে।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Less (Owner Advance for Business) Section */}
      <LessSection />

      {/* PIN Prompt Modal for Delete Confirmation */}
      <PinPromptModal
        isOpen={isPinModalOpen}
        title="খরচ এন্ট্রি মুছে ফেলার নিশ্চিতকরণ"
        subtitle="এই খরচ এন্ট্রিটি তালিকা থেকে মুছে ফেলতে আপনার ৪-সংখ্যার ওনার পিন দিন। এটি মূল Daily হিসাব রেকর্ড অক্ষুণ্ণ রাখবে।"
        itemName={
          deleteTarget
            ? `${formatDate(deleteTarget.date)} তারিখে ${currency} ${deleteTarget.amount.toLocaleString()} (${deleteTarget.description})`
            : ''
        }
        correctPin={ownerPin}
        confirmButtonText="হ্যাঁ, মুছে ফেলুন"
        confirmButtonVariant="danger"
        onSuccess={handleConfirmDelete}
        onClose={() => {
          setIsPinModalOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
