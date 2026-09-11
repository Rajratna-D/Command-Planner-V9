import { useEffect, lazy, Suspense } from 'react';
import { useAppStore } from './store/appStore';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePomodoroRunner } from './hooks/usePomodoroRunner';
import ToastContainer from './components/ui/Toast';
import CommandPalette from './components/layout/CommandPalette';
import ShortcutsModal from './components/ui/ShortcutsModal';
import type { TabKey } from './types';
import { AnimatePresence, motion } from 'framer-motion';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const TestsPage = lazy(() => import('./pages/TestsPage'));
const ListsPage = lazy(() => import('./pages/ListsPage'));
const AssignmentsPage = lazy(() => import('./pages/AssignmentsPage'));
const PracticalsPage = lazy(() => import('./pages/PracticalsPage'));
const SyllabusPage = lazy(() => import('./pages/SyllabusPage'));
const PomodoroPage = lazy(() => import('./pages/PomodoroPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const ProductivityPage = lazy(() => import('./pages/ProductivityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="h-9 w-48 bg-white/5 rounded-xl border border-white/10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
        <div className="h-28 bg-white/5 rounded-2xl border border-white/10" />
      </div>
      <div className="h-80 bg-white/5 rounded-2xl border border-white/10" />
    </div>
  );
}

function renderTabContent(tab: TabKey) {
  switch (tab) {
    case 'overview':
      return <OverviewPage />;
    case 'tasks':
      return <TasksPage />;
    case 'tests':
      return <TestsPage />;
    case 'lists':
      return <ListsPage />;
    case 'assignments':
      return <AssignmentsPage />;
    case 'practicals':
      return <PracticalsPage />;
    case 'syllabus':
      return <SyllabusPage />;
    case 'pomodoro':
      return <PomodoroPage />;
    case 'notes':
      return <NotesPage />;
    case 'productivity':
      return <ProductivityPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <OverviewPage />;
  }
}

export default function App() {
  useKeyboardShortcuts();
  usePomodoroRunner();
  const activeTab = useAppStore((s) => s.activeTab);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setOnline = useAppStore((s) => s.setOnline);

  // Apply theme on mount/change
  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  // Register service worker and setup online/offline listeners on mount
  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Network status listeners
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return (
    <>
      <Sidebar />
      <main
        className={`
          flex-1 min-h-screen flex flex-col
          transition-all duration-300
          md:ml-[var(--sidebar-width)]
          ${!sidebarOpen ? 'md:!ml-[72px]' : ''}
          pb-20 md:pb-0
        `}
      >
        <TopBar />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              className="w-full h-full"
            >
              <Suspense fallback={<PageSkeleton />}>
                {renderTabContent(activeTab)}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <ToastContainer />
      <CommandPalette />
      <ShortcutsModal />
    </>
  );
}
