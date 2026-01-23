import { useTranslation } from 'react-i18next';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export function CurrencySettings() {
  const { t } = useTranslation();
  const { preferences, loading, updatePreference } = useUserPreferences();

  const handleCurrencyChange = async (value: string) => {
    const success = await updatePreference('currency', value);
    if (success) {
      toast.success(t('settings.currency_updated'));
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            {t('settings.currency')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-10 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          {t('settings.currency')}
        </CardTitle>
        <CardDescription>{t('settings.currency_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select 
          value={preferences?.currency || 'GBP'} 
          onValueChange={handleCurrencyChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((curr) => (
              <SelectItem key={curr.code} value={curr.code}>
                {curr.symbol} {curr.name} ({curr.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          {t('settings.currency_note')}
        </p>
      </CardContent>
    </Card>
  );
}
