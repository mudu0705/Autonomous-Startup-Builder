import React from 'react';
import { Button } from '../common/Button.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { User as UserIcon, LogOut } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  navigate: (path: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, currentPath, navigate }) => {
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'Projects Workspace', path: '/dashboard' },
    ...(user?.role === 'admin' ? [{ label: 'Admin Telemetry', path: '/admin' }] : []),
    ...(isAuthenticated ? [{ label: 'Account', path: '/profile' }] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar Contract (3 Zones) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Zone 1: Wordmark */}
          <button
            onClick={() => navigate('/')}
            className="text-base sm:text-lg font-semibold tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            Autonomous Startup Builder
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => {
                  if (link.path.startsWith('/#')) {
                    if (currentPath !== '/') {
                      navigate('/');
                      setTimeout(() => {
                        const id = link.path.replace('/#', '');
                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else {
                      const id = link.path.replace('/#', '');
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  } else {
                    navigate(link.path);
                  }
                }}
                className={`transition-colors hover:text-white whitespace-nowrap py-1 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
                  currentPath === link.path ? 'text-emerald-400 font-medium' : 'text-slate-400'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Dynamic Auth User Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/profile')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
                >
                  <UserIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-medium max-w-[140px] truncate">
                    {user.fullName || user.email}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {user.role}
                  </span>
                </button>

                <Button variant="ghost" size="sm" onClick={handleLogout} title="Sign Out">
                  <LogOut className="h-4 w-4 mr-1.5 text-slate-400" />
                  <span>Sign Out</span>
                </Button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                >
                  Sign In
                </button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">Autonomous Startup Builder</span>
            <span>·</span>
            <span>9-Agent Analysis Platform · Academic Prototype</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Raw API Health Endpoint (/api/health)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
