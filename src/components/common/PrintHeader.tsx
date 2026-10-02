import React from 'react';
import { BusinessSettings } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface PrintHeaderProps {
  settings: BusinessSettings;
  reportTitle: string;
  reportSubtitle?: string;
  metadata?: { label: string; value: string }[];
  isContinuedPage?: boolean;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  settings,
  reportTitle,
  reportSubtitle,
  metadata = [],
  isContinuedPage = false,
}) => {
  if (isContinuedPage) {
    return (
      <div className="border-b border-slate-300 pb-1.5 mb-3 flex items-center justify-between text-xs font-semibold text-slate-600">
        <span className="font-bold text-slate-900">
          {settings.businessName || 'MM TRADERS'} — {reportTitle} (চলমান)
        </span>
        <span>{reportSubtitle || ''}</span>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {/* Top Letterhead */}
      <div className="border-b-2 border-slate-900 pb-2 mb-2.5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 font-bengali">
              {settings.businessName || 'MM TRADERS'}
            </h1>
            <p className="text-xs font-bold text-slate-700 mt-0.5">
              {settings.subtitle || 'ডিস্ট্রিবিউটর ও পাইকারি বিক্রেতা'}
            </p>
            {settings.proprietorName && (
              <p className="text-[11px] font-semibold text-slate-600">
                স্বত্বাধিকারী: {settings.proprietorName}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-0.5">
              ঠিকানা: {settings.address} {settings.phone ? `• মোবাইল: ${settings.phone}` : ''}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-2.5 py-1 bg-slate-900 text-white text-xs font-bold rounded">
              {reportTitle}
            </span>
            {reportSubtitle && (
              <p className="text-[10px] font-semibold text-slate-600 mt-1">
                {reportSubtitle}
              </p>
            )}
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              প্রিন্ট: {formatDate(new Date())} • {new Date().toLocaleTimeString('bn-BD')}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata Badges */}
      {metadata.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-md p-2 text-xs">
          {metadata.map((item, idx) => (
            <div key={idx}>
              <span className="text-[10px] text-slate-500 block">{item.label}:</span>
              <span className="font-bold text-slate-900 truncate block">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
