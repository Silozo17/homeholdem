import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const TUTORIAL_XP_REWARD = 1600;

export function useTutorialComplete() {
  const { user } = useAuth();
  const [isComplete, setIsComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsComplete(null);
      setIsLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('tutorial_completed_at')
        .eq('id', user.id)
        .maybeSingle();
      setIsComplete(!!data?.tutorial_completed_at);
      setIsLoading(false);
    })();
  }, [user]);

  const markComplete = useCallback(async (withXp: boolean) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({ tutorial_completed_at: new Date().toISOString() } as any)
      .eq('id', user.id);
    if (withXp) {
      await supabase.from('xp_events').insert({
        user_id: user.id,
        xp_amount: TUTORIAL_XP_REWARD,
        reason: 'tutorial_complete',
      });
    }
    setIsComplete(true);
  }, [user]);

  const skipTutorial = useCallback(async () => {
    await markComplete(false);
  }, [markComplete]);

  return { isComplete: isComplete ?? false, isLoading, skipTutorial, markComplete };
}
