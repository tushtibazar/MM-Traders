import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileCheck,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Package,
  Calculator,
  Percent,
  Boxes,
  ArrowRight,
  TrendingUp,
  Printer,
  Search,
  X,
  History,
  AlertCircle,
  Save,
  Tag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { toBengaliDigits } from '../../utils/dateUtils';

interface BatchRow {
  id: string;
  name: string; // e.g. "চালান ১"
  purchasePrice: string | number; // ক্রয় মূল্য (মোট টাকা)
  totalPieces: string | number; // মোট পিস
  freePieces: string | number; // ফ্রি পিস
  undeliveredPieces: string | number; // আনডেলিভারি পিস
}

interface SavedCalculation {
  id: string;
  date: string;
  productName: string;
  productId?: string;
  grandTotalPieces: number;
  cartonCount: number;
  perPieceCost: number;
  piecesPerCarton: number;
  costPerCarton: number;
  profitMargin: number;
  sellingPricePerCarton: number;
  rows: BatchRow[];
}

const STORAGE_KEY = 'mm_traders_challan_check_history_v1';

export const ChallanCheckModule: React.FC = () => {
  const { db, currentUser, updateProduct } = useApp();
  const currency = db.settings.currency || '৳';
  const isOwner = currentUser.role === 'owner';

  // 1. Product Name / Search state
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showProductDropdown, setShowProductDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // 2. Batch Entry Table — 3 rows by default
  const [rows, setRows] = useState<BatchRow[]>([
    { id: 'batch-1', name: 'চালান ১', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
    { id: 'batch-2', name: 'চালান ২', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
    { id: 'batch-3', name: 'চালান ৩', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
  ]);

  // 6. কত পিছে কার্টুন (Pieces Per Carton) — manual input, default 24
  const [piecesPerCarton, setPiecesPerCarton] = useState<number | string>(24);

  // 8. প্রফিট মার্জিন (%) — manual input, default 6%
  const [profitMargin, setProfitMargin] = useState<number | string>(6);

  // Notification / Alert message state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Saved calculations history in localStorage
  const [savedHistory, setSavedHistory] = useState<SavedCalculation[]>(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Close product dropdown on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Filter matching products for autocomplete
  const matchingProducts = useMemo(() => {
    if (!productSearch.trim()) return db.products.filter((p) => !p.deletedFromStock);
    const q = productSearch.toLowerCase().trim();
    return db.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [db.products, productSearch]);

  // Find currently matched product
  const matchedProduct = useMemo(() => {
    if (selectedProductId) {
      return db.products.find((p) => p.id === selectedProductId);
    }
    const trimmed = productSearch.trim().toLowerCase();
    if (!trimmed) return undefined;
    return db.products.find(
      (p) =>
        p.name.trim().toLowerCase() === trimmed ||
        p.code.trim().toLowerCase() === trimmed
    );
  }, [db.products, selectedProductId, productSearch]);

  // Handle selecting a product from dropdown
  const handleSelectProduct = (prod: Product) => {
    setSelectedProductId(prod.id);
    setProductSearch(prod.name);
    setShowProductDropdown(false);

    // Auto-populate pieces per carton and profit margin if configured
    const ratio = Number(prod.piecesPerCarton) || Number(prod.cartonQty) || 24;
    setPiecesPerCarton(ratio);
    if (prod.profitMargin !== undefined && prod.profitMargin > 0) {
      setProfitMargin(prod.profitMargin);
    }
  };

  // Add another batch row
  const handleAddRow = () => {
    const newIdx = rows.length + 1;
    setRows((prev) => [
      ...prev,
      {
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: `চালান ${toBengaliDigits(newIdx)}`,
        purchasePrice: '',
        totalPieces: '',
        freePieces: '',
        undeliveredPieces: '',
      },
    ]);
  };

  // Remove a batch row
  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Update a field in a batch row
  const handleRowChange = (id: string, field: keyof BatchRow, val: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: val };
        }
        return r;
      })
    );
  };

  // Reset calculator to clean 3 rows
  const handleReset = () => {
    setRows([
      { id: 'batch-1', name: 'চালান ১', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
      { id: 'batch-2', name: 'চালান ২', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
      { id: 'batch-3', name: 'চালান ৩', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
    ]);
    setProductSearch('');
    setSelectedProductId('');
    setPiecesPerCarton(24);
    setProfitMargin(6);
    setNotification(null);
  };

  // Load a demo example (e.g. from user prompt reference)
  const handleLoadDemo = () => {
    setRows([
      { id: 'batch-1', name: 'চালান ১', purchasePrice: '19699.20', totalPieces: '1152', freePieces: '144', undeliveredPieces: '0' },
      { id: 'batch-2', name: 'চালান ২', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
      { id: 'batch-3', name: 'চালান ৩', purchasePrice: '', totalPieces: '', freePieces: '', undeliveredPieces: '' },
    ]);
    setProductSearch('উদাহরণ পণ্য (Sample Demo Product)');
    setSelectedProductId('');
    setPiecesPerCarton(24);
    setProfitMargin(6);
    setNotification({
      type: 'info',
      message: 'রেফারেন্স উদাহরণ ডাটা লোড করা হয়েছে (1152 পিস + 144 ফ্রি = 1296 পিস, মোট ৳19,699.20)।',
    });
  };

  // =========================================================================
  // LIVE CALCULATIONS
  // =========================================================================

  // 3. COLUMN TOTALS
  const columnTotals = useMemo(() => {
    let sumPurchasePrice = 0;
    let sumTotalPieces = 0;
    let sumFreePieces = 0;
    let sumUndelivered = 0;

    rows.forEach((r) => {
      const buy = parseFloat(String(r.purchasePrice)) || 0;
      const pcs = parseFloat(String(r.totalPieces)) || 0;
      const free = parseFloat(String(r.freePieces)) || 0;
      const undeliv = parseFloat(String(r.undeliveredPieces)) || 0;

      sumPurchasePrice += buy;
      sumTotalPieces += pcs;
      sumFreePieces += free;
      sumUndelivered += undeliv;
    });

    return {
      sumPurchasePrice,
      sumTotalPieces,
      sumFreePieces,
      sumUndelivered,
    };
  }, [rows]);

  // 4. মোট (GRAND TOTAL PIECES RECEIVED)
  // মোট = মোট পিস (sum) + মোট ফ্রি (sum) − মোট আনডেলিভারি (sum)
  const grandTotalPieces = useMemo(() => {
    const { sumTotalPieces, sumFreePieces, sumUndelivered } = columnTotals;
    return Math.max(0, sumTotalPieces + sumFreePieces - sumUndelivered);
  }, [columnTotals]);

  // 5. পিছ মূল্য (PER PIECE COST)
  // পিছ মূল্য = মোট ক্রয় মূল্য (sum) ÷ মোট (grand total pieces)
  const perPieceCost = useMemo(() => {
    if (grandTotalPieces <= 0 || columnTotals.sumPurchasePrice <= 0) return 0;
    return columnTotals.sumPurchasePrice / grandTotalPieces;
  }, [columnTotals.sumPurchasePrice, grandTotalPieces]);

  // 6. কত পিছে কার্টুন (Parsed)
  const parsedPiecesPerCarton = useMemo(() => {
    const val = parseFloat(String(piecesPerCarton));
    return isNaN(val) || val <= 0 ? 24 : val;
  }, [piecesPerCarton]);

  // 7. প্রতি কার্টুন ক্রয় (PURCHASE COST PER CARTON)
  // প্রতি কার্টুন ক্রয় = পিছ মূল্য × কত পিছে কার্টুন
  const costPerCarton = useMemo(() => {
    return perPieceCost * parsedPiecesPerCarton;
  }, [perPieceCost, parsedPiecesPerCarton]);

  // 8. প্রফিট মার্জিন (%) (Parsed)
  const parsedProfitMargin = useMemo(() => {
    const val = parseFloat(String(profitMargin));
    return isNaN(val) ? 6 : val;
  }, [profitMargin]);

  // 9. বিক্রয় মূল্য (FINAL SELLING PRICE PER CARTON)
  // বিক্রয় মূল্য = প্রতি কার্টুন ক্রয় × (1 + প্রফিট মার্জিন% ÷ 100)
  const sellingPricePerCarton = useMemo(() => {
    if (costPerCarton <= 0) return 0;
    return costPerCarton * (1 + parsedProfitMargin / 100);
  }, [costPerCarton, parsedProfitMargin]);

  // Per piece selling price
  const sellingPricePerPiece = useMemo(() => {
    if (parsedPiecesPerCarton <= 0 || sellingPricePerCarton <= 0) return 0;
    return sellingPricePerCarton / parsedPiecesPerCarton;
  }, [sellingPricePerCarton, parsedPiecesPerCarton]);

  // 10. TOP SUMMARY DISPLAY: Carton Count
  // কার্টুন = grand total pieces ÷ কত পিছে কার্টুন
  const cartonCount = useMemo(() => {
    if (parsedPiecesPerCarton <= 0 || grandTotalPieces <= 0) return 0;
    return grandTotalPieces / parsedPiecesPerCarton;
  }, [grandTotalPieces, parsedPiecesPerCarton]);

  // Helper format decimal/integer
  const formatCartonNumber = (val: number): string => {
    if (isNaN(val) || !isFinite(val) || val <= 0) return '০';
    const isWhole = val % 1 === 0;
    const numStr = isWhole ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
    return toBengaliDigits(numStr);
  };

  const formatCartonNumberEn = (val: number): string => {
    if (isNaN(val) || !isFinite(val) || val <= 0) return '0';
    const isWhole = val % 1 === 0;
    return isWhole ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
  };

  // =========================================================================
  // OPTIONAL — APPLY TO PRODUCT
  // =========================================================================
  const handleApplyToProduct = () => {
    if (!matchedProduct) {
      setNotification({
        type: 'error',
        message: 'কোনো বিদ্যমান পণ্য পাওয়া যায়নি! অনুগ্রহ করে পণ্য ও মূল্য থেকে সঠিক পণ্য নির্বাচন করুন।',
      });
      return;
    }

    if (sellingPricePerCarton <= 0) {
      setNotification({
        type: 'error',
        message: 'বিক্রয় মূল্য শূন্য (০)! অনুগ্রহ করে চালানের ক্রয়মূল্য ও পরিমাণ লিখুন।',
      });
      return;
    }

    const roundedSellingPrice = Number(sellingPricePerCarton.toFixed(2));
    const roundedPurchasePrice = Number(costPerCarton.toFixed(2));
    const roundedPerPiecePrice = Number(sellingPricePerPiece.toFixed(2));

    const updatedProduct: Product = {
      ...matchedProduct,
      salePrice: roundedSellingPrice,
      purchasePrice: roundedPurchasePrice,
      piecesPerCarton: parsedPiecesPerCarton,
      cartonQty: parsedPiecesPerCarton,
      profitMargin: parsedProfitMargin,
      perPiecePrice: roundedPerPiecePrice,
    };

    updateProduct(updatedProduct);

    setNotification({
      type: 'success',
      message: `সাফল্যের সাথে "${matchedProduct.name}" পণ্যের মূল্য আপডেট করা হয়েছে! নতুন কার্টন রেট: ${currency} ${toBengaliDigits(roundedSellingPrice)} (পিস প্রতি: ${currency} ${toBengaliDigits(roundedPerPiecePrice)})`,
    });
  };

  // Save calculation to local history
  const handleSaveToHistory = () => {
    if (grandTotalPieces <= 0 && columnTotals.sumPurchasePrice <= 0) {
      setNotification({
        type: 'error',
        message: 'হিসাব খালি! সেভ করার জন্য চালানের ডাটা পূরণ করুন।',
      });
      return;
    }

    const newEntry: SavedCalculation = {
      id: `calc-${Date.now()}`,
      date: new Date().toISOString(),
      productName: productSearch.trim() || 'অজানা পণ্য',
      productId: selectedProductId || undefined,
      grandTotalPieces,
      cartonCount,
      perPieceCost,
      piecesPerCarton: parsedPiecesPerCarton,
      costPerCarton,
      profitMargin: parsedProfitMargin,
      sellingPricePerCarton,
      rows: JSON.parse(JSON.stringify(rows)),
    };

    const updated = [newEntry, ...savedHistory.slice(0, 19)];
    setSavedHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localstorage errors
    }

    setNotification({
      type: 'success',
      message: 'চালান চেক হিসাবটি মেমোরিতে সংরক্ষণ করা হয়েছে!',
    });
  };

  // Load calculation from history
  const handleLoadFromHistory = (entry: SavedCalculation) => {
    setProductSearch(entry.productName);
    setSelectedProductId(entry.productId || '');
    setPiecesPerCarton(entry.piecesPerCarton);
    setProfitMargin(entry.profitMargin);
    setRows(JSON.parse(JSON.stringify(entry.rows)));
    setShowHistory(false);
    setNotification({
      type: 'info',
      message: `সংরক্ষিত হিসাব "${entry.productName}" লোড করা হয়েছে।`,
    });
  };

  // Delete an entry from history
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedHistory.filter((h) => h.id !== id);
    setSavedHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Trigger print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-500/20">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-bengali">
                চালান চেক (Invoice/Batch Check)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold font-bengali">
                ক্রয়মূল্য ও কার্টন দর ক্যালকুলেটর
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-bengali mt-0.5">
              একাধিক চালান বা ব্যাচ একত্র করে ব্লেন্ডেড গড় ক্রয়মূল্য এবং মার্জিনসহ চূড়ান্ত বিক্রয় মূল্য নির্ধারণ
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {savedHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs font-bengali"
            >
              <History className="h-4 w-4 text-indigo-600" />
              <span>পূর্বের হিসাব ({toBengaliDigits(savedHistory.length)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLoadDemo}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs font-bengali"
          >
            <span>উদাহরণ লোড</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-xs font-bengali"
          >
            <RotateCcw className="h-4 w-4" />
            <span>পরিষ্কার</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs font-bengali"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>প্রিন্ট</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`rounded-xl p-4 border flex items-start justify-between gap-3 text-xs sm:text-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2 font-bengali">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* History Drawer Modal / Dropdown */}
      {showHistory && savedHistory.length > 0 && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm space-y-3 font-bengali">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              <span>সংরক্ষিত পূর্বের চালান চেক তালিকা (Recent Saved Calculations)</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              বন্ধ করুন
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
            {savedHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => handleLoadFromHistory(item)}
                className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-3 hover:border-indigo-400 hover:shadow-xs transition-all text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-slate-900 truncate pr-6">{item.productName}</div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                    className="text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-1 text-slate-500 text-[11px]">
                  মোট পিছ: <strong>{toBengaliDigits(item.grandTotalPieces)}</strong> • কার্টুন:{' '}
                  <strong>{formatCartonNumber(item.cartonCount)}</strong>
                </div>
                <div className="mt-1 text-emerald-700 font-bold font-mono">
                  বিক্রয় দর: {currency} {toBengaliDigits(item.sellingPricePerCarton.toFixed(2))}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  {new Date(item.date).toLocaleString('bn-BD')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. PRODUCT NAME & 10. TOP SUMMARY DISPLAY CARD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* 1. নাম (Product Name) Search / Input */}
          <div ref={searchContainerRef} className="relative flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 font-bengali">
              ১. পণ্যের নাম (Product Name)
            </label>
            <div className="relative">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setSelectedProductId('');
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="পণ্যের নাম লিখুন বা পণ্য ও মূল্য থেকে সার্চ করে সিলেক্ট করুন..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              />
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setSelectedProductId('');
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showProductDropdown && matchingProducts.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-semibold text-slate-500 flex justify-between items-center font-bengali">
                  <span>পণ্য ও মূল্যের তালিকা থেকে বেছে নিন:</span>
                  <span className="text-[10px] text-slate-400">ক্লিক করুন</span>
                </div>
                {matchingProducts.map((p) => {
                  const ratio = Number(p.piecesPerCarton) || Number(p.cartonQty) || 24;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectProduct(p);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-indigo-50/80 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {p.code}
                        </span>
                        <div className="text-[11px] text-slate-500 font-bengali mt-0.5">
                          ১ কার্টুন = {toBengaliDigits(ratio)} পিস • বর্তমান কার্টন রেট: {currency}{toBengaliDigits(p.salePrice)}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 shrink-0 font-bengali">
                        নির্বাচন
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {matchedProduct && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-emerald-700 font-bengali">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>
                  পণ্য চিহ্নিত: <strong>{matchedProduct.name}</strong> [{matchedProduct.code}] — বর্তমান কার্টন দর: {currency}{toBengaliDigits(matchedProduct.salePrice)}
                </span>
              </div>
            )}
          </div>

          {/* 10. TOP SUMMARY DISPLAY (Prominently displayed right next to the name field) */}
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50/60 p-3.5 shadow-2xs shrink-0 flex items-center justify-between sm:justify-end gap-6 font-bengali">
            <div>
              <div className="text-[11px] text-indigo-800 font-semibold uppercase tracking-wider">
                সারসংক্ষেপ (Top Summary)
              </div>
              <div className="text-base sm:text-lg font-black text-indigo-950 flex items-center gap-3 mt-0.5">
                <span>
                  মোট পিছ:{' '}
                  <strong className="font-mono text-indigo-700">
                    {toBengaliDigits(grandTotalPieces)}
                  </strong>{' '}
                  <span className="text-xs text-slate-500 font-mono">({grandTotalPieces})</span>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  কার্টুন:{' '}
                  <strong className="font-mono text-indigo-700">
                    {formatCartonNumber(cartonCount)}
                  </strong>{' '}
                  <span className="text-xs text-slate-500 font-mono">({formatCartonNumberEn(cartonCount)})</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BATCH ENTRY TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 font-bengali">
              <Boxes className="h-5 w-5 text-indigo-600" />
              <span>২. ব্যাচ / চালান তালিকা (Batch Entry Table)</span>
            </h2>
            <p className="text-xs text-slate-500 font-bengali mt-0.5">
              প্রতিটি চালানের ক্রয়মূল্য, মোট পিস, ফ্রি এবং আনডেলিভারি সংখ্যা পূরণ করুন (ডিফল্ট ৩টি সারি)
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-colors shadow-2xs font-bengali"
          >
            <Plus className="h-4 w-4" />
            <span>+ আরেকটি সারি যোগ করুন</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 text-xs font-bold font-bengali">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-3 min-w-[130px]">চালান / ব্যাচ নাম</th>
                <th className="py-3 px-3 min-w-[170px] text-right">
                  ক্রয় মূল্য (Purchase Price ৳)
                </th>
                <th className="py-3 px-3 min-w-[150px] text-right">
                  মোট পিস (Quantity Purchased)
                </th>
                <th className="py-3 px-3 min-w-[140px] text-right">
                  ফ্রি (Free Pieces)
                </th>
                <th className="py-3 px-3 min-w-[160px] text-right">
                  আনডেলিভারি (Undelivered)
                </th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-xs font-mono font-bold text-slate-400">
                      {toBengaliDigits(idx + 1)}
                    </td>

                    {/* Batch Name / Note */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleRowChange(row.id, 'name', e.target.value)}
                        placeholder={`চালান ${idx + 1}`}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* ক্রয় মূল্য (Purchase Price) */}
                    <td className="py-2.5 px-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono font-bold">
                          {currency}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.purchasePrice}
                          onChange={(e) => handleRowChange(row.id, 'purchasePrice', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-right rounded-lg border border-slate-300 bg-white pl-6 pr-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* মোট পিস (Quantity Purchased) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.totalPieces}
                        onChange={(e) => handleRowChange(row.id, 'totalPieces', e.target.value)}
                        placeholder="0"
                        className="w-full text-right rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-indigo-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* ফ্রি (Free Pieces) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.freePieces}
                        onChange={(e) => handleRowChange(row.id, 'freePieces', e.target.value)}
                        placeholder="0"
                        className="w-full text-right rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-emerald-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </td>

                    {/* আনডেলিভারি (Undelivered Pieces) */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.undeliveredPieces}
                        onChange={(e) => handleRowChange(row.id, 'undeliveredPieces', e.target.value)}
                        placeholder="0"
                        className="w-full text-right rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-rose-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                      />
                    </td>

                    {/* Delete action */}
                    <td className="py-2.5 px-2 text-center">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          title="সারিটি মুছুন"
                          className="p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* 3. COLUMN TOTALS (যোগফল) ROW */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-extrabold text-slate-900 text-xs sm:text-sm font-bengali">
                <td colSpan={2} className="py-3 px-4 text-left">
                  ৩. যোগফল (Column Totals)
                </td>
                {/* মোট ক্রয় মূল্য */}
                <td className="py-3 px-3 text-right font-mono font-black text-slate-950 bg-slate-200/70">
                  {currency}{' '}
                  {columnTotals.sumPurchasePrice > 0
                    ? toBengaliDigits(columnTotals.sumPurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                    : '০.০০'}
                </td>
                {/* মোট পিস */}
                <td className="py-3 px-3 text-right font-mono font-black text-indigo-950 bg-indigo-50/60">
                  {toBengaliDigits(columnTotals.sumTotalPieces)}
                </td>
                {/* মোট ফ্রি */}
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/60">
                  {toBengaliDigits(columnTotals.sumFreePieces)}
                </td>
                {/* মোট আনডেলিভারি */}
                <td className="py-3 px-3 text-right font-mono font-black text-rose-950 bg-rose-50/60">
                  {toBengaliDigits(columnTotals.sumUndelivered)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4 to 9: COST & SELLING PRICE CALCULATOR PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-bengali">
        {/* Left Calculation Flow & Parameter Inputs (7 cols on lg) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-600" />
              <span>হিসাব ও ফর্মুলা ধাপসমূহ (Calculation Steps)</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">লাইভ ক্যালকুলেশন</span>
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm">
            {/* 4. মোট (GRAND TOTAL PIECES RECEIVED) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block">
                  ৪. মোট প্রাপ্ত পিস (Grand Total Pieces Received)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  মোট পিস ({columnTotals.sumTotalPieces}) + মোট ফ্রি ({columnTotals.sumFreePieces}) − মোট আনডেলিভারি ({columnTotals.sumUndelivered})
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-indigo-950 font-mono">
                  {toBengaliDigits(grandTotalPieces)}{' '}
                  <span className="text-xs font-semibold text-slate-600">পিস</span>
                </span>
              </div>
            </div>

            {/* 5. পিছ মূল্য (PER PIECE COST) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 block">
                  ৫. পিছ মূল্য (Per Piece Cost)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  মোট ক্রয় মূল্য ({columnTotals.sumPurchasePrice.toFixed(2)}) ÷ মোট প্রাপ্ত পিস ({grandTotalPieces})
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-950 font-mono">
                  {currency}{' '}
                  {perPieceCost > 0
                    ? toBengaliDigits(perPieceCost.toFixed(3).replace(/\.?0+$/, ''))
                    : '০.০০'}
                </span>
              </div>
            </div>

            {/* 6. কত পিছে কার্টুন & 7. প্রতি কার্টুন ক্রয় */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 6. কত পিছে কার্টুন (PIECES PER CARTON) */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-indigo-950">
                  ৬. কত পিছে কার্টুন (Pieces Per Carton)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={piecesPerCarton}
                    onChange={(e) => setPiecesPerCarton(e.target.value)}
                    placeholder="24"
                    className="w-full text-right rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-mono font-bold text-indigo-950 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  ম্যানুয়াল ইনপুট (যেমন: ২৪ পিস = ১ কার্টুন)
                </p>
              </div>

              {/* 7. প্রতি কার্টুন ক্রয় (PURCHASE COST PER CARTON) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">
                    ৭. প্রতি কার্টুন ক্রয় (Purchase Cost / Carton)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    পিছ মূল্য × কত পিছে কার্টুন ({parsedPiecesPerCarton})
                  </span>
                </div>
                <div className="text-right mt-2">
                  <span className="text-base sm:text-lg font-black text-slate-950 font-mono">
                    {currency}{' '}
                    {costPerCarton > 0
                      ? toBengaliDigits(costPerCarton.toFixed(2))
                      : '০.০০'}
                  </span>
                </div>
              </div>
            </div>

            {/* 8. প্রফিট মার্জিন (%) & 9. বিক্রয় মূল্য */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 8. প্রফিট মার্জিন (%) */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-emerald-950">
                  ৮. প্রফিট মার্জিন (%) (Profit Margin)
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-2 text-xs font-mono font-bold text-emerald-700">
                    %
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(e.target.value)}
                    placeholder="6"
                    className="w-full text-right rounded-lg border border-emerald-300 bg-white pl-3 pr-7 py-2 text-sm font-mono font-bold text-emerald-950 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  ডিফল্ট ৬% (প্রয়োজনে পরিবর্তনযোগ্য)
                </p>
              </div>

              {/* 9. বিক্রয় মূল্য (FINAL SELLING PRICE PER CARTON) */}
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="font-extrabold text-emerald-950 block text-xs">
                    ৯. বিক্রয় মূল্য (Selling Price / Carton)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono">
                    প্রতি কার্টুন ক্রয় × (১ + {parsedProfitMargin}% ÷ ১০০)
                  </span>
                </div>
                <div className="text-right mt-2">
                  <span className="text-lg sm:text-xl font-black text-emerald-950 font-mono">
                    {currency}{' '}
                    {sellingPricePerCarton > 0
                      ? toBengaliDigits(sellingPricePerCarton.toFixed(2))
                      : '০.০০'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Final Summary & Product Apply Panel (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Highlight KPI Card */}
          <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 text-white p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-700/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                চূড়ান্ত বিক্রয় মূল্য বিবরণী
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-700/80 text-[10px] font-mono">
                FINAL RATE
              </span>
            </div>

            {/* Selling Price / Carton Display */}
            <div>
              <div className="text-xs text-indigo-200">
                প্রতি কার্টুন বিক্রয় মূল্য (Carton Rate)
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
                {currency}{' '}
                {sellingPricePerCarton > 0
                  ? toBengaliDigits(sellingPricePerCarton.toFixed(2))
                  : '০.০০'}
              </div>
              <div className="text-xs text-indigo-300 font-mono mt-1">
                (Exact: {currency}{sellingPricePerCarton > 0 ? sellingPricePerCarton.toFixed(3) : '0.00'})
              </div>
            </div>

            {/* Grid of Key Sub-Metrics */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-indigo-700/60 text-xs">
              <div className="bg-indigo-950/50 rounded-xl p-2.5 border border-indigo-700/40">
                <span className="text-indigo-300 block text-[10px]">পিস প্রতি বিক্রয় দর</span>
                <span className="text-sm font-bold font-mono text-emerald-300">
                  {currency}{' '}
                  {sellingPricePerPiece > 0
                    ? toBengaliDigits(sellingPricePerPiece.toFixed(2))
                    : '০.০০'}
                </span>
              </div>
              <div className="bg-indigo-950/50 rounded-xl p-2.5 border border-indigo-700/40">
                <span className="text-indigo-300 block text-[10px]">প্রতি কার্টুন ক্রয় দর</span>
                <span className="text-sm font-bold font-mono text-white">
                  {currency}{' '}
                  {costPerCarton > 0
                    ? toBengaliDigits(costPerCarton.toFixed(2))
                    : '০.০০'}
                </span>
              </div>
              <div className="bg-indigo-950/50 rounded-xl p-2.5 border border-indigo-700/40">
                <span className="text-indigo-300 block text-[10px]">মোট প্রাপ্ত পিস</span>
                <span className="text-sm font-bold font-mono text-white">
                  {toBengaliDigits(grandTotalPieces)} পিস
                </span>
              </div>
              <div className="bg-indigo-950/50 rounded-xl p-2.5 border border-indigo-700/40">
                <span className="text-indigo-300 block text-[10px]">মোট কার্টুন সমতুল্য</span>
                <span className="text-sm font-bold font-mono text-white">
                  {formatCartonNumber(cartonCount)} কা.
                </span>
              </div>
            </div>

            {/* OPTIONAL — APPLY TO PRODUCT BUTTON */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleApplyToProduct}
                disabled={sellingPricePerCarton <= 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Tag className="h-4 w-4" />
                <span>এই দামে পণ্যের মূল্য আপডেট করুন</span>
              </button>
              <p className="text-[11px] text-indigo-300 text-center mt-2">
                ক্লিক করলে &quot;পণ্য ও মূল্য&quot; তালিকার নির্বাচিত পণ্যে এই নতুন কার্টন রেট সেট হবে।
              </p>
            </div>
          </div>

          {/* Scratchpad Note & Save Calculation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                স্ক্র্যাচপ্যাড / মেমো সংরক্ষণ
              </span>
              <button
                type="button"
                onClick={handleSaveToHistory}
                disabled={grandTotalPieces <= 0 && columnTotals.sumPurchasePrice <= 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5 text-indigo-600" />
                <span>হিসাব সেভ করুন</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              চালান আসার সাথে সাথে একাধিক লটের কেনা দাম সমন্বয় করতে এই টুলটি একটি ফ্রি স্ক্র্যাচপ্যাড হিসেবে ব্যবহার করুন।
            </p>
          </div>
        </div>
      </div>

      {/* Hidden Print Worksheet (Active during window.print()) */}
      <div className="hidden print:block font-bengali text-black p-6 space-y-4">
        <div className="text-center border-b pb-3">
          <h1 className="text-2xl font-bold">{db.settings.businessName || 'MM TRADERS'}</h1>
          <p className="text-xs">{db.settings.address || 'Proprietor: Mohammad Mamun'}</p>
          <h2 className="text-base font-bold mt-2 underline">চালান চেক ও বিক্রয়মূল্য নির্ধারণ ওয়ার্কশিট</h2>
          <p className="text-xs text-slate-600">তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
        </div>

        <div className="border p-3 rounded text-xs space-y-1">
          <div><strong>পণ্যের নাম:</strong> {productSearch || 'নাম উল্লেখ নেই'}</div>
          <div><strong>কত পিছে কার্টুন:</strong> {toBengaliDigits(parsedPiecesPerCarton)} পিস</div>
          <div><strong>প্রফিট মার্জিন:</strong> {toBengaliDigits(parsedProfitMargin)}%</div>
          <div><strong>মোট প্রাপ্ত পিস:</strong> {toBengaliDigits(grandTotalPieces)} পিস ({formatCartonNumber(cartonCount)} কার্টুন)</div>
          <div><strong>পিছ মূল্য (ক্রয়):</strong> {currency} {toBengaliDigits(perPieceCost.toFixed(3))}</div>
          <div><strong>প্রতি কার্টুন ক্রয় দর:</strong> {currency} {toBengaliDigits(costPerCarton.toFixed(2))}</div>
          <div className="text-sm font-bold mt-2">
            চূড়ান্ত বিক্রয় মূল্য (প্রতি কার্টুন): {currency} {toBengaliDigits(sellingPricePerCarton.toFixed(2))} (পিস প্রতি: {currency} {toBengaliDigits(sellingPricePerPiece.toFixed(2))})
          </div>
        </div>

        <table className="w-full text-xs border border-collapse mt-4">
          <thead>
            <tr className="border bg-slate-100">
              <th className="border p-2 text-center">#</th>
              <th className="border p-2">চালান বিবরণ</th>
              <th className="border p-2 text-right">ক্রয় মূল্য ({currency})</th>
              <th className="border p-2 text-right">মোট পিস</th>
              <th className="border p-2 text-right">ফ্রি</th>
              <th className="border p-2 text-right">আনডেলিভারি</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="border p-2 text-center">{toBengaliDigits(i + 1)}</td>
                <td className="border p-2">{r.name}</td>
                <td className="border p-2 text-right">{toBengaliDigits(r.purchasePrice || '০')}</td>
                <td className="border p-2 text-right">{toBengaliDigits(r.totalPieces || '০')}</td>
                <td className="border p-2 text-right">{toBengaliDigits(r.freePieces || '০')}</td>
                <td className="border p-2 text-right">{toBengaliDigits(r.undeliveredPieces || '০')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border font-bold bg-slate-100">
              <td colSpan={2} className="border p-2 text-center">যোগফল</td>
              <td className="border p-2 text-right">{currency} {toBengaliDigits(columnTotals.sumPurchasePrice.toFixed(2))}</td>
              <td className="border p-2 text-right">{toBengaliDigits(columnTotals.sumTotalPieces)}</td>
              <td className="border p-2 text-right">{toBengaliDigits(columnTotals.sumFreePieces)}</td>
              <td className="border p-2 text-right">{toBengaliDigits(columnTotals.sumUndelivered)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
