import React from 'react';
import { JiraConnection } from '../../types';

interface JiraConnectButtonProps {
    connection: JiraConnection | null;
    isLoading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
}

const JiraConnectButton: React.FC<JiraConnectButtonProps> = ({ connection, isLoading, onConnect, onDisconnect }) => {
    if (isLoading) {
        return (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32" />
            </div>
        );
    }

    if (connection) {
        return (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Jira Logo */}
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                                <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024.013 12.487V1.005A1.005 1.005 0 0023.013 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">Jira Cloud</h3>
                                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">Connected</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {connection.site_name} · {connection.atlassian_email}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onDisconnect}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-7 h-7 text-slate-400" fill="currentColor">
                            <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024.013 12.487V1.005A1.005 1.005 0 0023.013 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Jira Cloud</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Connect to sync tasks bidirectionally</p>
                    </div>
                </div>
                <button
                    onClick={onConnect}
                    className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-600/20 transition-colors"
                >
                    Connect
                </button>
            </div>
        </div>
    );
};

export default JiraConnectButton;
