import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import AuthForm from '@/components/auth/AuthForm';
import Dashboard from '@/pages/Dashboard';
import Monitor from '@/pages/Monitor';
import History from '@/pages/History';

type Page = 'auth' | 'dashboard' | 'monitor' | 'history' | 'profile' | 'settings';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useEffect(() => {
    if (!loading && !user) {
      setCurrentPage('auth');
    } else if (!loading && user && currentPage === 'auth') {
      setCurrentPage('dashboard');
    }
  }, [user, loading, currentPage]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-cyber flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-mono">Initializing system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onSuccess={() => setCurrentPage('dashboard')} />;
  }

  switch (currentPage) {
    case 'monitor':
      return <Monitor onNavigate={handleNavigate} />;
    case 'history':
      return <History onNavigate={handleNavigate} />;
    case 'dashboard':
    default:
      return <Dashboard onNavigate={handleNavigate} />;
  }
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
