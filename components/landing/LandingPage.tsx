import React, { useState, useEffect } from 'react';

interface LandingPageProps {
    onGetStarted: () => void;
    isSignedIn?: boolean;
    onGoToApp?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, isSignedIn, onGoToApp }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeScreenshot, setActiveScreenshot] = useState(0);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-rotate screenshots
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveScreenshot(prev => (prev + 1) % 3);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const features = [
        {
            icon: '✅',
            title: 'Smart Task Management',
            description: 'Create tasks with subtasks, set priorities, and track progress with beautiful visual indicators.'
        },
        {
            icon: '📋',
            title: 'Quick Lists & Documents',
            description: 'Capture ideas fast with bullet lists, checklists, or rich document-style notes.'
        },
        {
            icon: '🤖',
            title: 'AI Planning Assistant',
            description: 'Let AI help you break down complex projects into actionable tasks automatically.'
        },
        {
            icon: '🔄',
            title: 'Recurring Tasks',
            description: 'Set daily, weekly, or monthly recurring tasks. Never forget routine activities.'
        },
        {
            icon: '📊',
            title: 'Progress Dashboard',
            description: 'Visualize your productivity with insights on completion rates and streaks.'
        },
        {
            icon: '📱',
            title: 'Works Everywhere',
            description: 'Install as an app on any device. Works offline, syncs when connected.'
        }
    ];

    const screenshots = [
        { label: 'Dashboard', description: 'See your productivity at a glance with visual insights' },
        { label: 'Task List', description: 'Organize tasks with priorities, subtasks, and progress tracking' },
        { label: 'Quick Lists', description: 'Capture ideas quickly with flexible list types' }
    ];

    const steps = [
        {
            step: '1',
            title: 'Capture Everything',
            description: 'Add tasks, set priorities, create subtasks. Use Quick Lists for rapid note-taking.'
        },
        {
            step: '2',
            title: 'Plan with AI',
            description: 'Describe your goal, let AI break it into actionable tasks with smart scheduling.'
        },
        {
            step: '3',
            title: 'Stay on Track',
            description: 'Check off tasks, carry over incomplete ones, and watch your productivity grow.'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
            {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-lg' : ''}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                ZenTask
                            </span>
                        </div>

                        {/* Nav */}
                        <div className="flex items-center gap-4">
                            {isSignedIn ? (
                                <button
                                    onClick={onGoToApp}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    Go to App
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={onGetStarted}
                                        className="hidden sm:block px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-purple-600 transition-colors"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={onGetStarted}
                                        className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                                    >
                                        Get Started
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-4xl mx-auto">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                            Master Your Day,{' '}
                            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Own Your Productivity
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                            The beautifully simple task manager that helps you focus on what matters.
                            AI-powered planning, smart recurring tasks, and insights that keep you motivated.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={onGetStarted}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg font-bold rounded-2xl hover:shadow-xl hover:scale-105 transition-all"
                            >
                                Start Free Today
                            </button>
                            <a
                                href="#features"
                                className="w-full sm:w-auto px-8 py-4 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-lg font-semibold rounded-2xl hover:border-purple-400 hover:text-purple-600 transition-all"
                            >
                                See Features
                            </a>
                        </div>
                    </div>

                    {/* Hero Screenshot Mockup */}
                    <div className="mt-16 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-indigo-400/20 blur-3xl rounded-full"></div>
                        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden mx-auto max-w-5xl">
                            {/* Browser Chrome */}
                            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="px-4 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-400">
                                        zentask.app
                                    </div>
                                </div>
                            </div>
                            {/* Dashboard Screenshot */}
                            <div className="aspect-[16/9]">
                                <img
                                    src="/screenshots/dashboard.png"
                                    alt="ZenTask Dashboard - Productivity tracking and task management"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                            Everything You Need to Stay Productive
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Powerful features designed to help you capture, organize, and complete your tasks with ease.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group p-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-xl transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Screenshots Carousel Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                            Beautiful on Every Device
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            A productivity experience that feels native on desktop, tablet, and mobile.
                        </p>
                    </div>

                    {/* Screenshot Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {screenshots.map((screenshot, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveScreenshot(index)}
                                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${activeScreenshot === index
                                    ? 'bg-purple-500 text-white shadow-lg'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                            >
                                {screenshot.label}
                            </button>
                        ))}
                    </div>

                    {/* Screenshot Display */}
                    <div className="grid lg:grid-cols-2 gap-8 items-center">
                        {/* Desktop View */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                </div>
                            </div>
                            <div className="aspect-[4/3] overflow-hidden">
                                {activeScreenshot === 0 && (
                                    <img src="/screenshots/dashboard.png" alt="ZenTask Dashboard" className="w-full h-full object-cover" />
                                )}
                                {activeScreenshot === 1 && (
                                    <img src="/screenshots/tasklist.png" alt="ZenTask Task List" className="w-full h-full object-cover" />
                                )}
                                {activeScreenshot === 2 && (
                                    <img src="/screenshots/quicklists.png" alt="ZenTask Quick Lists" className="w-full h-full object-cover" />
                                )}
                            </div>
                        </div>

                        {/* Mobile View */}
                        <div className="flex justify-center">
                            <div className="w-64 bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl">
                                <div className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden">
                                    {/* Phone Notch */}
                                    <div className="h-6 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                        <div className="w-20 h-4 bg-slate-900 rounded-full"></div>
                                    </div>
                                    {/* Phone Screen - Mobile Screenshot based on active tab */}
                                    <div className="aspect-[9/16] overflow-hidden">
                                        {activeScreenshot === 0 && (
                                            <img src="/screenshots/mobile-dashboard.png" alt="ZenTask Mobile Dashboard" className="w-full h-full object-cover" />
                                        )}
                                        {activeScreenshot === 1 && (
                                            <img src="/screenshots/mobile-tasklist.png" alt="ZenTask Mobile Task List" className="w-full h-full object-cover" />
                                        )}
                                        {activeScreenshot === 2 && (
                                            <img src="/screenshots/mobile-quicklists.png" alt="ZenTask Mobile Quick Lists" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
                            Simple. Powerful. Effective.
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Get started in seconds and see results immediately.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {steps.map((item, index) => (
                            <div key={index} className="relative">
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-purple-300 to-transparent dark:from-purple-700"></div>
                                )}
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                            Ready to Transform Your Productivity?
                        </h2>
                        <p className="text-purple-100 text-lg mb-8 max-w-xl mx-auto">
                            Join thousands of users who've taken control of their tasks. Start free today.
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="px-10 py-4 bg-white text-purple-600 text-lg font-bold rounded-2xl hover:shadow-xl hover:scale-105 transition-all"
                        >
                            Get Started Free
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">ZenTask</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            © {new Date().getFullYear()} ZenTask. Built for productivity.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
