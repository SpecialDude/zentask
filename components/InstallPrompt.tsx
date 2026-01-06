import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface WindowEventMap {
        'beforeinstallprompt': BeforeInstallPromptEvent;
    }
}

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Remember dismissal for this session
        sessionStorage.setItem('install-dismissed', 'true');
    };

    // Don't show if already installed, dismissed, or prompt not available
    if (isInstalled || !showPrompt || sessionStorage.getItem('install-dismissed')) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Install ZenTask</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Add to home screen for quick access</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <button
                        onClick={handleInstall}
                        className="px-4 py-2 bg-primary hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95"
                    >
                        Install
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
