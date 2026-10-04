import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Calendar,
  Package,
  Layers,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Boxes,
  RotateCcw,
  AlertOctagon,
  CalendarRange,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product, DailyAccountSheet } from '../../types';
import {
  toBengaliDigits,
  formatDate,
  formatDateBnDigits,
  formatFullBengaliDate,
} from '../../utils/dateUtils';

interface ProductSalesAnalysisModuleProps {
  onOpenDailySheet?: (sheetId: string) => void;
}

type DatePreset = 'this_month' | 'last_month' | 'last_30_days' | 'this_year' | 'custom';

interface DateWiseRecord {
  id: string;
  sheetId: string;
  sheetNo: string;
  date: string;
  route: string;
  srName: string;
  issuedPieces: number;
  returnPieces: number;
  soldPieces: number;
  cartonEquivalent: number;
  sellingRate: number;
  salesAmount: number;
  damagePieces: number;
  damageValue: number;
}

export const ProductSalesAnalysisModule: React.FC<ProductSalesAnalysisModuleProps> = ({
  onOpenDailySheet,
}) => {
  const { db, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';

  // Helper to calculate date preset values
  const getPresetRange = (presetType: DatePreset, refDateStr: string) => {
    const parts = refDateStr.split('-').map(Number);
    const y = parts[0] || new Date().getFullYear();
    const m = (parts[1] || 1) - 1; // 0-indexed
    const d = parts[2] || 1;
    const refDate = new Date(y, m, d);

    const toStr = (date: Date) => {
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const da = String(date.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    if (presetType === 'this_month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0); // last day of this month
      return { start: toStr(start), end: toStr(end) };
    } else if (presetType === 'last_month') {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0); // last day of previous month
      return { start: toStr(start), end: toStr(end) };
    } else if (presetType === 'last_30_days') {
      const start = new Date(refDate);
      start.setDate(start.getDate() - 29);
      return { start: toStr(start), end: toStr(refDate) };
    } else if (presetType === 'this_year') {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { start: toStr(start), end: toStr(end) };
    }
    // Default fallback to this month
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { start: toStr(start), end: toStr(end) };
  };

  // State: Selected product
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const activeProds = db.products.filter((p) => p.status !== 'inactive' && !p.deletedFromStock);
    return activeProds[0]?.id || db.products[0]?.id || '';
  });

  // State: Product Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // State: Date Range & Preset
  const [activePreset, setActivePreset] = useState<DatePreset>('this_month');
  const initialRange = getPresetRange('this_month', todayDateStr);
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);

  // Sorting for date breakdown table
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Find the selected product object
  const selectedProduct = useMemo<Product | undefined>(() => {
    return db.products.find((p) => p.id === selectedProductId);
  }, [db.products, selectedProductId]);

  // Conversion ratio for carton to pieces
  const piecesPerCartonRatio = useMemo(() => {
    if (!selectedProduct) return 1;
    return (
      Number(selectedProduct.piecesPerCarton) ||
      Number(selectedProduct.cartonQty) ||
      1
    );
  }, [selectedProduct]);

  // Matching product suggestions for search box
  const matchingSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return db.products.filter((p) => !p.deletedFromStock);
    }
    const q = searchQuery.toLowerCase().trim();
    return db.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [db.products, searchQuery]);

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set preset range
  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      const range = getPresetRange(preset, todayDateStr);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  // Handle manual start/end date changes
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
  };

  // =========================================================================
  // CORE CALCULATION: Analyze sales entries for selected product in range
  // =========================================================================
  const analysisData = useMemo(() => {
    if (!selectedProduct) {
      return {
        records: [] as DateWiseRecord[],
        totalSoldPieces: 0,
        totalIssuedPieces: 0,
        totalReturnPieces: 0,
        totalCartonEquivalent: 0,
        totalSalesAmount: 0,
        totalDamagePieces: 0,
        totalDamageValue: 0,
        activeDaysCount: 0,
        totalDaysInRange: 1,
        avgPerActiveDay: 0,
        avgPerCalendarDay: 0,
      };
    }

    const ratio = piecesPerCartonRatio;
    const pId = selectedProduct.id;
    const pCode = selectedProduct.code.trim().toLowerCase();
    const pName = selectedProduct.name.trim().toLowerCase();

    // Check if an item matches the selected product
    const isItemMatch = (
      itemId?: string,
      itemCode?: string,
      itemName?: string
    ) => {
      if (itemId && itemId === pId) return true;
      if (itemCode && itemCode.trim().toLowerCase() === pCode) return true;
      if (itemName && itemName.trim().toLowerCase() === pName) return true;
      return false;
    };

    // Filter daily sheets in date range
    const sheetsInRange = (db.dailySheets || []).filter((s) => {
      if (!s.date) return false;
      return s.date >= startDate && s.date <= endDate;
    });

    const records: DateWiseRecord[] = [];
    let totalSoldPieces = 0;
    let totalIssuedPieces = 0;
    let totalReturnPieces = 0;
    let totalSalesAmount = 0;
    let totalDamagePieces = 0;
    let totalDamageValue = 0;
    const activeDatesSet = new Set<string>();

    sheetsInRange.forEach((sheet) => {
      const sheetDate = sheet.date;
      const sheetNo = sheet.sheetNo || sheet.id;
      const route = sheet.routeOrVan || 'রুট উল্লেখ নেই';
      const sr = sheet.srName || '-';

      // 1. Check sales items in sheet.items
      const matchingItems = (sheet.items || []).filter((it) =>
        isItemMatch(it.productId, it.productCode, it.productName)
      );

      // 2. Check damage items in sheet.damageItems or sheet.items
      const matchingDamages = (sheet.damageItems || []).filter((d) =>
        isItemMatch(d.productId, d.productCode, d.productName)
      );

      // Also check if any item in sheet.items has damageQty > 0 that is not in damageItems
      (sheet.items || []).forEach((it) => {
        if (
          isItemMatch(it.productId, it.productCode, it.productName) &&
          it.damageQty > 0 &&
          !matchingDamages.some((d) => d.id === it.id)
        ) {
          matchingDamages.push(it);
        }
      });

      // Calculate damages for this sheet
      let sheetDmgPieces = 0;
      let sheetDmgValue = 0;
      matchingDamages.forEach((dmg) => {
        const itemRatio = Number(dmg.piecesPerCarton) || ratio;
        let dPieces = Number(dmg.damageQty) || Number(dmg.issuedQty) || 0;
        if (
          dmg.damageUnit === 'C' &&
          dmg.rawDamageQty !== undefined &&
          dmg.damageQty === dmg.rawDamageQty
        ) {
          dPieces = Number(dmg.rawDamageQty) * itemRatio;
        }
        const rate =
          Number(dmg.sellingPrice) || Number(selectedProduct.salePrice) || 0;
        const dVal = Number(dmg.damageValue) || dPieces * rate;
        sheetDmgPieces += dPieces;
        sheetDmgValue += dVal;
      });

      // If there are sales items or damage items for this product in this sheet
      if (matchingItems.length > 0 || matchingDamages.length > 0) {
        let sheetIssuedPieces = 0;
        let sheetReturnPieces = 0;
        let sheetSoldPieces = 0;
        let sheetAmount = 0;
        let recordedSellingRate = Number(selectedProduct.salePrice) || 0;

        matchingItems.forEach((it) => {
          const itemRatio = Number(it.piecesPerCarton) || ratio;

          // Issued pieces calculation
          let issPieces = Number(it.issuedQty) || 0;
          if (
            it.issuedUnit === 'C' &&
            it.rawIssuedQty !== undefined &&
            it.issuedQty === it.rawIssuedQty
          ) {
            issPieces = Number(it.rawIssuedQty) * itemRatio;
          }

          // Return pieces calculation
          let retPieces = Number(it.returnQty) || 0;
          if (
            it.returnUnit === 'C' &&
            it.rawReturnQty !== undefined &&
            it.returnQty === it.rawReturnQty
          ) {
            retPieces = Number(it.rawReturnQty) * itemRatio;
          }

          // Net sold pieces
          let soldP = 0;
          if (issPieces > 0 || retPieces > 0) {
            soldP = Math.max(0, issPieces - retPieces);
          } else if (typeof it.netSoldQty === 'number' && it.netSoldQty > 0) {
            if (
              it.issuedUnit === 'C' &&
              it.rawIssuedQty !== undefined &&
              it.netSoldQty === (it.rawIssuedQty - (it.rawReturnQty || 0))
            ) {
              soldP = it.netSoldQty * itemRatio;
            } else {
              soldP = it.netSoldQty;
            }
          }

          const sRate =
            Number(it.sellingPrice) || Number(selectedProduct.salePrice) || 0;
          recordedSellingRate = sRate;

          let lineTotal = 0;
          if (typeof it.grossAmount === 'number' && it.grossAmount > 0) {
            lineTotal = it.grossAmount;
          } else if (
            typeof it.finalNetAmount === 'number' &&
            it.finalNetAmount > 0
          ) {
            lineTotal = it.finalNetAmount;
          } else {
            lineTotal = soldP * sRate;
          }

          sheetIssuedPieces += issPieces;
          sheetReturnPieces += retPieces;
          sheetSoldPieces += soldP;
          sheetAmount += lineTotal;
        });

        // Carton-equivalent for this sheet
        const sheetCartonEq = ratio > 0 ? sheetSoldPieces / ratio : sheetSoldPieces;

        // Add to records
        records.push({
          id: `${sheet.id}-${selectedProduct.id}`,
          sheetId: sheet.id,
          sheetNo,
          date: sheetDate,
          route,
          srName: sr,
          issuedPieces: sheetIssuedPieces,
          returnPieces: sheetReturnPieces,
          soldPieces: sheetSoldPieces,
          cartonEquivalent: sheetCartonEq,
          sellingRate: recordedSellingRate,
          salesAmount: sheetAmount,
          damagePieces: sheetDmgPieces,
          damageValue: sheetDmgValue,
        });

        totalIssuedPieces += sheetIssuedPieces;
        totalReturnPieces += sheetReturnPieces;
        totalSoldPieces += sheetSoldPieces;
        totalSalesAmount += sheetAmount;
        totalDamagePieces += sheetDmgPieces;
        totalDamageValue += sheetDmgValue;

        if (sheetSoldPieces > 0 || sheetIssuedPieces > 0 || sheetDmgPieces > 0) {
          activeDatesSet.add(sheetDate);
        }
      }
    });

    // Sort records by date
    records.sort((a, b) => {
      if (sortOrder === 'desc') {
        return b.date.localeCompare(a.date);
      }
      return a.date.localeCompare(b.date);
    });

    // Total carton equivalent
    const totalCartonEquivalent =
      ratio > 0 ? totalSoldPieces / ratio : totalSoldPieces;

    // Total calendar days in range
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    const totalDaysInRange = Math.max(
      1,
      Math.round((endTimestamp - startTimestamp) / (1000 * 60 * 60 * 24)) + 1
    );

    const activeDaysCount = activeDatesSet.size;
    const avgPerActiveDay =
      activeDaysCount > 0 ? totalSoldPieces / activeDaysCount : 0;
    const avgPerCalendarDay =
      totalDaysInRange > 0 ? totalSoldPieces / totalDaysInRange : 0;

    return {
      records,
      totalSoldPieces,
      totalIssuedPieces,
      totalReturnPieces,
      totalCartonEquivalent,
      totalSalesAmount,
      totalDamagePieces,
      totalDamageValue,
      activeDaysCount,
      totalDaysInRange,
      avgPerActiveDay,
      avgPerCalendarDay,
    };
  }, [selectedProduct, piecesPerCartonRatio, db.dailySheets, startDate, endDate, sortOrder]);

  // Helper to format carton equivalent as decimal or integer
  const formatCartonEquivalent = (val: number): string => {
    if (isNaN(val) || !isFinite(val) || val <= 0) return '০ কার্টন (0 Cartons)';
    const isWhole = val % 1 === 0;
    const numStr = isWhole ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
    return `${toBengaliDigits(numStr)} কার্টন (${numStr} Cartons)`;
  };

  const formatCartonNumberOnly = (val: number): string => {
    if (isNaN(val) || !isFinite(val) || val <= 0) return '০';
    const isWhole = val % 1 === 0;
    const numStr = isWhole ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
    return toBengaliDigits(numStr);
  };

  // Trigger print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-bengali">
              পণ্য বিক্রয় বিশ্লেষণ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-bengali">
              Product Sales Analysis • নির্দিষ্ট পণ্যের বিক্রি, কার্টন সমতুল্য, টাকা, ফেরত ও ড্যামেজ রিপোর্ট
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>প্রিন্ট / রিপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Control Grid: Product Selector + Date Range Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. PRODUCT SELECTOR (5 cols on lg) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2 font-bengali">
              <Package className="h-4 w-4 text-emerald-600" />
              <span>১. পণ্য নির্বাচন (Product Selector)</span>
            </label>
            <span className="text-xs text-slate-400 font-mono">
              মোট: {toBengaliDigits(db.products.length)} টি
            </span>
          </div>

          {/* Search Field with Autocomplete Dropdown */}
          <div ref={searchContainerRef} className="relative">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setHighlightedIndex(0);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="পণ্যের নাম বা কোড দিয়ে খুঁজুন..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-9 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && matchingSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between items-center font-bengali">
                  <span>পাওয়া গেছে: {toBengaliDigits(matchingSuggestions.length)} টি পণ্য</span>
                  <span className="text-[10px] text-slate-400">ক্লিক করে নির্বাচন করুন</span>
                </div>
                {matchingSuggestions.map((prod, idx) => {
                  const isSelected = prod.id === selectedProductId;
                  const ratio =
                    Number(prod.piecesPerCarton) || Number(prod.cartonQty) || 1;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedProductId(prod.id);
                        setSearchQuery('');
                        setShowSuggestions(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-500'
                          : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {prod.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                            {prod.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 font-bengali">
                          <span>প্যাক: {prod.packSize || prod.unit}</span>
                          <span>•</span>
                          <span>১ কার্টন = {toBengaliDigits(ratio)} পিস</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-700">
                          {currency} {toBengaliDigits(prod.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          স্টক: {toBengaliDigits(prod.currentStock)} {prod.unit}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Dropdown select fallback */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 font-bengali">
                অথবা তালিকা থেকে সরাসরি নির্বাচন করুন:
              </span>
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {db.products.map((p) => {
                const ratio = Number(p.piecesPerCarton) || Number(p.cartonQty) || 1;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.code}] — {currency}{p.salePrice} (১ কার্টন = {ratio} পিস)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Selected Product Spec Sheet Card */}
          {selectedProduct && (
            <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-3.5 text-xs text-slate-800 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold font-mono uppercase tracking-wider mb-1">
                    {selectedProduct.code}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedProduct.name}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-bengali">বিক্রয় দর (দর)</div>
                  <div className="text-base font-extrabold text-emerald-700 font-mono">
                    {currency} {toBengaliDigits(selectedProduct.salePrice)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-[11px] font-bengali">
                <div className="bg-white/70 rounded-lg p-2 border border-emerald-100">
                  <span className="text-slate-400 block text-[10px]">ক্যাটাগরি</span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {selectedProduct.category || 'সাধারণ'}
                  </span>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-emerald-100">
                  <span className="text-slate-400 block text-[10px]">পিস প্রতি কার্টন</span>
                  <span className="font-bold text-emerald-800 block">
                    ১ কা. = {toBengaliDigits(piecesPerCartonRatio)} পিস
                  </span>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-emerald-100">
                  <span className="text-slate-400 block text-[10px]">প্যাক সাইজ / ইউনিট</span>
                  <span className="font-semibold text-slate-700 truncate block">
                    {selectedProduct.packSize || selectedProduct.unit}
                  </span>
                </div>
                <div className="bg-white/70 rounded-lg p-2 border border-emerald-100">
                  <span className="text-slate-400 block text-[10px]">বর্তমান গুদাম স্টক</span>
                  <span className="font-bold text-slate-900 block">
                    {toBengaliDigits(selectedProduct.currentStock)} {selectedProduct.unit}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. DATE RANGE SELECTOR (6 cols on lg) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2 font-bengali">
              <CalendarRange className="h-4 w-4 text-emerald-600" />
              <span>২. সময়সীমা নির্বাচন (Date Range Selector)</span>
            </label>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bengali">
              মোট: {toBengaliDigits(analysisData.totalDaysInRange)} দিন
            </span>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2 font-bengali">
              দ্রুত নির্বাচন (Quick Presets):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSelectPreset('this_month')}
                className={`px-3 py-2 rounded-xl font-bold text-center transition-all ${
                  activePreset === 'this_month'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                এই মাস
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('last_month')}
                className={`px-3 py-2 rounded-xl font-bold text-center transition-all ${
                  activePreset === 'last_month'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                গত মাস
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('last_30_days')}
                className={`px-3 py-2 rounded-xl font-bold text-center transition-all ${
                  activePreset === 'last_30_days'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                গত ৩০ দিন
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('this_year')}
                className={`px-3 py-2 rounded-xl font-bold text-center transition-all ${
                  activePreset === 'this_year'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                এই বছর
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-bengali">
                শুরুর তারিখ (Start Date)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-bengali">
                শেষের তারিখ (End Date)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Date Range Summary Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-bengali">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-900">{formatDateBnDigits(startDate)}</strong> থেকে{' '}
                <strong className="text-slate-900">{formatDateBnDigits(endDate)}</strong> পর্যন্ত
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              সক্রিয় বিক্রির দিন: <strong className="text-emerald-700">{toBengaliDigits(analysisData.activeDaysCount)}</strong> দিন
            </div>
          </div>
        </div>
      </div>

      {/* 3. STATEMENT RESULT / SUMMARY KPI CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 font-bengali">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>৩. বিক্রয় বিবরণী ও বিশ্লেষণ (Statement Summary)</span>
          </h2>
          <span className="text-xs text-slate-500 font-bengali">
            পণ্য: <strong className="text-slate-800">{selectedProduct?.name || 'সিলেক্টেড পণ্য'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Card 1: মোট বিক্রি (পিস) */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 via-emerald-50/40 to-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold font-bengali mb-1.5">
              <span>মোট বিক্রি (পিস)</span>
              <Boxes className="h-4 w-4 text-emerald-600 opacity-80" />
            </div>
            <div className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
              {toBengaliDigits(analysisData.totalSoldPieces.toLocaleString('en-US'))}
              <span className="text-xs font-semibold ml-1.5 font-bengali text-emerald-700">পিস</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bengali">
              চালান: {toBengaliDigits(analysisData.totalIssuedPieces)} • ফেরত: {toBengaliDigits(analysisData.totalReturnPieces)}
            </div>
          </div>

          {/* Card 2: মোট বিক্রি (কার্টন সমতুল্য) */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-500/10 via-blue-50/40 to-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-blue-800 text-xs font-bold font-bengali mb-1.5">
              <span>মোট বিক্রি (কার্টন সমতুল্য)</span>
              <Package className="h-4 w-4 text-blue-600 opacity-80" />
            </div>
            <div className="text-2xl font-black text-blue-950 font-mono tracking-tight">
              {formatCartonNumberOnly(analysisData.totalCartonEquivalent)}
              <span className="text-xs font-semibold ml-1.5 font-bengali text-blue-700">কার্টন</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bengali truncate">
              ১ কা. = {toBengaliDigits(piecesPerCartonRatio)} পিস (পিস ÷ {toBengaliDigits(piecesPerCartonRatio)})
            </div>
          </div>

          {/* Card 3: মোট বিক্রয় টাকা */}
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-500/10 via-teal-50/40 to-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-teal-800 text-xs font-bold font-bengali mb-1.5">
              <span>মোট বিক্রয় টাকা</span>
              <span className="text-xs font-mono font-bold text-teal-700">{currency}</span>
            </div>
            <div className="text-2xl font-black text-teal-950 font-mono tracking-tight truncate">
              {currency} {toBengaliDigits(analysisData.totalSalesAmount.toLocaleString('en-US'))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bengali">
              গড় দর: {currency} {toBengaliDigits(selectedProduct?.salePrice || 0)} / পিস
            </div>
          </div>

          {/* Card 4: গড় দৈনিক বিক্রি */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-500/10 via-indigo-50/40 to-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-indigo-800 text-xs font-bold font-bengali mb-1.5">
              <span>গড় দৈনিক বিক্রি</span>
              <TrendingUp className="h-4 w-4 text-indigo-600 opacity-80" />
            </div>
            <div className="text-2xl font-black text-indigo-950 font-mono tracking-tight">
              {toBengaliDigits(
                analysisData.avgPerActiveDay % 1 === 0
                  ? analysisData.avgPerActiveDay.toString()
                  : analysisData.avgPerActiveDay.toFixed(1)
              )}
              <span className="text-xs font-semibold ml-1 font-bengali text-indigo-700">পিস/দিন</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bengali truncate">
              সক্রিয় {toBengaliDigits(analysisData.activeDaysCount)} দিনে (ক্যালেন্ডার: {toBengaliDigits(analysisData.avgPerCalendarDay.toFixed(1))})
            </div>
          </div>

          {/* Card 5: মোট ফেরত (পিস) */}
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-500/10 via-amber-50/40 to-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-amber-800 text-xs font-bold font-bengali mb-1.5">
              <span>মোট ফেরত (পিস)</span>
              <RotateCcw className="h-4 w-4 text-amber-600 opacity-80" />
            </div>
            <div className="text-2xl font-black text-amber-950 font-mono tracking-tight">
              {toBengaliDigits(analysisData.totalReturnPieces.toLocaleString('en-US'))}
              <span className="text-xs font-semibold ml-1.5 font-bengali text-amber-700">পিস</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bengali">
              কার্টন সমতুল্য: {formatCartonNumberOnly(analysisData.totalReturnPieces / (piecesPerCartonRatio || 1))} কা.
            </div>
          </div>

          {/* Card 6: মোট ড্যামেজ (পিস / টাকা) */}
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-500/10 via-rose-50/40 to-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-rose-800 text-xs font-bold font-bengali mb-1.5">
              <span>মোট ড্যামেজ</span>
              <AlertOctagon className="h-4 w-4 text-rose-600 opacity-80" />
            </div>
            <div className="text-2xl font-black text-rose-950 font-mono tracking-tight">
              {toBengaliDigits(analysisData.totalDamagePieces.toLocaleString('en-US'))}
              <span className="text-xs font-semibold ml-1 font-bengali text-rose-700">পিস</span>
            </div>
            <div className="text-[11px] text-rose-700 font-bold mt-1 font-mono">
              মূল্য: {currency} {toBengaliDigits(analysisData.totalDamageValue.toLocaleString('en-US'))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. DATE-WISE BREAKDOWN TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base font-bengali">
                ৪. তারিখ অনুযায়ী বিক্রয় বিবরণী (Date-wise Breakdown Table)
              </h3>
              <p className="text-xs text-slate-500 font-bengali">
                নির্বাচিত সময়সীমায় দৈনিক হিসাব শিটে রেকর্ডকৃত প্রতিটি বিক্রয় এন্ট্রি
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 font-bengali">
              মোট এন্ট্রি: <strong className="text-slate-800 font-mono">{toBengaliDigits(analysisData.records.length)}</strong> টি
            </div>

            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors font-bengali"
            >
              <span>তারিখ: {sortOrder === 'desc' ? 'নতুন থেকে পুরাতন' : 'পুরাতন থেকে নতুন'}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        {analysisData.records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Package className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800 font-bengali mb-1">
              কোনো বিক্রির রেকর্ড পাওয়া যায়নি
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-bengali">
              নির্বাচিত সময়সীমা ({formatDateBnDigits(startDate)} থেকে {formatDateBnDigits(endDate)}) এর মধ্যে {selectedProduct?.name} পণ্যের কোনো দৈনিক বিক্রির এন্ট্রি পাওয়া যায়নি।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 text-xs font-bold font-bengali">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">তারিখ</th>
                  <th className="py-3 px-3">শিট নং ও রুট / এসআর</th>
                  <th className="py-3 px-3 text-right">চালান (পিস)</th>
                  <th className="py-3 px-3 text-right">ফেরত (পিস)</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/60 text-emerald-950 font-extrabold">
                    বিক্রি (পিস)
                  </th>
                  <th className="py-3 px-3 text-right">কার্টন সমতুল্য</th>
                  <th className="py-3 px-3 text-right">দর ({currency})</th>
                  <th className="py-3 px-3 text-right font-extrabold text-slate-900 bg-slate-50">
                    মোট টাকা ({currency})
                  </th>
                  <th className="py-3 px-3 text-right">ড্যামেজ (পিস / ৳)</th>
                  {onOpenDailySheet && <th className="py-3 px-3 text-center">শিট দেখুন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {analysisData.records.map((rec, idx) => {
                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors text-slate-800"
                    >
                      <td className="py-2.5 px-3 text-center text-xs font-mono text-slate-400">
                        {toBengaliDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateBnDigits(rec.date)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 text-xs font-mono">
                          {rec.sheetNo}
                        </div>
                        <div className="text-[11px] text-slate-500 font-bengali truncate max-w-[200px]">
                          {rec.route} {rec.srName !== '-' && `• ${rec.srName}`}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {toBengaliDigits(rec.issuedPieces)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        {rec.returnPieces > 0 ? toBengaliDigits(rec.returnPieces) : '০'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                        {toBengaliDigits(rec.soldPieces)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-800">
                        {formatCartonNumberOnly(rec.cartonEquivalent)} কা.
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {currency} {toBengaliDigits(rec.sellingRate)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/60">
                        {currency} {toBengaliDigits(rec.salesAmount.toLocaleString('en-US'))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {rec.damagePieces > 0 ? (
                          <span className="text-rose-700 font-semibold">
                            {toBengaliDigits(rec.damagePieces)} পিস ({currency}{toBengaliDigits(rec.damageValue)})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      {onOpenDailySheet && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenDailySheet(rec.sheetId)}
                            title="দৈনিক বিক্রি হিসাব শিট খুলুন"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors shadow-2xs font-bengali"
                          >
                            <span>খুলুন</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {/* Table Footer with Totals */}
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-extrabold text-slate-900 text-xs sm:text-sm font-bengali">
                  <td colSpan={3} className="py-3 px-4 text-left">
                    সর্বমোট যোগফল ({toBengaliDigits(analysisData.records.length)} টি এন্ট্রি)
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                    {toBengaliDigits(analysisData.totalIssuedPieces)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-800">
                    {toBengaliDigits(analysisData.totalReturnPieces)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-900 bg-emerald-100/60">
                    {toBengaliDigits(analysisData.totalSoldPieces)} পিস
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-blue-900">
                    {formatCartonNumberOnly(analysisData.totalCartonEquivalent)} কা.
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">-</td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-950 bg-slate-200/80">
                    {currency} {toBengaliDigits(analysisData.totalSalesAmount.toLocaleString('en-US'))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-800">
                    {analysisData.totalDamagePieces > 0 ? (
                      `${toBengaliDigits(analysisData.totalDamagePieces)} পিস (${currency} ${toBengaliDigits(analysisData.totalDamageValue.toLocaleString('en-US'))})`
                    ) : (
                      '০'
                    )}
                  </td>
                  {onOpenDailySheet && <td className="py-3 px-3"></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Hidden Print-Only Template (Active during window.print()) */}
      <div className="hidden print:block font-bengali text-black p-4 space-y-4">
        <div className="text-center border-b pb-3">
          <h1 className="text-xl font-bold">{db.settings.businessName || 'MM TRADERS'}</h1>
          <p className="text-xs">{db.settings.address || 'Proprietor: Mohammad Mamun'}</p>
          <h2 className="text-sm font-bold mt-2 underline">পণ্য বিক্রয় বিশ্লেষণ বিবরণী</h2>
          <p className="text-xs text-slate-600">
            সময়সীমা: {formatDateBnDigits(startDate)} থেকে {formatDateBnDigits(endDate)}
          </p>
        </div>

        {selectedProduct && (
          <div className="border p-3 rounded text-xs grid grid-cols-2 gap-2">
            <div>
              <strong>পণ্যের নাম:</strong> {selectedProduct.name} ({selectedProduct.code})
            </div>
            <div>
              <strong>পিস প্রতি কার্টন:</strong> {toBengaliDigits(piecesPerCartonRatio)} পিস
            </div>
            <div>
              <strong>বিক্রয় দর:</strong> {currency} {toBengaliDigits(selectedProduct.salePrice)}
            </div>
            <div>
              <strong>মোট বিক্রি (পিস):</strong> {toBengaliDigits(analysisData.totalSoldPieces)} পিস
            </div>
            <div>
              <strong>মোট বিক্রি (কার্টন সমতুল্য):</strong> {formatCartonEquivalent(analysisData.totalCartonEquivalent)}
            </div>
            <div>
              <strong>মোট বিক্রয় টাকা:</strong> {currency} {toBengaliDigits(analysisData.totalSalesAmount.toLocaleString('en-US'))}
            </div>
            <div>
              <strong>মোট ফেরত:</strong> {toBengaliDigits(analysisData.totalReturnPieces)} পিস
            </div>
            <div>
              <strong>মোট ড্যামেজ:</strong> {toBengaliDigits(analysisData.totalDamagePieces)} পিস ({currency} {toBengaliDigits(analysisData.totalDamageValue)})
            </div>
          </div>
        )}

        <table className="w-full text-xs border border-collapse mt-4">
          <thead>
            <tr className="border bg-slate-100">
              <th className="border p-1">#</th>
              <th className="border p-1">তারিখ</th>
              <th className="border p-1">শিট নং</th>
              <th className="border p-1 text-right">বিক্রি (পিস)</th>
              <th className="border p-1 text-right">কার্টন সমতুল্য</th>
              <th className="border p-1 text-right">মোট টাকা ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {analysisData.records.map((r, i) => (
              <tr key={r.id}>
                <td className="border p-1 text-center">{toBengaliDigits(i + 1)}</td>
                <td className="border p-1">{formatDateBnDigits(r.date)}</td>
                <td className="border p-1">{r.sheetNo}</td>
                <td className="border p-1 text-right">{toBengaliDigits(r.soldPieces)}</td>
                <td className="border p-1 text-right">{formatCartonNumberOnly(r.cartonEquivalent)}</td>
                <td className="border p-1 text-right">{toBengaliDigits(r.salesAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border font-bold bg-slate-100">
              <td colSpan={3} className="border p-1 text-center">সর্বমোট যোগফল</td>
              <td className="border p-1 text-right">{toBengaliDigits(analysisData.totalSoldPieces)}</td>
              <td className="border p-1 text-right">{formatCartonNumberOnly(analysisData.totalCartonEquivalent)}</td>
              <td className="border p-1 text-right">{toBengaliDigits(analysisData.totalSalesAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
