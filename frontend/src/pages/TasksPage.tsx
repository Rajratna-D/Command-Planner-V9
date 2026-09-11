import { useEffect, useState, useRef, useCallback, memo } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import AnimatedCheckbox from '../components/ui/AnimatedCheckbox';
import { Input, Select } from '../components/ui/Input';
import { tasksApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { Task, Priority, Recurrence } from '../types';
import {
  Plus, Trash2, RotateCcw, Calendar, Folder, ChevronDown, ChevronRight, GripVertical, FilterX, Pencil, Archive
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'Immediate', label: '🔴 Immediate' },
  { value: 'Important', label: '🟠 Important' },
  { value: '2nd Priority', label: '🔵 2nd Priority' },
  { value: '3rd Priority', label: '🟣 3rd Priority' },
  { value: 'Someday', label: '⚪ Someday' },
];

const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'None', label: 'None' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
];

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem = memo(function SortableItem({ id, children }: SortableItemProps) {
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
    <div ref={setNodeRef} style={style} className="relative flex items-center gap-1.5 w-full">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] rounded-lg transition-colors shrink-0"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
});

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>(() => {
    if (typeof window === 'undefined') return 'all';
    return (localStorage.getItem('cp-tasks-filter') as 'all' | 'active' | 'done') || 'all';
  });

  // Grouping states with localStorage persistence
  const [groupBy, setGroupBy] = useState<'none' | 'priority' | 'due'>(() => {
    if (typeof window === 'undefined') return 'none';
    return (localStorage.getItem('cp-tasks-group-by') as 'none' | 'priority' | 'due') || 'none';
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('cp-tasks-collapsed-groups');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const handleSetFilter = useCallback((f: 'all' | 'active' | 'done') => {
    setFilter(f);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp-tasks-filter', f);
    }
  }, []);

  const handleSetGroupBy = useCallback((g: 'none' | 'priority' | 'due') => {
    setGroupBy(g);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp-tasks-group-by', g);
    }
  }, []);

  // Filter by tag state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Edit Task modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('Someday');
  const [editDue, setEditDue] = useState('');
  const [editRecur, setEditRecur] = useState<Recurrence>('None');
  const [editTags, setEditTags] = useState('');

  const addToast = useAppStore((s) => s.addToast);

  const textRef = useRef<HTMLInputElement>(null);
  const [formPriority, setFormPriority] = useState<Priority>('Someday');
  const [formDue, setFormDue] = useState('');
  const [formRecur, setFormRecur] = useState<Recurrence>('None');
  const [formTags, setFormTags] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(() => {
    const done = filter === 'all' ? undefined : filter === 'done';
    tasksApi.list(done)
      .then(setTasks)
      .catch(() => addToast('Failed to load tasks', 'error'))
      .finally(() => setLoading(false));
  }, [filter, addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async () => {
    const text = textRef.current?.value.trim();
    if (!text) return;
    
    const tagsArr = formTags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      await tasksApi.create({
        text,
        priority: formPriority,
        due: formDue || null,
        recur: formRecur,
        tags: tagsArr
      });
      
      addToast('Task created', 'success');
      setModalOpen(false);
      setFormPriority('Someday');
      setFormDue('');
      setFormRecur('None');
      setFormTags('');
      load();
    } catch { addToast('Failed to create task', 'error'); }
  }, [formPriority, formDue, formRecur, formTags, addToast, load]);

  const handlePriorityChange = useCallback(async (taskId: string, newPriority: Priority) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );
    try {
      await tasksApi.update(taskId, { priority: newPriority });
      addToast(`Priority updated to ${newPriority}`, 'success');
    } catch {
      addToast('Failed to update priority', 'error');
      load();
    }
  }, [addToast, load]);

  const startEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setEditText(task.text);
    setEditPriority(task.priority);
    setEditDue(task.due || '');
    setEditRecur(task.recur);
    setEditTags(task.tags ? task.tags.join(', ') : '');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTask) return;
    const text = editText.trim();
    if (!text) return;

    const tagsArr = editTags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      await tasksApi.update(editingTask.id, {
        text,
        priority: editPriority,
        due: editDue || null,
        recur: editRecur,
        tags: tagsArr,
      });

      addToast('Task updated', 'success');
      setEditingTask(null);
      load();
    } catch {
      addToast('Failed to update task', 'error');
    }
  }, [editingTask, editText, editPriority, editDue, editRecur, editTags, addToast, load]);

  const toggleDone = useCallback(async (t: Task) => {
    try {
      await tasksApi.update(t.id, { done: !t.done });
      load();
    } catch { addToast('Failed to update task', 'error'); }
  }, [addToast, load]);

  const handleDelete = useCallback(async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;
    try {
      await tasksApi.delete(id);
      addToast('Task deleted', 'success', 'Undo', async () => {
        try {
          await tasksApi.create({
            text: taskToDelete.text,
            priority: taskToDelete.priority,
            due: taskToDelete.due,
            recur: taskToDelete.recur,
            tags: taskToDelete.tags
          });
          load();
          addToast('Task restored', 'success');
        } catch { addToast('Failed to restore task', 'error'); }
      });
      load();
    } catch { addToast('Failed to delete task', 'error'); }
  }, [tasks, addToast, load]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await tasksApi.archive(id);
      addToast('Task archived', 'success');
      load();
    } catch { addToast('Failed to archive task', 'error'); }
  }, [addToast, load]);

  const priorityVariant = useCallback((p: string) => {
    switch (p) {
      case 'Immediate': return 'danger' as const;
      case 'Important': return 'warning' as const;
      case '2nd Priority': return 'brand' as const;
      case '3rd Priority': return 'accent' as const;
      default: return 'default' as const;
    }
  }, []);

  const getTagColor = useCallback((tag: string) => {
    const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border-brand-100 dark:border-brand-500/20',
      'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400 border-accent-100 dark:border-accent-500/20',
      'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 border-success-100 dark:border-success-500/20',
      'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 border-warning-100 dark:border-warning-500/20',
      'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400 border-danger-100 dark:border-danger-500/20',
    ];
    return colors[hash % colors.length];
  }, []);

  const getDueDateGroup = useCallback((task: Task): string => {
    if (!task.due) return 'Someday / No Date';
    const todayStr = new Date().toISOString().split('T')[0];
    if (task.due < todayStr && !task.done) return 'Overdue';
    if (task.due === todayStr) return 'Today';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    if (task.due === tomorrowStr) return 'Tomorrow';
    
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];
    if (task.due <= endOfWeekStr) return 'This Week';
    
    return 'Later';
  }, []);

  const filteredTasks = selectedTag 
    ? tasks.filter((t) => t.tags && t.tags.includes(selectedTag))
    : tasks;

  const groups: Record<string, Task[]> = {};
  if (groupBy === 'none') {
    groups['All Tasks'] = filteredTasks;
  } else if (groupBy === 'priority') {
    groups['Immediate'] = [];
    groups['Important'] = [];
    groups['2nd Priority'] = [];
    groups['3rd Priority'] = [];
    groups['Someday'] = [];
    
    filteredTasks.forEach((t) => {
      const g = t.priority === '2nd Priority' ? '2nd Priority' : t.priority === '3rd Priority' ? '3rd Priority' : t.priority;
      if (groups[g]) groups[g].push(t);
      else groups[g] = [t];
    });
  } else if (groupBy === 'due') {
    groups['Overdue'] = [];
    groups['Today'] = [];
    groups['Tomorrow'] = [];
    groups['This Week'] = [];
    groups['Later'] = [];
    groups['Someday / No Date'] = [];

    filteredTasks.forEach((t) => {
      const g = getDueDateGroup(t);
      if (groups[g]) groups[g].push(t);
      else groups[g] = [t];
    });
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTasks((prevTasks) => {
        const oldIndex = prevTasks.findIndex((t) => t.id === active.id);
        const newIndex = prevTasks.findIndex((t) => t.id === over.id);
        return arrayMove(prevTasks, oldIndex, newIndex);
      });
      addToast('Tasks reordered locally', 'success');
    }
  }, [addToast]);

  const toggleGroupCollapse = useCallback((g: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [g]: !prev[g] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('cp-tasks-collapsed-groups', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (modalOpen) {
          handleCreate();
        } else if (editingTask) {
          handleSaveEdit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, editingTask, handleCreate, handleSaveEdit]);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[var(--border-default)] pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Tasks</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {tasks.filter((t) => !t.done).length} pending · {tasks.filter((t) => t.done).length} completed
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tag Filter Info */}
          {selectedTag && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold rounded-full">
              <span>Tag: #{selectedTag}</span>
              <button onClick={() => setSelectedTag(null)} className="cursor-pointer hover:text-brand-600">
                <FilterX size={13} />
              </button>
            </div>
          )}

          {/* Grouping Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] font-semibold flex items-center gap-1">
              <Folder size={14} /> Group:
            </span>
            <select
              value={groupBy}
              onChange={(e) => handleSetGroupBy(e.target.value as 'none' | 'priority' | 'due')}
              className="px-2.5 py-1.5 border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl text-xs font-semibold cursor-pointer"
            >
              <option value="none">Flat List</option>
              <option value="priority">Priority</option>
              <option value="due">Due Date</option>
            </select>
          </div>

          {/* Filters */}
          <div className="flex rounded-xl border border-[var(--border-default)] overflow-hidden text-xs font-semibold">
            {(['all', 'active', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleSetFilter(f)}
                className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${
                  filter === f
                    ? 'bg-brand-500 text-white'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)} className="!rounded-xl text-xs py-1.5 px-3">
            Add Task
          </Button>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3 stagger">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">No tasks yet. Create one!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {Object.keys(groups).map((groupName) => {
              const groupTasks = groups[groupName] || [];
              if (groupBy !== 'none' && groupTasks.length === 0) return null;
              
              const isCollapsed = !!collapsedGroups[groupName];

              return (
                <div key={groupName} className="space-y-3">
                  {/* Group Header */}
                  {groupBy !== 'none' && (
                    <button
                      onClick={() => toggleGroupCollapse(groupName)}
                      className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors w-full text-left"
                    >
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      <span className="capitalize">{groupName}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] rounded-full">
                        {groupTasks.length}
                      </span>
                    </button>
                  )}

                  {/* Group Body */}
                  {!isCollapsed && (
                    <div className="space-y-2 stagger">
                      <SortableContext items={groupTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                        {groupTasks.map((task) => (
                          <SortableItem key={task.id} id={task.id}>
                            <Card hoverable className="flex items-center gap-3 !py-3 w-full pr-4">
                              {/* Animated Checkbox */}
                              <AnimatedCheckbox
                                checked={task.done}
                                onChange={() => toggleDone(task)}
                              />

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${task.done ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                                  {task.text}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {task.due && (
                                    <span className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-semibold">
                                      <Calendar size={11} /> {task.due}
                                    </span>
                                  )}
                                  {task.recur !== 'None' && (
                                    <span className="flex items-center gap-1 text-[11px] text-accent-500 font-semibold">
                                      <RotateCcw size={11} /> {task.recur}
                                    </span>
                                  )}
                                  
                                  {/* Custom Tags */}
                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {task.tags.map((tag) => (
                                        <button
                                          key={tag}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTag(tag);
                                          }}
                                          className={`text-[10px] px-2 py-0.5 border rounded-full font-semibold cursor-pointer transition-all hover:brightness-95 ${getTagColor(tag)}`}
                                          title={`Filter by #${tag}`}
                                        >
                                          #{tag}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Interactive Quick Priority Switcher */}
                              <div className="relative shrink-0">
                                <Badge variant={priorityVariant(task.priority)} className="rounded-lg hover:scale-105 transition-transform cursor-pointer">
                                  {task.priority} ▾
                                </Badge>
                                <select
                                  value={task.priority}
                                  onChange={(e) => handlePriorityChange(task.id, e.target.value as Priority)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  title="Change priority"
                                >
                                  {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Edit Button */}
                              <button
                                onClick={() => startEditTask(task)}
                                className="p-1.5 text-[var(--text-tertiary)] hover:text-brand-500 transition-colors rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer shrink-0"
                                title="Edit Task"
                              >
                                <Pencil size={14} />
                              </button>

                              {/* Archive Button */}
                              <button
                                onClick={() => handleArchive(task.id)}
                                className="p-1.5 text-[var(--text-tertiary)] hover:text-accent-500 transition-colors rounded-lg hover:bg-accent-50 dark:hover:bg-accent-500/10 cursor-pointer shrink-0"
                                title="Archive Task"
                              >
                                <Archive size={14} />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 cursor-pointer shrink-0"
                                title="Delete Task"
                              >
                                <Trash2 size={15} />
                              </button>
                            </Card>
                          </SortableItem>
                        ))}
                      </SortableContext>
                    </div>
                  )}
                </div>
              );
            })}
          </DndContext>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Task">
        <div className="space-y-4">
          <Input ref={textRef} label="Task" placeholder="What needs to be done?" autoFocus />
          <Select
            label="Priority"
            options={PRIORITIES}
            value={formPriority}
            onChange={(e) => setFormPriority(e.target.value as Priority)}
          />
          <Input
            label="Due Date"
            type="date"
            value={formDue}
            onChange={(e) => setFormDue(e.target.value)}
          />
          <Select
            label="Recurrence"
            options={RECURRENCES}
            value={formRecur}
            onChange={(e) => setFormRecur(e.target.value as Recurrence)}
          />
          <Input
            label="Tags"
            placeholder="math, exam, revision (comma separated)"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Task</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
        <div className="space-y-4">
          <Input
            label="Task Text"
            placeholder="Task description..."
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
          />
          <Select
            label="Priority"
            options={PRIORITIES}
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value as Priority)}
          />
          <Input
            label="Due Date"
            type="date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
          />
          <Select
            label="Recurrence"
            options={RECURRENCES}
            value={editRecur}
            onChange={(e) => setEditRecur(e.target.value as Recurrence)}
          />
          <Input
            label="Tags"
            placeholder="math, exam, revision (comma separated)"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
