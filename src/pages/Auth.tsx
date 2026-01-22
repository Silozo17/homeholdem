import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { Logo } from '@/components/layout/Logo';

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background card-suit-pattern">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <Logo size="lg" />
        
        <p className="text-center text-muted-foreground max-w-sm mx-auto">
          Organize private poker nights, run tournaments, and track your club's history.
        </p>
        
        <AuthForm />
        
        <div className="flex justify-center gap-6 text-2xl opacity-20">
          <span className="text-poker-red">♥</span>
          <span>♠</span>
          <span className="text-poker-red">♦</span>
          <span>♣</span>
        </div>
      </div>
    </div>
  );
}
