import React, { useState } from 'react';
import { Task, TaskCategory } from '../types';
import { supabase } from '../supabase';

interface SettingsProps {
    tasks: Task[];
    userEmail: string;
    userName: string;
    onNameUpdate: (name: string) => void;
    categories: TaskCategory[];
    onAddCategory: (name: string, color: string) => Promise<any>;
    onUpdateCategory: (id: string, updates: Partial<TaskCategory>) => Promise<any>;
    onRemoveCategory: (id: string) => Promise<any>;
}

const Settings: React.FC<SettingsProps> = ({ 
    tasks, userEmail, userName, onNameUpdate, 
    categories, onAddCategory, onUpdateCategory, onRemoveCategory 
}) => {
    const [displayName, setDisplayName] = useState(userName);
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [exportLoading, setExportLoading] = useState(false);

    // Category State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

    // MCP / API Keys State
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [apiKeysLoading, setApiKeysLoading] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdRawToken, setCreatedRawToken] = useState<string | null>(null);
    const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    React.useEffect(() => {
        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        setApiKeysLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { fetchUserApiKeys } = await import('../services/apiKeyService');
                const keys = await fetchUserApiKeys(user.id);
                setApiKeys(keys);
            }
        } catch (err) {
            console.error('Failed to load API keys:', err);
        } finally {
            setApiKeysLoading(false);
        }
    };

    const handleCreateApiKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setKeyMessage(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setKeyMessage({ type: 'error', text: 'User session not found' });
                return;
            }
            const { createApiKey } = await import('../services/apiKeyService');
            const result = await createApiKey(user.id, newKeyName || 'MCP Client Key');
            setCreatedRawToken(result.rawToken);
            setNewKeyName('');
            setKeyMessage({ type: 'success', text: 'API Key generated successfully! Save it now; it won\'t be shown again.' });
            loadApiKeys();
        } catch (err: any) {
            setKeyMessage({ type: 'error', text: err.message || 'Failed to generate API Key' });
        }
    };

    const handleRevokeApiKey = async (keyId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { revokeApiKey } = await import('../services/apiKeyService');
            await revokeApiKey(keyId, user.id);
            setKeyMessage({ type: 'success', text: 'API Key revoked successfully' });
            loadApiKeys();
        } catch (err: any) {
            setKeyMessage({ type: 'error', text: err.message || 'Failed to revoke API key' });
        }
    };


    const handleNameUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameMessage(null);

        if (!displayName.trim()) {
            setNameMessage({ type: 'error', text: 'Name cannot be empty' });
            return;
        }

        setNameLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { display_name: displayName.trim() }
            });
            if (error) throw error;
            onNameUpdate(displayName.trim());
            setNameMessage({ type: 'success', text: 'Name updated successfully!' });
        } catch (err: any) {
            setNameMessage({ type: 'error', text: err.message || 'Failed to update name' });
        } finally {
            setNameLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password' });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setCategoryLoading(true);
        const success = await onAddCategory(newCategoryName.trim(), newCategoryColor);
        if (success) {
            setNewCategoryName('');
            setNewCategoryColor('#3b82f6');
        }
        setCategoryLoading(false);
    };

    const confirmDeleteCategory = async () => {
        if (!deleteCategoryId) return;
        await onRemoveCategory(deleteCategoryId);
        setDeleteCategoryId(null);
    };

    const exportToJSON = () => {
        setExportLoading(true);
        try {
            const data = JSON.stringify(tasks, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zentask-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setExportLoading(false);
        }
    };

    const exportToCSV = () => {
        setExportLoading(true);
        try {
            const headers = ['id', 'title', 'description', 'status', 'priority', 'date', 'startTime', 'duration', 'completion', 'isRecurring', 'recurrencePattern', 'parentId', 'createdAt', 'updatedAt'];
            const csvRows = [headers.join(',')];

            tasks.forEach(task => {
                const row = headers.map(h => {
                    const value = (task as any)[h];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return String(value);
                });
                csvRows.push(row.join(','));
            });

            const csv = csvRows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zentask-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100 mb-8">Settings</h1>

            {/* Account Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Account
                </h2>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Email</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{userEmail}</p>
                </div>

                {nameMessage && (
                    <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${nameMessage.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600'
                        }`}>
                        {nameMessage.text}
                    </div>
                )}

                <form onSubmit={handleNameUpdate} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="Enter your name"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={nameLoading || displayName === userName}
                        className="w-full py-3 bg-primary hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {nameLoading ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : 'Update Name'}
                    </button>
                </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Change Password
                </h2>

                {passwordMessage && (
                    <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${passwordMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-600'
                        }`}>
                        {passwordMessage.text}
                    </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="Enter new password"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="Confirm new password"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full py-3 bg-primary hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {passwordLoading ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : 'Update Password'}
                    </button>
                </form>
            </div>

            {/* Categories Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Categories
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                    Manage categories to group and organize your tasks.
                </p>

                {/* List Categories */}
                <div className="space-y-3 mb-6">
                    {categories.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No categories created yet.</p>
                    ) : (
                        categories.map(category => (
                            <div key={category.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-700"
                                        style={{ backgroundColor: category.color }}
                                    ></div>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{category.name}</span>
                                </div>
                                <button
                                    onClick={() => setDeleteCategoryId(category.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete Category"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Category Form */}
                <form onSubmit={handleCreateCategory} className="flex items-end gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                    <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            New Category
                        </label>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Work, Personal"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Color
                        </label>
                        <input
                            type="color"
                            value={newCategoryColor}
                            onChange={(e) => setNewCategoryColor(e.target.value)}
                            className="h-11 w-14 p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={categoryLoading || !newCategoryName.trim()}
                        className="h-11 px-6 bg-primary hover:bg-indigo-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add
                    </button>
                </form>
            </div>

            {/* Data Export Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Export Data
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                    Download all your task data. Choose your preferred format.
                </p>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Tasks</p>
                    <p className="text-2xl font-black text-primary">{tasks.length}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={exportToJSON}
                        disabled={exportLoading || tasks.length === 0}
                        className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        JSON
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={exportLoading || tasks.length === 0}
                        className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        CSV
                    </button>
                </div>
            </div>

            {/* MCP Integration & API Keys Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Model Context Protocol (MCP) & API Keys
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                    Connect ZenTask to your local or remote AI assistants (Claude Desktop, Antigravity, Cursor, Codex). Generate personal API keys to allow AI agents to manage your tasks and lists securely.
                </p>

                {/* Integration Quick Start Banner for Claude Connectors */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                                Claude.ai &amp; Claude Desktop (OAuth Connector)
                            </h3>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-bold rounded-full">
                            Recommended for Claude Web / Desktop
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        To add ZenTask to <strong>Claude.ai</strong> or <strong>Claude Desktop</strong>, simply copy the URL below and paste it into Claude under <em>Settings &rarr; Connectors &rarr; Add Custom MCP Server</em>. No API key needed — Claude will prompt you to log in securely!
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/api/mcp`}
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-none"
                        />
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/api/mcp`;
                                navigator.clipboard.writeText(url);
                                setKeyMessage({ type: 'success', text: 'Claude Remote MCP URL copied to clipboard!' });
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy URL</span>
                        </button>
                    </div>
                </div>

                {keyMessage && (
                    <div className={`p-4 rounded-xl mb-4 text-sm font-semibold flex items-center justify-between ${
                        keyMessage.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                        <span>{keyMessage.text}</span>
                        <button onClick={() => setKeyMessage(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                {createdRawToken && (
                    <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl mb-6 space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    Your New API Key & MCP Connections (Copy Now!)
                                </span>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-300">
                                Save these commands and URLs now. You won't be able to see this token again!
                            </p>
                        </div>

                        {/* Option 1: Claude Code CLI Command */}
                        <div className="p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono rounded font-bold">Claude Code CLI</span>
                                    Run in Terminal
                                </span>
                                <button
                                    onClick={() => {
                                        const cmd = `claude mcp add --transport sse zentask "${window.location.origin}/api/mcp?key=${createdRawToken}"`;
                                        navigator.clipboard.writeText(cmd);
                                        setKeyMessage({ type: 'success', text: 'Claude Code command copied to clipboard!' });
                                    }}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1"
                                >
                                    <span>Copy Command</span>
                                </button>
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={`claude mcp add --transport sse zentask "${window.location.origin}/api/mcp?key=${createdRawToken}"`}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-none"
                            />
                        </div>

                        {/* Option 2: Generic SSE / Cursor / OpenCode URL */}
                        <div className="p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-mono rounded font-bold">Cursor / OpenCode / Remote SSE</span>
                                    Direct MCP URL
                                </span>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/api/mcp?key=${createdRawToken}`;
                                        navigator.clipboard.writeText(url);
                                        setKeyMessage({ type: 'success', text: 'MCP URL copied to clipboard!' });
                                    }}
                                    className="px-3 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all"
                                >
                                    <span>Copy URL</span>
                                </button>
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/api/mcp?key=${createdRawToken}`}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 select-all outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Active Connected Services & API Keys List */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Active Connected Services &amp; API Keys
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono">
                            {apiKeys.length} {apiKeys.length === 1 ? 'key' : 'keys'} active
                        </span>
                    </div>

                    {apiKeysLoading ? (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-400 italic">
                            Loading connections...
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            No active API keys found. Generate a key below or copy the OAuth URL above to connect <strong>Claude.ai</strong>, <strong>Claude Desktop</strong>, or <strong>Cursor</strong>.
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
                                            {/* Status Dot */}
                                            <span className="relative flex h-2.5 w-2.5">
                                                {isRecent && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${lastUsed ? (isRecent ? 'bg-emerald-500' : 'bg-emerald-600/70') : 'bg-slate-300 dark:bg-slate-600'}`} />
                                            </span>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{key.name}</p>
                                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold rounded">
                                                API Key
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
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
                                        onClick={() => handleRevokeApiKey(key.id)}
                                        className="px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600 rounded-xl border border-red-200 dark:border-red-900/60 transition-all flex-shrink-0"
                                    >
                                        Revoke Key
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Create Key Form */}
                <form onSubmit={handleCreateApiKey} className="flex items-end gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                    <div className="flex-1">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Key Name
                        </label>
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g., Claude Desktop, Antigravity Client"
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newKeyName.trim()}
                        className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Generate Key
                    </button>
                </form>
            </div>


            {/* App Info */}
            <div className="text-center text-xs text-slate-400 py-4">
                <p className="font-bold">ZenTask</p>
                <p>Hierarchical Productivity Tracker</p>
            </div>

            {/* Delete Category Confirmation Modal */}
            {deleteCategoryId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Delete Category?</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Are you sure you want to delete this category? Any tasks using it will have their category removed, but the tasks themselves will not be deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteCategoryId(null)}
                                className="flex-1 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteCategory}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
