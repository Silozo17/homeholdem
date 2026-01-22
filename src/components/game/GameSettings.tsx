import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface BlindLevel {
  id: string;
  level: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: boolean;
}

interface GameSession {
  id: string;
  buy_in_amount: number;
  rebuy_amount: number;
  addon_amount: number;
  starting_chips: number;
  rebuy_chips: number;
  addon_chips: number;
  allow_rebuys: boolean;
  allow_addons: boolean;
  rebuy_until_level: number | null;
}

interface GameSettingsProps {
  session: GameSession;
  blindStructure: BlindLevel[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function GameSettings({ 
  session, 
  blindStructure, 
  isOpen, 
  onClose, 
  onUpdate 
}: GameSettingsProps) {
  const [settings, setSettings] = useState({
    buy_in_amount: session.buy_in_amount,
    rebuy_amount: session.rebuy_amount,
    addon_amount: session.addon_amount,
    starting_chips: session.starting_chips,
    rebuy_chips: session.rebuy_chips,
    addon_chips: session.addon_chips,
    allow_rebuys: session.allow_rebuys,
    allow_addons: session.allow_addons,
    rebuy_until_level: session.rebuy_until_level || 4,
  });

  const [blinds, setBlinds] = useState(blindStructure);

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('game_sessions')
      .update({
        buy_in_amount: settings.buy_in_amount,
        rebuy_amount: settings.rebuy_amount,
        addon_amount: settings.addon_amount,
        starting_chips: settings.starting_chips,
        rebuy_chips: settings.rebuy_chips,
        addon_chips: settings.addon_chips,
        allow_rebuys: settings.allow_rebuys,
        allow_addons: settings.allow_addons,
        rebuy_until_level: settings.rebuy_until_level,
      })
      .eq('id', session.id);

    if (error) {
      toast.error('Failed to save settings');
      return;
    }

    toast.success('Settings saved');
    onUpdate();
    onClose();
  };

  const handleUpdateBlind = async (blindId: string, field: string, value: number | boolean) => {
    const { error } = await supabase
      .from('blind_structures')
      .update({ [field]: value })
      .eq('id', blindId);

    if (error) {
      toast.error('Failed to update blind level');
      return;
    }

    setBlinds(prev => prev.map(b => 
      b.id === blindId ? { ...b, [field]: value } : b
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tournament Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="buyins" className="mt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="buyins">Buy-ins</TabsTrigger>
            <TabsTrigger value="blinds">Blinds</TabsTrigger>
          </TabsList>

          <TabsContent value="buyins" className="space-y-4 mt-4">
            {/* Buy-in Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buy-in ($)</Label>
                <Input
                  type="number"
                  value={settings.buy_in_amount}
                  onChange={(e) => setSettings(s => ({ 
                    ...s, 
                    buy_in_amount: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Starting Chips</Label>
                <Input
                  type="number"
                  value={settings.starting_chips}
                  onChange={(e) => setSettings(s => ({ 
                    ...s, 
                    starting_chips: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            {/* Rebuy Settings */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Allow Rebuys</Label>
                <p className="text-xs text-muted-foreground">Players can rebuy chips</p>
              </div>
              <Switch
                checked={settings.allow_rebuys}
                onCheckedChange={(v) => setSettings(s => ({ ...s, allow_rebuys: v }))}
              />
            </div>

            {settings.allow_rebuys && (
              <div className="grid grid-cols-3 gap-4 pl-4">
                <div className="space-y-2">
                  <Label>Rebuy ($)</Label>
                  <Input
                    type="number"
                    value={settings.rebuy_amount}
                    onChange={(e) => setSettings(s => ({ 
                      ...s, 
                      rebuy_amount: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chips</Label>
                  <Input
                    type="number"
                    value={settings.rebuy_chips}
                    onChange={(e) => setSettings(s => ({ 
                      ...s, 
                      rebuy_chips: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Until Level</Label>
                  <Input
                    type="number"
                    value={settings.rebuy_until_level}
                    onChange={(e) => setSettings(s => ({ 
                      ...s, 
                      rebuy_until_level: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Add-on Settings */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Allow Add-ons</Label>
                <p className="text-xs text-muted-foreground">Players can buy additional chips</p>
              </div>
              <Switch
                checked={settings.allow_addons}
                onCheckedChange={(v) => setSettings(s => ({ ...s, allow_addons: v }))}
              />
            </div>

            {settings.allow_addons && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <Label>Add-on ($)</Label>
                  <Input
                    type="number"
                    value={settings.addon_amount}
                    onChange={(e) => setSettings(s => ({ 
                      ...s, 
                      addon_amount: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chips</Label>
                  <Input
                    type="number"
                    value={settings.addon_chips}
                    onChange={(e) => setSettings(s => ({ 
                      ...s, 
                      addon_chips: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blinds" className="space-y-4 mt-4">
            <div className="text-xs text-muted-foreground mb-2">
              Tap any value to edit. Changes save automatically.
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {blinds.map((blind) => (
                <div 
                  key={blind.id}
                  className={`grid grid-cols-5 gap-2 p-2 rounded text-sm ${
                    blind.is_break ? 'bg-yellow-500/10' : 'bg-muted/20'
                  }`}
                >
                  <div className="font-medium">
                    {blind.is_break ? 'Break' : `L${blind.level}`}
                  </div>
                  {!blind.is_break ? (
                    <>
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        value={blind.small_blind}
                        onChange={(e) => handleUpdateBlind(blind.id, 'small_blind', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        value={blind.big_blind}
                        onChange={(e) => handleUpdateBlind(blind.id, 'big_blind', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        className="h-7 text-xs"
                        value={blind.ante}
                        onChange={(e) => handleUpdateBlind(blind.id, 'ante', parseInt(e.target.value) || 0)}
                      />
                    </>
                  ) : (
                    <div className="col-span-3 text-muted-foreground">—</div>
                  )}
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={blind.duration_minutes}
                    onChange={(e) => handleUpdateBlind(blind.id, 'duration_minutes', parseInt(e.target.value) || 1)}
                  />
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground grid grid-cols-5 gap-2 px-2">
              <span>Level</span>
              <span>SB</span>
              <span>BB</span>
              <span>Ante</span>
              <span>Mins</span>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
