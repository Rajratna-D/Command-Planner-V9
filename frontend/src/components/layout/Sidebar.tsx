import { useAppStore } from '../../store/appStore';
import { ChevronLeft, ChevronRight, Keyboard } from 'lucide-react';
import { navItems } from './navigation';

export default function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`
          hidden md:flex flex-col fixed top-0 left-0 h-screen z-40
          glass-panel border-r border-[var(--border-default)]
          transition-all duration-300 ease-out
          ${sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-[72px]'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-[var(--topbar-height)] border-b border-[var(--border-default)]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            CP
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm whitespace-nowrap overflow-hidden gradient-text">
              Command Planner
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => setActiveTab(item.key)}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      text-sm font-medium transition-all duration-150 cursor-pointer
                      ${isActive
                        ? 'bg-brand-500/10 text-brand-500'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-brand-500' : ''}`}>
                      {item.icon}
                    </span>
                    {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                    {isActive && sidebarOpen && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Shortcuts button */}
        <div className="px-2 py-1.5 border-t border-[var(--border-default)]">
          <button
            onClick={() => useAppStore.getState().setShortcutsOpen(true)}
            title="Keyboard Shortcuts Guide (?)"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]
              transition-colors text-sm cursor-pointer"
          >
            <span className="shrink-0 text-[var(--text-secondary)]">
              <Keyboard size={20} />
            </span>
            {sidebarOpen && <span>Keyboard Shortcuts</span>}
            {sidebarOpen && (
              <kbd className="ml-auto px-1.5 py-0.5 bg-[var(--bg-input)] border border-[var(--border-default)] rounded text-[10px] font-mono text-[var(--text-tertiary)] shadow-sm">
                ?
              </kbd>
            )}
          </button>
        </div>

        {/* Collapse toggle */}
        <div className="px-2 py-3 border-t border-[var(--border-default)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
              text-[var(--text-tertiary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]
              transition-colors text-sm cursor-pointer"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────── */}
      <nav
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-50
          glass-panel border-t border-[var(--border-default)]
        "
      >
        <div className="flex overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`
                  flex flex-col items-center gap-1 py-2 px-3 min-w-[64px] flex-1
                  text-[10px] font-medium transition-colors cursor-pointer
                  ${isActive ? 'text-brand-500' : 'text-[var(--text-tertiary)]'}
                `}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

