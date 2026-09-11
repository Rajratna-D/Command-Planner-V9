import { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { testsApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import { getSubjectConfig } from '../utils/subjectColors';
import type { Test } from '../types';
import { Plus, Trash2, Clock, CalendarDays } from 'lucide-react';

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const addToast = useAppStore((s) => s.addToast);
  // Subscribe to subjectConfigs for reactive update
  useAppStore((s) => s.subjectConfigs);

  const subjectRef = useRef<HTMLInputElement>(null);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formNote, setFormNote] = useState('');

  const load = useCallback(() => {
    testsApi.list()
      .then(setTests)
      .catch(() => addToast('Failed to load tests', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    const subject = subjectRef.current?.value.trim();
    if (!subject || !formDate) { addToast('Subject and date are required', 'error'); return; }
    try {
      await testsApi.create({ subject, date: formDate, time: formTime, note: formNote });
      addToast('Test scheduled', 'success');
      setModalOpen(false);
      setFormDate(''); setFormTime(''); setFormNote('');
      load();
    } catch { addToast('Failed to create test', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await testsApi.delete(id);
      addToast('Test removed', 'success');
      load();
    } catch { addToast('Failed to delete test', 'error'); }
  };

  const daysUntil = (d: string) => {
    const diff = new Date(d).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / 86400000);
  };

  const countdownLabel = (d: string) => {
    const days = daysUntil(d);
    if (days < 0) return 'Past';
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const countdownVariant = (d: string) => {
    const days = daysUntil(d);
    if (days <= 0) return 'danger' as const;
    if (days <= 3) return 'warning' as const;
    if (days <= 7) return 'brand' as const;
    return 'default' as const;
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Tests</h2>
          <p className="text-sm text-[var(--text-secondary)]">{tests.length} scheduled</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          Schedule Test
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3 stagger">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : tests.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">No tests scheduled. Enjoy the peace! 😌</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {tests.map((test) => {
            const days = daysUntil(test.date);
            const isPast = days < 0;
            const config = getSubjectConfig(test.subject);

            return (
              <Card key={test.id} hoverable className={`relative border-l-4 ${isPast ? 'opacity-60' : ''}`} style={{ borderLeftColor: config.color }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{config.icon}</span>
                      <h3 className="font-bold text-base text-[var(--text-primary)]">{test.subject}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} /> {test.date}
                      </span>
                      {test.time && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {test.time}
                        </span>
                      )}
                    </div>
                    {test.note && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-2 line-clamp-2">{test.note}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(test.id)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={countdownVariant(test.date)} dot>
                    {countdownLabel(test.date)}
                  </Badge>
                  {/* Progress bar for days remaining */}
                  {!isPast && days <= 30 && (
                    <div className="w-16 h-1.5 bg-[var(--bg-input)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-success-500 via-warning-500 to-danger-500 transition-all"
                        style={{ width: `${Math.max(5, 100 - (days / 30) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Test">
        <div className="space-y-4">
          <Input ref={subjectRef} label="Subject" placeholder="e.g. Mathematics" autoFocus />
          <Input label="Date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          <Input label="Time" type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
          <Input label="Note" placeholder="Chapters, room, etc." value={formNote} onChange={(e) => setFormNote(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
