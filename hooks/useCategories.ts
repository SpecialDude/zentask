import { useState, useEffect, useCallback } from 'react';
import { TaskCategory } from '../types';
import * as categoryService from '../services/categoryService';

interface UseCategoriesOptions {
    userId: string | undefined;
    showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useCategories({ userId, showToast }: UseCategoriesOptions) {
    const [categories, setCategories] = useState<TaskCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchCategories = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const data = await categoryService.getCategories(userId);
        setCategories(data);
        setIsLoading(false);
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchCategories();
        } else {
            setCategories([]);
        }
    }, [userId, fetchCategories]);

    const addCategory = useCallback(async (name: string, color: string) => {
        if (!userId) return null;
        const newCat = await categoryService.createCategory({ user_id: userId, name, color });
        if (newCat) {
            setCategories(prev => [...prev, newCat]);
            showToast?.('Category created', 'success');
            return newCat;
        } else {
            showToast?.('Failed to create category', 'error');
            return null;
        }
    }, [userId, showToast]);

    const updateCategory = useCallback(async (id: string, updates: Partial<TaskCategory>) => {
        const updatedCat = await categoryService.updateCategory(id, updates);
        if (updatedCat) {
            setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
            showToast?.('Category updated', 'success');
            return updatedCat;
        } else {
            showToast?.('Failed to update category', 'error');
            return null;
        }
    }, [showToast]);

    const removeCategory = useCallback(async (id: string) => {
        const result = await categoryService.deleteCategory(id);
        if (result.success) {
            setCategories(prev => prev.filter(c => c.id !== id));
            showToast?.('Category deleted', 'success');
            return true;
        } else {
            showToast?.(result.error || 'Failed to delete category', 'error');
            return false;
        }
    }, [showToast]);

    return {
        categories,
        isLoading,
        addCategory,
        updateCategory,
        removeCategory,
        refreshCategories: fetchCategories
    };
}
