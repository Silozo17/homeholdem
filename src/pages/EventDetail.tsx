import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveGame } from '@/contexts/ActiveGameContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
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
  Calendar,
  MapPin,
  Users,
  Play,
  Home,
  MessageCircle,
  Info,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { DateVoting } from '@/components/events/DateVoting';
import { RsvpButtons } from '@/components/events/RsvpButtons';
import { HostVolunteer } from '@/components/events/HostVolunteer';
import { HostAddressDialog } from '@/components/events/HostAddressDialog';
import { AttendeesList } from '@/components/events/AttendeesList';
import { ShareEvent } from '@/components/events/ShareEvent';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { sendEmail } from '@/lib/email';
import { rsvpConfirmationTemplate } from '@/lib/email-templates';
import { buildAppUrl } from '@/lib/app-url';
import { notifyHostConfirmed, notifyWaitlistPromotion } from '@/lib/push-notifications';
import { 
  notifyEventRsvpInApp, 
  notifyDateFinalizedInApp, 
  notifyHostConfirmedInApp 
} from '@/lib/in-app-notifications';
import { queueDelayedNotification } from '@/lib/delayed-notifications';

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
  created_by: string;
}

interface Voter {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface DateOption {
  id: string;
  proposed_date: string;
  vote_count: number;
  user_voted: boolean;
  voters: Voter[];
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
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
  const { t, i18n } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading } = useAuth();
  const { setCurrentClubId } = useActiveGame();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [userRsvp, setUserRsvp] = useState<'going' | 'maybe' | 'not_going' | null>(null);
  const [hostVolunteers, setHostVolunteers] = useState<string[]>([]);
  const [hostProfile, setHostProfile] = useState<{ display_name: string } | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [volunteerLoading, setVolunteerLoading] = useState(false);

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Set current club context for mini-bar when event is loaded
  useEffect(() => {
    if (event?.club_id) {
      setCurrentClubId(event.club_id);
    }
    return () => setCurrentClubId(null);
  }, [event?.club_id, setCurrentClubId]);

