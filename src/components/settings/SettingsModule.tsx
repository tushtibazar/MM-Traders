import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  X,
  HardDrive,
  Info,
  FileCheck,
  Folder,
  FolderCheck,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  exportDatabaseJson,
  importDatabaseJson,
  validateBackupJson,
  resetToInitialSeed,
  DEFAULT_ROUTES,
  BackupValidationResult,
} from '../../services/storage';
import {
  isFileSystemAccessSupported,
  saveDirectoryHandle,
  getDirectoryHandle,
  getStoredFolderName,
  removeDirectoryHandle,
  verifyFolderPermission,
  writeBackupToFolder,
} from '../../services/localBackupFolder';
import { PinPromptModal } from '../modals/PinPromptModal';

export const SettingsModule: React.FC = () => {
  const { db, currentUser, updateSettings, refreshFromStorage, importDatabase, addRoute, updateRoute, deleteRoute, resetToBlankData } = useApp();

  const [businessName, setBusinessName] = useState(db.settings.businessName);
  const [proprietorName, setProprietorName] = useState(db.settings.proprietorName || '');
  const [subtitle, setSubtitle] = useState(db.settings.subtitle);
  const [phone, setPhone] = useState(db.settings.phone);
  const [address, setAddress] = useState(db.settings.address);
  const [currency, setCurrency] = useState(db.settings.currency || '৳');
  const [securityPin, setSecurityPin] = useState(db.settings.securityPin || '1234');
  const [saveMsg, setSaveMsg] = useState('');

  // Local Folder Auto-Save states (File System Access API)
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isFolderSupported] = useState<boolean>(() => isFileSystemAccessSupported());
  const [isFolderSaving, setIsFolderSaving] = useState<boolean>(false);

  // Backup & Restore states
  const [downloadMsg, setDownloadMsg] = useState('');
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState('');
  const [restoreErrorMsg, setRestoreErrorMsg] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [pendingRestore, setPendingRestore] = useState<{
    fileContent: string;
    fileName: string;
    validation: BackupValidationResult;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load remembered local folder handle on component mount
  useEffect(() => {
    if (!isFolderSupported) return;
    (async () => {
      try {
        const handle = await getDirectoryHandle();
        const storedName = await getStoredFolderName();
        if (handle) {
          setFolderHandle(handle);
          setFolderName(storedName || handle.name || 'নির্দিষ্ট ব্যাকআপ ফোল্ডার');
        }
      } catch (err) {
        console.warn('Could not restore backup folder handle:', err);
      }
    })();
  }, [isFolderSupported]);

  // Route Management States
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [routeMsg, setRouteMsg] = useState('');

  const currentRoutes = React.useMemo(() => {
    return Array.isArray(db.settings.customRoutes)
      ? db.settings.customRoutes
      : DEFAULT_ROUTES;
  }, [db.settings.customRoutes]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...db.settings,
      businessName,
      proprietorName: proprietorName.trim(),
      subtitle,
      phone,
      address,
      currency,
      securityPin: securityPin.trim() || '1234',
    });
    setSaveMsg('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setSaveMsg(''), 3500);
  };

  const handleSelectFolder = async () => {
    setRestoreErrorMsg('');
    setDownloadMsg('');
    try {
      if (!isFileSystemAccessSupported()) {
        setRestoreErrorMsg('আপনার বর্তমান ব্রাউজারে File System Access API সমর্থিত নয়। (Google Chrome, Microsoft Edge বা Brave ব্রাউজার ব্যবহার করুন)');
        return;
      }
      const dirHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });
      if (dirHandle) {
        const name = dirHandle.name || 'ব্যাকআপ ফোল্ডার';
        await saveDirectoryHandle(dirHandle, name);
        setFolderHandle(dirHandle);
        setFolderName(name);
        setDownloadMsg(`ব্যাকআপ ফোল্ডার সফলভাবে সংযুক্ত করা হয়েছে: "${name}"। এখন থেকে ব্যাকআপ ফাইল সরাসরি এই ফোল্ডারে সেভ হবে।`);
        setTimeout(() => setDownloadMsg(''), 7000);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setRestoreErrorMsg(`ফোল্ডার নির্বাচনে ত্রুটি: ${err.message || 'অজানা ত্রুটি'}`);
      }
    }
  };

  const handleDisconnectFolder = async () => {
    await removeDirectoryHandle();
    setFolderHandle(null);
    setFolderName(null);
    setDownloadMsg('লোকাল ফোল্ডারের সংযোগ বিচ্ছিন্ন করা হয়েছে। ব্যাকআপ এখন স্বাভাবিক ব্রাউজার ডাউনলোড ফোল্ডারে সেভ হবে।');
    setTimeout(() => setDownloadMsg(''), 5000);
  };

  const handleDownloadBackup = async () => {
    setRestoreErrorMsg('');
    setDownloadMsg('');
    setIsFolderSaving(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const fileName = `mm-traders-backup-${dateStr}.json`;
      const jsonString = JSON.stringify(db, null, 2);

      // If user selected a local computer folder and the browser supports it
      if (folderHandle && isFolderSupported) {
        const hasPermission = await verifyFolderPermission(folderHandle, true);
        if (hasPermission) {
          await writeBackupToFolder(folderHandle, fileName, jsonString);
          setDownloadMsg(`সরাসরি আপনার কম্পিউটারের "${folderName || 'নির্বাচিত'}" ফোল্ডারে ব্যাকআপ সফলভাবে সেভ হয়েছে: "${fileName}" (কোনো ফাইল ডায়ালগ ছাড়াই)`);
          setTimeout(() => setDownloadMsg(''), 7000);
          return;
        } else {
          setRestoreErrorMsg(
            `"${folderName || 'ফোল্ডার'}"-এ ফাইল লেখার অনুমতি পাওয়া যায়নি বা অনুমতি বাতিল হয়েছে (ব্রাউজার রিস্টার্টের কারণে হতে পারে)। অনুগ্রহ করে "ব্যাকআপ ফোল্ডার সিলেক্ট করুন" বাটনে ক্লিক করে পুনরায় অনুমোদন দিন। বিকল্প হিসেবে ফাইলটি স্বাভাবিকভাবে ডাউনলোড করে দেওয়া হলো।`
          );
          // Graceful fallback to browser download
          exportDatabaseJson(db);
          return;
        }
      }

      // Default browser download (when no folder is selected or API not supported)
      exportDatabaseJson(db);
      setDownloadMsg(`ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে: "${fileName}"`);
      setTimeout(() => setDownloadMsg(''), 6000);
    } catch (err: any) {
      setRestoreErrorMsg(`ব্যাকআপ ফোল্ডারে সেভ করতে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}। স্বাভাবিকভাবে ডাউনলোড চেষ্টা করা হচ্ছে...`);
      try {
        exportDatabaseJson(db);
      } catch (fallbackErr: any) {
        setRestoreErrorMsg(`ব্যাকআপ নেওয়া সম্ভব হয়নি: ${fallbackErr.message || 'অজানা ত্রুটি'}`);
      }
    } finally {
      setIsFolderSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreErrorMsg('');
    setRestoreSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      setRestoreErrorMsg('ত্রুটি: শুধুমাত্র .json ব্যাকআপ ফাইল নির্বাচন করুন। কোনো ডাটা পরিবর্তন করা হয়নি।');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const validation = validateBackupJson(jsonStr);
        if (!validation.isValid || !validation.data) {
          setRestoreErrorMsg(validation.error || 'ফাইলটি কোনো বৈধ JSON ব্যাকআপ ডাটা ধারণ করে না। কোনো তথ্য পরিবর্তন করা হয়নি।');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Open PIN confirmation modal
        setPendingRestore({ fileContent: jsonStr, fileName: file.name, validation });
        setIsPinModalOpen(true);
      } catch (err: any) {
        setRestoreErrorMsg(`ফাইলটি পড়তে সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setRestoreErrorMsg('ফাইলটি পড়া সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestore || !pendingRestore.validation.data) {
      setIsPinModalOpen(false);
      return;
    }

    try {
      const res = importDatabaseJson(pendingRestore.fileContent);
      if (res.success && res.data) {
        importDatabase(res.data);
        refreshFromStorage();
        const countC = res.data.customers?.length || 0;
        const countP = res.data.products?.length || 0;
        const countS = res.data.dailySheets?.length || 0;
        const countE = res.data.expenses?.length || 0;
        setRestoreSuccessMsg(
          `ডাটাবেজ সফলভাবে ব্যাকআপ থেকে পুনরুদ্ধার (Restore) করা হয়েছে! মোট ${countC} জন কাস্টমার, ${countP} টি পণ্য, ${countS} টি দৈনিক হিসাব এবং ${countE} টি খরচের রেকর্ড রিস্টোর সম্পন্ন হয়েছে।`
        );
        setRestoreErrorMsg('');
        setIsPinModalOpen(false);
        setPendingRestore(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setRestoreErrorMsg(res.error || 'ডাটাবেজ পুনরুদ্ধার ব্যর্থ হয়েছে। কোনো তথ্য পরিবর্তন করা হয়নি।');
        setIsPinModalOpen(false);
        setPendingRestore(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setRestoreErrorMsg(`পুনরুদ্ধার প্রক্রিয়ায় অপ্রত্যাশিত ত্রুটি: ${err.message || 'অজানা ত্রুটি'}`);
      setIsPinModalOpen(false);
      setPendingRestore(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClosePinModal = () => {
    setIsPinModalOpen(false);
    setPendingRestore(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenResetModal = () => {
    setIsResetPinModalOpen(true);
  };

  const handleConfirmReset = () => {
    setIsResetPinModalOpen(false);
    resetToBlankData();
    refreshFromStorage();
    setResetSuccessMsg('সকল ব্যবসায়িক ডেটা সফলভাবে স্থায়ীভাবে মুছে খালি (Blank) করা হয়েছে। প্রতিষ্ঠানের নাম, মালিকের নাম ও সেটিংস অক্ষত রয়েছে।');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div id="settings-module" className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white shadow-xs">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-bengali">
            ব্যবসার সেটিংস ও ডাটা ব্যাকআপ (Settings)
          </h1>
          <p className="text-xs text-slate-500">
            প্রতিষ্ঠান প্রোফাইল, মেমো হেডার, ব্যাকআপ ও রিসেট সুবিধা
          </p>
        </div>
      </div>

      {/* Business Details Form */}
      <form onSubmit={handleSaveSettings} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
          <Building className="h-4 w-4 text-slate-600" />
          ব্যবসা ও ভাউচার হেডার তথ্য
        </h2>

        {resetSuccessMsg && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{resetSuccessMsg}</span>
          </div>
        )}

        {saveMsg && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{saveMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ব্যবসা / প্রতিষ্ঠানের নাম *
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              মালিকের নাম (Owner Name) *
            </label>
            <input
              type="text"
              required
              value={proprietorName}
              onChange={(e) => setProprietorName(e.target.value)}
              placeholder="যেমন: মোঃ মামুন"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ডিস্ট্রিবিউটর / সাব-টাইটেল (Distributor label)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="যেমন: DISTRIBUTOR"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">অফিস মোবাইল নম্বর *</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">মুদ্রা চিহ্ন (Currency Symbol)</label>
            <input
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">ঠিকানা (মেমোতে প্রদর্শনের জন্য)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-rose-600" />
              <label className="font-bold text-slate-900">
                নিরাপত্তা পিন (Security PIN - ৪-৬ সংখ্যা) *
              </label>
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              পণ্য ডিলিট (Delete) এবং দৈনিক বাকি আদায় (Due Collection) সংরক্ষণের অনুমোদনের জন্য এই পিন কোডটি ব্যবহৃত হবে।
            </p>
            <div className="max-w-xs">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 font-mono font-bold tracking-widest text-sm text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Save className="h-4 w-4" />
            <span>সেটিংস সেভ করুন</span>
          </button>
        </div>
      </form>

      {/* Route Management Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" />
              রুট ব্যবস্থাপনা (Route Management)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Daily হিসাব ও এসআর (SR) মাল বিতরণের জন্য সক্রিয় রুট তালিকা পরিচালনা করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewRouteName('');
              setIsAddRouteOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ নতুন রুট যোগ করুন</span>
          </button>
        </div>

        {routeMsg && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{routeMsg}</span>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-2.5 w-12 text-center">#</th>
                <th className="px-4 py-2.5">রুটের নাম</th>
                <th className="px-4 py-2.5 text-right w-32">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRoutes.map((route, idx) => (
                <tr key={route} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{route}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRoute(route);
                        setEditRouteName(route);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                      title="রুট এডিট করুন"
                    >
                      <Edit2 className="h-3 w-3 text-slate-500" />
                      <span>এডিট</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Route Modal in Settings */}
        {isAddRouteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">+ নতুন রুট যোগ করুন</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddRouteOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = newRouteName.trim();
                  if (!trimmed) return;
                  addRoute(trimmed);
                  setIsAddRouteOpen(false);
                  setNewRouteName('');
                  setRouteMsg(`নতুন রুট "${trimmed}" সফলভাবে যোগ করা হয়েছে!`);
                  setTimeout(() => setRouteMsg(''), 3500);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    রুটের নাম (Route Name) *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    placeholder="যেমন: রুট ৭: মিরপুর ও মোহাম্মদপুর"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddRouteOpen(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={!newRouteName.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>রুট সংরক্ষণ করুন</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Route Modal in Settings */}
        {editingRoute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Edit2 className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">রুট এডিট করুন</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = editRouteName.trim();
                  if (!trimmed || trimmed === editingRoute) {
                    setEditingRoute(null);
                    return;
                  }
                  updateRoute(editingRoute, trimmed);
                  setEditingRoute(null);
                  setRouteMsg(`রুট "${trimmed}" সফলভাবে আপডেট করা হয়েছে!`);
                  setTimeout(() => setRouteMsg(''), 3500);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    রুটের পরিবর্তিত নাম *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editRouteName}
                    onChange={(e) => setEditRouteName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    নোট: রুটের নাম পরিবর্তন করলে তা সকল খতিয়ানে সুন্দরভাবে আপডেট হবে এবং কোনো রেকর্ড ক্ষতিগ্রস্ত হবে না।
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRoute(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={!editRouteName.trim() || editRouteName.trim() === editingRoute}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>আপডেট সংরক্ষণ করুন</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Backup & Data Persistence Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-bengali">
                ডাটা ব্যাকআপ ও পুনরুদ্ধার (Data Backup & Restore)
              </h2>
              <p className="text-[11px] text-slate-500">
                ব্যবসায়ের সকল হিসাবের ব্যাকআপ সংরক্ষণ করুন এবং প্রয়োজনে সম্পূর্ণ ডাটাবেজ পুনরুদ্ধার করুন
              </p>
            </div>
          </div>
        </div>

        {/* Backup & Safety Reminder */}
        <div className="mb-5 rounded-xl bg-blue-50/80 border border-blue-200 p-3.5 text-xs text-blue-900 flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-blue-950 font-bengali">
              পরামর্শ ও অনুস্মারক (Backup & Safety Reminder):
            </h4>
            <p className="text-[11.5px] leading-relaxed text-blue-800 font-bengali">
              আপনার প্রতিষ্ঠানের হিসাবের নিরাপত্তা নিশ্চিত করতে প্রতিদিন কাজের শেষে{' '}
              <strong className="font-semibold text-blue-900">"ব্যাকআপ সেভ / ডাউনলোড করুন"</strong> বাটনে ক্লিক করে ফাইলটি আপনার
              কম্পিউটারে সংরক্ষণ করে রাখুন। আপনি নিচে আপনার কম্পিউটারের যেকোনো একটি ব্যাকআপ ফোল্ডার সিলেক্ট করে রাখতে পারেন, যাতে প্রতিবার
              বাটনে ক্লিক করলেই স্বয়ংক্রিয়ভাবে কোনো ডায়ালগ ছাড়াই সরাসরি সেই ফোল্ডারে ব্যাকআপ ফাইল জমা হয়।
            </p>
          </div>
        </div>

        {/* Status Messages */}
        {downloadMsg && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium font-bengali">{downloadMsg}</span>
          </div>
        )}

        {restoreSuccessMsg && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold font-bengali block">পুনরুদ্ধার সফল হয়েছে!</span>
              <span className="font-medium font-bengali">{restoreSuccessMsg}</span>
            </div>
          </div>
        )}

        {restoreErrorMsg && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium font-bengali">{restoreErrorMsg}</span>
          </div>
        )}

        {/* Local Folder Auto-Save Banner */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                <Folder className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 font-bengali">
                  কম্পিউটারের নির্দিষ্ট ফোল্ডারে ব্যাকআপ অটো-সেভ
                </h3>
                <p className="text-[11px] text-slate-500 font-bengali mt-0.5">
                  আপনার পিসি বা ল্যাপটপের একটি নির্দিষ্ট ফোল্ডার পছন্দ করে রাখুন যাতে প্রতিবার ক্লিক করলেই সরাসরি সেখানে ব্যাকআপ ফাইল জমা হয়।
                </p>
              </div>
            </div>

            {isFolderSupported ? (
              <button
                type="button"
                onClick={handleSelectFolder}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <FolderPlus className="h-4 w-4" />
                <span>{folderHandle ? 'ব্যাকআপ ফোল্ডার পরিবর্তন করুন' : 'ব্যাকআপ ফোল্ডার সিলেক্ট করুন'}</span>
              </button>
            ) : null}
          </div>

          {/* Connected Folder Status or Fallback Notice */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            {folderHandle && isFolderSupported ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <FolderCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-emerald-950 font-bengali">
                    সংযুক্ত ফোল্ডার: <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">{folderName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="text-[10px] text-emerald-700 font-medium">অটো-সেভ সক্রিয়</span>
                  <button
                    type="button"
                    onClick={handleDisconnectFolder}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                  >
                    সংযোগ বিচ্ছিন্ন করুন
                  </button>
                </div>
              </div>
            ) : isFolderSupported ? (
              <p className="text-[11px] text-slate-500 font-bengali flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>কোনো ফোল্ডার সিলেক্ট করা নেই। ফোল্ডার সিলেক্ট না করলে ব্যাকআপ ফাইলটি স্বাভাবিকভাবে ব্রাউজার ডাউনলোড ফোল্ডারে সেভ হবে।</span>
              </p>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  আপনার বর্তমান ব্রাউজারে (Firefox বা Safari) সরাসরি কম্পিউটারের নির্দিষ্ট ফোল্ডারে অটো-সেভ সমর্থিত নয়। তবে স্বাভাবিক ব্রাউজার ডাউনলোডের মাধ্যমে আপনি ফাইলটি ইচ্ছামতো ফোল্ডারে সংরক্ষণ করতে পারবেন। (Google Chrome, Microsoft Edge বা Brave ব্রাউজারে স্বয়ংক্রিয় লোকাল ফোল্ডার সেভ সমর্থিত)।
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 1. "ব্যাকআপ ডাউনলোড / সেভ করুন" */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white">
                  <Download className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 font-bengali text-sm">
                  ১. ব্যাকআপ সংরক্ষণ ও ডাউনলোড
                </h3>
              </div>
              <p className="text-slate-600 mb-3 leading-relaxed font-bengali text-[11.5px]">
                অ্যাপ্লিকেশনের সম্পূর্ণ ডাটা (দৈনিক বিক্রি হিসাব, কাস্টমার, প্রোডাক্ট, স্টক ও ইনভেন্টরি, কাস্টমার বকেয়া লেজার, লেস, ড্যামেজ, খরচের হিসাব, রুট, SR/DSR, সামগ্রিক ব্যবসায়িক অবস্থান এবং সকল সেটিংস) টাইমস্ট্যাম্পসহ একটি সিঙ্গেল JSON ফাইলে সংরক্ষিত হবে।
              </p>
              <div className="mb-4 rounded-lg bg-white border border-slate-200 p-2.5 text-[11px] text-slate-600 space-y-1 font-bengali">
                <div className="flex items-center justify-between text-slate-500">
                  <span>ফাইল ফরম্যাট:</span>
                  <span className="font-mono font-bold text-slate-700">JSON (.json)</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>ফাইলের নাম নমুনা:</span>
                  <span className="font-mono text-[10px] text-slate-700">mm-traders-backup-YYYY-MM-DD.json</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                  <span>সংরক্ষণ মাধ্যম:</span>
                  <span className="font-semibold text-slate-700">
                    {folderHandle ? `📂 ${folderName} (সরাসরি ফোল্ডারে)` : '📥 স্বাভাবিক ব্রাউজার ডাউনলোড'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isFolderSaving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white shadow-xs hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer font-bengali text-xs disabled:opacity-50"
            >
              {isFolderSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>ব্যাকআপ সেভ হচ্ছে...</span>
                </>
              ) : folderHandle ? (
                <>
                  <FolderCheck className="h-4 w-4 text-emerald-400" />
                  <span>সরাসরি ফোল্ডারে ব্যাকআপ সেভ করুন</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>ব্যাকআপ ডাউনলোড করুন</span>
                </>
              )}
            </button>
          </div>

          {/* 2. "ব্যাকআপ থেকে পুনরুদ্ধার করুন" (Restore from Backup) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white">
                  <Upload className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-900 font-bengali text-sm">
                  ২. ব্যাকআপ থেকে পুনরুদ্ধার করুন
                </h3>
              </div>
              <p className="text-slate-600 mb-3 leading-relaxed font-bengali text-[11.5px]">
                পূর্বে ডাউনলোডকৃত ব্যাকআপ JSON ফাইল নির্বাচন করুন। ফাইলটি যাচাই করার পর নিরাপত্তা পিন (Security PIN) নিশ্চিত করে বর্তমান ডাটাবেজ প্রতিস্থাপন করে রিস্টোর সম্পন্ন হবে।
              </p>
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800 flex items-start gap-1.5 font-bengali">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  সতর্কতা: রিস্টোর করার পূর্বে ফাইল যাচাই এবং মালিকের নিরাপত্তা পিন আবশ্যক। ভুল বা করাপ্ট ফাইলে ডাটাবেজ অক্ষত থাকবে।
                </span>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file-upload-input"
              />
              <label
                htmlFor="backup-file-upload-input"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-800 shadow-xs hover:bg-slate-100 hover:border-slate-400 active:scale-[0.99] transition-all cursor-pointer font-bengali text-xs"
              >
                <Upload className="h-4 w-4 text-slate-700" />
                <span>ব্যাকআপ থেকে পুনরুদ্ধার করুন</span>
              </label>
            </div>
          </div>
        </div>

        {/* Reset to initial data */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <h4 className="font-bold text-rose-800 font-bengali text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              প্রাথমিক ডেটা পুনরুদ্ধার (Reset to Initial Data)
            </h4>
            <p className="text-slate-600 font-bengali text-[11.5px] leading-relaxed">
              সতর্কতা: এটি সকল ব্যবসায়িক ডেটা স্থায়ীভাবে মুছে ফেলবে এবং কোনো ব্যাকআপ ছাড়া পুনরুদ্ধারযোগ্য নয়।
            </p>
            <p className="text-slate-400 font-bengali text-[10.5px]">
              দৈনিক হিসাব, বাকি/Due, কাস্টমার, স্টক, পণ্য, খরচ, লেস, ড্যামেজ, রুট, এসআর/ডিএসআর সব খালি হবে। শুধুমাত্র প্রতিষ্ঠানের নাম, ডিস্ট্রিবিউটর, ফোন, মালিকের নাম ও পিন অক্ষত থাকবে।
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenResetModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-700 transition-colors font-bengali shadow-xs cursor-pointer shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            <span>প্রাথমিক ডেটা পুনরুদ্ধার (সকল ডাটা মুছুন)</span>
          </button>
        </div>
      </div>

      {/* PIN Confirmation Modal for Reset to Blank */}
      {isResetPinModalOpen && (
        <PinPromptModal
          isOpen={isResetPinModalOpen}
          title="প্রাথমিক ডেটা পুনরুদ্ধার (সকল ডাটা মুছুন)"
          subtitle="দৈনিক হিসাব, বাকি/Due, কাস্টমার তালিকা ও লেজার, পণ্য ও স্টক, খরচ, লেস, ড্যামেজ, রুট, এসআর/ডিএসআর এবং ব্যবসার সার্বিক হিসাবের সকল তথ্য স্থায়ীভাবে মুছে সম্পূর্ণরূপে শূন্য (খালি) করা হবে।"
          warning="সতর্কতা: এটি সকল ব্যবসায়িক ডেটা স্থায়ীভাবে মুছে ফেলবে এবং কোনো ব্যাকআপ ছাড়া পুনরুদ্ধারযোগ্য নয়।"
          confirmButtonText="হ্যাঁ, সকল ডাটা মুছে খালি করুন"
          confirmButtonVariant="danger"
          correctPin={db.settings.securityPin || currentUser?.pin || '1234'}
          onSuccess={handleConfirmReset}
          onClose={() => setIsResetPinModalOpen(false)}
        />
      )}

      {/* PIN Confirmation Modal for Restore */}
      {isPinModalOpen && (
        <PinPromptModal
          isOpen={isPinModalOpen}
          title="ব্যাকআপ থেকে ডাটাবেজ পুনরুদ্ধার করুন"
          subtitle={
            pendingRestore?.fileName
              ? `ফাইল: ${pendingRestore.fileName} (${pendingRestore.validation.summary?.date ? `তারিখ: ${pendingRestore.validation.summary.date}` : 'তারিখ অপ্রাপ্য'})`
              : 'বর্তমান ডাটাবেজের সকল তথ্য ব্যাকআপ ফাইলের ডাটা দিয়ে প্রতিস্থাপন করা হবে'
          }
          itemName={
            pendingRestore?.validation.summary
              ? `কাস্টমার: ${pendingRestore.validation.summary.customersCount} জন | পণ্য: ${pendingRestore.validation.summary.productsCount} টি | দৈনিক হিসাব: ${pendingRestore.validation.summary.sheetsCount} টি | খরচ: ${pendingRestore.validation.summary.expensesCount} টি`
              : undefined
          }
          warning="সতর্কতা: এটি বর্তমান সকল ডেটা প্রতিস্থাপন করবে। এগিয়ে যাওয়ার আগে নিশ্চিত হন।"
          confirmButtonText="হ্যাঁ, পুনরুদ্ধার করুন"
          confirmButtonVariant="danger"
          correctPin={db.settings.securityPin || currentUser?.pin || '1234'}
          onSuccess={handleConfirmRestore}
          onClose={handleClosePinModal}
        />
      )}
    </div>
  );
};
