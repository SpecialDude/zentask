import React, { useState, useEffect } from 'react';
import FeedbackModal from '../feedback/FeedbackModal';

interface LandingPageProps {
    onGetStarted: () => void;
    isSignedIn?: boolean;
    onGoToApp?: () => void;
    userId?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, isSignedIn, onGoToApp, userId }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeScreenshot, setActiveScreenshot] = useState(0);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isButtonVisible, setIsButtonVisible] = useState(true);
    const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);
    const lastScrollY = React.useRef(0);
    const howItWorksRef = React.useRef<HTMLElement>(null);

    useEffect(() => {
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fade-in {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .animate-fade-in {
                animation: fade-in 0.6s ease-out forwards;
                opacity: 0;
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setIsScrolled(currentScrollY > 50);

            // Hide button on scroll down, show on scroll up (mobile behavior)
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsButtonVisible(false);
            } else {
                setIsButtonVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };
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

    // Intersection Observer for How It Works section
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsHowItWorksVisible(true);
                }
            },
            { threshold: 0.2 }
        );

        if (howItWorksRef.current) {
            observer.observe(howItWorksRef.current);
        }

        return () => observer.disconnect();
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
            icon: '🔮',
            title: 'Claude AI Integration',
            description: 'Connect Claude to manage your tasks naturally with voice commands and smart assistance.'
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
            icon: '🔗',
            title: 'Jira Integration',
            description: 'Import and sync your Jira issues seamlessly with your personal task workflow.'
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
                        {/* New Feature Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-full mb-6 animate-pulse">
                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Now with Claude AI Integration</span>
                        </div>
                        
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                            Master Your Day,{' '}
                            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Own Your Productivity
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                            The beautifully simple task manager with AI-powered planning, Claude integration,
                            and insights that keep you motivated. Now you can manage tasks by just talking to Claude.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={onGetStarted}
                                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-lg font-bold rounded-2xl hover:shadow-xl hover:scale-105 transition-all"
                            >
                                Start Today
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
                                        zentask.space
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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

            {/* Claude AI Integration Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* Left Side - Content */}
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">New Feature</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                                Talk to Your Tasks with{' '}
                                <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    Claude AI
                                </span>
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                                Connect ZenTask with Claude to manage your tasks using natural conversation. 
                                No technical setup required—just connect once and start chatting.
                            </p>

                            {/* Benefits */}
                            <div className="space-y-4 pt-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Natural Conversations</h4>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            "Add a task to buy groceries tomorrow" or "What's on my plate today?"
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Hands-Free Management</h4>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Create, update, and complete tasks without opening the app
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Secure & Private</h4>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Your tasks stay yours. Claude only accesses what you authorize
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="pt-6">
                                <button
                                    onClick={onGetStarted}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                                >
                                    <span>Get Started Free</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Right Side - Visual Demo */}
                        <div className="relative">
                            {/* Floating Chat Bubbles */}
                            <div className="space-y-4">
                                {/* User Message */}
                                <div className="flex justify-end animate-fade-in">
                                    <div className="max-w-[80%] bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-md shadow-lg">
                                        <p className="text-sm font-medium mb-1">You</p>
                                        <p>Add "Finish project proposal" as high priority for tomorrow</p>
                                    </div>
                                </div>

                                {/* Claude Response */}
                                <div className="flex justify-start animate-fade-in" style={{ animationDelay: '0.5s' }}>
                                    <div className="max-w-[80%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl rounded-tl-md shadow-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500"></div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">Claude</p>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300">✓ Done! I've added "Finish project proposal" as a high priority task due tomorrow.</p>
                                    </div>
                                </div>

                                {/* User Message 2 */}
                                <div className="flex justify-end animate-fade-in" style={{ animationDelay: '1s' }}>
                                    <div className="max-w-[80%] bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-5 py-3 rounded-2xl rounded-tr-md shadow-lg">
                                        <p className="text-sm font-medium mb-1">You</p>
                                        <p>What do I have scheduled for today?</p>
                                    </div>
                                </div>

                                {/* Claude Response 2 */}
                                <div className="flex justify-start animate-fade-in" style={{ animationDelay: '1.5s' }}>
                                    <div className="max-w-[80%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl rounded-tl-md shadow-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500"></div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">Claude</p>
                                        </div>
                                        <div className="text-slate-700 dark:text-slate-300">
                                            <p className="mb-2">Here's what you have today:</p>
                                            <ul className="space-y-1 text-sm">
                                                <li>• ✅ Morning workout (completed)</li>
                                                <li>• 📧 Reply to client emails</li>
                                                <li>• 📞 Team standup at 2pm</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Elements */}
                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl -z-10"></div>
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-200 dark:bg-indigo-900/30 rounded-full blur-3xl -z-10"></div>
                        </div>
                    </div>

                    {/* How to Connect - Simple Steps */}
                    <div className="mt-20 max-w-4xl mx-auto">
                        <h3 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-12">
                            Connect in 3 Simple Steps
                        </h3>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                    1
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Sign Up</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Create your free ZenTask account in seconds
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                    2
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Copy Your Link</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Get your unique connection link from Settings
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                    3
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Add to Claude</h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Paste the link in Claude.ai and authorize
                                </p>
                            </div>
                        </div>
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
            <section ref={howItWorksRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
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
                            <div
                                key={index}
                                className={`relative transition-all duration-700 ${isHowItWorksVisible
                                        ? 'opacity-100 translate-y-0'
                                        : 'opacity-0 translate-y-8'
                                    }`}
                                style={{ transitionDelay: `${index * 200}ms` }}
                            >
                                {/* Connecting Line with Draw Animation */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`hidden md:block absolute top-8 left-[60%] h-0.5 bg-gradient-to-r from-purple-300 to-transparent dark:from-purple-700 transition-all duration-1000 ease-out origin-left ${isHowItWorksVisible ? 'w-full scale-x-100' : 'w-0 scale-x-0'
                                            }`}
                                        style={{ transitionDelay: `${(index + 1) * 300 + 200}ms` }}
                                    ></div>
                                )}
                                {/* Step Card with Hover Lift */}
                                <div className="text-center group cursor-default">
                                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all duration-300">
                                        {item.step}
                                    </div>
                                    <div className="group-hover:-translate-y-1 transition-transform duration-300">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                            {item.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            {item.description}
                                        </p>
                                    </div>
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
                            Join thousands of users who've taken control of their tasks. Start today.
                        </p>
                        <button
                            onClick={onGetStarted}
                            className="px-10 py-4 bg-white text-purple-600 text-lg font-bold rounded-2xl hover:shadow-xl hover:scale-105 transition-all"
                        >
                            Get Started
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
            {/* Feedback Button & Modal */}
            <button
                onClick={() => setIsFeedbackOpen(true)}
                className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 px-3 py-2 md:px-4 md:py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-600 dark:text-slate-300 text-sm md:text-base font-medium rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-105 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 flex items-center gap-2 group ${isButtonVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            >
                <span className="bg-purple-100 dark:bg-purple-900/50 p-1.5 rounded-full group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                </span>
                Feedback
            </button>

            <FeedbackModal
                isOpen={isFeedbackOpen}
                onClose={() => setIsFeedbackOpen(false)}
                userId={userId}
            />
        </div>
    );
};

export default LandingPage;
