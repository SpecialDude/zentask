import React from 'react';

interface QuickListDeleteConfirmProps {
    title: string;
    onCancel: () => void;
    onConfirm: () => void;
}

const QuickListDeleteConfirm: React.FC<QuickListDeleteConfirmProps> = ({
    title,
    onCancel,
    onConfirm
}) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-red-100 dark:border-red-900/30 animate-in zoom-in duration-200">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete this list?</h3>
                <p className="text-slate-500 mb-6 text-sm">"{title || 'Untitled List'}" will be permanently deleted.</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickListDeleteConfirm;
