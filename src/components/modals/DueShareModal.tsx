import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Phone,
  Store,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Hash,
  Save,
  MessageSquare,
  Send,
} from 'lucide-react';
import { Customer, AppDatabase } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDate, toBengaliDigits } from '../../utils/dateUtils';
import { formatDueNumber, calculateCustomerDueAllocation } from '../../utils/dueUtils';
import {
  normalizeWhatsAppNumber,
  normalizeFacebookProfile,
  generateDueMessageText,
  copyTextToClipboard,
  ShareDueItem,
} from '../../utils/shareUtils';

interface DueShareModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const DueShareModal: React.FC<DueShareModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSuccess,
}) => {
  const { db, updateCustomer, addDueMessageRecord, currentUser } = useApp();
  const currency = db.settings.currency || '৳';

  // Customer Contact State
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [facebookProfile, setFacebookProfile] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveSuccess, setContactSaveSuccess] = useState(false);

  // Selected Dues State
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Calculate customer due allocation using the shared function:
  // - Targeted collections applied first
  // - General collections applied FIFO to oldest dues first
  // - Only dues with remainingAmount > 0 are considered outstanding
  const allocation = useMemo(() => {
    if (!customer) {
      return {
        allDues: [],
        outstandingDues: [],
        totalOriginalAmount: 0,
        totalRemainingAmount: 0,
        adjustmentAmount: 0,
        customerOutstandingDue: 0,
        hasAnyOutstanding: false,
      };
    }
    return calculateCustomerDueAllocation(customer, db);
  }, [customer, db]);

  const customerOutstandingDues = allocation.outstandingDues;
  const hasAnyOutstanding = allocation.hasAnyOutstanding && customerOutstandingDues.length > 0;

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (customer && isOpen) {
      setWhatsappPhone(customer.whatsappNumber || customer.phone || '');
      setFacebookProfile(customer.facebookProfile || '');
      setIsSavingContact(false);
      setContactSaveSuccess(false);
      setToastMessage(null);
      setIsManuallyEdited(false);

      // Select all outstanding dues by default
      const allIds = customerOutstandingDues.map((d) => d.id);
      setSelectedDueIds(allIds);
    }
  }, [customer, isOpen, customerOutstandingDues]);

  // Selected due items
  const selectedDuesList = useMemo(() => {
    return customerOutstandingDues.filter((d) => selectedDueIds.includes(d.id));
  }, [customerOutstandingDues, selectedDueIds]);

  const allRemainingTicked = useMemo(() => {
    return (
      customerOutstandingDues.length > 0 &&
      selectedDueIds.length === customerOutstandingDues.length
    );
  }, [customerOutstandingDues, selectedDueIds]);

  const totalSelectedDue = useMemo(() => {
    const sum = selectedDuesList.reduce((s, d) => s + (d.remainingAmount || 0), 0);
    if (allRemainingTicked && allocation.adjustmentAmount !== 0) {
      return sum + allocation.adjustmentAmount;
    }
    return sum;
  }, [selectedDuesList, allRemainingTicked, allocation.adjustmentAmount]);

  // Re-generate message text when selected dues or customer changes (unless manually edited)
  useEffect(() => {
    if (!customer || !isOpen) return;
    if (isManuallyEdited) return;

    const generated = generateDueMessageText({
      customer,
      dues: selectedDuesList.map((d) => ({
        id: d.id,
        dueNo: d.dueNo,
        rawDueNo: d.rawDueNo,
        date: d.date,
        amount: d.remainingAmount,
        originalAmount: d.originalAmount,
        isPartiallyPaid: d.isPartiallyPaid,
        ledgerId: d.ledgerId,
      })),
      settings: db.settings,
      adjustmentAmount: allocation.adjustmentAmount,
      allRemainingTicked,
    });
    setMessageText(generated);
  }, [
    customer,
    selectedDuesList,
    db.settings,
    isOpen,
    isManuallyEdited,
    allocation.adjustmentAmount,
    allRemainingTicked,
  ]);

  if (!isOpen || !customer) return null;

  // Normalized contacts
  const waNorm = normalizeWhatsAppNumber(whatsappPhone);
  const fbNorm = normalizeFacebookProfile(facebookProfile);

  // Toggle selection for a single due
  const handleToggleDue = (id: string) => {
    setSelectedDueIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next;
    });
  };

  // Select all / deselect all
  const handleToggleSelectAll = () => {
    if (selectedDueIds.length === customerOutstandingDues.length) {
      setSelectedDueIds([]);
    } else {
      setSelectedDueIds(customerOutstandingDues.map((d) => d.id));
    }
  };

  // Save updated contact info to customer profile
  const handleSaveContactInfo = () => {
    if (!customer) return;
    setIsSavingContact(true);

    const updated: Customer = {
      ...customer,
      whatsappNumber: waNorm.normalized || whatsappPhone.trim(),
      facebookProfile: fbNorm.usernameOrId || facebookProfile.trim(),
      updatedAt: new Date().toISOString(),
    };

    updateCustomer(updated);
    setIsSavingContact(false);
    setContactSaveSuccess(true);
    setTimeout(() => setContactSaveSuccess(false), 3000);
  };

  // Helper to ensure customer contact is saved if edited
  const ensureContactUpdated = () => {
    if (!customer) return;
    const currentWa = customer.whatsappNumber || customer.phone || '';
    const currentFb = customer.facebookProfile || '';
    const newWa = waNorm.normalized || whatsappPhone.trim();
    const newFb = fbNorm.usernameOrId || facebookProfile.trim();

    if (newWa !== currentWa || newFb !== currentFb) {
      updateCustomer({
        ...customer,
        whatsappNumber: newWa,
        facebookProfile: newFb,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // 1. Send via WhatsApp (official click-to-chat)
  const handleSendWhatsApp = () => {
    if (!hasAnyOutstanding || selectedDueIds.length === 0) return;
    if (!whatsappPhone.trim()) {
      setToastMessage({ text: 'অনুগ্রহ করে WhatsApp নম্বর প্রদান করুন।', type: 'warning' });
      return;
    }

    ensureContactUpdated();

    const targetNumber = waNorm.normalized || whatsappPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://wa.me/${targetNumber}?text=${encodedText}`;

    // Record share in dueMessages
    addDueMessageRecord({
      customerId: customer.id,
      customerName: customer.shopName || customer.name,
      channel: 'whatsapp',
      includedDueIds: selectedDueIds,
      totalOutstanding: totalSelectedDue,
      recipientPhone: targetNumber,
      recipientFacebook: fbNorm.usernameOrId || undefined,
      messageText,
    });

    // Safely open in new tab/window
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    setToastMessage({
      text: 'WhatsApp খোলা হচ্ছে... WhatsApp চ্যাটে গিয়ে "Send" বাটনে চাপুন।',
      type: 'success',
    });

    if (onSuccess) {
      onSuccess(`"${customer.shopName || customer.name}"-এর জন্য WhatsApp খোলা হয়েছে`);
    }
  };

  // 2. Send via Facebook Messenger (m.me with auto clipboard copy)
  const handleSendMessenger = async () => {
    if (!hasAnyOutstanding || selectedDueIds.length === 0) return;
    ensureContactUpdated();

    // 1. Copy message text to clipboard first
    const copied = await copyTextToClipboard(messageText);

    // 2. Determine target URL
    let targetUrl = 'https://www.messenger.com/';
    if (fbNorm.isValid && fbNorm.usernameOrId) {
      targetUrl = `https://m.me/${fbNorm.usernameOrId}?text=${encodeURIComponent(messageText)}`;
    }

    // 3. Record share in dueMessages
    addDueMessageRecord({
      customerId: customer.id,
      customerName: customer.shopName || customer.name,
      channel: 'messenger',
      includedDueIds: selectedDueIds,
      totalOutstanding: totalSelectedDue,
      recipientPhone: waNorm.normalized || undefined,
      recipientFacebook: fbNorm.usernameOrId || undefined,
      messageText,
    });

    // 4. Safely open Messenger
    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    if (copied) {
      setToastMessage({
        text: 'মেসেজ কপি হয়েছে! Messenger চ্যাট খুললে বক্সে পেস্ট (Ctrl+V) করে সেন্ড করুন।',
        type: 'info',
      });
    } else {
      setToastMessage({
        text: 'Messenger খোলা হচ্ছে...',
        type: 'info',
      });
    }

    if (onSuccess) {
      onSuccess(`"${customer.shopName || customer.name}"-এর জন্য Messenger খোলা হয়েছে`);
    }
  };

  // 3. Copy message only
  const handleCopyMessage = async () => {
    if (!hasAnyOutstanding || selectedDueIds.length === 0) return;
    const copied = await copyTextToClipboard(messageText);
    if (copied) {
      addDueMessageRecord({
        customerId: customer.id,
        customerName: customer.shopName || customer.name,
        channel: 'copy',
        includedDueIds: selectedDueIds,
        totalOutstanding: totalSelectedDue,
        recipientPhone: waNorm.normalized || undefined,
        recipientFacebook: fbNorm.usernameOrId || undefined,
        messageText,
      });

      setToastMessage({
        text: 'সম্পূর্ণ মেসেজ ক্লিপবোর্ডে কপি করা হয়েছে!',
        type: 'success',
      });
    } else {
      setToastMessage({
        text: 'মেসেজ কপি করা যায়নি। সরাসরি টেক্সট সিলেক্ট করে কপি করুন।',
        type: 'warning',
      });
    }
  };

  // Reset edited message back to template
  const handleResetTemplate = () => {
    setIsManuallyEdited(false);
    const generated = generateDueMessageText({
      customer,
      dues: selectedDuesList.map((d) => ({
        id: d.id,
        dueNo: d.dueNo,
        rawDueNo: d.rawDueNo,
        date: d.date,
        amount: d.remainingAmount,
        originalAmount: d.originalAmount,
        isPartiallyPaid: d.isPartiallyPaid,
        ledgerId: d.ledgerId,
      })),
      settings: db.settings,
      adjustmentAmount: allocation.adjustmentAmount,
      allRemainingTicked,
    });
    setMessageText(generated);
    setToastMessage({ text: 'মেসেজ ডিফল্ট টেমপ্লেটে পুনর্নির্মাণ করা হয়েছে।', type: 'info' });
  };

  const charCount = messageText.length;
  const isMessageTooLong = charCount > 1800;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-bengali">
                  বাকির তথ্য পাঠান (Share Due)
                </h3>
                <span className="text-[10px] bg-slate-800 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  {customer.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-bengali flex items-center gap-1.5 mt-0.5">
                <Store className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-white">{customer.shopName}</span>
                {customer.name && customer.name !== customer.shopName && (
                  <span>({customer.name})</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold font-bengali flex items-center justify-between border-b ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : toastMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-sky-50 text-sky-900 border-sky-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs underline hover:opacity-75 cursor-pointer ml-2"
            >
              বন্ধ করুন
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-bengali">
          {/* Section 1: Contact Details (WhatsApp & Messenger) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-600" />
                প্রাপকের যোগাযোগের ঠিকানা
              </span>
              <button
                type="button"
                onClick={handleSaveContactInfo}
                disabled={isSavingContact}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="প্রোফাইলে নম্বর ও ফেসবুক সংরক্ষণ করুন"
              >
                {contactSaveSuccess ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-700" />
                    <span>সংরক্ষিত!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    <span>প্রোফাইলে সেভ</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  WhatsApp নম্বর
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => {
                      setWhatsappPhone(e.target.value);
                      setContactSaveSuccess(false);
                    }}
                    placeholder="017xxxxxxxx বা 88017xxxxxxxx"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                  {waNorm.isValid && (
                    <span className="absolute right-2.5 top-2 text-emerald-600" title="সঠিক মোবাইল নম্বর">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
                {waNorm.warning && (
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    ⚠️ {waNorm.warning}
                  </p>
                )}
              </div>

              {/* Facebook Profile */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Facebook প্রোফাইল লিংক বা ইউজারনেম
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={facebookProfile}
                    onChange={(e) => {
                      setFacebookProfile(e.target.value);
                      setContactSaveSuccess(false);
                    }}
                    placeholder="facebook.com/username অথবা ইউজারনেম"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                  />
                  {fbNorm.isValid && (
                    <a
                      href={fbNorm.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2 p-0.5 text-sky-600 hover:text-sky-800"
                      title="ফেসবুক প্রোফাইল ওপেন করুন"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  খালি থাকলে মেসেঞ্জারে বার্তা কপি হয়ে প্রধান মেসেঞ্জার খুলবে।
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Due Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-slate-600" />
                  মেসেজে অন্তর্ভুক্ত করার জন্য বাকি নির্বাচন করুন
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full">
                  {toBengaliDigits(customerOutstandingDues.length)} টি বাকি
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                {selectedDueIds.length === customerOutstandingDues.length
                  ? 'সব আনচেক করুন'
                  : 'সব নির্বাচন করুন'}
              </button>
            </div>

            {/* Dues List */}
            {customerOutstandingDues.length === 0 || !hasAnyOutstanding ? (
              <div className="p-4 text-center text-slate-500 font-medium bg-slate-50/80 border border-dashed border-slate-200 rounded-xl">
                এই কাস্টমারের কোনো বকেয়া নেই
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/40">
                {customerOutstandingDues.map((due) => {
                  const id = due.id;
                  const isChecked = selectedDueIds.includes(id);

                  return (
                    <label
                      key={id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-50/80 border-emerald-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDue(id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                            বাকি নং {formatDueNumber(due.rawDueNo || due.dueNo || '')}
                          </span>
                          {due.date && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {formatDate(due.date)}
                            </span>
                          )}
                          {due.isPartiallyPaid && (
                            <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-1.5 py-0.2 rounded font-bengali">
                              আংশিক বাকি
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-xs text-rose-700">
                          {currency} {due.remainingAmount.toLocaleString()}
                        </span>
                        {due.isPartiallyPaid && (
                          <span className="block text-[9.5px] text-slate-400 line-through">
                            আসল {currency}{due.originalAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selection Summary */}
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[11px] text-slate-600 font-medium">
                নির্বাচিত: <strong>{toBengaliDigits(selectedDuesList.length)} টি বাকি</strong>
              </span>
              <span className="text-xs font-bold text-rose-700">
                নির্বাচিত মোট বকেয়া: {currency} {totalSelectedDue.toLocaleString()}
              </span>
            </div>
            {allRemainingTicked && allocation.adjustmentAmount !== 0 && (
              <div className="px-2 text-[10.5px] text-slate-500 flex items-center justify-between">
                <span>পূর্বের হিসাব সমন্বয়:</span>
                <span className="font-mono font-semibold">
                  {allocation.adjustmentAmount > 0 ? '+' : ''}
                  {currency} {allocation.adjustmentAmount.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Live Message Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                মেসেজের খসড়া ও প্রিভিউ (সরাসরি পরিবর্তনযোগ্য)
              </label>
              <div className="flex items-center gap-2">
                {isManuallyEdited && (
                  <button
                    type="button"
                    onClick={handleResetTemplate}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>টেমপ্লেটে ফিরুন</span>
                  </button>
                )}
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isMessageTooLong
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {toBengaliDigits(charCount)} অক্ষর
                </span>
              </div>
            </div>

            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                setIsManuallyEdited(true);
              }}
              placeholder="মেসেজ লিখুন..."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none leading-relaxed font-sans"
            />

            {isMessageTooLong && (
              <p className="text-[10.5px] text-amber-700 flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  মেসেজটি বেশ বড় ({toBengaliDigits(charCount)} অক্ষর)। WhatsApp লিংক সহজে পাঠাতে কিছু অপ্রয়োজনীয় বাক্য বাদ দিতে পারেন।
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMessage}
              disabled={!hasAnyOutstanding || selectedDueIds.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer w-full sm:w-auto"
              title="মেসেজ টেক্সট কপি করুন"
            >
              <Copy className="h-4 w-4 text-slate-500" />
              <span>কপি করুন</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer w-full sm:w-auto"
            >
              বাতিল
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Messenger Button */}
            <button
              type="button"
              onClick={handleSendMessenger}
              disabled={!hasAnyOutstanding || selectedDueIds.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-initial"
              title="Messenger-এ পাঠান (মেসেজ কপি হয়ে চ্যাট খুলবে)"
            >
              <Send className="h-4 w-4" />
              <span>Messenger-এ পাঠান</span>
            </button>

            {/* WhatsApp Button */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!hasAnyOutstanding || selectedDueIds.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex-1 sm:flex-initial"
              title="WhatsApp click-to-chat ওপেন করুন"
            >
              <MessageSquare className="h-4 w-4" />
              <span>WhatsApp-এ পাঠান</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
