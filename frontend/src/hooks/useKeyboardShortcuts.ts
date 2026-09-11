import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import type { TabKey } from '../types';

const TABS: TabKey[] = [
  'overview',      // Ctrl + 1
  'tasks',         // Ctrl + 2
  'tests',         // Ctrl + 3
  'lists',         // Ctrl + 4
  'assignments',   // Ctrl + 5
  'practicals',    // Ctrl + 6
  'syllabus',      // Ctrl + 7
  'pomodoro',      // Ctrl + 8
  'notes',         // Ctrl + 9
];

export function useKeyboardShortcuts() {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const shortcutsOpen = useAppStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? (Shift + /) for shortcuts modal toggle
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShortcutsOpen(!shortcutsOpen);
        }
      }

      // Ctrl + 1-9 tab switching
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          const index = num - 1;
          if (index < TABS.length) {
            e.preventDefault();
            setActiveTab(TABS[index]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, shortcutsOpen, setShortcutsOpen]);
}
