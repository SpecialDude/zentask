import React, { useState, useMemo } from 'react';

interface DatePickerProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onDateChange, isOpen, onClose }) => {
    const [viewDate, setViewDate] = useState(() => new Date(selectedDate));

    const today = useMemo(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    }, []);

    const monthDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Day of week for first day (0 = Sunday)
        const startDayOfWeek = firstDay.getDay();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month days
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            days.push({ date: d, isCurrentMonth: false });
        }

        // Current month days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Next month days to fill grid
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    }, [viewDate]);

    const monthYear = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const changeMonth = (offset: number) => {
        setViewDate(prev => {
            const next = new Date(prev);
            next.setMonth(next.getMonth() + offset);
            return next;
        });
    };

    const handleDateSelect = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        onDateChange(dateStr);
        onClose();
    };

    const goToToday = () => {
        setViewDate(new Date());
        onDateChange(today);
        onClose();
    };

    const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 w-full max-w-sm">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Select Date</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Month Navigation */}
                <div className="px-6 py-3 flex items-center justify-between">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{monthYear}</span>
                    <button
                        onClick={() => changeMonth(1)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>

                {/* Weekday Headers */}
                <div className="px-4 grid grid-cols-7 gap-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="px-4 pb-4 grid grid-cols-7 gap-1">
                    {monthDays.map(({ date, isCurrentMonth }, idx) => {
                        const dateStr = formatDateStr(date);
                        const isSelected = dateStr === selectedDate;
                        const isToday = dateStr === today;

                        return (
                            <button
                                key={idx}
                                onClick={() => handleDateSelect(date)}
                                className={`relative p-2 text-sm rounded-xl transition-all ${isSelected
                                        ? 'bg-primary text-white font-bold shadow-lg shadow-primary/30'
                                        : isToday
                                            ? 'bg-primary/10 text-primary font-semibold ring-2 ring-primary/30'
                                            : isCurrentMonth
                                                ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                {date.getDate()}
                                {isToday && !isSelected && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-xl transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatePicker;
