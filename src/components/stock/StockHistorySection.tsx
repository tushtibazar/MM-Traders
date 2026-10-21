import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  History,
  Calendar,
  Search,
  Filter,
  X,
  RotateCcw,
  Package,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, StockTransaction, User } from '../../types';
import { toBengaliDigits, formatDate } from '../../utils/dateUtils';

export type TxFilterCategory =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'return'
  | 'damage'
  | 'adjustment';

export interface TxCategoryMeta {
  key: TxFilterCategory;
  labelBn: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
  sign: string;
}

export const TX_CATEGORIES: Record<TxFilterCategory, TxCategoryMeta> = {
  opening: {
    key: 'opening',
    labelBn: 'Opening Stock (প্রারম্ভিক স্টক)',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    dotBg: 'bg-purple-500',
    sign: '•',
  },
  purchase: {
    key: 'purchase',
    labelBn: 'Stock Added (নতুন মাল যোগ)',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    dotBg: 'bg-emerald-500',
    sign: '+',
  },
  sale: {
    key: 'sale',
    labelBn: 'Daily Outgoing (বের হয়েছে)',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    dotBg: 'bg-blue-500',
    sign: '-',
  },
  return: {
    key: 'return',
    labelBn: 'Return (ফেরত)',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    dotBg: 'bg-amber-500',
    sign: '+',
  },
  damage: {
    key: 'damage',
    labelBn: 'Damage (ড্যামেজ)',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200',
    dotBg: 'bg-rose-500',
    sign: '-',
  },
  adjustment: {
    key: 'adjustment',
    labelBn: 'Stock Adjustment (সমন্বয়)',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    dotBg: 'bg-slate-500',
    sign: '±',
  },
};

export const classifyTxCategory = (tx: StockTransaction): TxFilterCategory => {
  const note = (tx.note || '').toLowerCase();
  const type = (tx.type || '').toLowerCase();

  // 1. Opening stock
  if (type === 'opening' || note.includes('opening') || note.includes('প্রারম্ভিক') || note.includes('শুরুর স্টক')) {
    return 'opening';
  }
  // 2. Stock added (নতুন মাল / ক্রয় / চালান)
  if (
    type === 'purchase' ||
    type === 'in' ||
    note.includes('নতুন চালান') ||
    note.includes('নতুন স্টক') ||
    note.includes('ক্রয়') ||
    note.includes('চালান প্রাপ্তি')
  ) {
    return 'purchase';
  }
  // 3. Return (ফেরত)
  if (type === 'return' || type === 'void_reversal' || note.includes('ফেরত')) {
    return 'return';
  }
  // 4. Damage (ড্যামেজ / নষ্ট)
  if (type === 'damage' || note.includes('ড্যামেজ') || note.includes('নষ্ট') || note.includes('ক্ষতিপূরণ')) {
    return 'damage';
  }
  // 5. Daily Outgoing (বের হয়েছে / বিক্রি / ইস্যু)
  if (
    type === 'sale' ||
    type === 'out' ||
    (tx.quantity < 0 && (note.includes('daily হিসাব') || note.includes('বিক্রয়') || note.includes('বের হয়েছে') || note.includes('ইস্যু')))
  ) {
    return 'sale';
  }
  // 6. Stock adjustment (সমন্বয়)
  return 'adjustment';
};

