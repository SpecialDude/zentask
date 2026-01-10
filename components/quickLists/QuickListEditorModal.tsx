import React, { useState, useRef, useEffect } from 'react';
import { QuickList, ListItem } from '../../types';
import { scrollInputIntoView } from '../../utils';
import {
    QUICK_LIST_COLORS,
    useQuickListEditor,
    QuickListDeleteConfirm
} from './index';

interface QuickListEditorModalProps {
    list?: QuickList;
    onClose: () => void;
    onSave: (listData: Partial<QuickList>) => void;
    onDelete: (id: string) => void;
}

const QuickListEditorModal: React.FC<QuickListEditorModalProps> = ({ list, onClose, onSave, onDelete }) => {
    const {
        title, setTitle,
        items,
        type, setType,
        color, setColor,
        pinned, setPinned,
        addItem,
        updateItem,
        deleteItem,
        reorderItems
    } = useQuickListEditor({
        initialTitle: list?.title,
        initialItems: list?.items,
        initialType: list?.type,
        initialColor: list?.color,
        initialPinned: list?.pinned
    });

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const newItemInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!list) {
            const timer = setTimeout(() => document.getElementById('list-title-input')?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [list]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem(e.currentTarget.value);
            if (newItemInputRef.current) newItemInputRef.current.value = '';
        }
    };

    const handleSave = () => {
        if (!title.trim() && items.length === 0) {
            onClose();
            return;
        }

        onSave({
            ...(list?.id && { id: list.id }),
            title: title.trim() || 'Untitled List',
            type,
            items,
            color,
            pinned,
            updatedAt: Date.now()
        });
        onClose();
    };

    // Drag and Drop Logic
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (position: number) => {
        dragItem.current = position;
    };

    const handleDragEnter = (position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            reorderItems(dragItem.current, dragOverItem.current);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl border-t-8 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-full md:zoom-in duration-300" style={{ borderColor: color }}>

                {/* Header */}
                <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <input
                        id="list-title-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="List Title"
                        onFocus={scrollInputIntoView}
                        className="text-xl md:text-2xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full text-slate-800 dark:text-white"
                    />
                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={() => setPinned(!pinned)}
                            className={`p-2 rounded-xl transition-colors ${pinned ? 'bg-amber-100 text-amber-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                            title="Pin List"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-4 py-2 md:px-6 md:py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 md:gap-4 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    {/* Type Toggle */}
                    <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                        <button
                            onClick={() => setType('bullet')}
                            className={`p-1.5 rounded-md transition-all ${type === 'bullet' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Bullet List"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7 5a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setType('checkbox')}
                            className={`p-1.5 rounded-md transition-all ${type === 'checkbox' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Checkbox List"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setType('numbered')}
                            className={`p-1.5 rounded-md transition-all ${type === 'numbered' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Numbered List"
                        >
                            <span className="font-mono font-bold text-sm px-1">1.</span>
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                    {/* Color Picker - Expanded for modal */}
                    <div className="flex items-center gap-1.5">
                        {QUICK_LIST_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => setColor(c.hex)}
                                className={`w-6 h-6 rounded-full transition-all ${color === c.hex ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                style={{ backgroundColor: c.hex, boxShadow: color === c.hex ? `0 0 0 2px ${c.hex}40` : 'none' }}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className="flex items-start gap-3 group animate-in slide-in-from-bottom-2 duration-200"
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            {/* Drag Handle */}
                            <div className="mt-1.5 text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M7 2a2 2 0 10-4 0 2 2 0 004 0zm0 16a2 2 0 10-4 0 2 2 0 004 0zm0-8a2 2 0 10-4 0 2 2 0 004 0zm7-8a2 2 0 10-4 0 2 2 0 004 0zm0 16a2 2 0 10-4 0 2 2 0 004 0zm0-8a2 2 0 10-4 0 2 2 0 004 0z" />
                                </svg>
                            </div>

                            {/* Item Type Indicator */}
                            <div className="mt-1">
                                {type === 'checkbox' && (
                                    <button
                                        onClick={() => updateItem(item.id, { checked: !item.checked })}
                                        className={`w-6 h-6 border-2 rounded-lg flex items-center justify-center transition-all ${item.checked ? 'bg-slate-400 border-slate-400' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'}`}
                                    >
                                        {item.checked && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                )}
                                {type === 'bullet' && (
                                    <span className="text-slate-400 dark:text-slate-500 text-2xl leading-[1.1rem]">•</span>
                                )}
                                {type === 'numbered' && (
                                    <span className="font-mono text-slate-400 dark:text-slate-500 font-bold mt-0.5 inline-block w-6 text-right">{index + 1}.</span>
                                )}
                            </div>

                            {/* Content Input */}
                            <input
                                type="text"
                                value={item.content}
                                onChange={(e) => updateItem(item.id, { content: e.target.value })}
                                onFocus={scrollInputIntoView}
                                className={`flex-1 bg-transparent border-none outline-none py-1 text-slate-700 dark:text-slate-200 ${item.checked && type === 'checkbox' ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium'}`}
                            />

                            {/* Delete Button */}
                            <button
                                onClick={() => deleteItem(item.id)}
                                className="mt-1 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                tabIndex={-1}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* New Item Input */}
                    <div className="flex items-center gap-3 pl-7 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <input
                            ref={newItemInputRef}
                            type="text"
                            placeholder="Add list item..."
                            onKeyDown={handleKeyDown}
                            onFocus={scrollInputIntoView}
                            className="flex-1 bg-transparent border-none outline-none py-2 text-slate-600 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center rounded-b-3xl shrink-0">
                    {list ? (
                        <button
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete List
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 md:px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm md:text-base"
                        >
                            Save List
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {isDeleteConfirmOpen && (
                <QuickListDeleteConfirm
                    title={title || 'Untitled List'}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={() => {
                        if (list) onDelete(list.id);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

export default QuickListEditorModal;
