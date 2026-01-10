import { useState, useCallback } from 'react';
import { Block, BlockType } from '../../../types';
import { generateId } from '../../../utils';

interface UseDocumentEditorOptions {
    initialBlocks?: Block[];
}

interface UseDocumentEditorReturn {
    blocks: Block[];
    addBlock: (type: BlockType, afterId?: string) => string;
    updateBlock: (id: string, updates: Partial<Block>) => void;
    deleteBlock: (id: string) => void;
    moveBlock: (fromIndex: number, toIndex: number) => void;
    indentBlock: (id: string) => void;
    outdentBlock: (id: string) => void;
    toggleCheck: (id: string) => void;
    setBlocks: (blocks: Block[]) => void;
}

export const useDocumentEditor = (options: UseDocumentEditorOptions = {}): UseDocumentEditorReturn => {
    const [blocks, setBlocks] = useState<Block[]>(options.initialBlocks || []);

    const addBlock = useCallback((type: BlockType, afterId?: string): string => {
        const newBlock: Block = {
            id: generateId(),
            type,
            content: '',
            checked: type === 'checkbox' ? false : undefined,
            level: type === 'heading' ? 2 : undefined,
            indent: 0,
            order: blocks.length
        };

        setBlocks(prev => {
            if (!afterId) {
                // Add at the end
                return [...prev, newBlock];
            }
            // Insert after the specified block
            const index = prev.findIndex(b => b.id === afterId);
            if (index === -1) return [...prev, newBlock];

            const result = [...prev];
            result.splice(index + 1, 0, newBlock);
            // Update order numbers
            return result.map((b, i) => ({ ...b, order: i }));
        });

        return newBlock.id;
    }, [blocks.length]);

    const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
        setBlocks(prev => prev.map(block =>
            block.id === id ? { ...block, ...updates } : block
        ));
    }, []);

    const deleteBlock = useCallback((id: string) => {
        setBlocks(prev => {
            const filtered = prev.filter(block => block.id !== id);
            // Update order numbers
            return filtered.map((b, i) => ({ ...b, order: i }));
        });
    }, []);

    const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
        setBlocks(prev => {
            const result = [...prev];
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result.map((b, i) => ({ ...b, order: i }));
        });
    }, []);

    const indentBlock = useCallback((id: string) => {
        setBlocks(prev => prev.map(block =>
            block.id === id
                ? { ...block, indent: Math.min((block.indent || 0) + 1, 3) }
                : block
        ));
    }, []);

    const outdentBlock = useCallback((id: string) => {
        setBlocks(prev => prev.map(block =>
            block.id === id
                ? { ...block, indent: Math.max((block.indent || 0) - 1, 0) }
                : block
        ));
    }, []);

    const toggleCheck = useCallback((id: string) => {
        setBlocks(prev => prev.map(block =>
            block.id === id && block.type === 'checkbox'
                ? { ...block, checked: !block.checked }
                : block
        ));
    }, []);

    return {
        blocks,
        addBlock,
        updateBlock,
        deleteBlock,
        moveBlock,
        indentBlock,
        outdentBlock,
        toggleCheck,
        setBlocks
    };
};
