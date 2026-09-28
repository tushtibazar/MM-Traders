import React, { useState } from 'react';
import {
  Boxes,
  PlusCircle,
  MinusCircle,
  FileDown,
  AlertTriangle,
  History,
  Check,
  Trash2,
  Eye,
  ImageDown,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateStockValuationPDF } from '../../services/pdfGenerator';
import { Product } from '../../types';
import { PinPromptModal } from '../modals/PinPromptModal';
import { StockPrintPreviewModal } from './StockPrintPreviewModal';

export const StockModule: React.FC = () => {
  const { db, currentUser, adjustStock, deleteStockEntry, todayDateStr } = useApp();
  const isOwner = currentUser.role === 'owner';
  const currency = db.settings.currency || '৳';

  // Active warehouse products vs deleted from stock
  const warehouseProducts = React.useMemo(() => {
    return db.products.filter((p) => !p.deletedFromStock);
  }, [db.products]);

  const deletedStockProducts = React.useMemo(() => {
    return db.products.filter((p) => p.deletedFromStock);
  }, [db.products]);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    warehouseProducts[0]?.id || db.products[0]?.id || ''
  );
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('নতুন চালান প্রাপ্তি');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Delete Stock PIN Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [stockToDelete, setStockToDelete] = useState<Product | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string>('');

  const selectedProduct = db.products.find((p) => p.id === selectedProductId);

  // Auto select product if current selection became invalid
  React.useEffect(() => {
    if (!selectedProductId && (warehouseProducts[0] || db.products[0])) {
      setSelectedProductId(warehouseProducts[0]?.id || db.products[0]?.id || '');
    }
  }, [selectedProductId, warehouseProducts, db.products]);

  // Total stock valuation (based on visible warehouse stock)
  const totalStockQuantity = React.useMemo(() => {
    return warehouseProducts.reduce((sum, p) => sum + p.currentStock, 0);
  }, [warehouseProducts]);

  const totalStockPurchaseValuation = React.useMemo(() => {
    return warehouseProducts.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  }, [warehouseProducts]);

  const totalStockSaleValuation = React.useMemo(() => {
    return warehouseProducts.reduce((sum, p) => sum + p.currentStock * p.salePrice, 0);
  }, [warehouseProducts]);

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!selectedProductId || !adjustQty || Number(adjustQty) <= 0) {
      setErrorMsg('সঠিক পণ্য ও পরিমাপ লিখুন');
      return;
    }

    try {
      adjustStock({
        productId: selectedProductId,
        quantity: Number(adjustQty),
        type: adjustType,
        reason,
        date: todayDateStr,
      });

      setSuccessMsg(`স্টক সফলভাবে আপডেট হয়েছে! (${selectedProduct?.name} ${adjustType === 'in' ? '+' : '-'}${adjustQty})`);
      setAdjustQty('');
    } catch (err: any) {
      setErrorMsg(err.message || 'স্টক সমন্বয় করতে ব্যর্থ');
    }
  };

  const handleInitiateDeleteStock = (product: Product) => {
    // Check if actively used elsewhere (Daily হিসাব, etc.)
    const isUsedInDailySheets = (db.dailySheets || []).some((sheet) =>
      (sheet.items || []).some((item) => item.productId === product.id || item.productName === product.name) ||
      (sheet.damageItems || []).some((item) => item.productId === product.id || item.productName === product.name)
    );

    let warn = "সতর্কতা: এখান থেকে ডিলিট করলে শুধুমাত্র গুদামের বর্তমান স্টক রেকর্ডটি অপসারিত হবে; 'পণ্য ও মূল্য' তালিকা থেকে পণ্যটি মুছে যাবে না। পরবর্তীতে যেকোনো সময় 'নতুন মাল যোগ করুন' দিয়ে পুনরায় স্টক যুক্ত করতে পারবেন।";
    if (isUsedInDailySheets) {
      warn = "সতর্কতা: এই পণ্যটি পূর্ববর্তী 'Daily হিসাব' খাতা এবং 'পণ্য ও মূল্য' তালিকায় ব্যবহৃত রয়েছে। এখান থেকে ডিলিট করলে শুধুমাত্র গুদামের বর্তমান স্টক রেকর্ডটি অপসারিত হবে; 'পণ্য ও মূল্য' তালিকা বা পূর্বের খাতা থেকে পণ্যটি মুছে যাবে না। পরবর্তীতে যেকোনো সময় 'নতুন মাল যোগ করুন' দিয়ে পুনরায় স্টক যুক্ত করতে পারবেন।";
    }

    setStockToDelete(product);
    setDeleteWarning(warn);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteStock = () => {
    if (!stockToDelete) return;
    try {
      deleteStockEntry(stockToDelete.id);
      setSuccessMsg(`"${stockToDelete.name}" এর স্টক এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে। প্রয়োজন হলে পরবর্তীতে "নতুন মাল যোগ করুন" দিয়ে পুনরায় স্টক যুক্ত করতে পারবেন।`);
      setIsDeleteModalOpen(false);
      setStockToDelete(null);
      setDeleteWarning('');
    } catch (err: any) {
      setErrorMsg(err.message || 'স্টক এন্ট্রি মুছতে ব্যর্থ হয়েছে');
    }
  };

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printAction, setPrintAction] = useState<'png' | 'pdf' | null>(null);

  const handleOpenPrintPreview = (action?: 'png' | 'pdf' | null) => {
    setPrintAction(action || null);
    setIsPrintModalOpen(true);
  };

  const handleDownloadPDF = () => {
    handleOpenPrintPreview('pdf');
  };

  const handleDownloadPNG = () => {
    handleOpenPrintPreview('png');
  };

  return (
    <div id="stock-module" className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-bengali">
              স্টক ব্যবস্থাপনা ও সমন্বয় (Stock & Inventory)
            </h1>
            <p className="text-xs text-slate-500">
              সহজ স্টক ট্র্যাকিং — বিক্রয়ে স্বয়ংক্রিয়ভাবে স্টক বিয়োগ ও চালান প্রাপ্তিতে স্টক যোগ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenPrintPreview(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition-colors shadow-xs cursor-pointer"
            title="প্রিন্ট প্রিভিউ দেখুন"
          >
            <Eye className="h-4 w-4 text-sky-600" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 transition-colors shadow-xs cursor-pointer"
            title="A4 সাইজের PNG ডাউনলোড"
          >
            <ImageDown className="h-4 w-4 text-emerald-600" />
            <span>PNG ডাউনলোড</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title="ইমেজ-বেসড PDF ডাউনলোড"
          >
            <FileDown className="h-4 w-4 text-amber-400" />
            <span>PDF ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* 3 Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500">মোট বর্তমান স্টক আইটেম</span>
          <p className="mt-1 text-xl font-bold text-slate-900">{totalStockQuantity} একক</p>
          <span className="text-[11px] text-slate-400">{warehouseProducts.length} ধরণের পণ্য</span>
        </div>

        {isOwner && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-xs text-slate-500">ক্রয়মূল্যে মোট স্টক মূল্য (Asset Value)</span>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {currency} {totalStockPurchaseValuation.toLocaleString()}
            </p>
            <span className="text-[11px] text-slate-400">ব্যবসায়ের গুদাম বিনিয়োগ</span>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs text-slate-500">বিক্রয়মূল্যে মোট স্টক সম্ভাবনা</span>
          <p className="mt-1 text-xl font-bold text-blue-700">
            {currency} {totalStockSaleValuation.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400">সম্ভাব্য মোট রেভিনিউ</span>
        </div>
      </div>

      {/* Stock Adjustment Form */}
      {isOwner && (
        <form
          id="stock-adjust-form"
          onSubmit={handleAdjustSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              স্টক ইন / আউট সমন্বয় (Stock In/Out Entry — নতুন মাল যোগ)
            </h2>
          </div>

          {successMsg && (
            <div className="mb-3 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-xs text-emerald-800">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-3 rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">পণ্য নির্বাচন</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <optgroup label="বর্তমান গুদাম স্টক পণ্য">
                  {warehouseProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (বর্তমান: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </optgroup>
                {deletedStockProducts.length > 0 && (
                  <optgroup label="স্টক তালিকা থেকে অপসারিত পণ্য (নতুন মাল যোগ করতে নির্বাচন করুন)">
                    {deletedStockProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        + {p.name} (স্টক নেই — পুনরায় যোগ করুন)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">সমন্বয়ের ধরণ</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('in')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-2 font-bold ${
                    adjustType === 'in'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>স্টক যোগ (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('out')}
                  className={`flex items-center justify-center gap-1 rounded-lg py-2 font-bold ${
                    adjustType === 'out'
                      ? 'bg-rose-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <MinusCircle className="h-4 w-4" />
                  <span>স্টক কর্তন (-)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পরিমাণ ({selectedProduct?.unit || 'একক'})</label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="যেমন: ১০"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">কারণ / রেফারেন্স</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="যেমন: চালান নং বা ড্যামেজ বা অডিট"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 font-bold text-white hover:bg-amber-700"
            >
              <Check className="h-4 w-4" />
              <span>স্টক আপডেট নিশ্চিত করুন</span>
            </button>
          </div>
        </form>
      )}

      {/* Product Stock Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-bengali">
              গুদামে বর্তমান পণ্য তালিকা ও এলার্ট
            </h2>
            <p className="text-[11px] text-slate-400">
              গুদামে সংরক্ষিত সক্রিয় পণ্যের বর্তমান মজুদ তালিকা
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setAdjustType('in');
                setReason('নতুন চালান প্রাপ্তি');
                document.getElementById('stock-adjust-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>নতুন মাল যোগ করুন</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">পণ্য ও কোড</th>
                <th className="py-2.5 px-3 font-semibold">ক্যাটাগরি</th>
                <th className="py-2.5 px-3 font-semibold text-center">বর্তমান স্টক</th>
                <th className="py-2.5 px-3 font-semibold text-center">সতর্কতা সীমা</th>
                <th className="py-2.5 px-3 font-semibold text-right">বিক্রয় মূল্য</th>
                {isOwner && <th className="py-2.5 px-4 font-semibold text-right">মোট সম্পদ মূল্য</th>}
                {isOwner && <th className="py-2.5 px-3 font-semibold text-center w-24">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouseProducts.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 7 : 5} className="py-8 text-center text-slate-400">
                    গুদামে বর্তমানে কোনো সক্রিয় স্টক এন্ট্রি নেই। 'নতুন মাল যোগ করুন' দিয়ে স্টক যুক্ত করুন।
                  </td>
                </tr>
              ) : (
                warehouseProducts.map((p) => {
                  const isAlert = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.category}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isAlert ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isAlert && <AlertTriangle className="h-3 w-3" />}
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500">{p.minStockAlert} {p.unit}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {currency} {p.salePrice.toLocaleString()}
                      </td>
                      {isOwner && (
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          {currency} {(p.currentStock * p.purchasePrice).toLocaleString()}
                        </td>
                      )}
                      {isOwner && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleInitiateDeleteStock(p)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-800 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="স্টক এন্ট্রি মুছে ফেলুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>ডিলিট</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Logs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <History className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900 font-bengali">
            স্টক সমন্বয় ইতিহাস (Adjustment Logs)
          </h2>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2 px-3">তারিখ</th>
                <th className="py-2 px-3">পণ্য</th>
                <th className="py-2 px-3 text-center">ধরণ</th>
                <th className="py-2 px-3 text-center">পরিমাণ</th>
                <th className="py-2 px-3">কারণ</th>
                <th className="py-2 px-3">এন্ট্রি প্রদানকারী</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.stockTransactions.slice(0, 8).map((adj) => (
                <tr key={adj.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-600">{adj.date}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{adj.productName}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                        adj.quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {adj.quantity > 0 ? `+ যোগ (${adj.type})` : `- বিয়োগ (${adj.type})`}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-slate-900">{Math.abs(adj.quantity)}</td>
                  <td className="py-2 px-3 text-slate-600">{adj.note || adj.type}</td>
                  <td className="py-2 px-3 text-slate-500">{adj.createdBy}</td>
                </tr>
              ))}
              {db.stockTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">
                    কোন স্টক সমন্বয়ের রেকর্ড নেই
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Entry Delete PIN Modal */}
      <PinPromptModal
        isOpen={isDeleteModalOpen}
        title="গুদাম স্টক এন্ট্রি মুছে ফেলার অনুমোদন"
        subtitle="স্টক রেকর্ড মুছে ফেলতে ৪-৬ সংখ্যার মালিকের পিন দিন"
        itemName={
          stockToDelete
            ? `${stockToDelete.name} (কোড: ${stockToDelete.code}, বর্তমান স্টক: ${stockToDelete.currentStock} ${stockToDelete.unit})`
            : undefined
        }
        warning={deleteWarning}
        confirmButtonText="স্টক এন্ট্রি মুছে ফেলুন"
        confirmButtonVariant="danger"
        correctPin={
          db.settings.securityPin ||
          db.settings.ownerPin ||
          currentUser.pin ||
          '1234'
        }
        onSuccess={handleConfirmDeleteStock}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStockToDelete(null);
          setDeleteWarning('');
        }}
      />

      {/* Stock Print & Export Preview Modal */}
      <StockPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={db.settings}
        currency={currency}
        products={warehouseProducts}
        todayDateStr={todayDateStr}
        initialAction={printAction}
      />
    </div>
  );
};
