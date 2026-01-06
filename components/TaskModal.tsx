
import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';

interface TaskModalProps {
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  initialData?: Task;
  isSubtask?: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({ onClose, onSave, initialData, isSubtask }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    duration: initialData?.duration || 0,
    startTime: initialData?.startTime || '',
    completion: initialData?.completion || 0,
    status: initialData?.status || TaskStatus.TODO
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:zoom-in duration-300">
        <div className="px-6 py-4 md:px-8 md:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold">{initialData ? 'Edit Task' : isSubtask ? 'Add Subtask' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1 md:space-y-2">
            <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Title</label>
            <input 
              autoFocus
              type="text" 
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 md:py-3 text-base md:text-lg font-semibold transition-all outline-none"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-1 md:space-y-2">
            <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Description</label>
            <textarea 
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 md:py-3 text-xs md:text-sm transition-all outline-none resize-none"
              placeholder="Add more details..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Start Time</label>
              <input 
                type="time" 
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 text-xs md:text-sm transition-all outline-none"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:space-y-2">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Duration (min)</label>
              <input 
                type="number" 
                min="0"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 text-xs md:text-sm transition-all outline-none"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {initialData && (
            <div className="space-y-3 md:space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Progress</label>
                <span className="text-xs md:text-sm font-bold text-primary">{formData.completion}%</span>
              </div>
              <input 
                type="range" 
                className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                min="0"
                max="100"
                value={formData.completion}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setFormData({ 
                    ...formData, 
                    completion: val,
                    status: val === 100 ? TaskStatus.COMPLETED : val > 0 ? TaskStatus.IN_PROGRESS : TaskStatus.TODO
                  });
                }}
              />
            </div>
          )}

          <div className="pt-4 pb-4 sm:pb-0">
            <button 
              type="submit"
              className="w-full bg-primary hover:bg-indigo-700 text-white font-bold py-3 md:py-4 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95"
            >
              {initialData ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
