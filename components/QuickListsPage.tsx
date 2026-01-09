import React, { useMemo } from 'react';
import { QuickList } from '../types';
import ListCard from './ListCard';

interface QuickListsPageProps {
    lists: QuickList[];
    onSave: (listData: Partial<QuickList>) => void;
    onDelete: (id: string) => void;
    onTogglePin: (list: QuickList, e: React.MouseEvent) => void;
    onCreateNew: () => void;
}

const QuickListsPage: React.FC<QuickListsPageProps> = ({ lists, onSave, onDelete, onTogglePin, onCreateNew }) => {
    const { pinnedLists, groupedLists } = useMemo(() => {
        const pinned = lists.filter(l => l.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
        const unpinned = lists.filter(l => !l.pinned).sort((a, b) => b.createdAt - a.createdAt);

        const groups: { [key: string]: QuickList[] } = {};
        const now = new Date();

        unpinned.forEach(list => {
            const date = new Date(list.createdAt);
            const isToday = date.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = date.toDateString() === yesterday.toDateString();

            let key: string;
            if (isToday) key = 'Today';
            else if (isYesterday) key = 'Yesterday';
            else key = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

            if (!groups[key]) groups[key] = [];
            groups[key].push(list);
        });

        return { pinnedLists: pinned, groupedLists: groups };
    }, [lists]);

    const groupKeys = Object.keys(groupedLists).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        return 0;
    });

    return (
        <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 md:space-y-10 pb-32">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Quick Lists</h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">Capture ideas, shopping lists, and notes</p>
                </div>
                <button
                    onClick={onCreateNew}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm md:text-base w-full sm:w-auto justify-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New List
                </button>
            </div>

            {pinnedLists.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                        Pinned
                    </div>
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
                        {pinnedLists.map(list => (
                            <ListCard
                                key={list.id}
                                list={list}
                                onSave={onSave}
                                onDelete={onDelete}
                                onTogglePin={(e) => onTogglePin(list, e)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {lists.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No lists yet</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">Create your first list to check off items, jot down ideas, or keep track of things.</p>
                    <button
                        onClick={onCreateNew}
                        className="text-primary font-bold hover:underline"
                    >
                        Create new list
                    </button>
                </div>
            ) : (
                groupKeys.map(group => (
                    <section key={group}>
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {group}
                        </div>
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
                            {groupedLists[group].map(list => (
                                <ListCard
                                    key={list.id}
                                    list={list}
                                    onSave={onSave}
                                    onDelete={onDelete}
                                    onTogglePin={(e) => onTogglePin(list, e)}
                                />
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
};

export default QuickListsPage;
