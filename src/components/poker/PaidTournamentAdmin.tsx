import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Props {
  onClose: () => void;
}

export function PaidTournamentAdmin({ onClose }: Props) {
  const [name, setName] = useState('');
  const [entryFee, setEntryFee] = useState('1.00');
  const [maxPlayers, setMaxPlayers] = useState('18');
  const [startingStack, setStartingStack] = useState('5000');
  const [startingSb, setStartingSb] = useState('25');
  const [startingBb, setStartingBb] = useState('50');
  const [blindInterval, setBlindInterval] = useState('15');
  const [payoutPreset, setPayoutPreset] = useState('winner_takes_all');
  const [startAt, setStartAt] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name || !startAt) { toast({ title: "Name and start time required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('paid-tournament-create', {
        body: {
          name,
          entry_fee_pence: Math.round(parseFloat(entryFee) * 100),
          max_players: parseInt(maxPlayers),
          starting_stack: parseInt(startingStack),
          starting_sb: parseInt(startingSb),
          starting_bb: parseInt(startingBb),
          blind_interval_minutes: parseInt(blindInterval),
          payout_preset: payoutPreset,
          start_at: new Date(startAt).toISOString(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Tournament created (draft)" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Create Tournament</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tournament Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Saturday Night Showdown" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entry Fee (£)</Label>
              <Input type="number" step="0.01" value={entryFee} onChange={e => setEntryFee(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Max Players</Label>
              <Input type="number" min="9" max="900" value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Starting Stack</Label>
              <Input type="number" value={startingStack} onChange={e => setStartingStack(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Starting SB</Label>
              <Input type="number" value={startingSb} onChange={e => setStartingSb(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Starting BB</Label>
              <Input type="number" value={startingBb} onChange={e => setStartingBb(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Blind Interval (mins)</Label>
              <Input type="number" value={blindInterval} onChange={e => setBlindInterval(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Payout Preset</Label>
              <Select value={payoutPreset} onValueChange={setPayoutPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="winner_takes_all">Winner Takes All</SelectItem>
                  <SelectItem value="top_2">Top 2 (70/30)</SelectItem>
                  <SelectItem value="top_3">Top 3 (60/30/10)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Start Date & Time</Label>
            <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          </div>
        </div>

        <Button className="w-full" onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating...' : 'Create Tournament'}
        </Button>
      </div>
    </div>
  );
}
