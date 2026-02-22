import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/common/LevelBadge';
import { CountryFlag } from '@/components/poker/CountryFlag';
import { MessageSquare, UserPlus, UserCheck, Clock, UserX, Trophy, Gamepad2 } from 'lucide-react';
import { FriendshipStatus } from '@/hooks/useFriendship';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface PlayerProfileDrawerProps {
  playerId: string | null;
  onClose: () => void;
  isCreator?: boolean;
  canKick?: boolean;
  onKick?: (playerId: string) => void;
}

interface ProfileData {
  display_name: string;
  avatar_url: string | null;
  country_code: string | null;
}

export function PlayerProfileDrawer({ playerId, onClose, isCreator, canKick, onKick }: PlayerProfileDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [level, setLevel] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [wins, setWins] = useState(0);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const open = !!playerId && playerId !== user?.id;

  useEffect(() => {
    if (!playerId || playerId === user?.id) return;
    setLoading(true);

    Promise.all([
      supabase.from('profiles').select('display_name, avatar_url, country_code').eq('id', playerId).single(),
      supabase.from('player_xp').select('level').eq('user_id', playerId).maybeSingle(),
      supabase.from('placeholder_players').select('id').eq('linked_user_id', playerId),
      supabase.from('game_players').select('id, finish_position').eq('user_id', playerId),
      user ? supabase.from('friendships').select('*')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${playerId}),and(requester_id.eq.${playerId},addressee_id.eq.${user.id})`)
        .maybeSingle() : Promise.resolve({ data: null }),
    ]).then(async ([profileRes, xpRes, placeholderRes, gamesRes, friendRes]) => {
      if (profileRes.data) setProfile(profileRes.data);
      setLevel(xpRes.data?.level ?? 0);
      
      let allGames = gamesRes.data ?? [];
      
      const placeholderIds = (placeholderRes.data ?? []).map((p: any) => p.id);
      if (placeholderIds.length > 0) {
        const { data: placeholderGames } = await supabase
          .from('game_players')
          .select('id, finish_position')
          .in('placeholder_player_id', placeholderIds);
        if (placeholderGames) {
          const existingIds = new Set(allGames.map(g => g.id));
          for (const g of placeholderGames) {
            if (!existingIds.has(g.id)) allGames.push(g);
          }
        }
      }
      
      setGamesPlayed(allGames.length);
      setWins(allGames.filter(g => g.finish_position === 1).length);

      if (friendRes.data) {
        setFriendshipId(friendRes.data.id);
        if (friendRes.data.status === 'accepted') setFriendshipStatus('accepted');
        else if (friendRes.data.status === 'pending') {
          setFriendshipStatus(friendRes.data.requester_id === user?.id ? 'pending_sent' : 'pending_received');
        } else setFriendshipStatus('none');
      } else {
        setFriendshipId(null);
        setFriendshipStatus('none');
      }
      setLoading(false);
    });
  }, [playerId, user]);

  const handleFriendAction = async () => {
    if (!user || !playerId) return;
    if (friendshipStatus === 'none') {
      await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: playerId });
      setFriendshipStatus('pending_sent');
      toast({ title: t('poker_profile.friend_request_sent') });
    } else if (friendshipStatus === 'pending_received' && friendshipId) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      setFriendshipStatus('accepted');
      toast({ title: t('poker_profile.friend_request_accepted') });
    } else if ((friendshipStatus === 'accepted' || friendshipStatus === 'pending_sent') && friendshipId) {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      setFriendshipStatus('none');
      setFriendshipId(null);
      toast({ title: friendshipStatus === 'accepted' ? t('poker_profile.friend_removed') : t('poker_profile.request_cancelled') });
    }
  };

  const friendButtonLabel = {
    none: t('poker_profile.add_friend'),
    pending_sent: t('poker_profile.request_sent'),
    pending_received: t('poker_profile.accept_request'),
    accepted: t('poker_profile.friends'),
  }[friendshipStatus];

  const friendButtonIcon = {
    none: <UserPlus className="h-4 w-4" />,
    pending_sent: <Clock className="h-4 w-4" />,
    pending_received: <UserCheck className="h-4 w-4" />,
    accepted: <UserCheck className="h-4 w-4" />,
  }[friendshipStatus];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="left" className="w-[300px] sm:w-[340px] bg-card border-border/50 p-0 z-[70]" overlayClassName="z-[70]">
        {profile && !loading ? (
          <div className="flex flex-col h-full">
            <div className="p-6 pb-4 border-b border-border/50" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
              <SheetHeader className="mb-4">
                <SheetTitle className="sr-only">{t('poker_profile.title')}</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-primary/30">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-secondary text-lg font-bold">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {level > 0 && (
                    <div className="absolute -bottom-1 -left-1">
                      <LevelBadge level={level} size="lg" />
                    </div>
                  )}
                  {profile.country_code && (
                    <div className="absolute -bottom-1 -right-1">
                      <CountryFlag countryCode={profile.country_code} size="lg" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{profile.display_name}</h3>
                  {level > 0 && <p className="text-xs text-muted-foreground">{t('poker_profile.level')} {level}</p>}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-border/50">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Gamepad2 className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{gamesPlayed}</p>
                    <p className="text-[10px] text-muted-foreground">{t('poker_profile.games')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                  <Trophy className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{wins}</p>
                    <p className="text-[10px] text-muted-foreground">{t('poker_profile.wins')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-2 flex-1">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onClose();
                  navigate(`/inbox?user=${playerId}`);
                }}
              >
                <MessageSquare className="h-4 w-4" />
                {t('poker_profile.send_message')}
              </Button>

              <Button
                variant={friendshipStatus === 'accepted' ? 'secondary' : friendshipStatus === 'pending_received' ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={handleFriendAction}
              >
                {friendButtonIcon}
                {friendButtonLabel}
              </Button>

              {isCreator && canKick && playerId && onKick && (
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2 mt-4"
                  onClick={() => {
                    onKick(playerId);
                    onClose();
                  }}
                >
                  <UserX className="h-4 w-4" />
                  {t('poker_profile.kick_player')}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground text-sm">{t('poker_profile.loading')}</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
