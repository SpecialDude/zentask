/**
 * Modal - Base reusable modal component
 * 
 * A flexible modal component that handles backdrop, animation, and layout.
 * Replaces duplicate modal patterns across the codebase.
 */

import React from 'react';

export interface ModalProps {
    /** Whether the modal is open */
    isOpen?: boolean;
    /** Handler called when clicking the backdrop */
    onClose?: () => void;
    /** Modal content */
    children: React.ReactNode;
    /** Maximum width class (e.g., 'max-w-md', 'max-w-lg') */
    maxWidth?: string;
    /** Whether to show the close button in the header */
    showCloseButton?: boolean;
    /** Z-index level */
    zIndex?: number;
    /** Whether to prevent backdrop click from closing */
    preventBackdropClose?: boolean;
    /** Custom class for the modal container */
    className?: string;
}

const Modal: React.FC<ModalProps> = ({
    isOpen = true,
    onClose,
    children,
    maxWidth = 'max-w-md',
    showCloseButton = false,
    zIndex = 100,
    preventBackdropClose = false,
    className = ''
}) => {
    if (!isOpen) return null;

    const handleBackdropClick = () => {
        if (!preventBackdropClose && onClose) {
            onClose();
        }
    };

    return (
        <div
            className={`fixed inset-0 flex items-center justify-center p-4`}
            style={{ zIndex }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={handleBackdropClick}
            />

            {/* Modal content */}
            <div
                className={`relative bg-white dark:bg-slate-900 w-full ${maxWidth} rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-200 ${className}`}
            >
                {showCloseButton && onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
                {children}
            </div>
        </div>
    );
};

export default Modal;
