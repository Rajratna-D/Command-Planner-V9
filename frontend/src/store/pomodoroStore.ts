/* ═══════════════════════════════════════════════════════════════════════════
   Pomodoro Store — Global, persistent state & precision timestamp timer engine.
   Maintains customizable durations, daily session goals, and timer settings.
   ═══════════════════════════════════════════════════════════════════════════ */
import { create } from 'zustand';
import { pomodoroApi, settingsApi } from '../api/client';
import { useAppStore } from './appStore';
import type { PomodoroSession } from '../types';

export type TimerMode = 'work' | 'short_break' | 'long_break';

export const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
};

export const MODE_COLORS: Record<TimerMode, string> = {
  work: 'from-brand-500 to-accent-500',
  short_break: 'from-success-500 to-brand-500',
  long_break: 'from-accent-500 to-success-500',
};

function playCompletionChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // First note (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second note (A5 - pleasant chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.25);
    gain2.gain.setValueAtTime(0.4, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.9);
  } catch {
    // Ignore audio context errors
  }
}

interface PomodoroState {
  mode: TimerMode;
  timeLeft: number;
  running: boolean;
  endTime: number | null; // Timestamp when timer ends
  taskName: string;
  zenMode: boolean;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  sessions: PomodoroSession[];

  // Customizable timer settings
  workDuration: number;       // in minutes (default 25)
  shortBreakDuration: number; // in minutes (default 5)
  longBreakDuration: number;  // in minutes (default 15)
  dailyGoal: number;          // target hours per day (default 3.0)
  longBreakInterval: number;  // sessions before a long break (default 4)

  setMode: (mode: TimerMode) => void;
  setTaskName: (taskName: string) => void;
  setZenMode: (zen: boolean) => void;
  setAutoStartBreak: (val: boolean) => void;
  setAutoStartFocus: (val: boolean) => void;
  setTimerSettings: (settings: {
    workDuration?: number;
    shortBreakDuration?: number;
    longBreakDuration?: number;
    dailyGoal?: number;
    longBreakInterval?: number;
  }) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  loadTodaySessions: () => Promise<void>;
  checkAndRecoverSession: () => Promise<void>;
  tick: () => void;
  getDurationForMode: (mode: TimerMode) => number; // seconds
}

interface ActiveSessionReceipt {
  mode: TimerMode;
  taskName: string;
  startTime: number;
  endTime: number | null;
  durationSec: number;
  running: boolean;
  pausedTimeLeft?: number;
}

const SESSION_STORAGE_KEY = 'cp-pomo-active-session';

let taskNameDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function saveActiveSession(data: ActiveSessionReceipt | null) {
  if (typeof window === 'undefined') return;
  if (!data) {
    if (taskNameDebounceTimer) {
      clearTimeout(taskNameDebounceTimer);
      taskNameDebounceTimer = null;
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  }
}

function getStoredActiveSession(): ActiveSessionReceipt | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredNumber(key: string, defaultValue: number): number {
  if (typeof window === 'undefined') return defaultValue;
  const val = localStorage.getItem(key);
  if (!val) return defaultValue;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

function getStoredFloat(key: string, defaultValue: number): number {
  if (typeof window === 'undefined') return defaultValue;
  const val = localStorage.getItem(key);
  if (!val) return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) || parsed <= 0 ? defaultValue : parsed;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => {
  const initialWork = getStoredNumber('cp-pomo-work-min', 25);
  const initialShort = getStoredNumber('cp-pomo-short-min', 5);
  const initialLong = getStoredNumber('cp-pomo-long-min', 15);

  const active = getStoredActiveSession();
  let initialMode: TimerMode = 'work';
  let initialTask = '';
  let initialTimeLeft = initialWork * 60;
  let initialRunning = false;
  let initialEndTime: number | null = null;

  if (active) {
    initialMode = active.mode;
    initialTask = active.taskName || '';
    if (active.running && active.endTime) {
      const now = Date.now();
      if (now < active.endTime) {
        // Still running within session duration
        initialRunning = true;
        initialEndTime = active.endTime;
        initialTimeLeft = Math.max(0, Math.ceil((active.endTime - now) / 1000));
      } else {
        // Finished in background, will be recovered by checkAndRecoverSession
        initialRunning = false;
        initialEndTime = null;
        initialTimeLeft = 0;
      }
    } else if (!active.running && typeof active.pausedTimeLeft === 'number') {
      // Paused session
      initialRunning = false;
      initialEndTime = null;
      initialTimeLeft = active.pausedTimeLeft;
    }
  }

  return {
    mode: initialMode,
    timeLeft: initialTimeLeft,
    running: initialRunning,
    endTime: initialEndTime,
    taskName: initialTask,
    zenMode: false,
    autoStartBreak: typeof window !== 'undefined' ? localStorage.getItem('cp-pomo-auto-start-break') === 'true' : false,
    autoStartFocus: typeof window !== 'undefined' ? localStorage.getItem('cp-pomo-auto-start-focus') === 'true' : false,
    sessions: [],

    workDuration: initialWork,
    shortBreakDuration: initialShort,
    longBreakDuration: initialLong,
    dailyGoal: getStoredFloat('cp-pomo-daily-goal', 3.0),
    longBreakInterval: getStoredNumber('cp-pomo-long-break-interval', 4),

    getDurationForMode: (mode) => {
      const state = get();
      if (mode === 'work') return state.workDuration * 60;
      if (mode === 'short_break') return state.shortBreakDuration * 60;
      return state.longBreakDuration * 60;
    },

    setMode: (mode) => {
      const targetDuration = get().getDurationForMode(mode);
      saveActiveSession(null);
      set({
        mode,
        running: false,
        endTime: null,
        timeLeft: targetDuration,
      });
    },

    setTaskName: (taskName) => {
      set({ taskName });
      if (taskNameDebounceTimer) {
        clearTimeout(taskNameDebounceTimer);
      }
      taskNameDebounceTimer = setTimeout(() => {
        const active = getStoredActiveSession();
        if (active) {
          saveActiveSession({ ...active, taskName });
        }
      }, 300);
    },

    setZenMode: (zenMode) => set({ zenMode }),

    setAutoStartBreak: (val) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cp-pomo-auto-start-break', String(val));
      }
      set({ autoStartBreak: val });
    },

    setAutoStartFocus: (val) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cp-pomo-auto-start-focus', String(val));
      }
      set({ autoStartFocus: val });
    },

    setTimerSettings: ({ workDuration, shortBreakDuration, longBreakDuration, dailyGoal, longBreakInterval }) => {
      const current = get();
      const newWork = workDuration ?? current.workDuration;
      const newShort = shortBreakDuration ?? current.shortBreakDuration;
      const newLong = longBreakDuration ?? current.longBreakDuration;
      const newGoal = dailyGoal ?? current.dailyGoal;
      const newInterval = longBreakInterval ?? current.longBreakInterval;

      if (typeof window !== 'undefined') {
        localStorage.setItem('cp-pomo-work-min', String(newWork));
        localStorage.setItem('cp-pomo-short-min', String(newShort));
        localStorage.setItem('cp-pomo-long-min', String(newLong));
        localStorage.setItem('cp-pomo-daily-goal', String(newGoal));
        localStorage.setItem('cp-pomo-long-break-interval', String(newInterval));
      }

      // Sync daily goal with backend settings
      settingsApi.set('daily_goal', String(newGoal)).catch(() => {});

      const updatedState: Partial<PomodoroState> = {
        workDuration: newWork,
        shortBreakDuration: newShort,
        longBreakDuration: newLong,
        dailyGoal: newGoal,
        longBreakInterval: newInterval,
      };

      // If timer is NOT running, update current mode's timeLeft
      if (!current.running) {
        const mode = current.mode;
        const newDurSec = mode === 'work' ? newWork * 60 : mode === 'short_break' ? newShort * 60 : newLong * 60;
        updatedState.timeLeft = newDurSec;
      }

      set(updatedState);
    },

    startTimer: () => {
      const { timeLeft, mode, taskName, getDurationForMode } = get();
      if (timeLeft <= 0) return;
      const endTime = Date.now() + timeLeft * 1000;
      const durationSec = getDurationForMode(mode);
      const startTime = Date.now() - (durationSec - timeLeft) * 1000;

      saveActiveSession({
        mode,
        taskName,
        startTime,
        endTime,
        durationSec,
        running: true,
      });

      set({ running: true, endTime });
    },

    pauseTimer: () => {
      const { endTime, mode, taskName, getDurationForMode } = get();
      let remaining = get().timeLeft;
      if (endTime) {
        remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      }
      const durationSec = getDurationForMode(mode);
      const startTime = Date.now() - (durationSec - remaining) * 1000;

      saveActiveSession({
        mode,
        taskName,
        startTime,
        endTime: null,
        durationSec,
        running: false,
        pausedTimeLeft: remaining,
      });

      set({ running: false, endTime: null, timeLeft: remaining });
    },

    toggleTimer: () => {
      const { running } = get();
      if (running) {
        get().pauseTimer();
      } else {
        get().startTimer();
      }
    },

    resetTimer: () => {
      const { mode, getDurationForMode } = get();
      saveActiveSession(null);
      set({
        running: false,
        endTime: null,
        timeLeft: getDurationForMode(mode),
      });
    },

    loadTodaySessions: async () => {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const today = `${y}-${m}-${d}`;
        const sessions = await pomodoroApi.log(today);
        set({ sessions });
      } catch {
        // Ignore load error
      }
    },

    checkAndRecoverSession: async () => {
      const active = getStoredActiveSession();
      if (!active || !active.running || !active.endTime) return;

      const now = Date.now();
      if (now >= active.endTime) {
        // Session completed while Chrome or tab was closed!
        saveActiveSession(null);
        playCompletionChime();

        const durationMin = Math.round(active.durationSec / 60);
        const completionDate = new Date(active.endTime);
        const timeStr = completionDate.toTimeString().slice(0, 5);

        // Compute start date/time for midnight-split detection
        const sessionStartDate = new Date(active.startTime);
        const sy = sessionStartDate.getFullYear();
        const sm = String(sessionStartDate.getMonth() + 1).padStart(2, '0');
        const sd = String(sessionStartDate.getDate()).padStart(2, '0');
        const startDateStr = `${sy}-${sm}-${sd}`;
        const startTimeStr = sessionStartDate.toTimeString().slice(0, 5);

        try {
          await pomodoroApi.createSession({
            date: startDateStr,
            time: timeStr,
            type: active.mode,
            task: active.taskName,
            duration_min: durationMin,
            start_time: startTimeStr,
          });
          await get().loadTodaySessions();
          useAppStore.getState().addToast(
            `Welcome back! Your ${MODE_LABELS[active.mode]} (${durationMin} min) completed while away and was saved! 🎉`,
            'success'
          );
        } catch {
          useAppStore.getState().addToast(
            `Recovered ${MODE_LABELS[active.mode]} session, but failed to log to server`,
            'error'
          );
        }

        // Determine next mode
        const { sessions, longBreakInterval, autoStartBreak, autoStartFocus, getDurationForMode } = get();
        if (active.mode === 'work') {
          const focusCompleted = sessions.filter(s => s.type === 'work').length + 1;
          const isLongBreakTime = focusCompleted > 0 && focusCompleted % longBreakInterval === 0;
          const nextMode: TimerMode = isLongBreakTime ? 'long_break' : 'short_break';
          const nextDur = getDurationForMode(nextMode);

          set({ mode: nextMode, timeLeft: nextDur, running: false, endTime: null });

          if (autoStartBreak) {
            get().startTimer();
            useAppStore.getState().addToast(`Focus complete! Auto-starting ${MODE_LABELS[nextMode]}`, 'info');
          }
        } else {
          const nextMode: TimerMode = 'work';
          const nextDur = getDurationForMode(nextMode);

          set({ mode: nextMode, timeLeft: nextDur, running: false, endTime: null });

          if (autoStartFocus) {
            get().startTimer();
            useAppStore.getState().addToast('Break complete. Auto-starting focus session!', 'info');
          }
        }
      }
    },

    tick: () => {
      const {
        running, endTime, mode, taskName, autoStartBreak, autoStartFocus,
        sessions, longBreakInterval, getDurationForMode
      } = get();
      if (!running || !endTime) return;

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      set({ timeLeft: remaining });

      // Handle timer completion
      if (remaining === 0) {
        saveActiveSession(null);
        set({ running: false, endTime: null });

        playCompletionChime();

        const currentDurationMin = Math.round(getDurationForMode(mode) / 60);
        const toastMessage = `${MODE_LABELS[mode]} complete (${currentDurationMin} min)! 🎉`;
        useAppStore.getState().addToast(toastMessage, 'success');

        // Log session to backend
        const currentDate = new Date();

        // Compute start date/time for midnight-split detection
        const startTimestamp = endTime! - getDurationForMode(mode) * 1000;
        const sessionStartDate = new Date(startTimestamp);
        const sy = sessionStartDate.getFullYear();
        const sm = String(sessionStartDate.getMonth() + 1).padStart(2, '0');
        const sd = String(sessionStartDate.getDate()).padStart(2, '0');
        const startDateStr = `${sy}-${sm}-${sd}`;
        const startTimeStr = sessionStartDate.toTimeString().slice(0, 5);

        pomodoroApi.createSession({
          date: startDateStr,
          time: currentDate.toTimeString().slice(0, 5),
          type: mode,
          task: taskName,
          duration_min: currentDurationMin,
          start_time: startTimeStr,
        }).then(() => {
          get().loadTodaySessions();
        }).catch(() => {
          useAppStore.getState().addToast('Failed to log pomodoro session', 'error');
        });

        // Determine next mode based on completed focus count
        if (mode === 'work') {
          const focusCompleted = sessions.filter(s => s.type === 'work').length + 1;
          const isLongBreakTime = focusCompleted > 0 && focusCompleted % longBreakInterval === 0;
          const nextMode: TimerMode = isLongBreakTime ? 'long_break' : 'short_break';
          const nextDur = getDurationForMode(nextMode);

          set({ mode: nextMode, timeLeft: nextDur });

          if (autoStartBreak) {
            get().startTimer();
            useAppStore.getState().addToast(`Focus complete! Auto-starting ${MODE_LABELS[nextMode]}`, 'info');
          }
        } else {
          const nextMode: TimerMode = 'work';
          const nextDur = getDurationForMode(nextMode);

          set({ mode: nextMode, timeLeft: nextDur });

          if (autoStartFocus) {
            get().startTimer();
            useAppStore.getState().addToast('Break complete. Auto-starting focus session!', 'info');
          }
        }
      }
    },
  };
});
