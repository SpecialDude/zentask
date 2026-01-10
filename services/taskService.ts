/**
 * Task Service
 * Handles all task-related database operations
 */

import { supabase } from '../supabase';
import { Task, TaskStatus } from '../types';
import { generateId } from '../utils';

// ==================== Fetch Operations ====================

export const fetchTasks = async (userId: string): Promise<{ data: Task[] | null; error: any }> => {
    return supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);
};

// ==================== Create Operations ====================

export const insertTasks = async (tasks: Task[]): Promise<{ error: any }> => {
    return supabase.from('tasks').insert(tasks);
};

export const createTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>,
    userId: string
): Task => {
    return {
        ...taskData,
        id: generateId(),
        user_id: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    } as Task;
};

// ==================== Update Operations ====================

export interface TaskUpdateResult {
    finalUpdates: Partial<Task>;
    error: any | null;
}

/**
 * Normalizes status and completion to ensure consistency
 */
export const normalizeStatusAndCompletion = (
    originalTask: Task,
    updates: Partial<Task>
): Partial<Task> => {
    const finalUpdates = { ...updates };

    if (updates.status) {
        if (updates.status === TaskStatus.COMPLETED) finalUpdates.completion = 100;
        else if (updates.status === TaskStatus.TODO) finalUpdates.completion = 0;
        else if (updates.status === TaskStatus.IN_PROGRESS &&
            (originalTask.completion === 0 || originalTask.completion === 100)) {
            finalUpdates.completion = 50;
        }
    } else if (updates.completion !== undefined) {
        if (updates.completion >= 100) finalUpdates.status = TaskStatus.COMPLETED;
        else if (updates.completion === 0) finalUpdates.status = TaskStatus.TODO;
        else finalUpdates.status = TaskStatus.IN_PROGRESS;
    }

    return finalUpdates;
};

export const updateTaskInDb = async (
    id: string,
    updates: Partial<Task>
): Promise<{ error: any }> => {
    return supabase
        .from('tasks')
        .update({ ...updates, updatedAt: Date.now() })
        .eq('id', id);
};

export const updateMultipleTasksInDb = async (
    ids: string[],
    updates: Partial<Task>
): Promise<{ error: any }> => {
    return supabase
        .from('tasks')
        .update({ ...updates, updatedAt: Date.now() })
        .in('id', ids);
};

// ==================== Delete Operations ====================

export const deleteTaskFromDb = async (id: string): Promise<{ error: any }> => {
    return supabase.from('tasks').delete().eq('id', id);
};

// ==================== Helper Functions ====================

/**
 * Syncs parent task completion based on children's status
 * Pure function - returns updated tasks array
 */
export const syncParentCompletion = (taskId: string, allTasks: Task[]): Task[] => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task?.parentId) return allTasks;

    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return allTasks;

    // Get all siblings (same parent and same date)
    const siblings = allTasks.filter(
        t => t.parentId === parent.id && t.date === parent.date
    );

    if (siblings.length === 0) return allTasks;

    // Calculate aggregate completion
    const avgCompletion = Math.round(
        siblings.reduce((sum, s) => sum + (s.completion || 0), 0) / siblings.length
    );

    // Determine parent status
    let parentStatus: TaskStatus;
    if (avgCompletion >= 100) parentStatus = TaskStatus.COMPLETED;
    else if (avgCompletion === 0) parentStatus = TaskStatus.TODO;
    else parentStatus = TaskStatus.IN_PROGRESS;

    // Update parent in array
    let updated = allTasks.map(t =>
        t.id === parent.id
            ? { ...t, completion: avgCompletion, status: parentStatus, updatedAt: Date.now() }
            : t
    );

    // Recursively sync grandparent
    if (parent.parentId) {
        updated = syncParentCompletion(parent.id, updated);
    }

    return updated;
};

/**
 * Collects all task IDs in a hierarchy (up and down)
 */
export const collectTaskHierarchy = (
    taskId: string,
    taskDate: string,
    allTasks: Task[]
): Set<string> => {
    const treeIds = new Set<string>();

    // Go Down - collect children
    const collectDown = (parentId: string) => {
        treeIds.add(parentId);
        allTasks
            .filter(t => t.parentId === parentId && t.date === taskDate)
            .forEach(c => collectDown(c.id));
    };
    collectDown(taskId);

    // Go Up - collect parents
    let current = allTasks.find(t => t.id === taskId);
    while (current?.parentId) {
        const parent = allTasks.find(t => t.id === current!.parentId);
        if (!parent) break;
        treeIds.add(parent.id);
        current = parent;
    }

    return treeIds;
};

/**
 * Gets the root task of a hierarchy
 */
export const findRootTask = (taskId: string, allTasks: Task[]): Task | undefined => {
    let current = allTasks.find(t => t.id === taskId);
    while (current?.parentId) {
        const parent = allTasks.find(t => t.id === current!.parentId);
        if (!parent) break;
        current = parent;
    }
    return current;
};
