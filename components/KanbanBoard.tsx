
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '../types';

interface KanbanBoardProps {
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, updates: Partial<Task>, moveSubtasks?: boolean) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (t: Task) => void;
  onCarryOver: (id: string, newDate: string, reason?: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateTask, onEditTask, onCarryOver, onDeleteTask }) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [dropAction, setDropAction] = useState<{ task: Task, status: string | TaskStatus } | null>(null);
  const [promptData, setPromptData] = useState({ date: '', reason: '' });
  const [touchDragging, setTouchDragging] = useState<{ task: Task; x: number; y: number; startX: number; startY: number } | null>(null);
  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragThreshold = 10; // pixels before drag activates

  const columns = [
    { id: TaskStatus.TODO, title: 'To Do', color: 'bg-slate-400', isVirtual: false },
    { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'bg-primary', isVirtual: false },
    { id: TaskStatus.COMPLETED, title: 'Completed', color: 'bg-green-500', isVirtual: false },
    { id: TaskStatus.CANCELLED, title: 'Cancelled', color: 'bg-red-400', isVirtual: false },
    { id: 'CARRIED_OVER', title: 'Carried Over', color: 'bg-blue-400', isVirtual: true },
  ];

  const onDragStart = (e: React.DragEvent, task: Task) => {
    setActiveTask(task);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (task: Task, status: string | TaskStatus) => {
    if (status === 'CARRIED_OVER') {
      if (task.completion >= 100) {
        alert("Completed tasks cannot be carried over.");
        return;
      }
      const tomorrow = new Date(task.date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDropAction({ task, status });
      setPromptData({ date: tomorrow.toISOString().split('T')[0], reason: '' });
    } else if (status === TaskStatus.CANCELLED) {
      setDropAction({ task, status });
      setPromptData({ date: '', reason: '' });
    } else {
      onUpdateTask(task.id, { status: status as TaskStatus }, true);
    }
  };

  const onDrop = (e: React.DragEvent, status: string | TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    handleDrop(task, status);
    setActiveTask(null);
  };

  // Clear long press timer on cleanup
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Touch event handlers for mobile
  const onTouchStart = useCallback((e: React.TouchEvent, task: Task) => {
    if (task.carriedOverTo) return;
    const touch = e.touches[0];

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      // Vibrate on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setTouchDragging({
        task,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY
      });
      setActiveTask(task);
      setIsDraggingActive(true);
    }, 300); // 300ms long press to start drag
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];

    // If we have a pending long press, check if user moved too much
    if (longPressTimer.current && touchDragging === null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      return;
    }

    if (!touchDragging || !isDraggingActive) return;

    // Prevent scrolling while dragging
    e.preventDefault();

    setTouchDragging({
      ...touchDragging,
      x: touch.clientX,
      y: touch.clientY
    });
  }, [touchDragging, isDraggingActive]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchDragging || !isDraggingActive) {
      setTouchDragging(null);
      setIsDraggingActive(false);
      return;
    }

    // Find which column the touch ended over
    const touch = e.changedTouches[0];
    let targetStatus: string | TaskStatus | null = null;

    columnRefs.current.forEach((el, colId) => {
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        targetStatus = colId;
      }
    });

    if (targetStatus && targetStatus !== touchDragging.task.status) {
      handleDrop(touchDragging.task, targetStatus);
    }

    setTouchDragging(null);
    setActiveTask(null);
    setIsDraggingActive(false);
  }, [touchDragging, isDraggingActive]);

  const onTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setTouchDragging(null);
    setActiveTask(null);
    setIsDraggingActive(false);
  }, []);

  const handlePromptSubmit = () => {
    if (!dropAction) return;
    const { task, status } = dropAction;

    if (status === 'CARRIED_OVER') {
      onCarryOver(task.id, promptData.date, promptData.reason);
    } else {
      onUpdateTask(task.id, {
        status: TaskStatus.CANCELLED,
        cancelReason: promptData.reason
      }, true);
    }
    setDropAction(null);
  };

  const renderTaskCard = (task: Task, isInStatus: boolean, level: number) => (
    <div
      key={task.id}
      draggable={isInStatus && !task.carriedOverTo}
      onDragStart={(e) => isInStatus && onDragStart(e, task)}
      onTouchStart={(e) => isInStatus && onTouchStart(e, task)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      style={{ touchAction: isDraggingActive ? 'none' : 'auto' }}
      className={`relative p-3 rounded-xl shadow-sm border transition-all group select-none ${!isInStatus
        ? 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:shadow-md cursor-pointer active:scale-95'
        } ${activeTask?.id === task.id ? 'opacity-40 grayscale scale-105' : ''} ${level > 0 ? 'ml-4' : ''} ${touchDragging?.task.id === task.id && isDraggingActive ? 'ring-2 ring-primary opacity-50' : ''}`}
      onClick={() => isInStatus && !isDraggingActive && onEditTask(task)}
    >
      {!isInStatus && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-px bg-slate-300 dark:bg-slate-700" />
      )}
      <div className="flex justify-between items-start mb-1 gap-2">
        <h4 className={`text-sm font-semibold leading-tight break-words ${task.status === TaskStatus.COMPLETED && isInStatus ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'
          } ${!isInStatus ? 'text-[11px] text-slate-500 italic' : ''}`}>
          {task.title}
        </h4>
        {isInStatus && task.carriedOverTo && (
          <span className="text-[10px] text-blue-500 font-bold uppercase italic whitespace-nowrap">→ {task.carriedOverTo}</span>
        )}
      </div>

      {isInStatus && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            {task.startTime && !task.carriedOverTo && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{task.startTime}</span>
            )}
            <div className="w-12 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full ${task.status === TaskStatus.COMPLETED ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${task.completion}%` }}></div>
            </div>
            <span className="text-[9px] font-bold text-slate-400">{task.completion}%</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderTaskTree = (node: any, level: number) => (
    <div key={node.task.id} className="space-y-2">
      {renderTaskCard(node.task, node.isInStatus, level)}
      {node.children.length > 0 && (
        <div className="space-y-2 border-l border-slate-200 dark:border-slate-700 ml-3 pl-3 py-1">
          {node.children.map((child: any) => renderTaskTree(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex space-x-6 h-full min-h-[calc(100vh-12rem)] pb-4 overflow-x-auto custom-scrollbar relative">
      {/* Mobile Drag Preview */}
      {touchDragging && isDraggingActive && (
        <div
          className="fixed z-[200] pointer-events-none bg-white dark:bg-slate-800 border-2 border-primary rounded-xl p-3 shadow-2xl max-w-[200px] opacity-90"
          style={{
            left: touchDragging.x - 100 + 'px',
            top: touchDragging.y - 30 + 'px',
            transform: 'rotate(-3deg)'
          }}
        >
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {touchDragging.task.title}
          </h4>
        </div>
      )}
      {columns.map(col => {
        const explicitColTasks = tasks.filter(t => {
          if (col.isVirtual) return !!t.carriedOverTo;
          return t.status === col.id && !t.carriedOverTo;
        });

        // Collect all tasks needed for this column forest (matching tasks + their parents)
        const visibleIds = new Set<string>();
        explicitColTasks.forEach(t => {
          let curr: Task | undefined = t;
          while (curr) {
            visibleIds.add(curr.id);
            curr = curr.parentId ? tasks.find(p => p.id === curr?.parentId) : undefined;
          }
        });

        const visibleTasks = tasks.filter(t => visibleIds.has(t.id));

        const buildForest = (parentId: string | null): any[] => {
          return visibleTasks
            .filter(t => t.parentId === parentId)
            .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
            .map(t => ({
              task: t,
              isInStatus: explicitColTasks.some(ect => ect.id === t.id),
              children: buildForest(t.id)
            }));
        };

        const forest = buildForest(null);

        return (
          <div
            key={col.id}
            ref={(el) => { if (el) columnRefs.current.set(col.id, el); }}
            className={`flex-shrink-0 w-80 flex flex-col ${touchDragging ? 'pointer-events-auto' : ''}`}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">{col.title}</h3>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{explicitColTasks.length}</span>
              </div>
            </div>

            <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/30 rounded-[2rem] p-3 space-y-4 overflow-y-auto custom-scrollbar border-2 border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              {forest.length === 0 && (
                <div className="h-24 flex items-center justify-center text-slate-400 text-xs text-center px-4">
                  {col.isVirtual ? 'Drop here to carry out' : 'Drag here'}
                </div>
              )}
              {forest.map(tree => renderTaskTree(tree, 0))}
            </div>
          </div>
        );
      })}

      {/* DROP PROMPT MODAL */}
      {dropAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDropAction(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold">
              {dropAction.status === 'CARRIED_OVER' ? 'Carry Over Task' : 'Cancel Task'}
            </h3>
            <p className="text-sm text-slate-500">"{dropAction.task.title}"</p>

            <div className="space-y-4">
              {dropAction.status === 'CARRIED_OVER' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Date</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <button
                      onClick={() => {
                        const t = new Date(); t.setDate(t.getDate() + 1);
                        setPromptData({ ...promptData, date: t.toISOString().split('T')[0] });
                      }}
                      className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-primary hover:text-white transition-all"
                    >Tomorrow</button>
                    <button
                      onClick={() => {
                        const t = new Date(); t.setDate(t.getDate() + 2);
                        setPromptData({ ...promptData, date: t.toISOString().split('T')[0] });
                      }}
                      className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-primary hover:text-white transition-all"
                    >Next Day</button>
                  </div>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 text-sm transition-all outline-none"
                    value={promptData.date}
                    onChange={e => setPromptData({ ...promptData, date: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {dropAction.status === 'CARRIED_OVER' ? 'Reason / Note (Optional)' : 'Reason for Cancellation'}
                </label>
                <textarea
                  rows={2}
                  autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-sm transition-all outline-none resize-none"
                  placeholder="Why are you moving this?"
                  value={promptData.reason}
                  onChange={e => setPromptData({ ...promptData, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDropAction(null)}
                className="flex-1 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >Cancel</button>
              <button
                onClick={handlePromptSubmit}
                className="flex-1 py-3 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
