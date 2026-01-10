import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QuickList, ListItem, ListType } from '../../types';
import { scrollInputIntoView } from '../../utils';
import {
    getQuickListBorderColor,
    useQuickListEditor,
    QuickListTypeToggle,
    QuickListColorPicker,
    QuickListDeleteConfirm
} from './index';

interface QuickListCardProps {
    list: QuickList;
    onSave: (listData: Partial<QuickList>) => void;
    onDelete: (id: string) => void;
    onTogglePin: (e: React.MouseEvent) => void;
    onOpenInModal: () => void;
}

const QuickListCard: React.FC<QuickListCardProps> = ({ list, onSave, onDelete, onTogglePin, onOpenInModal }) => {
    const {
        title, setTitle,
        items,
        type, setType,
        color, setColor,
        addItem,
        updateItem,
        deleteItem,
        toggleItemCheck,
        resetToInitial
    } = useQuickListEditor({
        initialTitle: list.title,
        initialItems: list.items,
        initialType: list.type,
        initialColor: list.color,
        initialPinned: list.pinned
    });

    const [newItemText, setNewItemText] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const hasChanges = useRef(false);

    // Sync local state when list prop changes (e.g., after modal edit)
    useEffect(() => {
        resetToInitial({
            initialTitle: list.title,
            initialItems: list.items,
            initialType: list.type,
            initialColor: list.color,
            initialPinned: list.pinned
        });
        hasChanges.current = false;
    }, [list.id, list.updatedAt, resetToInitial]);

    // Track changes
    useEffect(() => {
        const changed =
            title !== list.title ||
            type !== list.type ||
            color !== list.color ||
            JSON.stringify(items) !== JSON.stringify(list.items);
        hasChanges.current = changed;
    }, [title, items, type, color, list]);

    // Auto-save on blur (click outside)
    const handleSave = useCallback(() => {
        if (hasChanges.current) {
            onSave({
                id: list.id,
                title: title.trim() || 'Untitled List',
                type,
                items,
                color,
                updatedAt: Date.now()
            });
            hasChanges.current = false;
        }
    }, [list.id, title, type, items, color, onSave]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
                handleSave();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleSave]);

    // Item handlers
    const handleAddItem = () => {
        if (!newItemText.trim()) return;
        addItem(newItemText);
        setNewItemText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        if (isToday) return `Today, ${timeStr}`;
        if (isYesterday) return `Yesterday, ${timeStr}`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <>
            <div
                ref={cardRef}
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-l-4 shadow-sm hover:shadow-lg transition-all break-inside-avoid ${getQuickListBorderColor(color)}`}
            >
                {/* Header */}
                <div className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="List title..."
                            onFocus={scrollInputIntoView}
                            className="flex-1 font-bold text-slate-800 dark:text-white bg-transparent border-none outline-none text-base placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                        <button
                            onClick={onTogglePin}
                            className={`p-1.5 rounded-full transition-colors shrink-0 ${list.pinned ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Items List */}
                <div className="px-4 space-y-1">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-2 group/item">
                            {/* Type indicator / checkbox */}
                            <div className="mt-0.5 shrink-0">
                                {type === 'checkbox' ? (
                                    <button
                                        onClick={() => toggleItemCheck(item.id)}
                                        className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${item.checked ? 'bg-slate-400 border-slate-400' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'}`}
                                    >
                                        {item.checked && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ) : type === 'bullet' ? (
                                    <span className="text-slate-400 text-lg leading-none">•</span>
                                ) : (
                                    <span className="text-xs text-slate-400 font-mono font-bold w-5 text-right">{index + 1}.</span>
                                )}
                            </div>

                            {/* Content */}
                            <input
                                type="text"
                                value={item.content}
                                onChange={(e) => updateItem(item.id, { content: e.target.value })}
                                onFocus={scrollInputIntoView}
                                className={`flex-1 bg-transparent border-none outline-none text-sm transition-all ${item.checked && type === 'checkbox' ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}
                            />

                            {/* Delete item button */}
                            <button
                                onClick={() => deleteItem(item.id)}
                                className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-300 hover:text-red-400 rounded transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* Add Item Input */}
                    <div className="flex items-center gap-2 py-2">
                        <span className="text-slate-300 text-lg">+</span>
                        <input
                            type="text"
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add item..."
                            onFocus={scrollInputIntoView}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-500 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 mt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    {/* Date */}
                    <span className="text-xs text-slate-400">{formatDate(list.createdAt)}</span>

                    {/* Controls */}
                    <div className="flex items-center gap-1">
                        {/* Type Toggle */}
                        <QuickListTypeToggle type={type} onTypeChange={setType} />

                        {/* Color Picker */}
                        <QuickListColorPicker color={color} onColorChange={setColor} />

                        {/* Expand to Modal */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSave(); onOpenInModal(); }}
                            className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Open in editor (with drag & drop)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete list"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteConfirmOpen && (
                <QuickListDeleteConfirm
                    title={title}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={() => {
                        onDelete(list.id);
                        setIsDeleteConfirmOpen(false);
                    }}
                />
            )}
        </>
    );
};

export default QuickListCard;
