import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { productivityApi } from '../../api/client';
import type { SubjectBreakdownItem } from '../../types';
import { formatStudyTime } from '../../utils/formatTime';
import { BookOpen, Sparkles } from 'lucide-react';

export default function SubjectBreakdownChart() {
  const [data, setData] = useState<SubjectBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    productivityApi.subjectBreakdown()
      .then(setData)
      .catch(() => addToast('Failed to load subject breakdown', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  if (loading) {
    return <div className="skeleton h-[320px] rounded-xl w-full" />;
  }

  const totalMin = data.reduce((sum, item) => sum + item.duration_min, 0);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[350px]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-md font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen size={18} className="text-brand-500" />
            <span>Study Time by Subject</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">Subject allocation for tagged focus sessions</p>
        </div>
        {totalMin > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500">
            {formatStudyTime(totalMin)} total
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-[var(--bg-input)]/50 rounded-xl border border-dashed border-[var(--border-default)] my-auto">
          <div className="p-3 rounded-full bg-brand-500/10 text-brand-500 mb-2">
            <Sparkles size={22} />
          </div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Start Tracking by Subject</h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mt-1">
            Tag your upcoming focus sessions with a subject in the Pomodoro timer to see your visual study breakdown here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center my-auto pt-2">
          {/* Donut Chart */}
          <div className="w-full h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="duration_min"
                  nameKey="subject"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [formatStudyTime(Number(val) || 0), 'Study Time']}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">Subjects</span>
              <span className="text-xl font-extrabold text-[var(--text-primary)]">{data.length}</span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
            {data.map((item) => (
              <div key={item.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
                    <span className="text-[var(--text-primary)] truncate font-medium">{item.subject}</span>
                  </div>
                  <span className="text-[var(--text-secondary)] shrink-0 font-medium ml-2">
                    {formatStudyTime(item.duration_min)} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
