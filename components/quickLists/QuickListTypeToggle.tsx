import React from 'react';
import { ListType } from '../../types';

interface QuickListTypeToggleProps {
    type: ListType;
    onTypeChange: (type: ListType) => void;
}

const QuickListTypeToggle: React.FC<QuickListTypeToggleProps> = ({ type, onTypeChange }) => {
    return (
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-0.5">
            <button
                onClick={() => onTypeChange('bullet')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${type === 'bullet' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Bullet List"
            >
                <span className="text-lg leading-none">•</span>
            </button>
            <button
                onClick={() => onTypeChange('checkbox')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${type === 'checkbox' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Checklist"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            </button>
            <button
                onClick={() => onTypeChange('numbered')}
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${type === 'numbered' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                title="Numbered List"
            >
                <span className="text-xs font-bold">123</span>
            </button>
        </div>
    );
};

export default QuickListTypeToggle;
