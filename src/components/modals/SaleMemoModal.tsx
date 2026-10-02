import React from 'react';
import { Printer, X, CheckCircle, Ban, Store, User, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import { generateSaleMemoPDF } from '../../services/pdfGenerator';
import { formatDate } from '../../utils/dateUtils';

interface SaleMemoModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const SaleMemoModal: React.FC<SaleMemoModalProps> = ({ sale, onClose }) => {
  const { db } = useApp();
  if (!sale) return null;

  const currency = db.settings.currency || '৳';

  const handlePrintPDF = () => {
    generateSaleMemoPDF(db.settings, sale);
  };

  return (
    <div
      id="sale-memo-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        {/* Modal actions header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">বিক্রয় চালান ও ক্যাশ মেমো</span>
            {sale.status === 'completed' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                <CheckCircle className="h-3 w-3" /> সফল
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                <Ban className="h-3 w-3" /> বাতিল (Void)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>PDF মেমো প্রিন্ট</span>
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Layout */}
        <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-white text-xs">
          {/* Company Banner */}
          <div className="text-center pb-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 font-bengali">
              {db.settings.businessName}
            </h2>
            <p className="text-xs text-slate-600 font-medium">{db.settings.subtitle}</p>
            <p className="text-[11px] text-slate-500">
              ঠিকানা: {db.settings.address} • মোবাইল: {db.settings.phone}
            </p>
          </div>

          {/* Memo & Customer Meta */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200">
            <div>
              <p className="text-slate-500">কাস্টমার / দোকান:</p>
              <p className="font-bold text-slate-900 text-sm">{sale.shopName}</p>
              <p className="text-slate-700">প্রো: {sale.customerName}</p>
              {sale.customerPhone && <p className="text-slate-600">ফোন: {sale.customerPhone}</p>}
              {sale.customerAddress && <p className="text-slate-500">{sale.customerAddress}</p>}
            </div>
            <div className="text-right">
              <p className="text-slate-500">মেমো নং:</p>
              <p className="font-bold text-slate-900 font-mono text-sm">{sale.memoNo}</p>
              <p className="text-slate-700 mt-1">তারিখ: <strong>{formatDate(sale.date)}</strong></p>
              <p className="text-slate-600">SR: <strong>{sale.srName}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-600 bg-slate-50">
                  <th className="py-1.5 px-2">#</th>
                  <th className="py-1.5 px-2">পণ্য বিবরণ</th>
                  <th className="py-1.5 px-2 text-center">পরিমাণ</th>
                  <th className="py-1.5 px-2 text-center">ফেরত</th>
                  <th className="py-1.5 px-2 text-right">দর / রেট</th>
                  <th className="py-1.5 px-2 text-right">ছাড়</th>
                  <th className="py-1.5 px-2 text-right">মোট টাকা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1.5 px-2 text-slate-400">{index + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-slate-900">{item.productName}</td>
                    <td className="py-1.5 px-2 text-center">{item.quantity} {item.unit}</td>
                    <td className="py-1.5 px-2 text-center text-slate-500">{item.returnQuantity || 0}</td>
                    <td className="py-1.5 px-2 text-right">{currency} {item.rate.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right text-slate-500">
                      {item.discount > 0 ? `${currency} ${item.discount.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-900">
                      {currency} {item.lineTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Accounting Breakdown Matrix */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>মোট পণ্যের মূল্য:</span>
                  <span>{currency} {sale.totalProductAmount.toLocaleString()}</span>
                </div>
                {sale.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>মোট ছাড়:</span>
                    <span>- {currency} {sale.totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                  <span>নিট বিক্রয় মূল্য:</span>
                  <span className="text-emerald-700">{currency} {sale.netSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>পূর্বের বকেয়া:</span>
                  <span>+ {currency} {sale.previousDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-800 bg-blue-50 p-1 rounded">
                  <span>নগদ জমা:</span>
                  <span>- {currency} {sale.paymentReceived.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200">
                  <span>বর্তমান মোট বাকি:</span>
                  <span>{currency} {sale.newDue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer signature line */}
          <div className="mt-8 pt-6 flex justify-between text-[11px] text-slate-400">
            <div className="text-center">
              <div className="w-32 border-t border-slate-400 mb-1"></div>
              <span>গ্রাহকের স্বাক্ষর</span>
            </div>
            <div className="text-center">
              <div className="w-32 border-t border-slate-400 mb-1"></div>
              <span>কর্তৃপক্ষের স্বাক্ষর</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
