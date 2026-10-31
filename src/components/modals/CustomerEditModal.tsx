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
  Hash,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Customer } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import {
  formatDueNumber,
  sanitizeDueNumberInput,
  findDueNumberDuplicate,
  getNextFreeAutomaticDueNumber,
  normalizeDueNumber,
} from '../../utils/dueUtils';

interface CustomerEditModalProps {
  isOpen: boolean;
  customer: Customer | null;
  initialTargetDueNo?: string;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  customer,
  initialTargetDueNo,
  onClose,
  onSuccess,
}) => {
  const { db, updateCustomerWithCorrection, updateCustomerDueNumbers, currentUser } = useApp();
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

  // Customer Dues list (sorted oldest first, with calculated FIFO status)
  const customerDues = useMemo(() => {
    if (!customer) return [];
    const dues = (db.customerLedgers || [])
      .filter((l) => l.customerId === customer.id && Boolean(l.debit && l.debit > 0))
      .slice()
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.id.localeCompare(b.id);
      });

    const totalPayments = (db.customerLedgers || [])
      .filter((l) => l.customerId === customer.id && (l.type === 'payment' || (l.credit && l.credit > 0)))
      .reduce((sum, l) => sum + (l.credit || 0), 0);

    let cumulativeDues = 0;
    return dues.map((due) => {
      const dueAmt = due.debit || 0;
      const dueStart = cumulativeDues;
      const dueEnd = cumulativeDues + dueAmt;
      cumulativeDues = dueEnd;

      let status: 'settled' | 'partial' | 'due' = 'due';
      if (due.status === 'settled' || totalPayments >= dueEnd) {
        status = 'settled';
      } else if (totalPayments > dueStart) {
        status = 'partial';
      } else {
        status = 'due';
      }

      return {
        ...due,
        calculatedStatus: status,
      };
    });
  }, [customer, db.customerLedgers]);

  // Due Number Editing States (No PIN needed)
  const [dueNumberInputs, setDueNumberInputs] = useState<Record<string, string>>({});
  const [dueNumberErrors, setDueNumberErrors] = useState<Record<string, string>>({});
  const [dueSaveSuccessMsg, setDueSaveSuccessMsg] = useState('');
  const [dueSaveErrorMsg, setDueSaveErrorMsg] = useState('');
  const [isSavingDueNumbers, setIsSavingDueNumbers] = useState(false);

  // Sync due numbers when customer or modal opens
  useEffect(() => {
    if (customer && isOpen) {
      const initialMap: Record<string, string> = {};
      customerDues.forEach((d) => {
        initialMap[d.id] = d.referenceId || '';
      });
      setDueNumberInputs(initialMap);
      setDueNumberErrors({});
      setDueSaveSuccessMsg('');
      setDueSaveErrorMsg('');
    }
  }, [customer, isOpen, customerDues]);

  // Auto-scroll to target due when opened via chip click
  useEffect(() => {
    if (isOpen && initialTargetDueNo && customerDues.length > 0) {
      const targetNorm = normalizeDueNumber(initialTargetDueNo);
      const matched = customerDues.find((d) => {
        if (!d.referenceId) return false;
        return (
          d.referenceId === initialTargetDueNo ||
          normalizeDueNumber(d.referenceId) === targetNorm ||
          formatDueNumber(d.referenceId) === initialTargetDueNo
        );
      });

      if (matched) {
        setTimeout(() => {
          const rowEl = document.getElementById(`customer-due-row-${matched.id}`);
          if (rowEl) {
            rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const inputEl = document.getElementById(`due-input-${matched.id}`) as HTMLInputElement | null;
            if (inputEl) {
              inputEl.focus();
              inputEl.select();
            }
          }
        }, 250);
      }
    }
  }, [isOpen, initialTargetDueNo, customerDues]);

  const handleDueNumberChange = (dueId: string, val: string) => {
    const sanitized = sanitizeDueNumberInput(val);
    setDueNumberInputs((prev) => ({ ...prev, [dueId]: sanitized }));
    setDueNumberErrors((prev) => {
      const copy = { ...prev };
      delete copy[dueId];
      return copy;
    });
    setDueSaveErrorMsg('');
    setDueSaveSuccessMsg('');
  };

  const handleClearDueNumber = (dueId: string) => {
    setDueNumberInputs((prev) => ({ ...prev, [dueId]: '' }));
    setDueNumberErrors((prev) => {
      const copy = { ...prev };
      delete copy[dueId];
      return copy;
    });
    setDueSaveErrorMsg('');
  };

  const handleAutoFillDueNumber = (dueId: string) => {
    const nextFree = getNextFreeAutomaticDueNumber(db);
    setDueNumberInputs((prev) => ({ ...prev, [dueId]: nextFree.dueNo }));
    setDueNumberErrors((prev) => {
      const copy = { ...prev };
      delete copy[dueId];
      return copy;
    });
    setDueSaveErrorMsg('');
  };

  const handleSaveDueNumbersOnly = () => {
    if (!customer) return;
    setDueSaveErrorMsg('');
    setDueSaveSuccessMsg('');
    const errors: Record<string, string> = {};

    // 1. Resolve effective values
    // If user left input empty, treat as "keep current" (due.referenceId)
    const effectiveMap: Record<string, string> = {};
    customerDues.forEach((due) => {
      const typed = dueNumberInputs[due.id] !== undefined ? dueNumberInputs[due.id].trim() : (due.referenceId || '');
      effectiveMap[due.id] = typed || (due.referenceId || '');
    });

    // 2. Intra-popup duplicate check: check across all rows of this customer
    const seenNos: Record<string, string> = {}; // norm -> dueId
    for (const due of customerDues) {
      const effNo = effectiveMap[due.id];
      if (effNo) {
        const norm = normalizeDueNumber(effNo);
        if (seenNos[norm]) {
          const firstId = seenNos[norm];
          errors[due.id] = 'একই কাস্টমারের দুটি বাকিতে একই নম্বর হতে পারবে না';
          errors[firstId] = 'একই কাস্টমারের দুটি বাকিতে একই নম্বর হতে পারবে না';
        } else {
          seenNos[norm] = due.id;
        }
      }
    }

    // 3. External duplicate check (belonging to another customer or deleted/voided due)
    for (const due of customerDues) {
      const effNo = effectiveMap[due.id];
      if (effNo && !errors[due.id]) {
        const dup = findDueNumberDuplicate(effNo, db, {
          excludeCustomerId: customer.id,
          excludeLedgerId: due.id,
        });
        if (dup.isDuplicate) {
          errors[due.id] = dup.message || 'এই বাকি নম্বরটি অন্য কাস্টমারে ব্যবহৃত হচ্ছে';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setDueNumberErrors(errors);
      setDueSaveErrorMsg('অনুগ্রহ করে চিহ্নিত বাকি নম্বরগুলোর সমস্যা সংশোধন করুন');
      return;
    }

    // 4. Collect changed updates
    const updates: { ledgerId: string; oldDueNo: string; newDueNo: string }[] = [];
    customerDues.forEach((due) => {
      const effNo = effectiveMap[due.id];
      if (effNo && effNo !== (due.referenceId || '')) {
        updates.push({
          ledgerId: due.id,
          oldDueNo: due.referenceId || '',
          newDueNo: effNo,
        });
      }
    });

    if (updates.length === 0) {
      setDueSaveSuccessMsg('বাকি নম্বরে কোনো পরিবর্তন করা হয়নি');
      return;
    }

    setIsSavingDueNumbers(true);
    try {
      const res = updateCustomerDueNumbers(
        customer.id,
        updates,
        'কাস্টমার এডিট পপআপ থেকে বাকি নং পরিবর্তন'
      );
      if (!res.success) {
        setDueSaveErrorMsg(res.error || 'বাকি নম্বর সংরক্ষণ করতে ব্যর্থ হয়েছে');
        setIsSavingDueNumbers(false);
        return;
      }

      setDueSaveSuccessMsg('✅ বাকি নম্বর সফলভাবে আপডেট করা হয়েছে!');
      if (onSuccess) {
        onSuccess(`কাস্টমার "${customer.shopName || customer.name}"-এর বাকি নম্বর সফলভাবে সেভ করা হয়েছে!`);
      }
      setTimeout(() => {
        setDueSaveSuccessMsg('');
      }, 5000);
    } catch (err: any) {
      setDueSaveErrorMsg(`ত্রুটি: ${err.message || 'অজানা সমস্যা'}`);
    } finally {
      setIsSavingDueNumbers(false);
    }
  };

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

          {/* Section: Customer Dues List & Due Number Editing (No PIN Required) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/60">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-amber-700 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-950 font-bengali text-xs sm:text-sm">
                    এই কাস্টমারের বাকির তালিকা (Due Numbers)
                  </h4>
                  <p className="text-[11px] text-amber-800/80 font-bengali">
                    খাতার নম্বর অনুযায়ী বাকি নং পরিবর্তন বা অদলবদল (Swap) করুন
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10.5px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                পিন প্রয়োজন নেই
              </span>
            </div>

            {/* Success / Error Banners for Due Numbers */}
            {dueSaveSuccessMsg && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{dueSaveSuccessMsg}</span>
              </div>
            )}
            {dueSaveErrorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{dueSaveErrorMsg}</span>
              </div>
            )}

            {customerDues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-white/70 py-6 px-4 text-center text-xs text-slate-500 font-bengali">
                এই কাস্টমারের কোনো বাকির এন্ট্রি নেই
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="overflow-x-auto max-h-64 overflow-y-auto border border-amber-200/80 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-amber-100/60 sticky top-0 z-10 text-[11px] font-bold text-amber-950 uppercase border-b border-amber-200">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-10">ক্রমিক</th>
                        <th className="py-2 px-3">তারিখ</th>
                        <th className="py-2 px-3 text-right">টাকা</th>
                        <th className="py-2 px-3">রুট</th>
                        <th className="py-2 px-3 min-w-[170px]">বাকি নং</th>
                        <th className="py-2 px-2.5 text-center">অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {customerDues.map((due, idx) => {
                        const inputVal = dueNumberInputs[due.id] !== undefined ? dueNumberInputs[due.id] : (due.referenceId || '');
                        const rowError = dueNumberErrors[due.id];
                        const isSettled = due.calculatedStatus === 'settled';
                        const isPartial = due.calculatedStatus === 'partial';

                        return (
                          <tr
                            key={due.id}
                            id={`customer-due-row-${due.id}`}
                            className="hover:bg-amber-50/50 transition-colors"
                          >
                            <td className="py-2.5 px-2.5 text-center font-mono font-medium text-slate-500">
                              {toBengaliDigits(idx + 1)}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                              {formatDate(due.date)}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-rose-700">
                              {currency} {(due.debit || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[110px]" title={customer.route || 'রুট নেই'}>
                              {customer.route || '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    id={`due-input-${due.id}`}
                                    maxLength={12}
                                    value={inputVal}
                                    placeholder="অটো"
                                    onChange={(e) => handleDueNumberChange(due.id, e.target.value)}
                                    className={`w-28 sm:w-32 rounded-lg border px-2.5 py-1 text-xs font-mono font-bold text-slate-900 bg-white focus:outline-hidden ${
                                      rowError
                                        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-600'
                                        : 'border-slate-300 focus:border-amber-500'
                                    }`}
                                    title="বাকি নং (সর্বোচ্চ ১২ অক্ষর, স্পেস ছাড়া)"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleClearDueNumber(due.id)}
                                    className="px-2 py-1 text-[10.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title="নম্বর ফাঁকা করুন (নতুন নম্বর টাইপ করতে বা অদলবদল করতে)"
                                  >
                                    ফাঁকা
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAutoFillDueNumber(due.id)}
                                    className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg border border-amber-200/60 transition-colors cursor-pointer shrink-0"
                                    title="পরবর্তী অটো নম্বর দিন"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {rowError && (
                                  <p className="text-[10px] text-rose-600 font-bold leading-tight">
                                    {rowError}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                              {isSettled ? (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  পরিশোধিত
                                </span>
                              ) : isPartial ? (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  আংশিক জমা
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                  বাকি
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save Due Numbers Only Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-slate-500 font-bengali">
                    💡 খালি রাখলে পূর্বের নম্বর অপরিবর্তিত থাকবে। নম্বর পরিবর্তন বা অদলবদলে পিন প্রয়োজন নেই।
                  </p>
                  <button
                    type="button"
                    id="save-customer-due-numbers-btn"
                    onClick={handleSaveDueNumbersOnly}
                    disabled={isSavingDueNumbers}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                  >
                    <Check className="h-4 w-4" />
                    <span>{isSavingDueNumbers ? 'সেভ হচ্ছে...' : 'নম্বর সেভ করুন'}</span>
                  </button>
                </div>
              </div>
            )}
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
