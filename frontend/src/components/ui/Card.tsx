import { type ReactNode, type HTMLAttributes, memo } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const padClasses = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-6' };

const Card = memo(function Card({
  children,
  hoverable = false,
  padding = 'md',
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      className={`
        bg-[var(--bg-card)] border border-[var(--border-default)]
        rounded-xl transition-all duration-300 ease-[var(--ease-spring)]
        ${hoverable ? 'hover:border-brand-500/40 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]' : ''}
        ${padClasses[padding]}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
});

export default Card;
