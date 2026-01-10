import React, { useState, useEffect, useRef } from 'react';
import { QuickList, Block, BlockType } from '../../../types';
import { QUICK_LIST_COLORS, QuickListDeleteConfirm } from '../index';
import BlockRow from './BlockRow';
import BlockTypeMenu from './BlockTypeMenu';
import { useDocumentEditor } from './useDocumentEditor';

interface QuickListDocumentEditorProps {
    list?: QuickList;
    onClose: () => void;
    onSave: (listData: Partial<QuickList>) => void;
    onDelete: (id: string) => void;
}

const QuickListDocumentEditor: React.FC<QuickListDocumentEditorProps> = ({
    list,
    onClose,
    onSave,
    onDelete
}) => {
    const [title, setTitle] = useState(list?.title || '');
    const [color, setColor] = useState(list?.color || '#64748b');
    const [pinned, setPinned] = useState(list?.pinned || false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [newBlockId, setNewBlockId] = useState<string | null>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);

    const {
        blocks,
        addBlock,
        updateBlock,
        deleteBlock,
        indentBlock,
        outdentBlock,
        toggleCheck
    } = useDocumentEditor({ initialBlocks: list?.blocks || [] });

    useEffect(() => {
        if (!list) {
            const timer = setTimeout(() => document.getElementById('doc-title-input')?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [list]);

    const handleAddBlock = (type: BlockType, afterId?: string) => {
        const id = addBlock(type, afterId);
        setNewBlockId(id);
        setTimeout(() => setNewBlockId(null), 100);
    };

    const handleSave = () => {
        if (!title.trim() && blocks.length === 0) {
            onClose();
            return;
        }

        onSave({
            ...(list?.id && { id: list.id }),
            title: title.trim() || 'Untitled Document',
            type: 'document',
            blocks,
            items: [], // Keep empty for document type
            color,
            pinned,
            updatedAt: Date.now()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div
                className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-t-3xl md:rounded-3xl shadow-2xl border-t-8 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-full md:zoom-in duration-300"
                style={{ borderColor: color }}
                onWheel={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex-1">
                        <input
                            id="doc-title-input"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document Title"
                            className="text-xl md:text-2xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full text-slate-800 dark:text-white"
                        />
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Document
                        </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={() => setPinned(!pinned)}
                            className={`p-2 rounded-xl transition-colors ${pinned ? 'bg-amber-100 text-amber-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                            title="Pin Document"
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
                <div className="px-4 py-2 md:px-6 md:py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    {/* Color Picker */}
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
                <div
                    className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                >
                    {blocks.map((block, index) => (
                        <BlockRow
                            key={block.id}
                            block={block}
                            index={index}
                            onUpdate={updateBlock}
                            onDelete={deleteBlock}
                            onAddBlock={handleAddBlock}
                            onIndent={indentBlock}
                            onOutdent={outdentBlock}
                            onToggleCheck={toggleCheck}
                            autoFocus={block.id === newBlockId}
                        />
                    ))}

                    {/* Add block button */}
                    <div className="relative py-2 pl-7">
                        <button
                            ref={addButtonRef}
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm">Add block</span>
                        </button>
                        {showAddMenu && (
                            <BlockTypeMenu
                                onSelect={(type) => handleAddBlock(type)}
                                onClose={() => setShowAddMenu(false)}
                                buttonRef={addButtonRef}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 md:px-6 md:py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center rounded-b-3xl shrink-0">
                    {list ? (
                        <button
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete
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
                            className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {isDeleteConfirmOpen && (
                <QuickListDeleteConfirm
                    title={title || 'Untitled Document'}
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

export default QuickListDocumentEditor;
