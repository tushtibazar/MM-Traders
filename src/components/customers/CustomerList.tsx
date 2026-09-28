import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  BookOpen,
  Edit,
  Trash2,
  AlertTriangle,
  Phone,
  Store,
  MapPin,
  CheckCircle2,
  XCircle,
  HandCoins,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';

interface CustomerListProps {
  onSelectCustomer: (customer: Customer) => void;
  onOpenQuickPayment: (customerId: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  onSelectCustomer,
  onOpenQuickPayment,
}) => {
  const { db, currentUser, addCustomer, updateCustomer, deleteCustomer } = useApp();
  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [srFilter, setSrFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Delete Customer with PIN confirmation
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletePinModalOpen, setIsDeletePinModalOpen] = useState<boolean>(false);

  const [formName, setFormName] = useState<string>('');
  const [formShopName, setFormShopName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formSrId, setFormSrId] = useState<string>(db.salesRepresentatives[0]?.id || '');
  const [formOpeningBalance, setFormOpeningBalance] = useState<number>(0);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormShopName('');
    setFormPhone('');
    setFormAddress('');
    setFormSrId(db.salesRepresentatives[0]?.id || '');
    setFormOpeningBalance(0);
    setFormNotes('');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name);
    setFormShopName(cust.shopName);
    setFormPhone(cust.phone);
    setFormAddress(cust.address);
    setFormSrId(cust.assignedSrId || db.salesRepresentatives[0]?.id || '');
    setFormOpeningBalance(cust.openingBalance);
    setFormNotes(cust.notes || '');
    setFormStatus(cust.status);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedSr = db.salesRepresentatives.find((s) => s.id === formSrId);
    const assignedSrName = assignedSr ? assignedSr.name : 'সাধারণ';

    if (editingCustomer) {
      updateCustomer({
        ...editingCustomer,
        name: formName,
        shopName: formShopName,
        phone: formPhone,
        address: formAddress,
        assignedSrId: formSrId,
        assignedSrName,
        notes: formNotes,
        status: formStatus,
      });
    } else {
      addCustomer({
        name: formName,
        shopName: formShopName,
        phone: formPhone,
        address: formAddress,
        assignedSrId: formSrId,
        assignedSrName,
        openingBalance: Number(formOpeningBalance) || 0,
        status: formStatus,
        notes: formNotes,
      });
    }

    setIsModalOpen(false);
  };

  const filteredCustomers = React.useMemo(() => {
    let list = db.customers;

    // If SR, only see their customers
    if (!isOwner && currentUser.role === 'sr') {
      const match = db.salesRepresentatives.find((s) => s.username === currentUser.username);
      if (match) {
        list = list.filter((c) => !c.assignedSrId || c.assignedSrId === match.id);
      }
    }

    if (srFilter !== 'all') {
      list = list.filter((c) => c.assignedSrId === srFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shopName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [db.customers, isOwner, currentUser, srFilter, statusFilter, searchQuery]);

  return (
    <div id="customer-list-module" className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                কাস্টমার ব্যবস্থাপনা (Customers)
              </h1>
              <p className="text-xs text-slate-500">
                দোকানদার ও গ্রাহকদের তথ্য, এরিয়া ভিত্তিক এস আর ও বর্তমান বকেয়া
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              id="add-customer-btn"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>নতুন কাস্টমার যোগ করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="customer-search-input"
              placeholder="দোকান বা মালিকের নাম, মোবাইল বা ঠিকানা..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isOwner && (
              <div className="flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={srFilter}
                  onChange={(e) => setSrFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
                >
                  <option value="all">সব SR (All SRs)</option>
                  {db.salesRepresentatives.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
            >
              <option value="all">সব স্ট্যাটাস</option>
              <option value="active">সক্রিয় (Active)</option>
              <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">দোকান ও মালিকের নাম</th>
                <th className="py-3 px-3 font-semibold">মোবাইল নম্বর</th>
                <th className="py-3 px-3 font-semibold">ঠিকানা</th>
                <th className="py-3 px-3 font-semibold">নিয়োজিত এস আর</th>
                <th className="py-3 px-3 font-semibold text-right">বর্তমান বাকি</th>
                <th className="py-3 px-3 font-semibold text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onSelectCustomer(c)}
                      className="text-left font-bold text-slate-900 hover:text-emerald-700 hover:underline"
                    >
                      <span className="block text-sm">{c.shopName}</span>
                      <span className="text-[11px] text-slate-500 font-normal">মালিক: {c.name}</span>
                    </button>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{c.phone}</td>
                  <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate">{c.address || '-'}</td>
                  <td className="py-3 px-3 text-slate-700">{c.assignedSrName || '-'}</td>
                  <td className="py-3 px-3 text-right font-bold text-sm">
                    <span className={c.currentDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                      {currency} {c.currentDue.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {c.status === 'active' ? (
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        সক্রিয়
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        নিষ্ক্রিয়
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectCustomer(c)}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-800"
                        title="সম্পূর্ণ লেজার খতিয়ান দেখুন"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>লেজার</span>
                      </button>

                      <button
                        onClick={() => onOpenQuickPayment(c.id)}
                        className="rounded bg-emerald-50 hover:bg-emerald-100 p-1 text-emerald-700"
                        title="টাকা আদায় রেকর্ড করুন"
                      >
                        <HandCoins className="h-4 w-4" />
                      </button>

                      {isOwner && (
                        <>
                          <button
                            onClick={() => openEditModal(c)}
                            className="rounded bg-slate-100 hover:bg-slate-200 p-1 text-slate-700"
                            title="তথ্য সংশোধন করুন"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCustomerToDelete(c);
                              setIsDeletePinModalOpen(true);
                            }}
                            className="rounded bg-rose-50 hover:bg-rose-100 p-1 text-rose-600 transition-colors"
                            title="কাস্টমার মুছে ফেলুন (পিন আবশ্যক)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    কোন কাস্টমার পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-slate-900 font-bengali mb-4">
              {editingCustomer ? 'কাস্টমারের তথ্য সংশোধন' : 'নতুন কাস্টমার যোগ করুন'}
            </h2>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">দোকানের নাম (Shop Name) *</label>
                  <input
                    type="text"
                    required
                    value={formShopName}
                    onChange={(e) => setFormShopName(e.target.value)}
                    placeholder="যেমন: ভাই ভাই জেনারেল স্টোর"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">প্রোপাইটার / কাস্টমারের নাম *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="যেমন: মো: রফিকুল ইসলাম"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="০১৭১২-..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">সেলস রিপ্রেজেন্টেটিভ (SR)</label>
                  <select
                    value={formSrId}
                    onChange={(e) => setFormSrId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  >
                    {db.salesRepresentatives.map((sr) => (
                      <option key={sr.id} value={sr.id}>
                        {sr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ঠিকানা / এরিয়া</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="দোকানের অবস্থান বা বাজার"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                />
              </div>

              {!editingCustomer && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    প্রারম্ভিক বকেয়া (Opening Balance Due)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formOpeningBalance}
                    onChange={(e) => setFormOpeningBalance(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400">
                    পূর্বের কোন বকেয়া থাকলে এখানে দিন, অন্যথায় ০ রাখুন
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="inactive">নিষ্ক্রিয় (Inactive)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">মন্তব্য (Note)</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="বিশেষ নির্দেশনা"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer PIN Confirmation Modal */}
      {isDeletePinModalOpen && customerToDelete && (
        <PinPromptModal
          isOpen={isDeletePinModalOpen}
          title="কাস্টমার মুছে ফেলার অনুমোদন"
          subtitle={
            customerToDelete.currentDue > 0
              ? `⚠️ সতর্কতা: ${customerToDelete.shopName}-এর ${currency} ${customerToDelete.currentDue.toLocaleString()} টাকা বকেয়া বাকি আছে! মুছে ফেললে কাস্টমার ডিরেক্টরি থেকে সরানো হবে। নিশ্চিত করতে নিরাপত্তা পিন দিন:`
              : (db.customerLedgers || []).some((l) => l.customerId === customerToDelete.id)
              ? `ℹ️ এই কাস্টমারের পূর্বের লেনদেনের হিসাব রয়েছে। মুছে ফেলতে মালিকের নিরাপত্তা পিন দিন:`
              : `কাস্টমার '${customerToDelete.shopName}' নিশ্চিতভাবে মুছে ফেলতে মালিকের নিরাপত্তা পিন দিন:`
          }
          itemName={`${customerToDelete.shopName} (${customerToDelete.name})`}
          confirmButtonText="কাস্টমার ডিলিট করুন"
          confirmButtonVariant="danger"
          correctPin={db.settings.securityPin || currentUser.pin || '1234'}
          onSuccess={() => {
            deleteCustomer(customerToDelete.id);
            setIsDeletePinModalOpen(false);
            setCustomerToDelete(null);
          }}
          onClose={() => {
            setIsDeletePinModalOpen(false);
            setCustomerToDelete(null);
          }}
        />
      )}
    </div>
  );
};
