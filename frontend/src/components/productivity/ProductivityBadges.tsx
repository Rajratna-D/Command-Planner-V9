import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { productivityApi } from '../../api/client';
import type { ProductivityBadge } from '../../types';
import {
  Award, Brain, Flame, Zap, Moon, Sun, Trophy, CheckCircle2, Lock, ChevronDown, ChevronRight
} from 'lucide-react';

const BADGE_ICONS: Record<string, React.ReactNode> = {
  Award: <Award size={22} />,
  Brain: <Brain size={22} />,
  Flame: <Flame size={22} />,
  Zap: <Zap size={22} />,
  Moon: <Moon size={22} />,
  Sun: <Sun size={22} />,
  Trophy: <Trophy size={22} />,
};

export default function ProductivityBadges() {
  const [badges, setBadges] = useState<ProductivityBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('cp-productivity-badges-open');
    return stored !== null ? stored === 'true' : false;
  });
  const addToast = useAppStore((s) => s.addToast);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('cp-productivity-badges-open', String(next));
      return next;
    });
  };

  useEffect(() => {
    productivityApi.badges()
      .then(setBadges)
      .catch(() => addToast('Failed to load achievement badges', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  if (loading) {
    return <div className="skeleton h-[70px] rounded-2xl w-full" />;
  }

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-2 cursor-pointer group text-left flex-1"
        >
          <Trophy size={18} className="text-warning-500 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Focus Milestones & Achievements
              </h3>
              <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Earn badges by hitting daily goals, streaks, and deep work milestones</p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-500/10 border border-warning-500/20 text-xs font-bold text-warning-500">
          <span>{unlockedCount} of {badges.length} Unlocked</span>
        </div>
      </div>

      {/* Badges Grid - Collapsible */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-default)] animate-in">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`p-3 rounded-xl border transition-all relative flex flex-col justify-between ${
              b.unlocked
                ? 'bg-gradient-to-br from-brand-500/5 to-accent-500/5 border-brand-500/25 hover:border-brand-500/40 shadow-xs'
                : 'bg-[var(--bg-input)]/30 border-[var(--border-default)] opacity-70 hover:opacity-95'
            }`}
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                className={`p-2 rounded-lg ${
                  b.unlocked
                    ? 'bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-xs'
                    : 'bg-[var(--bg-input)] text-[var(--text-tertiary)]'
                }`}
              >
                {BADGE_ICONS[b.icon] || <Award size={18} />}
              </div>

              <div className="flex items-center gap-1">
                {b.unlocked ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 px-1.5 py-0.5 rounded-md bg-emerald-500/10">
                    <CheckCircle2 size={11} />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-tertiary)] px-1.5 py-0.5 rounded-md bg-[var(--bg-input)]">
                    <Lock size={10} />
                    <span>Locked</span>
                  </span>
                )}
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-0.5 my-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">{b.title}</h4>
              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{b.description}</p>
            </div>

            {/* Progress */}
            <div className="mt-2.5 pt-2 border-t border-[var(--border-default)]/50 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{b.category}</span>
                <span className={`font-bold ${b.unlocked ? 'text-brand-500' : 'text-[var(--text-secondary)]'}`}>
                  {b.progress_label}
                </span>
              </div>
              <div className="w-full h-1 rounded-full bg-[var(--bg-input)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    b.unlocked
                      ? 'bg-gradient-to-r from-brand-500 to-accent-500'
                      : 'bg-brand-500/40'
                  }`}
                  style={{ width: `${b.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
