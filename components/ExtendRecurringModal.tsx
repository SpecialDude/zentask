import React, { useState } from 'react';

interface ExtendRecurringModalProps {
    taskTitle: string;
    onClose: () => void;
    onExtend: (occurrences: number) => void;
    onEnd: () => void;
}

const ExtendRecurringModal: React.FC<ExtendRecurringModalProps> = ({
    taskTitle,
    onClose,
    onExtend,
    onEnd
}) => {
    const [customCount, setCustomCount] = useState(7);
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    const quickOptions = [
        { label: '+7 days', value: 7 },
        { label: '+14 days', value: 14 },
        { label: '+30 days', value: 30 },
    ];

    if (showEndConfirm) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">End Recurring Series?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                No more instances of "{taskTitle}" will be created. Existing instances will remain.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            onClick={() => setShowEndConfirm(false)}
                            className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => { onEnd(); onClose(); }}
                            className="flex-1 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-lg shadow-amber-500/20 transition-all"
                        >
                            End Series
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Extend Recurring Series</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            "{taskTitle}" - Add more occurrences
                        </p>
                    </div>
                </div>

                {/* Quick Options */}
                <div className="space-y-2 mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Extend</p>
                    <div className="grid grid-cols-3 gap-2">
                        {quickOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { onExtend(opt.value); onClose(); }}
                                className="py-3 text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white rounded-xl transition-all"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom Count */}
                <div className="space-y-2 mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Custom</p>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={customCount}
                            onChange={(e) => setCustomCount(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                            onClick={() => { onExtend(customCount); onClose(); }}
                            className="px-6 py-3 text-sm font-bold bg-primary text-white rounded-xl hover:bg-indigo-700 transition-all"
                        >
                            Extend
                        </button>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => setShowEndConfirm(true)}
                            className="flex-1 py-3 text-sm font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all border border-amber-200 dark:border-amber-800"
                        >
                            End Series
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExtendRecurringModal;
