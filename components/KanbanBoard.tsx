
import React, { useState } from 'react';
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

  const onDrop = (e: React.DragEvent, status: string | TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

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
      onUpdateTask(task.id, { 
        status: status as TaskStatus, 
        completion: status === TaskStatus.COMPLETED ? 100 : task.completion 
      }, true);
    }
    setActiveTask(null);
  };

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

  const renderTaskCard = (task: Task, isSubtask = false) => (
    <div 
      key={task.id} 
      draggable={!task.carriedOverTo}
      onDragStart={(e) => onDragStart(e, task)}
      className={`bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all cursor-pointer select-none active:scale-95 ${isSubtask ? 'ml-4 border-l-2 border-slate-200 dark:border-slate-600' : ''} ${activeTask?.id === task.id ? 'opacity-40 grayscale' : ''}`}
      onClick={() => onEditTask(task)}
    >
      <div className="flex justify-between items-start mb-1">
        <h4 className={`text-sm font-semibold leading-tight pr-4 ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {task.title}
        </h4>
        {task.carriedOverTo && (
           <span className="text-[10px] text-blue-500 font-bold uppercase italic whitespace-nowrap">→ {task.carriedOverTo}</span>
        )}
      </div>
      
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
    </div>
  );

  return (
    <div className="flex space-x-6 h-full min-h-[calc(100vh-12rem)] pb-4 overflow-x-auto custom-scrollbar relative">
      {columns.map(col => {
        const colTasks = tasks.filter(t => {
          if (col.isVirtual) return !!t.carriedOverTo;
          return t.status === col.id && !t.carriedOverTo;
        });
        
        const visibleTopLevelTasks = colTasks.filter(t => !t.parentId || !tasks.find(p => p.id === t.parentId));

        return (
          <div 
            key={col.id} 
            className="flex-shrink-0 w-80 flex flex-col"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`}></div>
                <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">{col.title}</h3>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
            </div>

            <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl p-2 space-y-3 overflow-y-auto custom-scrollbar border-2 border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              {visibleTopLevelTasks.length === 0 && (
                <div className="h-24 flex items-center justify-center text-slate-400 text-xs text-center px-4">
                  {col.isVirtual ? 'Drop here to carry out' : 'Drag here'}
                </div>
              )}
              {visibleTopLevelTasks.map(parentTask => {
                const children = tasks.filter(child => child.parentId === parentTask.id);
                return (
                  <div key={parentTask.id} className="space-y-2">
                    {renderTaskCard(parentTask)}
                    {children.length > 0 && (
                      <div className="space-y-1 mt-1 border-l border-slate-200 dark:border-slate-700 ml-2 pl-2">
                        <p className="text-[9px] uppercase font-bold text-slate-400 px-2 tracking-widest">Subtasks</p>
                        {children.map(child => renderTaskCard(child, true))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                        setPromptData({...promptData, date: t.toISOString().split('T')[0]});
                      }}
                      className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-primary hover:text-white transition-all"
                    >Tomorrow</button>
                    <button 
                      onClick={() => {
                        const t = new Date(); t.setDate(t.getDate() + 2);
                        setPromptData({...promptData, date: t.toISOString().split('T')[0]});
                      }}
                      className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-primary hover:text-white transition-all"
                    >Next Day</button>
                  </div>
                  <input 
                    type="date" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 text-sm transition-all outline-none"
                    value={promptData.date}
                    onChange={e => setPromptData({...promptData, date: e.target.value})}
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
                  onChange={e => setPromptData({...promptData, reason: e.target.value})}
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
