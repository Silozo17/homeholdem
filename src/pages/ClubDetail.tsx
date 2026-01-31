import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveGame } from '@/contexts/ActiveGameContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/layout/Logo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, 
  Users, 
  Copy, 
  Check,
  Crown,
  Shield,
  User,
  Calendar,
  Plus,
  MessageCircle,
  Trophy,
  ScrollText,
  Coins,
  Mail,
  AlertTriangle,
  Settings,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { EventCard } from '@/components/events/EventCard';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Leaderboard } from '@/components/clubs/Leaderboard';
import { HouseRules } from '@/components/clubs/HouseRules';
import { PokerHandRankings } from '@/components/clubs/PokerHandRankings';
import { HostRotation } from '@/components/clubs/HostRotation';
import { GameHistory } from '@/components/clubs/GameHistory';
import { PaymentLedger } from '@/components/clubs/PaymentLedger';
import { SeasonLeaderboard } from '@/components/clubs/SeasonLeaderboard';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ChipTemplateManager } from '@/components/clubs/ChipTemplateManager';
import { MemberActions } from '@/components/clubs/MemberActions';
import { ShareClub } from '@/components/clubs/ShareClub';
import { InviteByEmailDialog } from '@/components/clubs/InviteByEmailDialog';
import { DeleteClubDialog } from '@/components/clubs/DeleteClubDialog';
import { ClubSettings } from '@/components/clubs/ClubSettings';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { notifyEventUnlocked } from '@/lib/push-notifications';
import { notifyEventUnlockedInApp } from '@/lib/in-app-notifications';

interface ClubMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface Club {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  currency: string;
  created_at: string;
}

interface EventWithCounts {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  final_date: string | null;
  is_finalized: boolean;
  max_tables: number;
  seats_per_table: number;
  going_count: number;
  maybe_count: number;
  created_at: string;
  is_unlocked: boolean;
}

