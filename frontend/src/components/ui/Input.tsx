import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';

/* ── Text Input ────────────────────────────────────────────────────────── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2 rounded-lg text-sm
            bg-[var(--bg-input)] text-[var(--text-primary)]
            border transition-all duration-150
            placeholder:text-[var(--text-tertiary)]
            focus-ring
            ${error ? 'border-danger-500' : 'border-[var(--border-default)] focus:border-brand-500'}
            ${className}
          `}
          {...rest}
        />
        {error && <p className="text-xs text-danger-500">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* ── Select ────────────────────────────────────────────────────────────── */
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', id, ...rest }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full px-3 py-2 rounded-lg text-sm appearance-none
          bg-[var(--bg-input)] text-[var(--text-primary)]
          border border-[var(--border-default)]
          transition-all duration-150 focus-ring focus:border-brand-500
          cursor-pointer
          ${className}
        `}
        {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Textarea ──────────────────────────────────────────────────────────── */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = '', id, ...rest }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            w-full px-3 py-2 rounded-lg text-sm resize-y min-h-[80px]
            bg-[var(--bg-input)] text-[var(--text-primary)]
            border border-[var(--border-default)]
            transition-all duration-150 focus-ring focus:border-brand-500
            placeholder:text-[var(--text-tertiary)]
            ${className}
          `}
          {...rest}
        />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
