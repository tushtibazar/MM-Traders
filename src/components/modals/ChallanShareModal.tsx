import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  History,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { toBengaliDigits } from '../../utils/dateUtils';
import {
  ChallanShareBatchRow,
  copyTextToClipboard,
  generateChallanShareMessage,
  splitGenericShareMessage,
} from '../../utils/shareUtils';
import {
  useRecipientPickerState,
  RecipientPickerSection,
  SplitPartButtonsBar,
  ShareActionFooter,
  ShareHistoryPanel,
} from './ShareCommonControls';

interface ChallanShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  rows: ChallanShareBatchRow[];
  columnTotals: {
    sumPurchasePrice: number;
    sumTotalPieces: number;
    sumFreePieces: number;
    sumUndelivered: number;
  };
  grandTotalPieces: number;
  cartonCount: number;
  undeliveredCartonCount: number;
  perPieceCost: number;
  piecesPerCarton: number;
  costPerCarton: number;
  profitMargin: number;
  sellingPricePerCarton: number;
  formatMoneyBn: (val: number, maxDecimals?: number, minDecimals?: number) => string;
  formatCartonNumber: (val: number) => string;
  onSuccess?: (msg: string) => void;
}

export const ChallanShareModal: React.FC<ChallanShareModalProps> = ({
  isOpen,
  onClose,
  productName,
  rows,
  columnTotals,
  grandTotalPieces,
  cartonCount,
  undeliveredCartonCount,
  perPieceCost,
  piecesPerCarton,
  costPerCarton,
  profitMargin,
  sellingPricePerCarton,
  formatMoneyBn,
  formatCartonNumber,
  onSuccess,
}) => {
  const { db, todayDateStr, addDueMessageRecord } = useApp();

  // Recipient Picker (Saved recipients, SR/DSR, অন্য নম্বর, কন্টাক্ট বেছে নিন)
  const picker = useRecipientPickerState({
    isOpen,
    allowCustomerPicker: false,
  });

  // Challan Toggles
  const [includePurchaseAccount, setIncludePurchaseAccount] = useState<boolean>(true);
  const [includeProfitAndSelling, setIncludeProfitAndSelling] = useState<boolean>(false);

  // Message & Splitting State
  const [messageText, setMessageText] = useState<string>('');
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);
  const [clickedPartIndices, setClickedPartIndices] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Reset toggles and state on open
  useEffect(() => {
    if (!isOpen) return;
    setIncludePurchaseAccount(true);
    setIncludeProfitAndSelling(false);
    setIsManuallyEdited(false);
    setClickedPartIndices([]);
    setShowHistory(false);
    setToastMessage(null);
  }, [isOpen]);

  const receivedPieces = useMemo(
    () => Math.max(0, grandTotalPieces - columnTotals.sumUndelivered),
    [grandTotalPieces, columnTotals.sumUndelivered]
  );

  const receivedCartonCount = useMemo(
    () => (piecesPerCarton > 0 ? receivedPieces / piecesPerCarton : 0),
    [receivedPieces, piecesPerCarton]
  );

  const generatedMessage = useMemo(() => {
    return generateChallanShareMessage({
      settings: db.settings,
      dateStr: todayDateStr,
      productName,
      rows,
      columnTotals,
      grandTotalPieces,
      cartonCount,
      receivedPieces,
      receivedCartonCount,
      undeliveredCartonCount,
      perPieceCost,
      piecesPerCarton,
      costPerCarton,
      profitMargin,
      sellingPricePerCarton,
      includePurchaseAccount,
      includeProfitAndSelling,
      formatMoneyBn,
      formatCartonNumber,
    });
  }, [
    db.settings,
    todayDateStr,
    productName,
    rows,
    columnTotals,
    grandTotalPieces,
    cartonCount,
    receivedPieces,
    receivedCartonCount,
    undeliveredCartonCount,
    perPieceCost,
    piecesPerCarton,
    costPerCarton,
    profitMargin,
    sellingPricePerCarton,
    includePurchaseAccount,
    includeProfitAndSelling,
    formatMoneyBn,
    formatCartonNumber,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isManuallyEdited) {
      setMessageText(generatedMessage);
      setClickedPartIndices([]);
    }
  }, [isOpen, generatedMessage, isManuallyEdited]);

  const handleRefresh = () => {
    setMessageText(generatedMessage);
    setIsManuallyEdited(false);
    setClickedPartIndices([]);
    setToastMessage({
      text: 'বর্তমান চালান চেকের হিসাব অনুযায়ী মেসেজ রিফ্রেশ হয়েছে।',
      type: 'info',
    });
  };

  const cleanProductName = productName.trim() || '(নাম দেওয়া হয়নি)';

  const messageParts = useMemo(() => {
    const shortTitle = `${db.settings.businessName || 'MM TRADERS'} — চালান চেক (${cleanProductName})`;
    return splitGenericShareMessage(messageText, shortTitle, 1600);
  }, [messageText, db.settings.businessName, cleanProductName]);

  const challanSummaryLabel = useMemo(() => {
    return `${cleanProductName} • ৳${formatMoneyBn(columnTotals.sumPurchasePrice, 2, 2)} (${toBengaliDigits(grandTotalPieces)} পিস)`;
  }, [cleanProductName, columnTotals.sumPurchasePrice, grandTotalPieces, formatMoneyBn]);

  const logChallanShare = (
    channel: 'whatsapp' | 'messenger' | 'copy',
    partNumberLabel?: string
  ) => {
    const recName =
      picker.activeRecipient.mode === 'pick_contact'
        ? 'কন্টাক্ট বাছাই'
        : `${picker.activeRecipient.name} (${picker.activeRecipient.designation})`;

    addDueMessageRecord({
      type: 'challan',
      customerId: 'challan-share',
      customerName: recName,
      recipientName: recName,
      channel,
      partNumber: partNumberLabel,
      scopeSummary: challanSummaryLabel,
      messageText,
      includedDueIds: [],
      totalOutstanding: columnTotals.sumPurchasePrice,
      recipientPhone: picker.waNorm.normalized || undefined,
      recipientFacebook: picker.fbNorm.usernameOrId || undefined,
    });
  };

  const isEmptyMessage = !messageText.trim();

  const handleSendWhatsAppPart = (
    partIdx: number,
    partLabel: string,
    partText: string
  ) => {
    if (isEmptyMessage) return;
    const isPickContact = picker.activeRecipient.mode === 'pick_contact';

    if (!isPickContact && !picker.waNorm.normalized) {
      setToastMessage({
        text: 'WhatsApp নম্বর নেই বা সঠিক নয়। নম্বর দিন অথবা "কন্টাক্ট বেছে নিন" ব্যবহার করুন।',
        type: 'warning',
      });
      return;
    }

    picker.maybeSaveRecipientChanges();

    const encoded = encodeURIComponent(partText);
    const waUrl = isPickContact
      ? `https://wa.me/?text=${encoded}`
      : `https://wa.me/${picker.waNorm.normalized}?text=${encoded}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    logChallanShare('whatsapp', messageParts.length > 1 ? partLabel : undefined);

    setClickedPartIndices((prev) =>
      prev.includes(partIdx) ? prev : [...prev, partIdx]
    );

    setToastMessage({
      text:
        messageParts.length > 1
          ? `অংশ ${partLabel} WhatsApp-এ খোলা হয়েছে — চ্যাটে Send চাপুন।`
          : 'WhatsApp খোলা হয়েছে — চ্যাটে Send চাপুন।',
      type: 'success',
    });

    if (onSuccess) {
      onSuccess(`"${picker.activeRecipient.name}"-এর জন্য চালান চেক হিসাব WhatsApp-এ খোলা হয়েছে।`);
    }
  };

  const handleCopyAll = async () => {
    if (isEmptyMessage) return;
    picker.maybeSaveRecipientChanges();
    const ok = await copyTextToClipboard(messageText);
    if (ok) {
      logChallanShare('copy');
      setToastMessage({
        text: 'সম্পূর্ণ চালান চেক মেসেজ কপি হয়েছে — WhatsApp-এ পেস্ট করতে পারেন।',
        type: 'success',
      });
    } else {
      setToastMessage({
        text: 'কপি করা যায়নি। টেক্সট বক্স থেকে ম্যানুয়ালি কপি করুন।',
        type: 'warning',
      });
    }
  };

  const handleSendMessenger = async () => {
    if (isEmptyMessage) return;
    if (!picker.fbNorm.isValid || !picker.fbNorm.usernameOrId) {
      picker.setShowFbInputBox(true);
      setToastMessage({
        text: 'Messenger লিংকের জন্য প্রাপকের Facebook username বা ID দিন।',
        type: 'warning',
      });
      return;
    }

    picker.maybeSaveRecipientChanges();
    await copyTextToClipboard(messageText);
    const targetUrl = `https://m.me/${picker.fbNorm.usernameOrId}`;

    logChallanShare('messenger');
    setToastMessage({
      text: 'মেসেজ কপি হয়েছে — Messenger চ্যাটে Ctrl+V দিয়ে পেস্ট করুন',
      type: 'info',
    });

    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    if (onSuccess) {
      onSuccess(`"${picker.activeRecipient.name}"-এর জন্য Messenger খোলা হয়েছে।`);
    }
  };

  const challanShareHistory = useMemo(() => {
    return (db.dueMessages || [])
      .filter((m) => m.type === 'challan')
      .slice(0, 10);
  }, [db.dueMessages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-bengali">
                চালান চেক পাঠান
              </h2>
              <p className="text-[11px] text-slate-500 font-bengali">
                ম্যানেজার, SR/DSR বা পার্টনারের কাছে এই চালানের হিসাব WhatsApp বা Messenger-এ পাঠান
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                showHistory
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>শেয়ার ইতিহাস ({toBengaliDigits(challanShareHistory.length)})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="বন্ধ করুন"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {showHistory && (
            <ShareHistoryPanel
              entries={challanShareHistory}
              mode="challan"
              onHide={() => setShowHistory(false)}
            />
          )}

          {/* 1. Recipient Picker */}
          <RecipientPickerSection picker={picker} />

          {/* 2. Section Toggles */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                ২. মেসেজে কোন অংশগুলো থাকবে
              </span>
              <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                পণ্য: {cleanProductName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePurchaseAccount}
                  onChange={(e) => {
                    setIncludePurchaseAccount(e.target.checked);
                    setIsManuallyEdited(false);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>ক্রয় হিসাব</span>
              </label>

              <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeProfitAndSelling}
                  onChange={(e) => {
                    setIncludeProfitAndSelling(e.target.checked);
                    setIsManuallyEdited(false);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>প্রফিট মার্জিন ও বিক্রয় মূল্য</span>
              </label>
            </div>

            {includeProfitAndSelling && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>এতে আপনার মার্জিন যাবে, বিশ্বস্ত ব্যক্তিকে পাঠান</span>
              </div>
            )}
          </div>

          {/* 3. Message Preview & Edit */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-bengali">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                ৩. মেসেজ প্রিভিউ (পাঠানোর আগে সম্পাদনা করতে পারবেন)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {toBengaliDigits(messageText.length)} অক্ষর
                  {messageParts.length > 1
                    ? ` • ${toBengaliDigits(messageParts.length)} টি অংশ`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>রিফ্রেশ</span>
                </button>
              </div>
            </div>

            <textarea
              rows={11}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                setIsManuallyEdited(true);
                setClickedPartIndices([]);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-sans text-slate-900 leading-relaxed focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Toast */}
          {toastMessage && (
            <div
              className={`rounded-xl border p-3 text-xs font-bold flex items-center gap-2 ${
                toastMessage.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : toastMessage.type === 'warning'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-sky-300 bg-sky-50 text-sky-900'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Multi-part Split Buttons */}
          {!isEmptyMessage && (
            <SplitPartButtonsBar
              parts={messageParts}
              clickedPartIndices={clickedPartIndices}
              hasValidWaTarget={picker.hasValidWaTarget}
              onSendPart={handleSendWhatsAppPart}
            />
          )}
        </div>

        {/* Action Footer */}
        <ShareActionFooter
          disabled={isEmptyMessage}
          hasValidWaTarget={picker.hasValidWaTarget}
          isMultiPart={messageParts.length > 1}
          isPickContactMode={picker.activeRecipient.mode === 'pick_contact'}
          onSendSingleWhatsApp={() =>
            handleSendWhatsAppPart(
              1,
              '১/১',
              messageParts[0]?.text || messageText
            )
          }
          onCopyAll={handleCopyAll}
          onSendMessenger={handleSendMessenger}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
