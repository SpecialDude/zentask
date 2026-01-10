// Quick List Constants and Utilities

export const QUICK_LIST_COLORS = [
    { hex: '#64748b', name: 'Slate' },
    { hex: '#ef4444', name: 'Red' },
    { hex: '#f97316', name: 'Orange' },
    { hex: '#eab308', name: 'Yellow' },
    { hex: '#22c55e', name: 'Green' },
    { hex: '#3b82f6', name: 'Blue' },
    { hex: '#a855f7', name: 'Purple' },
    { hex: '#ec4899', name: 'Pink' }
];

export const getQuickListBorderColor = (color: string): string => {
    switch (color) {
        case '#ef4444': return 'border-red-500';
        case '#f97316': return 'border-orange-500';
        case '#eab308': return 'border-yellow-500';
        case '#22c55e': return 'border-green-500';
        case '#3b82f6': return 'border-blue-500';
        case '#a855f7': return 'border-purple-500';
        case '#ec4899': return 'border-pink-500';
        default: return 'border-slate-300 dark:border-slate-600';
    }
};

export const DEFAULT_QUICK_LIST_COLOR = '#64748b';
