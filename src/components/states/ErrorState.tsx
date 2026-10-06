import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { cn } from '../../utils/cn.ts';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Diagnostics Notice',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-red-900/40 bg-red-950/20 max-w-lg mx-auto',
        className
      )}
    >
      <div className="h-10 w-10 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-semibold text-slate-100 mb-1">{title}</h4>
      <p className="text-xs text-slate-400 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry Connection</span>
        </Button>
      )}
    </div>
  );
};
