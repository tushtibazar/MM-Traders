import React, { useState, useRef, useEffect } from 'react';
import { Store, User, MapPin, Search } from 'lucide-react';
import { Customer } from '../../types';

interface CustomerAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  customers: Customer[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  currency?: string;
  selectedCustomer?: Customer | null;
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  value,
  onChange,
  onSelectCustomer,
  customers,
  placeholder = 'দোকানের নাম / ব্যক্তির নাম / মার্কেট...',
  disabled = false,
  className = '',
  currency = '৳',
  selectedCustomer,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = value.trim().toLowerCase();

  // Smart search across Shop Name, Person Name, Address/Market
  const matches = React.useMemo(() => {
    if (!query) return [];
    return customers
      .filter((c) => {
        const shop = (c.shopName || '').toLowerCase();
        const person = (c.name || '').toLowerCase();
        const addr = (c.address || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        return (
          shop.includes(query) ||
          person.includes(query) ||
          addr.includes(query) ||
          phone.includes(query)
        );
      })
      .slice(0, 10);
  }, [customers, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange(customer.shopName || customer.name);
    onSelectCustomer(customer);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (isOpen && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (matches[highlightedIndex]) {
          e.preventDefault();
          handleSelect(matches[highlightedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    } else if (e.key === 'ArrowDown' && matches.length > 0) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.length > 0 && matches.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none disabled:bg-slate-50 transition-colors ${className}`}
        />
        {selectedCustomer && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 pointer-events-none">
            বাকি: {currency} {selectedCustomer.currentDue.toLocaleString()}
          </span>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && matches.length > 0 && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl py-1 text-xs">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span>কাস্টমার সাজেশন ({matches.length})</span>
            <span className="text-[9px] font-normal lowercase text-slate-400">↑↓ নেভিগেশন | Enter/Tab নির্বাচন</span>
          </div>

          {matches.map((customer, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={customer.id}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur
                  handleSelect(customer);
                }}
                className={`px-3 py-2 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
                  isHighlighted ? 'bg-amber-50/80 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store className={`h-3.5 w-3.5 shrink-0 ${isHighlighted ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-xs truncate text-slate-900">
                      {customer.shopName}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold text-[11px] text-amber-800 bg-amber-100/70 border border-amber-200 px-1.5 py-0.5 rounded">
                      বাকি: {currency} {customer.currentDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 pl-5">
                  <span className="flex items-center gap-1 truncate">
                    <User className="h-3 w-3 text-slate-400" />
                    {customer.name}
                  </span>
                  {customer.address && (
                    <span className="flex items-center gap-1 truncate text-slate-400">
                      <MapPin className="h-2.5 w-2.5 text-slate-300" />
                      {customer.address}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No match found indicator */}
      {isOpen && query.length >= 2 && matches.length === 0 && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl p-3 text-xs text-slate-600">
          <div className="flex items-center gap-2 text-slate-500">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <span>কোন কাস্টমার মিলেনি। সেভ করলে এটি <strong>নতুন কাস্টমার</strong> হিসেবে স্বয়ংক্রিয়ভাবে যুক্ত হবে।</span>
          </div>
        </div>
      )}
    </div>
  );
};
