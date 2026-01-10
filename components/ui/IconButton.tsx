/**
 * IconButton - Reusable icon button component
 */

import React from 'react';

export interface IconButtonProps {
    /** Button click handler */
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    /** Icon content (SVG or element) */
    children: React.ReactNode;
    /** Button title for accessibility */
    title?: string;
    /** Button variant */
    variant?: 'default' | 'danger' | 'success' | 'primary';
    /** Button size */
    size?: 'sm' | 'md' | 'lg';
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Additional classes */
    className?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
    onClick,
    children,
    title,
    variant = 'default',
    size = 'md',
    disabled = false,
    className = ''
}) => {
    const variantClasses = {
        default: 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        danger: 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
        success: 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20',
        primary: 'text-slate-400 hover:text-primary hover:bg-primary/10'
    };

    const sizeClasses = {
        sm: 'p-1',
        md: 'p-2',
        lg: 'p-3'
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6'
    };

    return (
        <button
            onClick={onClick}
            title={title}
            disabled={disabled}
            className={`rounded-xl transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            <span className={iconSizes[size]}>{children}</span>
        </button>
    );
};

export default IconButton;
