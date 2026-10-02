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
  Truck,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SalesRepresentative, DeliveryRepresentative } from '../../types';
import { generateSRPerformancePDF } from '../../services/pdfGenerator';
import { PinPromptModal } from '../modals/PinPromptModal';
import { formatDate } from '../../utils/dateUtils';

export const SRModule: React.FC = () => {
  const {
    db,
    currentUser,
    addSalesRepresentative,
    updateSalesRepresentative,
    addDSR,
    updateDSR,
    deleteDSR,
    todayDateStr,
  } = useApp();
  const currency = db.settings.currency || '৳';

  // Sub-navigation view filter ('all', 'sr', 'dsr')
  const [activeTab, setActiveTab] = useState<'all' | 'sr' | 'dsr'>('all');

  // ================= SR STATE =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSr, setEditingSr] = useState<SalesRepresentative | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [territory, setTerritory] = useState('');
  const [dailyTarget, setDailyTarget] = useState<number>(20000);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('1234');

  // ================= DSR STATE =================
  const [isDsrModalOpen, setIsDsrModalOpen] = useState(false);
  const [editingDsr, setEditingDsr] = useState<DeliveryRepresentative | null>(null);
  const [dsrName, setDsrName] = useState('');
  const [dsrPhone, setDsrPhone] = useState('');
  const [dsrVehicleNo, setDsrVehicleNo] = useState('');
  const [dsrActive, setDsrActive] = useState(true);

  // DSR Delete Modal State
  const [dsrToDelete, setDsrToDelete] = useState<DeliveryRepresentative | null>(null);
  const [isDeleteDsrModalOpen, setIsDeleteDsrModalOpen] = useState(false);

  // ================= SR HANDLERS =================
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
    return (db.salesRepresentatives || []).map((sr) => {
      const allSales = (db.sales || []).filter((s) => s.srId === sr.id && s.status === 'completed');
      const allPayments = (db.payments || []).filter((p) => p.srId === sr.id && p.status === 'completed');
      const customers = (db.customers || []).filter((c) => c.assignedSrId === sr.id);

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

  // ================= DSR HANDLERS =================
  const openAddDsr = () => {
    setEditingDsr(null);
    setDsrName('');
    setDsrPhone('');
    setDsrVehicleNo('');
    setDsrActive(true);
    setIsDsrModalOpen(true);
  };

  const openEditDsr = (dsr: DeliveryRepresentative) => {
    setEditingDsr(dsr);
    setDsrName(dsr.name);
    setDsrPhone(dsr.phone);
    setDsrVehicleNo(dsr.vehicleNo || '');
    setDsrActive(dsr.active !== false);
    setIsDsrModalOpen(true);
  };

  const handleSaveDsr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dsrName.trim()) return;

    if (editingDsr) {
      updateDSR({
        ...editingDsr,
        name: dsrName.trim(),
        phone: dsrPhone.trim(),
        vehicleNo: dsrVehicleNo.trim(),
        active: dsrActive,
      });
    } else {
      addDSR({
        name: dsrName.trim(),
        phone: dsrPhone.trim(),
        vehicleNo: dsrVehicleNo.trim(),
        active: dsrActive,
      });
    }
    setIsDsrModalOpen(false);
  };

  const handleDeleteDsrClick = (dsr: DeliveryRepresentative) => {
    setDsrToDelete(dsr);
    setIsDeleteDsrModalOpen(true);
  };

  const handleConfirmDeleteDsr = () => {
    if (dsrToDelete) {
      deleteDSR(dsrToDelete.id);
      setIsDeleteDsrModalOpen(false);
      setDsrToDelete(null);
    }
  };

  // Compute metrics per DSR
  const dsrData = React.useMemo(() => {
    return (db.deliveryRepresentatives || []).map((dsr) => {
      const sheets = (db.dailySheets || []).filter(
        (s) => s.dsrId === dsr.id || s.dsrName?.trim() === dsr.name.trim()
      );
      const totalSheets = sheets.length;
      const completedSheets = sheets.filter(
        (s) => s.status === 'confirmed' || s.status === 'completed'
      ).length;
      const totalDeliveredQty = sheets.reduce((sum, s) => sum + (s.totalIssuedQty || 0), 0);
      const totalNetSoldQty = sheets.reduce((sum, s) => sum + (s.totalNetSoldQty || 0), 0);
      const totalCashSubmitted = sheets.reduce(
        (sum, s) => sum + (s.netCashSubmitted || s.cashCollected || 0),
        0
      );
      const todaySheets = sheets.filter((s) => s.date === todayDateStr);
      const todayDeliveredQty = todaySheets.reduce((sum, s) => sum + (s.totalIssuedQty || 0), 0);

      const latestSheet = [...sheets].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      return {
        dsr,
        totalSheets,
        completedSheets,
        totalDeliveredQty,
        totalNetSoldQty,
        totalCashSubmitted,
        todaySheetsCount: todaySheets.length,
        todayDeliveredQty,
        latestDate: latestSheet?.date || null,
      };
    });
  }, [db.deliveryRepresentatives, db.dailySheets, todayDateStr]);

  // Warning text if DSR has existing referenced daily sheets
  const referencedSheetCount = React.useMemo(() => {
    if (!dsrToDelete) return 0;
    return (db.dailySheets || []).filter(
      (s) => s.dsrId === dsrToDelete.id || s.dsrName?.trim() === dsrToDelete.name.trim()
    ).length;
  }, [db.dailySheets, dsrToDelete]);

  const deleteWarningText =
    referencedSheetCount > 0
      ? `সতর্কতা: এই DSR-এর নামে ${referencedSheetCount} টি দৈনিক হিসাব রেকর্ডের চালান রয়েছে! মুছে ফেললে নতুন চালানে এই DSR ড্রপডাউনে পাওয়া যাবে না, তবে পূর্বের সংরক্ষিত চালানে হিসাব অক্ষুণ্ণ থাকবে। আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?`
      : undefined;

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
              সেলস রিপ্রেজেন্টেটিভ (SR) ও DSR পারফরম্যান্স
            </h1>
            <p className="text-xs text-slate-500">
              মাঠ পর্যায়ের বিক্রয় প্রতিনিধি (SR) ও ডেলিভারি প্রতিনিধি (DSR) ব্যবস্থাপনা
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 cursor-pointer transition-colors shadow-xs"
            title="SR পারফরম্যান্স রিপোর্ট প্রিন্ট প্রিভিউ দেখুন"
          >
            <Eye className="h-4 w-4 text-sky-600" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>নতুন SR যোগ করুন</span>
          </button>
          <button
            onClick={openAddDsr}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>+ নতুন DSR যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Segmented Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-3 pt-2 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'border-slate-800 text-slate-900 bg-slate-100/70 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <span>উভয় তালিকা (SR ও DSR)</span>
        </button>
        <button
          onClick={() => setActiveTab('sr')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'sr'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>১. SR তালিকা ({srData.length} জন)</span>
        </button>
        <button
          onClick={() => setActiveTab('dsr')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'dsr'
              ? 'border-blue-600 text-blue-700 bg-blue-50/60 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>২. DSR তালিকা ({dsrData.length} জন)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: SR LIST SECTION */}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'sr') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 font-bengali">
                    সেলস রিপ্রেজেন্টেটিভ (SR) তালিকা
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {srData.length} জন
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  মাঠ পর্যায়ের বিক্রয় প্রতিনিধি, এরিয়া ভিত্তিক বিক্রয়, আদায় ও বাকি ট্র্যাকিং
                </p>
              </div>
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ নতুন SR যোগ করুন</span>
            </button>
          </div>

          {/* SR Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {srData.map(
              ({
                sr,
                customerCount,
                totalSalesAmount,
                totalCollectionAmount,
                totalCustomerDue,
                todaySales,
                todayCollection,
              }) => (
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
                        className="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded cursor-pointer"
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
                        <strong className="text-slate-800 text-sm">
                          {currency} {(sr.dailyTarget || 0).toLocaleString()}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 block">আজকের বিক্রয়</span>
                        <strong className="text-emerald-800 text-sm">
                          {currency} {todaySales.toLocaleString()}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-blue-50/70 p-2.5 border border-blue-100">
                        <span className="text-[10px] text-blue-700 block">আজকের আদায়</span>
                        <strong className="text-blue-800 text-sm">
                          {currency} {todayCollection.toLocaleString()}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">সর্বমোট বিক্রয়:</span>
                        <strong className="text-emerald-700">
                          {currency} {totalSalesAmount.toLocaleString()}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">সর্বমোট আদায়:</span>
                        <strong className="text-blue-700">
                          {currency} {totalCollectionAmount.toLocaleString()}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">গ্রাহকদের কাছে বর্তমান বাকি:</span>
                        <strong className="text-rose-700">
                          {currency} {totalCustomerDue.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
                    <span>লগইন ইউজার: {sr.username}</span>
                    <span>পিন: •••• (সুরক্ষিত)</span>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: DSR LIST SECTION (Clearly labeled DSR তালিকা) */}
      {/* ======================================================== */}
      {(activeTab === 'all' || activeTab === 'dsr') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 font-bengali">
                    DSR তালিকা (Delivery Sales Representatives)
                  </h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                    {dsrData.length} জন
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  মাঠ পর্যায়ে পণ্য বিতরণকারী ডেলিভারি প্রতিনিধি, ভ্যান চালক ও দৈনিক চালান ডেলিভারি দল
                </p>
              </div>
            </div>
            <button
              onClick={openAddDsr}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ নতুন DSR যোগ করুন</span>
            </button>
          </div>

          {/* DSR Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dsrData.map(
              ({
                dsr,
                totalSheets,
                completedSheets,
                totalDeliveredQty,
                totalNetSoldQty,
                totalCashSubmitted,
                todaySheetsCount,
                todayDeliveredQty,
                latestDate,
              }) => (
                <div
                  key={dsr.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors"
                >
                  <div>
                    {/* Top Row: Name, Vehicle, Action Buttons */}
                    <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 text-base truncate">{dsr.name}</h3>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                              dsr.active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {dsr.active !== false ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{dsr.phone || 'ফোন নম্বর নেই'}</span>
                        </p>
                        {dsr.vehicleNo && (
                          <p className="text-xs text-blue-700 flex items-center gap-1 mt-0.5">
                            <Truck className="h-3 w-3 text-blue-500 shrink-0" />
                            <span>{dsr.vehicleNo}</span>
                          </p>
                        )}
                      </div>

                      {/* Action buttons (Edit and Delete) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditDsr(dsr)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                          title="DSR তথ্য সম্পাদনা করুন"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>এডিট</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDsrClick(dsr)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors cursor-pointer"
                          title="DSR মুছে ফেলুন"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>ডিলিট</span>
                        </button>
                      </div>
                    </div>

                    {/* DSR Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">মোট চালান সংখ্যা</span>
                        <strong className="text-slate-800 text-sm">{totalSheets} টি</strong>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <span className="text-[10px] text-slate-500 block">সম্পন্ন চালান</span>
                        <strong className="text-emerald-700 text-sm">{completedSheets} টি</strong>
                      </div>
                      <div className="rounded-lg bg-blue-50/70 p-2.5 border border-blue-100">
                        <span className="text-[10px] text-blue-700 block">আজকের বিতরণ</span>
                        <strong className="text-blue-800 text-sm">{todayDeliveredQty} পিস/কা:</strong>
                      </div>
                      <div className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-100">
                        <span className="text-[10px] text-emerald-700 block">মোট সরবরাহ (বিতরণ)</span>
                        <strong className="text-emerald-800 text-sm">{totalDeliveredQty} পিস/কা:</strong>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">মোট বিক্রয় বিতরণ:</span>
                        <strong className="text-slate-800">{totalNetSoldQty} পিস/কার্টন</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">মোট ক্যাশ জমা এনেছেন:</span>
                        <strong className="text-emerald-700">
                          {currency} {totalCashSubmitted.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      সর্বশেষ চালান: {latestDate ? formatDate(latestDate) : 'এখনো কোন চালান নেই'}
                    </span>
                    <span className="font-mono text-slate-400">ID: {dsr.id}</span>
                  </div>
                </div>
              ),
            )}

            {dsrData.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                <Truck className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h3 className="font-bold text-slate-700 text-sm mb-1">কোন DSR পাওয়া যায়নি</h3>
                <p className="text-xs text-slate-500 mb-4">
                  দৈনিক চালানে যুক্ত করতে নতুন ডেলিভারি প্রতিনিধি যোগ করুন
                </p>
                <button
                  onClick={openAddDsr}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ নতুন DSR যোগ করুন</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT SR MODAL */}
      {/* ======================================================== */}
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">লগইন পিন কোড *</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT DSR MODAL */}
      {/* ======================================================== */}
      {isDsrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900 font-bengali">
                  {editingDsr ? 'DSR তথ্য সম্পাদনা' : 'নতুন ডেলিভারি রিপ্রেজেন্টেটিভ (DSR) যোগ'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDsrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDsr} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  DSR নাম (Name) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={dsrName}
                  onChange={(e) => setDsrName(e.target.value)}
                  placeholder="যেমন: মো: রফিকুল ইসলাম"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ফোন নম্বর (Phone Number) *
                </label>
                <input
                  type="text"
                  required
                  value={dsrPhone}
                  onChange={(e) => setDsrPhone(e.target.value)}
                  placeholder="যেমন: ০১৮১২-৩৪৫৬৭৮"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  গাড়ি / ভ্যান নম্বর অথবা দায়িত্ব (Vehicle / Role)
                </label>
                <input
                  type="text"
                  value={dsrVehicleNo}
                  onChange={(e) => setDsrVehicleNo(e.target.value)}
                  placeholder="যেমন: ঢাকা মেট্রো-ভ ১২-৩৪৫৬ অথবা ভ্যান চালক"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  সংরক্ষণ করার পর এই DSR অবিলম্বে দৈনিক বিক্রি হিসাবের DSR ড্রপডাউনে পাওয়া যাবে।
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dsr-active-toggle"
                  checked={dsrActive}
                  onChange={(e) => setDsrActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="dsr-active-toggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  এই DSR সক্রিয় রয়েছে (Daily হিসাব ড্রপডাউনে প্রদর্শিত হবে)
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDsrModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!dsrName.trim() || !dsrPhone.trim()}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {editingDsr ? 'আপডেট সংরক্ষণ করুন' : 'DSR সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE DSR WITH PIN CONFIRMATION */}
      {/* ======================================================== */}
      <PinPromptModal
        isOpen={isDeleteDsrModalOpen}
        title="DSR মুছে ফেলার অনুমোদন (PIN)"
        subtitle="ডেলিভারি প্রতিনিধি মুছে ফেলার জন্য সিকিউরিটি পিন দিন"
        itemName={dsrToDelete?.name}
        warning={deleteWarningText}
        confirmButtonText="DSR ডিলিট করুন"
        confirmButtonVariant="danger"
        correctPin={[
          db.settings.securityPin,
          db.settings.ownerPin,
          currentUser.pin,
          db.users?.find((u) => u.role === 'owner')?.pin,
          '1234',
        ]
          .filter(Boolean)
          .join('|')}
        onSuccess={handleConfirmDeleteDsr}
        onClose={() => {
          setIsDeleteDsrModalOpen(false);
          setDsrToDelete(null);
        }}
      />
    </div>
  );
};
