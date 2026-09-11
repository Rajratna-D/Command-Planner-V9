import { useEffect, useState } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { productivityApi } from '../../api/client';
import type { SpiderData } from '../../types';

export default function KiviatChart() {
  const [data, setData] = useState<SpiderData | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    productivityApi.spider()
      .then(setData)
      .catch(() => addToast('Failed to load spider chart data', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  if (loading) {
    return <div className="skeleton h-[300px] rounded-xl w-full" />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--text-tertiary)]">
        No radar data available.
      </div>
    );
  }

  const chartData = data.day_labels.map((label, idx) => ({
    day: label,
    'This Week': data.this_week[idx],
    'Last Week': data.last_week[idx],
    'Daily Goal': data.goal,
  }));

  const maxVal = Math.max(...data.this_week, ...data.last_week, data.goal, 4);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-md font-bold">Weekly Performance (Kiviat)</h3>
        <p className="text-xs text-[var(--text-secondary)]">Comparing daily focus hours vs last week</p>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="var(--border-default)" />
            <PolarAngleAxis
              dataKey="day"
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, maxVal]}
              stroke="var(--text-tertiary)"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }}
              tickFormatter={(v) => `${v}h`}
            />
            <Radar
              name="This Week"
              dataKey="This Week"
              stroke="var(--color-brand-500)"
              fill="var(--color-brand-500)"
              fillOpacity={0.3}
            />
            <Radar
              name="Last Week"
              dataKey="Last Week"
              stroke="var(--color-accent-500)"
              fill="var(--color-accent-500)"
              fillOpacity={0.15}
            />
            <Tooltip
              formatter={(val: unknown) => [`${typeof val === 'number' ? val.toFixed(1) : val} hrs`]}
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 11
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                color: 'var(--text-primary)'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
