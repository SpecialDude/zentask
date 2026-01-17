/**
 * useTasks - Comprehensive hook for task state management
 * 
 * Handles all task CRUD operations, recurring tasks, carry-over, and parent sync.
 */

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus, RecurrencePattern } from '../types';
import { generateId, getTodayStr, getStatusFromProgress } from '../utils';
import { supabase } from '../supabase';
import * as taskService from '../services/taskService';

interface UseTasksOptions {
    userId: string | undefined;
    showToast: (message: string, type: 'success' | 'error' | 'info', duration?: number, action?: { label: string; onClick: () => void }) => void;
    onTaskCompleted?: (task: Task) => void;
}

export function useTasks({ userId, showToast, onTaskCompleted }: UseTasksOptions) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch tasks on mount/user change
    useEffect(() => {
        if (userId) {
            const fetchTasksData = async () => {
                setIsLoading(true);
                const { data, error } = await taskService.fetchTasks(userId);
                if (error) {
                    console.error('Error fetching tasks:', error);
                    showToast('Failed to load tasks', 'error');
                } else if (data) {
                    setTasks(data);
                }
                setIsLoading(false);
            };
            fetchTasksData();
        } else {
            setTasks([]);
        }
    }, [userId]);

    // Sync parent task completion based on children
    const syncParents = useCallback((taskId: string, currentTasks: Task[]): Task[] => {
        const task = currentTasks.find(t => t.id === taskId);
        if (!task || !task.parentId) return currentTasks;

        const parent = currentTasks.find(t => t.id === task.parentId);
        if (!parent) return currentTasks;

        const subtasks = currentTasks.filter(t => t.parentId === parent.id && t.date === parent.date);
        const avgProgress = Math.round(subtasks.reduce((acc, s) => acc + (s.completion || 0), 0) / subtasks.length);
        const newStatus = getStatusFromProgress(avgProgress);

        const updatedTasks = currentTasks.map(t => {
            if (t.id === parent.id) {
                supabase.from('tasks').update({ completion: avgProgress, status: newStatus, updatedAt: Date.now() }).eq('id', parent.id).then();
                return { ...t, completion: avgProgress, status: newStatus, updatedAt: Date.now() };
            }
            return t;
        });

        return syncParents(parent.id, updatedTasks);
    }, []);

    // Add a new task
    const addTask = useCallback(async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>, onSuccess?: () => void) => {
        if (!userId) return;

        const newTask: Task = {
            ...taskData,
            id: generateId(),
            user_id: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        } as Task;

        const tasksToInsert: Task[] = [newTask];
        const recurringInstances = taskService.generateRecurringInstances(newTask, tasks);
        tasksToInsert.push(...recurringInstances);

        const { error } = await supabase.from('tasks').insert(tasksToInsert);
        if (error) {
            console.error('Error adding task(s):', error);
            showToast('Failed to add task', 'error');
            return;
        }

        showToast(tasksToInsert.length > 1 ? `Added ${tasksToInsert.length} recurring tasks!` : 'Task created!', 'success');
        setTasks(prev => syncParents(newTask.id, [...prev, ...tasksToInsert]));
        onSuccess?.();
    }, [userId, tasks, showToast, syncParents]);

    // Update an existing task
    const updateTask = useCallback(async (id: string, updates: Partial<Task>, moveSubtasks = false) => {
        const originalTask = tasks.find(t => t.id === id);
        if (!originalTask) return;

        const finalUpdates = taskService.normalizeStatusAndCompletion(originalTask, updates);

        // Check for completion transition
        const wasNotCompleted = originalTask.status !== TaskStatus.COMPLETED;
        const isNowCompleted = finalUpdates.status === TaskStatus.COMPLETED ||
            (finalUpdates.completion !== undefined && finalUpdates.completion >= 100);

        // Prepare descendant updates if completing parent
        let descendantsToUpdate: string[] = [];
        if (wasNotCompleted && isNowCompleted) {
            const getDescendants = (parentId: string): string[] => {
                const children = tasks.filter(t => t.parentId === parentId && t.date === originalTask.date);
                let result = children.map(c => c.id);
                children.forEach(c => result = [...result, ...getDescendants(c.id)]);
                return result;
            };
            descendantsToUpdate = getDescendants(id);
        }

        // 1. Update the main task
        const { error } = await supabase.from('tasks').update({ ...finalUpdates, updatedAt: Date.now() }).eq('id', id);
        if (error) {
            console.error('Error updating task:', error);
            return;
        }

        // 2. Update descendants if needed
        if (descendantsToUpdate.length > 0) {
            const { error: descError } = await supabase
                .from('tasks')
                .update({ status: TaskStatus.COMPLETED, completion: 100, updatedAt: Date.now() })
                .in('id', descendantsToUpdate);

            if (descError) {
                console.error('Error updating descendants:', descError);
                showToast('Task completed, but failed to update subtasks', 'error');
            }
        }

        let addedRecurringInstances: Task[] = [];
        let updatedTreeInLocal: Task[] = [];

        // Handle transition to recurring
        if (updates.isRecurring && !originalTask.isRecurring) {
            const treeIds = taskService.collectTaskHierarchy(id, originalTask.date, tasks);
            let currentRoot = taskService.findRootTask(id, tasks);

            const recProps = {
                isRecurring: true,
                recurrencePattern: updates.recurrencePattern || originalTask.recurrencePattern,
                recurrenceEndDate: updates.recurrenceEndDate || originalTask.recurrenceEndDate,
                updatedAt: Date.now()
            };

            await supabase.from('tasks').update(recProps).in('id', Array.from(treeIds));

            if (currentRoot) {
                const updatedRoot = { ...currentRoot, ...recProps } as Task;
                addedRecurringInstances = taskService.generateRecurringInstances(updatedRoot, tasks);

                if (addedRecurringInstances.length > 0) {
                    await supabase.from('tasks').insert(addedRecurringInstances);
                    showToast(`Hierarchy is now recurring! Added ${addedRecurringInstances.length} task instances.`, 'success');
                }
            }

            updatedTreeInLocal = tasks.map(t => treeIds.has(t.id) ? { ...t, ...recProps } : t);
        }

        setTasks(prev => {
            let currentPool = updatedTreeInLocal.length > 0 ? updatedTreeInLocal : prev;

            // Apply main task update
            let updated = currentPool.map(t => t.id === id ? { ...t, ...finalUpdates, updatedAt: Date.now() } : t);

            // Apply descendant updates
            if (descendantsToUpdate.length > 0) {
                updated = updated.map(t =>
                    descendantsToUpdate.includes(t.id)
                        ? { ...t, status: TaskStatus.COMPLETED, completion: 100, updatedAt: Date.now() }
                        : t
                );
            }

            if (addedRecurringInstances.length > 0) {
                updated = [...updated, ...addedRecurringInstances];
            }

            if (moveSubtasks) {
                const tasksToMove = prev.filter(t => t.parentId === id && t.date === prev.find(p => p.id === id)?.date);
                tasksToMove.forEach(t => {
                    supabase.from('tasks').update({
                        status: finalUpdates.status || t.status,
                        completion: finalUpdates.completion !== undefined ? finalUpdates.completion : t.completion,
                        updatedAt: Date.now()
                    }).eq('id', t.id).then();
                });

                updated = updated.map(t => t.parentId === id && t.date === prev.find(p => p.id === id)?.date
                    ? { ...t, status: finalUpdates.status || t.status, completion: finalUpdates.completion ?? t.completion, updatedAt: Date.now() }
                    : t);
            }

            return syncParents(id, updated);
        });

        // Handle completion callback
        if (wasNotCompleted && isNowCompleted) {
            const completedTask = { ...originalTask, ...finalUpdates, updatedAt: Date.now() };
            if (onTaskCompleted) {
                showToast(`"${originalTask.title}" completed! ✅`, 'success', 5000, {
                    label: 'Add Review →',
                    onClick: () => onTaskCompleted(completedTask)
                });
            } else {
                showToast(`"${originalTask.title}" completed! ✅`, 'success');
            }
        } else {
            showToast('Task updated', 'success');
        }
    }, [tasks, showToast, syncParents, onTaskCompleted]);

    // Delete a task
    const deleteTask = useCallback(async (
        id: string,
        deleteAll = false,
        confirmed = false,
        onNeedConfirmation?: (config: { id: string; title: string }) => void,
        onNeedRecurringChoice?: (config: { id: string; title: string; deleteAll: boolean }) => void
    ) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        if (task.isRecurring && !confirmed) {
            onNeedRecurringChoice?.({ id, title: task.title, deleteAll });
            return;
        }

        if (!confirmed) {
            onNeedConfirmation?.({ id, title: task.title });
            return;
        }

        const deleteRecursiveDB = async (t: Task) => {
            await supabase.from('tasks').delete().eq('id', t.id);
            const children = tasks.filter(c => c.parentId === t.id && c.date === t.date);
            for (const child of children) {
                await deleteRecursiveDB(child);
            }
        };

        const deleteRecursiveLocal = (taskId: string, date: string, currentTasks: Task[]): Task[] => {
            const children = currentTasks.filter(t => t.parentId === taskId && t.date === date);
            let filtered = currentTasks.filter(t => t.id !== taskId);
            for (const child of children) {
                filtered = deleteRecursiveLocal(child.id, date, filtered);
            }
            return filtered;
        };

        if (deleteAll && task.isRecurring) {
            const parentId = task.recurringParentId || task.id;
            const allInSeries = tasks.filter(t => t.id === parentId || t.recurringParentId === parentId);
            for (const t of allInSeries) await deleteRecursiveDB(t);
            setTasks(prev => prev.filter(t => t.id !== parentId && t.recurringParentId !== parentId));
            showToast('Recurring series deleted', 'success');
        } else {
            await deleteRecursiveDB(task);
            setTasks(prev => deleteRecursiveLocal(id, task.date, prev));
            showToast('Task deleted', 'success');
        }
    }, [tasks, showToast]);

    // Carry over an incomplete task to a new date
    const carryOverTask = useCallback(async (id: string, newDate: string, reason?: string) => {
        if (!userId) return;
        const original = tasks.find(t => t.id === id);
        if (!original || original.completion >= 100) return;

        await supabase.from('tasks').update({ carriedOverTo: newDate, updatedAt: Date.now() }).eq('id', id);

        let newParentId = original.parentId;
        const extraLocalTasks: Task[] = [];

        if (original.parentId) {
            const originalParent = tasks.find(p => p.id === original.parentId);
            const parentOnNewDate = tasks.find(t => t.parentId === null && t.title === originalParent?.title && t.date === newDate);

            if (parentOnNewDate) {
                newParentId = parentOnNewDate.id;
            } else if (originalParent) {
                const clonedParentId = generateId();
                const clonedParent: Task = {
                    ...originalParent,
                    id: clonedParentId,
                    user_id: userId,
                    date: newDate,
                    completion: 0,
                    status: TaskStatus.TODO,
                    carriedOverFrom: originalParent.date,
                    carriedOverTo: undefined,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                } as Task;
                await supabase.from('tasks').insert([clonedParent]);
                extraLocalTasks.push(clonedParent);
                newParentId = clonedParentId;
            }
        }

        const newTask: Task = {
            ...original,
            id: generateId(),
            user_id: userId,
            parentId: newParentId,
            date: newDate,
            status: TaskStatus.TODO,
            completion: 0,
            carriedOverFrom: original.date,
            carriedOverTo: undefined,
            carryOverReason: reason,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        } as Task;
        await supabase.from('tasks').insert([newTask]);

        const subtasks = tasks.filter(t => t.parentId === id && t.date === original.date && t.completion < 100 && !t.carriedOverTo);
        const clonedSubtasks: Task[] = [];
        for (const sub of subtasks) {
            const clonedSub = {
                ...sub,
                id: generateId(),
                user_id: userId,
                parentId: newTask.id,
                date: newDate,
                status: TaskStatus.TODO,
                completion: 0,
                carriedOverFrom: sub.date,
                carriedOverTo: undefined,
                createdAt: Date.now(),
                updatedAt: Date.now()
            } as Task;
            await supabase.from('tasks').insert([clonedSub]);
            await supabase.from('tasks').update({ carriedOverTo: newDate, updatedAt: Date.now() }).eq('id', sub.id);
            clonedSubtasks.push(clonedSub);
        }

        setTasks(prev => {
            const updatedLocal = prev.map(t => {
                if (t.id === id) return { ...t, carriedOverTo: newDate, updatedAt: Date.now() };
                if (subtasks.find(s => s.id === t.id)) return { ...t, carriedOverTo: newDate, updatedAt: Date.now() };
                return t;
            });
            return [...updatedLocal, newTask, ...extraLocalTasks, ...clonedSubtasks];
        });

        // Auto-complete parent if all siblings done/carried
        if (original.parentId) {
            const allSiblings = tasks.filter(t => t.parentId === original.parentId && t.date === original.date && t.id !== id);
            const allDone = allSiblings.every(s => s.status === TaskStatus.COMPLETED || s.carriedOverTo);

            if (allDone) {
                const parent = tasks.find(t => t.id === original.parentId);
                if (parent && parent.status !== TaskStatus.COMPLETED) {
                    await supabase.from('tasks').update({ status: TaskStatus.COMPLETED, completion: 100, updatedAt: Date.now() }).eq('id', parent.id);
                    setTasks(prev => prev.map(t => t.id === parent.id ? { ...t, status: TaskStatus.COMPLETED, completion: 100, updatedAt: Date.now() } : t));
                    showToast(`Parent task "${parent.title}" auto-completed`, 'info');
                }
            }
        }

        showToast(`Task carried over to ${new Date(newDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 'success');
    }, [userId, tasks, showToast]);

    // Extend recurring series
    const extendRecurringSeries = useCallback(async (taskId: string, additionalOccurrences: number) => {
        if (!userId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const parentId = task.recurringParentId || task.id;
        const templateTask = tasks.find(t => t.id === parentId);
        if (!templateTask || !templateTask.recurrencePattern) return;

        const seriesInstances = tasks.filter(t => t.id === parentId || t.recurringParentId === parentId);
        const lastInstance = seriesInstances.reduce((latest, t) => t.date > latest.date ? t : latest);

        const pattern = templateTask.recurrencePattern;
        const newInstances: Task[] = [];
        let currentDate = new Date(lastInstance.date);
        let addedCount = 0;

        const getSubtree = (pId: string, date: string): Task[] => {
            const children = tasks.filter(t => t.parentId === pId && t.date === date);
            let subtree = [...children];
            children.forEach(child => { subtree = [...subtree, ...getSubtree(child.id, date)]; });
            return subtree;
        };
        const templateSubtree = getSubtree(templateTask.id, templateTask.date);

        while (addedCount < additionalOccurrences) {
            currentDate.setDate(currentDate.getDate() + 1);
            let shouldAdd = false;

            if (pattern === RecurrencePattern.DAILY) shouldAdd = true;
            else if (pattern === RecurrencePattern.WEEKLY && currentDate.getDay() === new Date(templateTask.date).getDay()) shouldAdd = true;
            else if (pattern === RecurrencePattern.WEEKDAYS && currentDate.getDay() !== 0 && currentDate.getDay() !== 6) shouldAdd = true;
            else if (pattern === RecurrencePattern.MONTHLY && currentDate.getDate() === new Date(templateTask.date).getDate()) shouldAdd = true;

            if (shouldAdd) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const newRootId = generateId();

                newInstances.push({
                    ...templateTask, id: newRootId, user_id: userId, date: dateStr, status: TaskStatus.TODO, completion: 0,
                    recurringParentId: templateTask.id, isRecurring: true, createdAt: Date.now(), updatedAt: Date.now()
                } as Task);

                const idMap: Record<string, string> = { [templateTask.id]: newRootId };
                templateSubtree.forEach(st => {
                    const newStId = generateId();
                    idMap[st.id] = newStId;
                    newInstances.push({
                        ...st, id: newStId, user_id: userId, parentId: idMap[st.parentId!] || null, date: dateStr,
                        status: TaskStatus.TODO, completion: 0, recurringParentId: st.id, isRecurring: true,
                        createdAt: Date.now(), updatedAt: Date.now()
                    } as Task);
                });
                addedCount++;
            }

            if (currentDate.getFullYear() > new Date().getFullYear() + 2) break;
        }

        if (newInstances.length > 0) {
            const { error } = await supabase.from('tasks').insert(newInstances);
            if (error) {
                showToast('Failed to extend recurring series', 'error');
                return;
            }
            setTasks(prev => [...prev, ...newInstances]);
            showToast(`Extended series by ${addedCount} occurrences`, 'success');
        }
    }, [userId, tasks, showToast]);

    // End recurring series
    const endRecurringSeries = useCallback(async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const parentId = task.recurringParentId || task.id;
        const today = getTodayStr();

        const { error } = await supabase.from('tasks').update({ recurrenceEndDate: today, updatedAt: Date.now() }).eq('id', parentId);
        if (error) {
            showToast('Failed to end recurring series', 'error');
            return;
        }

        setTasks(prev => prev.map(t => t.id === parentId ? { ...t, recurrenceEndDate: today, updatedAt: Date.now() } : t));
        showToast('Recurring series ended', 'success');
    }, [tasks, showToast]);

    // Handle AI-generated plan
    const handleAIPlanGenerated = useCallback(async (generatedTasks: any[], taskDate: string) => {
        if (!userId) return;

        const processTask = (t: any, parentId: string | null = null): Task[] => {
            const taskId = generateId();
            const newTask: Task = {
                id: taskId, user_id: userId, title: t.title, description: t.description || '',
                date: t.date || taskDate, startTime: t.startTime || '', duration: t.duration || 0,
                status: TaskStatus.TODO, completion: 0, priority: t.priority,
                parentId, createdAt: Date.now(), updatedAt: Date.now(),
            } as Task;

            let allTasks = [newTask];
            if (t.subtasks?.length > 0) {
                for (const sub of t.subtasks) {
                    allTasks = [...allTasks, ...processTask(sub, taskId)];
                }
            }
            return allTasks;
        };

        const tasksToAdd: Task[] = [];
        for (const t of generatedTasks) {
            tasksToAdd.push(...processTask(t));
        }

        const { error } = await supabase.from('tasks').insert(tasksToAdd);
        if (error) {
            showToast('Failed to save AI-generated tasks', 'error');
            return;
        }

        showToast(`Added ${tasksToAdd.length} tasks from AI plan!`, 'success');
        setTasks(prev => [...prev, ...tasksToAdd]);
    }, [userId, showToast]);

    // Reparent a task - change its parentId
    const reparentTask = useCallback(async (taskId: string, newParentId: string | null) => {
        if (!userId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Prevent circular reference - can't parent to own descendant
        if (newParentId) {
            const isDescendant = (parentId: string | null): boolean => {
                if (!parentId) return false;
                if (parentId === taskId) return true;
                const parent = tasks.find(t => t.id === parentId);
                return parent ? isDescendant(parent.parentId) : false;
            };
            if (isDescendant(newParentId)) {
                showToast('Cannot move task to its own descendant', 'error');
                return;
            }
        }

        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, parentId: newParentId, updatedAt: Date.now() } : t
        ));

        const { error } = await supabase
            .from('tasks')
            .update({ parentId: newParentId, updatedAt: Date.now() })
            .eq('id', taskId);

        if (error) {
            console.error('Error reparenting task:', error);
            showToast('Failed to move task', 'error');
            // Revert
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, parentId: task.parentId } : t
            ));
        } else {
            showToast(newParentId ? 'Task moved' : 'Task made root', 'success');
        }
    }, [userId, tasks, showToast]);

    return {
        tasks,
        setTasks,
        isLoading,
        addTask,
        updateTask,
        deleteTask,
        carryOverTask,
        extendRecurringSeries,
        endRecurringSeries,
        handleAIPlanGenerated,
        syncParents,
        reparentTask
    };
}
