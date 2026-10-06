import React from 'react';
import { cn } from '../../utils/cn.ts';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading platform diagnostics...',
  className,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-slate-800 bg-slate-900/40',
        className
      )}
    >
      <div className="relative mb-3 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-emerald-500 animate-spin" />
      </div>
      <p className="text-xs font-medium text-slate-300">{message}</p>
      <span className="sr-only">Loading content, please wait</span>
    </div>
  );
};

export const SkeletonRow: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-2.5 animate-pulse" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-9 bg-slate-850 rounded-md border border-slate-800/60" />
      ))}
    </div>
  );
};
