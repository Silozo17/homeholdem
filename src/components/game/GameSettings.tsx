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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, MoreVertical, Coffee, Trash2, HelpCircle } from 'lucide-react';

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
  currencySymbol: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const BLIND_TOOLTIPS = {
  sb: 'Small Blind - A forced bet by the player directly left of the dealer button, typically half the big blind.',
  bb: 'Big Blind - A forced bet by the player two seats left of the dealer, setting the minimum bet for the round.',
  ante: 'Ante - A small forced bet from ALL players before each hand, used to build the pot faster in later levels.',
  mins: 'Minutes - Duration of this blind level before automatically advancing to the next level.',
};

export function GameSettings({ 
  session, 
  blindStructure, 
  currencySymbol,
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

  const [blinds, setBlinds] = useState<BlindLevel[]>(blindStructure);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

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
    // Update local state immediately
    setBlinds(prev => prev.map(b => 
      b.id === blindId ? { ...b, [field]: value } : b
    ));

    // If it's a new level (not in DB yet), just track locally
    if (blindId.startsWith('new-')) {
      setPendingChanges(prev => new Set(prev).add(blindId));
      return;
    }

    // Persist existing levels immediately
    const { error } = await supabase
      .from('blind_structures')
      .update({ [field]: value })
      .eq('id', blindId);

    if (error) {
      toast.error('Failed to update blind level');
    }
  };

  const handleAddLevel = async () => {
    const lastLevel = blinds.filter(b => !b.is_break).pop();
    const maxLevel = Math.max(...blinds.filter(b => !b.is_break).map(b => b.level), 0);
    
    const newBlind: BlindLevel = {
      id: `new-${Date.now()}`,
      level: maxLevel + 1,
      small_blind: lastLevel ? lastLevel.small_blind * 2 : 25,
      big_blind: lastLevel ? lastLevel.big_blind * 2 : 50,
      ante: lastLevel ? lastLevel.ante * 2 : 0,
      duration_minutes: lastLevel?.duration_minutes || 15,
      is_break: false,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('blind_structures')
      .insert({
        game_session_id: session.id,
        level: newBlind.level,
        small_blind: newBlind.small_blind,
        big_blind: newBlind.big_blind,
        ante: newBlind.ante,
        duration_minutes: newBlind.duration_minutes,
        is_break: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add level');
      return;
    }

    setBlinds(prev => [...prev, { ...newBlind, id: data.id }]);
    toast.success('Level added');
  };

  const handleAddBreak = async () => {
    const maxLevel = Math.max(...blinds.map(b => b.level), 0);
    
    const newBreak: BlindLevel = {
      id: `new-${Date.now()}`,
      level: maxLevel + 1,
      small_blind: 0,
      big_blind: 0,
      ante: 0,
      duration_minutes: 10,
      is_break: true,
    };

    // Insert into database
    const { data, error } = await supabase
      .from('blind_structures')
      .insert({
        game_session_id: session.id,
        level: newBreak.level,
        small_blind: 0,
        big_blind: 0,
        ante: 0,
        duration_minutes: newBreak.duration_minutes,
        is_break: true,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add break');
      return;
    }

    setBlinds(prev => [...prev, { ...newBreak, id: data.id }]);
    toast.success('Break added');
  };

  const handleDeleteLevel = async (blindId: string) => {
    if (blindId.startsWith('new-')) {
      setBlinds(prev => prev.filter(b => b.id !== blindId));
      return;
    }

    const { error } = await supabase
      .from('blind_structures')
      .delete()
      .eq('id', blindId);

    if (error) {
      toast.error('Failed to delete level');
      return;
    }

    setBlinds(prev => prev.filter(b => b.id !== blindId));
    toast.success('Level deleted');
  };

  const handleToggleBreak = async (blindId: string, currentIsBreak: boolean) => {
    const newIsBreak = !currentIsBreak;
    
    if (blindId.startsWith('new-')) {
      setBlinds(prev => prev.map(b => 
        b.id === blindId ? { 
          ...b, 
          is_break: newIsBreak,
          small_blind: newIsBreak ? 0 : 25,
          big_blind: newIsBreak ? 0 : 50,
          ante: 0,
        } : b
      ));
      return;
    }

    const { error } = await supabase
      .from('blind_structures')
      .update({ 
        is_break: newIsBreak,
        small_blind: newIsBreak ? 0 : 25,
        big_blind: newIsBreak ? 0 : 50,
        ante: 0,
      })
      .eq('id', blindId);

    if (error) {
      toast.error('Failed to update level');
      return;
    }

    setBlinds(prev => prev.map(b => 
      b.id === blindId ? { 
        ...b, 
        is_break: newIsBreak,
        small_blind: newIsBreak ? 0 : 25,
        big_blind: newIsBreak ? 0 : 50,
        ante: 0,
      } : b
    ));
  };

  // Sort blinds by level
  const sortedBlinds = [...blinds].sort((a, b) => a.level - b.level);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
                <Label>Buy-in ({currencySymbol})</Label>
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
                  <Label>Rebuy ({currencySymbol})</Label>
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
                  <Label>Add-on ({currencySymbol})</Label>
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
            {/* Header with Tooltips */}
            <TooltipProvider>
              <div className="grid grid-cols-6 gap-1 px-2 text-xs text-muted-foreground font-medium">
                <span>Level</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      SB <HelpCircle className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{BLIND_TOOLTIPS.sb}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      BB <HelpCircle className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{BLIND_TOOLTIPS.bb}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      Ante <HelpCircle className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{BLIND_TOOLTIPS.ante}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 cursor-help">
                      Mins <HelpCircle className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{BLIND_TOOLTIPS.mins}</p>
                  </TooltipContent>
                </Tooltip>
                <span></span>
              </div>
            </TooltipProvider>

            {/* Blind levels list */}
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {sortedBlinds.map((blind) => (
                <div 
                  key={blind.id}
                  className={`grid grid-cols-6 gap-1 p-2 rounded text-sm items-center ${
                    blind.is_break 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="font-medium flex items-center gap-1">
                    {blind.is_break ? (
                      <>
                        <Coffee className="h-3 w-3 text-primary" />
                        <span className="text-primary">Break</span>
                      </>
                    ) : (
                      `L${blind.level}`
                    )}
                  </div>
                  
                  {!blind.is_break ? (
                    <>
                      <Input
                        type="number"
                        className="h-8 text-xs px-2"
                        value={blind.small_blind}
                        onChange={(e) => handleUpdateBlind(blind.id, 'small_blind', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        className="h-8 text-xs px-2"
                        value={blind.big_blind}
                        onChange={(e) => handleUpdateBlind(blind.id, 'big_blind', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        className="h-8 text-xs px-2"
                        value={blind.ante}
                        onChange={(e) => handleUpdateBlind(blind.id, 'ante', parseInt(e.target.value) || 0)}
                      />
                    </>
                  ) : (
                    <div className="col-span-3 text-muted-foreground text-center">—</div>
                  )}
                  
                  <Input
                    type="number"
                    className="h-8 text-xs px-2"
                    value={blind.duration_minutes}
                    onChange={(e) => handleUpdateBlind(blind.id, 'duration_minutes', parseInt(e.target.value) || 1)}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleBreak(blind.id, blind.is_break)}>
                        <Coffee className="mr-2 h-4 w-4" />
                        {blind.is_break ? 'Convert to Level' : 'Convert to Break'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteLevel(blind.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>

            {/* Add buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLevel}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Level
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBreak}
                className="gap-1"
              >
                <Coffee className="h-4 w-4" />
                Add Break
              </Button>
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
