import React, { useState } from 'react';

/**
 * OAuth Consent / Login page.
 * Rendered when Claude (or any MCP client) redirects the user here
 * to authorize access to their ZenTask account.
 *
 * Uses the exact same design language, Tailwind CSS classes, and light/dark theme support as Auth.tsx.
 */
const OAuthConsent: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const redirectUri = params.get('redirect_uri') || '';
  const state = params.get('state') || '';
  const codeChallenge = params.get('code_challenge') || '';
  const codeChallengeMethod = params.get('code_challenge_method') || 'S256';
  const clientId = params.get('client_id') || '';
  const scope = params.get('scope') || 'authenticated';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          redirect_uri: redirectUri,
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          client_id: clientId,
          scope,
        }),
      });

      const data = await res.json();
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  // Derive a display name from the client_id
  const clientName = clientId.includes('claude') ? 'Claude' : 'MCP Client';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6 animate-in fade-in zoom-in duration-300">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">ZenTask</h1>
          <p className="text-slate-500 dark:text-slate-400">Authorize access to your account</p>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 leading-relaxed">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">{clientName}</strong> wants permission to manage your tasks, quick lists, and categories on your behalf.
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl px-5 py-3 text-sm transition-all outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl px-5 py-3 pr-12 text-sm transition-all outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Authorizing…</span>
              </>
            ) : (
              'Authorize & Connect'
            )}
          </button>
        </form>

        {/* Redirect Footer Info */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
            Redirecting to: {redirectUri ? redirectUri.split('?')[0] : 'Callback URL'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthConsent;
