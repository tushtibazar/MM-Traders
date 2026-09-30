import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, Check, X, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { db, currentUser, switchUser, logout } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const targetUser = db.users.find((u) => u.id === selectedUserId);

  const handleSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = switchUser(selectedUserId, pin);
    if (success) {
      setPin('');
      onClose();
    } else {
      setError('ভুল পিন কোড! অনুগ্রহ করে আপনার সঠিক পিন কোড দিন।');
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-bengali">
                ইউজার / রোল পরিবর্তন (Switch User)
              </h3>
              <p className="text-xs text-slate-500">মালিক (Owner) বা বিক্রয় প্রতিনিধি (SR) নির্বাচন করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSwitch} className="mt-4 space-y-4 text-xs">
          {error && (
            <div className="rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-2">ইউজার নির্বাচন করুন:</label>
            <div className="space-y-2">
              {db.users.map((user) => {
                const isSelected = selectedUserId === user.id;
                const isOwner = user.role === 'owner';

                return (
                  <label
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setError('');
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          isOwner ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                      />
                      <div>
                        <strong className="text-slate-900 text-sm block">{user.name}</strong>
                        <span className="text-slate-500 text-[11px]">
                          {isOwner ? 'Owner / Admin (পূর্ণ অ্যাক্সেস)' : 'Sales Representative (SR)'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      {isSelected ? (
                        <span className="font-semibold text-emerald-600">নির্বাচিত</span>
                      ) : (
                        <span className="text-slate-300">••••</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5 text-slate-400" /> ৪ ডিজিট পিন কোড দিন (PIN)
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg font-bold tracking-widest text-slate-900 focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              id="auth-modal-logout-btn"
              onClick={() => {
                onClose();
                logout();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              title="লগ আউট করুন"
            >
              <LogOut className="h-4 w-4 text-rose-600" />
              <span>লগ আউট</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700 shadow-xs cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>লগইন / সুইচ করুন</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
