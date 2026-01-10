/**
 * useViewNavigation - Custom hook for URL hash-based view routing
 * 
 * Manages view state with URL hash synchronization for proper back/forward navigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { ViewType } from '../types';

const VIEW_HASH_MAP: Record<string, ViewType> = {
    'dashboard': 'DASHBOARD',
    'kanban': 'KANBAN',
    'lists': 'LISTS',
    'settings': 'SETTINGS',
    '': 'LIST',
    'list': 'LIST',
    'tasks': 'LIST'
};

const HASH_VIEW_MAP: Record<ViewType, string> = {
    'DASHBOARD': 'dashboard',
    'KANBAN': 'kanban',
    'LISTS': 'lists',
    'SETTINGS': 'settings',
    'LIST': 'tasks'
};

const getViewFromHash = (): ViewType => {
    const hash = window.location.hash.slice(1).toLowerCase();
    return VIEW_HASH_MAP[hash] || 'LIST';
};

export function useViewNavigation() {
    const [viewType, setViewTypeState] = useState<ViewType>(getViewFromHash);

    // Custom setter that also updates URL hash
    const setViewType = useCallback((newView: ViewType) => {
        setViewTypeState(newView);
        window.location.hash = HASH_VIEW_MAP[newView];
    }, []);

    // Listen for browser back/forward navigation
    useEffect(() => {
        const handleHashChange = () => {
            setViewTypeState(getViewFromHash());
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return {
        viewType,
        setViewType
    };
}
