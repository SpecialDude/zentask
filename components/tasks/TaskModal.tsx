
import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority, RecurrencePattern } from '../../types';
import { scrollInputIntoView } from '../../utils';

interface TaskModalProps {
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  initialData?: Task;
  prefilledData?: Partial<Task>;
  isSubtask?: boolean;
}

const TaskModal: React.FC<TaskModalProps> = ({ onClose, onSave, initialData, prefilledData, isSubtask }) => {
  const source = initialData || prefilledData;
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: source?.title || '',
    description: source?.description || '',
    duration: source?.duration || 0,
    startTime: source?.startTime || '',
    priority: source?.priority || undefined as TaskPriority | undefined,
    completion: initialData?.completion || 0,
    status: initialData?.status || TaskStatus.TODO,
    isRecurring: source?.isRecurring || false,
    recurrencePattern: source?.recurrencePattern || undefined as RecurrencePattern | undefined,
    recurrenceEndDate: source?.recurrenceEndDate || '',
    review: initialData?.review || ''
  });

  const priorityOptions: { value: TaskPriority; label: string; color: string; bgColor: string }[] = [
    { value: TaskPriority.LOW, label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800' },
    { value: TaskPriority.MEDIUM, label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
    { value: TaskPriority.HIGH, label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/30' },
    { value: TaskPriority.URGENT, label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/30' },
  ];

  const recurrenceOptions: { value: RecurrencePattern; label: string; icon: string }[] = [
    { value: RecurrencePattern.DAILY, label: 'Daily', icon: '📅' },
    { value: RecurrencePattern.WEEKLY, label: 'Weekly', icon: '📆' },
    { value: RecurrencePattern.WEEKDAYS, label: 'Weekdays', icon: '💼' },
    { value: RecurrencePattern.MONTHLY, label: 'Monthly', icon: '🗓️' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
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

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4 md:space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
              onFocus={scrollInputIntoView}
            />
          </div>

          <div className="space-y-1 md:space-y-2">
            <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Description</label>
            <textarea
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 md:py-3 text-xs md:text-sm transition-all outline-none resize-none"
              placeholder="Add more details..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              onFocus={scrollInputIntoView}
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
                onFocus={scrollInputIntoView}
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
                onFocus={scrollInputIntoView}
              />
            </div>
          </div>

          {/* Priority Selector */}
          <div className="space-y-1 md:space-y-2">
            <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Priority</label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: formData.priority === option.value ? undefined : option.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${formData.priority === option.value
                    ? `${option.bgColor} ${option.color} ring-2 ring-offset-1 ring-current`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring Task Toggle - Only for new tasks, not subtasks */}
          {!isSubtask && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Repeat Task</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring, recurrencePattern: !formData.isRecurring ? RecurrencePattern.DAILY : undefined })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isRecurring ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${formData.isRecurring ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {formData.isRecurring && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex flex-wrap gap-2">
                    {recurrenceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, recurrencePattern: option.value })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${formData.recurrencePattern === option.value
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Until (optional)</label>
                    <input
                      type="date"
                      className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-2 text-xs transition-all outline-none"
                      value={formData.recurrenceEndDate}
                      onChange={e => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Review Section - Only for completed tasks */}
          {initialData && formData.status === TaskStatus.COMPLETED && (
            <div className="space-y-1 md:space-y-2 pt-2">
              <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-green-600 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Task Review
              </label>
              <textarea
                rows={3}
                className="w-full bg-green-50 dark:bg-green-900/10 border-2 border-green-200 dark:border-green-900/30 focus:border-green-500 focus:ring-0 rounded-xl px-4 py-3 text-xs md:text-sm transition-all outline-none resize-none"
                placeholder="How did it go? Add feedback, learnings, or notes..."
                value={formData.review}
                onChange={e => setFormData({ ...formData, review: e.target.value })}
                onFocus={scrollInputIntoView}
              />
            </div>
          )}

          <div className="pt-4 pb-4 sm:pb-0">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-primary hover:bg-indigo-700 text-white font-bold py-3 md:py-4 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSaving ? (initialData ? 'Saving…' : 'Creating…') : (initialData ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
