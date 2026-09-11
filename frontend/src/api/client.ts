/* ═══════════════════════════════════════════════════════════════════════════
   API Client — typed fetch functions for all backend endpoints.
   Uses Vite proxy: /api → http://localhost:8000
   ═══════════════════════════════════════════════════════════════════════════ */

import { useAppStore } from '../store/appStore';

const BASE = '/api';

async function syncOfflineQueue() {
  const queueStr = localStorage.getItem('cp-offline-queue');
  if (!queueStr) return;
  const queue = JSON.parse(queueStr);
  if (queue.length === 0) return;

  useAppStore.getState().addToast(`Syncing ${queue.length} offline changes...`, 'info');
  localStorage.removeItem('cp-offline-queue');

  let failCount = 0;
  for (const item of queue) {
    try {
      const res = await fetch(`${BASE}${item.path}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: item.body,
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (err) {
      console.error('Failed to sync offline item:', item, err);
      failCount++;
      // Re-queue item
      const currentQueue = JSON.parse(localStorage.getItem('cp-offline-queue') || '[]');
      currentQueue.push(item);
      localStorage.setItem('cp-offline-queue', JSON.stringify(currentQueue));
    }
  }

  if (failCount === 0) {
    useAppStore.getState().addToast('Offline changes synced successfully!', 'success');
    setTimeout(() => window.location.reload(), 1000);
  } else {
    useAppStore.getState().addToast(`${failCount} offline changes failed to sync. Will retry later.`, 'error');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue().catch(() => {});
  });
}

function invalidateCacheForPath(path: string) {
  if (typeof window === 'undefined') return;
  try {
    const parts = path.split('/').filter(Boolean);
    const prefix = parts[0];
    if (!prefix) return;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`cp-cache-/${prefix}`) || key.startsWith('cp-cache-/analytics') || key.startsWith('cp-cache-/productivity'))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method || 'GET';
  const isGet = method === 'GET';

  // Handling offline mode
  if (typeof window !== 'undefined' && !navigator.onLine) {
    if (isGet) {
      const raw = localStorage.getItem(`cp-cache-${path}`);
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          if (cached && typeof cached === 'object' && 'data' in cached && 'ts' in cached) {
            return cached.data as T;
          }
          return cached as T;
        } catch {
          // Corrupted cache entry
        }
      }
      throw new Error('Offline: Data not cached');
    } else {
      // Queue mutations
      const queue = JSON.parse(localStorage.getItem('cp-offline-queue') || '[]');
      queue.push({ path, method, body: options?.body });
      localStorage.setItem('cp-offline-queue', JSON.stringify(queue));

      useAppStore.getState().addToast('Offline: Changes queued. Syncing on reconnect.', 'info');
      return {} as T;
    }
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
  } catch (networkErr) {
    // Network failure fallback for GET with 5 min TTL
    if (isGet && typeof window !== 'undefined') {
      const raw = localStorage.getItem(`cp-cache-${path}`);
      if (raw) {
        try {
          const cached = JSON.parse(raw);
          const data = cached && typeof cached === 'object' && 'data' in cached ? cached.data : cached;
          const ts = cached && typeof cached === 'object' && 'ts' in cached ? cached.ts : 0;
          if (Date.now() - ts < 5 * 60 * 1000) {
            return data as T;
          }
        } catch {}
      }
    }
    throw networkErr;
  }

  if (res.status === 204) {
    if (!isGet) invalidateCacheForPath(path);
    return undefined as T;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }

  const result = await res.json();
  // Cache successful GET requests with timestamp
  if (isGet && typeof window !== 'undefined') {
    localStorage.setItem(`cp-cache-${path}`, JSON.stringify({ data: result, ts: Date.now() }));
  } else if (!isGet) {
    // Mutation succeeded: invalidate cached responses for this resource domain
    invalidateCacheForPath(path);
  }
  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ═══════════════════════════════════════════════════════════════════════════
// TYPED API
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Task, TaskCreate, TaskUpdate,
  Test, TestCreate,
  Assignment, AssignmentCreate, AssignmentUpdate,
  Practical, PracticalCreate,
  CheckList, ListCreate, ListItemCreate,
  Subject,
  PomodoroSession, PomodoroSessionCreate,
  Note, NoteCreate, NoteUpdate,
  SettingResponse,
  ProductivityScores, HeatmapDay, SpiderData, PeakHoursData,
  SubjectBreakdownItem, DailyTrendSummary, ProductivityBadge, ProductivityInsight,
  OverviewData, BackupInfo,
  ArchiveItem, ArchiveStats,
} from '../types';

// ── Tasks ──────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (done?: boolean) => get<Task[]>(`/tasks${done !== undefined ? `?done=${done}` : ''}`),
  create: (data: TaskCreate) => post<Task>('/tasks', data),
  update: (id: string, data: TaskUpdate) => patch<Task>(`/tasks/${id}`, data),
  delete: (id: string) => del<void>(`/tasks/${id}`),
  archive: (id: string) => patch<Task>(`/tasks/${id}/archive`),
};

// ── Tests ──────────────────────────────────────────────────────────────────
export const testsApi = {
  list: () => get<Test[]>('/tests'),
  create: (data: TestCreate) => post<Test>('/tests', data),
  delete: (id: string) => del<void>(`/tests/${id}`),
};

// ── Assignments ────────────────────────────────────────────────────────────
export const assignmentsApi = {
  list: (submitted?: boolean) => get<Assignment[]>(`/assignments${submitted !== undefined ? `?submitted=${submitted}` : ''}`),
  create: (data: AssignmentCreate) => post<Assignment>('/assignments', data),
  update: (id: string, data: AssignmentUpdate) => patch<Assignment>(`/assignments/${id}`, data),
  submit: (id: string) => patch<Assignment>(`/assignments/${id}/submit`),
  delete: (id: string) => del<void>(`/assignments/${id}`),
  archive: (id: string) => patch<Assignment>(`/assignments/${id}/archive`),
};

// ── Practicals ─────────────────────────────────────────────────────────────
export const practicalsApi = {
  list: (done?: boolean) => get<Practical[]>(`/practicals${done !== undefined ? `?done=${done}` : ''}`),
  create: (data: PracticalCreate) => post<Practical>('/practicals', data),
  toggleStage: (id: string, stage: 'performed' | 'writeup' | 'submitted') =>
    patch<Practical>(`/practicals/${id}/toggle/${stage}`),
  delete: (id: string) => del<void>(`/practicals/${id}`),
  archive: (id: string) => patch<Practical>(`/practicals/${id}/archive`),
};

// ── Lists ──────────────────────────────────────────────────────────────────
export const listsApi = {
  list: () => get<CheckList[]>('/lists'),
  create: (data: ListCreate) => post<CheckList>('/lists', data),
  delete: (id: string) => del<void>(`/lists/${id}`),
  addItem: (listId: string, data: ListItemCreate) => post<CheckList>(`/lists/${listId}/items`, data),
  updateItem: (listId: string, itemId: string, data: { text?: string; done?: boolean }) =>
    patch<CheckList>(`/lists/${listId}/items/${itemId}`, data),
  deleteItem: (listId: string, itemId: string) => del<void>(`/lists/${listId}/items/${itemId}`),
};

// ── Syllabus ───────────────────────────────────────────────────────────────
export const syllabusApi = {
  list: () => get<Subject[]>('/syllabus'),
  createSubject: (data: { name: string }) => post<Subject>('/syllabus', data),
  deleteSubject: (id: string) => del<void>(`/syllabus/${id}`),
  addTopic: (subjectId: string, data: { name: string }) =>
    post<Subject>(`/syllabus/${subjectId}/topics`, data),
  toggleTopic: (subjectId: string, topicId: string) =>
    patch<Subject>(`/syllabus/${subjectId}/topics/${topicId}`),
  updateTopic: (subjectId: string, topicId: string, data: { done?: boolean; in_progress?: boolean }) =>
    patch<Subject>(`/syllabus/${subjectId}/topics/${topicId}`, data),
  deleteTopic: (subjectId: string, topicId: string) =>
    del<void>(`/syllabus/${subjectId}/topics/${topicId}`),
};

// ── Pomodoro ───────────────────────────────────────────────────────────────
export const pomodoroApi = {
  log: (date?: string) => get<PomodoroSession[]>(`/pomodoro/log${date ? `?date=${date}` : ''}`),
  createSession: (data: PomodoroSessionCreate) => post<PomodoroSession>('/pomodoro/sessions', data),
};

// ── Notes ──────────────────────────────────────────────────────────────────
export const notesApi = {
  list: (q?: string) => get<Note[]>(`/notes${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  create: (data: NoteCreate) => post<Note>('/notes', data),
  update: (id: string, data: NoteUpdate) => patch<Note>(`/notes/${id}`, data),
  delete: (id: string) => del<void>(`/notes/${id}`),
  archive: (id: string) => patch<Note>(`/notes/${id}/archive`),
};

// ── Settings ───────────────────────────────────────────────────────────────
export const settingsApi = {
  list: () => get<SettingResponse[]>('/settings'),
  get: (key: string) => get<{ key: string; value: unknown }>(`/settings/${key}`),
  set: (key: string, value: string) => patch<SettingResponse>(`/settings/${key}`, { key, value }),
};

// ── Productivity ───────────────────────────────────────────────────────────
export const productivityApi = {
  scores: () => get<ProductivityScores>('/productivity/scores'),
  heatmap: (days?: number, year?: number) => {
    const params = new URLSearchParams();
    if (days !== undefined) params.append('days', String(days));
    if (year !== undefined) params.append('year', String(year));
    const query = params.toString();
    return get<HeatmapDay[]>(`/productivity/heatmap${query ? `?${query}` : ''}`);
  },
  spider: () => get<SpiderData>('/productivity/spider'),
  peakHours: () => get<PeakHoursData>('/productivity/peak-hours'),
  subjectBreakdown: () => get<SubjectBreakdownItem[]>('/productivity/subject-breakdown'),
  dailyTrend: (days?: number) => get<DailyTrendSummary>(`/productivity/daily-trend${days ? `?days=${days}` : ''}`),
  badges: () => get<ProductivityBadge[]>('/productivity/badges'),
  insights: () => get<ProductivityInsight[]>('/productivity/insights'),
};

// ── Analytics ──────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: () => get<OverviewData>('/analytics/overview'),
};

// ── Backup ─────────────────────────────────────────────────────────────────
export const backupApi = {
  list: () => get<BackupInfo[]>('/backup/list'),
  create: () => post<BackupInfo>('/backup/create', {}),
  restore: (filename: string) => post<{ message: string }>(`/backup/restore?filename=${encodeURIComponent(filename)}`, {}),
  wipe: () => post<{ message: string }>('/backup/wipe', {}),
};

// ── Archive ────────────────────────────────────────────────────────────────
export const archiveApi = {
  list: (itemType?: string) => get<ArchiveItem[]>(`/archive${itemType ? `?item_type=${itemType}` : ''}`),
  stats: () => get<ArchiveStats>('/archive/stats'),
  restore: (itemType: string, id: string) => patch<{ ok: boolean; message: string }>(`/archive/${itemType}/${id}/restore`),
  delete: (itemType: string, id: string) => del<{ ok: boolean; message: string }>(`/archive/${itemType}/${id}`),
  clear: (itemType?: string) => del<{ ok: boolean; deleted: number }>(`/archive${itemType ? `?item_type=${itemType}` : ''}`),
};
