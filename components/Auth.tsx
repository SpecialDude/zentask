
import React, { useEffect, useState } from 'react';
import {
  fetchAuthProviders,
  login,
  requestPasswordReset,
  signInWithGoogle,
  signup,
} from '../services/authClient';

type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthProps {
  onSuccess?: () => void;
  initialError?: string | null;
}

const Auth: React.FC<AuthProps> = ({ onSuccess, initialError }) => {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAuthProviders().then((providers) => {
      if (!cancelled) setGoogleEnabled(providers.google);
    });
    return () => { cancelled = true; };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (authMode === 'signup') {
        const detail = await signup(email, password);
        setSuccessMessage(detail);
        setAuthMode('login');
      } else if (authMode === 'login') {
        await login(email, password);
        onSuccess?.();
      } else if (authMode === 'forgot-password') {
        const detail = await requestPasswordReset(email);
        setSuccessMessage(detail);
        setAuthMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signup': return 'Create your productivity hub';
      case 'forgot-password': return 'Reset your password';
      default: return 'Welcome back to your flow';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Processing...';
    switch (authMode) {
      case 'signup': return 'Sign Up';
      case 'forgot-password': return 'Send Reset Email';
      default: return 'Log In';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden p-8 space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center space-y-2">
          <button
            onClick={() => { window.location.href = '/home'; }}
            className="mx-auto block hover:opacity-80 transition-opacity"
          >
            <div className="mx-auto w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">ZenTask</h1>
          </button>
          <p className="text-slate-500 dark:text-slate-400">{getTitle()}</p>
        </div>

        {googleEnabled && authMode !== 'forgot-password' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
              </svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600">
              <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              or
              <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl px-5 py-3 text-sm transition-all outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {authMode !== 'forgot-password' && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl px-5 py-3 pr-12 text-sm transition-all outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setAuthMode('forgot-password'); setError(null); setSuccessMessage(null); }}
                  className="text-xs text-primary hover:underline ml-1"
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getButtonText()}
          </button>
        </form>

        <div className="text-center space-y-2">
          {authMode === 'forgot-password' ? (
            <button
              onClick={() => { setAuthMode('login'); setError(null); setSuccessMessage(null); }}
              className="text-sm text-slate-500 hover:text-primary transition-colors"
            >
              ← Back to Login
            </button>
          ) : (
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(null); setSuccessMessage(null); }}
              className="text-sm text-slate-500 hover:text-primary transition-colors"
            >
              {authMode === 'signup' ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
