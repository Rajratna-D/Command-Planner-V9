import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { productivityApi } from '../../api/client';
import type { PeakHoursData } from '../../types';
import { formatStudyTime } from '../../utils/formatTime';
import { Sparkles, Clock } from 'lucide-react';

export default function PeakHoursChart() {
  const [data, setData] = useState<PeakHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    productivityApi.peakHours()
      .then((res) => setData(res as PeakHoursData))
      .catch(() => addToast('Failed to load peak hours data', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  if (loading) {
    return <div className="skeleton h-[300px] rounded-xl w-full" />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[300px] text-[var(--text-tertiary)]">
        No peak hours data available.
      </div>
    );
  }

  const chartData = data.hours.map((hour, idx) => {
    const mins = data.minutes ? data.minutes[idx] : (data.counts[idx] * 25);
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      'Study Hours': round(mins / 60.0, 1),
      'Focus Sessions': data.counts[idx],
      durationMin: mins,
    };
  });

  function round(val: number, dec: number) {
    const factor = Math.pow(10, dec);
    return Math.round(val * factor) / factor;
  }

  // Format tick labels to show every 4th hour
  const formatXAxis = (tickItem: string) => {
    const hr = parseInt(tickItem.split(':')[0]);
    if (hr % 4 === 0) return tickItem;
    return '';
  };

  const formatWindowHour = (h: number) => {
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${h12} ${ampm}`;
  };

  const peakStart = data.peak_window_start ?? 14;
  const peakEnd = data.peak_window_end ?? 17;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-md font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock size={18} className="text-brand-500" />
            <span>Focus Density by Hour</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">Hourly distribution of your completed deep work</p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 text-xs font-bold">
          <Sparkles size={13} />
          <span>Peak: {formatWindowHour(peakStart)} – {formatWindowHour(peakEnd)}</span>
        </div>
      </div>

      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis
              dataKey="hour"
              tickFormatter={formatXAxis}
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-2.5 text-xs text-white bg-slate-900/95 backdrop-blur-md border border-slate-700/70 shadow-xl rounded-xl">
                      <p className="font-bold text-slate-100 mb-1">{item.hour}</p>
                      <div className="flex items-center justify-between gap-3 text-emerald-400 font-semibold">
                        <span>Time Studied:</span>
                        <span>{formatStudyTime(item.durationMin)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-slate-400 mt-0.5">
                        <span>Focus Sessions:</span>
                        <span>{item['Focus Sessions']}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="Focus Sessions"
              stroke="var(--color-brand-500)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSessions)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

