import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  AUD: 'A$',
  CAD: 'C$',
};

interface UseClubCurrencyReturn {
  currency: string;
  symbol: string;
  loading: boolean;
}

export function useClubCurrency(clubId: string): UseClubCurrencyReturn {
  const [currency, setCurrency] = useState('GBP');
  const [symbol, setSymbol] = useState('£');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    const fetchCurrency = async () => {
      setLoading(true);
      
      const { data } = await supabase
        .from('chip_templates')
        .select('currency')
        .eq('club_id', clubId)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (data?.currency) {
        setCurrency(data.currency);
        setSymbol(CURRENCY_SYMBOLS[data.currency] || data.currency);
      }
      
      setLoading(false);
    };

    fetchCurrency();
  }, [clubId]);

  return { currency, symbol, loading };
}
