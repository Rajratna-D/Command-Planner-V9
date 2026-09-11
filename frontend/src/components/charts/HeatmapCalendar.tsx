
import { useEffect, useState, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { productivityApi, pomodoroApi } from '../../api/client';
import type { HeatmapDay, PomodoroSession } from '../../types';
import { formatStudyTime } from '../../utils/formatTime';
import { Calendar, X, Clock, Brain, Coffee } from 'lucide-react';
import Badge from '../ui/Badge';

export default function HeatmapCalendar() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null);

  const theme = useAppStore((s) => s.theme);
  const addToast = useAppStore((s) => s.addToast);
  const containerRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => [currentYear, currentYear - 1, currentYear - 2], [currentYear]);

  // Load heatmap data whenever selectedYear changes
  useEffect(() => {
    setLoading(true);
    productivityApi.heatmap(undefined, selectedYear)
      .then((res) => {
        setData(res);
      })
      .catch(() => addToast(`Failed to load ${selectedYear} heatmap data`, 'error'))
      .finally(() => setLoading(false));
  }, [selectedYear, addToast]);

// GitHub contribution colors based on active theme
  const getColors = () => {
    switch (theme) {
      case 'oled':
        return ['#18181b', '#0e4429', '#006d32', '#26a641', '#39d353'];
      case 'nord':
        return ['#2e3440', '#4c566a', '#81a1c1', '#88c0d0', '#8fbcbb'];
      case 'cyberpunk':
        return ['#1a0f2e', '#450657', '#8c005f', '#d2006b', '#ff007f'];
      case 'sepia':
        return ['#efe5d9', '#d7c7b7', '#b59e87', '#8e7058', '#5c3e21'];
      case 'sakura':
        return ['#ffeef1', '#ffd1dc', '#ffb7c5', '#ff92a9', '#e06d8a'];
      case 'forest':
        return ['#0f1c15', '#163825', '#22553b', '#307e54', '#4ade80'];
      case 'matcha':
        return ['#e8f0ea', '#a8d5b5', '#66b880', '#387c53', '#1e4b30'];
      case 'espresso':
        return ['#251b12', '#422817', '#733e1a', '#b45309', '#f59e0b'];
      case 'nebula':
        return ['#191130', '#3b1d6b', '#6b21a8', '#9333ea', '#c084fc'];
      case 'twilight':
        return ['#1f1b3d', '#4a1d48', '#881337', '#e11d48', '#fb7185'];
      case 'abyss':
        return ['#0e223c', '#07415e', '#0e7490', '#06b6d4', '#38bdf8'];
      case 'lavender':
        return ['#ede7f6', '#d8b4fe', '#c084fc', '#9333ea', '#7c3aed'];
      case 'monokai':
        return ['#272529', '#473c24', '#78601c', '#d6a72c', '#ffd866'];
      case 'dark':
        return ['#27272a', '#0e4429', '#006d32', '#26a641', '#39d353'];
      default: // light
        return ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    }
  };

  const colors = getColors();

  const getLevelColor = (hours: number, sessions: number) => {
    if (sessions <= 0 && hours <= 0) return colors[0];
    if (hours < 0.75 || sessions <= 1) return colors[1];
    if (hours < 2.0 || sessions <= 3) return colors[2];
    if (hours < 3.5 || sessions <= 5) return colors[3];
    return colors[4];
  };

  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Build full-year calendar grid for selectedYear (Jan 1 to Dec 31)
  const { columns, monthLabels, totalSessions, totalMinutes, activeDays } = useMemo(() => {
    const dataMap = new Map<string, HeatmapDay>();
    data.forEach((d) => dataMap.set(d.date, d));

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);

    const yearDays: HeatmapDay[] = [];
    const cur = new Date(startDate);

    let sessionSum = 0;
    let durationMinSum = 0;
    let activeDayCount = 0;

    while (cur <= endDate) {
      const dateStr = formatLocalDate(cur);
      const found = dataMap.get(dateStr);
      const dayObj: HeatmapDay = found || { date: dateStr, score: 0, sessions: 0, duration_min: 0, hours: 0 };
      
      const daySessions = dayObj.sessions || 0;
      const dayDuration = (dayObj.duration_min !== undefined && dayObj.duration_min > 0)
        ? dayObj.duration_min
        : (dayObj.hours ? Math.round(dayObj.hours * 60) : (daySessions > 0 ? daySessions * 25 : 0));
      
      if (daySessions > 0 || dayDuration > 0) {
        sessionSum += daySessions;
        durationMinSum += dayDuration;
        activeDayCount += 1;
      }
      yearDays.push(dayObj);
      cur.setDate(cur.getDate() + 1);
    }

    // Group into Sunday-to-Saturday columns
    const cols: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    const startDayOfWeek = startDate.getDay(); // 0 = Sunday
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ date: '', score: 0, sessions: -1, duration_min: 0, hours: 0 }); // Placeholder
    }

    yearDays.forEach((day) => {
      if (currentWeek.length === 7) {
        cols.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', score: 0, sessions: -1, duration_min: 0, hours: 0 });
      }
      cols.push(currentWeek);
    }

    // Generate month labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mLabels: { label: string; weekIndex: number }[] = [];
    let prevMonth = -1;

    cols.forEach((week, weekIdx) => {
      const validDay = week.find((d) => d.sessions !== -1 && d.date !== '');
      if (validDay) {
        const [, m] = validDay.date.split('-').map(Number);
        const monthIdx = m ? m - 1 : new Date(validDay.date).getMonth();
        if (monthIdx !== prevMonth) {
          mLabels.push({ label: monthNames[monthIdx], weekIndex: weekIdx });
          prevMonth = monthIdx;
        }
      }
    });

    return {
      columns: cols,
      monthLabels: mLabels,
      totalSessions: sessionSum,
      totalMinutes: durationMinSum,
      activeDays: activeDayCount,
    };
  }, [selectedYear, data]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return dateStr;
  };

  const handleMouseEnter = (day: HeatmapDay, event: React.MouseEvent<SVGRectElement>) => {
    if (day.sessions === -1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();

    if (container) {
      setHoveredDay({
        day,
        x: rect.left - container.left + rect.width / 2,
        y: rect.top - container.top - 40
      });
    }
  };

  const [inspectedDay, setInspectedDay] = useState<HeatmapDay | null>(null);
  const [daySessions, setDaySessions] = useState<PomodoroSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const handleCellClick = (day: HeatmapDay) => {
    if (day.sessions === -1 || !day.date) return;
    setInspectedDay(day);
    setLoadingSessions(true);
    pomodoroApi.log(day.date)
      .then((sessions) => setDaySessions(sessions))
      .catch(() => addToast('Failed to load session details for this date', 'error'))
      .finally(() => setLoadingSessions(false));
  };

  return (
    <div ref={containerRef} className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm overflow-hidden">
      {/* Header with GitHub-style Year Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 border-b border-[var(--border-default)] pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="text-brand-500" size={20} />
          <div>
            <h3 className="text-md font-bold text-[var(--text-primary)]">Focus Activity — {selectedYear}</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Time Studied: <span className="font-semibold text-brand-500">{formatStudyTime(totalMinutes)}</span> ({totalSessions} focus session{totalSessions !== 1 ? 's' : ''}) in {selectedYear}
            </p>
          </div>
        </div>

        {/* Year Selector Tabs */}
        <div className="flex rounded-xl border border-[var(--border-default)] overflow-hidden text-xs font-semibold">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                selectedYear === y
                  ? 'bg-brand-500 text-white font-bold'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-36 rounded-xl w-full" />
      ) : (
        <>
          {/* Grid container with horizontal scroll */}
          <div className="overflow-x-auto pb-2 min-h-[140px] select-none scrollbar-thin">
            <div className="min-w-[760px] relative">
              <svg width="760" height="135" className="mx-auto overflow-visible">
                {/* Month labels */}
                {monthLabels.map(({ label, weekIndex }, idx) => (
                  <text
                    key={idx}
                    x={30 + weekIndex * 13}
                    y="15"
                    className="text-[10px] fill-[var(--text-tertiary)] font-medium"
                  >
                    {label}
                  </text>
                ))}

                {/* Weekday labels */}
                <text x="0" y="41" className="text-[10px] fill-[var(--text-tertiary)] font-medium">Mon</text>
                <text x="0" y="67" className="text-[10px] fill-[var(--text-tertiary)] font-medium">Wed</text>
                <text x="0" y="93" className="text-[10px] fill-[var(--text-tertiary)] font-medium">Fri</text>

                {/* Grid Cells */}
                <g transform="translate(30, 25)">
                  {columns.map((week, weekIdx) => (
                    <g key={weekIdx} transform={`translate(${weekIdx * 13}, 0)`}>
                      {week.map((day, dayIdx) => {
                        if (day.sessions === -1) return null; // Skip placeholders
                        const dayHours = day.hours !== undefined ? day.hours : (day.duration_min ? day.duration_min / 60 : 0);
                        return (
                          <rect
                            key={dayIdx}
                            y={dayIdx * 13}
                            width="10"
                            height="10"
                            rx="2"
                            ry="2"
                            fill={getLevelColor(dayHours, day.sessions)}
                            className="transition-all duration-300 hover:stroke-[var(--text-primary)] hover:stroke-[1.5px] cursor-pointer"
                            onMouseEnter={(e) => handleMouseEnter(day, e)}
                            onMouseLeave={() => setHoveredDay(null)}
                            onClick={() => handleCellClick(day)}
                          />
                        );
                      })}
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>

          {/* Footer stats & legend */}
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-3 border-t border-[var(--border-default)] pt-3">
            <div className="flex items-center gap-2">
              <span>Active days: <span className="font-semibold text-[var(--text-primary)]">{activeDays}</span></span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--text-tertiary)] italic">Click any cell to view session details</span>
            </div>
            <div className="flex items-center gap-1.5 select-none">
              <span>Less</span>
              {colors.map((color, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </>
      )}

      {/* Tooltip Popup */}
      {hoveredDay && (
        <div
          className="absolute z-20 px-3.5 py-2.5 text-xs text-white bg-slate-900/95 backdrop-blur-md border border-slate-700/70 shadow-2xl rounded-xl pointer-events-none -translate-x-1/2 flex flex-col gap-1.5 whitespace-nowrap transition-opacity duration-200 min-w-[190px]"
          style={{ left: hoveredDay.x, top: hoveredDay.y }}
        >
          {hoveredDay.day.sessions === 0 && (hoveredDay.day.duration_min || 0) === 0 && (hoveredDay.day.hours || 0) === 0 ? (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-200">No study time recorded</span>
              <span className="text-[10px] text-slate-400 mt-0.5">0 sessions · 0 mins</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400 font-medium">Time Studied:</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {formatStudyTime(hoveredDay.day.duration_min || Math.round((hoveredDay.day.hours || 0) * 60) || ((hoveredDay.day.sessions || 0) * 25))}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">Focus Sessions:</span>
                <span className="font-semibold text-slate-200">
                  {hoveredDay.day.sessions} session{hoveredDay.day.sessions !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
          <span className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
            {formatDate(hoveredDay.day.date)} · <span className="text-brand-400">Click to view</span>
          </span>
        </div>
      )}

      {/* Day Session Inspector Modal */}
      {inspectedDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-4 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-default)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Calendar size={18} className="text-brand-500" />
                  <span>{formatDate(inspectedDay.date)}</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Time Studied: <span className="font-bold text-brand-500">{formatStudyTime(inspectedDay.duration_min || Math.round((inspectedDay.hours || 0) * 60) || (inspectedDay.sessions * 25))}</span> · {inspectedDay.sessions} focus session{inspectedDay.sessions !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setInspectedDay(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[150px]">
              {loadingSessions ? (
                <div className="space-y-2 py-4">
                  <div className="skeleton h-12 rounded-xl w-full" />
                  <div className="skeleton h-12 rounded-xl w-full" />
                </div>
              ) : daySessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-tertiary)]">
                  <Clock size={28} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No individual sessions logged for this day.</p>
                </div>
              ) : (
                daySessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] flex items-center justify-between gap-3 hover:border-brand-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${s.type === 'work' ? 'bg-brand-500/10 text-brand-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {s.type === 'work' ? <Brain size={16} /> : <Coffee size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {s.task || (s.type === 'work' ? 'Focus Session' : 'Break')}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5 mt-0.5">
                          <Clock size={11} />
                          <span>{s.time || '--:--'}</span>
                          <span>·</span>
                          <span className="font-semibold text-[var(--text-secondary)]">{s.duration_min} min</span>
                        </p>
                      </div>
                    </div>

                    <Badge variant={s.type === 'work' ? 'brand' : 'success'}>
                      {s.type === 'work' ? 'Focus' : 'Break'}
                    </Badge>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-[var(--border-default)]">
              <button
                onClick={() => setInspectedDay(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
