import { useEffect, useState, useRef, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { listsApi } from '../api/client';
import { useAppStore } from '../store/appStore';
import type { CheckList } from '../types';
import { Plus, Trash2, Check, X, GripVertical } from 'lucide-react';
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

interface SortableListItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableListItem({ id, children }: SortableListItemProps) {
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
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 w-full group">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-card-hover)] rounded-md transition-colors shrink-0"
        title="Drag to prioritize"
      >
        <GripVertical size={13} />
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

export default function ListsPage() {
  const [lists, setLists] = useState<CheckList[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const addToast = useAppStore((s) => s.addToast);
  const nameRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(() => {
    listsApi.list()
      .then(setLists)
      .catch(() => addToast('Failed to load lists', 'error'))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const createList = async () => {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    try {
      await listsApi.create({ name });
      addToast('List created', 'success');
      setModalOpen(false);
      load();
    } catch { addToast('Failed to create list', 'error'); }
  };

  const deleteList = async (id: string) => {
    try {
      await listsApi.delete(id);
      addToast('List deleted', 'success');
      load();
    } catch { addToast('Failed to delete list', 'error'); }
  };

  const addItem = async (listId: string) => {
    const text = newItemText[listId]?.trim();
    if (!text) return;
    try {
      await listsApi.addItem(listId, { text });
      setNewItemText((p) => ({ ...p, [listId]: '' }));
      load();
    } catch { addToast('Failed to add item', 'error'); }
  };

  const toggleItem = async (listId: string, itemId: string, done: boolean) => {
    try {
      await listsApi.updateItem(listId, itemId, { done: !done });
      load();
    } catch { addToast('Failed to update item', 'error'); }
  };

  const deleteItem = async (listId: string, itemId: string) => {
    try {
      await listsApi.deleteItem(listId, itemId);
      load();
    } catch { addToast('Failed to delete item', 'error'); }
  };

  // Handle local drag-and-drop sort of list items
  const handleDragEnd = (listId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLists((prevLists) => {
        return prevLists.map((l) => {
          if (l.id !== listId) return l;
          const oldIndex = l.items.findIndex((i) => i.id === active.id);
          const newIndex = l.items.findIndex((i) => i.id === over.id);
          const reorderedItems = arrayMove(l.items, oldIndex, newIndex);
          return { ...l, items: reorderedItems };
        });
      });
      addToast('Items reordered locally', 'success');
    }
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Lists</h2>
          <p className="text-sm text-[var(--text-secondary)]">{lists.length} lists</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          New List
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : lists.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-[var(--text-tertiary)]">No lists yet. Create one!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {lists.map((list) => {
            const doneCount = list.items.filter((i) => i.done).length;
            const total = list.items.length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

            return (
              <Card key={list.id} className="flex flex-col h-full">
                {/* List Header */}
                <div className="flex items-center justify-between mb-3 border-b border-[var(--border-default)] pb-2">
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{list.name}</h3>
                    <p className="text-[10px] font-semibold text-[var(--text-tertiary)] mt-0.5">
                      {doneCount}/{total} done
                    </p>
                  </div>
                  <button
                    onClick={() => deleteList(list.id)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-danger-500 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                  <div className="w-full h-1.5 bg-[var(--bg-input)] rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-success-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {/* Items container with DND-Kit */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 flex-1">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(list.id, e)}
                  >
                    <SortableContext items={list.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      {list.items.map((item) => (
                        <SortableListItem key={item.id} id={item.id}>
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-[var(--bg-input)] group transition-colors w-full">
                            <button
                              onClick={() => toggleItem(list.id, item.id, item.done)}
                              className={`
                                w-4 h-4 rounded border flex items-center justify-center shrink-0
                                transition-all cursor-pointer
                                ${item.done
                                  ? 'bg-success-500 border-success-500 text-white'
                                  : 'border-[var(--border-strong)] hover:border-brand-500 bg-[var(--bg-card)]'
                                }
                              `}
                            >
                              {item.done && <Check size={10} strokeWidth={3} />}
                            </button>
                            <span className={`text-sm flex-1 truncate ${item.done ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)] font-medium'}`}>
                              {item.text}
                            </span>
                            <button
                              onClick={() => deleteItem(list.id, item.id)}
                              className="p-1 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 hover:text-danger-500 transition-all cursor-pointer rounded"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </SortableListItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>

                {/* Add item */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-default)]">
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={newItemText[list.id] || ''}
                    onChange={(e) => setNewItemText((p) => ({ ...p, [list.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addItem(list.id)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-ring"
                  />
                  <Button size="sm" onClick={() => addItem(list.id)} icon={<Plus size={14} />} className="!rounded-xl text-xs py-1">
                    Add
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New List">
        <div className="space-y-4">
          <Input ref={nameRef} label="List Name" placeholder="e.g. Shopping, Books to Read" autoFocus />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={createList}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
