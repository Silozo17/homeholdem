import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notifyPokerInvite } from '@/lib/push-notifications';
import { Check, Send, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ClubMember {
  id: string;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
}

interface InvitePlayersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  tableName: string;
  clubId?: string | null;
}

export function InvitePlayersDialog({ open, onOpenChange, tableId, tableName, clubId }: InvitePlayersDialogProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [inviterName, setInviterName] = useState('Someone');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setSentTo(new Set());
    fetchMembers();
    supabase.from('profiles').select('display_name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.display_name) setInviterName(data.display_name); });
  }, [open, user, clubId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      if (clubId) {
        const { data } = await supabase.rpc('get_club_member_profiles', { _club_id: clubId });
        setMembers((data || []).filter((m: ClubMember) => m.id !== user?.id));
      } else {
        const { data: myClubs } = await supabase
          .from('club_members')
          .select('club_id')
          .eq('user_id', user!.id);

        if (!myClubs?.length) { setMembers([]); return; }

        const allMembers: ClubMember[] = [];
        const seenIds = new Set<string>();

        for (const club of myClubs) {
          const { data } = await supabase.rpc('get_club_member_profiles', { _club_id: club.club_id });
          (data || []).forEach((m: ClubMember) => {
            if (m.id !== user?.id && !seenIds.has(m.id)) {
              seenIds.add(m.id);
              allMembers.push(m);
            }
          });
        }
        setMembers(allMembers);
      }
    } catch {
      toast({ title: t('poker_invite.failed_load'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(memberId: string) {
    setSending(memberId);
    try {
      await notifyPokerInvite(memberId, inviterName, tableName, tableId);
      setSentTo(prev => new Set(prev).add(memberId));
      toast({ title: t('poker_invite.invite_sent') });
    } catch {
      toast({ title: t('poker_invite.failed_send'), variant: 'destructive' });
    } finally {
      setSending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[70] [&~*]:z-[70]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('poker_invite.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('poker_invite.no_members')}
            </p>
          ) : (
            members.map(member => {
              const isSent = sentTo.has(member.id);
              const isSending = sending === member.id;
              return (
                <div key={member.id} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={member.display_name}
                      avatarUrl={member.avatar_url}
                      size="sm"
                    />
                    <span className="text-sm font-medium truncate">{member.display_name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={isSent ? 'ghost' : 'default'}
                    disabled={isSent || isSending}
                    onClick={() => handleInvite(member.id)}
                    className="shrink-0 h-8 px-3"
                  >
                    {isSent ? (
                      <><Check className="h-3.5 w-3.5 mr-1" /> {t('poker_invite.sent')}</>
                    ) : isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1" /> {t('poker_invite.invite')}</>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
