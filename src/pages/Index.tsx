import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import Auth from './Auth';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    // Store invite code if present in URL for auto-join after auth
    const joinCode = searchParams.get('join');
    if (joinCode) {
      localStorage.setItem('pendingInviteCode', joinCode.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  return <Auth />;
};

export default Index;
