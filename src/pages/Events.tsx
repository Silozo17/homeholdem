import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, Clock, CheckCircle } from 'lucide-react';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  title: string;
  final_date: string | null;
  location: string | null;
  is_finalized: boolean;
  club_id: string;
  clubs: {
    name: string;
  };
  rsvp_count: number;
  user_rsvp: string | null;
  earliest_option_date?: string | null;
}

export default function Events() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoadingEvents(true);

    // Get clubs user is member of
    const { data: memberships } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setEvents([]);
      setLoadingEvents(false);
      return;
    }

    const clubIds = memberships.map(m => m.club_id);

    // Get events from those clubs
    const { data: eventsData } = await supabase
      .from('events')
      .select(`
        id,
        title,
        final_date,
        location,
        is_finalized,
        club_id,
        clubs (name)
      `)
      .in('club_id', clubIds)
      .order('final_date', { ascending: false, nullsFirst: false });

    if (eventsData) {
      // Fetch earliest date option for pending events (those without final_date)
      const pendingEventIds = eventsData.filter(e => !e.final_date).map(e => e.id);
      let dateOptionsMap: Record<string, string> = {};
      
      if (pendingEventIds.length > 0) {
        const { data: dateOptions } = await supabase
          .from('event_date_options')
          .select('event_id, proposed_date')
          .in('event_id', pendingEventIds)
          .order('proposed_date', { ascending: true });
        
        if (dateOptions) {
          // Get earliest date for each event
          dateOptions.forEach(opt => {
            if (!dateOptionsMap[opt.event_id]) {
              dateOptionsMap[opt.event_id] = opt.proposed_date;
            }
          });
        }
      }

      // Get RSVP counts and user's RSVP status
      const eventsWithRsvps = await Promise.all(
        eventsData.map(async (event) => {
          const { count } = await supabase
            .from('event_rsvps')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('status', 'going');

          const { data: userRsvp } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...event,
            clubs: event.clubs as { name: string },
            rsvp_count: count || 0,
            user_rsvp: userRsvp?.status || null,
            earliest_option_date: dateOptionsMap[event.id] || null,
          };
        })
      );

      setEvents(eventsWithRsvps);
    }

    setLoadingEvents(false);
  };

  const upcomingEvents = events
    .filter(e => e.final_date && (isFuture(new Date(e.final_date)) || isToday(new Date(e.final_date))))
    .sort((a, b) => new Date(a.final_date!).getTime() - new Date(b.final_date!).getTime());
  
  const pendingEvents = events
    .filter(e => !e.final_date)
    .sort((a, b) => {
      // Sort by earliest proposed date option (nearest first)
      if (!a.earliest_option_date && !b.earliest_option_date) return 0;
      if (!a.earliest_option_date) return 1;
      if (!b.earliest_option_date) return -1;
      return new Date(a.earliest_option_date).getTime() - new Date(b.earliest_option_date).getTime();
    });
  
  const pastEvents = events
    .filter(e => e.final_date && isPast(new Date(e.final_date)) && !isToday(new Date(e.final_date)))
    .sort((a, b) => new Date(b.final_date!).getTime() - new Date(a.final_date!).getTime());

  const getRsvpBadge = (rsvp: string | null) => {
    switch (rsvp) {
      case 'going':
        return <Badge className="bg-success/20 text-success border-success/30">{t('event.going')}</Badge>;
      case 'maybe':
        return <Badge variant="secondary">{t('event.maybe')}</Badge>;
      case 'not_going':
        return <Badge variant="outline" className="text-muted-foreground">{t('event.not_going')}</Badge>;
      default:
        return <Badge variant="outline">{t('event.no_rsvp')}</Badge>;
    }
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card 
      className="bg-card/50 border-border/50 cursor-pointer hover:bg-card/80 transition-colors"
      onClick={() => navigate(`/event/${event.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">{event.clubs.name}</p>
          </div>
          {getRsvpBadge(event.user_rsvp)}
        </div>
        
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
          {event.final_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(event.final_date), 'EEE, MMM d', { locale: dateLocale })}
            </div>
          )}
          {event.final_date && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(event.final_date), 'h:mm a', { locale: dateLocale })}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {t('event.going_count', { count: event.rsvp_count })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading || loadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container flex items-center justify-center h-16 px-4">
          <Logo size="sm" />
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

      <main className="container px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gold-gradient flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            {t('nav.events')}
          </h2>
          <p className="text-muted-foreground">
            {t('event.all_poker_nights')}
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full flex justify-between bg-muted/50">
            <TabsTrigger value="upcoming" className="flex-1 text-xs sm:text-sm px-2 sm:px-3">
              {t('event.upcoming')} ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 text-xs sm:text-sm px-2 sm:px-3">
              {t('event.pending')} ({pendingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 text-xs sm:text-sm px-2 sm:px-3">
              {t('event.past')} ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {upcomingEvents.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-8 text-center">
                  <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t('event.no_upcoming')}</p>
                </CardContent>
              </Card>
            ) : (
              upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingEvents.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-8 text-center">
                  <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t('event.no_pending')}</p>
                </CardContent>
              </Card>
            ) : (
              pendingEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-4">
            {pastEvents.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">{t('event.no_past')}</p>
                </CardContent>
              </Card>
            ) : (
              pastEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
