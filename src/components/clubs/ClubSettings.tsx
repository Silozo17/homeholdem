import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Loader2 } from 'lucide-react';

interface ClubSettingsProps {
  clubId: string;
  clubName: string;
  clubDescription: string | null;
  clubCurrency: string;
  isAdmin: boolean;
  onUpdate: () => void;
}

const CURRENCIES = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

export function ClubSettings({ 
  clubId, 
  clubName, 
  clubDescription, 
  clubCurrency,
  isAdmin, 
  onUpdate 
}: ClubSettingsProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(clubName);
  const [description, setDescription] = useState(clubDescription || '');
  const [currency, setCurrency] = useState(clubCurrency || 'GBP');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setName(clubName);
    setDescription(clubDescription || '');
    setCurrency(clubCurrency || 'GBP');
    setHasChanges(false);
  }, [clubName, clubDescription, clubCurrency]);

  useEffect(() => {
    const changed = 
      name !== clubName || 
      description !== (clubDescription || '') || 
      currency !== (clubCurrency || 'GBP');
    setHasChanges(changed);
  }, [name, description, currency, clubName, clubDescription, clubCurrency]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('club.name_required'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clubs')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          currency,
        })
        .eq('id', clubId);

      if (error) throw error;

      toast.success(t('club.settings_saved'));
      onUpdate();
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving club settings:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t('club.settings')}
          </CardTitle>
          <CardDescription>{t('club.settings_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">{t('club.name')}</Label>
            <p className="text-sm font-medium mt-1">{clubName}</p>
          </div>
          {clubDescription && (
            <div>
              <Label className="text-muted-foreground">{t('club.description')}</Label>
              <p className="text-sm mt-1">{clubDescription}</p>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground">{t('club.currency')}</Label>
            <p className="text-sm font-medium mt-1">
              {CURRENCIES.find(c => c.code === clubCurrency)?.name || clubCurrency} 
              ({CURRENCIES.find(c => c.code === clubCurrency)?.symbol || clubCurrency})
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          {t('club.settings')}
        </CardTitle>
        <CardDescription>{t('club.settings_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="club-name">{t('club.name')}</Label>
          <Input
            id="club-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('club.name_placeholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="club-description">{t('club.description')}</Label>
          <Textarea
            id="club-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('club.description_placeholder')}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="club-currency">{t('club.currency')}</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="club-currency">
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
          <p className="text-xs text-muted-foreground">{t('club.currency_description')}</p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t('common.save')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
