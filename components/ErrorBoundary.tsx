import React, { useState, useCallback } from 'react';

interface Props {
    children: React.ReactNode;
}

interface ErrorState {
    hasError: boolean;
    error?: Error;
}

// Note: In React 19, we use a functional approach for error handling
// This wrapper uses getDerivedStateFromError via a class-based helper
class ErrorBoundaryClass extends React.Component<
    { children: React.ReactNode; onError: (error: Error) => void; hasError: boolean },
    { hasLocalError: boolean }
> {
    state = { hasLocalError: false };

    static getDerivedStateFromError() {
        return { hasLocalError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError(error);
    }

    render() {
        if (this.state.hasLocalError || this.props.hasError) {
            return null; // Handled by parent
        }
        return this.props.children;
    }
}

const ErrorBoundary: React.FC<Props> = ({ children }) => {
    const [errorState, setErrorState] = useState<ErrorState>({ hasError: false });

    const handleError = useCallback((error: Error) => {
        setErrorState({ hasError: true, error });
    }, []);

    const handleRetry = () => {
        setErrorState({ hasError: false, error: undefined });
        window.location.reload();
    };

    if (errorState.hasError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 space-y-6 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-red-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Something went wrong
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                    </div>

                    {errorState.error && (
                        <div className="text-left bg-slate-100 dark:bg-slate-800 rounded-xl p-4 overflow-auto max-h-32">
                            <p className="text-xs font-mono text-red-600 dark:text-red-400">
                                {errorState.error.message}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleRetry}
                        className="w-full bg-primary hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundaryClass onError={handleError} hasError={errorState.hasError}>
            {children}
        </ErrorBoundaryClass>
    );
};

export default ErrorBoundary;
