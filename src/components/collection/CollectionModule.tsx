import React, { useState } from 'react';
import {
  HandCoins,
  Search,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  FileText,
  Ban,
  Filter,
  Check,
  Printer,
  Building,
  Smartphone,
  Banknote,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Payment } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';

interface CollectionModuleProps {
  initialCustomerId?: string;
  onOpenVoidModal: (paymentId: string, receiptNo: string) => void;
}

export const CollectionModule: React.FC<CollectionModuleProps> = ({
  initialCustomerId,
  onOpenVoidModal,
}) => {
  const {
    db,
    currentUser,
    addPayment,
    todayCollection,
    todayDateStr,
  } = useApp();

  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  // Form states
  const [payDate, setPayDate] = useState<string>(todayDateStr);
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile_banking' | 'other'>('cash');
  const [receivedBy, setReceivedBy] = useState<string>(currentUser.name);
  const [note, setNote] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Selected customer
  const selectedCustomer = db.customers.find((c) => c.id === customerId);

  // Available customers for dropdown
  const availableCustomers = React.useMemo(() => {
    let list = db.customers.filter((c) => c.status === 'active');
    if (!isOwner && currentUser.role === 'sr') {
      const match = db.salesRepresentatives.find((s) => s.username === currentUser.username);
      if (match) {
        list = list.filter((c) => !c.assignedSrId || c.assignedSrId === match.id);
      }
    }
    return list;
  }, [db.customers, isOwner, currentUser]);

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!customerId) {
      setFormError('অনুগ্রহ করে কাস্টমার নির্বাচন করুন');
      return;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError('সঠিক জমার পরিমাণ (টাকা) লিখুন');
      return;
    }

    // Require PIN before saving
    setIsPinModalOpen(true);
  };

  const handleExecutePayment = () => {
    const numericAmount = Number(amount);
    try {
      const created = addPayment({
        date: payDate,
        customerId,
        amount: numericAmount,
        paymentMethod,
        receivedBy,
        note,
      });

      setFormSuccess(`রশিদ নং #${created.receiptNo} তে ${currency} ${numericAmount.toLocaleString()} টাকা সফলভাবে আদায় হিসেবে সংরক্ষিত হয়েছে! (পিন অনুমোদিত)`);
      setAmount('');
      setNote('');
      setIsPinModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'টাকা আদায় সংরক্ষণ করতে সমস্যা হয়েছে');
      setIsPinModalOpen(false);
    }
  };

  // Filter for payments table
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const filteredPayments = React.useMemo(() => {
    return db.payments.filter((p) => {
      const matchesDate = !filterDate || p.date === filterDate;
      const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
      const matchesSearch =
        !searchQuery ||
        p.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.shopName && p.shopName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.receivedBy && p.receivedBy.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesDate && matchesMethod && matchesSearch;
    });
  }, [db.payments, filterDate, methodFilter, searchQuery]);

  return (
    <div id="collection-module" className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <HandCoins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                টাকা আদায় ও রসিদ (Payment / Collection)
              </h1>
              <p className="text-xs text-slate-500">
                গ্রাহক হতে বাকি পরিশোধ গ্রহণ, লেজার আপডেট ও দৈনিক আদায় সংরক্ষণ
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 px-4 py-2 border border-blue-200 text-right">
            <span className="text-xs text-blue-700 font-medium block">আজকের মোট আদায়</span>
            <span className="text-lg font-bold text-blue-900">
              {currency} {todayCollection.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Entry Form Card */}
      <form onSubmit={handleSubmitPayment} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Banknote className="h-4 w-4 text-emerald-600" />
          টাকা আদায় ভাউচার এন্ট্রি (Record New Collection)
        </h2>

        {formSuccess && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{formSuccess}</span>
          </div>
        )}

        {formError && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-700">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> আদায়ের তারিখ
            </label>
            <input
              type="date"
              id="pay-date-input"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>কাস্টমার / দোকান নির্বাচন</span>
              {selectedCustomer && (
                <span className="text-[11px] font-bold text-rose-600">
                  বর্তমান বাকি: {currency} {selectedCustomer.currentDue.toLocaleString()}
                </span>
              )}
            </label>
            <select
              id="pay-customer-select"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500"
            >
              <option value="">-- কাস্টমার নির্বাচন করুন --</option>
              {availableCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName} — {c.name} (বাকি: {currency} {c.currentDue.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              জমার পরিমাণ / টাকা (Amount)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{currency}</span>
              <input
                id="pay-amount-input"
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="যেমন: ৫০০০"
                required
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm font-bold text-blue-700 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              পেমেন্ট মেথড (Payment Method)
            </label>
            <select
              id="pay-method-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500"
            >
              <option value="cash">নগদ ক্যাশ (Cash)</option>
              <option value="mobile_banking">মোবাইল ব্যাংকিং (bKash / Nagad / Rocket)</option>
              <option value="bank">ব্যাংক চেক / ট্রান্সফার (Bank)</option>
              <option value="other">অন্যান্য (Other)</option>
            </select>
          </div>

          {/* Received By */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              গ্রহীতার নাম (Received By)
            </label>
            <input
              id="pay-received-by-input"
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="আদায়কারীর নাম"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500"
            />
          </div>

          {/* Note / Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              নোট / ট্রানজেকশন রেফারেন্স (Note)
            </label>
            <input
              id="pay-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: TrxID বা চেক নম্বর বা মন্তব্য"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Calculated balance preview */}
        {selectedCustomer && amount !== '' && Number(amount) > 0 && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-200 flex flex-wrap items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-600">
                পূর্বের বাকি: <strong className="text-slate-900">{currency} {selectedCustomer.currentDue.toLocaleString()}</strong>
              </span>
              <span className="text-blue-700">
                জমা: <strong className="font-bold">{currency} {Number(amount).toLocaleString()}</strong>
              </span>
            </div>
            <div className="font-bold text-slate-900">
              জমার পর অবশিষ্ট বাকি হবে:{' '}
              <span className="text-rose-700 font-extrabold text-sm">
                {currency} {Math.max(0, selectedCustomer.currentDue - Number(amount)).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            id="save-payment-btn"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>টাকা আদায় নিশ্চিত ও সেভ করুন (Save Payment)</span>
          </button>
        </div>
      </form>

      {/* Collections History Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-bengali">
              আদায় রসিদ খতিয়ান (Collection History)
            </h2>
            <p className="text-xs text-slate-500">সকল সংরক্ষিত পেমেন্ট ট্রানজেকশনের তালিকা</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                সব তারিখ
              </button>
            )}

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
            >
              <option value="all">সব মাধ্যম</option>
              <option value="cash">ক্যাশ</option>
              <option value="mobile_banking">মোবাইল ব্যাংকিং</option>
              <option value="bank">ব্যাংক</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="রসিদ বা দোকান খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 w-44"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">রশিদ নং</th>
                <th className="py-2.5 px-3 font-semibold">তারিখ</th>
                <th className="py-2.5 px-3 font-semibold">কাস্টমার / দোকান</th>
                <th className="py-2.5 px-3 font-semibold">পেমেন্ট মাধ্যম</th>
                <th className="py-2.5 px-3 font-semibold">আদায়কারী</th>
                <th className="py-2.5 px-3 font-semibold">মন্তব্য</th>
                <th className="py-2.5 px-3 font-semibold text-right">আদায়ের পরিমাণ</th>
                <th className="py-2.5 px-3 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-2.5 px-3 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{pay.receiptNo}</td>
                  <td className="py-2.5 px-3 text-slate-600">{pay.date}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-900 block">{pay.shopName}</span>
                    <span className="text-[10px] text-slate-500">{pay.customerName}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {pay.paymentMethod === 'cash'
                        ? 'নগদ ক্যাশ'
                        : pay.paymentMethod === 'mobile_banking'
                        ? 'বিকাশ/নগদ'
                        : pay.paymentMethod === 'bank'
                        ? 'ব্যাংক'
                        : 'অন্যান্য'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{pay.receivedBy}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{pay.note || '-'}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700 text-sm">
                    {currency} {pay.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {pay.status === 'completed' ? (
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        সফল
                      </span>
                    ) : (
                      <span
                        className="inline-block rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                        title={pay.voidReason}
                      >
                        বাতিল (Void)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isOwner && pay.status === 'completed' && (
                      <button
                        onClick={() => onOpenVoidModal(pay.id, pay.receiptNo)}
                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        title="রশিদ বাতিল ও রিভার্সাল (Void Payment)"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    কোন আদায়ের তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIN Prompt for Due Collection */}
      <PinPromptModal
        isOpen={isPinModalOpen}
        title="বাকি আদায় অনুমোদনের পিন"
        subtitle="বাকি আদায় নিশ্চিত ও স্বাক্ষর করতে সেটিংস-এ কনফিগার করা ৪-৬ সংখ্যার পিন প্রদান করুন"
        itemName={selectedCustomer ? `${selectedCustomer.shopName || selectedCustomer.name} - ${currency} ${Number(amount).toLocaleString()}` : undefined}
        confirmButtonText="আদায় নিশ্চিত করুন"
        confirmButtonVariant="primary"
        correctPin={db.settings.securityPin || currentUser.pin || '1234'}
        onSuccess={handleExecutePayment}
        onClose={() => setIsPinModalOpen(false)}
      />
    </div>
  );
};
