import { supabase } from '@/integrations/supabase/client';
import { sendEmail } from './email';
import { eventUnlockedTemplate } from './email-templates';
import { buildAppUrl } from './app-url';
import { format } from 'date-fns';

/**
 * Send email notifications to club members when an event is unlocked for RSVP/voting.
 * Respects user's email_event_created preference.
 */
export async function sendEventUnlockedEmails(
  eventId: string,
  clubId: string
): Promise<void> {
  try {
    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (!event) {
      console.error('Event not found for email notification');
      return;
    }

    // Get club name
    const { data: club } = await supabase
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .single();

    if (!club) {
      console.error('Club not found for email notification');
      return;
    }

    // Get date options for this event
    const { data: dateOptions } = await supabase
      .from('event_date_options')
      .select('proposed_date')
      .eq('event_id', eventId)
      .order('proposed_date');

    const formattedDates = dateOptions?.map(d => 
      format(new Date(d.proposed_date), "EEEE, MMMM d 'at' h:mm a")
    ) || [];

    // Get all club members (except current user)
    const { data: { user } } = await supabase.auth.getUser();
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId);

    if (!members || members.length === 0) return;

    const memberIds = members.map(m => m.user_id).filter(id => id !== user?.id);

    // Get user preferences - only send to users with email_event_created enabled
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('user_id, email_event_created')
      .in('user_id', memberIds);

    // Create a map of user preferences (default to true if not set)
    const prefsMap = new Map<string, boolean>();
    preferences?.forEach(p => {
      prefsMap.set(p.user_id, p.email_event_created !== false);
    });

    // Filter to only users who want emails
    const eligibleUserIds = memberIds.filter(id => prefsMap.get(id) !== false);

    if (eligibleUserIds.length === 0) return;

    // Get email addresses for eligible users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', eligibleUserIds);

    if (!profiles || profiles.length === 0) return;

    const eventUrl = buildAppUrl(`/event/${eventId}`);

    // Send emails in parallel (fire and forget each one)
    await Promise.allSettled(
      profiles
        .filter(p => p.email)
        .map(async (profile) => {
          try {
            const html = eventUnlockedTemplate({
              eventTitle: event.title,
              clubName: club.name,
              dateOptions: formattedDates,
              eventUrl,
            });

            await sendEmail({
              to: profile.email!,
              subject: `Voting open for ${event.title}`,
              html,
            });
          } catch (err) {
            console.error(`Failed to send event unlock email to ${profile.email}:`, err);
          }
        })
    );
  } catch (error) {
    console.error('Failed to send event unlocked emails:', error);
    // Don't throw - email is optional
  }
}
