import React from 'react';
import { cn } from '../../utils/cn.ts';

export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface StatusIndicatorProps {
  status: StatusVariant;
  label: string;
  className?: string;
}

const statusConfig: Record<StatusVariant, { dotColor: string; textColor: string }> = {
  success: {
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
  },
  warning: {
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-400',
  },
  error: {
    dotColor: 'bg-rose-500',
    textColor: 'text-rose-400',
  },
  info: {
    dotColor: 'bg-sky-500',
    textColor: 'text-sky-400',
  },
  neutral: {
    dotColor: 'bg-slate-500',
    textColor: 'text-slate-400',
  },
};

/**
 * Clean typographic status indicator adhering to zero-pill discipline.
 * Uses an inline dot and accessible text rather than a rounded candy pill box.
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  className,
}) => {
  const config = statusConfig[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', config.textColor, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotColor)} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
