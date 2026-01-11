/**
 * MobileFAB - Floating Action Button for mobile devices
 */

import React from 'react';

interface MobileFABProps {
    isOpen: boolean;
    isVisible: boolean;
    onToggle: () => void;
    onAddTask: () => void;
    onOpenAI: () => void;
}

const MobileFAB: React.FC<MobileFABProps> = ({ isOpen, isVisible, onToggle, onAddTask, onOpenAI }) => {
    return (
        <div className="md:hidden fixed bottom-6 right-6 z-50">
            {/* Expandable Options */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/20 -z-10" onClick={onToggle} />

                    {/* Option Buttons */}
                    <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2 mb-1">
                        <button
                            onClick={onOpenAI}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-primary text-white px-4 py-2 rounded-full shadow-md active:scale-95 transition-all text-xs font-bold"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            AI Plan
                        </button>

                        <button
                            onClick={onAddTask}
                            className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-full shadow-md active:scale-95 transition-all text-xs font-bold"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Task
                        </button>
                    </div>
                </>
            )}

            {/* Main FAB Button */}
            <button
                onClick={onToggle}
                className={`w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all duration-300 ${isOpen ? 'rotate-45' : ''} ${!isVisible && !isOpen ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}
                aria-label="Actions"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};

export default MobileFAB;
