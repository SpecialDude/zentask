/**
 * DayClearedCelebration - Full-screen congratulatory banner shown when the
 * user completes every task for a day. Renders alongside the confetti burst,
 * auto-dismisses, and never blocks interaction.
 */

import React, { useState, useEffect } from 'react';
import { getTodayStr } from '../utils';

interface Celebration {
    id: number;
    clearedDate: string;
}

interface DayClearedCelebrationProps {
    celebration: Celebration | null;
    onDone: () => void;
}

interface Message {
    emoji: string;
    title: string;
    text: string;
}

const TODAY_MESSAGES: Message[] = [
    {
        emoji: '🌟',
        title: 'Day Cleared!',
        text: 'Every single task, done. You showed up for yourself today — be proud of that.',
    },
    {
        emoji: '✨',
        title: 'You Did It!',
        text: 'Your list is empty and the rest of the day is yours. Well done — seriously.',
    },
    {
        emoji: '🎯',
        title: 'All Done!',
        text: 'Everything you planned, finished. Momentum like this is how big things get built.',
    },
    {
        emoji: '💚',
        title: 'Beautiful Work',
        text: 'Task by task, you created yourself a calmer day. Enjoy every minute of it.',
    },
    {
        emoji: '🏆',
        title: 'Day Conquered!',
        text: 'Nothing left hanging. Go rest easy tonight — you have truly earned it.',
    },
];

const PAST_DAY_MESSAGES: Message[] = [
    {
        emoji: '🕊️',
        title: 'Backlog Cleared!',
        text: 'That day is officially wrapped up — nothing follows you into today.',
    },
    {
        emoji: '✅',
        title: 'Loose Ends Tied',
        text: 'Past-you would be so grateful right now. Enjoy your clean slate!',
    },
];

const pickMessage = (clearedDate: string): Message => {
    const pool = clearedDate === getTodayStr() ? TODAY_MESSAGES : PAST_DAY_MESSAGES;
    return pool[Math.floor(Math.random() * pool.length)];
};

export const DayClearedCelebration: React.FC<DayClearedCelebrationProps> = ({ celebration, onDone }) => {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);

    useEffect(() => {
        if (!celebration) return;

        setMessage(pickMessage(celebration.clearedDate));
        setVisible(false);
        setLeaving(false);

        const enterFrame = requestAnimationFrame(() => setVisible(true));
        const leaveTimer = window.setTimeout(() => setLeaving(true), 4200);
        const doneTimer = window.setTimeout(onDone, 4600);

        return () => {
            cancelAnimationFrame(enterFrame);
            clearTimeout(leaveTimer);
            clearTimeout(doneTimer);
        };
    }, [celebration?.id]);

    if (!celebration || !message) return null;

    return (
        <div className="fixed inset-x-0 top-[16%] z-[90] flex justify-center pointer-events-none px-4">
            <div
                className={`max-w-md w-full sm:w-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl px-8 py-7 text-center transition-all duration-500 ease-out ${visible && !leaving ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}`}
            >
                <div className="text-5xl mb-3">{message.emoji}</div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
                    {message.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-xs mx-auto">
                    {message.text}
                </p>
            </div>
        </div>
    );
};

export default DayClearedCelebration;
