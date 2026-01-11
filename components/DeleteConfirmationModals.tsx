/**
 * DeleteConfirmationModals - Delete confirmation dialogs for tasks
 */

import React from 'react';

interface DeleteConfirmationModalsProps {
    deleteConfig: { id: string; title: string } | null;
    pendingDelete: { id: string; title: string; deleteAll: boolean } | null;
    onDeleteInstance: (id: string) => void;
    onDeleteAll: (id: string) => void;
    onConfirmPending: () => void;
    onCancelDelete: () => void;
    onCancelPending: () => void;
}

const DeleteConfirmationModals: React.FC<DeleteConfirmationModalsProps> = ({
    deleteConfig,
    pendingDelete,
    onDeleteInstance,
    onDeleteAll,
    onConfirmPending,
    onCancelDelete,
    onCancelPending
}) => {
    return (
        <>
            {/* Recurring Task Delete Choice Modal */}
            {deleteConfig && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Delete Task?</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            "<span className="font-bold text-slate-700 dark:text-slate-200">{deleteConfig.title}</span>" is a recurring task. How would you like to delete it?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => onDeleteInstance(deleteConfig.id)}
                                className="w-full py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl transition-all flex items-center justify-between group"
                            >
                                <span>Delete only this instance</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onDeleteAll(deleteConfig.id)}
                                className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-between group"
                            >
                                <span>Delete all instances</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={onCancelDelete}
                                className="w-full py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Delete Confirmation Modal */}
            {pendingDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-900/30 text-red-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Confirm Deletion</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Are you sure you want to delete "<span className="font-semibold text-slate-700 dark:text-slate-200">{pendingDelete.title}</span>"
                                    {pendingDelete.deleteAll && <span className="text-red-500 font-medium"> and all its recurring instances</span>}?
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6">
                            <button
                                onClick={onCancelPending}
                                className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirmPending}
                                className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeleteConfirmationModals;
