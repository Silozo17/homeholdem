import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { Logo } from '@/components/layout/Logo';
import { SuitRow } from '@/components/common/CardSuits';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background card-suit-pattern">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <Logo size="lg" />
        
        <p className="text-center text-muted-foreground max-w-sm mx-auto">
          {t('auth.tagline')}
        </p>
        
        <AuthForm />
        
        <SuitRow size="lg" opacity={0.2} />
      </div>
    </div>
  );
}
