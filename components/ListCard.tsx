import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QuickList, ListItem, ListType } from '../types';
import { generateId } from '../utils';

interface ListCardProps {
    list: QuickList;
    onSave: (listData: Partial<QuickList>) => void;
    onDelete: (id: string) => void;
    onTogglePin: (e: React.MouseEvent) => void;
}

const COLORS = [
    { hex: '#64748b', name: 'Slate' },
    { hex: '#ef4444', name: 'Red' },
    { hex: '#f97316', name: 'Orange' },
    { hex: '#eab308', name: 'Yellow' },
    { hex: '#22c55e', name: 'Green' },
    { hex: '#3b82f6', name: 'Blue' },
    { hex: '#a855f7', name: 'Purple' },
    { hex: '#ec4899', name: 'Pink' }
];

const ListCard: React.FC<ListCardProps> = ({ list, onSave, onDelete, onTogglePin }) => {
    // Local state for editing
    const [title, setTitle] = useState(list.title);
    const [items, setItems] = useState<ListItem[]>(list.items);
    const [type, setType] = useState<ListType>(list.type);
    const [color, setColor] = useState(list.color || '#64748b');
    const [newItemText, setNewItemText] = useState('');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const cardRef = useRef<HTMLDivElement>(null);
    const hasChanges = useRef(false);

    // Scroll input into view on mobile when keyboard appears
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay to allow keyboard to appear
    };

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
                setShowColorPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleSave]);

    // Item handlers
    const handleAddItem = () => {
        if (!newItemText.trim()) return;
        const newItem: ListItem = {
            id: generateId(),
            content: newItemText.trim(),
            checked: false,
            order: items.length
        };
        setItems([...items, newItem]);
        setNewItemText('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddItem();
        }
    };

    const handleUpdateItem = (id: string, updates: Partial<ListItem>) => {
        setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleToggleCheck = (id: string) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const getBorderColor = (c: string) => {
        switch (c) {
            case '#ef4444': return 'border-red-500';
            case '#f97316': return 'border-orange-500';
            case '#eab308': return 'border-yellow-500';
            case '#22c55e': return 'border-green-500';
            case '#3b82f6': return 'border-blue-500';
            case '#a855f7': return 'border-purple-500';
            case '#ec4899': return 'border-pink-500';
            default: return 'border-slate-300 dark:border-slate-600';
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
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-l-4 shadow-sm hover:shadow-lg transition-all break-inside-avoid ${getBorderColor(color)}`}
            >
                {/* Header */}
                <div className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="List title..."
                            onFocus={handleInputFocus}
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
                                        onClick={() => handleToggleCheck(item.id)}
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

                            {/* Content input */}
                            <input
                                type="text"
                                value={item.content}
                                onChange={(e) => handleUpdateItem(item.id, { content: e.target.value })}
                                onFocus={handleInputFocus}
                                className={`flex-1 bg-transparent border-none outline-none text-sm py-0.5 ${item.checked && type === 'checkbox' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
                            />

                            {/* Delete item button */}
                            <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-slate-300 hover:text-red-400 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* Add item input */}
                    <div className="flex items-center gap-2 py-1">
                        <span className="text-slate-300 dark:text-slate-600 text-lg">+</span>
                        <input
                            type="text"
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            placeholder="Add item..."
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
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
                            <button
                                onClick={() => setType('bullet')}
                                className={`p-1 rounded text-xs transition-all ${type === 'bullet' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                title="Bullet"
                            >
                                •
                            </button>
                            <button
                                onClick={() => setType('checkbox')}
                                className={`p-1 rounded transition-all ${type === 'checkbox' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                title="Checkbox"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setType('numbered')}
                                className={`p-1 rounded text-xs font-mono transition-all ${type === 'numbered' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                                title="Numbered"
                            >
                                1.
                            </button>
                        </div>

                        {/* Color Picker */}
                        <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                                style={{ backgroundColor: color }}
                                title="Color"
                            />
                            {showColorPicker && (
                                <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-1.5 z-10">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.hex}
                                            onClick={() => { setColor(c.hex); setShowColorPicker(false); }}
                                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === c.hex ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                            style={{ backgroundColor: c.hex }}
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-red-100 dark:border-red-900/30 animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete this list?</h3>
                        <p className="text-slate-500 mb-6 text-sm">"{title || 'Untitled List'}" will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onDelete(list.id);
                                    setIsDeleteConfirmOpen(false);
                                }}
                                className="flex-1 py-2.5 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
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

export default ListCard;
