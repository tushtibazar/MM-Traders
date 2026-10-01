import React, { useState, useMemo } from 'react';
import {
  Coins,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
  ArrowDownLeft,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LessEntry } from '../../types';
import { formatDate } from '../../utils/dateUtils';

export const LessSection: React.FC = () => {
  const {
    db,
    currentUser,
    addLessEntry,
    updateLessStatus,
    deleteLessEntry,
    todayDateStr,
    todayLessAmount,
    totalOutstandingLess,
    totalAllTimeLess,
  } = useApp();

  const currency = db.settings.currency || '৳';

  const [date, setDate] = useState<string>(todayDateStr);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [status, setStatus] = useState<'pending' | 'reimbursed'>('pending');
  const [note, setNote] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reimbursed'>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (!description.trim()) return;

    addLessEntry({
      date,
      description: description.trim(),
      amount: Number(amount),
      status,
      note: note.trim() || undefined,
      reimbursedDate: status === 'reimbursed' ? date : undefined,
    });

    setSuccess(`লেস এন্ট্রি সফলভাবে সংরক্ষিত হয়েছে (${currency} ${Number(amount).toLocaleString()})`);
    setAmount('');
    setDescription('');
    setNote('');
    setStatus('pending');
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleToggleStatus = (entry: LessEntry) => {
    const nextStatus = entry.status === 'pending' ? 'reimbursed' : 'pending';
    updateLessStatus(
      entry.id,
      nextStatus,
      nextStatus === 'reimbursed' ? todayDateStr : undefined
    );
  };

  const filteredEntries = useMemo(() => {
    return (db.lessEntries || [])
      .filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchDate = item.date.includes(q) || formatDate(item.date).includes(q);
          const matchNote = (item.note || '').toLowerCase().includes(q);
          if (!matchDesc && !matchDate && !matchNote) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.lessEntries, statusFilter, searchQuery]);

  return (
    <div id="less-section" className="space-y-6 mt-8 pt-8 border-t-2 border-slate-200">
      {/* Less Header Card */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 font-bengali">
                লেস ট্র্যাকিং (Less / Owner Advance)
              </h2>
              <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 border border-amber-200">
                স্বতন্ত্র হিসাব
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              মালিক কর্তৃক ব্যবসার প্রয়োজনে নিজস্ব পকেট থেকে পরিশোধিত অর্থ যা পরবর্তীতে ডিলার/কোম্পানি ফেরত প্রদান করবে।
            </p>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="rounded-lg bg-white p-3 border border-amber-200 text-center shadow-xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-amber-700 block">
              আজকের লেস
            </span>
            <span className="text-sm sm:text-base font-bold text-amber-900">
              {currency} {todayLessAmount.toLocaleString()}
            </span>
          </div>

          <div className="rounded-lg bg-white p-3 border border-rose-200 text-center shadow-xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-rose-700 block">
              মোট বকেয়া লেস
            </span>
            <span className="text-sm sm:text-base font-bold text-rose-900">
              {currency} {totalOutstandingLess.toLocaleString()}
            </span>
          </div>

          <div className="rounded-lg bg-white p-3 border border-slate-200 text-center shadow-xs">
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 block">
              সর্বমোট লেস
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-800">
              {currency} {totalAllTimeLess.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <ArrowDownLeft className="h-4 w-4 text-amber-600" />
            <span>নতুন লেস এন্ট্রি (Record Less / Owner Advance)</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            * পণ্য বিক্রি বা কাস্টমার বাকির সাথে যুক্ত হবে না
          </span>
        </div>

        {success && (
          <div className="mb-3 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>তারিখ</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">
              বিবরণ (Description / Note) *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="যেমন: চকবাজার রুটে কোম্পানি শর্টফেল সমন্বয় অগ্রিম"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              টাকা (Amount) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              স্ট্যাটাস (Status)
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'reimbursed')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            >
              <option value="pending">বকেয়া (Not yet reimbursed)</option>
              <option value="reimbursed">ফেরত পেয়েছি (Reimbursed)</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block font-semibold text-slate-700 mb-1">
              অতিরিক্ত মন্তব্য / নোট (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="যেমন: ডিলারের কাছ থেকে আগামী রবিবারে ফেরত পাওয়ার কথা"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>লেস এন্ট্রি সংরক্ষণ করুন</span>
          </button>
        </div>
      </form>

      {/* Less Entries List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-bengali flex items-center gap-2">
              <span>লেস তালিকা ও ফেরত স্ট্যাটাস</span>
              <span className="text-xs font-normal text-slate-500">
                ({filteredEntries.length} টি এন্ট্রি)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              তারিখভিত্তিক তালিকা ও স্ট্যাটাস টগল করে 'ফেরত পেয়েছি' বা 'বকেয়া' আপডেট করুন
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সকল
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition ${
                  statusFilter === 'pending'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বকেয়া ({db.lessEntries.filter((l) => l.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('reimbursed')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition ${
                  statusFilter === 'reimbursed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ফেরত পেয়েছি
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="খুঁজুন..."
                className="pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white w-28 sm:w-36 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-medium">
                <th className="py-2.5 px-4">তারিখ</th>
                <th className="py-2.5 px-3">বিবরণ / নোট</th>
                <th className="py-2.5 px-3 text-right">টাকা (Amount)</th>
                <th className="py-2.5 px-3 text-center">স্ট্যাটাস (ক্লিক করে পরিবর্তন)</th>
                <th className="py-2.5 px-3">ফেরত তারিখ</th>
                <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                    {formatDate(item.date)}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{item.description}</div>
                    {item.note && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.note}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sm whitespace-nowrap">
                    <span className={item.status === 'pending' ? 'text-rose-700' : 'text-emerald-700'}>
                      {currency} {item.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer border ${
                        item.status === 'pending'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title="স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন"
                    >
                      {item.status === 'pending' ? (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>বকেয়া (Not Reimbursed)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>ফেরত পেয়েছি (Reimbursed)</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                    {item.reimbursedDate || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`আপনি কি নিশ্চিতভাবে এই লেস এন্ট্রি (${currency} ${item.amount}) মুছে ফেলতে চান?`)) {
                          deleteLessEntry(item.id);
                        }
                      }}
                      className="rounded p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="মুছুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    কোন লেস এন্ট্রি পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
            {filteredEntries.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/70 font-semibold text-slate-700">
                  <td colSpan={2} className="py-2.5 px-4 text-right">
                    চলমান তালিকায় মোট:
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {currency}{' '}
                    {filteredEntries
                      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
                      .toLocaleString()}
                  </td>
                  <td colSpan={3} className="py-2.5 px-4 text-xs text-slate-500">
                    বকেয়া: {currency}{' '}
                    {filteredEntries
                      .filter((i) => i.status === 'pending')
                      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                      .toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