  useEffect(() => {
    if (user && eventId) {
      fetchEventData();
    }
  }, [user, eventId]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!eventId || dateOptions.length === 0) return;

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_date_votes'
      }, async (payload) => {
        // For vote changes, we need to refetch voters for the affected option
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          const optionId = payload.eventType === 'INSERT' 
            ? (payload.new as { date_option_id: string }).date_option_id
            : (payload.old as { date_option_id: string }).date_option_id;
          const votingUserId = payload.eventType === 'INSERT'
            ? (payload.new as { user_id: string }).user_id
            : (payload.old as { user_id: string }).user_id;

          // Fetch updated voter for this option
          const { data: votesData } = await supabase
            .from('event_date_votes')
            .select('user_id')
            .eq('date_option_id', optionId);

          const voterIds = votesData?.map(v => v.user_id) || [];
          let voters: Voter[] = [];
          if (voterIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', voterIds);
            voters = profilesData || [];
          }

          setDateOptions(prev => prev.map(o =>
            o.id === optionId
              ? { 
                  ...o, 
                  vote_count: voterIds.length, 
                  user_voted: voterIds.includes(user?.id || ''),
                  voters 
                }
              : o
          ));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_rsvps',
        filter: `event_id=eq.${eventId}`
      }, () => {
        // Fetch fresh RSVP data for complex updates
        fetchRsvps();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'event_host_volunteers',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newVol = payload.new as { user_id: string };
          setHostVolunteers(prev => [...prev, newVol.user_id]);
        } else if (payload.eventType === 'DELETE') {
          const oldVol = payload.old as { user_id: string };
          setHostVolunteers(prev => prev.filter(id => id !== oldVol.user_id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, dateOptions.length, user?.id]);

  const fetchRsvps = async () => {
    if (!eventId) return;

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

      // Update user's RSVP
      const myRsvp = rsvpData.find(r => r.user_id === user?.id);
      if (myRsvp) {
        setUserRsvp(myRsvp.status as 'going' | 'maybe' | 'not_going');
      }
    }
  };

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

    // Fetch user's profile for optimistic updates
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (profileData) {
      setUserProfile(profileData);
    }

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

    // Fetch date options with votes and voters
    const { data: optionsData } = await supabase
      .from('event_date_options')
      .select('id, proposed_date')
      .eq('event_id', eventId)
      .order('proposed_date');

    if (optionsData) {
      const optionsWithVotes = await Promise.all(
        optionsData.map(async (option) => {
          // Get all votes for this option with voter profiles
          const { data: votesData } = await supabase
            .from('event_date_votes')
            .select('user_id')
            .eq('date_option_id', option.id);

          const voterIds = votesData?.map(v => v.user_id) || [];
          
          // Fetch voter profiles
          let voters: Voter[] = [];
          if (voterIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', voterIds);
            voters = profilesData || [];
          }

          // Check if current user voted
          const userVoted = voterIds.includes(user.id);

          return {
            ...option,
            vote_count: voterIds.length,
            user_voted: userVoted,
            voters,
          };
        })
      );
      setDateOptions(optionsWithVotes);
    }

    // Fetch RSVPs with profiles
    await fetchRsvps();

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

  // Optimistic vote handler - no loading, instant UI update
  const handleVote = useCallback(async (optionId: string) => {
    if (!user) return;

    const option = dateOptions.find(o => o.id === optionId);
    if (!option) return;

    // Optimistic update - instant UI feedback
    const wasVoted = option.user_voted;
    setDateOptions(prev => prev.map(o => {
      if (o.id === optionId) {
        return {
          ...o,
          user_voted: !wasVoted,
          vote_count: wasVoted ? o.vote_count - 1 : o.vote_count + 1
        };
      }
      return o;
    }));

    // Perform database operation
    if (wasVoted) {
      const { error } = await supabase
        .from('event_date_votes')
        .delete()
        .eq('date_option_id', optionId)
        .eq('user_id', user.id);

      if (error) {
        // Revert on error
        setDateOptions(prev => prev.map(o => {
          if (o.id === optionId) {
            return { ...o, user_voted: true, vote_count: o.vote_count + 1 };
          }
          return o;
        }));
        toast.error('Failed to remove vote');
      }
    } else {
      const { error } = await supabase
        .from('event_date_votes')
        .insert({ date_option_id: optionId, user_id: user.id });

      if (error) {
        // Revert on error
        setDateOptions(prev => prev.map(o => {
          if (o.id === optionId) {
            return { ...o, user_voted: false, vote_count: o.vote_count - 1 };
          }
          return o;
        }));
        toast.error('Failed to add vote');
      } else {
        // Queue delayed notification for voting (3-min delay)
        queueDelayedNotification({
          clubId: event!.club_id,
          eventId: event!.id,
          type: 'vote',
          action: 'added',
          actorId: user.id,
          actorName: userProfile?.display_name || 'Someone',
        }).catch(console.error);
      }
    }
  }, [user, event, dateOptions, userProfile]);

  // Optimistic RSVP handler
  const handleRsvp = useCallback(async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user || !event || !userProfile) return;

    const totalCapacity = event.max_tables * event.seats_per_table;
    const currentGoingCount = rsvps.filter(r => r.status === 'going' && !r.is_waitlisted && r.user_id !== user.id).length;

    // Check capacity for 'going' status
    let isWaitlisted = false;
    let waitlistPosition: number | null = null;

    if (status === 'going' && currentGoingCount >= totalCapacity && userRsvp !== 'going') {
      isWaitlisted = true;
      const currentWaitlist = rsvps.filter(r => r.is_waitlisted);
      waitlistPosition = currentWaitlist.length + 1;
    }

    // Optimistic update
    const previousRsvp = userRsvp;
    const previousRsvps = [...rsvps];
    
    setUserRsvp(status);
    setRsvps(prev => {
      const filtered = prev.filter(r => r.user_id !== user.id);
      return [...filtered, {
        user_id: user.id,
        status,
        is_waitlisted: isWaitlisted,
        waitlist_position: waitlistPosition,
        profile: {
          display_name: userProfile.display_name,
          avatar_url: userProfile.avatar_url
        }
      }];
    });

    // Perform DB operation
    let error;
    if (previousRsvp) {
      const result = await supabase
        .from('event_rsvps')
        .update({ 
          status, 
          is_waitlisted: isWaitlisted,
          waitlist_position: waitlistPosition 
        })
        .eq('event_id', event.id)
        .eq('user_id', user.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('event_rsvps')
        .insert({ 
          event_id: event.id, 
          user_id: user.id, 
          status,
          is_waitlisted: isWaitlisted,
          waitlist_position: waitlistPosition
        });
      error = result.error;
    }

    if (error) {
      // Revert on error
      setUserRsvp(previousRsvp);
      setRsvps(previousRsvps);
      toast.error('Failed to update RSVP');
      return;
    }

    if (isWaitlisted) {
      toast.info(`You're on the waitlist (position ${waitlistPosition})`);
    } else {
      toast.success('RSVP updated');
    }

    // Send confirmation email (fire and forget)
    sendRsvpConfirmation(status);
    
    // Queue delayed notification for all club members (3-min delay)
    queueDelayedNotification({
      clubId: event.club_id,
      eventId: event.id,
      type: 'rsvp',
      action: status,
      actorId: user.id,
      actorName: userProfile.display_name,
    }).catch(console.error);
    
    // Send in-app notification to event creator/admins when someone RSVPs going
    if (status === 'going' && !isWaitlisted && event.created_by && event.created_by !== user.id) {
      notifyEventRsvpInApp(
        event.created_by,
        event.title,
        userProfile.display_name,
        event.id,
        user.id
      ).catch(console.error);
    }

    // Check if we need to promote from waitlist when a "going" user changes status
    const wasGoingNotWaitlisted = previousRsvp === 'going' && 
      previousRsvps.find(r => r.user_id === user.id && !r.is_waitlisted);
    
    if (wasGoingNotWaitlisted && status !== 'going') {
      // A "going" spot just opened up - check for waitlist
      const { data: existingRsvps } = await supabase
        .from('event_rsvps')
        .select('user_id, is_waitlisted, waitlist_position')
        .eq('event_id', event.id)
        .eq('status', 'going');

      const goingCount = existingRsvps?.filter(r => !r.is_waitlisted).length || 0;

      // If we're under capacity and there's someone waitlisted
      if (goingCount < totalCapacity) {
        const waitlistUsers = existingRsvps
          ?.filter(r => r.is_waitlisted)
          .sort((a, b) => (a.waitlist_position || 999) - (b.waitlist_position || 999));

        if (waitlistUsers && waitlistUsers.length > 0) {
          const promotedUser = waitlistUsers[0];

          // Promote the first waitlisted user
          await supabase
            .from('event_rsvps')
            .update({ 
              is_waitlisted: false, 
              waitlist_position: null 
            })
            .eq('event_id', event.id)
            .eq('user_id', promotedUser.user_id);

          // Reposition remaining waitlist
          for (let i = 1; i < waitlistUsers.length; i++) {
            await supabase
              .from('event_rsvps')
              .update({ waitlist_position: i })
              .eq('event_id', event.id)
              .eq('user_id', waitlistUsers[i].user_id);
          }

          // Call edge function to send email + in-app notification
          supabase.functions.invoke('promote-waitlist', {
            body: { 
              event_id: event.id, 
              promoted_user_id: promotedUser.user_id 
            }
          }).catch(console.error);

          // Send push notification
          notifyWaitlistPromotion(
            promotedUser.user_id,
            event.title,
            event.id
          ).catch(console.error);
        }
      }

      // Refetch to ensure UI is up-to-date
      await fetchRsvps();
    }
  }, [user, event, userProfile, rsvps, userRsvp]);

  // Rate limiting for RSVP emails - track last email per event
  const lastRsvpEmailRef = useRef<{ eventId: string; timestamp: number } | null>(null);

  const sendRsvpConfirmation = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!user || !event) return;

    // Rate limit: max 1 email per event per 5 minutes
    const now = Date.now();
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
    
    if (lastRsvpEmailRef.current?.eventId === event.id) {
      const elapsed = now - lastRsvpEmailRef.current.timestamp;
      if (elapsed < COOLDOWN_MS) {
        console.log(`RSVP email rate limited. ${Math.ceil((COOLDOWN_MS - elapsed) / 1000)}s remaining`);
        return;
      }
    }

    try {
      // Check user preferences first
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('email_rsvp_confirmation')
        .eq('user_id', user.id)
        .maybeSingle();

      // Respect user preference - default to true if no record
      if (prefs && prefs.email_rsvp_confirmation === false) {
        console.log('RSVP email disabled by user preference');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!profile?.email) return;

      const eventUrl = buildAppUrl(`/event/${event.id}`);
      const eventDate = event.final_date 
        ? format(new Date(event.final_date), "EEEE, MMMM d 'at' h:mm a")
        : undefined;

      const html = rsvpConfirmationTemplate({
        eventTitle: event.title,
        status,
        eventDate,
        location: event.location || undefined,
        eventUrl,
      });

      await sendEmail({
        to: profile.email,
        subject: status === 'going' 
          ? `✅ You're in for ${event.title}!`
          : status === 'maybe'
          ? `🤔 RSVP Noted for ${event.title}`
          : `❌ RSVP Updated for ${event.title}`,
        html,
      });

      // Update last email timestamp after successful send
      lastRsvpEmailRef.current = { eventId: event.id, timestamp: now };
    } catch (error) {
      // Silently fail - email is optional
    }
  };

  // Host volunteer handler with address support
  const handleHostVolunteer = useCallback(async (address?: string) => {
    if (!user || !event) return;

    const isVolunteering = hostVolunteers.includes(user.id);
    
    if (isVolunteering) {
      // Withdrawing - direct action, no dialog
      setHostVolunteers(prev => prev.filter(id => id !== user.id));
      
      const { error } = await supabase
        .from('event_host_volunteers')
        .delete()
        .eq('event_id', event.id)
        .eq('user_id', user.id);
      
      if (error) {
        setHostVolunteers(prev => [...prev, user.id]);
        toast.error('Failed to remove volunteer');
      } else {
        toast.success('Removed from host volunteers');
      }
    } else {
      // Volunteering - address is required (passed from dialog)
      if (!address) {
        setAddressDialogOpen(true);
        return;
      }
      
      setVolunteerLoading(true);
      
      // Optimistic update
      setHostVolunteers(prev => [...prev, user.id]);
      
      const { error } = await supabase
        .from('event_host_volunteers')
        .insert({ event_id: event.id, user_id: user.id, address });
      
      setVolunteerLoading(false);
      setAddressDialogOpen(false);
      
      if (error) {
        setHostVolunteers(prev => prev.filter(id => id !== user.id));
        toast.error('Failed to volunteer');
      } else {
        toast.success('Added to host volunteers');
      }
    }
  }, [user, event, hostVolunteers]);

  const handleFinalizeDate = async (optionId: string) => {
    if (!event) return;

    const option = dateOptions.find(o => o.id === optionId);
    if (!option) return;

    // Optimistic update
    setEvent(prev => prev ? { ...prev, final_date: option.proposed_date, is_finalized: true } : null);

    const { error } = await supabase
      .from('events')
      .update({ 
        final_date: option.proposed_date,
        is_finalized: true 
      })
      .eq('id', event.id);

    if (error) {
      setEvent(prev => prev ? { ...prev, final_date: null, is_finalized: false } : null);
      toast.error('Failed to finalize date');
    } else {
      toast.success('Date finalized!');
      
      // Send in-app notification to all club members
      const { data: members } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', event.club_id)
        .neq('user_id', user?.id || '');
      
      if (members && members.length > 0) {
        const userIds = members.map(m => m.user_id);
        const formattedDate = format(new Date(option.proposed_date), "EEEE, MMMM d", { locale: dateLocale });
        notifyDateFinalizedInApp(userIds, event.title, event.id, formattedDate).catch(console.error);
      }
    }
  };

  const handleUnfinalizeDate = async () => {
    if (!event) return;

    const previousDate = event.final_date;
    
    // Optimistic update
    setEvent(prev => prev ? { ...prev, final_date: null, is_finalized: false } : null);

    const { error } = await supabase
      .from('events')
      .update({ 
        final_date: null,
        is_finalized: false 
      })
      .eq('id', event.id);

    if (error) {
      setEvent(prev => prev ? { ...prev, final_date: previousDate, is_finalized: true } : null);
      toast.error('Failed to unfinalize date');
    } else {
      toast.success('Date unfinalized - voting reopened');
    }
  };

  const handleConfirmHost = async (hostUserId: string) => {
    if (!event) return;

    // Get the volunteer's address
    const { data: volunteer } = await supabase
      .from('event_host_volunteers')
      .select('address')
      .eq('event_id', event.id)
      .eq('user_id', hostUserId)
      .single();

    // Update event with host and location (address from volunteer)
    const { error } = await supabase
      .from('events')
      .update({ 
        host_user_id: hostUserId,
        location: volunteer?.address || null
      })
      .eq('id', event.id);

    if (error) {
      toast.error('Failed to confirm host');
      return;
    }

    // Get host profile for notification
    const { data: hostData } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', hostUserId)
      .single();

    // Send push notification to all 'going' attendees (excluding the host)
    const goingUserIds = rsvps
      .filter(r => r.status === 'going' && r.user_id !== hostUserId)
      .map(r => r.user_id);
    
    if (goingUserIds.length > 0) {
      // Send push notification
      notifyHostConfirmed(
        goingUserIds,
        event.title,
        event.id,
        hostData?.display_name || 'Host',
        volunteer?.address
      ).catch(err => console.error('Failed to send host notification:', err));
      
      // Send in-app notification
      notifyHostConfirmedInApp(
        goingUserIds,
        event.title,
        event.id,
        hostData?.display_name || 'Host',
        volunteer?.address
      ).catch(console.error);
    }

    toast.success('Host confirmed!');
    fetchEventData();
  };

  const handleClearHost = async () => {
    if (!event) return;

    const { error } = await supabase
      .from('events')
      .update({ 
        host_user_id: null,
        location: 'TBC'
      })
      .eq('id', event.id);

    if (error) {
      toast.error('Failed to clear host');
    } else {
      toast.success('Host cleared');
      setEvent(prev => prev ? { ...prev, host_user_id: null, location: 'TBC' } : null);
      setHostProfile(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Event deleted');
      navigate(`/club/${event.club_id}`);
    } catch (error) {
      toast.error('Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  // Memoized computed values
  const { goingList, waitlist, maybeList, totalCapacity, isAdmin } = useMemo(() => ({
    goingList: rsvps.filter(r => r.status === 'going' && !r.is_waitlisted),
    waitlist: rsvps.filter(r => r.is_waitlisted).sort((a, b) => 
      (a.waitlist_position || 0) - (b.waitlist_position || 0)),
    maybeList: rsvps.filter(r => r.status === 'maybe'),
    totalCapacity: event ? event.max_tables * event.seats_per_table : 0,
    isAdmin: userRole === 'owner' || userRole === 'admin'
  }), [rsvps, event, userRole]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container relative flex items-center justify-center h-16 px-4">
            <Skeleton className="h-8 w-8 absolute left-4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-8 absolute right-4" />
          </div>
        </header>
        <main className="container px-4 py-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-16 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/club/${event.club_id}`)}
            className="absolute left-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-2">
            <ShareEvent
              eventId={event.id}
              eventTitle={event.title}
              eventDate={event.final_date}
              location={event.location}
              goingCount={goingList.length}
              capacity={totalCapacity}
            />
          </div>
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

      {/* Delete Event Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('event.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('event.delete_description', { title: event.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('event.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('event.delete_event')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Event Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gold-gradient flex-1">{event.title}</h1>
            {event.is_finalized ? (
              <Badge variant="default">{t('event.confirmed')}</Badge>
            ) : (
              <Badge variant="secondary">{t('event.voting')}</Badge>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}
        </div>

        {/* RSVP Buttons */}
        <RsvpButtons 
          currentStatus={userRsvp}
          onRsvp={handleRsvp}
        />

        {/* Tabs for different sections */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="details" className="flex flex-col items-center gap-1 py-2">
              <Info className="h-4 w-4" />
              <span className="text-xs">{t('event.details')}</span>
            </TabsTrigger>
            <TabsTrigger value="attendees" className="flex flex-col items-center gap-1 py-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">{t('event.attendees')}</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex flex-col items-center gap-1 py-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{t('club.chat')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Event Info Card */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-4 space-y-3">
                {event.final_date && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-foreground">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {format(new Date(event.final_date), "EEEE, MMMM d 'at' h:mm a", { locale: dateLocale })}
                      </span>
                    </div>
                    {userRole === 'owner' && (
                      <Button variant="ghost" size="sm" onClick={handleUnfinalizeDate} className="text-xs">
                        {t('common.change')}
                      </Button>
                    )}
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-5 w-5" />
                    <span>{event.location}</span>
                  </div>
                )}
                {hostProfile && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-5 w-5" />
                      <span>{t('event.hosted_by')} <span className="text-foreground font-medium">{hostProfile.display_name}</span></span>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={handleClearHost} className="text-xs">
                        {t('common.change')}
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-5 w-5" />
                  <span>
                    {event.max_tables} {event.max_tables === 1 ? t('event.table') : t('event.tables')} × {event.seats_per_table} {t('event.seats')} = {totalCapacity} {t('event.max')}
                  </span>
                </div>
                {isAdmin && event.is_finalized && (
                  <Button 
                    className="w-full mt-4 glow-gold"
                    onClick={() => navigate(`/event/${eventId}/game`)}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {t('game.start_game_mode')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Date Voting (if not finalized) */}
            {!event.is_finalized && (
              <DateVoting 
                options={dateOptions}
                onVote={handleVote}
                onFinalize={isAdmin ? handleFinalizeDate : undefined}
              />
            )}

            {/* Host Volunteer - show when no host OR when admin wants to change OR when user is a volunteer (to withdraw) */}
            {(!event.host_user_id || isAdmin || hostVolunteers.includes(user?.id || '')) && (
              <HostVolunteer
                eventId={event.id}
                volunteers={hostVolunteers}
                currentUserId={user?.id || ''}
                onVolunteer={() => handleHostVolunteer()}
                onConfirm={isAdmin ? handleConfirmHost : undefined}
                showVolunteerSection={!event.host_user_id}
                confirmedHostId={event.host_user_id}
              />
            )}
          </TabsContent>

          {/* Attendees Tab */}

          {/* Attendees Tab */}
          <TabsContent value="attendees" className="mt-4">
            <AttendeesList 
              going={goingList}
              waitlist={waitlist}
              maybe={maybeList}
              capacity={totalCapacity}
            />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <Card className="bg-card/50 border-border/50 h-[60vh]">
              <ChatWindow clubId={event.club_id} eventId={event.id} />
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Host Address Dialog */}
      <HostAddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onSubmit={(address) => handleHostVolunteer(address)}
        loading={volunteerLoading}
      />
    </div>
  );
}
