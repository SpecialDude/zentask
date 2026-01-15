import { useState, useCallback } from 'react';
import { ListItem, ListType } from '../../types';
import { generateId } from '../../utils';
import { DEFAULT_QUICK_LIST_COLOR } from './quickListConstants';

interface UseQuickListEditorOptions {
    initialTitle?: string;
    initialItems?: ListItem[];
    initialType?: ListType;
    initialColor?: string;
    initialPinned?: boolean;
}

interface UseQuickListEditorReturn {
    // State
    title: string;
    items: ListItem[];
    type: ListType;
    color: string;
    pinned: boolean;

    // Setters
    setTitle: (title: string) => void;
    setType: (type: ListType) => void;
    setColor: (color: string) => void;
    setPinned: (pinned: boolean) => void;

    // Item handlers
    addItem: (content: string) => void;
    updateItem: (id: string, updates: Partial<ListItem>) => void;
    deleteItem: (id: string) => void;
    toggleItemCheck: (id: string) => void;
    reorderItems: (fromIndex: number, toIndex: number) => void;

    // Utilities
    resetToInitial: (options: UseQuickListEditorOptions) => void;
}

export const useQuickListEditor = (options: UseQuickListEditorOptions = {}): UseQuickListEditorReturn => {
    const [title, setTitle] = useState(options.initialTitle || '');
    const [items, setItems] = useState<ListItem[]>(
        [...(options.initialItems || [])].sort((a, b) => a.order - b.order)
    );
    const [type, setType] = useState<ListType>(options.initialType || 'bullet');
    const [color, setColor] = useState(options.initialColor || DEFAULT_QUICK_LIST_COLOR);
    const [pinned, setPinned] = useState(options.initialPinned || false);

    const addItem = useCallback((content: string) => {
        if (!content.trim()) return;
        const newItem: ListItem = {
            id: generateId(),
            content: content.trim(),
            checked: false,
            order: items.length
        };
        setItems(prev => [...prev, newItem]);
    }, [items.length]);

    const updateItem = useCallback((id: string, updates: Partial<ListItem>) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    }, []);

    const deleteItem = useCallback((id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    }, []);

    const toggleItemCheck = useCallback((id: string) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    }, []);

    const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
        setItems(prev => {
            const result = [...prev];
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result.map((item, idx) => ({ ...item, order: idx }));
        });
    }, []);

    const resetToInitial = useCallback((newOptions: UseQuickListEditorOptions) => {
        setTitle(newOptions.initialTitle || '');
        setItems([...(newOptions.initialItems || [])].sort((a, b) => a.order - b.order));
        setType(newOptions.initialType || 'bullet');
        setColor(newOptions.initialColor || DEFAULT_QUICK_LIST_COLOR);
        setPinned(newOptions.initialPinned || false);
    }, []);

    return {
        title,
        items,
        type,
        color,
        pinned,
        setTitle,
        setType,
        setColor,
        setPinned,
        addItem,
        updateItem,
        deleteItem,
        toggleItemCheck,
        reorderItems,
        resetToInitial
    };
};
