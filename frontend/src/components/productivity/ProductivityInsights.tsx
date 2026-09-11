import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { productivityApi } from '../../api/client';
import type { ProductivityInsight } from '../../types';
import { Sparkles, Flame, TrendingUp, Lightbulb } from 'lucide-react';

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles size={18} className="text-brand-500" />,
  Flame: <Flame size={18} className="text-warning-500" />,
  TrendingUp: <TrendingUp size={18} className="text-emerald-500" />,
  Lightbulb: <Lightbulb size={18} className="text-accent-500" />,
};

const CATEGORY_STYLES: Record<string, { bg: string; border: string }> = {
  Optimization: { bg: 'from-brand-500/5 to-accent-500/5', border: 'border-brand-500/20' },
  Consistency: { bg: 'from-warning-500/5 to-amber-500/5', border: 'border-warning-500/20' },
  Pacing: { bg: 'from-emerald-500/5 to-teal-500/5', border: 'border-emerald-500/20' },
};

export default function ProductivityInsights() {
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    productivityApi.insights()
      .then(setInsights)
      .catch(() => addToast('Failed to load focus insights', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  if (loading) {
    return <div className="skeleton h-[76px] rounded-xl w-full" />;
  }

  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {insights.map((ins, idx) => {
        const style = CATEGORY_STYLES[ins.category] || CATEGORY_STYLES.Optimization;
        return (
          <div
            key={idx}
            className={`p-3 rounded-xl border bg-gradient-to-br ${style.bg} ${style.border} shadow-xs flex items-start gap-3 transition-all hover:shadow-sm`}
          >
            <div className="p-2 rounded-lg bg-[var(--bg-card)] shadow-xs shrink-0 border border-[var(--border-default)]">
              {INSIGHT_ICONS[ins.icon] || <Lightbulb size={16} />}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{ins.title}</h4>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-tertiary)] shrink-0">
                  {ins.category}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{ins.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
