import React, { useState } from 'react';
import { ShieldCheck, Lock, LogIn, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../brand/BrandLogo';

export const LoginScreen: React.FC = () => {
  const { db, login, currentUser } = useApp();

  // Default to currentUser or the owner user or the first user in db
  const defaultUser =
    db.users.find((u) => u.id === currentUser?.id) ||
    db.users.find((u) => u.role === 'owner') ||
    db.users[0];

  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUser ? defaultUser.id : '');
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUserId) {
      setError('অনুগ্রহ করে একজন ইউজার নির্বাচন করুন।');
      return;
    }

    if (!pin.trim()) {
      setError('অনুগ্রহ করে পিন কোড প্রদান করুন।');
      return;
    }

    setIsLoading(true);

    // Verify PIN through login function
    const success = login(selectedUserId, pin.trim());

    if (!success) {
      setIsLoading(false);
      setError('ভুল পিন কোড! অনুগ্রহ করে আপনার সঠিক পিন কোড দিন।');
      setPin('');
    } else {
      setIsLoading(false);
    }
  };

  const selectedUser = db.users.find((u) => u.id === selectedUserId);

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-8 relative overflow-hidden select-none">
      {/* Background ambient decorative glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Branding & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <BrandLogo size="lg" lightText showSubtitle />
          </div>
          <h2 className="text-lg font-bold text-white font-bengali">
            {db.settings.businessName || 'MM TRADERS'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {db.settings.subtitle || 'ডিস্ট্রিবিউটর হিসাব ও লেজার ম্যানেজমেন্ট'}
          </p>
          {db.settings.proprietorName && (
            <p className="text-[11px] text-amber-300/80 mt-1 font-medium">
              মালিক: {db.settings.proprietorName}
            </p>
          )}
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md p-6 sm:p-7 text-slate-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-bengali">সিস্টেম লগইন</h3>
                <p className="text-[11px] text-slate-400">আপনার একাউন্ট নির্বাচন করে পিন দিন</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> সুরক্ষিত
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* User Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                ইউজার / পদবী নির্বাচন করুন:
              </label>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {db.users.map((user) => {
                  const isSelected = selectedUserId === user.id;
                  const isOwner = user.role === 'owner';

                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setError('');
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-sm ring-1 ring-emerald-500/40'
                          : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-3 w-3 rounded-full shrink-0 ${
                            isOwner ? 'bg-emerald-400' : 'bg-blue-400'
                          }`}
                        />
                        <div className="truncate">
                          <strong
                            className={`text-sm block truncate font-bengali ${
                              isSelected ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {user.name}
                          </strong>
                          <span className="text-[11px] text-slate-400">
                            {isOwner ? 'Owner / Admin (মালিক)' : 'Sales Representative (SR)'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="h-5 w-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                            <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-slate-700" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  নিরাপত্তা পিন (Security PIN):
                </label>
                {selectedUser && (
                  <span className="text-[11px] text-slate-400">
                    লগইন হচ্ছে: <strong className="text-emerald-400">{selectedUser.name}</strong>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ''));
                    if (error) setError('');
                  }}
                  placeholder="••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-center text-xl font-bold tracking-widest text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label="পিন দেখুন বা লুকান"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 px-4 py-3 font-bold text-white text-sm shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>লগইন করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Notice */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400">
              সকল ব্যবসায়িক তথ্য ও খতিয়ান ফায়ারবেস ক্লাউডে সম্পূর্ণ সুরক্ষিত রয়েছে।
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400">
          MM TRADERS • ডিস্ট্রিবিউটর বিজনেস ম্যানেজমেন্ট সিস্টেম
        </div>
      </div>
    </div>
  );
};
