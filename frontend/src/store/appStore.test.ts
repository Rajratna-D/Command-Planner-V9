import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore, type SubjectConfig } from './appStore';

describe('AppStore (Zustand)', () => {
  beforeEach(() => {
    // Clear localStorage and document element attributes to prevent test leakage
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    
    useAppStore.setState({
      theme: 'dark',
      activeTab: 'overview',
      sidebarOpen: true,
      isOnline: true,
      toasts: [],
      subjectConfigs: {},
      shortcutsOpen: false,
    });
  });

  it('should initialize with default state', () => {
    const state = useAppStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.activeTab).toBe('overview');
    expect(state.sidebarOpen).toBe(true);
    expect(state.isOnline).toBe(true);
    expect(state.toasts).toEqual([]);
    expect(state.subjectConfigs).toEqual({});
    expect(state.shortcutsOpen).toBe(false);
  });

  it('should update activeTab', () => {
    const { setActiveTab } = useAppStore.getState();
    setActiveTab('tasks');
    expect(useAppStore.getState().activeTab).toBe('tasks');
    
    setActiveTab('settings');
    expect(useAppStore.getState().activeTab).toBe('settings');
  });

  it('should update theme and store it in localStorage/document attribute', () => {
    const { setTheme } = useAppStore.getState();
    
    setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');
    expect(localStorage.getItem('cp-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    
    setTheme('nord');
    expect(useAppStore.getState().theme).toBe('nord');
    expect(localStorage.getItem('cp-theme')).toBe('nord');
    expect(document.documentElement.getAttribute('data-theme')).toBe('nord');
  });

  it('should toggle theme through the predefined cycle', () => {
    const { toggleTheme, setTheme } = useAppStore.getState();
    
    // Predefined cycle: ['light', 'dark', 'oled', 'nord', 'cyberpunk', 'sepia', 'sakura', 'forest', 'matcha']
    setTheme('light');
    
    toggleTheme();
    expect(useAppStore.getState().theme).toBe('dark');
    
    toggleTheme();
    expect(useAppStore.getState().theme).toBe('oled');
  });

  it('should update sidebarOpen state', () => {
    const { setSidebarOpen } = useAppStore.getState();
    
    setSidebarOpen(false);
    expect(useAppStore.getState().sidebarOpen).toBe(false);
    
    setSidebarOpen(true);
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });

  it('should update shortcutsOpen state', () => {
    const { setShortcutsOpen } = useAppStore.getState();
    
    setShortcutsOpen(true);
    expect(useAppStore.getState().shortcutsOpen).toBe(true);
    
    setShortcutsOpen(false);
    expect(useAppStore.getState().shortcutsOpen).toBe(false);
  });

  it('should update online status', () => {
    const { setOnline } = useAppStore.getState();
    
    setOnline(false);
    expect(useAppStore.getState().isOnline).toBe(false);
    
    setOnline(true);
    expect(useAppStore.getState().isOnline).toBe(true);
  });

  it('should manage toast messages correctly', () => {
    // Enable fake timers to test auto-removal
    vi.useFakeTimers();

    const { addToast, removeToast } = useAppStore.getState();
    
    // 1. Add a toast
    addToast('Test message', 'success');
    let toasts = useAppStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Test message');
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].id).toBeDefined();

    const toastId = toasts[0].id;

    // 2. Add another toast
    addToast('Info message', 'info');
    expect(useAppStore.getState().toasts).toHaveLength(2);

    // 3. Remove first toast manually
    removeToast(toastId);
    expect(useAppStore.getState().toasts).toHaveLength(1);
    expect(useAppStore.getState().toasts[0].message).toBe('Info message');

    // 4. Test auto-removal timeout (5000ms)
    vi.advanceTimersByTime(5000);
    expect(useAppStore.getState().toasts).toHaveLength(0);

    vi.useRealTimers();
  });

  it('should update subject configurations', () => {
    const { setSubjectConfig } = useAppStore.getState();
    const mathConfig: SubjectConfig = { color: '#ff0000', icon: 'calculator' };
    
    setSubjectConfig('Math', mathConfig);
    
    expect(useAppStore.getState().subjectConfigs['math']).toEqual(mathConfig);
    expect(JSON.parse(localStorage.getItem('cp-subject-configs') || '{}')['math']).toEqual(mathConfig);
  });
});
