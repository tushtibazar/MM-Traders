import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  ImageDown,
  FileDown,
  X,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  downloadCanvasAsPNG,
  downloadPdfFromCanvases,
  capturePagesAsCanvases,
} from '../../services/printExportService';

interface UniversalPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fileNamePrefix: string;
  initialAction?: 'png' | 'pdf' | null;
  children: React.ReactNode;
}

export const UniversalPrintPreviewModal: React.FC<UniversalPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  fileNamePrefix,
  initialAction = null,
  children,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const printAreaRef = useRef<HTMLDivElement>(null);
  const lastTriggeredActionRef = useRef<string | null>(null);

  // Auto trigger export on open if requested
  useEffect(() => {
    if (isOpen && initialAction && lastTriggeredActionRef.current !== initialAction) {
      lastTriggeredActionRef.current = initialAction;
      const timer = setTimeout(() => {
        if (initialAction === 'png') {
          handleExportPNG();
        } else if (initialAction === 'pdf') {
          handleExportPDF();
        }
      }, 400);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      lastTriggeredActionRef.current = null;
    }
  }, [isOpen, initialAction]);

  if (!isOpen) return null;

  const capturePages = async (): Promise<HTMLCanvasElement[]> => {
    if (!printAreaRef.current) return [];

    let pageElements = printAreaRef.current.querySelectorAll<HTMLElement>('.printable-a4-page');
    let attempts = 0;
    while ((!pageElements || pageElements.length === 0) && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (printAreaRef.current) {
        pageElements = printAreaRef.current.querySelectorAll<HTMLElement>('.printable-a4-page');
      }
      attempts++;
    }

    if (!pageElements || pageElements.length === 0) return [];

    return capturePagesAsCanvases(Array.from(pageElements), (current, total) => {
      setExportProgress(`পৃষ্ঠা ${current}/${total} রেন্ডার হচ্ছে...`);
    });
  };

  const handleExportPNG = async () => {
    try {
      setIsExporting(true);
      setExportProgress('ঝকঝকে A4 সাইজের PNG তৈরি হচ্ছে...');

      const canvases = await capturePages();
      if (canvases.length === 0) {
        alert('কোনো প্রিভিউ পৃষ্ঠা পাওয়া যায়নি।');
        return;
      }

      const cleanPrefix = fileNamePrefix.replace(/[/\\?%*:|"<>]/g, '_');

      if (canvases.length === 1) {
        setExportProgress('PNG ডাউনলোড হচ্ছে...');
        await downloadCanvasAsPNG(canvases[0], `${cleanPrefix}.png`);
      } else {
        for (let i = 0; i < canvases.length; i++) {
          setExportProgress(`পৃষ্ঠা ${i + 1}/${canvases.length} ডাউনলোড হচ্ছে...`);
          await downloadCanvasAsPNG(canvases[i], `${cleanPrefix}_Page_${i + 1}.png`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch (err: any) {
      console.error('PNG Export failed', err);
      alert('PNG এক্সপোর্ট করতে সমস্যা হয়েছে: ' + (err.message || 'অজানা ত্রুটি'));
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      setExportProgress('PDF এর জন্য পেজ ক্যাপচার হচ্ছে...');

      const canvases = await capturePages();
      if (canvases.length === 0) {
        alert('কোনো প্রিভিউ পৃষ্ঠা পাওয়া যায়নি।');
        return;
      }

      setExportProgress('PDF ফাইল তৈরি হচ্ছে...');
      const cleanPrefix = fileNamePrefix.replace(/[/\\?%*:|"<>]/g, '_');
      downloadPdfFromCanvases(canvases, `${cleanPrefix}.pdf`);
    } catch (err: any) {
      console.error('PDF Export failed', err);
      alert('PDF তৈরিতে সমস্যা হয়েছে: ' + (err.message || 'অজানা ত্রুটি'));
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm">
      {/* Top Action Toolbar (Hidden in @media print) */}
      <div className="no-print flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-700 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold font-bengali">{title}</h2>
            {subtitle && <p className="text-xs text-slate-300">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition-colors cursor-pointer"
            title="ব্রাউজার প্রিন্টার দিয়ে সরাসরি প্রিন্ট করুন"
          >
            <Printer className="h-4 w-4 text-sky-400" />
            <span>প্রিন্ট করুন</span>
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            title="বন্ধ করুন"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-800/60 flex justify-center">
        <div
          ref={printAreaRef}
          className="printable-area space-y-8 print:space-y-0"
          style={{ fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', system-ui, sans-serif" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
