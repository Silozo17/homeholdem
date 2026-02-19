import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/layout/Logo';
import { Plus, Users, Crown } from 'lucide-react';
import { CreateClubDialog } from '@/components/clubs/CreateClubDialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { HeaderSocialIcons } from '@/components/layout/HeaderSocialIcons';
import { JoinClubDialog } from '@/components/clubs/JoinClubDialog';
import { ClubCard } from '@/components/clubs/ClubCard';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { HeroSection } from '@/components/home/HeroSection';
import { GameModesGrid } from '@/components/home/GameModesGrid';
import { QuickStatsStrip } from '@/components/home/QuickStatsStrip';
import { UpcomingEventBanner } from '@/components/home/UpcomingEventBanner';
import { toast } from 'sonner';
import { SuitRow } from '@/components/common/CardSuits';

interface ClubWithRole {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  role: 'owner' | 'admin' | 'member';
  member_count: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { isActive, loading: subscriptionLoading, refetch: refetchSubscription } = useSubscription();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState<ClubWithRole[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [processingInvite, setProcessingInvite] = useState(false);
  const [displayName, setDisplayName] = useState('Player');
  const [upcomingEvent, setUpcomingEvent] = useState<any>(null);
  const [playerStats, setPlayerStats] = useState({ wins: 0, gamesPlayed: 0, netProfit: '0' });
  
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  useEffect(() => {
    if (user) setWasAuthenticated(true);
  }, [user]);

  // Handle subscription URL params
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      toast.success(t('subscription.subscription_success'));
      refetchSubscription();
      searchParams.delete('subscription');
      setSearchParams(searchParams);
    } else if (subscriptionStatus === 'canceled') {
      toast.info(t('subscription.subscription_canceled'));
      searchParams.delete('subscription');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, t, refetchSubscription]);

  useEffect(() => {
    if (!loading && !user && !wasAuthenticated) {
      navigate('/');
    }
  }, [user, loading, navigate, wasAuthenticated]);

  // Fetch display name
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [user]);

  // Fetch upcoming event
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberships } = await supabase
        .from('club_members')
        .select('club_id, club:clubs(name)')
        .eq('user_id', user.id);
      if (!memberships?.length) return;

      const clubIds = memberships.map(m => m.club_id);
      const { data: events } = await supabase
        .from('events')
        .select('id, title, final_date, club_id')
        .in('club_id', clubIds)
        .gte('final_date', new Date().toISOString())
        .order('final_date', { ascending: true })
        .limit(1);

      if (events?.[0]) {
        const club = memberships.find(m => m.club_id === events[0].club_id);
        const clubData = club?.club as { name: string } | undefined;
        setUpcomingEvent({
          ...events[0],
          club_name: clubData?.name || 'Club',
        });
      }
    })();
  }, [user]);

  // Fetch player stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('poker_play_results')
        .select('hands_won, hands_played, final_chips, starting_chips')
        .eq('user_id', user.id);
      if (data?.length) {
        const wins = data.reduce((s, r) => s + (r.hands_won || 0), 0);
        const games = data.length;
        const net = data.reduce((s, r) => s + ((r.final_chips || 0) - (r.starting_chips || 0)), 0);
        setPlayerStats({ wins, gamesPlayed: games, netProfit: net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString() });
      }
    })();
  }, [user]);

  const fetchClubs = useCallback(async () => {
    if (!user) return;
    setLoadingClubs(true);
    const { data: memberships, error } = await supabase
      .from('club_members')
      .select(`role, club:clubs (id, name, description, invite_code)`)
      .eq('user_id', user.id);

    if (error) { console.error('Error fetching clubs:', error); setLoadingClubs(false); return; }

    const clubsWithCounts = await Promise.all(
      (memberships || []).map(async (m) => {
        const club = m.club as { id: string; name: string; description: string | null; invite_code: string };
        const { count } = await supabase.from('club_members').select('*', { count: 'exact', head: true }).eq('club_id', club.id);
        return { ...club, role: m.role as 'owner' | 'admin' | 'member', member_count: count || 0 };
      })
    );
    setClubs(clubsWithCounts);
    setLoadingClubs(false);
  }, [user]);

  // Auto-join club from invite link
  const processInviteCode = useCallback(async (inviteCode: string) => {
    if (!user || processingInvite) return;
    setProcessingInvite(true);
    try {
      const { data: clubData, error: clubError } = await supabase.rpc('lookup_club_by_invite_code', { _invite_code: inviteCode }).single();
      if (clubError || !clubData) { toast.error(t('club.invalid_code')); return; }
      const club = clubData as { id: string; name: string };
      const { data: existingMember } = await supabase.from('club_members').select('id').eq('club_id', club.id).eq('user_id', user.id).single();
      if (existingMember) { toast.info(t('club.already_member', { name: club.name })); navigate(`/club/${club.id}`); return; }
      const { error: joinError } = await supabase.from('club_members').insert({ club_id: club.id, user_id: user.id, role: 'member' });
      if (joinError) { toast.error(t('club.join_failed')); return; }
      toast.success(t('club.welcome', { name: club.name }));
      navigate(`/club/${club.id}`);
    } finally {
      setProcessingInvite(false);
      localStorage.removeItem('pendingInviteCode');
      if (searchParams.get('join')) { searchParams.delete('join'); setSearchParams(searchParams); }
    }
  }, [user, processingInvite, navigate, searchParams, setSearchParams, t]);

  useEffect(() => {
    if (user) {
      fetchClubs();
      const urlInviteCode = searchParams.get('join');
      const storedInviteCode = localStorage.getItem('pendingInviteCode');
      const inviteCode = urlInviteCode || storedInviteCode;
      if (inviteCode) processInviteCode(inviteCode.toUpperCase());
    }
  }, [user, fetchClubs, searchParams, processInviteCode]);

  const handleCreateClub = () => { if (!isActive) { setPaywallOpen(true); return; } setCreateDialogOpen(true); };
  const handleJoinClub = () => { if (!isActive) { setPaywallOpen(true); return; } setJoinDialogOpen(true); };
  const handleClubClick = (clubId: string) => { if (!isActive) { setPaywallOpen(true); return; } navigate(`/club/${clubId}`); };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container flex items-center justify-center h-16 px-4"><Skeleton className="h-10 w-40" /></div>
        </header>
        <main className="container px-4 py-6 space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => setPaywallOpen(true)} className="absolute left-4 text-primary hover:text-primary/80">
            <Crown className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-1">
            <HeaderSocialIcons />
            <NotificationBell />
          </div>
        </div>
      </header>
      <div className="h-16 safe-area-top" />

      <InstallPrompt />

      {/* Main Content */}
      <main className="container px-4 py-5 space-y-5 max-w-lg mx-auto">
        {/* Hero */}
        <div className="animate-slide-up-fade">
          <HeroSection displayName={displayName} />
        </div>

        {/* Game Modes */}
        <div className="animate-slide-up-fade stagger-1">
          <GameModesGrid />
        </div>

        {/* Quick Stats */}
        <div className="animate-slide-up-fade stagger-2">
          <QuickStatsStrip
            wins={playerStats.wins}
            gamesPlayed={playerStats.gamesPlayed}
            netProfit={playerStats.netProfit}
          />
        </div>

        {/* Upcoming Event */}
        {upcomingEvent && (
          <div className="animate-slide-up-fade stagger-3">
            <UpcomingEventBanner event={upcomingEvent} />
          </div>
        )}

        {/* Clubs Section */}
        <div className="space-y-3 animate-slide-up-fade stagger-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gold-gradient">{t('dashboard.your_clubs')}</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleJoinClub} className="h-8 text-xs gap-1 border-border/50">
                <Users className="h-3.5 w-3.5" /> {t('club.join')}
              </Button>
              <Button size="sm" onClick={handleCreateClub} className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> {t('club.create')}
              </Button>
            </div>
          </div>

          {loadingClubs ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="bg-card/50 border-border/50">
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <Card className="bg-card/50 border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <SuitRow size="xl" opacity={0.3} className="mb-3" />
                <CardTitle className="text-base mb-1">{t('dashboard.no_clubs')}</CardTitle>
                <CardDescription className="text-xs">{t('dashboard.no_clubs_description')}</CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {clubs.map((club) => (
                <ClubCard key={club.id} club={club} isLocked={!isActive} onClick={() => handleClubClick(club.id)} />
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateClubDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={fetchClubs} />
      <JoinClubDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} onSuccess={fetchClubs} />
      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
