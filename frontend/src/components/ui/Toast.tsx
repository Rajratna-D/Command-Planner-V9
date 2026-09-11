import { useAppStore } from '../../store/appStore';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-success-500" />,
  error: <AlertCircle size={18} className="text-danger-500" />,
  info: <Info size={18} className="text-brand-500" />,
};

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg
            glass-subtle
            animate-in
          `}
        >
          <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)]">{toast.message}</p>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  removeToast(toast.id);
                }}
                className="mt-1.5 text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors cursor-pointer"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
