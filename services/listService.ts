/**
 * List Service
 * Handles all Quick List related database operations
 */

import { supabase } from '../supabase';
import { QuickList, ListType } from '../types';

// ==================== Fetch Operations ====================

export const fetchLists = async (userId: string): Promise<{ data: QuickList[] | null; error: any }> => {
    return supabase
        .from('quick_lists')
        .select('*')
        .eq('user_id', userId)
        .order('createdAt', { ascending: false });
};

// ==================== Create Operations ====================

export interface CreateListPayload {
    title?: string;
    type?: ListType;
    items?: any[];
    blocks?: any[];
    color?: string;
    pinned?: boolean;
}

export const createListPayload = (
    data: CreateListPayload,
    userId: string
): Omit<QuickList, 'id'> => {
    const now = Date.now();
    return {
        user_id: userId,
        title: data.title || 'Untitled List',
        type: data.type || 'bullet',
        items: data.items || [],
        blocks: data.blocks,
        color: data.color || '#64748b',
        pinned: data.pinned || false,
        createdAt: now,
        updatedAt: now,
    };
};

export const insertList = async (
    payload: Omit<QuickList, 'id'>
): Promise<{ data: QuickList[] | null; error: any }> => {
    return supabase
        .from('quick_lists')
        .insert([payload])
        .select();
};

// ==================== Update Operations ====================

export const updateListInDb = async (
    id: string,
    updates: Partial<QuickList>
): Promise<{ error: any }> => {
    return supabase
        .from('quick_lists')
        .update({ ...updates, updatedAt: Date.now() })
        .eq('id', id);
};

// ==================== Delete Operations ====================

export const deleteListFromDb = async (id: string): Promise<{ error: any }> => {
    return supabase.from('quick_lists').delete().eq('id', id);
};

// ==================== Toggle Operations ====================

export const toggleListPinInDb = async (
    id: string,
    currentPinned: boolean
): Promise<{ error: any }> => {
    return supabase
        .from('quick_lists')
        .update({ pinned: !currentPinned, updatedAt: Date.now() })
        .eq('id', id);
};
