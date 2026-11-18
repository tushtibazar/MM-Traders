import React, { useState, useMemo } from 'react';
import {
  Users,
  Phone,
  AlertTriangle,
  UserPlus,
  Search,
  Send,
  Copy,
  MessageSquare,
  ExternalLink,
  Check,
  History,
  Eye,
  X,
  Store,
} from 'lucide-react';
import {
  Customer,
  DueMessageRecord,
  RecipientDesignation,
  SavedRecipient,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { toBengaliDigits } from '../../utils/dateUtils';
import {
  normalizeWhatsAppNumber,
  normalizeFacebookProfile,
  formatMessageDateTime,
  SplitMessagePart,
} from '../../utils/shareUtils';

const DESIGNATION_OPTIONS: RecipientDesignation[] = [
  'SR',
  'DSR',
  'TSM',
  'হেড অফ সেলস',
  'অন্যান্য',
];

export interface ResolvedRecipientState {
  mode: 'saved' | 'staff' | 'customer' | 'custom' | 'pick_contact';
  name: string;
  designation: string;
  phoneRaw: string;
  fbRaw: string;
  savedRecord: SavedRecipient | null;
  customerRecord: Customer | null;
}

export function useRecipientPickerState(options: {
  isOpen: boolean;
  allowCustomerPicker?: boolean;
}) {
  const { isOpen, allowCustomerPicker = false } = options;
  const { db, addSavedRecipient, updateSavedRecipient, updateCustomer } = useApp();

  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string>('custom');
  const [customName, setCustomName] = useState<string>('');
  const [customDesignation, setCustomDesignation] = useState<RecipientDesignation>('SR');
  const [customDesignationText, setCustomDesignationText] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customFacebook, setCustomFacebook] = useState<string>('');
  const [saveCustomToRecipients, setSaveCustomToRecipients] = useState<boolean>(false);
  const [customSavedThisSession, setCustomSavedThisSession] = useState<boolean>(false);
  const [inlinePhoneOverride, setInlinePhoneOverride] = useState<string>('');
  const [inlineFbOverride, setInlineFbOverride] = useState<string>('');
  const [showFbInputBox, setShowFbInputBox] = useState<boolean>(false);

  // Customer search state (for Stock page "কাস্টমার থেকে বেছে নিন")
  const [customerSearchText, setCustomerSearchText] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const savedRecipients = useMemo(
    () => (Array.isArray(db.savedRecipients) ? db.savedRecipients : []),
    [db.savedRecipients]
  );

  const staffRecipients = useMemo(() => {
    const list: Array<{
      key: string;
      id: string;
      name: string;
      designation: string;
      phone: string;
      type: 'SR' | 'DSR';
    }> = [];

    (db.salesRepresentatives || []).forEach((sr) => {
      if (sr.active !== false && sr.phone && sr.phone.trim()) {
        list.push({
          key: `sr:${sr.id}`,
          id: sr.id,
          name: sr.name,
          designation: 'SR',
          phone: sr.phone.trim(),
          type: 'SR',
        });
      }
    });

    (db.deliveryRepresentatives || []).forEach((dsr) => {
      if (dsr.active !== false && dsr.phone && dsr.phone.trim()) {
        list.push({
          key: `dsr:${dsr.id}`,
          id: dsr.id,
          name: dsr.name,
          designation: 'DSR',
          phone: dsr.phone.trim(),
          type: 'DSR',
        });
      }
    });

    return list;
  }, [db.salesRepresentatives, db.deliveryRepresentatives]);

  const activeCustomers = useMemo(() => {
    if (!allowCustomerPicker) return [];
    return (db.customers || []).filter((c) => c.status !== 'inactive');
  }, [allowCustomerPicker, db.customers]);

  const resetRecipientState = () => {
    setInlinePhoneOverride('');
    setInlineFbOverride('');
    setShowFbInputBox(false);
    setCustomSavedThisSession(false);
    setSaveCustomToRecipients(false);
    setCustomName('');
    setCustomDesignation('SR');
    setCustomDesignationText('');
    setCustomPhone('');
    setCustomFacebook('');
    setCustomerSearchText('');
    setSelectedCustomerId('');

    if (savedRecipients.length > 0) {
      setSelectedRecipientKey(`saved:${savedRecipients[0].id}`);
    } else if (staffRecipients.length > 0) {
      setSelectedRecipientKey(staffRecipients[0].key);
    } else {
      setSelectedRecipientKey('custom');
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      resetRecipientState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleRecipientChange = (newKey: string) => {
    setSelectedRecipientKey(newKey);
    setInlinePhoneOverride('');
    setInlineFbOverride('');
    setShowFbInputBox(false);
    setCustomSavedThisSession(false);
    if (newKey !== 'customer_picker') {
      setSelectedCustomerId('');
      setCustomerSearchText('');
    }
  };

  const activeRecipient: ResolvedRecipientState = useMemo(() => {
    if (selectedRecipientKey === 'pick_contact') {
      return {
        mode: 'pick_contact',
        name: 'প্রাপক',
        designation: 'কন্টাক্ট',
        phoneRaw: '',
        fbRaw: inlineFbOverride,
        savedRecord: null,
        customerRecord: null,
      };
    }

    if (selectedRecipientKey === 'customer_picker') {
      const cust = activeCustomers.find((c) => c.id === selectedCustomerId) || null;
      const custName = cust
        ? cust.shopName && cust.name && cust.shopName !== cust.name
          ? `${cust.shopName} (${cust.name})`
          : cust.shopName || cust.name
        : 'কাস্টমার';
      return {
        mode: 'customer',
        name: custName,
        designation: 'কাস্টমার',
        phoneRaw:
          inlinePhoneOverride ||
          (cust ? cust.whatsappNumber || cust.phone || '' : ''),
        fbRaw:
          inlineFbOverride || (cust ? cust.facebookProfile || '' : ''),
        savedRecord: null,
        customerRecord: cust,
      };
    }

    if (selectedRecipientKey === 'custom') {
      const desigLabel =
        customDesignation === 'অন্যান্য' && customDesignationText.trim()
          ? customDesignationText.trim()
          : customDesignation;
      return {
        mode: 'custom',
        name: customName.trim() || 'কর্মী',
        designation: desigLabel,
        phoneRaw: customPhone,
        fbRaw: customFacebook,
        savedRecord: null,
        customerRecord: null,
      };
    }

    if (selectedRecipientKey.startsWith('saved:')) {
      const id = selectedRecipientKey.slice(6);
      const rec = savedRecipients.find((r) => r.id === id) || null;
      const desigLabel =
        rec?.designation === 'অন্যান্য' && rec.customDesignation
          ? rec.customDesignation
          : rec?.designation || 'SR';
      return {
        mode: 'saved',
        name: rec?.name || 'কর্মী',
        designation: desigLabel,
        phoneRaw: inlinePhoneOverride || rec?.whatsappNumber || rec?.phone || '',
        fbRaw: inlineFbOverride || rec?.facebookProfile || '',
        savedRecord: rec,
        customerRecord: null,
      };
    }

    const staff = staffRecipients.find((s) => s.key === selectedRecipientKey);
    if (staff) {
      return {
        mode: 'staff',
        name: staff.name,
        designation: staff.designation,
        phoneRaw: inlinePhoneOverride || staff.phone || '',
        fbRaw: inlineFbOverride,
        savedRecord: null,
        customerRecord: null,
      };
    }

    return {
      mode: 'custom',
      name: customName.trim() || 'কর্মী',
      designation: 'SR',
      phoneRaw: customPhone,
      fbRaw: customFacebook,
      savedRecord: null,
      customerRecord: null,
    };
  }, [
    selectedRecipientKey,
    savedRecipients,
    staffRecipients,
    activeCustomers,
    selectedCustomerId,
    customName,
    customDesignation,
    customDesignationText,
    customPhone,
    customFacebook,
    inlinePhoneOverride,
    inlineFbOverride,
  ]);

  const waNorm = useMemo(
    () => normalizeWhatsAppNumber(activeRecipient.phoneRaw),
    [activeRecipient.phoneRaw]
  );

  const fbNorm = useMemo(
    () => normalizeFacebookProfile(activeRecipient.fbRaw),
    [activeRecipient.fbRaw]
  );

  const maybeSaveRecipientChanges = () => {
    if (
      activeRecipient.mode === 'custom' &&
      saveCustomToRecipients &&
      !customSavedThisSession &&
      (waNorm.normalized || customPhone.trim())
    ) {
      addSavedRecipient({
        name: customName.trim() || 'কর্মী',
        designation: customDesignation,
        customDesignation:
          customDesignation === 'অন্যান্য'
            ? customDesignationText.trim() || undefined
            : undefined,
        phone: waNorm.normalized || customPhone.trim(),
        whatsappNumber: waNorm.normalized || customPhone.trim(),
        facebookProfile: fbNorm.usernameOrId || customFacebook.trim() || undefined,
      });
      setCustomSavedThisSession(true);
    } else if (
      activeRecipient.mode === 'saved' &&
      activeRecipient.savedRecord &&
      (inlinePhoneOverride.trim() || inlineFbOverride.trim())
    ) {
      updateSavedRecipient({
        ...activeRecipient.savedRecord,
        whatsappNumber:
          waNorm.normalized || activeRecipient.savedRecord.whatsappNumber,
        phone: waNorm.normalized || activeRecipient.savedRecord.phone,
        facebookProfile:
          fbNorm.usernameOrId || activeRecipient.savedRecord.facebookProfile,
      });
    } else if (
      activeRecipient.mode === 'customer' &&
      activeRecipient.customerRecord &&
      (inlinePhoneOverride.trim() || inlineFbOverride.trim())
    ) {
      updateCustomer({
        ...activeRecipient.customerRecord,
        whatsappNumber:
          waNorm.normalized || activeRecipient.customerRecord.whatsappNumber,
        facebookProfile:
          fbNorm.usernameOrId || activeRecipient.customerRecord.facebookProfile,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const hasValidWaTarget =
    activeRecipient.mode === 'pick_contact' ||
    (activeRecipient.mode === 'customer'
      ? Boolean(activeRecipient.customerRecord && waNorm.normalized)
      : Boolean(waNorm.normalized));

  return {
    savedRecipients,
    staffRecipients,
    activeCustomers,
    allowCustomerPicker,
    selectedRecipientKey,
    handleRecipientChange,
    customName,
    setCustomName,
    customDesignation,
    setCustomDesignation,
    customDesignationText,
    setCustomDesignationText,
    customPhone,
    setCustomPhone,
    customFacebook,
    setCustomFacebook,
    saveCustomToRecipients,
    setSaveCustomToRecipients,
    customSavedThisSession,
    inlinePhoneOverride,
    setInlinePhoneOverride,
    inlineFbOverride,
    setInlineFbOverride,
    showFbInputBox,
    setShowFbInputBox,
    customerSearchText,
    setCustomerSearchText,
    selectedCustomerId,
    setSelectedCustomerId,
    activeRecipient,
    waNorm,
    fbNorm,
    hasValidWaTarget,
    maybeSaveRecipientChanges,
  };
}

interface RecipientPickerSectionProps {
  picker: ReturnType<typeof useRecipientPickerState>;
  stepLabel?: string;
}

export const RecipientPickerSection: React.FC<RecipientPickerSectionProps> = ({
  picker,
  stepLabel = '১. প্রাপক নির্বাচন করুন (কাকে পাঠাবেন)',
}) => {
  const {
    savedRecipients,
    staffRecipients,
    activeCustomers,
    allowCustomerPicker,
    selectedRecipientKey,
    handleRecipientChange,
    customName,
    setCustomName,
    customDesignation,
    setCustomDesignation,
    customDesignationText,
    setCustomDesignationText,
    customPhone,
    setCustomPhone,
    customFacebook,
    setCustomFacebook,
    saveCustomToRecipients,
    setSaveCustomToRecipients,
    customSavedThisSession,
    inlinePhoneOverride,
    setInlinePhoneOverride,
    inlineFbOverride,
    setInlineFbOverride,
    showFbInputBox,
    customerSearchText,
    setCustomerSearchText,
    selectedCustomerId,
    setSelectedCustomerId,
    activeRecipient,
    waNorm,
    fbNorm,
  } = picker;

  const filteredCustomers = useMemo(() => {
    const q = customerSearchText.trim().toLowerCase();
    const list = activeCustomers.filter((c) => {
      if (!q) {
        return Boolean(c.whatsappNumber?.trim() || c.phone?.trim());
      }
      return (
        c.name.toLowerCase().includes(q) ||
        c.shopName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsappNumber && c.whatsappNumber.includes(q))
      );
    });
    return list.slice(0, 30);
  }, [activeCustomers, customerSearchText]);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
          <Users className="h-4 w-4 text-emerald-600" />
          {stepLabel}
        </label>
        <span className="text-[11px] text-slate-500 font-bengali">
          সংরক্ষিত প্রাপক + SR পেজের ফোন নম্বর{allowCustomerPicker ? ' + কাস্টমার তালিকা' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <select
            value={selectedRecipientKey}
            onChange={(e) => handleRecipientChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            {savedRecipients.length > 0 && (
              <optgroup label="সংরক্ষিত প্রাপক তালিকা">
                {savedRecipients.map((r) => {
                  const desig =
                    r.designation === 'অন্যান্য' && r.customDesignation
                      ? r.customDesignation
                      : r.designation;
                  return (
                    <option key={r.id} value={`saved:${r.id}`}>
                      {r.name} ({desig}) — {r.whatsappNumber || r.phone || 'নম্বর নেই'}
                    </option>
                  );
                })}
              </optgroup>
            )}

            {staffRecipients.length > 0 && (
              <optgroup label="SR ও DSR তালিকা (SR পেজ থেকে)">
                {staffRecipients.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name} ({s.designation}) — {s.phone}
                  </option>
                ))}
              </optgroup>
            )}

            <optgroup label="অন্যান্য বিকল্প">
              {allowCustomerPicker && (
                <option value="customer_picker">কাস্টমার থেকে বেছে নিন (দোকানদার)</option>
              )}
              <option value="custom">অন্য নম্বর (নতুন নম্বর লিখুন)</option>
              <option value="pick_contact">কন্টাক্ট বেছে নিন (WhatsApp অ্যাপে বাছাই)</option>
            </optgroup>
          </select>
        </div>

        {/* Active Recipient Phone Status */}
        <div className="flex items-center gap-2">
          {selectedRecipientKey === 'pick_contact' ? (
            <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-medium">
              WhatsApp খোলার পর সরাসরি অ্যাপ থেকে কন্টাক্ট বাছাই করতে পারবেন।
            </div>
          ) : selectedRecipientKey === 'customer_picker' && !activeRecipient.customerRecord ? (
            <div className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 font-medium">
              নিচে সার্চ করে কাস্টমার / দোকানদার নির্বাচন করুন।
            </div>
          ) : waNorm.normalized ? (
            <div className="w-full flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp: <span className="font-mono">{waNorm.normalized}</span>
              </span>
              {waNorm.isValid ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  সঠিক ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  নম্বর যাচাই করুন
                </span>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  WhatsApp নম্বর নেই
                </span>
                <button
                  type="button"
                  onClick={() => handleRecipientChange('pick_contact')}
                  className="text-emerald-700 underline cursor-pointer"
                >
                  কন্টাক্ট বেছে নিন
                </button>
              </div>
              {selectedRecipientKey !== 'custom' && (
                <input
                  type="text"
                  value={inlinePhoneOverride}
                  onChange={(e) => setInlinePhoneOverride(e.target.value)}
                  placeholder="01XXXXXXXXX নম্বর লিখুন..."
                  className="w-full rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer search-as-you-type picker */}
      {selectedRecipientKey === 'customer_picker' && (
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customerSearchText}
              onChange={(e) => setCustomerSearchText(e.target.value)}
              placeholder="কাস্টমারের নাম, দোকান বা মোবাইল নম্বর লিখুন..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-2.5 text-center text-[11px] text-slate-400">
                কোনো কাস্টমার পাওয়া যায়নি
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSel = selectedCustomerId === c.id;
                const phoneNum = c.whatsappNumber || c.phone || '';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setInlinePhoneOverride('');
                      setInlineFbOverride('');
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSel ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {c.shopName && c.name && c.shopName !== c.name
                          ? `${c.shopName} (${c.name})`
                          : c.shopName || c.name}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] shrink-0">
                      {phoneNum ? (
                        <span className="text-emerald-700">{phoneNum}</span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          নম্বর নেই
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Custom Number Inputs */}
      {selectedRecipientKey === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              প্রাপকের নাম
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="যেমন: রফিক ভাই"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              পদবী
            </label>
            <select
              value={customDesignation}
              onChange={(e) =>
                setCustomDesignation(e.target.value as RecipientDesignation)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            >
              {DESIGNATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {customDesignation === 'অন্যান্য' && (
              <input
                type="text"
                value={customDesignationText}
                onChange={(e) => setCustomDesignationText(e.target.value)}
                placeholder="পদবী লিখুন..."
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs focus:border-emerald-500 focus:outline-none"
              />
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              WhatsApp নম্বর
            </label>
            <input
              type="text"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
            />
            {waNorm.warning && customPhone.trim() && (
              <p className="mt-0.5 text-[10px] text-amber-700">{waNorm.warning}</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Facebook (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={customFacebook}
              onChange={(e) => setCustomFacebook(e.target.value)}
              placeholder="username বা লিংক"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveCustomToRecipients}
                onChange={(e) => setSaveCustomToRecipients(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
              <span>প্রাপক তালিকায় সেভ করুন</span>
            </label>
            {customSavedThisSession && (
              <span className="text-[11px] font-bold text-emerald-700">
                ✓ প্রাপক তালিকায় সংরক্ষিত হয়েছে
              </span>
            )}
          </div>
        </div>
      )}

      {/* Inline Facebook input when Messenger clicked without FB profile */}
      {(showFbInputBox || fbNorm.usernameOrId) && selectedRecipientKey !== 'custom' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200">
          <label className="text-[11px] font-bold text-sky-900 shrink-0">
            Facebook ইউজারনেম / প্রোফাইল লিংক:
          </label>
          <input
            type="text"
            value={
              inlineFbOverride ||
              activeRecipient.savedRecord?.facebookProfile ||
              activeRecipient.customerRecord?.facebookProfile ||
              ''
            }
            onChange={(e) => setInlineFbOverride(e.target.value)}
            placeholder="যেমন: john.doe বা https://facebook.com/john.doe"
            className="flex-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs focus:border-sky-500 focus:outline-none"
          />
          {fbNorm.isValid && (
            <span className="text-[11px] font-mono text-sky-700">
              m.me/{fbNorm.usernameOrId}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface SplitPartButtonsBarProps {
  parts: SplitMessagePart[];
  clickedPartIndices: number[];
  hasValidWaTarget: boolean;
  onSendPart: (partIndex: number, partLabel: string, partText: string) => void;
}

export const SplitPartButtonsBar: React.FC<SplitPartButtonsBarProps> = ({
  parts,
  clickedPartIndices,
  hasValidWaTarget,
  onSendPart,
}) => {
  if (parts.length <= 1) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-emerald-950">
          তালিকাটি {toBengaliDigits(parts.length)} টি নিরাপদ অংশে ভাগ হয়েছে — প্রতিটি অংশে Send চাপতে হবে।
        </span>
        <span className="text-[11px] font-bold text-emerald-700">
          খোলা হয়েছে: {toBengaliDigits(clickedPartIndices.length)}/
          {toBengaliDigits(parts.length)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {parts.map((part) => {
          const isOpened = clickedPartIndices.includes(part.partIndex);
          return (
            <button
              key={part.partIndex}
              type="button"
              disabled={!hasValidWaTarget}
              onClick={() => onSendPart(part.partIndex, part.partLabel, part.text)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isOpened
                  ? 'bg-emerald-100 border border-emerald-400 text-emerald-900'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
              }`}
            >
              {isOpened ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  <span>{part.partLabel} — খোলা হয়েছে ✓</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{part.partLabel} পাঠান</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ShareActionFooterProps {
  disabled: boolean;
  hasValidWaTarget: boolean;
  isMultiPart: boolean;
  isPickContactMode: boolean;
  onSendSingleWhatsApp: () => void;
  onCopyAll: () => void;
  onSendMessenger: () => void;
  onClose: () => void;
}

export const ShareActionFooter: React.FC<ShareActionFooterProps> = ({
  disabled,
  hasValidWaTarget,
  isMultiPart,
  isPickContactMode,
  onSendSingleWhatsApp,
  onCopyAll,
  onSendMessenger,
  onClose,
}) => {
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        {!isMultiPart && (
          <button
            type="button"
            disabled={disabled || !hasValidWaTarget}
            onClick={onSendSingleWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            <span>
              {isPickContactMode
                ? 'কন্টাক্ট বেছে WhatsApp-এ পাঠান'
                : 'WhatsApp-এ পাঠান'}
            </span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={onCopyAll}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy className="h-4 w-4 text-slate-600" />
          <span>সব একসাথে কপি করুন</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onSendMessenger}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Messenger-এ পাঠান</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-80" />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
      >
        বন্ধ করুন
      </button>
    </div>
  );
};

interface ShareHistoryPanelProps {
  entries: DueMessageRecord[];
  mode: 'stock' | 'challan';
  onHide: () => void;
}

export const ShareHistoryPanel: React.FC<ShareHistoryPanelProps> = ({
  entries,
  mode,
  onHide,
}) => {
  const [viewingMessage, setViewingMessage] = useState<DueMessageRecord | null>(null);

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 font-bengali">
          <History className="h-4 w-4 text-indigo-600" />
          সর্বশেষ ১০টি শেয়ার ইতিহাস
        </h3>
        <button
          type="button"
          onClick={onHide}
          className="text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
        >
          লুকান
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-500 py-2 font-bengali">
          এখনো কোনো তথ্য শেয়ার করা হয়নি।
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-indigo-100 bg-white">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-1.5">তারিখ ও সময়</th>
                <th className="px-2.5 py-1.5">প্রাপক</th>
                <th className="px-2.5 py-1.5">মাধ্যম</th>
                <th className="px-2.5 py-1.5">
                  {mode === 'stock' ? 'ফিল্টার ও সংখ্যা' : 'বিস্তারিত'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-2.5 py-1.5 font-mono text-slate-600 whitespace-nowrap">
                    {formatMessageDateTime(h.createdAt)}
                  </td>
                  <td className="px-2.5 py-1.5 font-bold text-slate-800">
                    {h.recipientName || h.customerName}
                  </td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-bold ${
                        h.channel === 'whatsapp'
                          ? 'bg-emerald-100 text-emerald-800'
                          : h.channel === 'messenger'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {h.channel === 'whatsapp'
                        ? 'WhatsApp'
                        : h.channel === 'messenger'
                        ? 'Messenger'
                        : 'কপি'}
                      {h.partNumber ? ` (${h.partNumber})` : ''}
                    </span>
                    <span className="ml-1 text-[10px] text-emerald-700 font-semibold">
                      শেয়ার করা হয়েছে
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 text-slate-600">
                    {mode === 'stock' ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{h.scopeSummary || 'স্টক তালিকা'}</span>
                        {h.productCount !== undefined && (
                          <span className="font-bold text-slate-800">
                            ({toBengaliDigits(h.productCount)} টি পণ্য)
                          </span>
                        )}
                        {h.generationTime && (
                          <span className="text-[10px] text-slate-500">
                            • {h.generationTime}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate max-w-[180px]" title={h.scopeSummary}>
                          {h.scopeSummary || 'চালান চেক'}
                        </span>
                        {h.messageText && (
                          <button
                            type="button"
                            onClick={() => setViewingMessage(h)}
                            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 cursor-pointer shrink-0"
                          >
                            <Eye className="h-3 w-3" />
                            <span>টেক্সট দেখুন</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Saved Challan Message Text Inspector */}
      {viewingMessage && (
        <div className="rounded-lg border border-indigo-300 bg-white p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <span className="text-xs font-bold text-indigo-950">
              শেয়ারকৃত টেক্সট — {viewingMessage.recipientName || viewingMessage.customerName} ({formatMessageDateTime(viewingMessage.createdAt)})
            </span>
            <button
              type="button"
              onClick={() => setViewingMessage(null)}
              className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 max-h-48 overflow-y-auto leading-relaxed">
            {viewingMessage.messageText}
          </pre>
        </div>
      )}
    </div>
  );
};
