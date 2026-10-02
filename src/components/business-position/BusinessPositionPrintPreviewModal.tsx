import React from 'react';
import { UniversalPrintPreviewModal } from '../modals/UniversalPrintPreviewModal';
import { PrintHeader } from '../common/PrintHeader';
import { BusinessSettings } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface PositionLineItem {
  id: string;
  sl: string;
  name: string;
  desc: string;
  autoAmount: number;
  adjustment: number;
  finalAmount: number;
  note?: string;
}

interface BusinessPositionPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BusinessSettings;
  currency: string;
  lineItems: PositionLineItem[];
  totalPosition: number;
  totalInvestment: number;
  netSurplus: number;
  todayDateStr: string;
  initialAction?: 'png' | 'pdf' | null;
}

export const BusinessPositionPrintPreviewModal: React.FC<BusinessPositionPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  currency,
  lineItems,
  totalPosition,
  totalInvestment,
  netSurplus,
  todayDateStr,
  initialAction = null,
}) => {
  const isProfit = netSurplus >= 0;

  return (
    <UniversalPrintPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      title="ব্যবসার সার্বিক হিসাব ও পজিশন বিবরণী (A4)"
      subtitle={`মোট সম্পদ: ${currency} ${totalPosition.toLocaleString()} • ইনভেস্টমেন্ট: ${currency} ${totalInvestment.toLocaleString()} • নিট: ${currency} ${netSurplus.toLocaleString()}`}
      fileNamePrefix={`Business_Position_Statement_${todayDateStr}`}
      initialAction={initialAction}
    >
      <div
        className="printable-a4-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none print:m-0 flex flex-col justify-between overflow-hidden"
        style={{
          width: '794px',
          minHeight: '1123px',
          padding: '24px 28px',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <PrintHeader
            settings={settings}
            reportTitle="ব্যবসার সার্বিক হিসাব ও পজিশন"
            reportSubtitle={`বিবরণী তারিখ: ${formatDate(todayDateStr)}`}
            metadata={[
              { label: 'তারিখ', value: formatDate(todayDateStr) },
              {
                label: 'সর্বমোট সম্পদ (পজিশন)',
                value: `${currency} ${totalPosition.toLocaleString()}`,
              },
              {
                label: 'মোট ইনভেস্টমেন্ট',
                value: `${currency} ${totalInvestment.toLocaleString()}`,
              },
              {
                label: isProfit ? 'নিট ব্যবসায়িক লাভ' : 'নিট ঘাটতি / ক্ষতি',
                value: `${currency} ${Math.abs(netSurplus).toLocaleString()}`,
              },
            ]}
          />

          {/* Table */}
          <div className="border border-slate-300 rounded-sm overflow-hidden mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                  <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                  <th className="py-2 px-3 border-r border-slate-300">খাত ও বিবরণ</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">অটো রেকর্ড</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">সমন্বয়</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">চূড়ান্ত পরিমাণ</th>
                  <th className="py-2 px-3">মন্তব্য / বিবরণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {item.sl}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {item.desc}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                      {item.autoAmount > 0 ? `${currency} ${item.autoAmount.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono border-r border-slate-200">
                      {item.adjustment !== 0 ? (
                        <span
                          className={
                            item.adjustment > 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'
                          }
                        >
                          {item.adjustment > 0 ? '+' : ''}
                          {currency} {item.adjustment.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">০</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                      {currency} {item.finalAmount.toLocaleString()}
                    </td>
                    <td className="py-1.5 px-3 text-[11px] text-slate-600 truncate max-w-[130px]">
                      {item.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-xs">
                  <td colSpan={4} className="py-2 px-3 text-right text-slate-900">
                    সর্বমোট ব্যবসার আর্থিক পজিশন (Total Gross Position):
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-indigo-900 text-sm">
                    {currency} {totalPosition.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Investment & Net Position Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mt-3 border border-slate-300 rounded-md p-3 bg-slate-50">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                ১. সর্বমোট সম্পদ (Gross Assets)
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {currency} {totalPosition.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                ২. মূলধন ও ইনভেস্টমেন্ট (Investment)
              </span>
              <span className="text-base font-bold font-mono text-slate-800">
                {currency} {totalInvestment.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                ৩. নিট স্থিতি / মোট লাভ (Net Position)
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  isProfit ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isProfit ? '+' : '-'} {currency} {Math.abs(netSurplus).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Signatures */}
        <div className="pt-6 mt-4 border-t border-slate-300">
          <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
              <span className="font-semibold text-slate-800">হিসাব রক্ষক / প্রস্তুতকারী</span>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
              <span className="font-semibold text-slate-800">অডিট / ইন্টারনাল ভেরিফায়ার</span>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 h-8"></div>
              <span className="font-bold text-slate-900">স্বত্বাধিকারী / মালিকের স্বাক্ষর</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-center mt-3">
            * এটি MM TRADERS সেন্ট্রাল ম্যানেজমেন্ট সিস্টেম কর্তৃক প্রস্তুতকৃত চূড়ান্ত আর্থিক পজিশন বিবরণী।
          </div>
        </div>
      </div>
    </UniversalPrintPreviewModal>
  );
};