export default function ClubDetail() {
  const { t } = useTranslation();
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading } = useAuth();
  const { setCurrentClubId } = useActiveGame();
  const { isActive, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<EventWithCounts[]>([]);
  const [gameSessionStatus, setGameSessionStatus] = useState<Map<string, string>>(new Map());
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [inviteEmailOpen, setInviteEmailOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  
  // Locked event dialog state
  const [lockedEventDialogOpen, setLockedEventDialogOpen] = useState(false);
  const [selectedLockedEvent, setSelectedLockedEvent] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false);
  
  // Track if user was ever authenticated to prevent redirect on transient auth failures
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

  useEffect(() => {
    if (user) setWasAuthenticated(true);
  }, [user]);

  // Set current club context for mini-bar
  useEffect(() => {
    if (clubId) {
      setCurrentClubId(clubId);
    }
    return () => setCurrentClubId(null);
  }, [clubId, setCurrentClubId]);

  // Only redirect if NEVER authenticated, not on temporary auth failures
  useEffect(() => {
    if (!loading && !user && !wasAuthenticated) {
      navigate('/');
    }
  }, [user, loading, navigate, wasAuthenticated]);

  // Redirect to dashboard with paywall if subscription is not active
  // Only trigger if we explicitly know subscription is inactive (not just loading/error)
  useEffect(() => {
    if (!subscriptionLoading && !isActive && user && !paywallOpen) {
      // Small delay to prevent flickering during subscription refresh
      const timer = setTimeout(() => {
        setPaywallOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [subscriptionLoading, isActive, user, paywallOpen]);

  useEffect(() => {
    if (user && clubId) {
      fetchClubData();
    }
  }, [user, clubId]);

  const fetchClubData = async () => {
    if (!user || !clubId) return;
    
    setLoadingData(true);

    // Fetch club details
    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (clubError || !clubData) {
      toast.error(t('common.error'));
      navigate('/dashboard');
      return;
    }

    setClub(clubData);

    // Fetch members
    const { data: membersData, error: membersError } = await supabase
      .from('club_members')
      .select('id, role, joined_at, user_id')
      .eq('club_id', clubId)
      .order('role', { ascending: true });

    if (!membersError && membersData) {
      // Find current user's role
      const currentUserMember = membersData.find(m => m.user_id === user.id);
      if (currentUserMember) {
        setUserRole(currentUserMember.role as 'owner' | 'admin' | 'member');
        setCurrentUserId(user.id);
      }

      // Fetch profiles for each member
      const userIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map the data correctly
      const mappedMembers = membersData.map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role as 'owner' | 'admin' | 'member',
        joined_at: m.joined_at,
        profile: profileMap.get(m.user_id) || { display_name: 'Unknown', avatar_url: null },
      }));

      setMembers(mappedMembers);
    }

    // Fetch events with RSVP counts
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, description, location, final_date, is_finalized, max_tables, seats_per_table, created_at, is_unlocked')
      .eq('club_id', clubId)
      .order('created_at', { ascending: true });

    if (eventsData) {
      // Fetch game sessions for all events to determine locked status
      const { data: gameSessions } = await supabase
        .from('game_sessions')
        .select('event_id, status')
        .in('event_id', eventsData.map(e => e.id));

      const statusMap = new Map(
        gameSessions?.map(gs => [gs.event_id, gs.status]) || []
      );
      setGameSessionStatus(statusMap);

      const eventsWithCounts = await Promise.all(
        eventsData.map(async (event) => {
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('status, is_waitlisted')
            .eq('event_id', event.id);

          const going = rsvps?.filter(r => r.status === 'going' && !r.is_waitlisted).length || 0;
          const maybe = rsvps?.filter(r => r.status === 'maybe').length || 0;

          return {
            ...event,
            is_unlocked: event.is_unlocked ?? false,
            going_count: going,
            maybe_count: maybe,
          };
        })
      );

      setEvents(eventsWithCounts);
    }

    setLoadingData(false);
  };

  const copyInviteCode = async () => {
    if (!club) return;
    await navigator.clipboard.writeText(club.invite_code);
    setCopied(true);
    toast.success(t('club.code_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-primary" />;
      case 'admin': return <Shield className="h-4 w-4 text-accent" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Handle unlock event
  const handleUnlockEvent = async () => {
    if (!selectedLockedEvent || !clubId) return;
    
    const { error } = await supabase
      .from('events')
      .update({ is_unlocked: true })
      .eq('id', selectedLockedEvent.id);
    
    if (!error) {
      toast.success(t('event.unlocked_success'));
      
      // Send notifications to all club members (except current user)
      const otherMemberIds = members
        .filter(m => m.user_id !== user?.id)
        .map(m => m.user_id);
      
      if (otherMemberIds.length > 0) {
        // Fire and forget - don't block navigation
        Promise.all([
          notifyEventUnlocked(otherMemberIds, selectedLockedEvent.title, selectedLockedEvent.id),
          notifyEventUnlockedInApp(otherMemberIds, selectedLockedEvent.title, selectedLockedEvent.id, clubId),
        ]).catch(console.error);
      }
      
      setUnlockConfirmOpen(false);
      setLockedEventDialogOpen(false);
      // Refresh events to update is_unlocked status
      fetchClubData();
      navigate(`/event/${selectedLockedEvent.id}`);
    } else {
      toast.error(t('common.error'));
    }
  };

  // Handle event click - show modal if locked
  const handleEventClick = (event: EventWithCounts, isLocked: boolean) => {
    if (isLocked && !event.is_unlocked) {
      setSelectedLockedEvent({ id: event.id, title: event.title });
      setLockedEventDialogOpen(true);
    } else {
      navigate(`/event/${event.id}`);
    }
  };

  if (loading || loadingData || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  if (!club) return null;

  // Show paywall overlay for expired subscriptions
  if (!isActive) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <PaywallDrawer open={paywallOpen} onOpenChange={(open) => {
          setPaywallOpen(open);
          if (!open) navigate('/dashboard');
        }} />
      </div>
    );
  }

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-16 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="absolute left-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <NotificationBell className="absolute right-4" />
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Club Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gold-gradient">{club.name}</h1>
            {userRole && (
              <Badge variant={userRole === 'owner' ? 'default' : 'secondary'} className="capitalize">
                {t(`club.${userRole}`)}
              </Badge>
            )}
          </div>
          {club.description && (
            <p className="text-muted-foreground">{club.description}</p>
          )}
        </div>

        {/* Invite Code Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('club.invite_code')}</p>
              <p className="text-2xl font-mono tracking-[0.3em] text-primary">
                {club.invite_code}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={copyInviteCode}
                className="border-border/50"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setInviteEmailOpen(true)}
                className="border-border/50"
              >
                <Mail className="h-4 w-4" />
              </Button>
              <ShareClub clubName={club.name} inviteCode={club.invite_code} />
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto gap-0.5">
            <TabsTrigger value="events" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.events')}</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.chat')}</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <Trophy className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.stats')}</span>
            </TabsTrigger>
            <TabsTrigger value="chips" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <Coins className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.chips')}</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <ScrollText className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.rules')}</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.members_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-0.5 py-1.5 px-1 min-w-0">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="text-[10px] sm:text-xs truncate max-w-full">{t('club.settings')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('club.upcoming_events')}</h2>
              {isAdmin && (
                <Button 
                  size="sm"
                  onClick={() => setCreateEventOpen(true)}
                  className="glow-gold"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('club.new_event')}
                </Button>
              )}
            </div>

            {events.length === 0 ? (
              <Card className="bg-card/50 border-border/50 border-dashed">
                <CardContent className="py-8 text-center">
                  <div className="text-3xl mb-3 opacity-30">📅</div>
                  <p className="text-muted-foreground">
                    {isAdmin 
                      ? t('club.no_events_admin')
                      : t('club.no_events_member')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const today = new Date();
                  const upcomingEvents = events.filter(event => {
                    if (!event.final_date) return true;
                    return new Date(event.final_date) >= today;
                  });
                  
                  // Sort by created_at to determine order
                  const sortedUpcoming = [...upcomingEvents].sort((a, b) => 
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                  );
                  
                  // Find first event that doesn't have a completed game session
                  const currentEventIndex = sortedUpcoming.findIndex(event => {
                    const status = gameSessionStatus.get(event.id);
                    return status !== 'completed';
                  });
                  
                  // Determine if an event is locked (after the current incomplete event)
                  // Check: is_unlocked, previous event date passed, or previous event completed
                  const isEventLocked = (eventId: string) => {
                    if (currentEventIndex === -1) return false; // All events completed, nothing locked
                    
                    const eventIndex = sortedUpcoming.findIndex(e => e.id === eventId);
                    if (eventIndex <= currentEventIndex) return false;
                    
                    // Check if manually unlocked
                    const event = sortedUpcoming.find(e => e.id === eventId);
                    if (event?.is_unlocked) return false;
                    
                    // Check if previous event's date has passed
                    const prevEvent = sortedUpcoming[eventIndex - 1];
                    if (prevEvent?.final_date && new Date(prevEvent.final_date) < new Date()) {
                      return false;
                    }
                    
                    return true;
                  };
                  
                  return sortedUpcoming.length > 0 ? (
                    sortedUpcoming.map((event) => {
                      const locked = isEventLocked(event.id);
                      return (
                        <EventCard 
                          key={event.id}
                          event={event}
                          onClick={() => handleEventClick(event, locked)}
                          isLocked={locked}
                        />
                      );
                    })
                  ) : (
                    <Card className="bg-card/50 border-border/50 border-dashed">
                      <CardContent className="py-8 text-center">
                        <div className="text-3xl mb-3 opacity-30">📅</div>
                        <p className="text-muted-foreground">
                          {t('club.no_events_admin')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <Card className="bg-card/50 border-border/50 h-[60vh]">
              <ChatWindow clubId={clubId!} />
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-4 space-y-4">
            <SeasonLeaderboard clubId={clubId!} isAdmin={isAdmin} />
            <Leaderboard clubId={clubId!} clubName={club.name} />
            <GameHistory clubId={clubId!} clubName={club.name} />
            <HostRotation clubId={clubId!} />
            <PaymentLedger clubId={clubId!} isAdmin={isAdmin} />
          </TabsContent>

          {/* Chips Tab */}
          <TabsContent value="chips" className="mt-4 space-y-4">
            <ChipTemplateManager clubId={clubId!} isAdmin={isAdmin} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            <ClubSettings
              clubId={clubId!}
              clubName={club.name}
              clubDescription={club.description}
              clubCurrency={club.currency || 'GBP'}
              isAdmin={isAdmin}
              onUpdate={fetchClubData}
            />
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-4 space-y-4">
            <HouseRules clubId={clubId!} isAdmin={isAdmin} />
            <PokerHandRankings />
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4 space-y-4">
            <NotificationSettings />
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {t('common.members')} ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        {member.profile.avatar_url ? (
                          <img 
                            src={member.profile.avatar_url} 
                            alt={member.profile.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-muted-foreground">
                            {member.profile.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{member.profile.display_name}</p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          {t(`club.${member.role}`)}
                        </p>
                      </div>
                    </div>
                    {currentUserId && userRole && (
                      <MemberActions
                        memberId={member.id}
                        memberUserId={member.user_id}
                        memberName={member.profile.display_name}
                        memberRole={member.role}
                        currentUserRole={userRole}
                        currentUserId={currentUserId}
                        clubId={clubId!}
                        onUpdate={() => {
                          // If user left club, navigate away
                          if (member.user_id === currentUserId && member.role !== 'owner') {
                            navigate('/dashboard');
                          } else {
                            fetchClubData();
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Danger Zone - Owner Only */}
            {userRole === 'owner' && (
              <Card className="bg-card/50 border-destructive/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    {t('settings.danger_zone')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('club.delete_club_confirm')}
                  </p>
                  <DeleteClubDialog clubId={clubId!} clubName={club.name} />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Event Dialog */}
      {club && (
        <CreateEventDialog
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          clubId={clubId || ''}
          clubName={club.name}
          onSuccess={fetchClubData}
        />
      )}

      {/* Invite by Email Dialog */}
      {club && (
        <InviteByEmailDialog
          open={inviteEmailOpen}
          onOpenChange={setInviteEmailOpen}
          clubName={club.name}
          inviteCode={club.invite_code}
        />
      )}

      {/* Locked Event Dialog */}
      <AlertDialog open={lockedEventDialogOpen} onOpenChange={setLockedEventDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              {t('event.event_locked_title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('event.event_locked_description', { title: selectedLockedEvent?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.close')}</AlertDialogCancel>
            {isAdmin && (
              <AlertDialogAction onClick={() => setUnlockConfirmOpen(true)}>
                {t('event.unlock_event')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Confirmation Dialog */}
      <AlertDialog open={unlockConfirmOpen} onOpenChange={setUnlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('event.unlock_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('event.unlock_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlockEvent}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
