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
