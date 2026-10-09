import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Download, Printer, Calendar, Clock, BarChart3, 
  BookOpen, Layers
} from 'lucide-react';
import { productivityApi } from '../../api/client';
import { useAppStore } from '../../store/appStore';
import type { ProductivityHistoryResponse, HistoryPeriod } from '../../types';
import { formatStudyTime } from '../../utils/formatTime';

interface OverallProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverallProgressModal({ isOpen, onClose }: OverallProgressModalProps) {
  const [activeTab, setActiveTab] = useState<'weeks' | 'months'>('weeks');
  const [data, setData] = useState<ProductivityHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const addToast = useAppStore((s) => s.addToast);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      productivityApi.history()
        .then(setData)
        .catch(() => addToast('Failed to load historical progress data', 'error'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, addToast]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const periods: HistoryPeriod[] = useMemo(() => {
    if (!data) return [];
    return activeTab === 'weeks' ? data.weeks : data.months;
  }, [data, activeTab]);

  const aggregates = useMemo(() => {
    if (!periods.length) return null;
    const totalHours = periods.reduce((sum, p) => sum + p.total_hours, 0);
    const totalSessions = periods.reduce((sum, p) => sum + p.sessions, 0);
    const avgHitRate = Math.round(periods.reduce((sum, p) => sum + p.goal_hit_rate, 0) / periods.length);
    const bestPeriod = [...periods].sort((a, b) => b.total_hours - a.total_hours)[0];
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      totalSessions,
      avgHitRate,
      bestPeriodLabel: bestPeriod ? bestPeriod.label : '-',
      bestPeriodHours: bestPeriod ? bestPeriod.total_hours : 0,
    };
  }, [periods]);

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    if (!periods.length) return;
    const headers = [
      'Period', 'Start Date', 'End Date', 'Total Hours', 
      'Sessions', 'Days Worked', 'Goal Hit Rate (%)', 
      'Daily Avg Hours', 'Score', 'Grade', 'Top Subject'
    ];
    const rows = periods.map(p => [
      `"${p.label.replace(/"/g, '""')}"`,
      p.start_date,
      p.end_date,
      p.total_hours,
      p.sessions,
      p.days_worked,
      `${p.goal_hit_rate}%`,
      p.daily_avg_hours,
      p.score,
      p.grade,
      `"${(p.top_subject || 'N/A').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `command_planner_${activeTab}_progress_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`${activeTab === 'weeks' ? 'Weekly' : 'Monthly'} CSV report downloaded`, 'success');
  };

  const handlePrintReport = () => {
    if (!periods.length) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Popup blocker prevented opening print window', 'info');
      return;
    }

