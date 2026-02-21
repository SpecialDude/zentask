import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}

/**
 * StatCard - Displays a single metric in a visually appealing card.
 * Used within the Admin Analytics dashboard.
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        {/* Background blob decoration */}
        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:scale-150 transition-transform duration-700 ${color}`} />

        <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </div>
        <div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {value}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {title}
            </p>
            {subtitle && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {subtitle}
                </p>
            )}
        </div>
    </div>
);

export default StatCard;
