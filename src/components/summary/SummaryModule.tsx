import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Search,
  Printer,
  GripVertical,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Package,
  Boxes,
  Clock,
  RotateCw,
  X,
  SortAsc,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { toBengaliDigits } from '../../utils/dateUtils';
import { SummaryPrintPreviewModal, formatStockForSummary } from './SummaryPrintPreviewModal';

export const formatBanglaDateTime = (date: Date = new Date()): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'বিকাল/রাত' : 'সকাল';
  const displayHours = hours % 12 || 12;
  return `${toBengaliDigits(d)}/${toBengaliDigits(m)}/${toBengaliDigits(y)}, ${period} ${toBengaliDigits(displayHours)}:${toBengaliDigits(minutes)}`;
};

export const SummaryModule: React.FC = () => {
  const { db, updateSummaryProductOrder } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [generationTime, setGenerationTime] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const touchStartY = useRef<number>(0);
  const touchSourceIndex = useRef<number | null>(null);

  // Toast timer cleanup
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Refresh live timestamp on mount
  useEffect(() => {
    setGenerationTime(new Date());
  }, []);

  const handleRefreshTime = () => {
    setGenerationTime(new Date());
  };

  // 1. All active products from পণ্য ও মূল্য (skip inactive or deleted)
  const activeProducts = useMemo(() => {
    return (db.products || []).filter((p) => p.status === 'active' && !p.deletedFromStock);
  }, [db.products]);

  // 2. Master ordered list based on permanently saved db.summaryProductOrder
  const masterOrderedProducts = useMemo(() => {
    const savedOrder = db.summaryProductOrder || db.settings?.summaryProductOrder || [];
    const list = [...activeProducts];

    if (savedOrder.length === 0) {
      // Default: Alphabetical initial order
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'bn'));
    }

    const orderMap = new Map<string, number>();
    savedOrder.forEach((id, idx) => orderMap.set(id, idx));

    // Sort active products: items in savedOrder come first according to their saved position,
    // new products not yet in savedOrder appear at the end
    return list.sort((a, b) => {
      const posA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
      const posB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
      if (posA !== posB) return posA - posB;
      return (a.name || '').localeCompare(b.name || '', 'bn');
    });
  }, [activeProducts, db.summaryProductOrder, db.settings?.summaryProductOrder]);

  // Is filtering or search currently active?
  const isFilterOrSearchActive = Boolean(searchQuery.trim() || onlyInStock);

  // 3. Displayed products on screen / preview
  const displayProducts = useMemo(() => {
    let list = [...masterOrderedProducts];

    // Filter by stock if toggled
    if (onlyInStock) {
      list = list.filter((p) => (Number(p.currentStock) || 0) > 0);
    }

    // Filter by search query (search-as-you-type)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [masterOrderedProducts, onlyInStock, searchQuery]);

  // Reorder Handler: Save permanently in database
  const handleReorder = (fromIdx: number, toIdx: number) => {
    if (isFilterOrSearchActive) return;
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= masterOrderedProducts.length || toIdx >= masterOrderedProducts.length) return;

    const updated = [...masterOrderedProducts];
    const [movedItem] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, movedItem);

    const newOrderIds = updated.map((p) => p.id);
    updateSummaryProductOrder(newOrderIds);
    setToastMessage('ক্রম সেভ হয়েছে');
  };

  // Move 1 step Up/Down (▲ / ▼ buttons)
  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    if (isFilterOrSearchActive) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    handleReorder(idx, targetIdx);
  };

  // Drag and Drop (Mouse)
  const handleDragStart = (idx: number, e: React.DragEvent) => {
    if (isFilterOrSearchActive) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    if (isFilterOrSearchActive) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== idx) {
      setDragOverIndex(idx);
    }
  };

  const handleDrop = (idx: number, e: React.DragEvent) => {
    if (isFilterOrSearchActive) return;
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== idx) {
      handleReorder(draggedIndex, idx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch Drag-and-Drop (Mobile/Tablet)
  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    if (isFilterOrSearchActive) return;
    touchStartY.current = e.touches[0].clientY;
    touchSourceIndex.current = idx;
    setDraggedIndex(idx);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isFilterOrSearchActive || touchSourceIndex.current === null) return;
    const currentY = e.touches[0].clientY;
    const element = document.elementFromPoint(e.touches[0].clientX, currentY);
    const rowEl = element?.closest('[data-summary-row-idx]');
    if (rowEl) {
      const hoverIdx = Number(rowEl.getAttribute('data-summary-row-idx'));
      if (!isNaN(hoverIdx) && hoverIdx !== dragOverIndex) {
        setDragOverIndex(hoverIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isFilterOrSearchActive) return;
    if (
      touchSourceIndex.current !== null &&
      dragOverIndex !== null &&
      touchSourceIndex.current !== dragOverIndex
    ) {
      handleReorder(touchSourceIndex.current, dragOverIndex);
    }
    touchSourceIndex.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Reset to Alphabetical Order (A-Z সাজান)
  const handleResetToAlphabetical = () => {
    const isConfirmed = window.confirm(
      'আপনি কি পণ্যের ক্রম বর্ণানুক্রমিক (A-Z) সাজাতে চান? এতে বর্তমান কাস্টম ক্রমটি বর্ণানুক্রমিকভাবে পুনর্বিন্যস্ত হয়ে সেভ হবে।'
    );
    if (!isConfirmed) return;

    const alphaSorted = [...activeProducts].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'bn')
    );
    const newOrderIds = alphaSorted.map((p) => p.id);
    updateSummaryProductOrder(newOrderIds);
    setToastMessage('ক্রম সেভ হয়েছে (A-Z)');
  };

  // Counts for summary metrics
  const inStockCount = useMemo(() => {
    return activeProducts.filter((p) => (Number(p.currentStock) || 0) > 0).length;
  }, [activeProducts]);

  const zeroStockCount = activeProducts.length - inStockCount;

  const generationDateTimeStr = useMemo(() => {
    return formatBanglaDateTime(generationTime);
  }, [generationTime]);

  const handleOpenPrintPreview = () => {
    setGenerationTime(new Date());
    setIsPrintPreviewOpen(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-bengali">
                সামারি (Daily Product Sheet)
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                লাইভ গুদাম স্টক ও দর
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              এসআর/ডিএসআর এর জন্য দৈনিক মাল লোডিং শিট। পণ্য ড্র্যাগ করে উপরে-নিচে পছন্দের ক্রমে সাজাতে পারেন।
            </p>
          </div>
        </div>

        {/* Action Buttons & Time Badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Generation Time Badge */}
          <div
            onClick={handleRefreshTime}
            title="লাইভ সময় রিফ্রেশ করতে ক্লিক করুন"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
          >
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>প্রস্তুত: {generationDateTimeStr}</span>
            <RotateCw className="h-3 w-3 text-slate-400 hover:text-slate-700" />
          </div>

          {/* Reset to Alphabetical Order */}
          <button
            type="button"
            onClick={handleResetToAlphabetical}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-all cursor-pointer"
            title="বর্ণানুক্রমিক (A-Z) সাজান"
          >
            <SortAsc className="h-4 w-4 text-emerald-600" />
            <span>A-Z সাজান</span>
          </button>

          {/* Print Preview Button */}
          <button
            type="button"
            onClick={handleOpenPrintPreview}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>মোট সক্রিয় পণ্য</span>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {toBengaliDigits(activeProducts.length)} টি
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-medium">
            <span>স্টক আছে</span>
            <Boxes className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-black text-emerald-700">
            {toBengaliDigits(inStockCount)} টি
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>শূন্য স্টক (০)</span>
            <span className="h-2 w-2 rounded-full bg-rose-400" />
          </div>
          <div className="mt-1 text-lg font-black text-slate-600">
            {toBengaliDigits(zeroStockCount)} টি
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-blue-800 text-xs font-medium">
            <span>তালিকায় প্রদর্শিত</span>
            <span className="h-2 w-2 rounded-full bg-blue-400" />
          </div>
          <div className="mt-1 text-lg font-black text-blue-700">
            {toBengaliDigits(displayProducts.length)} টি
          </div>
        </div>
      </div>

      {/* Control Bar: Search & In-stock Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search-as-you-type input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পণ্যের নাম বা কোড খুঁজুন..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-8 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controls: In-stock toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">
              শুধু স্টক আছে এমন পণ্য
            </span>
          </label>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (লাইন ধরে উপরে-নিচে ড্র্যাগ করে স্থায়ীভাবে সাজান)
          </span>
        </div>
      </div>

      {/* Reorder Disabled Notice (if search or filter is active) */}
      {isFilterOrSearchActive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            ফিল্টার বা সার্চ সক্রিয় থাকা অবস্থায় ক্রম পরিবর্তন নিষ্ক্রিয় থাকে। পণ্যের স্থায়ী ক্রম পরিবর্তন করতে সার্চ ও ফিল্টার মুক্ত রাখুন।
          </span>
        </div>
      )}

      {/* Main Single Table: Columns in exact order:
          - ড্র্যাগ ও মুভ বাটন (অন-স্ক্রিন শুধুমাত্র)
          ১. নং
          ২. প্রোডাক্টের নাম
          ৩. মোট (EMPTY column, left blank for handwriting)
          ৪. স্টক (read-only, from stock module)
          ৫. দর (কার্টুন) (read-only selling rate per carton)
      */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold text-xs">
                {/* Drag Handle Column (On-screen only) */}
                <th className="py-3 px-2 text-center w-16 shrink-0 border-r border-slate-200 text-slate-400 font-normal">
                  সাজান
                </th>
                <th className="py-3 px-2 text-center w-12 shrink-0 border-r border-slate-200">
                  নং
                </th>
                <th className="py-3 px-4 min-w-[240px] sm:min-w-[300px] border-r border-slate-200">
                  প্রোডাক্টের নাম
                </th>
                <th className="py-3 px-4 text-center w-36 sm:w-44 border-r border-slate-200 bg-amber-50/50 text-amber-900">
                  <div>মোট</div>
                  <div className="text-[10px] font-normal text-amber-700">
                    (হাতে লেখার জন্য ফাঁকা)
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-36 sm:w-44 border-r border-slate-200">
                  <div>স্টক</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    (লাইভ গুদাম ব্যালেন্স)
                  </div>
                </th>
                <th className="py-3 px-4 text-right w-32 sm:w-36">
                  <div>দর (কার্টুন)</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    (বিক্রয় রেট)
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">কোনো পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchQuery
                        ? 'ভিন্ন কী-ওয়ার্ড দিয়ে সার্চ করুন অথবা ফিল্টার পরিবর্তন করুন।'
                        : 'পণ্য ও মূল্য তালিকা থেকে পণ্য যুক্ত করুন।'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayProducts.map((p, idx) => {
                  const stockDisplay = formatStockForSummary(p);
                  const hasStock = (Number(p.currentStock) || 0) > 0;
                  const salePrice = Number(p.salePrice) || 0;
                  const isDraggingThis = draggedIndex === idx;
                  const isOverThis = dragOverIndex === idx && draggedIndex !== idx;

                  return (
                    <tr
                      key={p.id}
                      data-summary-row-idx={idx}
                      draggable={!isFilterOrSearchActive}
                      onDragStart={(e) => handleDragStart(idx, e)}
                      onDragOver={(e) => handleDragOver(idx, e)}
                      onDrop={(e) => handleDrop(idx, e)}
                      onDragEnd={handleDragEnd}
                      className={`transition-colors duration-150 ${
                        isDraggingThis
                          ? 'opacity-40 bg-emerald-100/50'
                          : isOverThis
                          ? 'bg-emerald-100/80 border-t-2 border-emerald-600'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-emerald-50/40'
                          : 'bg-slate-50/30 hover:bg-emerald-50/40'
                      }`}
                    >
                      {/* Drag Handle & Move Fallbacks (▲ / ▼) */}
                      <td className="py-2 px-1 text-center border-r border-slate-100 select-none align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          {/* Drag Handle */}
                          <button
                            type="button"
                            disabled={isFilterOrSearchActive}
                            onTouchStart={(e) => handleTouchStart(idx, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            title={
                              isFilterOrSearchActive
                                ? 'ফিল্টার সক্রিয় থাকায় ড্র্যাগ নিষ্ক্রিয়'
                                : 'টেনে উপরে বা নিচে সাজান'
                            }
                            className={`p-1 rounded text-slate-400 hover:text-slate-800 ${
                              isFilterOrSearchActive
                                ? 'opacity-30 cursor-not-allowed'
                                : 'cursor-grab active:cursor-grabbing hover:bg-slate-100'
                            }`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>

                          {/* Fallback Move Buttons */}
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={isFilterOrSearchActive || idx === 0}
                              onClick={() => handleMoveStep(idx, 'up')}
                              title="এক ঘর উপরে নিন"
                              className="p-0.5 text-slate-400 hover:text-emerald-700 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={isFilterOrSearchActive || idx === displayProducts.length - 1}
                              onClick={() => handleMoveStep(idx, 'down')}
                              title="এক ঘর নিচে নিন"
                              className="p-0.5 text-slate-400 hover:text-emerald-700 disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* ১. নং */}
                      <td className="py-3 px-2 text-center font-mono font-medium text-slate-500 border-r border-slate-100 align-middle">
                        {toBengaliDigits(idx + 1)}
                      </td>

                      {/* ২. প্রোডাক্টের নাম */}
                      <td className="py-3 px-4 border-r border-slate-100 align-middle">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          {p.code && <span className="font-mono">কোড: {p.code}</span>}
                          {p.category && <span>• {p.category}</span>}
                        </div>
                      </td>

                      {/* ৩. মোট (EMPTY column, left blank on purpose for the SR to write by hand) */}
                      <td className="py-2 px-3 text-center border-r border-slate-100 bg-amber-50/20 align-middle">
                        <div
                          className="h-8 w-full max-w-[140px] mx-auto rounded-lg border-2 border-dashed border-amber-300/80 bg-white/80 flex items-center justify-center text-[11px] text-slate-400 select-none"
                          title="প্রিন্ট করার পর এসআর হাতে সংখ্যা লিখবেন"
                        >
                          <span className="text-amber-700/60 font-mono text-xs">—</span>
                        </div>
                      </td>

                      {/* ৪. স্টক (current stock of that product, read-only, pulled automatically from Stock module) */}
                      <td className="py-3 px-4 text-center border-r border-slate-100 align-middle">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold ${
                            hasStock
                              ? 'bg-emerald-100/80 text-emerald-900 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {stockDisplay}
                        </span>
                      </td>

                      {/* ৫. দর (কার্টুন) (read-only selling rate per carton, always live) */}
                      <td className="py-3 px-4 text-right align-middle">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          ৳ {salePrice.toLocaleString('en-US')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Bottom Footer Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div>
            প্রদর্শিত হচ্ছে মোট <strong>{toBengaliDigits(displayProducts.length)}</strong> টি পণ্য
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span>প্রস্তুত সময়:</span>
            <strong>{generationDateTimeStr}</strong>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      <SummaryPrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        settings={db.settings}
        products={displayProducts}
        generationDateTimeStr={generationDateTimeStr}
        onlyInStock={onlyInStock}
      />
    </div>
  );
};
