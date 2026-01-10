/**
 * useTheme - Custom hook for dark mode management
 * 
 * Handles theme state, persistence to localStorage, and DOM class updates.
 */

import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        return localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // Sync with DOM and localStorage
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleDarkMode = useCallback(() => {
        setIsDarkMode(prev => !prev);
    }, []);

    return {
        isDarkMode,
        setIsDarkMode,
        toggleDarkMode
    };
}
