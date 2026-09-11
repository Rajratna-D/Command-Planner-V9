/* ═══════════════════════════════════════════════════════════════════════════
   usePomodoroRunner — Global hook running the precision Pomodoro timer.
   Mounted at top-level (App.tsx) so timer remains active across tab switches.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect } from 'react';
import { usePomodoroStore, MODE_LABELS } from '../store/pomodoroStore';

export function usePomodoroRunner() {
  const running = usePomodoroStore((s) => s.running);
  const mode = usePomodoroStore((s) => s.mode);
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const tick = usePomodoroStore((s) => s.tick);
  const loadTodaySessions = usePomodoroStore((s) => s.loadTodaySessions);
  const checkAndRecoverSession = usePomodoroStore((s) => s.checkAndRecoverSession);

  // Load sessions and check for recovered background sessions on mount
  useEffect(() => {
    loadTodaySessions();
    checkAndRecoverSession();
  }, [loadTodaySessions, checkAndRecoverSession]);

  // Main countdown interval (runs globally at top level)
  useEffect(() => {
    if (!running) return;

    // Immediately run tick to ensure fresh state
    tick();

    const interval = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [running, tick]);

  // Instantly sync when browser tab gains focus or visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && running) {
        tick();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [running, tick]);

  // Warn user if closing tab/window while a focus session is actively running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (running && mode === 'work') {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [running, mode]);

  // Sync tab title with timer countdown
  useEffect(() => {
    if (running) {
      const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
      const sec = String(timeLeft % 60).padStart(2, '0');
      document.title = `(${min}:${sec}) ${MODE_LABELS[mode]}`;
    } else {
      document.title = 'Command Planner';
    }

    return () => {
      document.title = 'Command Planner';
    };
  }, [running, timeLeft, mode]);
}
