/**
 * useTaskSuggestions — Manages recurring task suggestion state
 * 
 * Filters suggestions by what's already dismissed (localStorage) or already
 * exists as a recurring task. When applied, returns prefilled task data
 * for the modal instead of creating directly.
 */

import { useState, useCallback, useMemo } from 'react';
import { Task, TaskStatus } from '../types';
import { TASK_SUGGESTIONS, TaskSuggestion } from '../data/taskSuggestions';
import { getTodayStr } from '../utils';

const STORAGE_KEY = 'zentask_dismissed_suggestions';

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

interface UseTaskSuggestionsOptions {
  tasks: Task[];
  selectedDate: string;
}

export function useTaskSuggestions({ tasks, selectedDate }: UseTaskSuggestionsOptions) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedIds());

  const isToday = selectedDate === getTodayStr();

  // Titles that already exist as recurring tasks (globally, any date)
  const existingRecurringTitles = useMemo(() => {
    const titles = new Set<string>();
    tasks.forEach(t => {
      if (t.isRecurring) {
        titles.add(t.title.toLowerCase());
      }
    });
    return titles;
  }, [tasks]);

  // Filter available suggestions
  const availableSuggestions = useMemo(() => {
    return TASK_SUGGESTIONS.filter(s => {
      if (dismissedIds.has(s.id)) return false;
      // Check if a recurring task with a matching title already exists
      const title = s.getTitle(isToday).toLowerCase();
      const titleAlt = s.getTitle(!isToday).toLowerCase();
      if (existingRecurringTitles.has(title) || existingRecurringTitles.has(titleAlt)) return false;
      return true;
    });
  }, [dismissedIds, isToday, existingRecurringTitles]);

  /** Build prefilled task data from a suggestion (for opening in TaskModal) */
  const buildTaskFromSuggestion = useCallback((suggestion: TaskSuggestion): Partial<Task> => {
    const title = suggestion.getTitle(isToday);
    const startTime = isToday ? suggestion.defaultTime.today : suggestion.defaultTime.ahead;

    return {
      title,
      description: suggestion.description,
      startTime,
      duration: suggestion.defaultDuration,
      priority: suggestion.priority,
      status: TaskStatus.TODO,
      completion: 0,
      isRecurring: true,
      recurrencePattern: suggestion.recurrencePattern,
    };
  }, [isToday]);

  /** Mark a suggestion as dismissed (persists in localStorage) */
  const dismissSuggestion = useCallback((id: string) => {
    const updated = new Set(dismissedIds);
    updated.add(id);
    setDismissedIds(updated);
    saveDismissedIds(updated);
  }, [dismissedIds]);

  return {
    availableSuggestions,
    buildTaskFromSuggestion,
    dismissSuggestion,
  };
}
