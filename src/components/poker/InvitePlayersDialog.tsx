import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/common/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { notifyPokerInvite } from '@/lib/push-notifications';
import { Check, Send, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [inviterName, setInviterName] = useState('Someone');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setSentTo(new Set());
    fetchMembers();
    // Fetch display name
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
        // Get all clubs the user belongs to, then fetch members
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
      toast({ title: 'Failed to load members', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(memberId: string) {
    setSending(memberId);
    try {
      await notifyPokerInvite(memberId, inviterName, tableName, tableId);
      await notifyPokerInvite(memberId, inviterName, tableName, tableId);
      setSentTo(prev => new Set(prev).add(memberId));
      toast({ title: 'Invite sent!' });
    } catch {
      toast({ title: 'Failed to send invite', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Invite Players
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No club members to invite. Join a club first!
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
                      <><Check className="h-3.5 w-3.5 mr-1" /> Sent</>
                    ) : isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <><Send className="h-3.5 w-3.5 mr-1" /> Invite</>
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
