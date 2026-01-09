
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Task, TaskStatus, ViewType, RecurrencePattern } from './types';
import { generateId, getTodayStr, getStatusFromProgress } from './utils';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ListView from './components/ListView';
import KanbanBoard from './components/KanbanBoard';
import TaskModal from './components/TaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import AIModal from './components/AIModal';
import Settings from './components/Settings';
import ExtendRecurringModal from './components/ExtendRecurringModal';
import Auth from './components/Auth';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import Dashboard from './components/Dashboard';
import { useToast } from './components/Toast';
import { supabase } from './supabase';

const App: React.FC = () => {
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [viewType, setViewType] = useState<ViewType>('LIST');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [parentForSubtask, setParentForSubtask] = useState<string | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string, title: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string, title: string, deleteAll: boolean } | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [extendingTask, setExtendingTask] = useState<Task | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [userName, setUserName] = useState<string>('');

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.user_metadata?.display_name) {
        setUserName(session.user.user_metadata.display_name);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.user_metadata?.display_name) {
        setUserName(session.user.user_metadata.display_name);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // FAB scroll visibility handler
  const handleContentScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const scrollDiff = currentScrollY - lastScrollY.current;

    // Only trigger if scrolled more than 10px to prevent flickering
    if (Math.abs(scrollDiff) > 10) {
      if (scrollDiff > 0 && currentScrollY > 100) {
        // Scrolling down
        setIsFabVisible(false);
      } else {
        // Scrolling up
        setIsFabVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
  }, []);

  // Fetch Tasks from Supabase
  useEffect(() => {
    if (session?.user?.id) {
      const fetchTasks = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error fetching tasks:', error);
          showToast('Failed to load tasks', 'error');
        } else if (data) {
          setTasks(data);
        }
        setIsLoading(false);
      };
      fetchTasks();
    } else {
      setTasks([]);
      setIsLoading(false);
    }
  }, [session]);

  // Theme Handling
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const syncParents = (taskId: string, currentTasks: Task[]): Task[] => {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task || !task.parentId) return currentTasks;

    const parent = currentTasks.find(t => t.id === task.parentId);
    if (!parent) return currentTasks;

    const subtasks = currentTasks.filter(t => t.parentId === parent.id && t.date === parent.date);
    const avgProgress = Math.round(subtasks.reduce((acc, s) => acc + (s.completion || 0), 0) / subtasks.length);
    const newStatus = getStatusFromProgress(avgProgress);

    const updatedTasks = currentTasks.map(t => {
      if (t.id === parent.id) {
        const up = { ...t, completion: avgProgress, status: newStatus, updatedAt: Date.now() };
        // Sync parent to DB
        supabase.from('tasks').update({ completion: avgProgress, status: newStatus, updatedAt: Date.now() }).eq('id', parent.id).then();
        return up;
      }
      return t;
    });

    return syncParents(parent.id, updatedTasks);
  };

  const generateRecurringInstances = (baseTask: Task, allTasks: Task[] = []): Task[] => {
    if (!baseTask.isRecurring || !baseTask.recurrencePattern) return [];

    // Get subtree of the baseTask at the same date
    const getSubtree = (parentId: string): Task[] => {
      const children = allTasks.filter(t => t.parentId === parentId && t.date === baseTask.date);
      let subtree = [...children];
      children.forEach(child => {
        subtree = [...subtree, ...getSubtree(child.id)];
      });
      return subtree;
    };
    const baseSubtree = getSubtree(baseTask.id);

    const instances: Task[] = [];
    const startDate = new Date(baseTask.date);
    const endDate = baseTask.recurrenceEndDate ? new Date(baseTask.recurrenceEndDate) : new Date(startDate);
    if (!baseTask.recurrenceEndDate) endDate.setMonth(endDate.getMonth() + 3); // Default 3 months

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Start from next occurrence

    while (currentDate <= endDate) {
      let shouldAdd = false;
      if (baseTask.recurrencePattern === RecurrencePattern.DAILY) shouldAdd = true;
      else if (baseTask.recurrencePattern === RecurrencePattern.WEEKLY) {
        if (currentDate.getDay() === startDate.getDay()) shouldAdd = true;
      } else if (baseTask.recurrencePattern === RecurrencePattern.WEEKDAYS) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) shouldAdd = true;
      } else if (baseTask.recurrencePattern === RecurrencePattern.MONTHLY) {
        if (currentDate.getDate() === startDate.getDate()) shouldAdd = true;
      }

      if (shouldAdd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const newRootId = generateId();

        // Clone the root task for this date
        instances.push({
          ...baseTask,
          id: newRootId,
          date: dateStr,
          recurringParentId: baseTask.id,
          isRecurring: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        // Clone the subtree and link it to the new parent IDs
        const idMap: Record<string, string> = { [baseTask.id]: newRootId };
        baseSubtree.forEach(st => {
          const newStId = generateId();
          idMap[st.id] = newStId;
          instances.push({
            ...st,
            id: newStId,
            parentId: idMap[st.parentId!] || null,
            date: dateStr,
            recurringParentId: st.id,
            isRecurring: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
      if (instances.length > 500) break; // Safety break
    }
    return instances;
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>) => {
    if (!session?.user?.id) return;

    const newTask: Task = {
      ...taskData,
      id: generateId(),
      user_id: session.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Task;

    const tasksToInsert: Task[] = [newTask];
    const recurringInstances = generateRecurringInstances(newTask, tasks);
    tasksToInsert.push(...recurringInstances);

    // Unified recurrence handled by helper above

    const { error } = await supabase.from('tasks').insert(tasksToInsert);
    if (error) {
      console.error('Error adding task(s):', error);
      showToast('Failed to add task', 'error');
      return;
    }

    showToast(tasksToInsert.length > 1 ? `Added ${tasksToInsert.length} recurring tasks!` : 'Task created!', 'success');

    setTasks(prev => {
      const updated = [...prev, ...tasksToInsert];
      return syncParents(newTask.id, updated);
    });
    setIsModalOpen(false);
  };

  const handleAIPlanGenerated = async (generatedTasks: any[]) => {
    if (!session?.user?.id) return;

    const nextTasks: Task[] = [];
    const processTask = (t: any, parentId: string | null = null) => {
      const taskId = generateId();
      const newTask: Task = {
        id: taskId,
        user_id: session.user.id,
        parentId,
        title: t.title,
        description: t.description || '',
        status: TaskStatus.TODO,
        completion: 0,
        date: selectedDate,
        startTime: t.startTime,
        duration: t.duration,
        priority: t.priority,
        isRecurring: t.isRecurring || false,
        recurrencePattern: t.recurrencePattern,
        createdAt: Date.now(),
        updatedAt: Date.now()
      } as Task;
      nextTasks.push(newTask);

      if (t.subtasks && Array.isArray(t.subtasks)) {
        t.subtasks.forEach((st: any) => processTask(st, taskId));
      }
    };

    generatedTasks.forEach(t => processTask(t));

    const { error } = await supabase.from('tasks').insert(nextTasks);
    if (error) {
      console.error('Error batch adding AI tasks:', error);
      showToast('Failed to add AI tasks', 'error');
      return;
    }

    showToast(`Added ${nextTasks.length} tasks from AI plan!`, 'success');

    setTasks(prev => [...prev, ...nextTasks]);
  };

  const updateTask = async (id: string, updates: Partial<Task>, moveSubtasks = false) => {
    const originalTask = tasks.find(t => t.id === id);
    if (!originalTask) return;

    // Consistency check: Resolve status and completion
    const finalUpdates = { ...updates };

    if (updates.status) {
      if (updates.status === TaskStatus.COMPLETED) finalUpdates.completion = 100;
      else if (updates.status === TaskStatus.TODO) finalUpdates.completion = 0;
      else if (updates.status === TaskStatus.IN_PROGRESS && (originalTask.completion === 0 || originalTask.completion === 100)) {
        finalUpdates.completion = 50;
      }
    } else if (updates.completion !== undefined) {
      if (updates.completion >= 100) finalUpdates.status = TaskStatus.COMPLETED;
      else if (updates.completion === 0) finalUpdates.status = TaskStatus.TODO;
      else finalUpdates.status = TaskStatus.IN_PROGRESS;
    }

    const { error } = await supabase.from('tasks').update({ ...finalUpdates, updatedAt: Date.now() }).eq('id', id);
    if (error) {
      console.error('Error updating task:', error);
      return;
    }

    // Handle transition to recurring
    let addedRecurringInstances: Task[] = [];
    let updatedTreeInLocal: Task[] = [];

    if (updates.isRecurring && !originalTask?.isRecurring) {
      // 1. Identify all tasks in the hierarchy (Up and Down)
      const treeIds = new Set<string>();

      // Go Down
      const collectDown = (parentId: string) => {
        treeIds.add(parentId);
        tasks.filter(t => t.parentId === parentId && t.date === originalTask.date).forEach(c => collectDown(c.id));
      };
      collectDown(id);

      // Go Up
      let currentRoot = originalTask;
      treeIds.add(currentRoot.id);
      while (currentRoot.parentId) {
        const parent = tasks.find(t => t.id === currentRoot.parentId);
        if (!parent) break;
        treeIds.add(parent.id);
        currentRoot = parent;
      }

      // 2. Propagate recurrence properties in DB for the whole tree
      const recProps = {
        isRecurring: true,
        recurrencePattern: updates.recurrencePattern || originalTask.recurrencePattern,
        recurrenceEndDate: updates.recurrenceEndDate || originalTask.recurrenceEndDate,
        updatedAt: Date.now()
      };

      const { error: propError } = await supabase.from('tasks').update(recProps).in('id', Array.from(treeIds));
      if (propError) console.error('Error propagating recurrence:', propError);

      // 3. Generate instances for the WHOLE ROOT TREE starting from its root
      // This ensures the entire hierarchy repeats correctly
      const updatedRoot = { ...currentRoot, ...recProps } as Task;
      addedRecurringInstances = generateRecurringInstances(updatedRoot, tasks);

      if (addedRecurringInstances.length > 0) {
        const { error: insertError } = await supabase.from('tasks').insert(addedRecurringInstances);
        if (insertError) {
          console.error('Error inserting new recurring instances:', insertError);
        } else {
          showToast(`Hierarchy is now recurring! Added ${addedRecurringInstances.length} task instances.`, 'success');
        }
      }

      // Prepare local state update for the tree
      updatedTreeInLocal = tasks.map(t => treeIds.has(t.id) ? { ...t, ...recProps } : t);
    }

    setTasks(prev => {
      let currentPool = updatedTreeInLocal.length > 0 ? updatedTreeInLocal : prev;
      let updated = currentPool.map(t => t.id === id ? { ...t, ...finalUpdates, updatedAt: Date.now() } : t);
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
          ? { ...t, status: finalUpdates.status || t.status, completion: finalUpdates.completion !== undefined ? finalUpdates.completion : t.completion, updatedAt: Date.now() }
          : t);
      }

      return syncParents(id, updated);
    });

    showToast('Task updated', 'success');
  };

  const deleteTask = async (id: string, deleteAll = false, confirmed = false) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Series logic: sharing same recurringParentId OR being the root
    const seriesId = task.recurringParentId || task.id;

    // If it's a recurring task and we haven't chosen delete mode, show choice prompt
    if (!confirmed && (task.isRecurring || task.recurringParentId) && !pendingDelete) {
      setDeleteConfig({ id, title: task.title });
      return;
    }

    // If not confirmed and no pendingDelete state, show confirmation
    if (!confirmed) {
      setPendingDelete({ id, title: task.title, deleteAll });
      setDeleteConfig(null);
      return;
    }

    const tasksToDelete = deleteAll
      ? tasks.filter(t => t.id === seriesId || t.recurringParentId === seriesId)
      : [task];

    const deleteRecursiveDB = async (t: Task) => {
      const children = tasks.filter(child => child.parentId === t.id && child.date === t.date);
      for (const child of children) {
        await deleteRecursiveDB(child);
      }
      await supabase.from('tasks').delete().eq('id', t.id);
    };

    for (const t of tasksToDelete) {
      await deleteRecursiveDB(t);
    }

    const deleteRecursiveLocal = (taskId: string, date: string, currentTasks: Task[]): Task[] => {
      let filtered = currentTasks.filter(t => t.id !== taskId);
      const subtasks = currentTasks.filter(t => t.parentId === taskId && t.date === date);
      subtasks.forEach(sub => {
        filtered = deleteRecursiveLocal(sub.id, date, filtered);
      });
      return filtered;
    };

    setTasks(prev => {
      let updated = prev;
      tasksToDelete.forEach(t => {
        updated = deleteRecursiveLocal(t.id, t.date, updated);
      });
      // Optionally sync parents for EACH deleted task if they had parents
      tasksToDelete.forEach(t => {
        if (t.parentId) updated = syncParents(t.parentId, updated);
      });
      return updated;
    });

    setDeleteConfig(null);
    setPendingDelete(null);
    showToast(deleteAll ? 'Entire series deleted' : 'Task deleted', 'success');
  };

  const carryOverTask = async (id: string, newDate: string, reason?: string) => {
    if (!session?.user?.id) return;
    const original = tasks.find(t => t.id === id);
    if (!original || original.completion >= 100) return;

    // 1. Mark original as carried over
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
          user_id: session.user.id,
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
      user_id: session.user.id,
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
      const newSubId = generateId();
      const clonedSub = {
        ...sub,
        id: newSubId,
        user_id: session.user.id,
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

    // Auto-complete parent if all remaining subtasks are done or carried over
    if (original.parentId) {
      const allSiblings = tasks.filter(t => t.parentId === original.parentId && t.date === original.date && t.id !== id);
      const allSiblingsDoneOrCarried = allSiblings.every(s =>
        s.status === TaskStatus.COMPLETED || s.carriedOverTo
      );

      if (allSiblingsDoneOrCarried) {
        const parent = tasks.find(t => t.id === original.parentId);
        if (parent && parent.status !== TaskStatus.COMPLETED) {
          // Auto-complete the parent
          await supabase.from('tasks').update({
            status: TaskStatus.COMPLETED,
            completion: 100,
            updatedAt: Date.now()
          }).eq('id', parent.id);

          setTasks(prev => prev.map(t =>
            t.id === parent.id
              ? { ...t, status: TaskStatus.COMPLETED, completion: 100, updatedAt: Date.now() }
              : t
          ));

          showToast(`Parent task "${parent.title}" auto-completed`, 'info');
        }
      }
    }

    showToast(`Task carried over to ${new Date(newDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 'success');
  };

  // Extend a recurring series by generating more instances
  const extendRecurringSeries = async (taskId: string, additionalOccurrences: number) => {
    if (!session?.user?.id) return;

    // Find the task and its recurring parent (template)
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const parentId = task.recurringParentId || task.id;
    const templateTask = tasks.find(t => t.id === parentId);
    if (!templateTask) return;

    // Find the current last instance in the series
    const seriesInstances = tasks.filter(t =>
      t.id === parentId || t.recurringParentId === parentId
    );
    const lastInstance = seriesInstances.reduce((latest, t) =>
      t.date > latest.date ? t : latest
    );

    // Generate new instances starting from the day after the last one
    const pattern = templateTask.recurrencePattern;
    if (!pattern) return;

    const newInstances: Task[] = [];
    let currentDate = new Date(lastInstance.date);
    let addedCount = 0;

    // Get subtree from the template date
    const getSubtree = (pId: string, date: string): Task[] => {
      const children = tasks.filter(t => t.parentId === pId && t.date === date);
      let subtree = [...children];
      children.forEach(child => {
        subtree = [...subtree, ...getSubtree(child.id, date)];
      });
      return subtree;
    };
    const templateSubtree = getSubtree(templateTask.id, templateTask.date);

    while (addedCount < additionalOccurrences) {
      currentDate.setDate(currentDate.getDate() + 1);
      let shouldAdd = false;

      if (pattern === RecurrencePattern.DAILY) shouldAdd = true;
      else if (pattern === RecurrencePattern.WEEKLY) {
        const templateDay = new Date(templateTask.date).getDay();
        if (currentDate.getDay() === templateDay) shouldAdd = true;
      } else if (pattern === RecurrencePattern.WEEKDAYS) {
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) shouldAdd = true;
      } else if (pattern === RecurrencePattern.MONTHLY) {
        const templateDate = new Date(templateTask.date).getDate();
        if (currentDate.getDate() === templateDate) shouldAdd = true;
      }

      if (shouldAdd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const newRootId = generateId();

        // Clone the root task for this date (from template)
        newInstances.push({
          ...templateTask,
          id: newRootId,
          user_id: session.user.id,
          date: dateStr,
          status: TaskStatus.TODO,
          completion: 0,
          recurringParentId: templateTask.id,
          isRecurring: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        } as Task);

        // Clone subtree
        const idMap: Record<string, string> = { [templateTask.id]: newRootId };
        templateSubtree.forEach(st => {
          const newStId = generateId();
          idMap[st.id] = newStId;
          newInstances.push({
            ...st,
            id: newStId,
            user_id: session.user.id,
            parentId: idMap[st.parentId!] || null,
            date: dateStr,
            status: TaskStatus.TODO,
            completion: 0,
            recurringParentId: st.id,
            isRecurring: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          } as Task);
        });

        addedCount++;
      }

      // Safety break
      if (currentDate.getFullYear() > new Date().getFullYear() + 2) break;
    }

    if (newInstances.length > 0) {
      const { error } = await supabase.from('tasks').insert(newInstances);
      if (error) {
        console.error('Error extending recurring series:', error);
        showToast('Failed to extend recurring series', 'error');
        return;
      }

      setTasks(prev => [...prev, ...newInstances]);
      showToast(`Extended series by ${addedCount} occurrences`, 'success');
    }
  };

  // End a recurring series (mark as ended, no more instances)
  const endRecurringSeries = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const parentId = task.recurringParentId || task.id;
    const today = getTodayStr();

    // Update the template task to end today
    const { error } = await supabase.from('tasks').update({
      recurrenceEndDate: today,
      updatedAt: Date.now()
    }).eq('id', parentId);

    if (error) {
      console.error('Error ending recurring series:', error);
      showToast('Failed to end recurring series', 'error');
      return;
    }

    setTasks(prev => prev.map(t =>
      t.id === parentId
        ? { ...t, recurrenceEndDate: today, updatedAt: Date.now() }
        : t
    ));

    showToast('Recurring series ended', 'success');
  };

  const handleOpenModal = (task?: Task, parentId: string | null = null) => {
    setEditingTask(task);
    setParentForSubtask(parentId);
    setIsModalOpen(true);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.date === selectedDate);
  }, [tasks, selectedDate]);

  if (!session) {
    return <Auth />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner size="lg" message="Loading your tasks..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        viewType={viewType}
        setViewType={(v) => { setViewType(v); setIsSidebarOpen(false); }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onAddTask={() => handleOpenModal()}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenAI={() => setIsAIModalOpen(true)}
          userEmail={session.user.email}
          userName={userName}
        />

        <div onScroll={handleContentScroll} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {viewType === 'DASHBOARD' ? (
            <Dashboard
              tasks={tasks}
              selectedDate={selectedDate}
              onTaskClick={(t) => { setSelectedDate(t.date); setViewType('LIST'); }}
              onGoToDate={(d) => { setSelectedDate(d); setViewType('LIST'); }}
              onExtendSeries={(t) => setExtendingTask(t)}
            />
          ) : viewType === 'LIST' ? (
            <ListView
              tasks={filteredTasks}
              allTasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onEditTask={(t) => handleOpenModal(t)}
              onViewTask={(t) => setViewingTask(t)}
              onAddSubtask={(parentId) => handleOpenModal(undefined, parentId)}
              onCarryOver={carryOverTask}
              onExtendSeries={(t) => setExtendingTask(t)}
            />
          ) : viewType === 'SETTINGS' ? (
            <Settings
              tasks={tasks}
              userEmail={session.user.email || ''}
              userName={userName}
              onNameUpdate={(name) => setUserName(name)}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              allTasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onEditTask={(t) => handleOpenModal(t)}
              onCarryOver={carryOverTask}
            />
          )}
        </div>

        {/* Mobile FAB for Add Task / AI Plan */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          {/* Expandable Options */}
          {isFabOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 -z-10"
                onClick={() => setIsFabOpen(false)}
              />

              {/* Option Buttons */}
              <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2 mb-1">
                <button
                  onClick={() => { setIsFabOpen(false); setIsAIModalOpen(true); }}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-primary text-white px-4 py-2 rounded-full shadow-md active:scale-95 transition-all text-xs font-bold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  AI Plan
                </button>

                <button
                  onClick={() => { setIsFabOpen(false); handleOpenModal(); }}
                  className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-full shadow-md active:scale-95 transition-all text-xs font-bold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Task
                </button>
              </div>
            </>
          )}

          {/* Main FAB Button */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-all duration-300 ${isFabOpen ? 'rotate-45' : ''} ${!isFabVisible && !isFabOpen ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}
            aria-label="Actions"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {isModalOpen && (
          <TaskModal
            onClose={() => setIsModalOpen(false)}
            onSave={(data) => {
              if (editingTask) {
                updateTask(editingTask.id, data);
              } else {
                addTask({
                  ...data,
                  parentId: parentForSubtask,
                  date: selectedDate,
                  status: TaskStatus.TODO,
                  completion: 0
                } as any);
              }
              setIsModalOpen(false);
            }}
            initialData={editingTask}
            isSubtask={!!parentForSubtask}
          />
        )}

        {isAIModalOpen && (
          <AIModal
            onClose={() => setIsAIModalOpen(false)}
            onPlanGenerated={handleAIPlanGenerated}
          />
        )}

        {viewingTask && (
          <TaskDetailModal
            task={viewingTask}
            allTasks={tasks}
            onClose={() => setViewingTask(null)}
            onEdit={() => {
              setViewingTask(null);
              handleOpenModal(viewingTask);
            }}
          />
        )}

        {/* Extend Recurring Modal */}
        {extendingTask && (
          <ExtendRecurringModal
            taskTitle={extendingTask.title}
            onClose={() => setExtendingTask(null)}
            onExtend={(count) => extendRecurringSeries(extendingTask.id, count)}
            onEnd={() => endRecurringSeries(extendingTask.id)}
          />
        )}

        {/* Delete Confirmation Modal for Recurring Tasks */}
        {deleteConfig && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md p-8 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Delete Task?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                "<span className="font-bold text-slate-700 dark:text-slate-200">{deleteConfig.title}</span>" is a recurring task. How would you like to delete it?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => deleteTask(deleteConfig.id, false)}
                  className="w-full py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-2xl transition-all flex items-center justify-between group"
                >
                  <span>Delete only this instance</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteTask(deleteConfig.id, true)}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-between group"
                >
                  <span>Delete all instances</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteConfig(null)}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Final Delete Confirmation Modal */}
        {pendingDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100 dark:bg-red-900/30 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Confirm Deletion</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Are you sure you want to delete "<span className="font-semibold text-slate-700 dark:text-slate-200">{pendingDelete.title}</span>"
                    {pendingDelete.deleteAll && <span className="text-red-500 font-medium"> and all its recurring instances</span>}?
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTask(pendingDelete.id, pendingDelete.deleteAll, true)}
                  className="flex-1 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
};

const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
