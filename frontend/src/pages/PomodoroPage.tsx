import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/appStore';
import { formatStudyTime } from '../utils/formatTime';
import { syllabusApi } from '../api/client';
import type { Subject } from '../types';
import {
  usePomodoroStore,
  MODE_LABELS,
  MODE_COLORS,
  type TimerMode,
} from '../store/pomodoroStore';
import { Play, Pause, RotateCcw, Coffee, Brain, Maximize2, Minimize2, Settings2, Sliders, Target, CheckCircle2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PomodoroPage() {
  const mode = usePomodoroStore((s) => s.mode);
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const running = usePomodoroStore((s) => s.running);
  const taskName = usePomodoroStore((s) => s.taskName);
  const zenMode = usePomodoroStore((s) => s.zenMode);
  const autoStartBreak = usePomodoroStore((s) => s.autoStartBreak);
  const autoStartFocus = usePomodoroStore((s) => s.autoStartFocus);
  const sessions = usePomodoroStore((s) => s.sessions);

  // Settings from store
  const workDuration = usePomodoroStore((s) => s.workDuration);
  const shortBreakDuration = usePomodoroStore((s) => s.shortBreakDuration);
  const longBreakDuration = usePomodoroStore((s) => s.longBreakDuration);
  const dailyGoal = usePomodoroStore((s) => s.dailyGoal);
  const longBreakInterval = usePomodoroStore((s) => s.longBreakInterval);

  const setMode = usePomodoroStore((s) => s.setMode);
  const setTaskName = usePomodoroStore((s) => s.setTaskName);
  const setZenMode = usePomodoroStore((s) => s.setZenMode);
  const setAutoStartBreak = usePomodoroStore((s) => s.setAutoStartBreak);
  const setAutoStartFocus = usePomodoroStore((s) => s.setAutoStartFocus);
  const setTimerSettings = usePomodoroStore((s) => s.setTimerSettings);
  const toggleTimer = usePomodoroStore((s) => s.toggleTimer);
  const resetTimer = usePomodoroStore((s) => s.resetTimer);
  const getDurationForMode = usePomodoroStore((s) => s.getDurationForMode);

  const addToast = useAppStore((s) => s.addToast);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    syllabusApi.list()
      .then(setSubjects)
      .catch(() => {});
  }, []);

  // Toggle settings drawer / collapsible card
  const [showConfig, setShowConfig] = useState(false);

  // Local state for editing duration settings
  const [editWork, setEditWork] = useState(workDuration);
  const [editShort, setEditShort] = useState(shortBreakDuration);
  const [editLong, setEditLong] = useState(longBreakDuration);
  const [editGoal, setEditGoal] = useState(dailyGoal);
  const [editInterval, setEditInterval] = useState(longBreakInterval);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const totalModeSec = getDurationForMode(mode);
  const progress = totalModeSec > 0 ? 1 - timeLeft / totalModeSec : 0;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const todayWorkSessions = sessions.filter((s) => s.type === 'work');
  const todayWork = todayWorkSessions.length;
  const todayMinutes = todayWorkSessions.reduce((sum, s) => sum + (s.duration_min || 0), 0);
  const goalPercent = Math.min(100, Math.round(((todayMinutes / 60) / Math.max(0.1, dailyGoal)) * 100));

  const handleSaveSettings = () => {
    setTimerSettings({
      workDuration: editWork,
      shortBreakDuration: editShort,
      longBreakDuration: editLong,
      dailyGoal: editGoal,
      longBreakInterval: editInterval,
    });
    addToast('Pomodoro settings updated!', 'success');
    setShowConfig(false);
  };

  const handleToggleAutoStartBreak = (val: boolean) => {
    setAutoStartBreak(val);
    addToast(val ? 'Auto-start break enabled' : 'Auto-start break disabled', 'info');
  };

  const handleToggleAutoStartFocus = (val: boolean) => {
    setAutoStartFocus(val);
    addToast(val ? 'Auto-start focus enabled' : 'Auto-start focus disabled', 'info');
  };

  // Render the core timer block (reused in Zen Mode and Normal Mode)
  const renderTimerBlock = (isZen: boolean) => (
    <div className={`flex flex-col items-center justify-center ${isZen ? 'scale-110 sm:scale-125 transition-transform duration-300' : ''}`}>
      {/* Circular Timer */}
      <div className="relative w-64 h-64 mb-8">
        {/* Breathing Guided Glow (Only in Zen Mode) */}
        {isZen && running && (
          <motion.div
            className="absolute inset-0 rounded-full bg-brand-500/10 dark:bg-brand-500/5 blur-3xl -z-10"
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
          {/* Background circle */}
          <circle
            cx="128" cy="128" r="120"
            fill="none" stroke="var(--border-default)" strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="128" cy="128" r="120"
            fill="none"
            stroke="url(#timer-gradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={`${mode === 'work' ? '[stop-color:var(--color-brand-500)]' : '[stop-color:var(--color-success-500)]'}`} />
              <stop offset="100%" className={`${mode === 'work' ? '[stop-color:var(--color-accent-500)]' : '[stop-color:var(--color-brand-500)]'}`} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold tabular-nums tracking-tight text-[var(--text-primary)]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-sm font-semibold text-[var(--text-secondary)] mt-1">{MODE_LABELS[mode]}</span>
        </div>
      </div>

      {/* Subject & Task input / display */}
      <div className="w-full max-w-sm mb-6 text-center space-y-2">
        {isZen ? (
          taskName ? (
            <p className="text-md font-medium text-[var(--text-primary)]">Focusing on: <span className="font-semibold text-brand-500">{taskName}</span></p>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)] italic">Focus Session Active</p>
          )
        ) : (
          <div className="space-y-2">
            {subjects.length > 0 && (
              <div className="flex items-center gap-1.5 justify-center flex-wrap">
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] flex items-center gap-1 mr-1">
                  <BookOpen size={12} />
                  <span>Subject:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('');
                    const cleaned = taskName.replace(/^\[.*?\]\s*/, '');
                    setTaskName(cleaned);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    !selectedSubject
                      ? 'bg-brand-500 text-white'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  None
                </button>
                {subjects.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub.name);
                      const cleaned = taskName.replace(/^\[.*?\]\s*/, '');
                      setTaskName(`[${sub.name}] ${cleaned}`.trim());
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer truncate max-w-[130px] ${
                      selectedSubject === sub.name
                        ? 'bg-brand-500 text-white'
                        : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}
            <Input
              placeholder="What are you working on? (e.g. Chapter 3, Assignment)"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          size="lg"
          icon={running ? <Pause size={20} /> : <Play size={20} />}
          onClick={toggleTimer}
          className={`!rounded-full !px-8 bg-gradient-to-r ${MODE_COLORS[mode]} border-0 shadow-md`}
        >
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          icon={<RotateCcw size={18} />}
          onClick={resetTimer}
        >
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      {/* ── ZEN MODE FULLSCREEN OVERLAY ───────────────────────────────── */}
      {zenMode && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col items-center justify-center p-6 stagger">
          {/* Exit Zen Mode button */}
          <button
            onClick={() => setZenMode(false)}
            className="absolute top-6 right-6 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shadow-md transition-all duration-200"
            title="Exit Zen Mode"
          >
            <Minimize2 size={20} />
          </button>

          {/* Mode Tabs in Zen */}
          <div className="flex gap-2 mb-8 bg-[var(--bg-card)] p-1.5 border border-[var(--border-default)] rounded-2xl shadow-sm">
            <button
              onClick={() => setMode('work')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${mode === 'work' ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
            >
              Focus ({workDuration}m)
            </button>
            <button
              onClick={() => setMode('short_break')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${mode === 'short_break' ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
            >
              Short Break ({shortBreakDuration}m)
            </button>
            <button
              onClick={() => setMode('long_break')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${mode === 'long_break' ? 'bg-brand-500 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
            >
              Long Break ({longBreakDuration}m)
            </button>
          </div>

          {/* Core Timer View */}
          {renderTimerBlock(true)}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Pomodoro Timer</h2>
          <p className="text-sm text-[var(--text-secondary)]">Stay focused, customize sessions, take breaks</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Sliders size={14} className="text-brand-500" />
            <span>Customize Timer</span>
          </button>
          <button
            onClick={() => setZenMode(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Maximize2 size={14} />
            <span>Zen Mode</span>
          </button>
        </div>
      </div>

      {/* Daily Progress Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-500/5 to-accent-500/5 border-brand-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-500">
            <Target size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Daily Focus Goal</h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Time Studied: <span className="font-semibold text-brand-500">{formatStudyTime(todayMinutes)}</span> ({todayWork} session{todayWork !== 1 ? 's' : ''}) · Goal: <span className="font-semibold text-[var(--text-primary)]">{dailyGoal} hrs</span> ({goalPercent}%)
            </p>
          </div>
        </div>

        <div className="w-full sm:w-48 flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-[var(--bg-input)] overflow-hidden border border-[var(--border-default)]">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          {todayMinutes / 60 >= dailyGoal && (
            <span title="Daily Goal Reached!">
              <CheckCircle2 size={18} className="text-success-500 shrink-0 animate-bounce" />
            </span>
          )}
        </div>
      </Card>

      {/* Collapsible Timer Customization Panel */}
      {showConfig && (
        <Card className="p-5 flex flex-col gap-4 border-brand-500/30 animate-in">
          <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Sliders size={16} className="text-brand-500" />
              <span>Customize Durations & Goals</span>
            </h3>
            <button
              onClick={() => setShowConfig(false)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Focus Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={editWork}
                onChange={(e) => setEditWork(Math.max(1, parseInt(e.target.value) || 25))}
                className="w-full px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Short Break (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={editShort}
                onChange={(e) => setEditShort(Math.max(1, parseInt(e.target.value) || 5))}
                className="w-full px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Long Break (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={editLong}
                onChange={(e) => setEditLong(Math.max(1, parseInt(e.target.value) || 15))}
                className="w-full px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[var(--border-default)] pt-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Daily Focus Goal (hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={editGoal}
                onChange={(e) => setEditGoal(Math.max(0.5, parseFloat(e.target.value) || 3.0))}
                className="w-full px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Long Break Interval (every N sessions)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={editInterval}
                onChange={(e) => setEditInterval(Math.max(1, parseInt(e.target.value) || 4))}
                className="w-full px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              Save Custom Settings
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Mode Selection, Circular Timer and Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="flex flex-col items-center py-8 relative">
            {/* Mode selector */}
            <div className="flex gap-2 mb-8 flex-wrap justify-center">
              <button
                onClick={() => setMode('work')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'work' ? 'bg-brand-500 text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
              >
                <Brain size={14} className="inline mr-1.5" />
                Focus ({workDuration}m)
              </button>
              <button
                onClick={() => setMode('short_break')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'short_break' ? 'bg-brand-500 text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
              >
                <Coffee size={14} className="inline mr-1.5" />
                Short Break ({shortBreakDuration}m)
              </button>
              <button
                onClick={() => setMode('long_break')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'long_break' ? 'bg-brand-500 text-white' : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
              >
                <Coffee size={14} className="inline mr-1.5" />
                Long Break ({longBreakDuration}m)
              </button>
            </div>

            {renderTimerBlock(false)}
          </Card>

          {/* Preferences Toggles */}
          <Card className="p-5 flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-default)] pb-2">
              <Settings2 size={16} className="text-brand-500" />
              <span>Timer Preferences</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStartBreak}
                  onChange={(e) => handleToggleAutoStartBreak(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Auto-start Break</span>
                  <span className="text-xs text-[var(--text-secondary)]">Starts break when focus ends</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoStartFocus}
                  onChange={(e) => handleToggleAutoStartFocus(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Auto-start Focus</span>
                  <span className="text-xs text-[var(--text-secondary)]">Starts focus when break ends</span>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Right Side: Session Log */}
        <div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-[var(--text-primary)]">Today&apos;s Sessions</h3>
              <Badge variant="brand">{formatStudyTime(todayMinutes)} · {todayWork} focus</Badge>
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-6">
                No sessions yet today. Start your first focus session!
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--bg-input)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {s.type === 'work' ? (
                        <Brain size={14} className="text-brand-500 shrink-0" />
                      ) : (
                        <Coffee size={14} className="text-success-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{s.task || MODE_LABELS[s.type as TimerMode] || s.type}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{s.time} · {s.duration_min}min</p>
                      </div>
                    </div>
                    <Badge variant={s.type === 'work' ? 'brand' : 'success'}>
                      {s.type === 'work' ? 'Focus' : 'Break'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
