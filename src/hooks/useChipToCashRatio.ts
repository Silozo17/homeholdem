import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useChipToCashRatio(clubId: string | null) {
  const [chipToCashRatio, setChipToCashRatio] = useState(0.01);

  useEffect(() => {
    const fetchChipRatio = async () => {
      if (!clubId) return;
      
      try {
        const { data: template } = await supabase
          .from('chip_templates')
          .select('id')
          .eq('club_id', clubId)
          .eq('is_active', true)
          .maybeSingle();

        if (template) {
          // Fetch all denominations and take the first (smallest)
          const denomResult = await supabase
            .from('chip_denominations')
            .select('denomination, cash_value')
            .eq('chip_template_id', template.id);

          // Sort locally and get smallest
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = denomResult.data as any[];
          if (data && data.length > 0) {
            const sorted = data.sort((a, b) => a.denomination - b.denomination);
            const first = sorted[0];
            const ratio = Number(first.cash_value) / Number(first.denomination);
            if (!isNaN(ratio) && ratio > 0) {
              setChipToCashRatio(ratio);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching chip ratio:', error);
      }
    };

    fetchChipRatio();
  }, [clubId]);

  return chipToCashRatio;
}
