
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, TaskStatus, ViewType } from './types';
import { generateId, getTodayStr, getStatusFromProgress } from './utils';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ListView from './components/ListView';
import KanbanBoard from './components/KanbanBoard';
import TaskModal from './components/TaskModal';
import AIModal from './components/AIModal';
import Auth from './components/Auth';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './supabase';

const App: React.FC = () => {
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

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'user_id'>) => {
    if (!session?.user?.id) return;

    const newTask: Task = {
      ...taskData,
      id: generateId(),
      user_id: session.user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Task;

    const { error } = await supabase.from('tasks').insert([newTask]);
    if (error) {
      console.error('Error adding task:', error);
      return;
    }

    setTasks(prev => {
      const updated = [...prev, newTask];
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
      return;
    }

    setTasks(prev => [...prev, ...nextTasks]);
  };

  const updateTask = async (id: string, updates: Partial<Task>, moveSubtasks = false) => {
    const { error } = await supabase.from('tasks').update({ ...updates, updatedAt: Date.now() }).eq('id', id);
    if (error) {
      console.error('Error updating task:', error);
      return;
    }

    setTasks(prev => {
      let updated = prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t);

      if (moveSubtasks) {
        const tasksToMove = prev.filter(t => t.parentId === id && t.date === prev.find(p => p.id === id)?.date);
        tasksToMove.forEach(t => {
          supabase.from('tasks').update({
            status: updates.status || t.status,
            completion: updates.completion !== undefined ? updates.completion : t.completion,
            updatedAt: Date.now()
          }).eq('id', t.id).then();
        });

        updated = updated.map(t => t.parentId === id && t.date === prev.find(p => p.id === id)?.date
          ? { ...t, status: updates.status || t.status, completion: updates.completion !== undefined ? updates.completion : t.completion, updatedAt: Date.now() }
          : t);
      }

      return syncParents(id, updated);
    });
  };

  const deleteTask = async (id: string) => {
    const deleteRecursiveDB = async (taskId: string) => {
      // Find children
      const children = tasks.filter(t => t.parentId === taskId);
      for (const child of children) {
        await deleteRecursiveDB(child.id);
      }
      await supabase.from('tasks').delete().eq('id', taskId);
    };

    const deleteRecursiveLocal = (taskId: string, currentTasks: Task[]): Task[] => {
      let filtered = currentTasks.filter(t => t.id !== taskId);
      const subtasks = currentTasks.filter(t => t.parentId === taskId);
      subtasks.forEach(sub => {
        filtered = deleteRecursiveLocal(sub.id, filtered);
      });
      return filtered;
    };

    await deleteRecursiveDB(id);
    setTasks(prev => {
      const target = prev.find(t => t.id === id);
      const filtered = deleteRecursiveLocal(id, prev);
      return target?.parentId ? syncParents(target.parentId, filtered) : filtered;
    });
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
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {viewType === 'LIST' ? (
            <ListView
              tasks={filteredTasks}
              allTasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onEditTask={(t) => handleOpenModal(t)}
              onAddSubtask={(parentId) => handleOpenModal(undefined, parentId)}
              onCarryOver={carryOverTask}
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
      </main>
    </div>
  );
};

const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
