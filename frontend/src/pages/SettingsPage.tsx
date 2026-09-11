import { useEffect, useState, useCallback } from 'react';
import { useAppStore, type AppTheme } from '../store/appStore';
import { syllabusApi, backupApi, archiveApi } from '../api/client';
import type { Subject, BackupInfo, ArchiveItem, ArchiveStats } from '../types';
import SubjectColorManager from '../components/settings/SubjectColorManager';
import {
  Database, RotateCcw, Trash2, Download, AlertTriangle, Loader2,
  Archive, ChevronDown, ChevronRight, ArchiveRestore, X, Sparkles, Check
} from 'lucide-react';

const THEMES: { id: AppTheme; label: string; icon: string; desc: string; bg: string; accent: string }[] = [
  { id: 'matcha', label: 'Matcha', icon: '🍵', desc: 'Kyoto green tea & bamboo gold', bg: '#f2f6f3', accent: '#387c53' },
  { id: 'dark', label: 'Dark', icon: '🌙', desc: 'Slate dark mode', bg: '#1e2337', accent: '#6366f1' },
  { id: 'light', label: 'Light', icon: '☀️', desc: 'Clean modern daylight', bg: '#ffffff', accent: '#3b82f6' },
  { id: 'oled', label: 'OLED Black', icon: '🕶️', desc: 'Pure ink-black contrast', bg: '#000000', accent: '#3b82f6' },
  { id: 'nord', label: 'Nord', icon: '❄️', desc: 'Arctic frost & slate', bg: '#2e3440', accent: '#88c0d0' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '⚡', desc: 'Neon magenta & electric cyan', bg: '#0c0813', accent: '#ff007f' },
  { id: 'sepia', label: 'Sepia', icon: '🍂', desc: 'Warm parchment paper', bg: '#fdf6e3', accent: '#7d593e' },
  { id: 'sakura', label: 'Sakura', icon: '🌸', desc: 'Cherry blossom & blush rose', bg: '#fff0f5', accent: '#e06d8a' },
  { id: 'forest', label: 'Forest', icon: '🌲', desc: 'Evergreen & pine emerald', bg: '#0f1c15', accent: '#4ade80' },
  { id: 'espresso', label: 'Espresso', icon: '☕', desc: 'Warm roasted coffee & caramel', bg: '#18110b', accent: '#d97706' },
  { id: 'nebula', label: 'Nebula', icon: '🌌', desc: 'Cosmic obsidian & electric ultraviolet', bg: '#0c0817', accent: '#a855f7' },
  { id: 'twilight', label: 'Tokyo Twilight', icon: '🌆', desc: 'Midnight indigo & neon sunset', bg: '#121024', accent: '#f43f5e' },
  { id: 'abyss', label: 'Deep Abyss', icon: '🌊', desc: 'Midnight navy & bioluminescent cyan', bg: '#07111e', accent: '#06b6d4' },
  { id: 'lavender', label: 'Lavender Mist', icon: '🪻', desc: 'Dreamy pastel lilac & regal violet', bg: '#f7f5fc', accent: '#7c3aed' },
  { id: 'monokai', label: 'Monokai Pro', icon: '⚡', desc: 'Obsidian charcoal & amber gold', bg: '#19181a', accent: '#ffd866' },
];

const ARCHIVE_TYPE_LABELS: Record<string, string> = {
  task: 'Tasks',
  assignment: 'Assignments',
  note: 'Notes',
  practical: 'Practicals',
};

const ARCHIVE_TYPE_COLORS: Record<string, string> = {
  task: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
  assignment: 'bg-accent-500/10 text-accent-500 border-accent-500/20',
  note: 'bg-success-500/10 text-success-500 border-success-500/20',
  practical: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
};

