
import React from 'react';
import { supabase } from '../supabase';

interface HeaderProps {
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  onAddTask: () => void;
  onOpenSidebar: () => void;
  onOpenAI: () => void;
  userEmail?: string;
}

const Header: React.FC<HeaderProps> = ({ selectedDate, setSelectedDate, onAddTask, onOpenSidebar, onOpenAI, userEmail }) => {
  const dateObj = new Date(selectedDate);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const changeDay = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center space-x-2 md:space-x-6">
        <button 
          onClick={onOpenSidebar}
          className="p-2 md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>

        <div className="flex items-center space-x-1 md:space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl scale-90 md:scale-100">
          <button 
            onClick={() => changeDay(-1)}
            className="p-1 md:p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          </button>
          <div className="relative group">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap">
              {formattedDate}
            </div>
          </div>
          <button 
            onClick={() => changeDay(1)}
            className="p-1 md:p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="hidden lg:flex flex-col items-end mr-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Account</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{userEmail}</span>
        </div>

        <button 
          onClick={onOpenAI}
          className="flex items-center space-x-1 md:space-x-2 bg-gradient-to-r from-purple-600 to-primary hover:from-purple-700 hover:to-indigo-700 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-semibold shadow-lg shadow-purple-500/20 transition-all active:scale-95 text-xs md:text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">AI Plan</span>
          <span className="sm:hidden">AI</span>
        </button>

        <button 
          onClick={onAddTask}
          className="flex items-center space-x-1 md:space-x-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-semibold shadow-lg transition-all active:scale-95 text-xs md:text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          <span className="hidden sm:inline">Add Task</span>
          <span className="sm:hidden">Add</span>
        </button>

        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
