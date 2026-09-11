/* ═══════════════════════════════════════════════════════════════════════════
   App Store — global UI state: theme, active tab, toasts
   ═══════════════════════════════════════════════════════════════════════════ */
import { create } from 'zustand';
import type { TabKey } from '../types';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

export const ALL_THEMES = [
  'light', 'dark', 'oled', 'nord', 'cyberpunk', 'sepia', 'sakura', 'forest', 'matcha',
  'espresso', 'nebula', 'twilight', 'abyss', 'lavender', 'monokai'
] as const;

export type AppTheme = typeof ALL_THEMES[number];

export interface SubjectConfig {
  color: string;
  icon: string;
}

interface AppState {
  theme: AppTheme;
  activeTab: TabKey;
  sidebarOpen: boolean;
  isOnline: boolean;
  toasts: Toast[];
  subjectConfigs: Record<string, SubjectConfig>;
  shortcutsOpen: boolean;

  setOnline: (online: boolean) => void;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
  setActiveTab: (tab: TabKey) => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (message: string, type?: Toast['type'], actionLabel?: string, onAction?: () => void) => void;
  removeToast: (id: string) => void;
  setSubjectConfig: (subject: string, config: SubjectConfig) => void;
  setShortcutsOpen: (open: boolean) => void;
}

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('cp-theme') as AppTheme | null;
  if (stored && (ALL_THEMES as readonly string[]).includes(stored)) {
    // Apply attributes on load
    document.documentElement.setAttribute('data-theme', stored);
    return stored;
  }
  const defaultTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', defaultTheme);
  return defaultTheme;
}

function getInitialSubjectConfigs(): Record<string, SubjectConfig> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem('cp-subject-configs');
  return stored ? JSON.parse(stored) : {};
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: getInitialTheme(),
  activeTab: 'overview',
  sidebarOpen: true,
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  toasts: [],
  subjectConfigs: getInitialSubjectConfigs(),
  shortcutsOpen: false,

  setOnline: (online) => set({ isOnline: online }),
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cp-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const idx = ALL_THEMES.indexOf(get().theme);
    const next = ALL_THEMES[(idx + 1) % ALL_THEMES.length];
    get().setTheme(next);
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  addToast: (message, type = 'info', actionLabel, onAction) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type, actionLabel, onAction }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSubjectConfig: (subject, config) => {
    const next = { ...get().subjectConfigs, [subject.toLowerCase().trim()]: config };
    localStorage.setItem('cp-subject-configs', JSON.stringify(next));
    set({ subjectConfigs: next });
  },
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
}));

