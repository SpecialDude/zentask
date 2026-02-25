/**
 * TaskSuggestionsWidget — Floating, draggable, collapsible widget
 *
 * Shows pre-built recurring task suggestions. Clicking "Apply" opens the task
 * creation modal with prefilled data so the user can review/edit before saving.
 * The widget auto-hides when no suggestions remain.
 */

import React, { useState, useRef, useCallback } from 'react';
import { TaskSuggestion } from '../data/taskSuggestions';

interface TaskSuggestionsWidgetProps {
  suggestions: TaskSuggestion[];
  isToday: boolean;
  onApply: (suggestion: TaskSuggestion) => void;
  onDismiss: (id: string) => void;
}

const POSITION_KEY = 'zentask_suggestions_position';

function getSavedPosition(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const TaskSuggestionsWidget: React.FC<TaskSuggestionsWidgetProps> = ({
  suggestions,
  isToday,
  onApply,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => getSavedPosition());
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  const wasDragged = useRef(false);

  if (suggestions.length === 0) return null;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button[data-action]')) return;
    e.preventDefault();
    setIsDragging(true);
    wasDragged.current = false;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    wasDragged.current = true;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    const bottomY = window.innerHeight - newY - (widgetRef.current?.offsetHeight || 60);
    setPosition({ x: Math.max(0, newX), y: Math.max(0, bottomY) });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (position) {
        localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      }
    }
  }, [isDragging, position]);

  const toggleExpand = useCallback(() => {
    if (!wasDragged.current) {
      setIsExpanded(prev => !prev);
    }
  }, []);

  const handleApply = useCallback((suggestion: TaskSuggestion) => {
    setIsExpanded(false);
    onApply(suggestion);
  }, [onApply]);

  const hasCustomPosition = position !== null;

  return (
    <div
      ref={widgetRef}
      className={hasCustomPosition ? 'fixed z-40 select-none' : 'sticky bottom-4 z-40 select-none ml-auto mr-0 mt-4 w-fit'}
      style={
        hasCustomPosition
          ? { left: `${position.x}px`, bottom: `${position.y}px`, touchAction: 'none' }
          : { touchAction: 'none' }
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Expanded suggestion panel */}
      {isExpanded && (
        <div
          className="mb-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Suggestions</span>
            </div>
            <button
              data-action="close"
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {suggestions.map((s) => {
              const title = s.getTitle(isToday);
              const time = isToday ? s.defaultTime.today : s.defaultTime.ahead;

              return (
                <div
                  key={s.id}
                  className="px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg mt-0.5 shrink-0">{s.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">{title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                          {time}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                          {s.defaultDuration}m
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
                          {s.recurrencePattern.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2.5 ml-7">
                    <button
                      data-action="apply"
                      onClick={() => handleApply(s)}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-200 active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                    <button
                      data-action="dismiss"
                      onClick={() => onDismiss(s.id)}
                      className="text-xs font-medium px-3 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsed pill button */}
      <button
        onClick={toggleExpand}
        className={`
          flex items-center gap-2 rounded-full shadow-lg
          bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          hover:shadow-xl active:scale-95 transition-all duration-200
          px-2.5 py-2.5 sm:px-4 sm:py-2.5
        `}
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
      >
        <span className="text-base">💡</span>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
          Suggestions
        </span>
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
          {suggestions.length}
        </span>
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TaskSuggestionsWidget;
