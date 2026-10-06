import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { IntakePage } from './pages/IntakePage.tsx';
import { AnalysisProgressPage } from './pages/AnalysisProgressPage.tsx';
import { AnalysisDashboardPage } from './pages/AnalysisDashboardPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path.startsWith('/#')) {
      return;
    }
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPage = () => {
    // 1. Match /projects/:id/intake
    const intakeMatch = currentPath.match(/^\/projects\/([a-zA-Z0-9_-]+)\/intake$/);
    if (intakeMatch) {
      const projectId = intakeMatch[1];
      return (
        <ProtectedRoute navigate={navigate}>
          <IntakePage projectId={projectId} navigate={navigate} />
        </ProtectedRoute>
      );
    }

    // 2. Match /projects/:id/progress
    const progressMatch = currentPath.match(/^\/projects\/([a-zA-Z0-9_-]+)\/progress$/);
    if (progressMatch) {
      const projectId = progressMatch[1];
      return (
        <ProtectedRoute navigate={navigate}>
          <AnalysisProgressPage projectId={projectId} navigate={navigate} />
        </ProtectedRoute>
      );
    }

    // 3. Match /projects/:id/dashboard
    const analysisDashboardMatch = currentPath.match(/^\/projects\/([a-zA-Z0-9_-]+)\/dashboard$/);
    if (analysisDashboardMatch) {
      const projectId = analysisDashboardMatch[1];
      return (
        <ProtectedRoute navigate={navigate}>
          <AnalysisDashboardPage projectId={projectId} navigate={navigate} />
        </ProtectedRoute>
      );
    }

    switch (currentPath) {
      case '/':
        return <HomePage navigate={navigate} />;
      case '/login':
        return <LoginPage navigate={navigate} />;
      case '/register':
        return <RegisterPage navigate={navigate} />;
      case '/dashboard':
        return (
          <ProtectedRoute navigate={navigate}>
            <DashboardPage navigate={navigate} />
          </ProtectedRoute>
        );
      case '/admin':
        return (
          <ProtectedRoute navigate={navigate}>
            <AdminPage navigate={navigate} />
          </ProtectedRoute>
        );
      case '/profile':
        return (
          <ProtectedRoute navigate={navigate}>
            <ProfilePage navigate={navigate} />
          </ProtectedRoute>
        );
      default:
        return <NotFoundPage navigate={navigate} />;
    }
  };

  return (
    <AppLayout currentPath={currentPath} navigate={navigate}>
      {renderPage()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
