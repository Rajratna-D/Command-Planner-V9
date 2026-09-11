import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'accent';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
  success: 'bg-success-50 text-success-600 [html[data-theme=dark]_&]:bg-success-600/15 [html[data-theme=dark]_&]:text-success-400',
  warning: 'bg-warning-50 text-warning-600 [html[data-theme=dark]_&]:bg-warning-600/15 [html[data-theme=dark]_&]:text-warning-400',
  danger: 'bg-danger-50 text-danger-600 [html[data-theme=dark]_&]:bg-danger-600/15 [html[data-theme=dark]_&]:text-danger-400',
  brand: 'bg-brand-50 text-brand-600 [html[data-theme=dark]_&]:bg-brand-600/15 [html[data-theme=dark]_&]:text-brand-400',
  accent: 'bg-accent-50 text-accent-600 [html[data-theme=dark]_&]:bg-accent-600/15 [html[data-theme=dark]_&]:text-accent-400',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export default function Badge({ children, variant = 'default', className = '', dot }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5
        text-xs font-medium rounded-full whitespace-nowrap
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}
