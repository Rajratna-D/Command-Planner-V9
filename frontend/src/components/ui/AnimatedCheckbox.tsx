import { motion } from 'framer-motion';

interface AnimatedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function AnimatedCheckbox({ checked, onChange, disabled }: AnimatedCheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        w-5.5 h-5.5 rounded-[6px] border flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0
        focus:outline-none focus:ring-2 focus:ring-brand-500
        ${checked
          ? 'bg-brand-500 border-brand-500 text-white shadow-sm shadow-brand-500/20'
          : 'border-[var(--border-strong)] hover:border-brand-500 bg-[var(--bg-card)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <svg
        className="w-3.5 h-3.5 stroke-current fill-none stroke-[3.5px]"
        viewBox="0 0 24 24"
      >
        <motion.path
          d="M20 6L9 17L4 12"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: checked ? 1 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 28,
          }}
        />
      </svg>
    </button>
  );
}
