import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface HostAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (address: string) => void;
  loading?: boolean;
}

export function HostAddressDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: HostAddressDialogProps) {
  const { t } = useTranslation();
  const [address, setAddress] = useState('');

  const handleSubmit = () => {
    if (address.trim()) {
      onSubmit(address.trim());
      setAddress('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setAddress('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('host.enter_address')}
          </DialogTitle>
          <DialogDescription>
            {t('host.address_hidden_until_confirmed')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="address">{t('host.your_address')}</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('host.address_placeholder')}
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {address.length}/200
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!address.trim() || loading}
          >
            {loading ? t('common.saving') : t('host.volunteer_to_host')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
