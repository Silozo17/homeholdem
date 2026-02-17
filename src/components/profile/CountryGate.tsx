import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CountrySelector } from './CountrySelector';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';

export function CountryGate() {
  const { user, loading } = useAuth();
  const [needsCountry, setNeedsCountry] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    const check = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('id', user.id)
        .single();

      if (data && !data.country_code) {
        setNeedsCountry(true);
      }
      setChecked(true);
    };

    check();
  }, [user, loading]);

  if (!checked || !needsCountry) return null;

  const handleConfirm = async () => {
    if (!selectedCode || !user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ country_code: selectedCode })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save country');
      return;
    }

    setNeedsCountry(false);
    toast.success('Country saved!');
  };

  return (
    <Dialog open={needsCountry}>
      <DialogContent
        className="sm:max-w-[380px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        // Hide close button via removing the default X
        hideCloseButton
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Select your country</DialogTitle>
          <DialogDescription className="text-center">
            Your flag will be shown next to your name at the poker table.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <CountrySelector
            value={selectedCode}
            onChange={setSelectedCode}
            className="w-full"
          />

          <Button
            className="w-full"
            disabled={!selectedCode || saving}
            onClick={handleConfirm}
          >
            {saving ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
