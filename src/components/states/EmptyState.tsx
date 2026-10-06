import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { cn } from '../../utils/cn.ts';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 text-center rounded-lg border border-dashed border-slate-800 bg-slate-900/20 max-w-lg mx-auto',
        className
      )}
    >
      <div className="h-10 w-10 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3">
        <FolderOpen className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-100 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 mb-4 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
