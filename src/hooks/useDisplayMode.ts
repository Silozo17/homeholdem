import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DisplayMode = 'cash' | 'chips';

export function useDisplayMode(clubId: string | null) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cash');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    const fetchDisplayMode = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clubs')
          .select('display_mode')
          .eq('id', clubId)
          .single();

        if (error) throw error;

        if (data?.display_mode && (data.display_mode === 'cash' || data.display_mode === 'chips')) {
          setDisplayMode(data.display_mode as DisplayMode);
        }
      } catch (error) {
        console.error('Error fetching display mode:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisplayMode();
  }, [clubId]);

  return { displayMode, loading };
}
