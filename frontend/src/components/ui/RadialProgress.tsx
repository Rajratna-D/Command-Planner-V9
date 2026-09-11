import { motion } from 'framer-motion';

interface RadialProgressProps {
  value: number; // percentage (0 - 100)
  size?: number; // width/height in px
  strokeWidth?: number;
  label?: string;
  gradientColors?: [string, string]; // [startColor, endColor]
}

export default function RadialProgress({
  value,
  size = 110,
  strokeWidth = 9,
  label,
  gradientColors = ['#3b82f6', '#8b5cf6']
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Unique id for gradient
  const gradId = `radial-grad-${label?.replace(/\s+/g, '-').toLowerCase() || 'progress'}`;

  return (
    <div className="flex flex-col items-center justify-center gap-1 shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-[var(--border-default)] fill-none"
            strokeWidth={strokeWidth}
          />
          {/* Active progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-lg font-extrabold text-[var(--text-primary)]">
            {Math.round(clampedValue)}%
          </span>
          {label && (
            <span className="text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mt-1 text-center max-w-[80%] truncate">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
