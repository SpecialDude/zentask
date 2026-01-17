import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { QuickList, Block, BlockType } from '../../../types';
import { getQuickListBorderColor, QuickListColorPicker, QuickListDeleteConfirm } from '../index';
import BlockRow from './BlockRow';
import BlockTypeMenu from './BlockTypeMenu';
import { useDocumentEditor } from './useDocumentEditor';
import { useDebounce } from '../../../hooks';

interface QuickListDocumentCardProps {
    list: QuickList;
    onSave: (listData: Partial<QuickList>, options?: { suppressToast?: boolean }) => void;
    onDelete: (id: string) => void;
    onTogglePin: (e: React.MouseEvent) => void;
    onOpenInModal: () => void;
}

const QuickListDocumentCard: React.FC<QuickListDocumentCardProps> = ({
    list,
    onSave,
    onDelete,
    onTogglePin,
    onOpenInModal
}) => {
    const [title, setTitle] = useState(list.title);
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
        toggleCheck,
        setBlocks
    } = useDocumentEditor({ initialBlocks: list.blocks || [] });

    const cardRef = useRef<HTMLDivElement>(null);
    const isInitialized = useRef(false);
    const isSyncing = useRef(false); // Tracks external sync to prevent stale debounced saves
    const initialTitle = useRef(list.title);
    const initialBlocks = useRef(JSON.stringify(list.blocks || []));

    // Sync local state when list prop changes (e.g., after modal edit)
    useEffect(() => {
        // Mark that we're syncing - this prevents the debounced save effect from
        // saving stale data while debounced values catch up to the new state
        isSyncing.current = true;

        setTitle(list.title);
        setBlocks(list.blocks || []);

        // Update initial refs
        initialTitle.current = list.title;
        initialBlocks.current = JSON.stringify(list.blocks || []);
        isInitialized.current = false;

        // Clear syncing flag after debounce delay to allow saves again
        const syncTimeout = setTimeout(() => {
            isSyncing.current = false;
        }, 1100); // Slightly longer than debounce delay (1000ms)

        return () => clearTimeout(syncTimeout);
    }, [list.id, list.updatedAt, setBlocks]);

    // Debounce the content for auto-saving
    const debouncedTitle = useDebounce(title, 1000);
    const debouncedBlocks = useDebounce(blocks, 1000);

    // Effect to trigger save when debounced values change
    useEffect(() => {
        // Skip if syncing from external update (e.g., modal edit)
        if (isSyncing.current) return;

        // Skip the very first effect run where debounced values match initial values
        if (!isInitialized.current) {
            if (debouncedTitle === initialTitle.current &&
                JSON.stringify(debouncedBlocks) === initialBlocks.current) {
                return;
            }
            isInitialized.current = true;
        }

        // Check if actually changed from what's in the list prop
        const hasChanges =
            debouncedTitle !== list.title ||
            JSON.stringify(debouncedBlocks) !== JSON.stringify(list.blocks || []);

        if (hasChanges) {
            setSaveStatus('saving');
            onSave({
                id: list.id,
                title: debouncedTitle.trim() || 'Untitled Document',
                blocks: debouncedBlocks,
                updatedAt: Date.now()
            }, { suppressToast: true });
            setTimeout(() => setSaveStatus('saved'), 800);
        }
    }, [debouncedTitle, debouncedBlocks, list.id, list.title, list.blocks, onSave]);


    // Auto-save on unmount as cleanup
    useEffect(() => {
        return () => {
            if (title !== list.title || JSON.stringify(blocks) !== JSON.stringify(list.blocks || [])) {
                onSave({
                    id: list.id,
                    title: title.trim() || 'Untitled Document',
                    blocks,
                    updatedAt: Date.now()
                }, { suppressToast: true });
            }
        };
    }, []); // Empty dependency array to run only on mount/unmount


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
                data-list-id={list.id}
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl border-l-4 shadow-sm hover:shadow-lg transition-all break-inside-avoid ${getQuickListBorderColor(list.color || '#64748b')}`}
                style={{ minWidth: '320px' }}
            >
                {/* Header */}
                <div className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document title..."
                            className="flex-1 font-bold text-slate-800 dark:text-white bg-transparent border-none outline-none text-lg placeholder:text-slate-300 dark:placeholder:text-slate-600"
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
                    {/* Document badge + Save Status */}
                    <div className="flex items-center justify-between mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            Document
                        </span>

                        {/* Save Status Indicator */}
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300 ${saveStatus === 'saving' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 opacity-100' : 'opacity-0'}`}>
                            {saveStatus === 'saving' && (
                                <svg className="animate-spin h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            Saving...
                        </div>
                    </div>
                </div>

                {/* Blocks */}
                <div className="px-4 pb-2">
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

                    {/* Add first block button */}
                    {blocks.length === 0 && (
                        <div className="relative py-2">
                            <button
                                ref={addButtonRef}
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">Add content...</span>
                            </button>
                            {showAddMenu && (
                                <BlockTypeMenu
                                    onSelect={(type) => handleAddBlock(type)}
                                    onClose={() => setShowAddMenu(false)}
                                    buttonRef={addButtonRef}
                                />
                            )}
                        </div>
                    )}

                    {/* Add block at end */}
                    {blocks.length > 0 && (
                        <div className="relative py-1 pl-7">
                            <button
                                ref={addButtonRef}
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-slate-300 hover:text-slate-500 transition-all text-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add block
                            </button>
                            {showAddMenu && (
                                <BlockTypeMenu
                                    onSelect={(type) => handleAddBlock(type)}
                                    onClose={() => setShowAddMenu(false)}
                                    buttonRef={addButtonRef}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 mt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{formatDate(list.createdAt)}</span>

                    <div className="flex items-center gap-1">
                        {/* Color Picker */}
                        <QuickListColorPicker
                            color={list.color || '#64748b'}
                            onColorChange={(color) => {
                                onSave({ id: list.id, color, updatedAt: Date.now() });
                            }}
                        />

                        {/* Expand to Modal */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenInModal(); }}
                            className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Open in editor"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
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
                        onDelete(list.id);
                        setIsDeleteConfirmOpen(false);
                    }}
                />
            )}
        </>
    );
};

export default QuickListDocumentCard;
