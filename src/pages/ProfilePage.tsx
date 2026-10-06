import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import { User, ShieldCheck, Mail, ArrowLeft, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ProfilePageProps {
  navigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Founder Account</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage your authenticated credentials and workspace profile</p>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Dashboard
        </Button>
      </div>

      <Card className="bg-slate-900/90 border-slate-800 shadow-xl">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-lg font-mono">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white">{user?.fullName || 'Founder'}</CardTitle>
              <CardDescription className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3 w-3 text-slate-500" />
                {user?.email || 'founder@example.com'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Account Role</span>
              <div className="text-sm font-semibold text-white capitalize">{user?.role || 'User'}</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Session Status</span>
              <div className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> Active JWT
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 flex justify-between items-center">
            <span>Authentication Standard:</span>
            <span className="text-slate-200 font-mono">Argon2id + JWT Signature</span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
            {user?.role === 'admin' && (
              <Button variant="secondary" size="sm" onClick={() => navigate('/admin')}>
                Open Admin Telemetry
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="text-rose-400 hover:text-rose-300 ml-auto"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
