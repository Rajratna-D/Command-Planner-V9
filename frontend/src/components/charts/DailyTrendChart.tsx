import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { productivityApi } from '../../api/client';
import type { DailyTrendSummary } from '../../types';
import { formatStudyTime } from '../../utils/formatTime';
import { TrendingUp, Target, Award, Clock } from 'lucide-react';

export default function DailyTrendChart() {
  const [days, setDays] = useState<number>(14);
  const [summary, setSummary] = useState<DailyTrendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    setLoading(true);
    productivityApi.dailyTrend(days)
      .then(setSummary)
      .catch(() => addToast('Failed to load daily trend data', 'error'))
      .finally(() => setLoading(false));
  }, [days, addToast]);

  if (loading && !summary) {
    return <div className="skeleton h-[380px] rounded-xl w-full" />;
  }

  if (!summary) return null;

  const chartData = summary.days.map((d) => ({
    date: d.date,
    day: d.day_name.split(',')[0], // e.g. "Mon"
    fullDate: d.day_name,
    'Study Hours': d.hours,
    'Goal Target': d.goal_hours,
    durationMin: d.duration_min,
    goalReached: d.goal_reached,
  }));

  const maxVal = Math.max(...summary.days.map((d) => d.hours), summary.days[0]?.goal_hours || 3.0, 4);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-default)] pb-3">
        <div>
          <h3 className="text-md font-bold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-500" />
            <span>Daily Focus Trends & Target Consistency</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">Daily study hours compared against your daily goal line</p>
        </div>

        {/* Period Switcher */}
        <div className="flex rounded-xl border border-[var(--border-default)] overflow-hidden text-xs font-semibold">
          <button
            onClick={() => setDays(14)}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              days === 14
                ? 'bg-brand-500 text-white font-bold'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            Last 14 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              days === 30
                ? 'bg-brand-500 text-white font-bold'
                : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Summary Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[var(--bg-input)] flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Target size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Goal Hit Rate</p>
            <p className="text-sm font-extrabold text-[var(--text-primary)]">{summary.goal_hit_rate}%</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-input)] flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Daily Average</p>
            <p className="text-sm font-extrabold text-[var(--text-primary)]">{summary.daily_avg_hours}h / day</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-input)] flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-warning-500/10 text-warning-500">
            <Award size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Best Day</p>
            <p className="text-sm font-extrabold text-[var(--text-primary)]">{summary.best_day_hours}h</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-input)] flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-accent-500/10 text-accent-500">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Period Total</p>
            <p className="text-sm font-extrabold text-[var(--text-primary)]">{summary.total_period_hours} hrs</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => {
                const parts = d.split('-');
                return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
              }}
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, Math.ceil(maxVal)]}
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const dataItem = payload[0].payload;
                  return (
                    <div className="p-2.5 text-xs text-white bg-slate-900/95 backdrop-blur-md border border-slate-700/70 shadow-xl rounded-xl">
                      <p className="font-bold text-slate-100 mb-1">{dataItem.fullDate}</p>
                      <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                        <span>Time Studied:</span>
                        <span>{formatStudyTime(dataItem.durationMin)} ({dataItem['Study Hours']}h)</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-slate-400 mt-0.5">
                        <span>Goal Target:</span>
                        <span>{dataItem['Goal Target']} hrs</span>
                      </div>
                      <div className="mt-1.5 pt-1 border-t border-slate-800 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${dataItem.goalReached ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className="text-[10px] text-slate-300 font-medium">
                          {dataItem.goalReached ? 'Daily Goal Achieved! 🎯' : 'Goal in progress'}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="Study Hours"
              radius={[6, 6, 0, 0]}
              fill="var(--color-brand-500)"
              maxBarSize={32}
            />
            <Line
              type="monotone"
              dataKey="Goal Target"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
