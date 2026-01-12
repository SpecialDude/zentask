/**
 * useQuickLists - Hook for Quick Lists state management
 * 
 * Handles CRUD operations for Quick Lists.
 */

import { useState, useEffect, useCallback } from 'react';
import { QuickList, ListType } from '../types';
import { supabase } from '../supabase';
import * as listService from '../services/listService';

interface UseQuickListsOptions {
    userId: string | undefined;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useQuickLists({ userId, showToast }: UseQuickListsOptions) {
    const [quickLists, setQuickLists] = useState<QuickList[]>([]);

    // Fetch lists on mount/user change
    const fetchLists = useCallback(async () => {
        if (!userId) return;
        const { data, error } = await listService.fetchLists(userId);

        if (error) {
            console.error('Error fetching lists:', error);
        } else if (data) {
            setQuickLists(data);
        }
    }, [userId]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    // Save (create or update) a list
    const saveList = useCallback(async (listData: Partial<QuickList>, options?: { suppressToast?: boolean }): Promise<QuickList | undefined> => {
        if (!userId) return;
        const now = Date.now();

        if (listData.id) {
            // Update
            const updatedList = { ...listData, updatedAt: now } as QuickList;
            setQuickLists(prev => prev.map(l =>
                l.id === listData.id ? { ...l, ...updatedList } : l
            ));

            const { error } = await supabase
                .from('quick_lists')
                .update({ ...listData, updatedAt: now })
                .eq('id', listData.id);

            if (error) {
                console.error('Error saving list:', error);
                showToast('Failed to save list', 'error');
                fetchLists();
                return undefined;
            } else if (!options?.suppressToast) {
                showToast('List saved', 'success');
            }
            return updatedList;
        } else {
            // Create
            const newListPayload = {
                ...listData,
                user_id: userId,
                createdAt: now,
                updatedAt: now,
                items: listData.items || [],
                pinned: listData.pinned || false,
                type: listData.type || 'bullet',
                title: listData.title || 'Untitled List'
            };

            const { data, error } = await supabase
                .from('quick_lists')
                .insert([newListPayload])
                .select();

            if (error || !data) {
                console.error('Error creating list:', error);
                showToast('Failed to create list', 'error');
                return undefined;
            } else {
                const newList = data[0] as QuickList;
                setQuickLists(prev => [...prev, newList]);
                if (!options?.suppressToast) {
                    showToast('List created', 'success');
                }
                return newList;
            }
        }
    }, [userId, showToast, fetchLists]);

    // Create a new list
    const createNewList = useCallback(async (
        type: ListType = 'checkbox',
        onDocumentCreate?: () => void
    ): Promise<QuickList | undefined> => {
        if (!userId) return;

        // For document type, trigger callback instead
        if (type === 'document' && onDocumentCreate) {
            onDocumentCreate();
            return;
        }

        const now = Date.now();
        const newListPayload = {
            user_id: userId,
            title: '',
            type,
            items: [],
            color: '#64748b',
            pinned: false,
            createdAt: now,
            updatedAt: now
        };

        const { data, error } = await supabase
            .from('quick_lists')
            .insert([newListPayload])
            .select();

        if (error || !data) {
            console.error('Error creating list:', error);
            showToast('Failed to create list', 'error');
            return;
        }

        const newList = data[0] as QuickList;
        setQuickLists(prev => [newList, ...prev]);
        return newList;
    }, [userId, showToast]);

    // Delete a list
    const deleteList = useCallback(async (id: string) => {
        setQuickLists(prev => prev.filter(l => l.id !== id));

        const { error } = await listService.deleteListFromDb(id);
        if (error) {
            console.error('Error deleting list:', error);
            showToast('Failed to delete list', 'error');
            fetchLists();
        } else {
            showToast('List deleted', 'success');
        }
    }, [showToast, fetchLists]);

    // Toggle list pin
    const toggleListPin = useCallback(async (list: QuickList, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newPinned = !list.pinned;

        setQuickLists(prev => prev.map(l => l.id === list.id ? { ...l, pinned: newPinned } : l));

        const { error } = await listService.toggleListPinInDb(list.id, list.pinned);
        if (error) {
            fetchLists();
        }
    }, [fetchLists]);

    return {
        quickLists,
        setQuickLists,
        saveList,
        createNewList,
        deleteList,
        toggleListPin,
        fetchLists
    };
}
