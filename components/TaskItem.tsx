
import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { formatDuration, calculateAggregateProgress } from '../utils';

interface TaskItemProps {
  task: Task;
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: Task) => void;
  onViewTask: (t: Task) => void;
  onAddSubtask: (parentId: string) => void;
  onCarryOver: (id: string, newDate: string, reason?: string) => void;
  level: number;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task, allTasks, onUpdateTask, onDeleteTask, onEditTask, onViewTask, onAddSubtask, onCarryOver, level
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [showCarryPrompt, setShowCarryPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [carryReason, setCarryReason] = useState('');

  const tomorrowStr = useMemo(() => {
    const d = new Date(task.date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [task.date]);

  const [carryDate, setCarryDate] = useState(tomorrowStr);

  const subtasks = useMemo(() => allTasks.filter(t => t.parentId === task.id && t.date === task.date), [allTasks, task.id, task.date]);
  const progress = task.completion;

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return 'bg-green-500';
      case TaskStatus.IN_PROGRESS: return 'bg-primary';
      case TaskStatus.CANCELLED: return 'bg-slate-400';
      default: return 'bg-slate-200 dark:bg-slate-700';
    }
  };

  const getPriorityConfig = (priority?: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT: return { label: '🔥 Urgent', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-600 dark:text-red-400' };
      case TaskPriority.HIGH: return { label: 'High', bgColor: 'bg-orange-100 dark:bg-orange-900/30', textColor: 'text-orange-600 dark:text-orange-400' };
      case TaskPriority.MEDIUM: return { label: 'Medium', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-600 dark:text-blue-400' };
      case TaskPriority.LOW: return { label: 'Low', bgColor: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-500' };
      default: return null;
    }
  };

  const handleStatusToggle = () => {
    if (task.status === TaskStatus.COMPLETED) {
      onUpdateTask(task.id, { status: TaskStatus.TODO, completion: 0 });
    } else {
      onUpdateTask(task.id, { status: TaskStatus.COMPLETED, completion: 100 });
    }
  };

  const handleCancelSubmit = () => {
    onUpdateTask(task.id, {
      status: TaskStatus.CANCELLED,
      cancelReason
    });
    setShowCancelPrompt(false);
  };

  const handleCarryOverSubmit = () => {
    onCarryOver(task.id, carryDate, carryReason);
    setShowCarryPrompt(false);
  };

  const canCarryOver = !task.carriedOverTo && task.completion < 100 && task.status !== TaskStatus.CANCELLED;

  const setQuickDate = (offset: number) => {
    const d = new Date(task.date);
    d.setDate(d.getDate() + offset);
    setCarryDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className={`flex flex-col ${level > 0 ? 'ml-4 md:ml-8 mt-2 border-l-2 border-slate-100 dark:border-slate-800 pl-4' : ''}`}>
      <div
        onClick={() => onViewTask(task)}
        className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 md:p-4 transition-all shadow-sm hover:shadow-md cursor-pointer ${task.status === TaskStatus.CANCELLED || task.carriedOverTo ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start gap-3 md:gap-4">
          <button
            disabled={!!task.carriedOverTo}
            onClick={(e) => { e.stopPropagation(); handleStatusToggle(); }}
            className={`mt-1 h-5 w-5 md:h-6 md:w-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.status === TaskStatus.COMPLETED
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-slate-300 dark:border-slate-600'
              } ${task.carriedOverTo ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {task.status === TaskStatus.COMPLETED && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1">
              <h3 className={`text-sm md:text-base font-semibold transition-all break-words ${task.status === TaskStatus.COMPLETED || task.carriedOverTo ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                {task.title}
              </h3>
              <div className="flex items-center flex-wrap gap-1 md:space-x-2 text-[10px] md:text-xs font-medium text-slate-500">
                {task.carriedOverTo && (
                  <span className="flex items-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded italic font-normal">
                    to {task.carriedOverTo}
                  </span>
                )}
                {task.carriedOverFrom && (
                  <span className="flex items-center bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded italic font-normal">
                    from {task.carriedOverFrom}
                  </span>
                )}
                {task.startTime && !task.carriedOverTo && (
                  <span className="flex items-center bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {task.startTime}
                  </span>
                )}
                {getPriorityConfig(task.priority) && (
                  <span className={`px-1.5 py-0.5 rounded font-semibold ${getPriorityConfig(task.priority)!.bgColor} ${getPriorityConfig(task.priority)!.textColor}`}>
                    {getPriorityConfig(task.priority)!.label}
                  </span>
                )}
                {task.isRecurring && (
                  <span className="flex items-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded gap-1" title={task.recurrencePattern}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    {task.recurrencePattern?.toLowerCase()}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 rounded text-white ${getStatusColor(task.status)} whitespace-nowrap`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {task.description && (
              <p className="text-xs md:text-sm text-slate-500 mb-2 md:mb-3 line-clamp-2">{task.description}</p>
            )}

            {(task.cancelReason || task.carryOverReason) && (
              <div className="text-[10px] md:text-xs space-y-1 mb-2 md:mb-3">
                {task.cancelReason && (
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded-lg">
                    Cancel: {task.cancelReason}
                  </div>
                )}
                {task.carryOverReason && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
                    Carry Over: {task.carryOverReason}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3">
              <div className="flex-1 h-1 md:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getStatusColor(task.status)}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-[8px] md:text-[10px] font-bold text-slate-400 w-6 md:w-8">{progress}%</span>
            </div>
          </div>

          <div className="flex md:flex-row flex-col items-center gap-1 md:space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {!task.carriedOverTo && (
              <>
                <button onClick={(e) => { e.stopPropagation(); onAddSubtask(task.id); }} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors" title="Add Subtask">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors" title="Edit Task">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                </button>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (task.status !== TaskStatus.CANCELLED) setShowCancelPrompt(!showCancelPrompt);
                    }}
                    className={`p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${task.status === TaskStatus.CANCELLED ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                    title="Cancel Task"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  </button>
                  {showCancelPrompt && (
                    <div className="absolute right-0 top-full mt-2 w-56 md:w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-2xl z-50">
                      <p className="text-xs font-semibold mb-2">Cancel reason?</p>
                      <textarea
                        autoFocus
                        className="w-full text-xs p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 mb-2 outline-none"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowCancelPrompt(false)} className="text-[10px] px-2 py-1 text-slate-500">Close</button>
                        <button onClick={handleCancelSubmit} className="text-[10px] px-2 py-1 bg-red-500 text-white rounded">Confirm</button>
                      </div>
                    </div>
                  )}
                </div>
                {canCarryOver && (
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowCarryPrompt(!showCarryPrompt); }} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors" title="Carry over">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    {showCarryPrompt && (
                      <div className="absolute right-0 top-full mt-2 w-64 md:w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xl z-50 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carry Over To</p>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => setQuickDate(1)} className="text-[9px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-primary hover:text-white transition-all">Tomorrow</button>
                          <button onClick={() => setQuickDate(2)} className="text-[9px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-primary hover:text-white transition-all">Next Day</button>
                        </div>
                        <input type="date" className="w-full text-xs p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none" value={carryDate} onChange={(e) => setCarryDate(e.target.value)} />
                        <textarea className="w-full text-xs p-2 border rounded bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 outline-none resize-none" placeholder="Reason (optional)" rows={2} value={carryReason} onChange={(e) => setCarryReason(e.target.value)} />
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => setShowCarryPrompt(false)} className="text-[10px] px-2 py-1.5 text-slate-500">Cancel</button>
                          <button onClick={handleCarryOverSubmit} className="text-[10px] px-2 py-1.5 bg-primary text-white font-bold rounded-lg">Confirm</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <button onClick={() => onDeleteTask(task.id)} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Delete Task">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 01-1 1v6a1 1 0 112 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>

        {subtasks.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-0.5 text-slate-400 hover:text-primary transition-all z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && subtasks.length > 0 && (
        <div className="space-y-2 mt-2">
          {subtasks.map(sub => (
            <TaskItem
              key={sub.id}
              task={sub}
              allTasks={allTasks}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onEditTask={onEditTask}
              onViewTask={onViewTask}
              onAddSubtask={onAddSubtask}
              onCarryOver={onCarryOver}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskItem;
