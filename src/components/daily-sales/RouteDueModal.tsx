import React, { useState, useMemo } from 'react';
import {
  MapPin,
  X,
  Search,
  Store,
  User,
  Phone,
  Calendar,
  ArrowRight,
  HandCoins,
  Wallet,
  AlertCircle,
} from 'lucide-react';
import { Customer, CustomerLedgerEntry } from '../../types';

interface RouteDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoute: string;
  customers: Customer[];
  ledgers: CustomerLedgerEntry[];
  currency: string;
  onSelectCustomer: (customer: Customer) => void;
}

export const RouteDueModal: React.FC<RouteDueModalProps> = ({
  isOpen,
  onClose,
  selectedRoute,
  customers,
  ledgers,
  currency,
  onSelectCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Build a map of latest transaction date per customer
  const lastTxDateMap = useMemo(() => {
    const map = new Map<string, string>();
    (ledgers || []).forEach((entry) => {
      const existing = map.get(entry.customerId);
      if (!existing || new Date(entry.date).getTime() > new Date(existing).getTime()) {
        map.set(entry.customerId, entry.date);
      }
    });
    return map;
  }, [ledgers]);

  // 2. Filter customers with search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.shopName.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const totalOutstandingOnRoute = useMemo(() => {
    return customers.reduce((sum, c) => sum + (Number(c.currentDue) || 0), 0);
  }, [customers]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center text-emerald-100 border border-white/20">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight font-bengali">
                  এই রুটের বাকি (This Route's Due)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-200 text-[11px] font-medium border border-emerald-400/30">
                  রুটভিত্তিক বকেয়া
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-bengali truncate max-w-md mt-0.5">
                রুট: <strong className="text-white">{selectedRoute}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Route Summary Banner */}
        <div className="px-5 py-3 bg-emerald-50/80 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-900">
              <Store className="h-4 w-4 text-emerald-700" />
              <span>বাকিদার দোকান: <strong className="font-bold text-sm text-emerald-950 font-mono">{customers.length}</strong> টি</span>
            </div>
            <div className="h-4 w-px bg-emerald-200" />
            <div className="flex items-center gap-1.5 text-xs text-emerald-900">
              <Wallet className="h-4 w-4 text-rose-700" />
              <span>মোট বকেয়া: <strong className="font-bold text-sm text-rose-800 font-mono">{currency} {totalOutstandingOnRoute.toLocaleString()}</strong></span>
            </div>
          </div>
          <span className="text-[11px] text-emerald-800 bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-md font-bengali">
            কাস্টমারে ক্লিক করলে সরাসরি আদায় এন্ট্রি শুরু হবে
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="দোকান বা কাস্টমারের নাম, ফোন অথবা এলাকা দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-bengali shadow-2xs"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 space-y-2">
          {filteredList.map((customer) => {
            const lastDate = lastTxDateMap.get(customer.id) || (customer.updatedAt ? customer.updatedAt.split('T')[0] : null);

            return (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="group p-3 rounded-xl border border-slate-200/90 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs"
              >
                {/* Left: Customer Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-900 transition-colors font-bengali">
                      {customer.shopName}
                    </span>
                    <span className="text-xs text-slate-500 font-bengali">
                      ({customer.name})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    {customer.phone && (
                      <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.address && (
                      <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-xs font-bengali">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        {customer.address}
                      </span>
                    )}
                    {lastDate && (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-bengali">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        সর্বশেষ লেনদেন: <strong className="font-mono text-slate-600">{lastDate}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Due Amount & Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-rose-600 font-semibold block font-bengali">
                      বর্তমান মোট বকেয়া
                    </span>
                    <span className="text-base font-bold font-mono text-rose-700 block">
                      {currency} {(Number(customer.currentDue) || 0).toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCustomer(customer);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 group-hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-2xs group-hover:shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <HandCoins className="h-3.5 w-3.5" />
                    <span>আদায় করুন</span>
                    <ArrowRight className="h-3 w-3 text-emerald-200" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 font-bengali">
                কোনো বাকিদার কাস্টমার পাওয়া যায়নি
              </h4>
              <p className="text-xs text-slate-500 font-bengali max-w-sm mx-auto">
                {searchQuery
                  ? `"${searchQuery}" এর সাথে মিলে এমন কোনো কাস্টমার নেই।`
                  : `এই রুটে (${selectedRoute}) বর্তমানে কোনো কাস্টমারের বকেয়া নেই।`}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-bengali">
            {filteredList.length} টি কাস্টমার প্রদর্শিত
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
