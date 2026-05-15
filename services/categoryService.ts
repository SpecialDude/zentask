import { supabase } from '../supabase';
import { TaskCategory } from '../types';

export const getCategories = async (userId: string): Promise<TaskCategory[]> => {
    const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('user_id', userId)
        .order('createdAt', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }

    return data || [];
};

export const createCategory = async (category: Omit<TaskCategory, 'createdAt'>): Promise<TaskCategory | null> => {
    const newCategory = {
        ...category,
        id: crypto.randomUUID(),
        createdAt: Date.now()
    };

    const { data, error } = await supabase
        .from('task_categories')
        .insert([newCategory])
        .select()
        .single();

    if (error) {
        console.error('Error creating category:', error);
        return null;
    }

    return data;
};

export const updateCategory = async (id: string, updates: Partial<TaskCategory>): Promise<TaskCategory | null> => {
    const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating category:', error);
        return null;
    }

    return data;
};

export const deleteCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting category:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
};
