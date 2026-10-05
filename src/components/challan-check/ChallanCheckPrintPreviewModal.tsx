import React from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings } from '../../types';
import { toBengaliDigits, formatDate } from '../../utils/dateUtils';

interface BatchRow {
  id: string;
  purchasePrice: string | number;
  totalPieces: string | number;
  freePieces: string | number;
  undeliveredPieces: string | number;
}

interface ChallanCheckPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  productName: string;
  rows: BatchRow[];
  columnTotals: {
    sumPurchasePrice: number;
    sumTotalPieces: number;
    sumFreePieces: number;
    sumUndelivered: number;
  };
  grandTotalPieces: number;
  cartonCount: number;
  perPieceCost: number;
  piecesPerCarton: number;
  costPerCarton: number;
  profitMargin: number;
  sellingPricePerCarton: number;
  sellingPricePerPiece: number;
  todayDateStr: string;
}

export const ChallanCheckPrintPreviewModal: React.FC<ChallanCheckPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  productName,
  rows,
  columnTotals,
  grandTotalPieces,
  cartonCount,
  perPieceCost,
  piecesPerCarton,
  costPerCarton,
  profitMargin,
  sellingPricePerCarton,
  sellingPricePerPiece,
  todayDateStr,
}) => {
  // Helper to format carton numbers
  const formatCartonNumber = (val: number): string => {
    if (isNaN(val) || !isFinite(val) || val <= 0) return '০';
    const isWhole = val % 1 === 0;
    const numStr = isWhole ? val.toString() : val.toFixed(2).replace(/\.?0+$/, '');
    return toBengaliDigits(numStr);
  };

  // Helper to format monetary values with standard comma thousand-separators
  const formatMoneyBn = (val: number, maxDecimals: number = 2, minDecimals: number = 2): string => {
    if (isNaN(val) || !isFinite(val) || val <= 0) return '০.০০';
    const str = val.toLocaleString('en-US', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: maxDecimals,
    });
    return toBengaliDigits(str);
  };

  const undeliveredCartonCount =
    piecesPerCarton > 0 && columnTotals.sumUndelivered > 0
      ? columnTotals.sumUndelivered / piecesPerCarton
      : 0;

  const metadata = [
    { label: 'তারিখ', value: formatDate(todayDateStr) },
    { label: 'পণ্যের নাম', value: productName.trim() || 'সাধারণ চালান হিসাব' },
    { label: 'মোট পিস', value: `${toBengaliDigits(grandTotalPieces)} পিস (${formatCartonNumber(cartonCount)} কার্টুন)` },
    { label: 'আনডেলিভারি', value: `${toBengaliDigits(columnTotals.sumUndelivered)} পিস (${formatCartonNumber(undeliveredCartonCount)} কার্টুন)` },
    {
      label: 'চূড়ান্ত বিক্রয় মূল্য',
      value: `${currency} ${formatMoneyBn(sellingPricePerCarton, 2, 2)} / কা.`,
    },
  ];

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="চালান চেক ও বিক্রয়মূল্য নির্ধারণ প্রিন্ট প্রিভিউ"
      subtitle={`পণ্য: ${productName || 'নাম উল্লেখ নেই'} • তারিখ: ${formatDate(todayDateStr)}`}
      fileNamePrefix={`Challan_Check_${productName ? productName.replace(/\s+/g, '_') : 'Calculation'}_${todayDateStr}`}
    >
      <div
        className="printable-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden"
        style={{
          width: '794px',
          minHeight: '1123px',
          padding: '24px 28px',
          boxSizing: 'border-box',
          fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif",
        }}
      >
        <div>
          {/* Business Header */}
          <PrintHeader
            settings={settings}
            reportTitle="চালান চেক ও বিক্রয়মূল্য নির্ধারণ"
            reportSubtitle={`তারিখ: ${formatDate(todayDateStr)}`}
            metadata={metadata}
          />

          {/* 1. TOP SUMMARY KPI CARDS STRIP */}
          <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
            <div className="bg-slate-50 border border-slate-300 rounded p-2 text-center">
              <span className="text-[10px] text-slate-500 block">মোট পিস</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {toBengaliDigits(grandTotalPieces)}{' '}
                <span className="text-[10px] font-normal font-sans">পিস</span>
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-300 rounded p-2 text-center">
              <span className="text-[10px] text-slate-500 block">কার্টুন সংখ্যা</span>
              <span className="text-base font-bold font-mono text-indigo-900">
                {formatCartonNumber(cartonCount)}{' '}
                <span className="text-[10px] font-normal font-sans">কার্টুন</span>
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-300 rounded p-2 text-center">
              <span className="text-[10px] text-slate-500 block">পিছ মূল্য (ক্রয়)</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {currency} {formatMoneyBn(perPieceCost, 3, 2)}
              </span>
            </div>
            <div className="bg-emerald-50 border border-emerald-300 rounded p-2 text-center">
              <span className="text-[10px] text-emerald-800 font-bold block">বিক্রয় মূল্য (কার্টুন)</span>
              <span className="text-base font-bold font-mono text-emerald-950">
                {currency} {formatMoneyBn(sellingPricePerCarton, 2, 2)}
              </span>
            </div>
          </div>

          {/* 2. BATCH ENTRIES TABLE */}
          <div className="border border-slate-300 rounded overflow-hidden mb-4">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-xs text-slate-800 flex justify-between items-center">
              <span>চালান / ব্যাচ বিবরণী তালিকা</span>
              <span className="text-[11px] font-normal text-slate-600">
                মোট সারি: {toBengaliDigits(rows.length)} টি
              </span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2 px-2 text-center w-10 border-r border-slate-300">#</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">
                    ক্রয় মূল্য ({currency})
                  </th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">
                    মোট পিস (Quantity)
                  </th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">
                    ফ্রি (Free Pieces)
                  </th>
                  <th className="py-2 px-3 text-right">
                    আনডেলিভারি (Undelivered)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row, idx) => {
                  const buy = parseFloat(String(row.purchasePrice)) || 0;
                  const pcs = parseFloat(String(row.totalPieces)) || 0;
                  const free = parseFloat(String(row.freePieces)) || 0;
                  const undeliv = parseFloat(String(row.undeliveredPieces)) || 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-slate-500">
                        {toBengaliDigits(idx + 1)}
                      </td>
                      <td className="py-1.5 px-3 text-right border-r border-slate-200 font-mono font-bold text-slate-900">
                        {buy > 0 ? toBengaliDigits(buy.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '০.০০'}
                      </td>
                      <td className="py-1.5 px-3 text-right border-r border-slate-200 font-mono text-indigo-950 font-bold">
                        {pcs > 0 ? toBengaliDigits(pcs) : '০'}
                      </td>
                      <td className="py-1.5 px-3 text-right border-r border-slate-200 font-mono text-emerald-800 font-bold">
                        {free > 0 ? toBengaliDigits(free) : '০'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-rose-800 font-bold">
                        {undeliv > 0 ? toBengaliDigits(undeliv) : '০'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-900 text-xs">
                  <td className="py-2 px-2 text-center border-r border-slate-300">
                    যোগফল
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-300 font-mono font-black text-slate-950">
                    {currency}{' '}
                    {columnTotals.sumPurchasePrice > 0
                      ? toBengaliDigits(columnTotals.sumPurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                      : '০.০০'}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-300 font-mono font-black text-indigo-950">
                    {toBengaliDigits(columnTotals.sumTotalPieces)}
                  </td>
                  <td className="py-2 px-3 text-right border-r border-slate-300 font-mono font-black text-emerald-950">
                    {toBengaliDigits(columnTotals.sumFreePieces)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-black text-rose-950">
                    {toBengaliDigits(columnTotals.sumUndelivered)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200 bg-slate-50 text-[11px]">
                  <td colSpan={5} className="py-1.5 px-3 text-right font-bold text-slate-800">
                    ({currency}{columnTotals.sumPurchasePrice > 0 ? toBengaliDigits(columnTotals.sumPurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '০.০০'} টাকায় {toBengaliDigits(grandTotalPieces)} পিস)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 3. CALCULATION & PRICING BREAKDOWN */}
          <div className="border border-slate-300 rounded overflow-hidden mb-4">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-xs text-slate-800">
              মূল্য নির্ধারণ ও হিসাবের ধাপসমূহ (Calculation Breakdown)
            </div>
            <div className="p-3 text-xs space-y-2 bg-white">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700">
                  <strong>১. মোট পিস (Grand Total Pieces):</strong> মোট পিস ({toBengaliDigits(columnTotals.sumTotalPieces)}) + ফ্রি ({toBengaliDigits(columnTotals.sumFreePieces)}) + আনডেলিভারি ({toBengaliDigits(columnTotals.sumUndelivered)})
                </span>
                <span className="font-mono font-bold text-slate-900">
                  = {toBengaliDigits(grandTotalPieces)} পিস
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700">
                  <strong>২. পিছ মূল্য (Per Piece Cost):</strong> মোট ক্রয় মূল্য ({currency}{formatMoneyBn(columnTotals.sumPurchasePrice, 2, 2)}) ÷ মোট পিস ({toBengaliDigits(grandTotalPieces)})
                </span>
                <span className="font-mono font-bold text-slate-900">
                  = {currency} {formatMoneyBn(perPieceCost, 3, 2)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700">
                  <strong>৩. কত পিছে কার্টুন (Pieces Per Carton):</strong> প্রতি কার্টুনে পিস সংখ্যা
                </span>
                <span className="font-mono font-bold text-indigo-900">
                  = {toBengaliDigits(piecesPerCarton)} পিস
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700">
                  <strong>৪. প্রতি কার্টুন ক্রয় (Purchase Cost Per Carton):</strong> পিছ মূল্য ({currency}{formatMoneyBn(perPieceCost, 3, 2)}) × কত পিছে কার্টুন ({toBengaliDigits(piecesPerCarton)})
                </span>
                <span className="font-mono font-bold text-slate-900">
                  = {currency} {formatMoneyBn(costPerCarton, 2, 2)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-700">
                  <strong>৫. প্রফিট মার্জিন (%):</strong> লাভ শতাংশ
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  = {toBengaliDigits(profitMargin)}%
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 bg-emerald-50/70 px-2 rounded font-bold text-emerald-950 text-sm">
                <span>
                  ৬. চূড়ান্ত বিক্রয় মূল্য (Final Selling Price Per Carton): প্রতি কার্টুন ক্রয় × (১ + {toBengaliDigits(profitMargin)}% ÷ ১০০)
                </span>
                <span className="font-mono text-base">
                  = {currency} {formatMoneyBn(sellingPricePerCarton, 2, 2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 px-2">
                <span>পিস প্রতি চূড়ান্ত বিক্রয় মূল্য (Selling Price Per Piece):</span>
                <span className="font-mono font-bold text-slate-900">
                  = {currency} {formatMoneyBn(sellingPricePerPiece, 2, 2)} / পিস
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-xs">
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  <span className="text-slate-700 font-bold">মোট পিস:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {toBengaliDigits(grandTotalPieces)} পিস ({formatCartonNumber(cartonCount)} কার্টুন)
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  <span className="text-slate-700 font-bold">আনডেলিভারি:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {toBengaliDigits(columnTotals.sumUndelivered)} পিস ({formatCartonNumber(undeliveredCartonCount)} কার্টুন)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Signature Section */}
        <div className="pt-4 border-t border-slate-300">
          <div className="flex justify-between items-end text-xs text-slate-600">
            <div>
              <p className="text-[10px] text-slate-400">
                সফটওয়্যার প্রস্তুতকারক: এম এম ট্রেডার্স ইআরপি সিস্টেম
              </p>
              <p className="text-[10px] text-slate-400">
                মুদ্রণ তারিখ ও সময়: {new Date().toLocaleString('bn-BD')}
              </p>
            </div>
            <div className="flex gap-12">
              <div className="text-center">
                <div className="w-28 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px]">হিসাবকারীর স্বাক্ষর</span>
              </div>
              <div className="text-center">
                <div className="w-28 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px]">স্বত্বাধিকারীর স্বাক্ষর</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UniversalPrintPreviewModal>
  );
};
