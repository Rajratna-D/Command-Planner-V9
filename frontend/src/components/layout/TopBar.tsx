import { useAppStore, type AppTheme } from '../../store/appStore';
import { usePomodoroStore, MODE_LABELS } from '../../store/pomodoroStore';
import { navItems } from './navigation';
import { Sun, Moon, Keyboard, Play, Pause, Timer } from 'lucide-react';

export default function TopBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const isOnline = useAppStore((s) => s.isOnline);

  const running = usePomodoroStore((s) => s.running);
  const mode = usePomodoroStore((s) => s.mode);
  const timeLeft = usePomodoroStore((s) => s.timeLeft);
  const toggleTimer = usePomodoroStore((s) => s.toggleTimer);
  const getDurationForMode = usePomodoroStore((s) => s.getDurationForMode);
  const taskName = usePomodoroStore((s) => s.taskName);

  const current = navItems.find((n) => n.key === activeTab);
  const formattedTime = `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`;

  return (
    <header
      className="
        sticky top-0 z-30
        h-[var(--topbar-height)] flex items-center justify-between
        px-6 border-b border-[var(--border-default)]
        glass-panel
      "
    >
      {/* Page title */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-tertiary)] md:hidden">
          {current?.icon}
        </span>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {current?.label || 'Command Planner'}
        </h1>
        {!isOnline && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-danger-500/10 text-danger-500 border border-danger-500/20 shadow-sm animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />
            <span>Offline</span>
          </span>
        )}
      </div>

      {/* Mini Pomodoro Floating Pill (Visible when on other tabs) */}
      {activeTab !== 'pomodoro' && (running || timeLeft < getDurationForMode(mode)) && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-500 shadow-sm animate-in">
          <button
            onClick={() => setActiveTab('pomodoro')}
            className="flex items-center gap-2 cursor-pointer text-xs font-bold hover:underline"
            title="Open Pomodoro Timer"
          >
            <Timer size={14} className={running ? 'animate-spin' : ''} />
            <span className="tabular-nums font-mono text-sm">{formattedTime}</span>
            <span className="hidden md:inline font-semibold opacity-80">• {MODE_LABELS[mode]}</span>
            {taskName && <span className="hidden lg:inline text-xs opacity-70 truncate max-w-[120px]">({taskName})</span>}
          </button>
          <button
            onClick={toggleTimer}
            className="p-1 rounded-full hover:bg-brand-500/20 text-brand-500 cursor-pointer transition-colors"
            title={running ? 'Pause Timer' : 'Resume Timer'}
          >
            {running ? <Pause size={13} /> : <Play size={13} />}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <select
          value={theme}
          onChange={(e) => useAppStore.getState().setTheme(e.target.value as AppTheme)}
          className="
            px-3 py-1.5 rounded-xl border border-[var(--border-default)]
            bg-[var(--bg-card)] text-[var(--text-primary)] text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-500
            cursor-pointer transition-all duration-200 shadow-sm
          "
        >
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
          <option value="oled">🕶️ OLED Black</option>
          <option value="nord">❄️ Nord</option>
          <option value="cyberpunk">⚡ Cyberpunk</option>
          <option value="sepia">🍂 Sepia</option>
          <option value="sakura">🌸 Sakura</option>
          <option value="forest">🌲 Forest</option>
          <option value="matcha">🍵 Matcha</option>
          <option value="espresso">☕ Espresso</option>
          <option value="nebula">🌌 Nebula</option>
          <option value="twilight">🌆 Tokyo Twilight</option>
          <option value="abyss">🌊 Deep Abyss</option>
          <option value="lavender">🪻 Lavender Mist</option>
          <option value="monokai">⚡ Monokai Pro</option>
        </select>

        <button
          onClick={() => useAppStore.getState().setShortcutsOpen(true)}
          className="
            p-2 rounded-xl transition-all duration-200
            text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]
            hover:text-[var(--text-primary)] cursor-pointer
          "
          title="Keyboard Shortcuts Guide (?)"
        >
          <Keyboard size={20} />
        </button>

        <button
          onClick={toggleTheme}
          className="
            p-2 rounded-xl transition-all duration-200
            text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]
            hover:text-[var(--text-primary)] cursor-pointer
          "
          title="Cycle Theme"
        >
          {['dark', 'oled', 'nord', 'cyberpunk', 'forest'].includes(theme) ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
