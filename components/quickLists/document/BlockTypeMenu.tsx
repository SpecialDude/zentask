import React, { useState, useRef, useEffect } from 'react';
import { BlockType } from '../../../types';

interface BlockTypeMenuProps {
    onSelect: (type: BlockType) => void;
    onClose: () => void;
    buttonRef?: React.RefObject<HTMLButtonElement>;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    {
        type: 'paragraph',
        label: 'Paragraph',
        icon: <span className="text-lg">¶</span>
    },
    {
        type: 'heading',
        label: 'Heading',
        icon: <span className="font-bold text-sm">H</span>
    },
    {
        type: 'bullet',
        label: 'Bullet List',
        icon: <span className="text-lg">•</span>
    },
    {
        type: 'checkbox',
        label: 'Checklist',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
        )
    },
    {
        type: 'numbered',
        label: 'Numbered List',
        icon: <span className="font-mono text-xs font-bold">1.</span>
    },
    {
        type: 'blockquote',
        label: 'Quote',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
        )
    },
    {
        type: 'divider',
        label: 'Divider',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
        )
    }
];

interface MenuPosition {
    top: number;
    left: number;
    showAbove: boolean;
}

const BlockTypeMenu: React.FC<BlockTypeMenuProps> = ({ onSelect, onClose, buttonRef }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<MenuPosition | null>(null);

    useEffect(() => {
        if (buttonRef?.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuHeight = 220; // Approximate menu height
            const viewportHeight = window.innerHeight;

            // Check if menu would overflow bottom of viewport
            const showAbove = rect.bottom + menuHeight > viewportHeight - 20;

            setPosition({
                top: showAbove ? rect.top - menuHeight - 8 : rect.bottom + 4,
                left: Math.min(rect.left, window.innerWidth - 180), // Keep menu on screen
                showAbove
            });
        }
    }, [buttonRef]);

    // If no buttonRef, fall back to relative positioning
    if (!buttonRef || !position) {
        return (
            <>
                <div className="fixed inset-0 z-[110]" onClick={onClose}></div>
                <div className="absolute left-0 top-full mt-1 z-[120] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-150">
                    {BLOCK_TYPES.map(({ type, label, icon }) => (
                        <button
                            key={type}
                            onClick={() => {
                                onSelect(type);
                                onClose();
                            }}
                            className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                        >
                            <span className="w-6 h-6 flex items-center justify-center text-slate-400">
                                {icon}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
                        </button>
                    ))}
                </div>
            </>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[110]" onClick={onClose}></div>

            {/* Menu - Fixed position to escape overflow containers */}
            <div
                ref={menuRef}
                className="fixed z-[120] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[160px] animate-in fade-in duration-150"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`
                }}
            >
                {BLOCK_TYPES.map(({ type, label, icon }) => (
                    <button
                        key={type}
                        onClick={() => {
                            onSelect(type);
                            onClose();
                        }}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                        <span className="w-6 h-6 flex items-center justify-center text-slate-400">
                            {icon}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
                    </button>
                ))}
            </div>
        </>
    );
};

export default BlockTypeMenu;
