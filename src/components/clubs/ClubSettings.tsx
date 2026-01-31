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
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings, Save, Loader2, ChevronDown, Calendar, Coins } from 'lucide-react';

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

type DisplayMode = 'cash' | 'chips';

interface ClubDefaults {
  default_event_time: string;
  default_max_tables: number;
  default_seats_per_table: number;
  default_buy_in_amount: number;
  default_starting_chips: number;
  default_rebuy_amount: number;
  default_rebuy_chips: number;
  default_addon_amount: number;
  default_addon_chips: number;
  default_allow_rebuys: boolean;
  default_allow_addons: boolean;
  default_rebuy_until_level: number;
  default_level_duration: number;
}

const DEFAULT_VALUES: ClubDefaults = {
  default_event_time: '19:00',
  default_max_tables: 1,
  default_seats_per_table: 10,
  default_buy_in_amount: 20,
  default_starting_chips: 10000,
  default_rebuy_amount: 20,
  default_rebuy_chips: 10000,
  default_addon_amount: 10,
  default_addon_chips: 5000,
  default_allow_rebuys: true,
  default_allow_addons: true,
  default_rebuy_until_level: 4,
  default_level_duration: 15,
};

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cash');
  const [defaults, setDefaults] = useState<ClubDefaults>(DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [eventDefaultsOpen, setEventDefaultsOpen] = useState(false);
  const [tournamentDefaultsOpen, setTournamentDefaultsOpen] = useState(false);
  const [originalDefaults, setOriginalDefaults] = useState<ClubDefaults>(DEFAULT_VALUES);
  const [originalDisplayMode, setOriginalDisplayMode] = useState<DisplayMode>('cash');

  // Fetch club defaults including display_mode
  useEffect(() => {
    const fetchDefaults = async () => {
      const { data } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();
      
      if (data) {
        const clubDefaults: ClubDefaults = {
          default_event_time: data.default_event_time || '19:00',
          default_max_tables: data.default_max_tables || 1,
          default_seats_per_table: data.default_seats_per_table || 10,
          default_buy_in_amount: data.default_buy_in_amount || 20,
          default_starting_chips: data.default_starting_chips || 10000,
          default_rebuy_amount: data.default_rebuy_amount || 20,
          default_rebuy_chips: data.default_rebuy_chips || 10000,
          default_addon_amount: data.default_addon_amount || 10,
          default_addon_chips: data.default_addon_chips || 5000,
          default_allow_rebuys: data.default_allow_rebuys ?? true,
          default_allow_addons: data.default_allow_addons ?? true,
          default_rebuy_until_level: data.default_rebuy_until_level || 4,
          default_level_duration: data.default_level_duration || 15,
        };
        setDefaults(clubDefaults);
        setOriginalDefaults(clubDefaults);
        
        // Set display mode from database
        const mode = (data as any).display_mode;
        if (mode === 'cash' || mode === 'chips') {
          setDisplayMode(mode);
          setOriginalDisplayMode(mode);
        }
      }
    };

    fetchDefaults();
  }, [clubId]);

  useEffect(() => {
    setName(clubName);
    setDescription(clubDescription || '');
    setCurrency(clubCurrency || 'GBP');
    setHasChanges(false);
  }, [clubName, clubDescription, clubCurrency]);

  useEffect(() => {
    const basicChanged = 
      name !== clubName || 
      description !== (clubDescription || '') || 
      currency !== (clubCurrency || 'GBP') ||
      displayMode !== originalDisplayMode;
    
    const defaultsChanged = JSON.stringify(defaults) !== JSON.stringify(originalDefaults);
    
    setHasChanges(basicChanged || defaultsChanged);
  }, [name, description, currency, clubName, clubDescription, clubCurrency, defaults, originalDefaults, displayMode, originalDisplayMode]);

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
          display_mode: displayMode,
          ...defaults,
        } as any)
        .eq('id', clubId);

      if (error) throw error;

      toast.success(t('club.settings_saved'));
      setOriginalDefaults(defaults);
      onUpdate();
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving club settings:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const updateDefault = <K extends keyof ClubDefaults>(key: K, value: ClubDefaults[K]) => {
    setDefaults(prev => ({ ...prev, [key]: value }));
  };

  const timeOptions = [];
  for (let h = 12; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || currency;

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
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
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

          {/* Display Mode Setting */}
          <div className="space-y-2">
            <Label>{t('club.display_mode', 'Display Mode')}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={displayMode === 'cash' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('cash')}
                className="flex-1"
              >
                {currencySymbol} {t('club.cash_mode', 'Cash')}
              </Button>
              <Button
                type="button"
                variant={displayMode === 'chips' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayMode('chips')}
                className="flex-1"
              >
                🪙 {t('club.chips_mode', 'Chips')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {displayMode === 'cash' 
                ? t('club.cash_mode_description', 'Shows real money values (e.g., £20 buy-in)')
                : t('club.chips_mode_description', 'Shows tournament chip values (e.g., 10,000 chips)')}
            </p>
          </div>
        </div>

        {/* Event Defaults */}
        <Collapsible open={eventDefaultsOpen} onOpenChange={setEventDefaultsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto bg-secondary/30 hover:bg-secondary/50">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <div className="font-medium">{t('club.event_defaults')}</div>
                  <div className="text-xs text-muted-foreground">{t('club.event_defaults_description')}</div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${eventDefaultsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <Label>{t('club.default_start_time')}</Label>
              <Select 
                value={defaults.default_event_time} 
                onValueChange={(v) => updateDefault('default_event_time', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('event.tables')}</Label>
                <Select 
                  value={defaults.default_max_tables.toString()} 
                  onValueChange={(v) => updateDefault('default_max_tables', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 {t('event.table')}</SelectItem>
                    <SelectItem value="2">2 {t('event.tables')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('event.seats_per_table')}</Label>
                <Select 
                  value={defaults.default_seats_per_table.toString()} 
                  onValueChange={(v) => updateDefault('default_seats_per_table', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[6, 7, 8, 9, 10].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} {t('event.seats')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Tournament Defaults */}
        <Collapsible open={tournamentDefaultsOpen} onOpenChange={setTournamentDefaultsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-4 h-auto bg-secondary/30 hover:bg-secondary/50">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <div className="font-medium">{t('club.tournament_defaults')}</div>
                  <div className="text-xs text-muted-foreground">{t('club.tournament_defaults_description')}</div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${tournamentDefaultsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            {/* Buy-in Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('game.buy_in')} ({currencySymbol})</Label>
                <Input
                  type="number"
                  value={defaults.default_buy_in_amount}
                  onChange={(e) => updateDefault('default_buy_in_amount', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('game.starting_chips')}</Label>
                <Input
                  type="number"
                  value={defaults.default_starting_chips}
                  onChange={(e) => updateDefault('default_starting_chips', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Rebuy Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('game.allow_rebuys')}</Label>
                <Switch
                  checked={defaults.default_allow_rebuys}
                  onCheckedChange={(checked) => updateDefault('default_allow_rebuys', checked)}
                />
              </div>
              {defaults.default_allow_rebuys && (
                <div className="grid grid-cols-3 gap-3 pl-4 border-l-2 border-border">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('game.rebuy_cost')} ({currencySymbol})</Label>
                    <Input
                      type="number"
                      value={defaults.default_rebuy_amount}
                      onChange={(e) => updateDefault('default_rebuy_amount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('game.rebuy_chips')}</Label>
                    <Input
                      type="number"
                      value={defaults.default_rebuy_chips}
                      onChange={(e) => updateDefault('default_rebuy_chips', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('game.until_level')}</Label>
                    <Input
                      type="number"
                      value={defaults.default_rebuy_until_level}
                      onChange={(e) => updateDefault('default_rebuy_until_level', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Add-on Settings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('game.allow_addons')}</Label>
                <Switch
                  checked={defaults.default_allow_addons}
                  onCheckedChange={(checked) => updateDefault('default_allow_addons', checked)}
                />
              </div>
              {defaults.default_allow_addons && (
                <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-border">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('game.addon_cost')} ({currencySymbol})</Label>
                    <Input
                      type="number"
                      value={defaults.default_addon_amount}
                      onChange={(e) => updateDefault('default_addon_amount', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('game.addon_chips')}</Label>
                    <Input
                      type="number"
                      value={defaults.default_addon_chips}
                      onChange={(e) => updateDefault('default_addon_chips', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Blind Level Duration */}
            <div className="space-y-2">
              <Label>{t('club.level_duration')}</Label>
              <Select 
                value={defaults.default_level_duration.toString()} 
                onValueChange={(v) => updateDefault('default_level_duration', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 12, 15, 20, 25, 30].map(mins => (
                    <SelectItem key={mins} value={mins.toString()}>{mins} {t('common.minutes')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('club.level_duration_description')}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

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
