import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Store, Phone, FileText, ChevronRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';

export interface DueSearchResultItem {
  customer: Customer;
  dueNo?: string;
  totalDue: number;
}

interface DueSmartSearchProps {
  placeholder?: string;
  onSelectRecord: (record: DueSearchResultItem) => void;
  disabled?: boolean;
}

export const DueSmartSearch: React.FC<DueSmartSearchProps> = ({
  placeholder = 'দোকান/কাস্টমার নাম, ফোন নম্বর বা বাকি নম্বর দিয়ে খুঁজুন...',
  onSelectRecord,
  disabled = false,
}) => {
  const { db } = useApp();
  const currency = db.settings.currency || '৳';

  const [query, setQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map of customer ID to their primary or latest DUE number
  const customerDueNumbersMap = useMemo(() => {
    const map = new Map<string, string>();
    (db.customerLedgers || []).forEach((l) => {
      if (l.referenceId && l.referenceId.startsWith('DUE-') && l.debit > 0) {
        if (!map.has(l.customerId)) {
          map.set(l.customerId, l.referenceId);
        }
      }
    });
    return map;
  }, [db.customerLedgers]);

  // Search filtered results
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches: DueSearchResultItem[] = [];
    const seenCustomerIds = new Set<string>();

    // 1. Check all customers with active status
    (db.customers || []).forEach((c) => {
      if (c.status === 'inactive') return;

      const associatedDue = customerDueNumbersMap.get(c.id) || '';
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const shopMatch = (c.shopName || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q);
      const dueNoMatch = associatedDue.toLowerCase().includes(q);

      // Check ledger entries for any matching DUE- number for this customer
      const ledgerDueMatch = (db.customerLedgers || []).some(
        (l) => l.customerId === c.id && l.referenceId?.toLowerCase().includes(q)
      );

      if (nameMatch || shopMatch || phoneMatch || dueNoMatch || ledgerDueMatch) {
        matches.push({
          customer: c,
          dueNo: associatedDue || undefined,
          totalDue: c.currentDue || 0,
        });
        seenCustomerIds.add(c.id);
      }
    });

    // Sort: Customers with outstanding due (> 0) first, then alphabetical
    return matches.sort((a, b) => {
      if (a.totalDue > 0 && b.totalDue <= 0) return -1;
      if (a.totalDue <= 0 && b.totalDue > 0) return 1;
      return b.totalDue - a.totalDue;
    }).slice(0, 12);
  }, [query, db.customers, customerDueNumbersMap, db.customerLedgers]);

  const handleSelect = (item: DueSearchResultItem) => {
    onSelectRecord(item);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-700 pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-emerald-300 bg-emerald-50/40 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-2xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span>কাস্টমার ও বাকি রেকর্ড</span>
            <span>{searchResults.length} টি পাওয়া গেছে</span>
          </div>

          {searchResults.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {searchResults.map((item) => {
                const { customer, dueNo, totalDue } = item;
                const hasDue = totalDue > 0;

                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full text-left p-2.5 hover:bg-emerald-50/80 rounded-lg transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs truncate">
                        <Store className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{customer.shopName}</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          ({customer.name})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span className="font-mono">{customer.phone}</span>
                        </span>

                        {dueNo && (
                          <span className="inline-flex items-center gap-1 font-mono rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                            <FileText className="h-2.5 w-2.5 text-slate-500" />
                            {dueNo}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span className={`text-xs font-bold font-mono block ${hasDue ? 'text-rose-700' : 'text-slate-500'}`}>
                          {currency} {totalDue.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {hasDue ? 'মোট বাকি' : 'বকেয়া নেই'}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">
              "{query}" দিয়ে কোনো দোকান, ফোন নম্বর বা বাকি রেকর্ড পাওয়া যায়নি
            </div>
          )}
        </div>
      )}
    </div>
  );
};
