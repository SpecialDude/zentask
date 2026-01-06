import React, { useState, useCallback, useEffect } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition';

interface VoiceRecorderProps {
    onTranscriptChange: (transcript: string) => void;
    disabled?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptChange, disabled = false }) => {
    const [mode, setMode] = useState<'idle' | 'push-to-talk' | 'toggle'>('idle');
    const [isPushActive, setIsPushActive] = useState(false);

    const {
        isSupported,
        isListening,
        transcript,
        interimTranscript,
        error,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition();

    // Update parent with transcript changes
    useEffect(() => {
        const fullTranscript = transcript + (interimTranscript ? ' ' + interimTranscript : '');
        onTranscriptChange(fullTranscript.trim());
    }, [transcript, interimTranscript, onTranscriptChange]);

    // Push-to-talk handlers
    const handlePushStart = useCallback(() => {
        if (disabled || !isSupported) return;
        setMode('push-to-talk');
        setIsPushActive(true);
        startListening();
    }, [disabled, isSupported, startListening]);

    const handlePushEnd = useCallback(() => {
        if (mode === 'push-to-talk') {
            setIsPushActive(false);
            stopListening();
            setMode('idle');
        }
    }, [mode, stopListening]);

    // Toggle mode handler
    const handleToggle = useCallback(() => {
        if (disabled || !isSupported) return;

        if (isListening) {
            stopListening();
            setMode('idle');
        } else {
            setMode('toggle');
            startListening();
        }
    }, [disabled, isSupported, isListening, startListening, stopListening]);

    // Clear transcript
    const handleClear = useCallback(() => {
        resetTranscript();
        onTranscriptChange('');
    }, [resetTranscript, onTranscriptChange]);

    // Not supported fallback
    if (!isSupported) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Voice input not supported in this browser</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Recording Controls */}
            <div className="flex items-center gap-2">
                {/* Push-to-talk button */}
                <button
                    type="button"
                    disabled={disabled || (mode === 'toggle' && isListening)}
                    onMouseDown={handlePushStart}
                    onMouseUp={handlePushEnd}
                    onMouseLeave={handlePushEnd}
                    onTouchStart={handlePushStart}
                    onTouchEnd={handlePushEnd}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all select-none ${isPushActive
                            ? 'bg-red-500 text-white scale-95 shadow-lg'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <MicIcon isActive={isPushActive} />
                    <span className="hidden sm:inline">{isPushActive ? 'Listening...' : 'Hold to Talk'}</span>
                </button>

                <span className="text-xs text-slate-400">or</span>

                {/* Toggle button */}
                <button
                    type="button"
                    disabled={disabled || isPushActive}
                    onClick={handleToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${isListening && mode === 'toggle'
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isListening && mode === 'toggle' ? (
                        <>
                            <StopIcon />
                            <span className="hidden sm:inline">Stop</span>
                        </>
                    ) : (
                        <>
                            <RecordIcon />
                            <span className="hidden sm:inline">Start Recording</span>
                        </>
                    )}
                </button>

                {/* Clear button */}
                {(transcript || interimTranscript) && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Clear transcript"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Recording indicator */}
            {isListening && (
                <div className="flex items-center gap-2 text-xs text-red-500">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span>Recording... Speak now</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

// Icon components
const MicIcon: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isActive ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
    </svg>
);

const RecordIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="10" cy="10" r="6" />
    </svg>
);

const StopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <rect x="5" y="5" width="10" height="10" rx="1" />
    </svg>
);

export default VoiceRecorder;
