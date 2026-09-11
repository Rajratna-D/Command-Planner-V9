import { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { syllabusApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import { getSubjectConfig } from '../utils/subjectColors';
import type { Subject, Topic } from '../types';
import { Plus, Trash2, Check, X, BookOpen, List, LayoutGrid } from 'lucide-react';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';

interface DraggableTopicProps {
  id: string;
  topic: Topic & { subjectName: string };
  subjectId: string;
  onDelete: (subjectId: string, topicId: string) => void;
}

function DraggableTopic({ id, topic, subjectId, onDelete }: DraggableTopicProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: {
      topic,
      subjectId
    }
  });

  const config = getSubjectConfig(topic.subjectName);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined,
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-brand-500 rounded-xl p-3 shadow-sm flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing group transition-all select-none border-l-4
        ${isDragging ? 'opacity-50 border-brand-500 scale-95' : ''}
      `}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">{config.icon}</span>
          <span
            className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md truncate border"
            style={config.badgeStyle}
          >
            {topic.subjectName}
          </span>
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{topic.name}</p>
      </div>
      <button
        onMouseDown={(e) => e.stopPropagation()} // Prevent drag start when clicking delete
        onClick={(e) => {
          e.stopPropagation();
          onDelete(subjectId, topic.id);
        }}
        className="p-1 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-danger-500 transition-all cursor-pointer rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

interface KanbanColumnProps {
  id: string;
  title: string;
  bgClass: string;
  count: number;
  children: React.ReactNode;
}

function KanbanColumn({ id, title, bgClass, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col flex-1 min-h-[400px] md:min-h-[500px] bg-[var(--bg-card)] border rounded-2xl p-4 transition-all
        ${isOver ? 'border-brand-500 ring-4 ring-brand-500/10 animate-pulse' : 'border-[var(--border-default)]'}
      `}
    >
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${bgClass}`} />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">{title}</h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 bg-[var(--bg-input)] rounded-full text-[var(--text-secondary)] font-bold border border-[var(--border-default)]">{count}</span>
      </div>
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[550px] pr-1">
        {children}
      </div>
    </div>
  );
}

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [topicInput, setTopicInput] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    return (localStorage.getItem('cp-syllabus-view-mode') as 'list' | 'kanban') || 'list';
  });

  const addToast = useAppStore((s) => s.addToast);
  // Subscribe to subjectConfigs so custom colors/icons update live
  useAppStore((s) => s.subjectConfigs);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    syllabusApi.list()
      .then(setSubjects)
      .catch(() => addToast('Failed to load syllabus', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleViewMode = useCallback((mode: 'list' | 'kanban') => {
    setViewMode(mode);
    localStorage.setItem('cp-syllabus-view-mode', mode);
  }, []);

  const createSubject = useCallback(async () => {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    try {
      await syllabusApi.createSubject({ name });
      addToast('Subject added', 'success');
      setModalOpen(false);
      load();
    } catch { addToast('Failed to create subject', 'error'); }
  }, [addToast, load]);

  const deleteSubject = useCallback(async (id: string) => {
    try {
      await syllabusApi.deleteSubject(id);
      addToast('Subject deleted', 'success');
      load();
    } catch { addToast('Failed to delete', 'error'); }
  }, [addToast, load]);

  const addTopic = useCallback(async (subjectId: string) => {
    const name = topicInput[subjectId]?.trim();
    if (!name) return;
    try {
      await syllabusApi.addTopic(subjectId, { name });
      setTopicInput((p) => ({ ...p, [subjectId]: '' }));
      load();
    } catch { addToast('Failed to add topic', 'error'); }
  }, [topicInput, addToast, load]);

  const toggleTopic = useCallback(async (subjectId: string, topicId: string) => {
    try {
      await syllabusApi.toggleTopic(subjectId, topicId);
      load();
    } catch { addToast('Failed to toggle topic', 'error'); }
  }, [addToast, load]);

  const deleteTopic = useCallback(async (subjectId: string, topicId: string) => {
    try {
      await syllabusApi.deleteTopic(subjectId, topicId);
      load();
    } catch { addToast('Failed to delete topic', 'error'); }
  }, [addToast, load]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { topic: Topic & { subjectName: string }; subjectId: string } | undefined;
    if (!activeData) return;

    const sourceColumn = activeData.topic.done
      ? 'done'
      : (activeData.topic.in_progress ? 'in_progress' : 'todo');
    const targetColumn = over.id;

    if (sourceColumn === targetColumn) return;

    const topicId = active.id as string;
    const subjectId = activeData.subjectId;

    let updateData: { done: boolean; in_progress: boolean };
    if (targetColumn === 'todo') {
      updateData = { done: false, in_progress: false };
    } else if (targetColumn === 'in_progress') {
      updateData = { done: false, in_progress: true };
    } else {
      updateData = { done: true, in_progress: false };
    }

    setSubjects(prevSubjects => {
      return prevSubjects.map(sub => {
        if (sub.id === subjectId) {
          return {
            ...sub,
            topics: sub.topics.map(t => {
              if (t.id === topicId) {
                return { ...t, ...updateData };
              }
              return t;
            })
          };
        }
        return sub;
      });
    });

    try {
      await syllabusApi.updateTopic(subjectId, topicId, updateData);
      addToast('Topic status updated', 'success');
      load();
    } catch {
      addToast('Failed to update topic status', 'error');
      load();
    }
  }, [addToast, load]);

  // Total progress
  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.length, 0);
  const doneTopics = subjects.reduce((acc, s) => acc + s.topics.filter((t) => t.done).length, 0);
  const totalPct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  // Flatten and group topics for Kanban view
  const allTopics = subjects.flatMap(sub =>
    sub.topics.map(t => ({
      ...t,
      subjectId: sub.id,
      subjectName: sub.name
    }))
  );

  const todoTopics = allTopics.filter(t => !t.done && !t.in_progress);
  const inProgressTopics = allTopics.filter(t => !t.done && t.in_progress);
  const doneTopicsList = allTopics.filter(t => t.done);

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Syllabus Tracker</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {subjects.length} subjects · {doneTopics}/{totalTopics} topics completed ({totalPct}%)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-[var(--bg-input)] p-0.5 rounded-xl border border-[var(--border-default)] mr-1">
            <button
              onClick={() => handleToggleViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'list' ? 'bg-[var(--bg-card)] text-brand-500 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="List View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => handleToggleViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'kanban' ? 'bg-[var(--bg-card)] text-brand-500 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Kanban Board"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Add Subject
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      {totalTopics > 0 && (
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <BookOpen size={18} className="text-brand-500 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Overall Progress</span>
                <span className="text-xs font-bold text-brand-500">{totalPct}%</span>
              </div>
              <div className="w-full h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500"
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4 stagger">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : subjects.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">No subjects added yet. Start tracking your syllabus!</p>
        </Card>
      ) : viewMode === 'kanban' ? (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <KanbanColumn id="todo" title="Todo" bgClass="bg-[var(--color-brand-500)]" count={todoTopics.length}>
              {todoTopics.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 text-center text-[var(--text-tertiary)]">
                  <p className="text-xs">No topics to do</p>
                </div>
              ) : (
                todoTopics.map(t => (
                  <DraggableTopic key={t.id} id={t.id} topic={t} subjectId={t.subjectId} onDelete={deleteTopic} />
                ))
              )}
            </KanbanColumn>

            <KanbanColumn id="in_progress" title="In Progress" bgClass="bg-warning-500" count={inProgressTopics.length}>
              {inProgressTopics.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 text-center text-[var(--text-tertiary)]">
                  <p className="text-xs">Drag topics here to start</p>
                </div>
              ) : (
                inProgressTopics.map(t => (
                  <DraggableTopic key={t.id} id={t.id} topic={t} subjectId={t.subjectId} onDelete={deleteTopic} />
                ))
              )}
            </KanbanColumn>

            <KanbanColumn id="done" title="Completed" bgClass="bg-success-500" count={doneTopicsList.length}>
              {doneTopicsList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-default)] rounded-xl p-8 text-center text-[var(--text-tertiary)]">
                  <p className="text-xs">No completed topics yet</p>
                </div>
              ) : (
                doneTopicsList.map(t => (
                  <DraggableTopic key={t.id} id={t.id} topic={t} subjectId={t.subjectId} onDelete={deleteTopic} />
                ))
              )}
            </KanbanColumn>
          </div>
        </DndContext>
      ) : (
        <div className="space-y-4 stagger">
          {subjects.map((subject) => {
            const done = subject.topics.filter((t) => t.done).length;
            const total = subject.topics.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const config = getSubjectConfig(subject.name);

            return (
              <Card key={subject.id} className="relative overflow-hidden transition-all border-l-4" style={{ borderLeftColor: config.color }}>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border"
                      style={{
                        backgroundColor: `${config.color}15`,
                        borderColor: `${config.color}35`,
                      }}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[var(--text-primary)]">{subject.name}</h3>
                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs"
                          style={config.badgeStyle}
                        >
                          {done}/{total} topics · {pct}%
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {total - done} topics remaining
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSubject(subject.id)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Subject Progress */}
                {total > 0 && (
                  <div className="w-full h-2 bg-[var(--bg-input)] rounded-full mb-3.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: config.color,
                      }}
                    />
                  </div>
                )}

                {/* Topics */}
                <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {subject.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[var(--bg-input)] group transition-colors"
                    >
                      <button
                        onClick={() => toggleTopic(subject.id, topic.id)}
                        className={`
                          w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                          transition-all cursor-pointer
                          ${topic.done
                            ? 'text-white shadow-xs'
                            : 'border-[var(--border-strong)] hover:border-brand-500'
                          }
                        `}
                        style={topic.done ? { backgroundColor: config.color, borderColor: config.color } : {}}
                      >
                        {topic.done && <Check size={10} strokeWidth={3} />}
                      </button>
                      <span className={`text-sm flex-1 ${topic.done ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                        {topic.name}
                      </span>
                      <button
                        onClick={() => deleteTopic(subject.id, topic.id)}
                        className="p-0.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-danger-500 transition-all cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add topic */}
                <div className="flex gap-2 mt-3.5 pt-2 border-t border-[var(--border-default)]">
                  <input
                    type="text"
                    placeholder="Add topic..."
                    value={topicInput[subject.id] || ''}
                    onChange={(e) => setTopicInput((p) => ({ ...p, [subject.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addTopic(subject.id)}
                    className="flex-1 px-2.5 py-1.5 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-ring"
                  />
                  <Button size="sm" onClick={() => addTopic(subject.id)} icon={<Plus size={14} />}>
                    Add
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Subject">
        <div className="space-y-4">
          <Input ref={nameRef} label="Subject Name" placeholder="e.g. Mathematics" autoFocus />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={createSubject}>Add Subject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
