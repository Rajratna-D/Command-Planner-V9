import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function Modal({ open, onClose, title, children, width = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`
        ${widthClasses[width]} w-[calc(100%-2rem)]
        bg-[var(--bg-card)] text-[var(--text-primary)]
        border border-[var(--border-default)]
        rounded-2xl shadow-xl p-0 m-auto
        backdrop:bg-black/50 backdrop:backdrop-blur-sm
        animate-in
      `}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      <div className="p-5">
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {/* Body */}
        {children}
      </div>
    </dialog>
  );
}
