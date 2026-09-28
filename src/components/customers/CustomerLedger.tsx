import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Filter,
  FileDown,
  Printer,
  ArrowLeft,
  Store,
  Phone,
  MapPin,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { generateCustomerLedgerPDF } from '../../services/pdfGenerator';

interface CustomerLedgerProps {
  customer: Customer | null;
  onBackToList: () => void;
  onOpenQuickPayment: (customerId: string) => void;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({
  customer,
  onBackToList,
  onOpenQuickPayment,
}) => {
  const { db } = useApp();
  const currency = db.settings.currency || '৳';

  // If no customer selected, allow selecting one from dropdown
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customer ? customer.id : '');
  const activeCustomer = db.customers.find((c) => c.id === (customer ? customer.id : selectedCustomerId)) || db.customers[0];

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Customer transactions from ledger
  const customerEntries = useMemo(() => {
    if (!activeCustomer) return [];
    let entries = db.customerLedgers.filter((l) => l.customerId === activeCustomer.id);

    if (startDate) {
      entries = entries.filter((l) => l.date >= startDate);
    }
    if (endDate) {
      entries = entries.filter((l) => l.date <= endDate);
    }
    if (typeFilter !== 'all') {
      entries = entries.filter((l) => l.type === typeFilter);
    }

    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [db.customerLedgers, activeCustomer, startDate, endDate, typeFilter]);

  // Aggregate totals
  const totalSalesDebit = useMemo(() => {
    return customerEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  }, [customerEntries]);

  const totalPaymentCredit = useMemo(() => {
    return customerEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
  }, [customerEntries]);

  const handleDownloadPDF = () => {
    if (!activeCustomer) return;
    generateCustomerLedgerPDF(
      db.settings,
      activeCustomer,
      customerEntries,
      startDate && endDate ? `${startDate} হতে ${endDate}` : undefined,
    );
  };

  if (!activeCustomer) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">কোন কাস্টমার পাওয়া যায়নি</p>
        <button
          onClick={onBackToList}
          className="mt-3 inline-flex items-center gap-1 rounded bg-slate-900 px-3 py-1.5 text-xs text-white"
        >
          তালিকা দেখুন
        </button>
      </div>
    );
  }

  return (
    <div id="customer-ledger-module" className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToList}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="কাস্টমার তালিকায় ফিরুন"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-bengali">
                কাস্টমার লেজার ও হিসাব খতিয়ান (Ledger)
              </h1>
              <p className="text-xs text-slate-500">
                বিক্রয়, নগদ আদায় ও চলতি বকেয়া হিসাবের কালানুক্রমিক স্টেটমেন্ট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="ledger-pdf-btn"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
            >
              <FileDown className="h-4 w-4 text-emerald-400" />
              <span>লেজার PDF ডাউনলোড</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Switcher & Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeCustomer.shopName}</h2>
              <p className="text-xs text-slate-600">
                মালিক: <strong className="text-slate-800">{activeCustomer.name}</strong> •{' '}
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" /> {activeCustomer.phone}
                </span>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-slate-400" /> {activeCustomer.address || 'ঠিকানা দেওয়া নেই'} •
                এস আর: <strong>{activeCustomer.assignedSrName || '-'}</strong>
              </p>
            </div>
          </div>

          {/* Customer Dropdown Switcher */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              অন্য কাস্টমার দেখুন:
            </label>
            <select
              value={activeCustomer.id}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-500 max-w-[240px]"
            >
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shopName} ({c.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Financial Highlight Blocks */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mt-4">
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">প্রারম্ভিক বকেয়া (Opening Due)</span>
            <p className="mt-1 text-base font-bold text-slate-800">
              {currency} {activeCustomer.openingBalance.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">ফিল্টারকৃত মোট বিক্রয় (Debit)</span>
            <p className="mt-1 text-base font-bold text-emerald-700">
              {currency} {totalSalesDebit.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">ফিল্টারকৃত মোট আদায় (Credit)</span>
            <p className="mt-1 text-base font-bold text-blue-700">
              {currency} {totalPaymentCredit.toLocaleString()}
            </p>
          </div>

          <div className="rounded-lg bg-rose-50 p-3.5 border border-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800">বর্তমান মোট বকেয়া (Balance)</span>
              <button
                onClick={() => onOpenQuickPayment(activeCustomer.id)}
                className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold hover:bg-emerald-700"
              >
                টাকা আদায়
              </button>
            </div>
            <p className="mt-1 text-lg sm:text-xl font-extrabold text-rose-700 truncate">
              {currency} {activeCustomer.currentDue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Date & Type Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">শুরুর তারিখ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">শেষ তারিখ:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ধরণ:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
            >
              <option value="all">সব লেনদেন</option>
              <option value="sale">শুধু বিক্রয় (Sale)</option>
              <option value="payment">শুধু টাকা আদায় (Payment)</option>
              <option value="opening">প্রারম্ভিক বকেয়া (Opening)</option>
            </select>
          </div>

          {(startDate || endDate || typeFilter !== 'all') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTypeFilter('all');
              }}
              className="text-slate-500 underline hover:text-slate-800"
            >
              ফিল্টার মুছুন
            </button>
          )}
        </div>
      </div>

      {/* Chronological Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">তারিখ</th>
                <th className="py-3 px-3 font-semibold">লেনদেনের ধরণ</th>
                <th className="py-3 px-3 font-semibold">ভাউচার / রেফারেন্স #</th>
                <th className="py-3 px-3 font-semibold">বিবরণ / নোট</th>
                <th className="py-3 px-3 font-semibold text-right text-emerald-800">বিক্রয় / বৃদ্ধি (Debit)</th>
                <th className="py-3 px-3 font-semibold text-right text-blue-800">জমা / আদায় (Credit)</th>
                <th className="py-3 px-4 font-semibold text-right text-rose-800">অবশিষ্ট বাকি (Balance)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerEntries.map((entry) => {
                const isSale = entry.type === 'sale';
                const isPayment = entry.type === 'payment';

                return (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-800">{entry.date}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {isSale && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/60">
                            <ArrowUpRight className="h-3 w-3" /> বিক্রয়
                          </span>
                        )}
                        {isPayment && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200/60">
                            <ArrowDownLeft className="h-3 w-3" /> জমা / আদায়
                          </span>
                        )}
                        {entry.type === 'opening' && (
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            প্রারম্ভিক
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{entry.referenceId || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{entry.description}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                      {entry.debit > 0 ? `${currency} ${entry.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-blue-700">
                      {entry.credit > 0 ? `${currency} ${entry.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 text-sm">
                      <span className={entry.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        {currency} {entry.balance.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {customerEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    এই কাস্টমারের কোন লেজার এন্ট্রি পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
