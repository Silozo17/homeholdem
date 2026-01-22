import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Coins } from 'lucide-react';

interface ChipDenomination {
  id: string;
  denomination: number;
  color: string;
  cash_value: number;
  display_order: number;
}

interface ChipTemplate {
  id: string;
  name: string;
  currency: string;
  is_active: boolean;
}

interface ChipTemplateManagerProps {
  clubId: string;
  isAdmin: boolean;
}

const CHIP_COLORS = [
  { value: 'white', label: 'White', hex: '#E5E7EB' },
  { value: 'red', label: 'Red', hex: '#DC2626' },
  { value: 'orange', label: 'Orange', hex: '#F97316' },
  { value: 'yellow', label: 'Yellow', hex: '#EAB308' },
  { value: 'green', label: 'Green', hex: '#84CC16' },
  { value: 'blue', label: 'Blue', hex: '#2563EB' },
  { value: 'purple', label: 'Purple', hex: '#7C3AED' },
  { value: 'pink', label: 'Pink', hex: '#EC4899' },
  { value: 'black', label: 'Black', hex: '#374151' },
  { value: 'grey', label: 'Grey', hex: '#6B7280' },
];

const CURRENCIES = [
  { value: 'GBP', label: '£ GBP', symbol: '£' },
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'EUR', label: '€ EUR', symbol: '€' },
];

