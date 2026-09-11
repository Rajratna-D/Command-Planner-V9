import { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { assignmentsApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import { getSubjectConfig } from '../utils/subjectColors';
import type { Assignment } from '../types';
import { Plus, Trash2, CheckCircle, Calendar, FilterX, Archive } from 'lucide-react';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');
  
  // Custom tag filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const addToast = useAppStore((s) => s.addToast);
  // Subscribe to subjectConfigs for reactive update
  useAppStore((s) => s.subjectConfigs);

  const subjectRef = useRef<HTMLInputElement>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formMarks, setFormMarks] = useState('');
  const [formTags, setFormTags] = useState('');

  const load = useCallback(() => {
    const submitted = filter === 'all' ? undefined : filter === 'submitted';
    assignmentsApi.list(submitted)
      .then(setAssignments)
      .catch(() => addToast('Failed to load assignments', 'error'))
      .finally(() => setLoading(false));
  }, [filter, addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async () => {
    const subject = subjectRef.current?.value.trim();
    if (!subject || !formTitle.trim()) { addToast('Subject and title are required', 'error'); return; }
    
    const tagsArr = formTags.split(',').map(t => t.trim()).filter(Boolean);

    try {
      await assignmentsApi.create({
        subject,
        title: formTitle,
        due: formDue,
        marks: formMarks,
        tags: tagsArr
      });
      
      addToast('Assignment added', 'success');
      setModalOpen(false);
      setFormTitle(''); setFormDue(''); setFormMarks(''); setFormTags('');
      load();
    } catch { addToast('Failed to create assignment', 'error'); }
  }, [formTitle, formDue, formMarks, formTags, addToast, load]);

  const handleSubmit = useCallback(async (id: string) => {
    try {
      await assignmentsApi.submit(id);
      addToast('Assignment submitted! 🎉', 'success');
      load();
    } catch { addToast('Failed to submit', 'error'); }
  }, [addToast, load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await assignmentsApi.delete(id);
      addToast('Assignment deleted', 'success');
      load();
    } catch { addToast('Failed to delete', 'error'); }
  }, [addToast, load]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await assignmentsApi.archive(id);
      addToast('Assignment archived', 'success');
      load();
    } catch { addToast('Failed to archive', 'error'); }
  }, [addToast, load]);

  // Prevent default save behavior and trigger save on Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (modalOpen) {
          handleCreate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, handleCreate]);

  // Tag color generator
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

  // Filter assignments by tag locally
  const filteredAssignments = selectedTag
    ? assignments.filter((a) => a.tags && a.tags.includes(selectedTag))
    : assignments;

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Assignments</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {assignments.filter((a) => !a.submitted).length} pending · {assignments.filter((a) => a.submitted).length} submitted
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Tag Filter Info */}
          {selectedTag && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold rounded-full">
              <span>Tag: {selectedTag}</span>
              <button onClick={() => setSelectedTag(null)} className="cursor-pointer hover:text-brand-600">
                <FilterX size={13} />
              </button>
            </div>
          )}

          {/* Filter */}
          <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden text-sm">
            {(['all', 'pending', 'submitted'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
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
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Add
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 stagger">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">No assignments found.</p>
        </Card>
      ) : (
        <div className="space-y-2 stagger">
          {filteredAssignments.map((a) => {
            const config = getSubjectConfig(a.subject);
            return (
            <Card key={a.id} hoverable className="flex items-center gap-4 !py-3 border-l-4" style={{ borderLeftColor: config.color }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium ${a.submitted ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                    {a.title}
                  </h3>
                  {a.submitted && <Badge variant="success">Submitted</Badge>}
                </div>
                <div className="flex items-center flex-wrap gap-2.5 mt-1.5 text-xs text-[var(--text-secondary)]">
                  <span
                    className="font-semibold text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-xs"
                    style={config.badgeStyle}
                  >
                    <span>{config.icon}</span>
                    <span>{a.subject}</span>
                  </span>
                  {a.due && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {a.due}
                    </span>
                  )}
                  {a.marks && <span>Marks: {a.marks}</span>}
                  
                  {/* Render Tags */}
                  {a.tags && a.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(tag);
                          }}
                          className={`text-[10px] px-2 py-0.5 border rounded-full font-semibold cursor-pointer transition-all hover:brightness-95 ${getTagColor(tag)}`}
                          title={`Filter by ${tag}`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                <div className="flex items-center gap-1.5">
                {!a.submitted && (
                  <Button size="sm" variant="secondary" icon={<CheckCircle size={14} />} onClick={() => handleSubmit(a.id)}>
                    Submit
                  </Button>
                )}
                <button
                  onClick={() => handleArchive(a.id)}
                  className="p-1.5 text-[var(--text-tertiary)] hover:text-accent-500 transition-colors rounded-lg hover:bg-accent-50 dark:hover:bg-accent-500/10 cursor-pointer"
                  title="Archive"
                >
                  <Archive size={15} />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Assignment">
        <div className="space-y-4">
          <Input ref={subjectRef} label="Subject" placeholder="e.g. Physics" autoFocus />
          <Input label="Title" placeholder="Assignment title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          <Input label="Due Date" type="date" value={formDue} onChange={(e) => setFormDue(e.target.value)} />
          <Input label="Marks" placeholder="e.g. 20" value={formMarks} onChange={(e) => setFormMarks(e.target.value)} />
          <Input
            label="Tags"
            placeholder="homework, lab, essay (comma separated)"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Add Assignment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
