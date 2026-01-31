import { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';

interface GamePlayer {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

type TransactionType = 'buyin' | 'rebuy' | 'addon';

interface CustomTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: GamePlayer | null;
  defaultAmount: number;
  defaultChips: number;
  currencySymbol: string;
  transactionType: TransactionType;
  onConfirm: (amount: number, chips: number) => Promise<void>;
}

export function CustomTransactionDialog({
  isOpen,
  onClose,
  player,
  defaultAmount,
  defaultChips,
  currencySymbol,
  transactionType,
  onConfirm,
}: CustomTransactionDialogProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(defaultAmount);
  const [chips, setChips] = useState(defaultChips);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset values when dialog opens with new defaults
  useEffect(() => {
    if (isOpen) {
      setAmount(defaultAmount);
      setChips(defaultChips);
    }
  }, [isOpen, defaultAmount, defaultChips]);

  const handleConfirm = async () => {
    if (amount <= 0) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(amount, chips);
      onClose();
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!player) return null;

  const getTitle = () => {
    switch (transactionType) {
      case 'buyin':
        return t('game.buy_in');
      case 'rebuy':
        return t('game.rebuy');
      case 'addon':
        return t('game.addon');
      default:
        return 'Transaction';
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return `${t('common.adding')}...`;
    switch (transactionType) {
      case 'buyin':
        return `${t('common.add')} ${t('game.buy_in')}`;
      case 'rebuy':
        return `${t('common.add')} ${t('game.rebuy')}`;
      case 'addon':
        return `${t('common.add')} ${t('game.addon')}`;
      default:
        return t('common.add');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {getTitle()} - {player.display_name}
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
              <Label>{t('game.amount')} ({currencySymbol})</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('game.chips')}</Label>
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
              <span className="text-muted-foreground">{t('game.cost')}:</span>
              <span className="font-bold">{currencySymbol}{amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('game.chips_received')}:</span>
              <span className="font-bold">{chips.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={amount <= 0 || isSubmitting}
          >
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
