import { useState } from 'react';
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
import { UserAvatar } from '@/components/common/UserAvatar';

interface GamePlayer {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface CustomAddonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: GamePlayer | null;
  defaultAmount: number;
  defaultChips: number;
  currencySymbol: string;
  onConfirm: (amount: number, chips: number) => Promise<void>;
}

export function CustomAddonDialog({
  isOpen,
  onClose,
  player,
  defaultAmount,
  defaultChips,
  currencySymbol,
  onConfirm,
}: CustomAddonDialogProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [chips, setChips] = useState(defaultChips);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset values when dialog opens with new player
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setAmount(defaultAmount);
      setChips(defaultChips);
    }
    if (!open) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (amount <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(amount, chips);
      onClose();
    } catch (error) {
      console.error('Failed to add addon:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!player) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add Add-on for {player.display_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <UserAvatar 
              name={player.display_name} 
              avatarUrl={player.avatar_url}
              size="sm"
            />
            <span className="font-medium">{player.display_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ({currencySymbol})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Chips</Label>
              <Input
                type="number"
                value={chips}
                onChange={(e) => setChips(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>

          <div className="p-3 bg-primary/10 rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-bold">{currencySymbol}{amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chips received:</span>
              <span className="font-bold">{chips.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={amount <= 0 || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Add-on'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
