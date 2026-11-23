/**
 * List Service
 * Handles all Quick List related database operations
 */

import { request, requestAll, toServiceError as toError } from './apiClient';
import type { ServiceError } from './apiClient';
import { QuickList, ListType } from '../types';

const listPath = (id: string) => `/lists/${encodeURIComponent(id)}`;

// ==================== Fetch Operations ====================

// The API scopes rows to the session, so `userId` is accepted but unused.
export const fetchLists = async (_userId: string): Promise<{ data: QuickList[] | null; error: ServiceError | null }> => {
    try {
        return { data: await requestAll<QuickList>('/lists'), error: null };
    } catch (error) {
        return { data: null, error: toError(error) };
    }
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
): Promise<{ data: QuickList[] | null; error: ServiceError | null }> => {
    try {
        const created = await request<QuickList>('/lists', { method: 'POST', body: payload });
        return { data: [created], error: null };
    } catch (error) {
        return { data: null, error: toError(error) };
    }
};

// ==================== Update Operations ====================

export const updateListInDb = async (
    id: string,
    updates: Partial<QuickList>
): Promise<{ error: ServiceError | null }> => {
    try {
        await request(listPath(id), {
            method: 'PATCH',
            body: { ...updates, updatedAt: Date.now() },
        });
        return { error: null };
    } catch (error) {
        return { error: toError(error) };
    }
};

// ==================== Delete Operations ====================

export const deleteListFromDb = async (id: string): Promise<{ error: ServiceError | null }> => {
    try {
        await request(listPath(id), { method: 'DELETE' });
        return { error: null };
    } catch (error) {
        return { error: toError(error) };
    }
};

// ==================== Toggle Operations ====================

export const toggleListPinInDb = async (
    id: string,
    currentPinned: boolean
): Promise<{ error: ServiceError | null }> => {
    try {
        await request(listPath(id), {
            method: 'PATCH',
            body: { pinned: !currentPinned, updatedAt: Date.now() },
        });
        return { error: null };
    } catch (error) {
        return { error: toError(error) };
    }
};
