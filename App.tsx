import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Task, TaskStatus, QuickList } from './types';
import { getTodayStr } from './utils';

// Custom hooks
import { useTheme, useAuth, useViewNavigation, useTasks, useQuickLists } from './hooks';

// Layout components
import { Sidebar, Header } from './components/layout';

// View components
import { ListView, KanbanBoard, Dashboard } from './components/views';

// Task components
import { TaskModal, TaskDetailModal, TaskReviewModal, ExtendRecurringModal } from './components/tasks';

// Other components
import AIModal from './components/AIModal';
import Settings from './components/Settings';
import { QuickListsPage, QuickListEditorModal, QuickListDocumentEditor } from './components/quickLists';
import { LandingPage } from './components/landing';
import Auth from './components/Auth';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import DeleteConfirmationModals from './components/DeleteConfirmationModals';
import MobileFAB from './components/MobileFAB';
import { useToast } from './components/Toast';

const App: React.FC = () => {
  const { showToast } = useToast();

  // Core hooks
  const { session, userName, setUserName, isLoading } = useAuth();
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { viewType, setViewType } = useViewNavigation();

  // Routing state based on URL
  const [currentRoute, setCurrentRoute] = useState(() => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/home') return 'home';
    return 'app'; // Default to app (dashboard)
  });

  // UI state
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [parentForSubtask, setParentForSubtask] = useState<string | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ id: string; title: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string; deleteAll: boolean } | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [extendingTask, setExtendingTask] = useState<Task | null>(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isFabVisible, setIsFabVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);

  // Quick Lists UI state
  const [editingList, setEditingList] = useState<QuickList | undefined>(undefined);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  // Task operations via hook
  const {
    tasks,
    isLoading: isTasksLoading,
    addTask,
    updateTask,
    deleteTask,
    carryOverTask,
    extendRecurringSeries,
    endRecurringSeries,
    handleAIPlanGenerated,
    reparentTask
  } = useTasks({
    userId: session?.user?.id,
    showToast,
    onTaskCompleted: (task) => setReviewingTask(task)
  });

  // Quick Lists operations via hook
  const { quickLists, saveList, createNewList, deleteList, toggleListPin } = useQuickLists({
    userId: session?.user?.id,
    showToast
  });

  // Computed values
  const filteredTasks = useMemo(() => tasks.filter(t => t.date === selectedDate), [tasks, selectedDate]);

  // FAB scroll visibility handler
  const handleContentScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    const scrollDiff = currentScrollY - lastScrollY.current;
    if (Math.abs(scrollDiff) > 10) {
      setIsFabVisible(scrollDiff <= 0 || currentScrollY <= 100);
      lastScrollY.current = currentScrollY;
    }
  }, []);

  // Modal handlers
  const handleOpenModal = (task?: Task, parentId: string | null = null) => {
    setEditingTask(task);
    setParentForSubtask(parentId);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (data: Partial<Task>) => {
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await addTask({ ...data, parentId: parentForSubtask, date: selectedDate, status: TaskStatus.TODO, completion: 0 } as any, () => { });
    }
    setIsModalOpen(false);
  };

  const handleDeleteTask = async (id: string, deleteAll = false, confirmed = false) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.isRecurring && !confirmed) {
      setDeleteConfig({ id, title: task.title });
      return;
    }
    if (!confirmed) {
      setPendingDelete({ id, title: task.title, deleteAll });
      return;
    }
    await deleteTask(id, deleteAll, true);
    setDeleteConfig(null);
    setPendingDelete(null);
  };

  const handleCreateNewList = async (type: 'checkbox' | 'bullet' | 'document' = 'checkbox') => {
    if (type === 'document') {
      setEditingList(undefined);
      setIsListModalOpen(true);
    } else {
      await createNewList(type);
    }
  };

  // Navigation handlers
  const navigateTo = useCallback((route: 'home' | 'login' | 'app') => {
    const paths = { home: '/home', login: '/login', app: '/' };
    window.history.pushState({}, '', paths[route]);
    setCurrentRoute(route);
  }, []);

  // Handle browser back/forward
  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/login') setCurrentRoute('login');
      else if (path === '/home') setCurrentRoute('home');
      else setCurrentRoute('app');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Loading state
  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <LoadingSpinner size="lg" message="Loading..." />
    </div>
  );

  // Route: Home/Landing page (always accessible)
  if (currentRoute === 'home') {
    return (
      <LandingPage
        onGetStarted={() => navigateTo(session ? 'app' : 'login')}
        isSignedIn={!!session}
        onGoToApp={() => navigateTo('app')}
        userId={session?.user?.id}
      />
    );
  }

  // Route: Login page
  if (currentRoute === 'login') {
    if (session) {
      // Already signed in, redirect to app
      navigateTo('app');
      return null;
    }
    return <Auth onSuccess={() => navigateTo('app')} />;
  }

  // Route: App / Dashboard (requires auth)
  if (!session) {
    navigateTo('home'); // Not signed in, go to landing/home
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        viewType={viewType}
        setViewType={(v) => { setViewType(v); setIsSidebarOpen(false); }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onAddTask={() => handleOpenModal()}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenAI={() => setIsAIModalOpen(true)}
          userEmail={session.user.email}
          userName={userName}
        />

        <div onScroll={handleContentScroll} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          {viewType === 'DASHBOARD' ? (
            <Dashboard
              tasks={tasks}
              selectedDate={selectedDate}
              onTaskClick={(t) => { setSelectedDate(t.date); setViewType('LIST'); }}
              onGoToDate={(d) => { setSelectedDate(d); setViewType('LIST'); }}
              onExtendSeries={(t) => setExtendingTask(t)}
            />
          ) : viewType === 'LIST' ? (
            <ListView
              tasks={filteredTasks}
              allTasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={(t) => handleOpenModal(t)}
              onViewTask={(t) => setViewingTask(t)}
              onAddSubtask={(parentId) => handleOpenModal(undefined, parentId)}
              onCarryOver={carryOverTask}
              onExtendSeries={(t) => setExtendingTask(t)}
              onReparent={reparentTask}
            />
          ) : viewType === 'SETTINGS' ? (
            <Settings
              tasks={tasks}
              userEmail={session.user.email || ''}
              userName={userName}
              onNameUpdate={setUserName}
            />
          ) : viewType === 'LISTS' ? (
            <QuickListsPage
              lists={quickLists}
              onSave={saveList}
              onDelete={deleteList}
              onTogglePin={toggleListPin}
              onCreateNew={handleCreateNewList}
              onOpenInModal={(list) => { setEditingList(list); setIsListModalOpen(true); }}
            />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              allTasks={tasks}
              onUpdateTask={updateTask}
              onDeleteTask={handleDeleteTask}
              onEditTask={(t) => handleOpenModal(t)}
              onCarryOver={carryOverTask}
            />
          )}
        </div>

        {/* Mobile FAB */}
        <MobileFAB
          isOpen={isFabOpen}
          isVisible={isFabVisible}
          onToggle={() => setIsFabOpen(!isFabOpen)}
          onAddTask={() => { setIsFabOpen(false); handleOpenModal(); }}
          onOpenAI={() => { setIsFabOpen(false); setIsAIModalOpen(true); }}
        />

        {/* Modals */}
        {isModalOpen && (
          <TaskModal
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTask}
            initialData={editingTask}
            isSubtask={!!parentForSubtask}
          />
        )}

        {isAIModalOpen && (
          <AIModal onClose={() => setIsAIModalOpen(false)} onPlanGenerated={(tasks) => handleAIPlanGenerated(tasks, selectedDate)} />
        )}

        {viewingTask && (
          <TaskDetailModal
            task={viewingTask}
            allTasks={tasks}
            onClose={() => setViewingTask(null)}
            onEdit={() => { setViewingTask(null); handleOpenModal(viewingTask); }}
          />
        )}

        {extendingTask && (
          <ExtendRecurringModal
            taskTitle={extendingTask.title}
            onClose={() => setExtendingTask(null)}
            onExtend={(count) => extendRecurringSeries(extendingTask.id, count)}
            onEnd={() => endRecurringSeries(extendingTask.id)}
          />
        )}

        {reviewingTask && (
          <TaskReviewModal
            task={reviewingTask}
            onClose={() => setReviewingTask(null)}
            onSave={(reviewText) => { updateTask(reviewingTask.id, { review: reviewText }); setReviewingTask(null); }}
          />
        )}

        {isListModalOpen && (
          editingList?.type === 'document' || (!editingList && isListModalOpen) ? (
            <QuickListDocumentEditor
              list={editingList?.type === 'document' ? editingList : undefined}
              onClose={() => { setIsListModalOpen(false); setEditingList(undefined); }}
              onSave={async (listData, options) => {
                const savedList = await saveList(listData, options);
                if (!options?.suppressToast) {
                  setIsListModalOpen(false);
                  setEditingList(undefined);
                } else if (savedList && !editingList) {
                  setEditingList(savedList);
                }
              }}
              onDelete={deleteList}
            />
          ) : (
            <QuickListEditorModal
              list={editingList}
              onClose={() => { setIsListModalOpen(false); setEditingList(undefined); }}
              onSave={async (listData, options) => {
                const savedList = await saveList(listData, options);
                if (!options?.suppressToast) {
                  setIsListModalOpen(false);
                  setEditingList(undefined);
                } else if (savedList && !editingList) {
                  setEditingList(savedList);
                }
              }}
              onDelete={deleteList}
            />
          )
        )}

        {/* Delete Confirmation Modals */}
        <DeleteConfirmationModals
          deleteConfig={deleteConfig}
          pendingDelete={pendingDelete}
          onDeleteInstance={(id) => deleteTask(id, false, true).then(() => setDeleteConfig(null))}
          onDeleteAll={(id) => deleteTask(id, true, true).then(() => setDeleteConfig(null))}
          onConfirmPending={() => {
            if (pendingDelete) deleteTask(pendingDelete.id, pendingDelete.deleteAll, true).then(() => setPendingDelete(null));
          }}
          onCancelDelete={() => setDeleteConfig(null)}
          onCancelPending={() => setPendingDelete(null)}
        />
      </main>

      <InstallPrompt />
    </div>
  );
};

const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