export function ChipTemplateManager({ clubId, isAdmin }: ChipTemplateManagerProps) {
  const [template, setTemplate] = useState<ChipTemplate | null>(null);
  const [denominations, setDenominations] = useState<ChipDenomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchChipTemplate();
  }, [clubId]);

  const fetchChipTemplate = async () => {
    setLoading(true);
    
    // Fetch active template for this club
    const { data: templateData, error: templateError } = await supabase
      .from('chip_templates')
      .select('*')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .single();

    if (templateError && templateError.code !== 'PGRST116') {
      console.error('Error fetching template:', templateError);
      setLoading(false);
      return;
    }

    if (templateData) {
      setTemplate(templateData);
      
      // Fetch denominations for this template
      const { data: denomData } = await supabase
        .from('chip_denominations')
        .select('*')
        .eq('template_id', templateData.id)
        .order('display_order');

      if (denomData) {
        setDenominations(denomData.map(d => ({
          ...d,
          cash_value: Number(d.cash_value)
        })));
      }
    }
    
    setLoading(false);
  };

  const getColorInfo = (colorValue: string) => {
    return CHIP_COLORS.find(c => c.value === colorValue) || CHIP_COLORS[0];
  };

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.value === template?.currency);
    return curr?.symbol || '£';
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!template || !isAdmin) return;
    
    const { error } = await supabase
      .from('chip_templates')
      .update({ currency: newCurrency })
      .eq('id', template.id);

    if (error) {
      toast.error('Failed to update currency');
      return;
    }

    setTemplate({ ...template, currency: newCurrency });
    toast.success('Currency updated');
  };

  const handleDenominationChange = (id: string, field: keyof ChipDenomination, value: string | number) => {
    setDenominations(prev => 
      prev.map(d => d.id === id ? { ...d, [field]: value } : d)
    );
    setHasChanges(true);
  };

  const handleAddDenomination = () => {
    const maxOrder = Math.max(...denominations.map(d => d.display_order), 0);
    const usedColors = denominations.map(d => d.color);
    const availableColor = CHIP_COLORS.find(c => !usedColors.includes(c.value))?.value || 'white';
    
    const newDenom: ChipDenomination = {
      id: `new-${Date.now()}`,
      denomination: 50,
      color: availableColor,
      cash_value: 5.00,
      display_order: maxOrder + 1,
    };
    
    setDenominations([...denominations, newDenom]);
    setHasChanges(true);
  };

  const handleRemoveDenomination = (id: string) => {
    setDenominations(prev => prev.filter(d => d.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!template || !isAdmin) return;
    setSaving(true);

    try {
      // Get existing denomination IDs
      const { data: existingDenoms } = await supabase
        .from('chip_denominations')
        .select('id')
        .eq('template_id', template.id);

      const existingIds = existingDenoms?.map(d => d.id) || [];
      const currentIds = denominations.filter(d => !d.id.startsWith('new-')).map(d => d.id);
      
      // Delete removed denominations
      const toDelete = existingIds.filter(id => !currentIds.includes(id));
      if (toDelete.length > 0) {
        await supabase
          .from('chip_denominations')
          .delete()
          .in('id', toDelete);
      }

      // Upsert denominations
      for (const denom of denominations) {
        if (denom.id.startsWith('new-')) {
          // Insert new
          await supabase
            .from('chip_denominations')
            .insert({
              template_id: template.id,
              denomination: denom.denomination,
              color: denom.color,
              cash_value: denom.cash_value,
              display_order: denom.display_order,
            });
        } else {
          // Update existing
          await supabase
            .from('chip_denominations')
            .update({
              denomination: denom.denomination,
              color: denom.color,
              cash_value: denom.cash_value,
              display_order: denom.display_order,
            })
            .eq('id', denom.id);
        }
      }

      toast.success('Chip values saved');
      setHasChanges(false);
      fetchChipTemplate(); // Refresh to get new IDs
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save chip values');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center py-4">
            No chip template found for this club.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className="h-5 w-5" />
          Chip Values
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currency selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Currency:</span>
          {isAdmin ? (
            <Select value={template.currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(curr => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary">
              {CURRENCIES.find(c => c.value === template.currency)?.label}
            </Badge>
          )}
        </div>

        {/* Denominations list */}
        <div className="space-y-2">
          {denominations
            .sort((a, b) => a.display_order - b.display_order)
            .map((denom) => {
              const colorInfo = getColorInfo(denom.color);
              return (
                <div
                  key={denom.id}
                  className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50"
                >
                  {isAdmin ? (
                    <>
                      {/* Row 1: Chip + Colour */}
                      <div className="flex items-center gap-3">
                        <div
                          className="poker-chip w-8 h-8 shrink-0"
                          style={{ '--chip-color': colorInfo.hex } as React.CSSProperties}
                        >
                          <span className="poker-chip-value text-xs">{denom.denomination}</span>
                        </div>
                        <Select
                          value={denom.color}
                          onValueChange={(v) => handleDenominationChange(denom.id, 'color', v)}
                        >
                          <SelectTrigger className="w-28 h-9">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: colorInfo.hex }}
                              />
                              <span className="text-sm">{colorInfo.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {CHIP_COLORS.map(color => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Row 2: Denomination = £ Value + Delete */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={denom.denomination}
                          onChange={(e) => handleDenominationChange(denom.id, 'denomination', parseInt(e.target.value) || 0)}
                          className="w-24 h-9 text-center"
                          min={1}
                        />
                        <span className="text-muted-foreground">=</span>
                        <span className="text-muted-foreground">{getCurrencySymbol()}</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={denom.cash_value}
                          onChange={(e) => handleDenominationChange(denom.id, 'cash_value', parseFloat(e.target.value) || 0)}
                          className="w-20 h-9"
                          min={0}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDenomination(denom.id)}
                          className="shrink-0 text-destructive hover:text-destructive h-9 w-9 ml-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div
                        className="poker-chip w-8 h-8 shrink-0"
                        style={{ '--chip-color': colorInfo.hex } as React.CSSProperties}
                      >
                        <span className="poker-chip-value text-xs">{denom.denomination}</span>
                      </div>
                      <span className="capitalize text-sm">{denom.color}</span>
                      <span className="text-muted-foreground text-sm">({denom.denomination})</span>
                      <span className="ml-auto font-medium text-sm">
                        {getCurrencySymbol()}{denom.cash_value.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddDenomination}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Chip
            </Button>
            
            {hasChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1 ml-auto"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
