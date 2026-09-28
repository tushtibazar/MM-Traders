import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Phone,
  MapPin,
  TrendingUp,
  HandCoins,
  Wallet,
  FileDown,
  Target,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SalesRepresentative } from '../../types';
import { generateSRPerformancePDF } from '../../services/pdfGenerator';

export const SRModule: React.FC = () => {
  const { db, addSalesRepresentative, updateSalesRepresentative, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSr, setEditingSr] = useState<SalesRepresentative | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [territory, setTerritory] = useState('');
  const [dailyTarget, setDailyTarget] = useState<number>(20000);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('1234');

  const openAdd = () => {
    setEditingSr(null);
    setName('');
    setPhone('');
    setTerritory('');
    setDailyTarget(20000);
    setUsername(`sr_${Date.now().toString().slice(-4)}`);
    setPin('1234');
    setIsModalOpen(true);
  };

  const openEdit = (sr: SalesRepresentative) => {
    setEditingSr(sr);
    setName(sr.name);
    setPhone(sr.phone);
    setTerritory(sr.territory);
    setDailyTarget(sr.dailyTarget || 20000);
    setUsername(sr.username);
    setPin(sr.pin);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSr) {
      updateSalesRepresentative({
        ...editingSr,
        name,
        phone,
        territory,
        dailyTarget: Number(dailyTarget) || 0,
        username,
        pin,
      });
    } else {
      addSalesRepresentative({
        name,
        phone,
        territory,
        dailyTarget: Number(dailyTarget) || 0,
        username,
        pin,
        active: true,
      });
    }
    setIsModalOpen(false);
  };

  // Compute metrics per SR
  const srData = React.useMemo(() => {
    return db.salesRepresentatives.map((sr) => {
      const allSales = db.sales.filter((s) => s.srId === sr.id && s.status === 'completed');
      const allPayments = db.payments.filter((p) => p.srId === sr.id && p.status === 'completed');
      const customers = db.customers.filter((c) => c.assignedSrId === sr.id);

      const totalSalesAmount = allSales.reduce((sum, s) => sum + s.netSales, 0);
      const totalCollectionAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalCustomerDue = customers.reduce((sum, c) => sum + c.currentDue, 0);

      const todaySales = allSales
        .filter((s) => s.date === todayDateStr)
        .reduce((sum, s) => sum + s.netSales, 0);

      const todayCollection = allPayments
        .filter((p) => p.date === todayDateStr)
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        sr,
        customerCount: customers.length,
        totalSalesAmount,
        totalCollectionAmount,
        totalCustomerDue,
        todaySales,
        todayCollection,
      };
    });
  }, [db.salesRepresentatives, db.sales, db.payments, db.customers, todayDateStr]);

  const handleDownloadPDF = () => {
    generateSRPerformancePDF(
      db.settings,
      srData.map((d) => ({
        name: d.sr.name,
        territory: d.sr.territory,
        customerCount: d.customerCount,
        sales: d.totalSalesAmount,
        collection: d.totalCollectionAmount,
        due: d.totalCustomerDue,
      })),
    );
  };

  return (
    <div id="sr-module" className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-bengali">
              সেলস রিপ্রেজেন্টেটিভ (SR) পারফরম্যান্স
            </h1>
            <p className="text-xs text-slate-500">
              মাঠ পর্যায়ের বিক্রয় প্রতিনিধি, এরিয়া ভিত্তিক বিক্রয়, আদায় ও বাকি ট্র্যাকিং
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4" />
            <span>SR রিপোর্ট PDF</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন SR যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* SR Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {srData.map(({ sr, customerCount, totalSalesAmount, totalCollectionAmount, totalCustomerDue, todaySales, todayCollection }) => (
          <div
            key={sr.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{sr.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-slate-400" /> {sr.territory}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3 text-slate-400" /> {sr.phone}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(sr)}
                  className="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
                >
                  এডিট
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">দোকান সংখ্যা</span>
                  <strong className="text-slate-800 text-sm">{customerCount} টি</strong>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">দৈনিক টার্গেট</span>
                  <strong className="text-slate-800 text-sm">{currency} {(sr.dailyTarget || 0).toLocaleString()}</strong>
                </div>
                <div className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 block">আজকের বিক্রয়</span>
                  <strong className="text-emerald-800 text-sm">{currency} {todaySales.toLocaleString()}</strong>
                </div>
                <div className="rounded-lg bg-blue-50/70 p-2.5 border border-blue-100">
                  <span className="text-[10px] text-blue-700 block">আজকের আদায়</span>
                  <strong className="text-blue-800 text-sm">{currency} {todayCollection.toLocaleString()}</strong>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">সর্বমোট বিক্রয়:</span>
                  <strong className="text-emerald-700">{currency} {totalSalesAmount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">সর্বমোট আদায়:</span>
                  <strong className="text-blue-700">{currency} {totalCollectionAmount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">গ্রাহকদের কাছে বর্তমান বাকি:</span>
                  <strong className="text-rose-700">{currency} {totalCustomerDue.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
              <span>লগইন ইউজার: {sr.username}</span>
              <span>পিন: {sr.pin}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-slate-900 font-bengali mb-4">
              {editingSr ? 'SR তথ্য সম্পাদনা' : 'নতুন সেলস রিপ্রেজেন্টেটিভ যোগ'}
            </h2>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">SR নাম *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মো: তানভীর আহমেদ"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ফোন নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="০১৭১১-..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">এরিয়া / টেরিটরি *</label>
                  <input
                    type="text"
                    required
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    placeholder="যেমন: চকবাজার ও নিউ মার্কেট"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">দৈনিক বিক্রয় টার্গেট (টাকা)</label>
                <input
                  type="number"
                  min="0"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">লগইন ইউজারনেম *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">লগইন পিন কোড *</label>
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
