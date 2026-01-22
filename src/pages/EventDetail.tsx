import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/layout/Logo';
import { 
  ArrowLeft, 
  Calendar,
  MapPin,
  Users,
  Play,
  HelpCircle,
  Home,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { DateVoting } from '@/components/events/DateVoting';
import { RsvpButtons } from '@/components/events/RsvpButtons';
import { HostVolunteer } from '@/components/events/HostVolunteer';
import { AttendeesList } from '@/components/events/AttendeesList';

interface Event {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  location: string | null;
  max_tables: number;
  seats_per_table: number;
  final_date: string | null;
  host_user_id: string | null;
  is_finalized: boolean;
}

interface DateOption {
  id: string;
  proposed_date: string;
  vote_count: number;
  user_voted: boolean;
}

interface Rsvp {
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  is_waitlisted: boolean;
  waitlist_position: number | null;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [userRsvp, setUserRsvp] = useState<'going' | 'maybe' | 'not_going' | null>(null);
  const [hostVolunteers, setHostVolunteers] = useState<string[]>([]);
  const [hostProfile, setHostProfile] = useState<{ display_name: string } | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && eventId) {
      fetchEventData();
    }
  }, [user, eventId]);

  const fetchEventData = async () => {
    if (!user || !eventId) return;
    
    setLoadingData(true);

    // Fetch event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast.error('Event not found');
      navigate(-1);
      return;
    }

    setEvent(eventData);

    // Check user role
    const { data: memberData } = await supabase
      .from('club_members')
      .select('role')
      .eq('club_id', eventData.club_id)
      .eq('user_id', user.id)
      .single();

    if (memberData) {
      setUserRole(memberData.role as 'owner' | 'admin' | 'member');
    }

    // Fetch date options with votes
    const { data: optionsData } = await supabase
      .from('event_date_options')
      .select('id, proposed_date')
      .eq('event_id', eventId)
      .order('proposed_date');

    if (optionsData) {
      const optionsWithVotes = await Promise.all(
        optionsData.map(async (option) => {
          const { count } = await supabase
            .from('event_date_votes')
            .select('*', { count: 'exact', head: true })
            .eq('date_option_id', option.id);

          const { data: userVote } = await supabase
            .from('event_date_votes')
            .select('id')
            .eq('date_option_id', option.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...option,
            vote_count: count || 0,
            user_voted: !!userVote,
          };
        })
      );
      setDateOptions(optionsWithVotes);
    }

    // Fetch RSVPs
    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('user_id, status, is_waitlisted, waitlist_position')
      .eq('event_id', eventId);

    if (rsvpData) {
      const userIds = rsvpData.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const rsvpsWithProfiles = rsvpData.map(r => ({
        ...r,
        status: r.status as 'going' | 'maybe' | 'not_going',
        profile: profileMap.get(r.user_id) || { display_name: 'Unknown', avatar_url: null },
      }));

      setRsvps(rsvpsWithProfiles);

      // Find user's RSVP
      const myRsvp = rsvpData.find(r => r.user_id === user.id);
      if (myRsvp) {
        setUserRsvp(myRsvp.status as 'going' | 'maybe' | 'not_going');
      }
    }

    // Fetch host volunteers
    const { data: volunteerData } = await supabase
      .from('event_host_volunteers')
      .select('user_id')
      .eq('event_id', eventId);

    if (volunteerData) {
      setHostVolunteers(volunteerData.map(v => v.user_id));
    }

    // Fetch host profile if set
    if (eventData.host_user_id) {
      const { data: hostData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', eventData.host_user_id)
        .single();

      if (hostData) {
        setHostProfile(hostData);
      }
    }

    setLoadingData(false);
  };

  const handleVote = async (optionId: string) => {
    if (!user) return;

    const option = dateOptions.find(o => o.id === optionId);
    if (!option) return;

    if (option.user_voted) {
      // Remove vote
      await supabase
        .from('event_date_votes')
        .delete()
        .eq('date_option_id', optionId)
        .eq('user_id', user.id);
    } else {
      // Add vote
      await supabase
        .from('event_date_votes')
        .insert({ date_option_id: optionId, user_id: user.id });
    }

    fetchEventData();
  };

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user || !event) return;

    const totalCapacity = event.max_tables * event.seats_per_table;
    const goingCount = rsvps.filter(r => r.status === 'going' && !r.is_waitlisted).length;

    // Check capacity for 'going' status
    let isWaitlisted = false;
    let waitlistPosition: number | null = null;

    if (status === 'going' && goingCount >= totalCapacity && userRsvp !== 'going') {
      isWaitlisted = true;
      const currentWaitlist = rsvps.filter(r => r.is_waitlisted);
      waitlistPosition = currentWaitlist.length + 1;
    }

    if (userRsvp) {
      // Update existing RSVP
      await supabase
        .from('event_rsvps')
        .update({ 
          status, 
          is_waitlisted: isWaitlisted,
          waitlist_position: waitlistPosition 
        })
        .eq('event_id', event.id)
        .eq('user_id', user.id);
    } else {
      // Create new RSVP
      await supabase
        .from('event_rsvps')
        .insert({ 
          event_id: event.id, 
          user_id: user.id, 
          status,
          is_waitlisted: isWaitlisted,
          waitlist_position: waitlistPosition
        });
    }

    if (isWaitlisted) {
      toast.info(`You're on the waitlist (position ${waitlistPosition})`);
    } else {
      toast.success('RSVP updated!');
    }

    fetchEventData();
  };

  const handleHostVolunteer = async () => {
    if (!user || !event) return;

    const isVolunteering = hostVolunteers.includes(user.id);

    if (isVolunteering) {
      await supabase
        .from('event_host_volunteers')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);
      toast.success('Removed from host volunteers');
    } else {
      await supabase
        .from('event_host_volunteers')
        .insert({ event_id: event.id, user_id: user.id });
      toast.success('Added to host volunteers!');
    }

    fetchEventData();
  };

  const handleFinalizeDate = async (optionId: string) => {
    if (!event) return;

    const option = dateOptions.find(o => o.id === optionId);
    if (!option) return;

    await supabase
      .from('events')
      .update({ 
        final_date: option.proposed_date,
        is_finalized: true 
      })
      .eq('id', event.id);

    toast.success('Date finalized!');
    fetchEventData();
  };

  const handleConfirmHost = async (hostUserId: string) => {
    if (!event) return;

    await supabase
      .from('events')
      .update({ host_user_id: hostUserId })
      .eq('id', event.id);

    toast.success('Host confirmed!');
    fetchEventData();
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!event) return null;

  const totalCapacity = event.max_tables * event.seats_per_table;
  const goingList = rsvps.filter(r => r.status === 'going' && !r.is_waitlisted);
  const waitlist = rsvps.filter(r => r.is_waitlisted).sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0));
  const maybeList = rsvps.filter(r => r.status === 'maybe');
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center h-16 px-4 gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/club/${event.club_id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Event Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gold-gradient">{event.title}</h1>
            {event.is_finalized ? (
              <Badge variant="default">Confirmed</Badge>
            ) : (
              <Badge variant="secondary">Voting Open</Badge>
            )}
          </div>
          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}
        </div>

        {/* Event Info */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4 space-y-3">
            {event.final_date && (
              <div className="flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {format(new Date(event.final_date), "EEEE, MMMM d 'at' h:mm a")}
                </span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{event.location}</span>
              </div>
            )}
            {hostProfile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Home className="h-5 w-5" />
                <span>Hosted by <span className="text-foreground font-medium">{hostProfile.display_name}</span></span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span>
                {event.max_tables} {event.max_tables === 1 ? 'table' : 'tables'} × {event.seats_per_table} seats = {totalCapacity} max
              </span>
            </div>
{isAdmin && event.is_finalized && (
              <Button 
                className="w-full mt-4 glow-gold"
                onClick={() => navigate(`/event/${eventId}/game`)}
              >
                <Play className="h-5 w-5 mr-2" />
                Start Game Mode
              </Button>
            )}
          </CardContent>
        </Card>

        {/* RSVP Buttons */}
        <RsvpButtons 
          currentStatus={userRsvp}
          onRsvp={handleRsvp}
        />

        {/* Date Voting (if not finalized) */}
        {!event.is_finalized && (
          <DateVoting 
            options={dateOptions}
            onVote={handleVote}
            onFinalize={isAdmin ? handleFinalizeDate : undefined}
          />
        )}

        {/* Host Volunteer */}
        {!event.host_user_id && (
          <HostVolunteer
            volunteers={hostVolunteers}
            currentUserId={user?.id || ''}
            onVolunteer={handleHostVolunteer}
            onConfirm={isAdmin ? handleConfirmHost : undefined}
          />
        )}

        {/* Attendees List */}
        <AttendeesList 
          going={goingList}
          waitlist={waitlist}
          maybe={maybeList}
          capacity={totalCapacity}
        />
      </main>
    </div>
  );
}
