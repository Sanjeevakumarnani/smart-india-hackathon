import { apiFetch, apiUrl } from '../config/api';
import React, { useState } from 'react';
import { Shield, Lock, User, Key, ArrowRight, AlertCircle, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'doctor' | 'staff';
  fullName: string;
  employeeId?: string;
  department?: string;
}

interface StaffLoginScreenProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onBackToKiosk: () => void;
}

export const StaffLoginScreen: React.FC<StaffLoginScreenProps> = ({
  onLoginSuccess,
  onBackToKiosk,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token & user
      localStorage.setItem('medikiosk_token', data.token);
      localStorage.setItem('medikiosk_user', JSON.stringify(data.user));

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to connect to authentication service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar back button */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onBackToKiosk}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 backdrop-blur"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Patient Kiosk</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-teal-500/20 mx-auto">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-white">
          Hospital Staff & Physician Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Role-governed clinical console, triage queue & system administration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/90 border border-slate-700/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-md">
          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Staff Username or Employee ID
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. doctor1 or DOC-001"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating credentials...</span>
              ) : (
                <>
                  <span>Sign In to Clinical Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Preset One-Click Role Testing Badges */}
          <div className="mt-6 pt-6 border-t border-slate-700/80">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Role Switch (Demo / Verification)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('doctor1', 'Doctor@123')}
                className="px-2.5 py-2 bg-slate-900/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="text-[11px] font-bold text-teal-400">Doctor</div>
                <div className="text-[9px] text-slate-400">doctor1</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('staff1', 'Staff@123')}
                className="px-2.5 py-2 bg-slate-900/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="text-[11px] font-bold text-amber-400">Staff Nurse</div>
                <div className="text-[9px] text-slate-400">staff1</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'Admin@123')}
                className="px-2.5 py-2 bg-slate-900/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-colors"
              >
                <div className="text-[11px] font-bold text-indigo-400">Admin</div>
                <div className="text-[9px] text-slate-400">admin</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

