import { useEffect, useState, useCallback } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import RadialProgress from '../components/ui/RadialProgress';
import HeatmapCalendar from '../components/charts/HeatmapCalendar';
import { analyticsApi, backupApi, tasksApi, syllabusApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import { getSubjectConfig } from '../utils/subjectColors';
import { formatStudyTime } from '../utils/formatTime';
import type { OverviewData } from '../types';
import {
  GraduationCap, CheckSquare, FileText, Beaker,
  BookOpen, Timer, Flame, ArrowRight, GripVertical, Settings, Eye, EyeOff
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
}

function SortableWidget({ id, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group w-full">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg shrink-0 z-10"
        title="Drag to rearrange widget"
      >
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskCompletionRate, setTaskCompletionRate] = useState(0);
  const [syllabusProgress, setSyllabusProgress] = useState(0);
  
  // Widget customization states
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('cp-dashboard-order');
    return stored ? JSON.parse(stored) : ['radial-progress', 'tests', 'tasks', 'assignments', 'practicals'];
  });
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('cp-dashboard-visibility');
    return stored ? JSON.parse(stored) : {
      'radial-progress': true,
      'tests': true,
      'tasks': true,
      'assignments': true,
      'practicals': true
    };
  });
  const [showConfig, setShowConfig] = useState(false);

  const triggerTabChange = useAppStore((s) => s.setActiveTab);
  const addToast = useAppStore((s) => s.addToast);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    try {
      const [overviewData, allTasks, syllabusList] = await Promise.all([
        analyticsApi.overview(),
        tasksApi.list(),
        syllabusApi.list(),
      ]);

      setData(overviewData);

      // Compute task completion rate
      if (allTasks.length > 0) {
        const completed = allTasks.filter((t) => t.done).length;
        setTaskCompletionRate((completed / allTasks.length) * 100);
      } else {
        setTaskCompletionRate(0);
      }

      // Compute syllabus progress
      let totalTopics = 0;
      let completedTopics = 0;
      syllabusList.forEach((subject) => {
        subject.topics.forEach((topic) => {
          totalTopics++;
          if (topic.done) completedTopics++;
        });
      });
      if (totalTopics > 0) {
        setSyllabusProgress((completedTopics / totalTopics) * 100);
      } else {
        setSyllabusProgress(0);
      }

    } catch {
      addToast('Failed to load overview data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchData();
    });

    // Auto-backup on launch (once per session)
    if (!sessionStorage.getItem('cp-backup-done')) {
      sessionStorage.setItem('cp-backup-done', 'true');
      backupApi.create().catch(() => {/* silent */});
    }
  }, [fetchData]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id as string);
      const newIndex = widgetOrder.indexOf(over.id as string);
      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      setWidgetOrder(newOrder);
      localStorage.setItem('cp-dashboard-order', JSON.stringify(newOrder));
      addToast('Dashboard layout updated', 'success');
    }
  };

  const toggleWidgetVisibility = (id: string) => {
    const next = { ...widgetVisibility, [id]: !widgetVisibility[id] };
    setWidgetVisibility(next);
    localStorage.setItem('cp-dashboard-visibility', JSON.stringify(next));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    { label: 'Tests Due', value: data.tests_due, icon: <GraduationCap size={20} />, color: 'text-danger-500', bg: 'bg-danger-50 [html[data-theme=dark]_&]:bg-danger-600/10', tab: 'tests' as const },
    { label: 'Tasks Pending', value: data.tasks_pending, icon: <CheckSquare size={20} />, color: 'text-brand-500', bg: 'bg-brand-50 [html[data-theme=dark]_&]:bg-brand-600/10', tab: 'tasks' as const },
    { label: 'Assignments', value: data.assignments_pending, icon: <FileText size={20} />, color: 'text-warning-500', bg: 'bg-warning-50 [html[data-theme=dark]_&]:bg-warning-600/10', tab: 'assignments' as const },
    { label: 'Practicals', value: data.practicals_pending, icon: <Beaker size={20} />, color: 'text-accent-500', bg: 'bg-accent-50 [html[data-theme=dark]_&]:bg-accent-600/10', tab: 'practicals' as const },
    { label: 'Subjects', value: data.subjects_count, icon: <BookOpen size={20} />, color: 'text-success-500', bg: 'bg-success-50 [html[data-theme=dark]_&]:bg-success-600/10', tab: 'syllabus' as const },
    { label: 'Time Studied Today', value: formatStudyTime(Math.round((data.focus_hours_today ?? 0) * 60)), icon: <Timer size={20} />, color: 'text-brand-500', bg: 'bg-brand-50 [html[data-theme=dark]_&]:bg-brand-600/10', tab: 'pomodoro' as const },
    { label: 'Streak', value: `${data.streak}d`, icon: <Flame size={20} />, color: 'text-warning-500', bg: 'bg-warning-50 [html[data-theme=dark]_&]:bg-warning-600/10', tab: 'productivity' as const },
  ];

  // Map widgets to elements
  const widgetElements: Record<string, React.ReactNode> = {
    'radial-progress': (
      <Card key="radial-progress" className="h-full">
        <h3 className="font-semibold text-sm mb-4 text-[var(--text-primary)]">Progress Overview</h3>
        <div className="flex flex-row justify-around items-center gap-4 py-2">
          <RadialProgress
            value={taskCompletionRate}
            label="Tasks Done"
            gradientColors={['#10b981', '#059669']}
          />
          <RadialProgress
            value={syllabusProgress}
            label="Syllabus Done"
            gradientColors={['#3b82f6', '#8b5cf6']}
          />
        </div>
      </Card>
    ),
    'tests': (
      <Card key="tests" className="h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Upcoming Tests</h3>
          <button onClick={() => triggerTabChange('tests')} className="text-xs text-brand-500 hover:underline cursor-pointer">View all</button>
        </div>
        {data.upcoming_tests.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-4">No upcoming tests 🎉</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {data.upcoming_tests.map((t) => {
              const config = getSubjectConfig(t.subject);
              return (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--bg-input)] border-l-4" style={{ borderLeftColor: config.color }}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{config.icon}</span>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.subject}</p>
                    </div>
                    {t.note && <p className="text-xs text-[var(--text-tertiary)]">{t.note}</p>}
                  </div>
                  <Badge variant={daysUntilVariant(t.date)}>
                    {formatCountdown(t.date)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    ),
    'tasks': (
      <Card key="tasks" className="h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Top Priority Tasks</h3>
          <button onClick={() => triggerTabChange('tasks')} className="text-xs text-brand-500 hover:underline cursor-pointer">View all</button>
        </div>
        {data.top_tasks.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-4">All tasks completed! ✅</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {data.top_tasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--bg-input)]">
                <p className="text-sm text-[var(--text-primary)] font-medium truncate pr-2">{t.text}</p>
                <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    ),
    'assignments': (
      <Card key="assignments" className="h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Pending Assignments</h3>
          <button onClick={() => triggerTabChange('assignments')} className="text-xs text-brand-500 hover:underline cursor-pointer">View all</button>
        </div>
        {data.upcoming_assignments.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-4">No pending assignments 📚</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {data.upcoming_assignments.map((a) => {
              const config = getSubjectConfig(a.subject);
              return (
                <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--bg-input)] border-l-4" style={{ borderLeftColor: config.color }}>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs">{config.icon}</span>
                      <p className="text-xs font-semibold" style={{ color: config.color }}>{a.subject}</p>
                    </div>
                  </div>
                  {a.due && <Badge variant="warning">{a.due}</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    ),
    'practicals': (
      <Card key="practicals" className="h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Pending Practicals</h3>
          <button onClick={() => triggerTabChange('practicals')} className="text-xs text-brand-500 hover:underline cursor-pointer">View all</button>
        </div>
        {data.pending_practicals.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] py-4">All practicals done! 🧪</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {data.pending_practicals.map((p) => {
              const config = getSubjectConfig(p.subject);
              return (
                <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--bg-input)] border-l-4" style={{ borderLeftColor: config.color }}>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{p.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs">{config.icon}</span>
                      <p className="text-xs font-semibold" style={{ color: config.color }}>{p.subject} — #{p.num}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${p.performed ? 'bg-success-500' : 'bg-[var(--border-strong)]'}`} title="Performed" />
                    <span className={`w-2 h-2 rounded-full ${p.writeup ? 'bg-success-500' : 'bg-[var(--border-strong)]'}`} title="Writeup" />
                    <span className={`w-2 h-2 rounded-full ${p.submitted ? 'bg-success-500' : 'bg-[var(--border-strong)]'}`} title="Submitted" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    ),
  };

  const visibleWidgets = widgetOrder.filter((id) => widgetVisibility[id]);

  return (
    <div className="space-y-6 animate-in">
      {/* Welcome & Customizer controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Good {getTimeGreeting()}!</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Here&apos;s your academic overview</p>
        </div>
        
        {/* Customize Widgets Button */}
        <div className="relative">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <Settings size={14} />
            <span>Customize Dashboard</span>
          </button>
          
          {/* Customizer Dropdown Popover */}
          {showConfig && (
            <div className="absolute right-0 mt-2 w-60 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-xl p-4 z-20 stagger animate-in">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Toggle Widgets</h4>
              <div className="flex flex-col gap-2">
                {Object.keys(widgetVisibility).map((id) => {
                  const label = id === 'radial-progress' ? '📊 Progress Analytics' : 
                                id === 'tests' ? '🎓 Upcoming Tests' : 
                                id === 'tasks' ? '✅ Top Priority Tasks' : 
                                id === 'assignments' ? '📚 Pending Assignments' : '🧪 Pending Practicals';
                  return (
                    <label key={id} className="flex items-center justify-between text-xs font-medium text-[var(--text-primary)] cursor-pointer py-1 hover:bg-[var(--bg-card-hover)] px-2 rounded-lg transition-colors">
                      <span>{label}</span>
                      <button
                        onClick={() => toggleWidgetVisibility(id)}
                        className={`p-1 rounded ${widgetVisibility[id] ? 'text-brand-500' : 'text-[var(--text-tertiary)]'}`}
                      >
                        {widgetVisibility[id] ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
        {stats.map((s) => (
          <Card
            key={s.label}
            hoverable
            className="cursor-pointer group relative"
            onClick={() => triggerTabChange(s.tab)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${s.bg}`}>
                <span className={s.color}>{s.icon}</span>
              </div>
              <ArrowRight size={14} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Focus Activity Heatmap */}
      <HeatmapCalendar />

      {/* Reorderable Dashboard Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {visibleWidgets.map((id) => (
              <SortableWidget key={id} id={id}>
                {widgetElements[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.ceil(diff / 86400000);
}

function formatCountdown(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d < 0) return 'Past';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `${d}d`;
}

function daysUntilVariant(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d <= 1) return 'danger' as const;
  if (d <= 3) return 'warning' as const;
  return 'brand' as const;
}

function priorityVariant(p: string) {
  switch (p) {
    case 'Immediate': return 'danger' as const;
    case 'Important': return 'warning' as const;
    case '2nd Priority': return 'brand' as const;
    case '3rd Priority': return 'accent' as const;
    default: return 'default' as const;
  }
}
