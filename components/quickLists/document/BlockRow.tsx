import React, { useState, useRef, useEffect } from 'react';
import { Block, BlockType } from '../../../types';
import BlockTypeMenu from './BlockTypeMenu';
import DatePicker from '../../DatePicker';

interface BlockRowProps {
    block: Block;
    index: number;
    numberIndex?: number;
    onUpdate: (id: string, updates: Partial<Block>) => void;
    onDelete: (id: string) => void;
    onAddBlock: (type: BlockType, afterId: string) => void;
    onIndent: (id: string) => void;
    onOutdent: (id: string) => void;
    onToggleCheck: (id: string) => void;
    autoFocus?: boolean;
    onMoveToDate?: (id: string, date: string) => void;
}

const BlockRow: React.FC<BlockRowProps> = ({
    block,
    index,
    numberIndex,
    onUpdate,
    onDelete,
    onAddBlock,
    onIndent,
    onOutdent,
    onToggleCheck,
    autoFocus,
    onMoveToDate
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
        // Auto-size textarea on mount
        if (inputRef.current && 'scrollHeight' in inputRef.current) {
            const textarea = inputRef.current as HTMLTextAreaElement;
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }, [autoFocus, block.content]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                onOutdent(block.id);
            } else {
                onIndent(block.id);
            }
        } else if (e.key === 'Backspace' && block.content === '') {
            e.preventDefault();
            onDelete(block.id);
        } else if (e.key === 'Enter' && !e.shiftKey && block.type !== 'paragraph') {
            e.preventDefault();
            onAddBlock(block.type, block.id);
        }
    };

    const indentPadding = (block.indent || 0) * 24;

    const renderBlockIndicator = () => {
        switch (block.type) {
            case 'checkbox':
                return (
                    <button
                        onClick={() => onToggleCheck(block.id)}
                        className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all shrink-0 ${block.checked
                            ? 'bg-slate-400 border-slate-400'
                            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                            }`}
                    >
                        {block.checked && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </button>
                );
            case 'bullet':
                return <span className="text-slate-400 text-lg leading-none shrink-0">•</span>;
            case 'numbered':
                return <span className="text-xs text-slate-400 font-mono font-bold w-5 text-right shrink-0">{numberIndex ?? (index + 1)}.</span>;
            case 'heading':
                return <span className="text-slate-400 font-bold text-sm shrink-0">H{block.level || 2}</span>;
            case 'blockquote':
                return <span className="text-slate-400 text-lg shrink-0">❝</span>;
            case 'divider':
                return null; // Divider uses full width, no indicator
            default:
                return null;
        }
    };

    const getInputStyles = () => {
        const base = "flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-200";

        if (block.type === 'heading') {
            const sizes = { 1: 'text-2xl font-bold', 2: 'text-xl font-bold', 3: 'text-lg font-semibold' };
            return `${base} ${sizes[block.level || 2]}`;
        }

        if (block.type === 'checkbox' && block.checked) {
            return `${base} text-slate-400 line-through`;
        }

        return base;
    };

    return (
        <div
            className="group flex items-start gap-2 py-1 relative"
            style={{ paddingLeft: `${indentPadding}px` }}
        >
            {/* Block type indicator */}
            <div className="mt-1 w-5 flex justify-center">
                {renderBlockIndicator()}
            </div>

            {/* Content */}
            {block.type === 'divider' ? (
                // Divider - horizontal line
                <div className="flex-1 flex items-center py-2">
                    <hr className="flex-1 border-slate-200 dark:border-slate-700" />
                </div>
            ) : (
                // All text-based blocks use auto-resizing textarea for proper wrapping
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={block.content}
                    onChange={(e) => {
                        onUpdate(block.id, { content: e.target.value });
                        // Auto-resize on change
                        const target = e.target;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        block.type === 'heading' ? 'Heading...'
                            : block.type === 'blockquote' ? 'Quote...'
                                : block.type === 'paragraph' ? 'Type something...'
                                    : 'List item...'
                    }
                    className={`${getInputStyles()} resize-none min-h-[24px] overflow-hidden ${block.type === 'blockquote'
                        ? 'pl-3 border-l-2 border-l-slate-300 dark:border-l-slate-600 italic text-slate-600 dark:text-slate-300'
                        : ''
                        }`}
                    rows={1}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                />
            )}

            {/* Action buttons - always at top right */}
            <div className="flex items-center gap-0.5 shrink-0 mt-1 mr-1">
                {/* Add block button */}
                <div className="relative">
                    <button
                        ref={addButtonRef}
                        onClick={() => setShowMenu(!showMenu)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"
                        title="Add block"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </button>

                    {showMenu && (
                        <BlockTypeMenu
                            onSelect={(type) => onAddBlock(type, block.id)}
                            onClose={() => setShowMenu(false)}
                            buttonRef={addButtonRef}
                        />
                    )}
                </div>

                {/* Move to day button (only for list-like blocks) */}
                {(block.type === 'checkbox' || block.type === 'bullet' || block.type === 'numbered') && (
                    <div className="relative">
                        <button
                            onClick={() => { setSelectedDate(new Date().toISOString().split('T')[0]); setShowDatePicker(true); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-all"
                            title="Move to day"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6 2a1 1 0 00-1 1v2H3a1 1 0 000 2h2v8a2 2 0 002 2h6a2 2 0 002-2V7h2a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zM8 7a1 1 0 112 0v1a1 1 0 11-2 0V7zm4 0a1 1 0 112 0v1a1 1 0 11-2 0V7z" />
                            </svg>
                        </button>
                        {showDatePicker && (
                            <DatePicker
                                selectedDate={selectedDate}
                                onDateChange={(date) => { setSelectedDate(date); onMoveToDate?.(block.id, date); setShowDatePicker(false); }}
                                isOpen={showDatePicker}
                                onClose={() => setShowDatePicker(false)}
                            />
                        )}
                    </div>
                )}

                {/* Delete button */}
                <button
                    onClick={() => onDelete(block.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 rounded transition-all"
                    title="Delete block"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default BlockRow;
