import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { tasksApi, notesApi, assignmentsApi } from '../../api/client';
import type { Task, Note, Assignment, TabKey } from '../../types';
import { Search, Compass, CheckSquare, StickyNote, CornerDownLeft, FileText } from 'lucide-react';
import { navItems } from './navigation';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [activeIndex, setActiveIndex] = useState(0);

  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const addToast = useAppStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Toggle palette on Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch tasks, notes, and assignments on open
  useEffect(() => {
    if (open) {
      Promise.resolve().then(() => {
        setQuery('');
        setActiveIndex(0);
        tasksApi.list().then(setTasks).catch(() => {});
        notesApi.list().then(setNotes).catch(() => {});
        assignmentsApi.list().then(setAssignments).catch(() => {});
      });
      // Autofocus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Scroll active item into view (moved above conditional return)
  useEffect(() => {
    const activeElement = resultsRef.current?.children[activeIndex] as HTMLElement;
    if (activeElement) {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!open) return null;

  // Filter items
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Navigation items matching query
  const filteredNav = navItems.filter(
    (item) => item.label.toLowerCase().includes(normalizedQuery)
  );

  // 2. Tasks matching query (search: text, priority, tags)
  const filteredTasks = normalizedQuery
    ? tasks.filter((t) => 
        t.text.toLowerCase().includes(normalizedQuery) ||
        t.priority.toLowerCase().includes(normalizedQuery) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
      )
    : tasks.slice(0, 5);

  // 3. Notes matching query (search: title, body, subject, tags)
  const filteredNotes = normalizedQuery
    ? notes.filter((n) => 
        n.title.toLowerCase().includes(normalizedQuery) ||
        n.body.toLowerCase().includes(normalizedQuery) ||
        n.subject.toLowerCase().includes(normalizedQuery) ||
        (n.tags && n.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
      )
    : notes.slice(0, 5);

  // 4. Assignments matching query (search: title, subject, tags)
  const filteredAssignments = normalizedQuery
    ? assignments.filter((a) =>
        a.title.toLowerCase().includes(normalizedQuery) ||
        a.subject.toLowerCase().includes(normalizedQuery) ||
        (a.tags && a.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)))
      )
    : assignments.slice(0, 5);

  // Combine into single flat results list for index navigation
  const resultsList: Array<
    | { type: 'nav'; id: string; label: string; icon: React.ReactNode; tabKey: TabKey }
    | { type: 'task'; id: string; label: string; done: boolean }
    | { type: 'note'; id: string; label: string }
    | { type: 'assignment'; id: string; label: string; submitted: boolean }
  > = [
    ...filteredNav.map((n) => ({ type: 'nav' as const, id: n.key, label: n.label, icon: n.icon, tabKey: n.key })),
    ...filteredTasks.map((t) => ({ type: 'task' as const, id: t.id, label: t.text, done: t.done })),
    ...filteredNotes.map((n) => ({ type: 'note' as const, id: n.id, label: n.title })),
    ...filteredAssignments.map((a) => ({ type: 'assignment' as const, id: a.id, label: a.title, submitted: a.submitted })),
  ];

  const handleSelect = (item: typeof resultsList[number]) => {
    if (item.type === 'nav') {
      setActiveTab(item.tabKey);
      addToast(`Navigated to ${item.label}`, 'info');
    } else if (item.type === 'task') {
      setActiveTab('tasks');
      addToast(`Redirected to tasks list`, 'info');
    } else if (item.type === 'note') {
      setActiveTab('notes');
      addToast(`Redirected to notes view`, 'info');
    } else if (item.type === 'assignment') {
      setActiveTab('assignments');
      addToast(`Redirected to assignments list`, 'info');
    }
    setOpen(false);
  };

  // Keyboard navigation inside list
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((idx) => (idx + 1) % resultsList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((idx) => (idx - 1 + resultsList.length) % resultsList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (resultsList[activeIndex]) {
        handleSelect(resultsList[activeIndex]);
      }
    }
  };



  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/10 animate-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden flex flex-col max-h-[500px] glass-subtle rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-card-hover)]/30">
          <Search size={18} className="text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tabs, tasks, or notes... (Enter to go)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleListKeyDown}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border-none outline-none focus:ring-0"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 border border-[var(--border-default)] text-[var(--text-tertiary)] bg-[var(--bg-card)] rounded-md text-[10px] font-mono shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {resultsList.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-tertiary)]">
            No matching tabs, tasks, or notes found.
          </div>
        ) : (
          <div ref={resultsRef} className="flex-1 overflow-y-auto p-2 space-y-1">
            {resultsList.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all duration-100 cursor-pointer
                    ${isSelected 
                      ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20' 
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[var(--text-secondary)] shrink-0">
                      {item.type === 'nav' && (item.icon || <Compass size={16} />)}
                      {item.type === 'task' && <CheckSquare size={16} />}
                      {item.type === 'note' && <StickyNote size={16} />}
                      {item.type === 'assignment' && <FileText size={16} />}
                    </span>
                    <div className="min-w-0">
                      <p className={`font-semibold truncate ${item.type === 'task' && item.done ? 'line-through text-[var(--text-tertiary)]' : ''}`}>
                        {item.label}
                      </p>
                      <p className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mt-0.5">
                        {item.type === 'nav' ? 'Navigation' : item.type === 'task' ? 'Task' : item.type === 'note' ? 'Note' : 'Assignment'}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] text-brand-500 font-semibold bg-brand-500/5 px-2 py-0.5 rounded-md border border-brand-500/10">
                      <span>Go</span>
                      <CornerDownLeft size={10} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-default)] bg-[var(--bg-card-hover)]/30 flex items-center justify-between text-[10px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">
          <span>Use ↑↓ to navigate, Enter to select</span>
          <span>Ctrl + K to toggle</span>
        </div>
      </div>
    </div>
  );
}
