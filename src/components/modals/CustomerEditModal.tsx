import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit,
  Store,
  User,
  Phone,
  MapPin,
  ShieldAlert,
  Coins,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';

interface CustomerEditModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
}) => {
  const { db, updateCustomerWithCorrection, currentUser } = useApp();
  const currency = db.settings.currency || '৳';

  // Form Fields
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [route, setRoute] = useState('');
  const [assignedSrId, setAssignedSrId] = useState('');
  const [notes, setNotes] = useState('');

  // Money Correction Fields
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [correctionReason, setCorrectionReason] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Validation & Warnings
  const [errorMsg, setErrorMsg] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Available routes
  const availableRoutes = useMemo(() => {
    const custom = db.settings.customRoutes || [];
    const srTerritories = db.salesRepresentatives
      .map((s) => s.territory)
      .filter(Boolean);
    const set = new Set([...custom, ...srTerritories]);
    return Array.from(set);
  }, [db.settings.customRoutes, db.salesRepresentatives]);

  // Pre-fill state when opening
  useEffect(() => {
    if (customer && isOpen) {
      setName(customer.name || '');
      setShopName(customer.shopName || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setRoute(customer.route || '');
      setAssignedSrId(customer.assignedSrId || '');
      setNotes(customer.notes || '');
      setOpeningBalance(customer.openingBalance ?? 0);
      setCorrectionReason('');
      setPin('');
      setShowPin(false);
      setErrorMsg('');
      setAllowDuplicate(false);
    }
  }, [customer, isOpen]);

  // Check if money figure was modified
  const isMoneyModified = useMemo(() => {
    if (!customer) return false;
    const currentVal = openingBalance === '' ? 0 : Number(openingBalance);
    return currentVal !== (customer.openingBalance ?? 0);
  }, [customer, openingBalance]);

  // Calculated new current due
  const calculatedCurrentDue = useMemo(() => {
    if (!customer) return 0;
    const newOpening = openingBalance === '' ? 0 : Number(openingBalance);
    const oldOpening = customer.openingBalance ?? 0;
    const diff = newOpening - oldOpening;
    return Math.max(0, (customer.currentDue || 0) + diff);
  }, [customer, openingBalance]);

  // Duplicate Check: Look for other active customers with same name, shopName or phone
  const duplicateWarning = useMemo(() => {
    if (!customer) return null;
    const cleanName = name.trim().toLowerCase();
    const cleanShop = shopName.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    const match = db.customers.find((c) => {
      if (c.id === customer.id || c.status !== 'active') return false;
      const cPhone = (c.phone || '').trim().replace(/\D/g, '');
      const cName = (c.name || '').trim().toLowerCase();
      const cShop = (c.shopName || '').trim().toLowerCase();

      if (cleanPhone && cPhone && cleanPhone === cPhone) return true;
      if (cleanName && cName && cleanName === cName) return true;
      if (cleanShop && cShop && cleanShop === cShop) return true;
      return false;
    });

    if (match) {
      return `এই নাম/ফোন নম্বরে আরেকজন কাস্টমার আছে: "${match.shopName || match.name}" (${match.phone || 'ফোন নেই'})`;
    }
    return null;
  }, [customer, db.customers, name, shopName, phone]);

  // Phone number soft warning (Bangladesh 11 digits)
  const phoneWarning = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length !== 11) {
      return `বাংলাদেশী মোবাইল নম্বর সাধারণত ১১ ডিজিটের হয় (বর্তমানে ${digits.length} ডিজিট রয়েছে)`;
    }
    return '';
  }, [phone]);

  if (!isOpen || !customer) return null;

  // Handle Save
  const handleSave = (saveMoneyCorrection: boolean) => {
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('কাস্টমারের নাম আবশ্যক');
      return;
    }

    if (duplicateWarning && !allowDuplicate) {
      setErrorMsg('একই নাম/ফোনে অন্য কাস্টমার রয়েছে। চালিয়ে যেতে নিচের নিশ্চিতকরণ বক্সে টিক দিন।');
      return;
    }

    const assignedSr = db.salesRepresentatives.find((s) => s.id === assignedSrId);
    const assignedSrName = assignedSr ? assignedSr.name : customer.assignedSrName || '';

    const updatedCustomer: Customer = {
      ...customer,
      name: name.trim(),
      shopName: shopName.trim() || name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      route: route.trim(),
      assignedSrId: assignedSrId || '',
      assignedSrName,
      notes: notes.trim(),
    };

    try {
      if (saveMoneyCorrection && isMoneyModified) {
        if (!pin.trim()) {
          setErrorMsg('টাকার সংশোধনের জন্য ৪-৬ সংখ্যার নিরাপত্তা পিন আবশ্যক।');
          return;
        }

        updateCustomerWithCorrection(updatedCustomer, {
          newOpeningBalance: openingBalance === '' ? 0 : Number(openingBalance),
          reason: correctionReason.trim(),
          pin: pin.trim(),
        });

        if (onSuccess) {
          onSuccess(`কাস্টমার "${updatedCustomer.shopName}"-এর তথ্য ও টাকার সংশোধন সফলভাবে সংরক্ষিত হয়েছে!`);
        }
      } else {
        // Save basic info only without changing money
        updateCustomerWithCorrection(updatedCustomer);

        if (onSuccess) {
          onSuccess(`কাস্টমার "${updatedCustomer.shopName}"-এর তথ্য সফলভাবে আপডেট হয়েছে!`);
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'সংরক্ষণে ত্রুটি দেখা দিয়েছে');
    }
  };

  return (
    <div
      id="customer-edit-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-bengali">
                  কাস্টমার তথ্য ও হিসাব এডিট
                </h3>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                  {customer.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bengali">
                {customer.shopName} ({customer.name})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Top Informational Note */}
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-sky-900 flex items-center gap-2 font-bengali">
            <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
            <span className="font-semibold text-[11.5px]">
              এডিট করলে এই কাস্টমারের সব পুরনো হিসাব নতুন তথ্যে দেখাবে।
            </span>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold font-bengali">{errorMsg}</span>
            </div>
          )}

          {/* Duplicate Customer Warning Banner */}
          {duplicateWarning && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-amber-900 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold font-bengali">{duplicateWarning}</p>
                  <p className="text-[11px] text-amber-800 font-bengali mt-0.5">
                    সিস্টেম কাস্টমার মার্জ করবে না। উভয় কাস্টমারের হিসাব সম্পূর্ণ আলাদা আইডি ও খতিয়ানে সংরক্ষিত থাকবে।
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 border-t border-amber-200/80 cursor-pointer font-semibold text-amber-950 font-bengali">
                <input
                  type="checkbox"
                  checked={allowDuplicate}
                  onChange={(e) => setAllowDuplicate(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>হ্যাঁ, এটি আলাদা কাস্টমার — নিশ্চিতভাবে সেভ করতে চাই</span>
              </label>
            </div>
          )}

          {/* Section 1: Basic Information (No PIN needed) */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <User className="h-4 w-4 text-slate-500" />
              <h4 className="font-bold text-slate-800 font-bengali text-xs sm:text-sm">
                মৌলিক তথ্য (পিন আবশ্যক নয়)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Customer Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  কাস্টমারের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Shop Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  দোকানের নাম
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="যেমন: রফিক স্টোর"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  ফোন নম্বর
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="যেমন: 01712345678"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden font-mono"
                />
                {phoneWarning && (
                  <p className="text-[10.5px] text-amber-600 mt-1 font-bengali">
                    ⚠️ {phoneWarning}
                  </p>
                )}
              </div>

              {/* Route Dropdown */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  রুট (Route)
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  <option value="">-- কোনো নির্দিষ্ট রুট নেই (No Route) --</option>
                  {availableRoutes.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-400 mt-1 font-bengali">
                  রুট পরিবর্তন করলে রুটের মোট বাকি ও ফিল্টারে এই কাস্টমার নতুন রুটে স্থানান্তরিত হবে।
                </p>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  ঠিকানা
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: চকবাজার মেইন রোড, দোকান নং ১২"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Assigned SR */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  নির্ধারিত এসআর (Assigned SR)
                </label>
                <select
                  value={assignedSrId}
                  onChange={(e) => setAssignedSrId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  <option value="">সাধারণ / কোনো এসআর নেই</option>
                  {db.salesRepresentatives.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.name} {sr.territory ? `(${sr.territory})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: বিশ্বস্ত নিয়মিত ক্রেতা"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Money Figure Correction (PIN Required) */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <h4 className="font-bold text-rose-950 font-bengali text-xs sm:text-sm">
                  টাকার সংশোধন (Money Correction)
                </h4>
              </div>
              <span className="text-[10.5px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                নিরাপত্তা পিন আবশ্যক
              </span>
            </div>

            <p className="text-[11px] text-rose-900/80 font-bengali leading-relaxed">
              বকেয়া টাকার কোনো ভুল সংশোধন করতে চাইলে এখানে পরিবর্তন করুন। এটি অডিট ট্রেইল হিসেবে কাস্টমার লেজারে <strong>'সংশোধন'</strong> এন্ট্রি হিসেবে সংরক্ষিত হবে এবং বর্তমান বকেয়া স্বয়ংক্রিয়ভাবে আপডেট হবে।
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Opening Balance (Editable) */}
              <div>
                <label className="block text-rose-950 font-bold mb-1 font-bengali">
                  পূর্বের বকেয়া (উদ্বোধনী বকেয়া)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-rose-600">{currency}</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOpeningBalance(val === '' ? '' : Number(val));
                    }}
                    className="w-full rounded-xl border border-rose-300 bg-white pl-8 pr-3.5 py-2 text-xs font-bold text-rose-700 focus:border-rose-500 focus:outline-hidden font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-bengali">
                  পূর্বে সংরক্ষিত ছিল: {currency} {(customer.openingBalance ?? 0).toLocaleString()}
                </p>
              </div>

              {/* Current Due (Read-only, calculated from ledger) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-bengali">
                  বর্তমান মোট বকেয়া (হিসাবকৃত)
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-800 font-mono">
                    {currency} {calculatedCurrentDue.toLocaleString()}
                  </div>
                  {isMoneyModified && (
                    <div
                      className={`text-[10.5px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                        calculatedCurrentDue > customer.currentDue
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {calculatedCurrentDue >= customer.currentDue ? '+' : ''}
                      {currency}{' '}
                      {(
                        calculatedCurrentDue - customer.currentDue
                      ).toLocaleString()}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-bengali">
                  বর্তমান বকেয়া লেজার হিসাবের ভিত্তিতে স্বয়ংক্রিয়ভাবে হিসাবকৃত (রিড-অনলি)
                </p>
              </div>

              {/* Correction Reason */}
              <div className="sm:col-span-2">
                <label className="block text-rose-950 font-bold mb-1 font-bengali">
                  সংশোধনের কারণ (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="যেমন: পূর্বের খাতার হিসাব লেখার সময় টাইপিং ভুল হয়েছিল"
                  className="w-full rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-slate-900 focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              {/* Security PIN (Shown when money is modified) */}
              {isMoneyModified && (
                <div className="sm:col-span-2 rounded-xl bg-white border border-rose-300 p-3.5 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-800 font-bold font-bengali text-xs">
                    <KeyRound className="h-4 w-4 text-rose-600" />
                    <span>নিরাপত্তা পিন দিন (৪-৬ সংখ্যা) *</span>
                  </div>
                  <div className="relative max-w-xs">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      maxLength={6}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="মালিকের নিরাপত্তা পিন..."
                      className="w-full rounded-xl border border-rose-300 bg-rose-50/30 px-3.5 py-2 text-xs font-mono font-bold tracking-widest text-slate-900 focus:border-rose-600 focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-rose-700 font-bengali">
                    টাকার পরিমাণ সংশোধন করতে মালিকের ৪-৬ সংখ্যার সিকিউরিটি পিন আবশ্যক।
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions with Two Distinct Save Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 bg-slate-50/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
          >
            বাতিল
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            {/* Button 1: Save basic info only (No PIN asked) */}
            <button
              type="button"
              id="save-customer-info-only-btn"
              onClick={() => handleSave(false)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-2xs transition-colors cursor-pointer active:scale-95"
              title="শুধু নাম, ফোন, ঠিকানা ও রুট সেভ করুন (টাকার পরিবর্তন বাদ দিয়ে)"
            >
              <Check className="h-4 w-4 text-emerald-600" />
              <span>তথ্য সেভ করুন</span>
            </button>

            {/* Button 2: Save with money correction (PIN required) */}
            {isMoneyModified && (
              <button
                type="button"
                id="save-customer-money-correction-btn"
                onClick={() => handleSave(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer active:scale-95 animate-in fade-in"
                title="পূর্বের বকেয়া ও হিসাব সংশোধনসহ সেভ করুন"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>টাকার সংশোধনসহ সেভ করুন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