export const formatTxTime = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${toBengaliDigits(hours)}:${toBengaliDigits(minutes)} ${ampm}`;
  } catch {
    return '';
  }
};

const formatQtyWithUnit = (quantity: number, product?: Product) => {
  const isPos = quantity > 0;
  const absQty = Math.abs(quantity);
  const sign = isPos ? '+' : '-';

  if (!product) {
    return `${sign} ${toBengaliDigits(absQty)}`;
  }

  const pRatio = Number(product.piecesPerCarton || product.cartonQty);
  const ratio = !isNaN(pRatio) && isFinite(pRatio) && pRatio > 0 ? pRatio : 1;
  const isCarton = product.unit === 'কার্টন' || product.unit === 'কার্টুন' || ratio > 1;

  if (isCarton && ratio > 1) {
    const totalPieces = Math.round(absQty * ratio);
    const cartons = Math.floor(totalPieces / ratio);
    const remPieces = totalPieces % ratio;

    if (cartons > 0 && remPieces > 0) {
      return `${sign} ${toBengaliDigits(cartons)} কার্টুন ${toBengaliDigits(remPieces)} পিস`;
    } else if (cartons > 0) {
      return `${sign} ${toBengaliDigits(cartons)} কার্টুন`;
    } else {
      return `${sign} ${toBengaliDigits(remPieces)} পিস`;
    }
  }

  const rounded = Math.round(absQty * 100) / 100;
  const unit = product.unit ? ` ${product.unit}` : '';
  return `${sign} ${toBengaliDigits(rounded)}${unit}`;
};

const formatStockValueWithUnit = (stockVal?: number, product?: Product) => {
  if (stockVal === undefined || stockVal === null || isNaN(stockVal)) return '-';
  if (stockVal === 0) return '০';

  if (!product) {
    return toBengaliDigits(Math.round(stockVal * 100) / 100);
  }

  const pRatio = Number(product.piecesPerCarton || product.cartonQty);
  const ratio = !isNaN(pRatio) && isFinite(pRatio) && pRatio > 0 ? pRatio : 1;
  const isCarton = product.unit === 'কার্টন' || product.unit === 'কার্টুন' || ratio > 1;

  if (isCarton && ratio > 1) {
    const totalPieces = Math.round(stockVal * ratio);
    if (totalPieces <= 0) return '০';
    const cartons = Math.floor(totalPieces / ratio);
    const remPieces = totalPieces % ratio;

    if (cartons > 0 && remPieces > 0) {
      return `${toBengaliDigits(cartons)} কার্টুন ${toBengaliDigits(remPieces)} পিস`;
    } else if (cartons > 0) {
      return `${toBengaliDigits(cartons)} কার্টুন`;
    } else {
      return `${toBengaliDigits(remPieces)} পিস`;
    }
  }

  const rounded = Math.round(stockVal * 100) / 100;
  const unit = product.unit ? ` ${product.unit}` : '';
  return `${toBengaliDigits(rounded)}${unit}`;
};

interface StockHistorySectionProps {
  stockTransactions: StockTransaction[];
  products: Product[];
  users: User[];
  todayDateStr: string;
}

export const StockHistorySection: React.FC<StockHistorySectionProps> = ({
  stockTransactions,
  products,
  users,
  todayDateStr,
}) => {
  // Preset types
  type DatePresetKey =
    | 'today'
    | 'last_7_days'
    | 'this_month'
    | 'last_month'
    | 'last_3_months'
    | 'last_6_months'
    | 'this_year'
    | 'all_time'
    | 'custom';

  const getPresetRange = (preset: DatePresetKey, refDateStr: string) => {
    const parts = refDateStr.split('-').map(Number);
    const y = parts[0] || new Date().getFullYear();
    const m = (parts[1] || 1) - 1; // 0..11
    const d = parts[2] || 1;
    const refDate = new Date(y, m, d);

    const fmt = (dt: Date) => {
      const yr = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const da = String(dt.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    switch (preset) {
      case 'today':
        return { start: refDateStr, end: refDateStr };
      case 'last_7_days': {
        const s = new Date(refDate);
        s.setDate(s.getDate() - 6);
        return { start: fmt(s), end: refDateStr };
      }
      case 'this_month': {
        const s = new Date(y, m, 1);
        const e = new Date(y, m + 1, 0);
        return { start: fmt(s), end: fmt(e) };
      }
      case 'last_month': {
        const s = new Date(y, m - 1, 1);
        const e = new Date(y, m, 0);
        return { start: fmt(s), end: fmt(e) };
      }
      case 'last_3_months': {
        const s = new Date(y, m - 2, 1);
        const e = new Date(y, m + 1, 0);
        return { start: fmt(s), end: fmt(e) };
      }
      case 'last_6_months': {
        const s = new Date(y, m - 5, 1);
        const e = new Date(y, m + 1, 0);
        return { start: fmt(s), end: fmt(e) };
      }
      case 'this_year': {
        const s = new Date(y, 0, 1);
        const e = new Date(y, 11, 31);
        return { start: fmt(s), end: fmt(e) };
      }
      case 'all_time': {
        return { start: '2000-01-01', end: '2099-12-31' };
      }
      default: {
        const s = new Date(y, m, 1);
        const e = new Date(y, m + 1, 0);
        return { start: fmt(s), end: fmt(e) };
      }
    }
  };

  // 1. Date Range State (Default: 'this_month')
  const [activePreset, setActivePreset] = useState<DatePresetKey>('this_month');
  const initialRange = useMemo(() => getPresetRange('this_month', todayDateStr), [todayDateStr]);
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);

  // 2. Product Filter State (Default: all products)
  const [selectedProductId, setSelectedProductId] = useState<string>(''); // '' means all products
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState<boolean>(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // 3. Transaction Type Multi-select Chips (Default: all selected)
  const allCategoryKeys: TxFilterCategory[] = ['opening', 'purchase', 'sale', 'return', 'damage', 'adjustment'];
  const [selectedCategories, setSelectedCategories] = useState<TxFilterCategory[]>(allCategoryKeys);

  // 4. Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Close product dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preset button click handler
  const handleSelectPreset = (preset: DatePresetKey) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      const range = getPresetRange(preset, todayDateStr);
      setStartDate(range.start);
      setEndDate(range.end);
      setCurrentPage(1);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
    setCurrentPage(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
    setCurrentPage(1);
  };

  // Toggle transaction category chip
  const handleToggleCategory = (category: TxFilterCategory) => {
    setSelectedCategories((prev) => {
      let next: TxFilterCategory[];
      if (prev.includes(category)) {
        // If clicking and it's the only one, keep it or toggle all? Allow deselecting unless it's the last one
        next = prev.filter((c) => c !== category);
        if (next.length === 0) {
          next = [category]; // Keep at least one or allow empty
        }
      } else {
        next = [...prev, category];
      }
      return next;
    });
    setCurrentPage(1);
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(allCategoryKeys);
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setActivePreset('this_month');
    const range = getPresetRange('this_month', todayDateStr);
    setStartDate(range.start);
    setEndDate(range.end);
    setSelectedProductId('');
    setProductSearchQuery('');
    setSelectedCategories(allCategoryKeys);
    setCurrentPage(1);
  };

  // Products map for fast lookups
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [products]);

  // Users map for fast creator resolution
  const usersMap = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      map.set(u.id, u.name);
      if (u.username) map.set(u.username, u.name);
    });
    return map;
  }, [users]);

  // Filtered products list for dropdown
  const filteredProductsDropdown = useMemo(() => {
    if (!productSearchQuery.trim()) {
      return products.filter((p) => !p.deletedFromStock);
    }
    const q = productSearchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, productSearchQuery]);

  const selectedProductObj = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Main Filtered and Classified Stock Transactions
  const filteredTransactions = useMemo(() => {
    // 1. Date range filter
    const inRange = stockTransactions.filter((tx) => {
      const txDate = tx.date ? tx.date.slice(0, 10) : (tx.createdAt ? tx.createdAt.slice(0, 10) : '');
      if (!txDate) return false;
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });

    // 2. Product filter
    const productFiltered = selectedProductId
      ? inRange.filter((tx) => tx.productId === selectedProductId)
      : inRange;

    // 3. Category classification & filter
    const categoryFiltered = productFiltered.filter((tx) => {
      const cat = classifyTxCategory(tx);
      return selectedCategories.includes(cat);
    });

    // Sort newest first: by date descending, then createdAt descending
    return categoryFiltered.sort((a, b) => {
      const dateA = a.date || a.createdAt?.slice(0, 10) || '';
      const dateB = b.date || b.createdAt?.slice(0, 10) || '';
      const dateCmp = dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;
      const timeA = a.createdAt || '';
      const timeB = b.createdAt || '';
      return timeB.localeCompare(timeA);
    });
  }, [stockTransactions, startDate, endDate, selectedProductId, selectedCategories]);

  // Aggregated Summary Statistics
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredTransactions.forEach((tx) => {
      const qty = Number(tx.quantity) || 0;
      if (qty > 0) {
        totalIn += qty;
      } else {
        totalOut += Math.abs(qty);
      }
    });
    return {
      totalCount: filteredTransactions.length,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
    };
  }, [filteredTransactions]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    if (pageSize === 0) return filteredTransactions; // 0 means show all
    const startIdx = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(startIdx, startIdx + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Helper to resolve entry creator display name
  const resolveCreatorName = (tx: StockTransaction) => {
    if (!tx.createdBy) return 'সিস্টেম';
    if (usersMap.has(tx.createdBy)) return usersMap.get(tx.createdBy)!;
    if (tx.createdBy.toLowerCase() === 'user-owner' || tx.createdBy.toLowerCase() === 'owner') return 'মালিক';
    return tx.createdBy;
  };

  const isFilterActive =
    activePreset !== 'this_month' ||
    Boolean(selectedProductId) ||
    selectedCategories.length < allCategoryKeys.length;

  return (
    <div id="stock-history-section" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      {/* 1. Header with title and active summary count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-bengali flex items-center gap-2">
              স্টক সমন্বয় ও লেনদেন ইতিহাস (Stock History)
            </h2>
            <p className="text-xs text-slate-500">
              চালান যোগ, পণ্য ডেলিভারি, ফেরত, ড্যামেজ ও সমন্বয়ের দীর্ঘমেয়াদী স্থায়ী হিসাব
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
              title="সকল ফিল্টার মুছে ডিফল্ট করুন"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>ফিল্টার মুছুন</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
            <Boxes className="h-3.5 w-3.5 text-slate-500" />
            <span>মোট রেকর্ড: {toBengaliDigits(stats.totalCount)} টি</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Date Presets Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 font-bengali">
            <Calendar className="h-3.5 w-3.5 text-amber-600" />
            তারিখ পরিসর নির্বাচন (Date Range):
          </span>
          <span className="text-[11px] font-semibold text-slate-500 font-mono">
            {formatDate(startDate)} — {formatDate(endDate)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleSelectPreset('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            আজ
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('last_7_days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'last_7_days'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            গত ৭ দিন
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('this_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'this_month'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            এই মাস (ডিফল্ট)
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('last_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'last_month'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            গত মাস
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('last_3_months')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'last_3_months'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            গত ৩ মাস
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('last_6_months')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'last_6_months'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            গত ৬ মাস
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('this_year')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'this_year'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            এই বছর / গত ১ বছর
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset('all_time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activePreset === 'all_time'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            সব সময় (All time)
          </button>
        </div>

        {/* Custom Start & End Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
              শুরুর তারিখ <span className="text-slate-400 font-normal">(দিন/মাস/বছর)</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 font-bengali">
              শেষের তারিখ <span className="text-slate-400 font-normal">(দিন/মাস/বছর)</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Product Filter & Transaction Type Multi-select Chips */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
        {/* Product Filter: Search-as-you-type (5 cols) */}
        <div className="lg:col-span-5 space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 font-bengali flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              পণ্য অনুযায়ী ফিল্টার (Product Filter):
            </span>
            {selectedProductId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProductId('');
                  setProductSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                সব পণ্য দেখুন
              </button>
            )}
          </label>

          <div className="relative" ref={productDropdownRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="পণ্যের নাম বা কোড দিয়ে খুঁজুন..."
                value={selectedProductObj ? `${selectedProductObj.name} (${selectedProductObj.code})` : productSearchQuery}
                onFocus={() => {
                  if (selectedProductObj) {
                    setProductSearchQuery('');
                  }
                  setIsProductDropdownOpen(true);
                }}
                onChange={(e) => {
                  setSelectedProductId('');
                  setProductSearchQuery(e.target.value);
                  setIsProductDropdownOpen(true);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-xl border pl-9 pr-9 py-2 text-xs font-medium focus:outline-none focus:ring-2 shadow-2xs ${
                  selectedProductId
                    ? 'border-blue-300 bg-blue-50/40 text-blue-900 font-bold focus:ring-blue-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
              />
              {(selectedProductId || productSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId('');
                    setProductSearchQuery('');
                    setIsProductDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isProductDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductId('');
                    setProductSearchQuery('');
                    setIsProductDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    !selectedProductId ? 'bg-amber-50/70 font-bold text-amber-900' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>সব পণ্য (সকল লেনদেন)</span>
                  </div>
                  {!selectedProductId && <span className="text-[10px] text-amber-700">নির্বাচিত</span>}
                </button>

                <div className="border-t border-slate-100 my-1" />

                {filteredProductsDropdown.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-slate-400">
                    কোনো পণ্য খুঁজে পাওয়া যায়নি
                  </div>
                ) : (
                  filteredProductsDropdown.map((p) => {
                    const isSelected = p.id === selectedProductId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setProductSearchQuery('');
                          setIsProductDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.code} • বর্তমান স্টক: {p.currentStock} {p.unit}
                          </div>
                        </div>
                        {isSelected && <span className="text-[10px] text-blue-700 font-bold">নির্বাচিত</span>}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transaction Type Multi-Select Chips (7 cols) */}
        <div className="lg:col-span-7 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 font-bengali flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-amber-600" />
              লেনদেনের ধরণ (Transaction Types):
            </label>
            <button
              type="button"
              onClick={handleSelectAllCategories}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              সব ধরণ চালু করুন
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allCategoryKeys.map((catKey) => {
              const meta = TX_CATEGORIES[catKey];
              const isSelected = selectedCategories.includes(catKey);
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => handleToggleCategory(catKey)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? `${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder} shadow-2xs font-bold ring-1 ring-slate-900/10`
                      : 'bg-white text-slate-400 border-slate-200 line-through opacity-60 hover:opacity-90'
                  }`}
                  title={`${meta.labelBn} ফিল্টার টগল করুন`}
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dotBg}`} />
                  <span>{meta.labelBn}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Filter Results Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <span className="text-[11px] font-semibold text-slate-500 block">মোট এন্ট্রি সংখ্যা</span>
          <span className="text-lg font-bold text-slate-900">{toBengaliDigits(stats.totalCount)} টি</span>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
          <span className="text-[11px] font-semibold text-emerald-700 block flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            মোট স্টক যোগ (+)
          </span>
          <span className="text-lg font-bold text-emerald-800">+{toBengaliDigits(Math.round(stats.totalIn * 100) / 100)}</span>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
          <span className="text-[11px] font-semibold text-rose-700 block flex items-center gap-1">
            <ArrowDownRight className="h-3 w-3" />
            মোট স্টক বিয়োগ (-)
          </span>
          <span className="text-lg font-bold text-rose-800">-{toBengaliDigits(Math.round(stats.totalOut * 100) / 100)}</span>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
          <span className="text-[11px] font-semibold text-amber-800 block">নিট স্টক পরিবর্তন</span>
          <span
            className={`text-lg font-bold ${
              stats.netChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {stats.netChange >= 0 ? '+' : ''}
            {toBengaliDigits(Math.round(stats.netChange * 100) / 100)}
          </span>
        </div>
      </div>

      {/* 5. Complete Table with all 8 Columns */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
              <th className="py-3 px-3 w-28">তারিখ ও সময়</th>
              <th className="py-3 px-3">পণ্যের নাম</th>
              <th className="py-3 px-3 text-center">ধরন</th>
              <th className="py-3 px-3 text-center">পরিমাণ</th>
              <th className="py-3 px-3 text-center">পূর্ববর্তী স্টক</th>
              <th className="py-3 px-3 text-center">পরবর্তী স্টক</th>
              <th className="py-3 px-3">রেফারেন্স / নোট</th>
              <th className="py-3 px-3 w-28 text-slate-600">এন্ট্রি প্রদানকারী</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <History className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">
                      নির্বাচিত তারিখ পরিসর ও ফিল্টারে কোনো স্টক লেনদেন পাওয়া যায়নি।
                    </p>
                    <p className="text-xs text-slate-400">
                      অন্য তারিখ নির্বাচন করুন অথবা "ফিল্টার মুছুন" বাটনে ক্লিক করে সব দেখুন।
                    </p>
                    {isFilterActive && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>ফিল্টার মুছুন</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const prod = productsMap.get(tx.productId);
                const category = classifyTxCategory(tx);
                const meta = TX_CATEGORIES[category];
                const isPositive = tx.quantity > 0;
                const formattedTime = formatTxTime(tx.createdAt);

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 1. তারিখ ও সময় */}
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-mono font-bold text-slate-800">
                        {formatDate(tx.date || tx.createdAt)}
                      </div>
                      {formattedTime && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formattedTime}</span>
                        </div>
                      )}
                    </td>

                    {/* 2. পণ্যের নাম */}
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-bold text-slate-900">{tx.productName}</div>
                      {prod?.code && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          কোড: {prod.code}
                          {prod.category ? ` • ${prod.category}` : ''}
                        </div>
                      )}
                    </td>

                    {/* 3. ধরন */}
                    <td className="py-2.5 px-3 text-center align-top">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotBg}`} />
                        <span>{meta.labelBn}</span>
                      </span>
                    </td>

                    {/* 4. পরিমাণ (এককসহ) */}
                    <td className="py-2.5 px-3 text-center align-top whitespace-nowrap">
                      <span
                        className={`inline-block font-bold text-xs ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatQtyWithUnit(tx.quantity, prod)}
                      </span>
                    </td>

                    {/* 5. পূর্ববর্তী স্টক */}
                    <td className="py-2.5 px-3 text-center align-top text-slate-600 font-medium whitespace-nowrap">
                      {formatStockValueWithUnit(tx.previousStock, prod)}
                    </td>

                    {/* 6. পরবর্তী স্টক */}
                    <td className="py-2.5 px-3 text-center align-top font-bold text-slate-900 whitespace-nowrap">
                      {formatStockValueWithUnit(tx.newStock, prod)}
                    </td>

                    {/* 7. রেফারেন্স / নোট */}
                    <td className="py-2.5 px-3 align-top max-w-xs">
                      {tx.referenceId && (
                        <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-700 border border-blue-200 mb-0.5">
                          {tx.referenceId}
                        </span>
                      )}
                      <div className="text-slate-600 break-words">{tx.note || '-'}</div>
                    </td>

                    {/* 8. এন্ট্রি প্রদানকারী */}
                    <td className="py-2.5 px-3 align-top text-slate-600">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                        <UserCheck className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{resolveCreatorName(tx)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Pagination & Row Controls */}
      {filteredTransactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>প্রতি পৃষ্ঠায়:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value={15}>১৫ টি</option>
              <option value={25}>২৫ টি</option>
              <option value={50}>৫০ টি</option>
              <option value={100}>১০০ টি</option>
              <option value={0}>সবগুলো এক সাথে</option>
            </select>
            <span className="text-slate-400">
              (মোট {toBengaliDigits(filteredTransactions.length)} টির মধ্যে{' '}
              {pageSize > 0
                ? `${toBengaliDigits((currentPage - 1) * pageSize + 1)} - ${toBengaliDigits(
                    Math.min(currentPage * pageSize, filteredTransactions.length)
                  )}`
                : 'সবগুলো'}{' '}
              প্রদর্শিত)
            </span>
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>পূর্ববর্তী</span>
              </button>

              <span className="px-3 py-1 font-semibold text-slate-800">
                পৃষ্ঠা {toBengaliDigits(currentPage)} / {toBengaliDigits(totalPages)}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              >
                <span>পরবর্তী</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
