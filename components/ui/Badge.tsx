/**
 * Badge - Reusable badge component for status and priority indicators
 */

import React from 'react';

export interface BadgeProps {
    /** Badge text content */
    children: React.ReactNode;
    /** Background color classes */
    bgColor?: string;
    /** Text color classes */
    textColor?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Additional classes */
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    bgColor = 'bg-slate-100 dark:bg-slate-700',
    textColor = 'text-slate-600 dark:text-slate-300',
    size = 'sm',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base'
    };

    return (
        <span
            className={`inline-flex items-center font-medium rounded-full ${bgColor} ${textColor} ${sizeClasses[size]} ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;
