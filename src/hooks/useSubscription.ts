import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionState {
  subscribed: boolean;
  status: 'trialing' | 'active' | 'expired' | 'canceled' | null;
  plan: 'monthly' | 'annual' | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    status: null,
    plan: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setState({
        subscribed: data.subscribed,
        status: data.status,
        plan: data.plan,
        trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
        currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      // Keep previous subscription state on error to prevent UI disruption
      // This prevents redirects/paywall triggers when network issues occur during active use
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to check subscription',
        // Preserve previous subscription values - don't reset on network errors
      }));
    }
  }, [session?.access_token]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({
        subscribed: false,
        status: null,
        plan: null,
        trialEndsAt: null,
        currentPeriodEnd: null,
        loading: false,
        error: null,
      });
    }
  }, [user, checkSubscription]);

  // Daily check at midnight
  useEffect(() => {
    if (!user) return;

    const scheduleNextMidnightCheck = (): NodeJS.Timeout => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        if (document.visibilityState === 'visible') {
          checkSubscription();
        }
        // Schedule next day's check
        scheduleNextMidnightCheck();
      }, msUntilMidnight);
    };

    const timeoutId = scheduleNextMidnightCheck();
    return () => clearTimeout(timeoutId);
  }, [user, checkSubscription]);

  // Check on app resume after 1+ hour away
  useEffect(() => {
    if (!user) return;
    
    let lastCheckTime = Date.now();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const hoursSinceLastCheck = (Date.now() - lastCheckTime) / (1000 * 60 * 60);
        if (hoursSinceLastCheck >= 1) {
          checkSubscription();
          lastCheckTime = Date.now();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkSubscription]);

  const isActive = state.subscribed && (state.status === 'active' || state.status === 'trialing');
  const isTrialing = state.status === 'trialing';

  const daysRemaining = (() => {
    if (!state.subscribed) return 0;
    const endDate = isTrialing ? state.trialEndsAt : state.currentPeriodEnd;
    if (!endDate) return 0;
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return {
    ...state,
    isActive,
    isTrialing,
    daysRemaining,
    refetch: checkSubscription,
  };
}