export default function SettingsPage() {
  const addToast = useAppStore((s) => s.addToast);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const [themeOpen, setThemeOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('cp-settings-theme-open');
    return stored !== null ? stored === 'true' : true;
  });

  const toggleThemeOpen = () => {
    setThemeOpen((prev) => {
      const next = !prev;
      localStorage.setItem('cp-settings-theme-open', String(next));
      return next;
    });
  };

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  
  // Wipe database double confirmation
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [wipeText, setWipeText] = useState('');

  // Archive state
  const [archiveOpen, setArchiveOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('cp-settings-archive-open');
    return stored !== null ? stored === 'true' : false;
  });

  const toggleArchiveOpen = () => {
    setArchiveOpen((prev) => {
      const next = !prev;
      localStorage.setItem('cp-settings-archive-open', String(next));
      return next;
    });
  };

  const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>([]);
  const [archiveStats, setArchiveStats] = useState<ArchiveStats | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<string>('all');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Load subjects and backups
  const fetchData = useCallback(async () => {
    setLoadingSubjects(true);
    setLoadingBackups(true);
    try {
      const subList = await syllabusApi.list();
      setSubjects(subList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load subjects';
      addToast(msg, 'error');
    } finally {
      setLoadingSubjects(false);
    }

    try {
      const backupList = await backupApi.list();
      setBackups(backupList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load backups';
      addToast(msg, 'error');
    } finally {
      setLoadingBackups(false);
    }
  }, [addToast]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchData();
      // Load archive stats for the badge count
      archiveApi.stats().then(setArchiveStats).catch(() => {});
    });
  }, [fetchData]);

  // Load archive data
  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const [items, stats] = await Promise.all([
        archiveApi.list(archiveFilter !== 'all' ? archiveFilter : undefined),
        archiveApi.stats(),
      ]);
      setArchiveItems(items);
      setArchiveStats(stats);
    } catch {
      addToast('Failed to load archive', 'error');
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveFilter, addToast]);

  // Load archive when section opens or filter changes
  useEffect(() => {
    if (archiveOpen) {
      loadArchive();
    }
  }, [archiveOpen, loadArchive]);

  // Archive operations
  const handleRestore = useCallback(async (itemType: string, id: string) => {
    try {
      await archiveApi.restore(itemType, id);
      addToast(`${ARCHIVE_TYPE_LABELS[itemType]?.slice(0, -1) || itemType} restored!`, 'success');
      loadArchive();
    } catch {
      addToast('Failed to restore item', 'error');
    }
  }, [addToast, loadArchive]);

  const handleDeleteArchived = useCallback(async (itemType: string, id: string) => {
    try {
      await archiveApi.delete(itemType, id);
      addToast('Permanently deleted', 'success');
      loadArchive();
    } catch {
      addToast('Failed to delete item', 'error');
    }
  }, [addToast, loadArchive]);

  const handleClearArchive = useCallback(async () => {
    try {
      const filterType = archiveFilter !== 'all' ? archiveFilter : undefined;
      const res = await archiveApi.clear(filterType);
      addToast(`Cleared ${res.deleted} archived items`, 'success');
      setClearConfirmOpen(false);
      loadArchive();
    } catch {
      addToast('Failed to clear archive', 'error');
    }
  }, [archiveFilter, addToast, loadArchive]);

  // Create manual backup
  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      await backupApi.create();
      addToast('Backup created successfully', 'success');
      // reload backup list
      const backupList = await backupApi.list();
      setBackups(backupList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create backup';
      addToast(msg, 'error');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Restore backup
  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore from ${filename}?\nThis will overwrite all current data.`)) {
      return;
    }
    try {
      const res = await backupApi.restore(filename);
      addToast(res.message || 'Backup restored successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to restore backup';
      addToast(msg, 'error');
    }
  };

  // Wipe database
  const handleWipeDatabase = async () => {
    if (wipeText.toLowerCase() !== 'wipe') {
      addToast('Please type WIPE to confirm', 'error');
      return;
    }
    try {
      const res = await backupApi.wipe();
      addToast(res.message || 'Database wiped successfully!', 'success');
      setWipeConfirmOpen(false);
      setWipeText('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to wipe database';
      addToast(msg, 'error');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-8 stagger">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Settings & System Controls</h2>
        <p className="text-sm text-[var(--text-secondary)]">Manage your subject visual settings, backup recovery points, and global controls.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Theme & Subject Visuals */}
        <section className="flex flex-col gap-6">
          {/* Workspace Theme Selector */}
          <div className="flex flex-col gap-4">
            <button
              onClick={toggleThemeOpen}
              className="flex items-center justify-between border-b border-[var(--border-default)] pb-2 cursor-pointer group w-full text-left"
            >
              <div className="flex items-center gap-2 text-md font-semibold text-[var(--text-primary)]">
                <Sparkles className="text-brand-500" size={20} />
                <h3>Workspace Appearance & Theme</h3>
                <span className="text-[10px] bg-brand-500/10 text-brand-500 font-semibold px-2 py-0.5 rounded-full capitalize flex items-center gap-1">
                  <span>{THEMES.find(t => t.id === theme)?.icon}</span>
                  <span>{THEMES.find(t => t.id === theme)?.label || theme}</span>
                </span>
              </div>
              <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
                {themeOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </span>
            </button>

            {themeOpen && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-3 animate-in">
                <p className="text-xs text-[var(--text-secondary)]">
                  Choose your aesthetic environment. Try the enhanced <span className="font-semibold text-brand-500">🍵 Matcha</span> theme for a soothing Kyoto green tea atmosphere.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                        theme === t.id
                          ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/20 shadow-xs'
                          : 'border-[var(--border-default)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-lg">{t.icon}</span>
                        {theme === t.id && (
                          <span className="p-0.5 rounded-full bg-brand-500 text-white">
                            <Check size={12} />
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{t.label}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subject Visual Identity & Icons */}
          <SubjectColorManager subjects={subjects} loading={loadingSubjects} />
        </section>

        {/* Right Column: Database, Backups, and Archive */}
        <section className="flex flex-col gap-6">
          {/* Backup Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2">
              <div className="flex items-center gap-2 text-md font-semibold text-[var(--text-primary)]">
                <Database className="text-brand-500" size={20} />
                <h3>Database Backup & Recovery</h3>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                {creatingBackup ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                <span>Backup Now</span>
              </button>
            </div>

            <div className="flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Recovery Points</h4>
                  <p className="text-xs text-[var(--text-secondary)]">Select a backup to restore your workspace state.</p>
                </div>
                <span className="text-[10px] bg-brand-500/10 text-brand-500 font-semibold px-2 py-0.5 rounded-full">
                  Auto-backup on launch enabled
                </span>
              </div>

              {loadingBackups ? (
                <div className="flex items-center justify-center py-8 text-[var(--text-secondary)]">
                  <Loader2 className="animate-spin mr-2" size={18} />
                  <span>Loading backup list...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  No backup files found. Generate one now!
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {backups.map((b) => (
                    <div
                      key={b.filename}
                      className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] transition-all duration-200"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono font-semibold text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-xs" title={b.filename}>
                          {b.filename}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                          <span>{new Date(b.created_at).toLocaleString()}</span>
                          <span>•</span>
                          <span>{(b.size_bytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRestoreBackup(b.filename)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[var(--border-default)] hover:border-brand-500 hover:text-brand-500 rounded-lg cursor-pointer transition-colors"
                        title="Restore this backup"
                      >
                        <RotateCcw size={12} />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* Archive Section                                              */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-4">
            <button
              onClick={toggleArchiveOpen}
              className="flex items-center justify-between border-b border-[var(--border-default)] pb-2 cursor-pointer group w-full text-left"
            >
              <div className="flex items-center gap-2 text-md font-semibold text-[var(--text-primary)]">
                <Archive className="text-accent-500" size={20} />
                <h3>Archive</h3>
                {archiveStats && archiveStats.total > 0 && (
                  <span className="text-[10px] bg-accent-500/10 text-accent-500 font-semibold px-2 py-0.5 rounded-full">
                    {archiveStats.total} item{archiveStats.total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
                {archiveOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </span>
            </button>

            {archiveOpen && (
              <div className="flex flex-col gap-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm animate-in">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Items you've archived instead of deleting. Restore them anytime or permanently remove.
                  </p>
                </div>

                {/* Type filter tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {['all', 'task', 'assignment', 'note', 'practical'].map((type) => {
                    const isActive = archiveFilter === type;
                    const statsKeyMap: Record<string, keyof ArchiveStats> = {
                      task: 'tasks',
                      assignment: 'assignments',
                      note: 'notes',
                      practical: 'practicals',
                    };
                    const count = type === 'all'
                      ? archiveStats?.total || 0
                      : (archiveStats && statsKeyMap[type] ? archiveStats[statsKeyMap[type]] : 0);
                    return (
                      <button
                        key={type}
                        onClick={() => setArchiveFilter(type)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border
                          ${isActive
                            ? 'bg-accent-500 text-white border-accent-500'
                            : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-accent-500/50'
                          }
                        `}
                      >
                        {type === 'all' ? 'All' : ARCHIVE_TYPE_LABELS[type]} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Clear all button */}
                {archiveItems.length > 0 && (
                  <div className="flex justify-end">
                    {!clearConfirmOpen ? (
                      <button
                        onClick={() => setClearConfirmOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-danger-500 border border-danger-500/20 hover:bg-danger-500/10 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 size={12} />
                        <span>Clear {archiveFilter === 'all' ? 'All' : ARCHIVE_TYPE_LABELS[archiveFilter]}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-danger-500 font-semibold">Delete all?</span>
                        <button
                          onClick={handleClearArchive}
                          className="px-2.5 py-1 text-xs bg-danger-500 text-white rounded-lg cursor-pointer transition-colors hover:bg-danger-600"
                        >
                          Yes, clear
                        </button>
                        <button
                          onClick={() => setClearConfirmOpen(false)}
                          className="px-2.5 py-1 text-xs border border-[var(--border-default)] rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-card-hover)]"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Archive items list */}
                {archiveLoading ? (
                  <div className="flex items-center justify-center py-8 text-[var(--text-secondary)]">
                    <Loader2 className="animate-spin mr-2" size={18} />
                    <span>Loading archive...</span>
                  </div>
                ) : archiveItems.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                    📦 No archived items. When you archive tasks, notes, or assignments, they'll appear here.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {archiveItems.map((item) => (
                      <div
                        key={`${item.item_type}-${item.id}`}
                        className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${ARCHIVE_TYPE_COLORS[item.item_type] || 'bg-gray-500/10 text-gray-500'}`}>
                            {ARCHIVE_TYPE_LABELS[item.item_type] || item.item_type}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                              {item.subtitle && <span>{item.subtitle}</span>}
                              {item.subtitle && item.created_at && <span>•</span>}
                              {item.created_at && <span>{formatDate(item.created_at)}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleRestore(item.item_type, item.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-brand-500 border border-brand-500/20 hover:bg-brand-500/10 rounded-lg cursor-pointer transition-colors"
                            title="Restore item"
                          >
                            <ArchiveRestore size={12} />
                            <span className="hidden sm:inline">Restore</span>
                          </button>
                          <button
                            onClick={() => handleDeleteArchived(item.item_type, item.id)}
                            className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 cursor-pointer"
                            title="Permanently delete"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dangerous Actions / Database Wipe */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-md font-semibold text-danger-500 border-b border-[var(--border-default)] pb-2">
              <AlertTriangle size={20} />
              <h3>Danger Zone</h3>
            </div>

            <div className="flex flex-col gap-4 bg-[var(--bg-card)] border border-danger-500/20 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">Safe Data Wipe</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Deletes all tasks, notes, syllabus, tests, and other information, reinitializing the database. Your database tables will be preserved but completely emptied.
                </p>
              </div>

              {!wipeConfirmOpen ? (
                <button
                  onClick={() => setWipeConfirmOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-danger-500 text-danger-500 hover:bg-danger-500 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <Trash2 size={14} />
                  <span>Wipe Database & Reset App</span>
                </button>
              ) : (
                <div className="flex flex-col gap-3 p-3 bg-danger-500/5 border border-danger-500/20 rounded-xl stagger">
                  <div className="flex items-start gap-2 text-xs text-danger-600 dark:text-danger-400">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>
                      WARNING: This action is permanent and cannot be undone! To proceed, type <strong>WIPE</strong> in the input below:
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type WIPE here"
                      value={wipeText}
                      onChange={(e) => setWipeText(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-danger-500/30 bg-[var(--bg-input)] text-[var(--text-primary)] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-danger-500"
                    />
                    <button
                      onClick={handleWipeDatabase}
                      className="px-4 py-1.5 bg-danger-500 hover:bg-danger-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Confirm Wipe
                    </button>
                    <button
                      onClick={() => {
                        setWipeConfirmOpen(false);
                        setWipeText('');
                      }}
                      className="px-3 py-1.5 border border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
