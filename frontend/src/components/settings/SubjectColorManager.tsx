import { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import type { Subject } from '../../types';
import {
  Palette, BookOpen, ChevronRight, ChevronDown, Wand2, Check
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Matcha', hex: '#387c53' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Violet', hex: '#8b5cf6' },
];

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: 'Academic & Books',
    emojis: ['📚', '📖', '📝', '🎓', '✍️', '🎒', '📋', '📑', '🖋️'],
  },
  {
    name: 'Science & Engineering',
    emojis: ['🔬', '🧬', '⚛️', '🧪', '🔭', '⚙️', '⚡', '🤖', '🔋'],
  },
  {
    name: 'Tech & Computing',
    emojis: ['💻', '🖥️', '💾', '⌨️', '🌐', '🛰️', '🧠', '🔐', '📡'],
  },
  {
    name: 'Math & Analytics',
    emojis: ['🧮', '📐', '📊', '📈', '📉', '🔢', '🎯', '⏱️', '📏'],
  },
  {
    name: 'Arts & Humanities',
    emojis: ['🎨', '🎭', '🏛️', '🌍', '📜', '🗺️', '💡', '🎵', '🏛️'],
  },
];

interface SubjectColorManagerProps {
  subjects: Subject[];
  loading: boolean;
}

export default function SubjectColorManager({ subjects, loading }: SubjectColorManagerProps) {
  const subjectConfigs = useAppStore((s) => s.subjectConfigs);
  const setSubjectConfig = useAppStore((s) => s.setSubjectConfig);
  const addToast = useAppStore((s) => s.addToast);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('cp-settings-subjects-open');
    return stored !== null ? stored === 'true' : true;
  });
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<string | null>(null);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem('cp-settings-subjects-open', String(next));
      return next;
    });
  };

  const handleUpdateColor = (subjectName: string, color: string) => {
    const normName = subjectName.toLowerCase().trim();
    const current = subjectConfigs[normName] || { color: '#3b82f6', icon: '📚' };
    setSubjectConfig(subjectName, { ...current, color });
    addToast(`Updated color for ${subjectName}`, 'success');
  };

  const handleUpdateIcon = (subjectName: string, icon: string) => {
    const normName = subjectName.toLowerCase().trim();
    const current = subjectConfigs[normName] || { color: '#3b82f6', icon: '📚' };
    setSubjectConfig(subjectName, { ...current, icon });
    setShowEmojiPickerFor(null);
    addToast(`Updated icon for ${subjectName}`, 'success');
  };

  const handleAutoColorAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    subjects.forEach((sub, idx) => {
      const normName = sub.name.toLowerCase().trim();
      const current = subjectConfigs[normName] || { color: '#3b82f6', icon: '📚' };
      const assignedColor = PRESET_COLORS[idx % PRESET_COLORS.length].hex;
      setSubjectConfig(sub.name, { ...current, color: assignedColor });
    });
    addToast('Assigned harmonious palette across all subjects!', 'success');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2 flex-wrap gap-2">
        <button
          onClick={toggleOpen}
          className="flex items-center gap-2 text-md font-semibold text-[var(--text-primary)] cursor-pointer group text-left"
        >
          <Palette className="text-brand-500" size={20} />
          <h3>Subject Visual Identity & Icons</h3>
          {subjects.length > 0 && (
            <span className="text-[10px] bg-brand-500/10 text-brand-500 font-semibold px-2 py-0.5 rounded-full">
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors ml-1">
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>

        {isOpen && subjects.length > 0 && (
          <button
            onClick={handleAutoColorAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 border border-brand-500/20 cursor-pointer transition-colors"
            title="Automatically assign harmonious colors across all subjects"
          >
            <Wand2 size={13} />
            <span>Auto-Palette</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 shadow-sm space-y-4 animate-in">
          <p className="text-xs text-[var(--text-secondary)]">
            Customize distinctive colors and icons for each academic subject. These visual badges appear across your Tasks, Tests, Pomodoro sessions, and Overview.
          </p>

        {loading ? (
          <div className="space-y-3 py-4">
            <div className="skeleton h-16 rounded-xl w-full" />
            <div className="skeleton h-16 rounded-xl w-full" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-[var(--bg-input)]/40 rounded-xl border border-dashed border-[var(--border-default)]">
            <div className="p-3 rounded-full bg-brand-500/10 text-brand-500 mb-2">
              <BookOpen size={24} />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">No subjects created yet</h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mt-1 mb-4">
              Add your course subjects and topics in the Syllabus tab to start assigning colors and icons.
            </p>
            <button
              onClick={() => setActiveTab('syllabus')}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              <span>Go to Syllabus Tab</span>
              <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {subjects.map((sub) => {
              const normName = sub.name.toLowerCase().trim();
              const config = subjectConfigs[normName] || { color: '#3b82f6', icon: '📚' };
              const isEmojiOpen = showEmojiPickerFor === sub.id;

              return (
                <div
                  key={sub.id}
                  className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]/30 hover:border-brand-500/30 transition-all space-y-3"
                >
                  {/* Top Row: Icon button, Subject Title, Live Badge Preview */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {/* Interactive Emoji Button */}
                      <button
                        onClick={() => setShowEmojiPickerFor(isEmojiOpen ? null : sub.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-brand-500 hover:scale-105 transition-all cursor-pointer shadow-xs"
                        title="Click to choose emoji icon"
                      >
                        {config.icon}
                      </button>

                      <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{sub.name}</h4>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {sub.topics.length} topic{sub.topics.length !== 1 ? 's' : ''} in syllabus
                        </p>
                      </div>
                    </div>

                    {/* Live Preview Pill Badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Preview:</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs transition-all border"
                        style={{
                          backgroundColor: `${config.color}18`,
                          borderColor: `${config.color}40`,
                          color: config.color,
                        }}
                      >
                        <span>{config.icon}</span>
                        <span>{sub.name}</span>
                      </span>
                    </div>
                  </div>

                  {/* Emoji Picker Dropdown / Drawer */}
                  {isEmojiOpen && (
                    <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl space-y-3 shadow-md animate-in">
                      <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] border-b border-[var(--border-default)] pb-1.5">
                        <span>Select Subject Icon</span>
                        <button
                          onClick={() => setShowEmojiPickerFor(null)}
                          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {EMOJI_CATEGORIES.map((cat) => (
                          <div key={cat.name} className="space-y-1">
                            <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">{cat.name}</p>
                            <div className="flex items-center gap-1 flex-wrap">
                              {cat.emojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleUpdateIcon(sub.name, emoji)}
                                  className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 ${
                                    config.icon === emoji
                                      ? 'bg-brand-500/20 border border-brand-500'
                                      : 'hover:bg-[var(--bg-input)]'
                                  }`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Swatches & Custom Picker */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--border-default)]/60">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => handleUpdateColor(sub.name, c.hex)}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                            config.color.toLowerCase() === c.hex.toLowerCase()
                              ? 'scale-110 ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-[var(--text-primary)]'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        >
                          {config.color.toLowerCase() === c.hex.toLowerCase() && (
                            <Check size={12} className="text-white drop-shadow-xs" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Custom Color Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.color}
                        onChange={(e) => handleUpdateColor(sub.name, e.target.value)}
                        className="w-6 h-6 rounded-md border-0 cursor-pointer p-0 bg-transparent"
                        title="Custom Color Picker"
                      />
                      <input
                        type="text"
                        value={config.color}
                        onChange={(e) => handleUpdateColor(sub.name, e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] rounded-lg font-mono uppercase"
                        placeholder="#HEX"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
