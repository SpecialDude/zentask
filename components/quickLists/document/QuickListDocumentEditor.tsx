import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QuickList, Block, BlockType } from '../../../types';
import { QUICK_LIST_COLORS, QuickListDeleteConfirm } from '../index';
import BlockRow from './BlockRow';
import BlockTypeMenu from './BlockTypeMenu';
import { useDocumentEditor } from './useDocumentEditor';
import { useDebounce } from '../../../hooks';

interface QuickListDocumentEditorProps {
    list?: QuickList;
    onClose: () => void;
    onSave: (listData: Partial<QuickList>, options?: { suppressToast?: boolean }) => void;
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
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
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

    const isFirstRender = useRef(true);

    // Focus title on new doc
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

    // Calculate number indices for numbered blocks (each sequence starts from 1)
    const numberIndices = useMemo(() => {
        const indices: Record<string, number> = {};
        let counter = 0;
        blocks.forEach((block, i) => {
            if (block.type === 'numbered') {
                const prevBlock = blocks[i - 1];
                // Reset counter if previous block is not numbered
                if (!prevBlock || prevBlock.type !== 'numbered') {
                    counter = 1;
                } else {
                    counter++;
                }
                indices[block.id] = counter;
            }
        });
        return indices;
    }, [blocks]);

    // Handle initial save/create logic isn't debounced, but updates are.
    // However, since we might be creating a NEW list, we shouldn't save to DB until "Save" is clicked initially?
    // User expectation for "Quick Note" is usually implicit creation.
    // If 'list' exists, we are editing -> Auto-save.
    // If 'list' is undefined, we are creating -> Logic usually waits for save, but we can make it auto-save if title exists?
    // For now, let's keep creation manual "Save", but editing as Auto-save?
    // Actually, user said "autosave is not okay... lost a lot of notes".
    // So assume we should auto-save even new ones if they are substantial?
    // Let's implement auto-save for EXISTING lists (ID exists).
    // For NEW lists, we can't update by ID yet. So keep manual for creation or handle creation.
    // Assuming 'list' prop presence means it's an edit.

    const canAutoSave = !!list?.id;
    const debouncedTitle = useDebounce(title, 1000);
    const debouncedBlocks = useDebounce(blocks, 1000);
    const debouncedColor = useDebounce(color, 1000);
    const debouncedPinned = useDebounce(pinned, 1000);


    // Auto-save Effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (!canAutoSave) return;

        const hasChanges =
            debouncedTitle !== list?.title ||
            JSON.stringify(debouncedBlocks) !== JSON.stringify(list?.blocks || []) ||
            debouncedColor !== list?.color ||
            debouncedPinned !== list?.pinned;

        if (hasChanges) {
            setSaveStatus('saving');
            onSave({
                id: list!.id,
                title: debouncedTitle.trim() || 'Untitled Document',
                blocks: debouncedBlocks,
                color: debouncedColor,
                pinned: debouncedPinned,
                updatedAt: Date.now()
            }, { suppressToast: true });
            setTimeout(() => setSaveStatus('saved'), 800);
        }
    }, [
        debouncedTitle, debouncedBlocks, debouncedColor, debouncedPinned,
        list?.title, list?.blocks, list?.color, list?.pinned, list?.id,
        canAutoSave, onSave
    ]);

    // Immediate "Saving..." feedback
    useEffect(() => {
        if (!canAutoSave) return;

        const hasChanges =
            title !== list?.title ||
            JSON.stringify(blocks) !== JSON.stringify(list?.blocks || []) ||
            color !== list?.color ||
            pinned !== list?.pinned;

        if (hasChanges && saveStatus === 'saved') {
            setSaveStatus('saving');
        }
    }, [title, blocks, color, pinned, list, saveStatus, canAutoSave]);


    const handleManualSave = () => {
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
                            placeholder="Document title"
                            className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none w-full placeholder:text-slate-300 dark:placeholder:text-slate-600"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400 font-medium">Document</span>
                            {/* Save Status (only if editing existing) */}
                            {canAutoSave && (
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300 ${saveStatus === 'saving' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 opacity-100' : 'opacity-0'}`}>
                                    {saveStatus === 'saving' && (
                                        <svg className="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPinned(!pinned)}
                            className={`p-2 rounded-xl transition-all ${pinned
                                ? 'bg-amber-100 text-amber-500 dark:bg-amber-900/30'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            title={pinned ? 'Unpin' : 'Pin'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Color Selector Bar */}
                <div className="px-4 md:px-6 py-2 bg-slate-50/50 dark:bg-slate-800/30 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
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
                            numberIndex={numberIndices[block.id]}
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
                            {canAutoSave ? 'Close' : 'Cancel'}
                        </button>
                        <button
                            onClick={handleManualSave}
                            className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            {canAutoSave ? 'Done' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            {isDeleteConfirmOpen && (
                <QuickListDeleteConfirm
                    title={title}
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
