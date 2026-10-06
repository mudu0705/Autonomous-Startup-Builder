import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserRole } from '../../shared/types/user.ts';
import { Button } from './common/Button.tsx';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  navigate: (path: string) => void;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  navigate,
  allowedRoles,
}) => {
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // 1. Initial Authentication Resolution Loading State
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-200">Resolving authentication session...</p>
          <p className="text-xs text-slate-400">Verifying secure credentials</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Redirect State
  if (!isAuthenticated || !user) {
    return null;
  }

  // 3. Role-Based Access Protection Guard
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">Access Restricted</h2>
            <p className="text-xs text-slate-400">
              Your account role (<code className="text-slate-300 font-mono">{user.role}</code>) does not have sufficient permissions to access this area.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="secondary" className="w-full" onClick={() => navigate('/dashboard')}>
              Return to Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
