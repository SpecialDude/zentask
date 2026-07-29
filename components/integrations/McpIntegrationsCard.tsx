import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { fetchUserApiKeys, createApiKey, revokeApiKey, UserApiKey } from '../../services/apiKeyService';

interface McpIntegrationsCardProps {
  userId?: string;
}

export const McpIntegrationsCard: React.FC<McpIntegrationsCardProps> = ({ userId }) => {
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (userId) {
      loadKeys();
    }
  }, [userId]);

  const loadKeys = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const keys = await fetchUserApiKeys(userId);
      setApiKeys(keys);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !newKeyName.trim()) return;
    setMessage(null);
    try {
      const result = await createApiKey(userId, newKeyName);
      setCreatedRawToken(result.rawToken);
      setNewKeyName('');
      setMessage({ type: 'success', text: 'API Key generated! Copy it now — it won\'t be shown again.' });
      loadKeys();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create key' });
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!userId) return;
    try {
      await revokeApiKey(keyId, userId);
      setMessage({ type: 'success', text: 'Key revoked successfully' });
      loadKeys();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke key' });
    }
  };

  const mcpUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
      {/* Card Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Model Context Protocol (MCP)</h2>
              <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
                AI Assistants
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect ZenTask to Claude.ai, Claude Desktop, Cursor, Antigravity, or custom LLM agents.
            </p>
          </div>
        </div>
      </div>

      {/* Claude.ai / Claude Desktop Connector Option */}
      <div className="p-5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              Option A: Claude.ai &amp; Claude Desktop (OAuth Connector)
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold rounded-md">
            Recommended
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Copy the MCP Remote URL below and paste it directly into Claude under <em>Settings &rarr; Connectors &rarr; Add Custom MCP Server</em>. Claude will prompt you to log in securely!
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={mcpUrl}
            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(mcpUrl);
              setMessage({ type: 'success', text: 'Claude MCP URL copied to clipboard!' });
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy URL</span>
          </button>
        </div>
      </div>

      {/* Option B: API Keys for CLI & IDEs */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Option B: API Keys for Claude Code CLI, Cursor &amp; Custom Agents
        </h3>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Newly Created Key Alert Box */}
        {createdRawToken && (
          <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Your New API Key &amp; Connection Commands (Copy Now!)
              </span>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Save these commands now. This raw token will not be shown again.
              </p>
            </div>

            {/* Claude Code command */}
            <div className="p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono rounded font-bold">Claude Code CLI</span>
                  Run in Terminal
                </span>
                <button
                  onClick={() => {
                    const cmd = `claude mcp add --transport sse zentask "${mcpUrl}?key=${createdRawToken}"`;
                    navigator.clipboard.writeText(cmd);
                    setMessage({ type: 'success', text: 'Claude Code command copied!' });
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Copy Command
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={`claude mcp add --transport sse zentask "${mcpUrl}?key=${createdRawToken}"`}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-none"
              />
            </div>

            {/* Direct SSE URL */}
            <div className="p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-mono rounded font-bold">Cursor / OpenCode / Remote SSE</span>
                  Direct Key URL
                </span>
                <button
                  onClick={() => {
                    const url = `${mcpUrl}?key=${createdRawToken}`;
                    navigator.clipboard.writeText(url);
                    setMessage({ type: 'success', text: 'Direct Key URL copied!' });
                  }}
                  className="px-3 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all"
                >
                  Copy URL
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={`${mcpUrl}?key=${createdRawToken}`}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-none"
              />
            </div>
          </div>
        )}

        {/* Generate Key Form */}
        <form onSubmit={handleCreate} className="flex items-end gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
              Generate New API Key
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Claude Code CLI, Cursor IDE"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!newKeyName.trim()}
            className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 flex-shrink-0"
          >
            Generate Key
          </button>
        </form>

        {/* Active Connected Services & API Keys List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Active Connected Services &amp; API Keys
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {apiKeys.length} {apiKeys.length === 1 ? 'key' : 'keys'} active
            </span>
          </div>

          {loading ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-400 italic">
              Loading active connections...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              No active API keys found. Generate a key above or copy the OAuth URL to connect <strong>Claude.ai</strong>, <strong>Claude Desktop</strong>, or <strong>Cursor</strong>.
            </div>
          ) : (
            apiKeys.map((key) => {
              const lastUsed = key.last_used_at ? Number(key.last_used_at) : null;
              const diffMs = lastUsed ? Date.now() - lastUsed : null;
              const diffMins = diffMs !== null ? Math.floor(diffMs / 60000) : null;
              const diffHours = diffMins !== null ? Math.floor(diffMins / 60) : null;
              const diffDays = diffHours !== null ? Math.floor(diffHours / 24) : null;

              let statusText = 'Never used';
              let isRecent = false;
              if (diffMins !== null) {
                if (diffMins < 1) { statusText = 'Active just now'; isRecent = true; }
                else if (diffMins < 60) { statusText = `Active ${diffMins}m ago`; isRecent = diffMins <= 15; }
                else if (diffHours! < 24) { statusText = `Active ${diffHours}h ago`; }
                else if (diffDays! < 7) { statusText = `Active ${diffDays}d ago`; }
                else { statusText = `Last active ${new Date(lastUsed!).toLocaleDateString()}`; }
              }

              return (
                <div key={key.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-600">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="relative flex h-2.5 w-2.5">
                        {isRecent && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${lastUsed ? (isRecent ? 'bg-emerald-500' : 'bg-emerald-600/70') : 'bg-slate-300 dark:bg-slate-600'}`} />
                      </span>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{key.name}</p>
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded">
                        API Key
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
                      <span className="truncate">{key.key_prefix}</span>
                      <span>•</span>
                      <span className={lastUsed ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                        {statusText}
                      </span>
                      <span>•</span>
                      <span>Created {new Date(Number(key.created_at)).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-xl border border-red-200 dark:border-red-900/60 transition-all flex-shrink-0"
                  >
                    Revoke Key
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
