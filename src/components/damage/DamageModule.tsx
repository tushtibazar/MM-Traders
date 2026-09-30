import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  Calendar,
  Search,
  Filter,
  Package,
  Layers,
  FileText,
  MapPin,
  User,
  ArrowRight,
  TrendingDown,
  Printer,
  Boxes,
  Eye,
  ImageDown,
  FileDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DailyAccountSheet, DailyAccountItem } from '../../types';
import { DamagePrintPreviewModal } from './DamagePrintPreviewModal';

interface DamageModuleProps {
  onOpenDailySheet?: (sheetId: string) => void;
  onNavigateToDailySales?: () => void;
}

interface FlattenedDamageItem {
  sheetId: string;
  sheetNo: string;
  date: string;
  route: string;
  srName: string;
  notes?: string;
  item: DailyAccountItem;
}

export const DamageModule: React.FC<DamageModuleProps> = ({
  onOpenDailySheet,
  onNavigateToDailySales,
}) => {
  const { db, todayDateStr } = useApp();
  const currency = db.settings.currency || '৳';

  // Filters
  const currentMonthStr = todayDateStr.slice(0, 7); // "YYYY-MM"
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedRoute, setSelectedRoute] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Print & Export Modal State
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

  // Extract all damage records across all daily sheets
  const allDamageItems = useMemo<FlattenedDamageItem[]>(() => {
    const list: FlattenedDamageItem[] = [];
    (db.dailySheets || []).forEach((sheet: DailyAccountSheet) => {
      // Check sheet.damageItems
      if (Array.isArray(sheet.damageItems) && sheet.damageItems.length > 0) {
        sheet.damageItems.forEach((it: DailyAccountItem) => {
          const qty = Number(it.damageQty) || Number(it.issuedQty) || 0;
          const val = Number(it.damageValue) || 0;
          if (qty > 0 || val > 0 || (it.productName && it.productName.trim() !== '')) {
            list.push({
              sheetId: sheet.id,
              sheetNo: sheet.sheetNo || sheet.id,
              date: sheet.date,
              route: sheet.routeOrVan || 'রুট উল্লেখ নেই',
              srName: sheet.srName || 'এসআর উল্লেখ নেই',
              notes: sheet.notes,
              item: it,
            });
          }
        });
      }
    });

    // Sort newest date first
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [db.dailySheets]);

  // Unique routes for filter
  const availableRoutes = useMemo(() => {
    const set = new Set<string>();
    allDamageItems.forEach((item) => {
      if (item.route && item.route !== 'রুট উল্লেখ নেই') {
        set.add(item.route);
      }
    });
    return Array.from(set).sort();
  }, [allDamageItems]);

  // Unique months for filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    allDamageItems.forEach((item) => {
      if (item.date && item.date.length >= 7) {
        set.add(item.date.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [allDamageItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allDamageItems.filter((record) => {
      // Month filter
      if (selectedMonth !== 'all' && !record.date.startsWith(selectedMonth)) {
        return false;
      }
      // Route filter
      if (selectedRoute !== 'all' && record.route !== selectedRoute) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProduct = record.item.productName.toLowerCase().includes(q);
        const matchSheet = record.sheetNo.toLowerCase().includes(q);
        const matchSr = record.srName.toLowerCase().includes(q);
        const matchRoute = record.route.toLowerCase().includes(q);
        if (!matchProduct && !matchSheet && !matchSr && !matchRoute) {
          return false;
        }
      }
      return true;
    });
  }, [allDamageItems, selectedMonth, selectedRoute, searchQuery]);

  // Metrics
  const totalAllTimeValue = useMemo(() => {
    return allDamageItems.reduce(
      (sum, r) => sum + (Number(r.item.damageValue) || 0),
      0
    );
  }, [allDamageItems]);

  const totalAllTimePieces = useMemo(() => {
    return allDamageItems.reduce(
      (sum, r) => sum + (Number(r.item.damageQty) || Number(r.item.issuedQty) || 0),
      0
    );
  }, [allDamageItems]);

  const thisMonthValue = useMemo(() => {
    return allDamageItems
      .filter((r) => r.date.startsWith(currentMonthStr))
      .reduce((sum, r) => sum + (Number(r.item.damageValue) || 0), 0);
  }, [allDamageItems, currentMonthStr]);

  const filteredTotalValue = useMemo(() => {
    return filteredItems.reduce(
      (sum, r) => sum + (Number(r.item.damageValue) || 0),
      0
    );
  }, [filteredItems]);

  const filteredTotalPieces = useMemo(() => {
    return filteredItems.reduce(
      (sum, r) => sum + (Number(r.item.damageQty) || Number(r.item.issuedQty) || 0),
      0
    );
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">ড্যামেজ হিসাব (Damage Account)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ডেইলি হিসাব খাতা থেকে মার্কেট ড্যামেজ ও নষ্ট মালের স্বয়ংক্রিয় হিসাব
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenPrintPreview(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100 hover:border-sky-400 transition shadow-xs cursor-pointer"
            title="ড্যামেজ হিসাব প্রিন্ট প্রিভিউ দেখুন"
          >
            <Eye className="h-4 w-4 text-sky-600" />
            <span>প্রিন্ট প্রিভিউ</span>
          </button>

          {onNavigateToDailySales && (
            <button
              onClick={onNavigateToDailySales}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            >
              <span>ডেইলি হিসাব</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Damage Value */}
        <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-xs hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              সর্বমোট ড্যামেজ মূল্য
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {currency} {totalAllTimeValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">সব রেকর্ডকৃত দৈনিক খাতার যোগফল</p>
        </div>

        {/* Total Pieces */}
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              মোট নষ্ট / ফেরত পিস
            </span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalAllTimePieces.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-500">পিস</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">ক্ষতিগ্রস্ত বা ফেরত পণ্যের মোট সংখ্যা</p>
        </div>

        {/* This Month Damage */}
        <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
              চলতি মাসের ড্যামেজ
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {currency} {thisMonthValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">চলতি মাসের ({currentMonthStr}) ক্ষতি</p>
        </div>

        {/* Record count */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              মোট রেকর্ড সংখ্যা
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {allDamageItems.length}{' '}
            <span className="text-xs font-normal text-slate-500">টি আইটেম</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">বিভিন্ন দৈনিক খাতার ড্যামেজ এন্ট্রি</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="পণ্যের নাম, শীট নং, রুট বা এসআর দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="all">সকল মাস</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m === currentMonthStr ? `${m} (চলতি মাস)` : m}
                  </option>
                ))}
              </select>
            </div>

            {/* Route Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold focus:outline-hidden cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">সকল রুট</option>
                {availableRoutes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filter Button if active */}
            {(selectedMonth !== 'all' || selectedRoute !== 'all' || searchQuery.trim() !== '') && (
              <button
                onClick={() => {
                  setSelectedMonth('all');
                  setSelectedRoute('all');
                  setSearchQuery('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 underline"
              >
                ফিল্টার মুছুন
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Banner */}
        <div className="flex items-center justify-between bg-rose-50/60 border border-rose-100 rounded-lg px-3.5 py-2 text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-rose-600" />
            <span>
              ফিল্টারকৃত রেকর্ড:{' '}
              <strong className="font-bold">{filteredItems.length} টি পণ্য</strong>
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>
              পিস:{' '}
              <strong className="font-bold text-slate-900">
                {filteredTotalPieces.toLocaleString()}
              </strong>
            </span>
            <span>
              মোট টাকা:{' '}
              <strong className="font-bold text-rose-700">
                {currency} {filteredTotalValue.toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Damage Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">তারিখ ও শীট নং</th>
                <th className="py-3 px-3">রুট ও এসআর</th>
                <th className="py-3 px-3">ক্ষতিগ্রস্ত পণ্যের নাম</th>
                <th className="py-3 px-3 text-center">পরিমাণ ও ইউনিট</th>
                <th className="py-3 px-3 text-right">দর / রেট</th>
                <th className="py-3 px-3 text-right">ড্যামেজ মূল্য</th>
                <th className="py-3 px-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertOctagon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600 text-sm">
                      কোনো ড্যামেজ রেকর্ড পাওয়া যায়নি
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ডেইলি বিক্রয় খাতায় ড্যামেজ পণ্য যোগ করলে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((record, index) => {
                  const it = record.item;
                  const rawQty = it.rawDamageQty !== undefined ? it.rawDamageQty : it.damageQty;
                  const unit = it.damageUnit === 'C' ? 'কার্টন' : 'পিস';
                  const pieces = it.damageQty || it.issuedQty || 0;
                  const rate = it.sellingPrice || 0;
                  const amount = it.damageValue || pieces * rate;

                  return (
                    <tr
                      key={`${record.sheetId}-${it.id || index}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{record.date}</div>
                        <div className="text-[10px] font-mono text-indigo-600 flex items-center gap-1 mt-0.5">
                          <span>শীট: {record.sheetNo}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-slate-800">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{record.route}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{record.srName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{it.productName}</div>
                        {it.packSize && (
                          <span className="text-[10px] text-slate-400">
                            প্যাক সাইজ: {it.packSize}
                          </span>
                        )}
                        {record.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">
                            নোট: {record.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="font-semibold text-rose-700 font-mono">
                          {rawQty} {unit}
                        </div>
                        {it.damageUnit === 'C' && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            (= {pieces} পিস)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600">
                        {currency} {rate.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-rose-600 font-mono text-sm">
                          {currency} {amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {onOpenDailySheet ? (
                          <button
                            type="button"
                            onClick={() => onOpenDailySheet(record.sheetId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-colors"
                            title="ডেইলি খাতা দেখুন"
                          >
                            <span>শীট দেখুন</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right text-slate-700">
                    ফিল্টারকৃত মোট ড্যামেজ ({filteredItems.length} টি পণ্য):
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-rose-700">
                    {filteredTotalPieces.toLocaleString()} পিস
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-mono text-rose-700 text-sm">
                    {currency} {filteredTotalValue.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Damage Print Preview & Export Modal */}
      <DamagePrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={db.settings}
        currency={currency}
        damageItems={filteredItems}
        selectedMonth={selectedMonth}
        selectedRoute={selectedRoute}
        totalDamageValue={filteredTotalValue}
        totalDamageQty={filteredTotalPieces}
        initialAction={printAction}
      />
    </div>
  );
};