    const title = activeTab === 'weeks' ? 'Weekly Progress & Performance Report' : 'Monthly Progress & Performance Report';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
          .summary-grid { display: flex; gap: 16px; margin-bottom: 24px; }
          .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; flex: 1; }
          .stat-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
          .stat-val { font-size: 18px; font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th { text-align: left; padding: 8px 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
          tr:nth-child(even) { background: #fafafa; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px; }
          .grade-S, .grade-A, .grade-A-plus { background: #dcfce7; color: #15803d; }
          .grade-B { background: #dbeafe; color: #1d4ed8; }
          .grade-C { background: #fef3c7; color: #b45309; }
          .grade-D, .grade-Needs-Work { background: #fee2e2; color: #b91c1c; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">Generated from Command Planner • Date: ${new Date().toLocaleDateString()}</div>
        ${aggregates ? `
          <div class="summary-grid">
            <div class="stat-box">
              <div class="stat-title">Total Study Time</div>
              <div class="stat-val">${aggregates.totalHours} hrs</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Completed Sessions</div>
              <div class="stat-val">${aggregates.totalSessions}</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Avg Goal Hit Rate</div>
              <div class="stat-val">${aggregates.avgHitRate}%</div>
            </div>
            <div class="stat-box">
              <div class="stat-title">Best Period</div>
              <div class="stat-val">${aggregates.bestPeriodHours} hrs</div>
            </div>
          </div>
        ` : ''}
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>Date Range</th>
              <th>Study Time</th>
              <th>Sessions</th>
              <th>Days Worked</th>
              <th>Goal Hit Rate</th>
              <th>Daily Avg</th>
              <th>Grade</th>
              <th>Top Subject</th>
            </tr>
          </thead>
          <tbody>
            ${periods.map(p => `
              <tr>
                <td><strong>${p.label}</strong></td>
                <td>${p.start_date} to ${p.end_date}</td>
                <td><strong>${p.total_hours} hrs</strong> (${Math.round(p.duration_min)}m)</td>
                <td>${p.sessions}</td>
                <td>${p.days_worked}</td>
                <td>${p.goal_hit_rate}%</td>
                <td>${p.daily_avg_hours}h/day</td>
                <td><span class="badge grade-${p.grade.replace('+', '-plus').replace(' ', '-')}">${p.grade}</span></td>
                <td>${p.top_subject || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getGradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'S':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'A':
        return 'bg-brand-500/15 text-brand-400 border-brand-500/30';
      case 'B':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'C':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)] bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <BarChart3 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Overall Progress & Historical Reports
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Finalized performance reports and analytics for completed calendar weeks and months
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] rounded-lg transition-colors"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Bar & Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-3.5 border-b border-[var(--border-default)] bg-[var(--bg-input)]/40">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)]">
            <button
              onClick={() => setActiveTab('weeks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'weeks'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calendar size={14} />
              <span>Weekly History</span>
              {data && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'weeks' ? 'bg-white/20' : 'bg-[var(--bg-input)]'}`}>
                  {data.weeks.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('months')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'months'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers size={14} />
              <span>Monthly History</span>
              {data && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'months' ? 'bg-white/20' : 'bg-[var(--bg-input)]'}`}>
                  {data.months.length}
                </span>
              )}
            </button>
          </div>

          {/* Download & Print Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              disabled={!periods.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors disabled:opacity-40"
              title="Download CSV table"
            >
              <Download size={14} className="text-brand-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrintReport}
              disabled={!periods.length}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-xs transition-colors disabled:opacity-40"
              title="Print or Save PDF report"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-xl" />
                ))}
              </div>
              <div className="skeleton h-64 rounded-xl" />
            </div>
          ) : !periods.length ? (
            <div className="py-16 text-center text-[var(--text-tertiary)] space-y-2">
              <Clock size={36} className="mx-auto opacity-40 text-brand-400" />
              <p className="text-sm font-medium">No completed periods yet</p>
              <p className="text-xs">Weekly and monthly reports finalize once each full week or month concludes.</p>
            </div>
          ) : (
            <>
              {/* Aggregates Banner */}
              {aggregates && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/60 border border-[var(--border-default)]">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                      Total Study Time
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-[var(--text-primary)]">{aggregates.totalHours}</span>
                      <span className="text-xs text-[var(--text-secondary)]">hrs</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/60 border border-[var(--border-default)]">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                      Total Sessions
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-[var(--text-primary)]">{aggregates.totalSessions}</span>
                      <span className="text-xs text-[var(--text-secondary)]">pomodoros</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/60 border border-[var(--border-default)]">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                      Avg Goal Hit Rate
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-brand-400">{aggregates.avgHitRate}%</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/60 border border-[var(--border-default)]">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                      Peak Performance
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-emerald-400">{aggregates.bestPeriodHours}</span>
                      <span className="text-xs text-[var(--text-secondary)]">hrs top</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Table */}
              <div className="border border-[var(--border-default)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-input)]/80 text-[var(--text-tertiary)] uppercase text-[10px] font-bold tracking-wider border-b border-[var(--border-default)]">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Date Range</th>
                        <th className="py-3 px-4">Study Time</th>
                        <th className="py-3 px-4">Sessions</th>
                        <th className="py-3 px-4">Days Active</th>
                        <th className="py-3 px-4">Goal Hit Rate</th>
                        <th className="py-3 px-4">Daily Avg</th>
                        <th className="py-3 px-4">Top Subject</th>
                        <th className="py-3 px-4 text-center">Score & Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-default)]">
                      {periods.map((p) => (
                        <tr 
                          key={p.key} 
                          className="hover:bg-[var(--bg-input)]/30 transition-colors"
                        >
                          {/* Period */}
                          <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                            {p.label}
                          </td>

                          {/* Date Range */}
                          <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                            {p.start_date} <span className="opacity-40">→</span> {p.end_date}
                          </td>

                          {/* Study Time */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-[var(--text-primary)]">
                              {p.total_hours}h
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
                              ({formatStudyTime(p.duration_min)})
                            </span>
                          </td>

                          {/* Sessions */}
                          <td className="py-3 px-4 text-[var(--text-secondary)] font-medium">
                            {p.sessions}
                          </td>

                          {/* Days Active */}
                          <td className="py-3 px-4 text-[var(--text-secondary)]">
                            <span className="font-semibold text-[var(--text-primary)]">{p.days_worked}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">
                              {activeTab === 'weeks' ? ' / 7 d' : ' days'}
                            </span>
                          </td>

                          {/* Goal Hit Rate */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    p.goal_hit_rate >= 80 
                                      ? 'bg-emerald-500' 
                                      : p.goal_hit_rate >= 60 
                                        ? 'bg-amber-500' 
                                        : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, p.goal_hit_rate)}%` }}
                                />
                              </div>
                              <span className={`font-semibold ${
                                p.goal_hit_rate >= 80 
                                  ? 'text-emerald-400' 
                                  : p.goal_hit_rate >= 60 
                                    ? 'text-amber-400' 
                                    : 'text-rose-400'
                              }`}>
                                {p.goal_hit_rate}%
                              </span>
                            </div>
                          </td>

                          {/* Daily Avg */}
                          <td className="py-3 px-4 text-[var(--text-secondary)] font-medium">
                            {p.daily_avg_hours}h / day
                          </td>

                          {/* Top Subject */}
                          <td className="py-3 px-4">
                            {p.top_subject ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[11px] font-medium">
                                <BookOpen size={11} />
                                {p.top_subject}
                              </span>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">—</span>
                            )}
                          </td>

                          {/* Score & Grade */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {p.score}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${getGradeBadgeClass(p.grade)}`}>
                                {p.grade}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--border-default)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)]">
          <span>Finalized records are calculated from verified Pomodoro focus sessions once each full week (Monday–Sunday) or calendar month concludes.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-input)]/80 text-[var(--text-primary)] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
