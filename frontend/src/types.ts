/* ═══════════════════════════════════════════════════════════════════════════
   TypeScript types — mirrors backend Pydantic schemas
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Tasks ──────────────────────────────────────────────────────────────────
export interface Task {
  id: string;
  text: string;
  priority: Priority;
  due: string | null;
  done: boolean;
  recur: Recurrence;
  spawned: boolean;
  added_at: string;
  tags?: string[];
  archived: boolean;
}
export type Priority = 'Immediate' | 'Important' | '2nd Priority' | '3rd Priority' | 'Someday';
export type Recurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly';

export interface TaskCreate {
  text: string;
  priority?: Priority;
  due?: string | null;
  recur?: Recurrence;
  tags?: string[];
}
export interface TaskUpdate {
  text?: string;
  priority?: Priority;
  due?: string | null;
  done?: boolean;
  recur?: Recurrence;
  tags?: string[];
}

// ── Tests ──────────────────────────────────────────────────────────────────
export interface Test {
  id: string;
  subject: string;
  date: string;
  time: string;
  note: string;
  created_at: string;
}
export interface TestCreate {
  subject: string;
  date: string;
  time?: string;
  note?: string;
}

// ── Assignments ────────────────────────────────────────────────────────────
export interface Assignment {
  id: string;
  subject: string;
  title: string;
  due: string;
  marks: string;
  submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  tags?: string[];
  archived: boolean;
}
export interface AssignmentCreate {
  subject: string;
  title: string;
  due?: string;
  marks?: string;
  tags?: string[];
}
export interface AssignmentUpdate {
  subject?: string;
  title?: string;
  due?: string;
  marks?: string;
  submitted?: boolean;
  tags?: string[];
}

// ── Practicals ─────────────────────────────────────────────────────────────
export interface Practical {
  id: string;
  subject: string;
  num: string;
  title: string;
  date: string;
  performed: boolean;
  writeup: boolean;
  submitted: boolean;
  done: boolean;
  created_at: string;
  archived: boolean;
}
export interface PracticalCreate {
  subject: string;
  num?: string;
  title: string;
  date?: string;
}

// ── Lists ──────────────────────────────────────────────────────────────────
export interface ListItem {
  id: string;
  text: string;
  done: boolean;
}
export interface CheckList {
  id: string;
  name: string;
  items: ListItem[];
}
export interface ListCreate {
  name: string;
}
export interface ListItemCreate {
  text: string;
}

// ── Syllabus ───────────────────────────────────────────────────────────────
export interface Topic {
  id: string;
  name: string;
  done: boolean;
  in_progress?: boolean;
}
export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

// ── Pomodoro ───────────────────────────────────────────────────────────────
export interface PomodoroSession {
  id: string;
  date: string;
  time: string;
  type: 'work' | 'short_break' | 'long_break';
  task: string;
  duration_min: number;
  created_at: string;
}
export interface PomodoroSessionCreate {
  date: string;
  time?: string;
  type?: string;
  task?: string;
  duration_min?: number;
  start_time?: string;  // HH:MM — session start time for midnight-split detection
}

// ── Notes ──────────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  title: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  archived: boolean;
}
export interface NoteCreate {
  title?: string;
  subject?: string;
  body?: string;
  tags?: string[];
}
export interface NoteUpdate {
  title?: string;
  subject?: string;
  body?: string;
  tags?: string[];
}

// ── Settings ───────────────────────────────────────────────────────────────
export interface SettingResponse {
  key: string;
  value: string;
}

// ── Productivity / Analytics ───────────────────────────────────────────────
export interface ScoreCard {
  period: string;
  score: number;
  sessions: number;
  duration_min?: number;
  hours?: number;
  grade: string;
}
export interface ProductivityScores {
  today: ScoreCard;
  yesterday: ScoreCard;
  week: ScoreCard;
  month: ScoreCard;
  streak: number;
  daily_goal: number;
}
export interface HeatmapDay {
  date: string;
  score: number;
  sessions: number;
  duration_min?: number;
  hours?: number;
}
export interface SpiderData {
  day_labels: string[];
  this_week: number[];
  last_week: number[];
  goal: number;
  this_week_sessions?: number[];
  last_week_sessions?: number[];
}
export interface OverviewData {
  tests_due: number;
  tasks_pending: number;
  assignments_pending: number;
  practicals_pending: number;
  subjects_count: number;
  pomodoros_today: number;
  focus_hours_today?: number;
  streak: number;
  upcoming_tests: Test[];
  top_tasks: Task[];
  upcoming_assignments: Assignment[];
  pending_practicals: Practical[];
}
export interface BackupInfo {
  filename: string;
  created_at: string;
  size_bytes: number;
}
export interface PeakHoursData {
  hours: number[];
  counts: number[];
  minutes?: number[];
  peak_window_start?: number;
  peak_window_end?: number;
}

export interface SubjectBreakdownItem {
  subject: string;
  duration_min: number;
  hours: number;
  sessions: number;
  percentage: number;
  color: string;
}

export interface DailyTrendDay {
  date: string;
  day_name: string;
  hours: number;
  duration_min: number;
  sessions: number;
  goal_hours: number;
  goal_reached: boolean;
}

export interface DailyTrendSummary {
  days: DailyTrendDay[];
  goal_hit_rate: number;
  daily_avg_hours: number;
  best_day_date: string;
  best_day_hours: number;
  total_period_hours: number;
}

export interface ProductivityBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  progress: number;
  current_value: number;
  target_value: number;
  progress_label: string;
  unlocked_date?: string | null;
}

export interface ProductivityInsight {
  type: string;
  title: string;
  message: string;
  icon: string;
  category: string;
}

// ── Navigation ─────────────────────────────────────────────────────────────
export type TabKey =
  | 'overview'
  | 'tasks'
  | 'tests'
  | 'lists'
  | 'assignments'
  | 'practicals'
  | 'syllabus'
  | 'pomodoro'
  | 'notes'
  | 'productivity'
  | 'settings';

// ── Archive ───────────────────────────────────────────────────────────────
export interface ArchiveItem {
  id: string;
  item_type: 'task' | 'assignment' | 'note' | 'practical';
  title: string;
  subtitle: string;
  created_at: string | null;
}

export interface ArchiveStats {
  tasks: number;
  assignments: number;
  notes: number;
  practicals: number;
  total: number;
}
