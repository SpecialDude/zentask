import React, { useState } from 'react';
import { Task } from '../types';
import { supabase } from '../supabase';

interface SettingsProps {
    tasks: Task[];
    userEmail: string;
    userName: string;
    onNameUpdate: (name: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ tasks, userEmail, userName, onNameUpdate }) => {
    const [displayName, setDisplayName] = useState(userName);
    const [nameLoading, setNameLoading] = useState(false);
    const [nameMessage, setNameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [exportLoading, setExportLoading] = useState(false);

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

            {/* App Info */}
            <div className="text-center text-xs text-slate-400 py-4">
                <p className="font-bold">ZenTask</p>
                <p>Hierarchical Productivity Tracker</p>
            </div>
        </div>
    );
};

export default Settings;
