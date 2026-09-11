import Modal from './Modal';
import { useAppStore } from '../../store/appStore';
import { Keyboard } from 'lucide-react';

export default function ShortcutsModal() {
  const open = useAppStore((s) => s.shortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);

  const shortcutGroups = [
    {
      title: 'Global Navigation',
      items: [
        { keys: ['Ctrl', '1-9'], desc: 'Quick navigate between pages/tabs' },
        { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
        { keys: ['?'], desc: 'Toggle this Shortcuts Guide' },
      ],
    },
    {
      title: 'Notes Page',
      items: [
        { keys: ['Ctrl', 'N'], desc: 'Create a new note' },
        { keys: ['Ctrl', 'S'], desc: 'Save changes / Create note' },
        { keys: ['Esc'], desc: 'Close open Note modal or exit markdown preview' },
      ],
    },
    {
      title: 'Tasks & Assignments Pages',
      items: [
        { keys: ['Ctrl', 'S'], desc: 'Save and create active task/assignment modal' },
        { keys: ['Esc'], desc: 'Close any active modal dialog' },
      ],
    },
  ];

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Keyboard Shortcuts Guide"
      width="lg"
    >
      <div className="space-y-5 text-sm select-none">
        <div className="flex items-center gap-3 p-3 bg-brand-500/5 border border-brand-500/20 text-brand-500 rounded-xl">
          <Keyboard size={18} className="shrink-0" />
          <p className="text-xs font-semibold leading-snug">
            Boost your productivity! You can use these hotkeys to navigate the app and complete forms lightning fast.
          </p>
        </div>

        <div className="space-y-4">
          {shortcutGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] pb-1.5">
                {group.title}
              </h3>
              <div className="divide-y divide-[var(--border-default)]">
                {group.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center justify-between py-2 gap-4">
                    <span className="text-[var(--text-primary)] font-medium text-xs sm:text-sm">
                      {item.desc}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className="
                            px-2 py-1 bg-[var(--bg-input)] border border-[var(--border-default)]
                            rounded-lg font-mono font-bold text-[10px] text-[var(--text-primary)]
                            shadow-[0_2px_0_var(--border-strong)]
                          "
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
