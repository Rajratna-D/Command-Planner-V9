import { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { practicalsApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import { getSubjectConfig } from '../utils/subjectColors';
import type { Practical } from '../types';
import { Plus, Trash2, Archive } from 'lucide-react';

const STAGES = [
  { key: 'performed' as const, label: 'Performed', color: 'bg-brand-500' },
  { key: 'writeup' as const, label: 'Writeup', color: 'bg-accent-500' },
  { key: 'submitted' as const, label: 'Submitted', color: 'bg-success-500' },
];

export default function PracticalsPage() {
  const [practicals, setPracticals] = useState<Practical[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const addToast = useAppStore((s) => s.addToast);
  // Subscribe to subjectConfigs for reactive update
  useAppStore((s) => s.subjectConfigs);

  const subjectRef = useRef<HTMLInputElement>(null);
  const [formNum, setFormNum] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');

  const load = useCallback(() => {
    practicalsApi.list()
      .then(setPracticals)
      .catch(() => addToast('Failed to load practicals', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const subject = subjectRef.current?.value.trim();
    if (!subject || !formTitle.trim()) { addToast('Subject and title required', 'error'); return; }
    try {
      await practicalsApi.create({ subject, num: formNum, title: formTitle, date: formDate });
      addToast('Practical added', 'success');
      setModalOpen(false);
      setFormNum(''); setFormTitle(''); setFormDate('');
      load();
    } catch { addToast('Failed to create practical', 'error'); }
  };

  const toggleStage = async (id: string, stage: 'performed' | 'writeup' | 'submitted') => {
    try {
      await practicalsApi.toggleStage(id, stage);
      load();
    } catch { addToast('Failed to toggle stage', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await practicalsApi.delete(id);
      addToast('Practical deleted', 'success');
      load();
    } catch { addToast('Failed to delete', 'error'); }
  };

  const handleArchive = async (id: string) => {
    try {
      await practicalsApi.archive(id);
      addToast('Practical archived', 'success');
      load();
    } catch { addToast('Failed to archive', 'error'); }
  };

  const pendingCount = practicals.filter((p) => !p.done).length;

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Practicals</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {pendingCount} pending · {practicals.length - pendingCount} completed
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          Add Practical
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3 stagger">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : practicals.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">No practicals added yet.</p>
        </Card>
      ) : (
        <div className="space-y-2 stagger">
          {practicals.map((p) => {
            const config = getSubjectConfig(p.subject);
            return (
            <Card key={p.id} hoverable className={`border-l-4 ${p.done ? 'opacity-60' : ''}`} style={{ borderLeftColor: config.color }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{p.title}</h3>
                    {p.done && <Badge variant="success">Done</Badge>}
                  </div>
                  <div className="flex items-center gap-2.5 mt-1.5 text-xs text-[var(--text-secondary)] flex-wrap">
                    <span
                      className="font-semibold text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-xs"
                      style={config.badgeStyle}
                    >
                      <span>{config.icon}</span>
                      <span>{p.subject}</span>
                    </span>
                    {p.num && <span>#{p.num}</span>}
                    {p.date && <span>{p.date}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleArchive(p.id)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-accent-500 transition-colors rounded-lg hover:bg-accent-50 dark:hover:bg-accent-500/10 cursor-pointer"
                    title="Archive"
                  >
                    <Archive size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* 3-Stage Tracker */}
              <div className="flex items-center gap-2 mt-3">
                {STAGES.map((stage) => {
                  const active = p[stage.key];
                  return (
                    <button
                      key={stage.key}
                      onClick={() => toggleStage(p.id, stage.key)}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-xs font-medium
                        transition-all cursor-pointer border
                        ${active
                          ? `${stage.color} text-white border-transparent`
                          : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-brand-500/50'
                        }
                      `}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Practical">
        <div className="space-y-4">
          <Input ref={subjectRef} label="Subject" placeholder="e.g. Chemistry" autoFocus />
          <Input label="Practical #" placeholder="e.g. 1" value={formNum} onChange={(e) => setFormNum(e.target.value)} />
          <Input label="Title" placeholder="Practical title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
          <Input label="Date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Add Practical</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
