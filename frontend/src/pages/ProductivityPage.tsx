import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { productivityApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { ProductivityScores, ScoreCard } from '../types';
import { formatStudyTime } from '../utils/formatTime';
import { Flame, TrendingUp, Target, Award } from 'lucide-react';
import HeatmapCalendar from '../components/charts/HeatmapCalendar';
import KiviatChart from '../components/charts/KiviatChart';
import PeakHoursChart from '../components/charts/PeakHoursChart';
import DailyTrendChart from '../components/charts/DailyTrendChart';
import SubjectBreakdownChart from '../components/charts/SubjectBreakdownChart';
import ProductivityBadges from '../components/productivity/ProductivityBadges';
import ProductivityInsights from '../components/productivity/ProductivityInsights';

export default function ProductivityPage() {
  const [scores, setScores] = useState<ProductivityScores | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    productivityApi.scores()
      .then(setScores)
      .catch(() => addToast('Failed to load productivity data', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  if (loading) {
    return (
      <div className="space-y-4 stagger">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!scores) return null;

  const gradeVariant = (g: string) => {
    switch (g) {
      case 'EXCELLENT': return 'success' as const;
      case 'GOOD': return 'brand' as const;
      case 'AVERAGE': return 'warning' as const;
      case 'NEEDS WORK': return 'danger' as const;
      default: return 'default' as const;
    }
  };

  const cards: { card: ScoreCard; icon: React.ReactNode; gradient: string }[] = [
    { card: scores.today, icon: <Target size={20} />, gradient: 'from-brand-500 to-accent-500' },
    { card: scores.yesterday, icon: <TrendingUp size={20} />, gradient: 'from-accent-500 to-brand-500' },
    { card: scores.week, icon: <Award size={20} />, gradient: 'from-success-500 to-brand-500' },
    { card: scores.month, icon: <TrendingUp size={20} />, gradient: 'from-brand-500 to-success-500' },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* ── Header with integrated Streak & Goal Badges ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1 border-b border-[var(--border-default)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Productivity & Focus Analytics</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Hours-based scoring, trends, subject distribution, and deep work intelligence
          </p>
        </div>

        {/* Header Streak & Goal Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warning-500/10 border border-warning-500/20 text-xs font-bold text-warning-500 shadow-xs">
            <Flame size={15} />
            <span>{scores.streak} Day Streak</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs font-bold text-brand-500 shadow-xs">
            <Target size={15} />
            <span>{scores.daily_goal}h Daily Goal</span>
          </div>
        </div>
      </div>

      {/* ── 1. Smart Productivity Insights ── */}
      <ProductivityInsights />

      {/* ── 2. Performance Score Cards (Today / Yesterday / Week / Month) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ card, icon, gradient }) => (
          <Card key={card.period} hoverable className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                {card.period}
              </span>
              <span className="p-1.5 rounded-lg bg-[var(--bg-input)] text-[var(--text-secondary)]">
                {icon}
              </span>
            </div>

            {/* Circular score & details */}
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none" stroke="var(--border-default)" strokeWidth="4"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="url(#score-gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - card.score / 100)}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="score-gradient">
                      <stop offset="0%" stopColor="var(--color-brand-500)" />
                      <stop offset="100%" stopColor="var(--color-accent-500)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                  {card.score}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                  {formatStudyTime(card.duration_min || Math.round((card.hours || 0) * 60))}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {card.sessions} session{card.sessions !== 1 ? 's' : ''}
                </p>
                <Badge variant={gradeVariant(card.grade)} className="mt-1 text-[10px] py-0 px-1.5">
                  {card.grade}
                </Badge>
              </div>
            </div>

            {/* Score progress bar */}
            <div className="mt-3.5 w-full h-1 bg-[var(--bg-input)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                style={{ width: `${card.score}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* ── 3. Daily Study Hours Trend & Goal Hit Rate ── */}
      <DailyTrendChart />

      {/* ── 4. Focus Activity Heatmap (Click to Inspect Day) ── */}
      <HeatmapCalendar />

      {/* ── 5. Multi-dimensional Insights Grid (2-Column Balanced) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectBreakdownChart />
        <KiviatChart />
      </div>

      {/* ── 6. 24-Hour Peak Focus Distribution (Golden Focus Zone) ── */}
      <PeakHoursChart />

      {/* ── 7. Focus Milestones & Achievements (Bottom Section) ── */}
      <ProductivityBadges />
    </div>
  );
}

