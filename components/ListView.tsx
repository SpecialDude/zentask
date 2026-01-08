
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import TaskItem from './TaskItem';

interface ListViewProps {
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: Task) => void;
  onViewTask: (t: Task) => void;
  onAddSubtask: (parentId: string) => void;
  onCarryOver: (id: string, newDate: string) => void;
  onExtendSeries: (t: Task) => void;
}

type SortMode = 'SMART' | 'PRIORITY' | 'TIME' | 'STATUS';

const ListView: React.FC<ListViewProps> = ({
  tasks, allTasks, onUpdateTask, onDeleteTask, onEditTask, onViewTask, onAddSubtask, onCarryOver, onExtendSeries
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('SMART');
  const [hideCompleted, setHideCompleted] = useState(false);

  // Check if a task hierarchy is fully completed
  const isFullyCompleted = (task: Task): boolean => {
    if (task.status !== TaskStatus.COMPLETED) return false;
    const subtasks = allTasks.filter(t => t.parentId === task.id && t.date === task.date);
    return subtasks.every(st => isFullyCompleted(st));
  };

  // Priority weight for sorting (higher = more important)
  const getPriorityWeight = (priority?: TaskPriority): number => {
    switch (priority) {
      case TaskPriority.URGENT: return 4;
      case TaskPriority.HIGH: return 3;
      case TaskPriority.MEDIUM: return 2;
      case TaskPriority.LOW: return 1;
      default: return 0;
    }
  };

  // Status weight for sorting (lower = appears first)
  const getStatusWeight = (status: TaskStatus): number => {
    switch (status) {
      case TaskStatus.IN_PROGRESS: return 0;
      case TaskStatus.TODO: return 1;
      case TaskStatus.COMPLETED: return 2;
      case TaskStatus.CANCELLED: return 3;
      default: return 4;
    }
  };

  // Sort function based on selected mode
  const sortTasks = (a: Task, b: Task): number => {
    // Tasks without time go to bottom of their group
    const aHasTime = !!a.startTime;
    const bHasTime = !!b.startTime;

    switch (sortMode) {
      case 'PRIORITY':
        const priorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
        return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');

      case 'TIME':
        if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
        return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');

      case 'STATUS':
        const statusDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
        if (statusDiff !== 0) return statusDiff;
        if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
        return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');

      case 'SMART':
      default:
        // Smart sort: Status → Priority → Time → Creation
        const smartStatusDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
        if (smartStatusDiff !== 0) return smartStatusDiff;
        const smartPriorityDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        if (smartPriorityDiff !== 0) return smartPriorityDiff;
        if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
        if (a.startTime !== b.startTime) return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
        return a.createdAt - b.createdAt;
    }
  };

  // Filter and sort root tasks
  const sortedRootTasks = useMemo(() => {
    let rootTasks = tasks.filter(t => t.parentId === null);

    // Hide fully completed hierarchies if toggle is on
    if (hideCompleted) {
      rootTasks = rootTasks.filter(t => !isFullyCompleted(t));
    }

    return rootTasks.sort(sortTasks);
  }, [tasks, allTasks, sortMode, hideCompleted]);

  const sortOptions: { value: SortMode; label: string; icon: string }[] = [
    { value: 'SMART', label: 'Smart', icon: '✨' },
    { value: 'PRIORITY', label: 'Priority', icon: '🔥' },
    { value: 'TIME', label: 'Time', icon: '🕐' },
    { value: 'STATUS', label: 'Status', icon: '📊' },
  ];

  if (sortedRootTasks.length === 0 && !hideCompleted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p className="text-lg font-medium">No tasks for this day yet.</p>
        <p className="text-sm">Plan your day by adding a new task!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Sort & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Sort:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${sortMode === opt.value
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <span>{opt.icon}</span>
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setHideCompleted(!hideCompleted)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${hideCompleted
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {hideCompleted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <span>{hideCompleted ? 'Show Completed' : 'Hide Completed'}</span>
        </button>
      </div>

      {sortedRootTasks.length === 0 && hideCompleted ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium text-green-600">All tasks completed!</p>
          <button
            onClick={() => setHideCompleted(false)}
            className="text-sm text-primary hover:underline mt-2"
          >
            Show completed tasks
          </button>
        </div>
      ) : (
        sortedRootTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            allTasks={allTasks}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
            onViewTask={onViewTask}
            onAddSubtask={onAddSubtask}
            onCarryOver={onCarryOver}
            onExtendSeries={onExtendSeries}
            level={0}
          />
        ))
      )}
    </div>
  );
};

export default ListView;

