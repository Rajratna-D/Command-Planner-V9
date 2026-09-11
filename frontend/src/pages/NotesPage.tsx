import { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { notesApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { Note } from '../types';
import { Plus, Trash2, Search, Edit3, Save, FilterX, Archive } from 'lucide-react';

function renderMarkdown(md: string) {
  if (!md) return '';
  // Sanitize HTML inputs first to prevent XSS
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (# Header)
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-lg font-extrabold text-[var(--text-primary)] mt-3 mb-2">$1</h1>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-md font-bold text-[var(--text-primary)] mt-2.5 mb-1.5">$1</h2>');
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold text-[var(--text-primary)] mt-2 mb-1">$1</h3>');

  // Checkboxes ([x] or [ ])
  html = html.replace(/^\s*\[x\]\s*(.*?)$/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="accent-brand-500 rounded text-xs" /> <span class="line-through text-[var(--text-secondary)]">$1</span></div>');
  html = html.replace(/^\s*\[ \]\s*(.*?)$/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="rounded text-xs" /> <span>$1</span></div>');

  // Bullet lists (- item)
  html = html.replace(/^[-*+]\s+(.*?)$/gm, '<li class="list-disc ml-5 my-0.5 text-[var(--text-secondary)]">$1</li>');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-[var(--text-primary)]">$1</strong>');

  // Italics (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-[var(--text-secondary)]">$1</em>');

  // Newlines
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    if (line.trim().startsWith('<h') || line.trim().startsWith('<li') || line.trim().startsWith('<div')) {
      return line;
    }
    return line ? `${line}<br/>` : '<div class="h-2"></div>';
  });
  return processedLines.join('\n');
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Custom tag filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const addToast = useAppStore((s) => s.addToast);

  // Form
  const titleRef = useRef<HTMLInputElement>(null);
  const [formSubject, setFormSubject] = useState('General');
  const [formBody, setFormBody] = useState('');
  const [formTags, setFormTags] = useState('');

  const load = useCallback(() => {
    notesApi.list(search || undefined)
      .then(setNotes)
      .catch(() => addToast('Failed to load notes', 'error'))
      .finally(() => setLoading(false));
  }, [search, addToast]);

  useEffect(() => {
    const timer = setTimeout(load, 300); // debounce search
    return () => clearTimeout(timer);
  }, [load]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormSubject('General');
    setFormBody('');
    setFormTags('');
    setIsPreviewMode(false);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((note: Note) => {
    setEditingId(note.id);
    setFormSubject(note.subject);
    setFormBody(note.body);
    setFormTags(note.tags ? note.tags.join(', ') : '');
    setIsPreviewMode(false);
    setModalOpen(true);
    // Set title after modal opens
    setTimeout(() => {
      if (titleRef.current) titleRef.current.value = note.title;
    }, 50);
  }, []);

  const handleSave = useCallback(async () => {
    const title = titleRef.current?.value.trim() || 'Untitled';
    const tagsArr = formTags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      if (editingId) {
        await notesApi.update(editingId, {
          title,
          subject: formSubject,
          body: formBody,
          tags: tagsArr
        });
        addToast('Note updated', 'success');
      } else {
        await notesApi.create({
          title,
          subject: formSubject,
          body: formBody,
          tags: tagsArr
        });
        addToast('Note created', 'success');
      }
      setModalOpen(false);
      setEditingId(null);
      load();
    } catch { addToast('Failed to save note', 'error'); }
  }, [formSubject, formBody, formTags, editingId, addToast, load]);

  // Notes Page Specific Keyboard Shortcuts (Ctrl+N, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openCreate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (modalOpen) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, openCreate, handleSave]);

  const handleDelete = useCallback(async (id: string) => {
    const noteToDelete = notes.find((n) => n.id === id);
    if (!noteToDelete) return;
    try {
      await notesApi.delete(id);
      addToast('Note deleted', 'success', 'Undo', async () => {
        try {
          await notesApi.create({
            title: noteToDelete.title,
            subject: noteToDelete.subject,
            body: noteToDelete.body,
            tags: noteToDelete.tags
          });
          load();
          addToast('Note restored', 'success');
        } catch { addToast('Failed to restore note', 'error'); }
      });
      load();
    } catch { addToast('Failed to delete', 'error'); }
  }, [notes, addToast, load]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await notesApi.archive(id);
      addToast('Note archived', 'success');
      load();
    } catch { addToast('Failed to archive', 'error'); }
  }, [addToast, load]);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  // Tag color generator
  const getTagColor = (tag: string) => {
    const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 border-brand-100 dark:border-brand-500/20',
      'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-400 border-accent-100 dark:border-accent-500/20',
      'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400 border-success-100 dark:border-success-500/20',
      'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 border-warning-100 dark:border-warning-500/20',
      'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400 border-danger-100 dark:border-danger-500/20',
    ];
    return colors[hash % colors.length];
  };

  // Filter notes by tag locally
  const filteredNotes = selectedTag
    ? notes.filter((n) => n.tags && n.tags.includes(selectedTag))
    : notes;

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Notes</h2>
          <p className="text-sm text-[var(--text-secondary)]">{notes.length} notes</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tag Filter Info */}
          {selectedTag && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold rounded-full">
              <span>Tag: {selectedTag}</span>
              <button onClick={() => setSelectedTag(null)} className="cursor-pointer hover:text-brand-600">
                <FilterX size={13} />
              </button>
            </div>
          )}

          <Button icon={<Plus size={16} />} onClick={openCreate}>
            New Note
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-ring"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">
            {search || selectedTag ? 'No notes match your search/tag filter.' : 'No notes yet. Create one!'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {filteredNotes.map((note) => (
            <Card key={note.id} hoverable className="flex flex-col cursor-pointer group" onClick={() => openEdit(note)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-1">{note.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(note); }}
                    className="p-1 text-[var(--text-tertiary)] hover:text-brand-500 transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleArchive(note.id); }}
                    className="p-1 text-[var(--text-tertiary)] hover:text-accent-500 transition-colors cursor-pointer"
                    title="Archive"
                  >
                    <Archive size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                    className="p-1 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <Badge variant="accent" className="self-start mb-2">{note.subject}</Badge>
              <p className="text-xs text-[var(--text-secondary)] flex-1 line-clamp-4 whitespace-pre-wrap">
                {note.body || 'Empty note...'}
              </p>
              
              {/* Custom Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                  {note.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTag(tag);
                      }}
                      className={`text-[9px] px-2 py-0.5 border rounded-full font-semibold cursor-pointer transition-all hover:brightness-95 ${getTagColor(tag)}`}
                      title={`Filter by ${tag}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
              
              <p className="text-[10px] text-[var(--text-tertiary)] mt-3">{formatDate(note.updated_at)}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Note' : 'New Note'} width="lg">
        <div className="space-y-4">
          <Input ref={titleRef} label="Title" placeholder="Note title" autoFocus />
          <Input label="Subject" placeholder="e.g. Physics" value={formSubject} onChange={(e) => setFormSubject(e.target.value)} />
          <Input
            label="Tags"
            placeholder="exam, notes, research (comma separated)"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Content</label>
              <div className="flex bg-[var(--bg-input)] p-0.5 rounded-lg border border-[var(--border-default)]">
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${!isPreviewMode ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${isPreviewMode ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {isPreviewMode ? (
              <div
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-input)] border border-[var(--border-default)] min-h-[200px] max-h-[300px] overflow-y-auto text-[var(--text-primary)] leading-relaxed select-text"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(formBody) }}
              />
            ) : (
              <Textarea
                placeholder="Write your note... (supports markdown # Header, **bold**, - list, [ ] checkbox)"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={8}
                className="!mt-0"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button icon={<Save size={14} />} onClick={handleSave}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
