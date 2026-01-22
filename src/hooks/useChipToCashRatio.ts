import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useChipToCashRatio(clubId: string | null) {
  const [chipToCashRatio, setChipToCashRatio] = useState(0.01);

  useEffect(() => {
    const fetchChipRatio = async () => {
      if (!clubId) return;
      
      try {
        // Get active chip template
        const templateResult = await supabase
          .from('chip_templates')
          .select('id')
          .eq('club_id', clubId)
          .eq('is_active', true)
          .maybeSingle();

        const template = templateResult.data;
        if (!template) return;

        // Use fetch API directly to avoid TypeScript chain type depth issues
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(
          `${supabaseUrl}/rest/v1/chip_denominations?chip_template_id=eq.${template.id}&order=denomination.asc&limit=1`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const ratio = Number(data[0].cash_value) / Number(data[0].denomination);
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
