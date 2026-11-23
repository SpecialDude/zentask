import { ApiError, request } from './apiClient';
import { TaskCategory } from '../types';

function errorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status === 401) return 'Please sign in again.';
    return error instanceof Error ? error.message : 'Request failed';
}

// The API scopes rows to the session; `userId` stays for call-site compatibility.
export const getCategories = async (_userId: string): Promise<TaskCategory[]> => {
    try {
        return await request<TaskCategory[]>('/categories');
    } catch (error) {
        console.error('Error fetching categories:', errorMessage(error));
        return [];
    }
};

export const createCategory = async (
    category: Pick<TaskCategory, 'name' | 'color'>
): Promise<TaskCategory | null> => {
    try {
        return await request<TaskCategory>('/categories', {
            method: 'POST',
            body: { name: category.name, color: category.color },
        });
    } catch (error) {
        console.error('Error creating category:', errorMessage(error));
        return null;
    }
};

export const updateCategory = async (id: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> => {
    try {
        return await request<TaskCategory>(`/categories/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: updates,
        });
    } catch (error) {
        console.error('Error updating category:', errorMessage(error));
        return null;
    }
};

export const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await request(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return { success: true };
    } catch (error) {
        console.error('Error deleting category:', errorMessage(error));
        return { success: false, error: errorMessage(error) };
    }
};
