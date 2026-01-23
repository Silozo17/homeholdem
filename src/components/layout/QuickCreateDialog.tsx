import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreateClubDialog } from '@/components/clubs/CreateClubDialog';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClubOption {
  id: string;
  name: string;
}

export function QuickCreateDialog({ open, onOpenChange }: QuickCreateDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminClubs, setAdminClubs] = useState<ClubOption[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [createClubOpen, setCreateClubOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [mode, setMode] = useState<'select' | 'club' | 'event'>('select');

  useEffect(() => {
    if (open && user) {
      fetchAdminClubs();
    }
  }, [open, user]);

  const fetchAdminClubs = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('club_members')
      .select('club_id, role, clubs(id, name)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin']);

    if (data) {
      const clubs = data
        .filter(m => m.clubs)
        .map(m => ({
          id: (m.clubs as any).id,
          name: (m.clubs as any).name,
        }));
      setAdminClubs(clubs);
      if (clubs.length === 1) {
        setSelectedClubId(clubs[0].id);
      }
    }
  };

  const handleClubCreated = () => {
    setCreateClubOpen(false);
    onOpenChange(false);
    navigate('/dashboard');
  };

  const handleEventCreated = () => {
    setCreateEventOpen(false);
    onOpenChange(false);
    if (selectedClubId) {
      navigate(`/club/${selectedClubId}`);
    }
  };

  const handleCreateEvent = () => {
    if (adminClubs.length === 0) {
      // No clubs where user is admin - prompt to create club first
      setMode('club');
      return;
    }
    setMode('event');
  };

  const handleStartEventCreation = () => {
    if (!selectedClubId) return;
    setCreateEventOpen(true);
    onOpenChange(false);
    setMode('select');
  };

  const handleClose = () => {
    onOpenChange(false);
    setMode('select');
    setSelectedClubId('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gold-gradient">
              {mode === 'select' && t('quick_create.title')}
              {mode === 'club' && t('quick_create.create_club_first')}
              {mode === 'event' && t('quick_create.select_club')}
            </DialogTitle>
          </DialogHeader>

          {mode === 'select' && (
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full h-16 justify-between border-border hover:bg-secondary"
                onClick={() => {
                  setCreateClubOpen(true);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{t('quick_create.new_club')}</div>
                    <div className="text-xs text-muted-foreground">{t('quick_create.new_club_desc')}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 justify-between border-border hover:bg-secondary"
                onClick={handleCreateEvent}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{t('quick_create.new_event')}</div>
                    <div className="text-xs text-muted-foreground">{t('quick_create.new_event_desc')}</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          )}

          {mode === 'club' && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {t('quick_create.need_admin')}
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setCreateClubOpen(true);
                  onOpenChange(false);
                  setMode('select');
                }}
              >
                <Users className="mr-2 h-4 w-4" /> {t('club.create')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode('select')}
              >
                {t('common.back')}
              </Button>
            </div>
          )}

          {mode === 'event' && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('quick_create.which_club')}</label>
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder={t('quick_create.select_club_placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((club) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setMode('select')}
                >
                  {t('common.back')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleStartEventCreation}
                  disabled={!selectedClubId}
                >
                  {t('common.continue')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateClubDialog
        open={createClubOpen}
        onOpenChange={setCreateClubOpen}
        onSuccess={handleClubCreated}
      />

      {selectedClubId && (
        <CreateEventDialog
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          clubId={selectedClubId}
          clubName={adminClubs.find(c => c.id === selectedClubId)?.name || ''}
          onSuccess={handleEventCreated}
        />
      )}
    </>
  );
}
