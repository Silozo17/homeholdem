import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Event {
  id: string;
  title: string;
  final_date: string;
  location: string | null;
  club_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get events happening in the next 24-26 hours (to account for timing variance)
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in26Hours = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const { data: upcomingEvents, error: eventsError } = await supabase
      .from("events")
      .select("id, title, final_date, location, club_id")
      .not("final_date", "is", null)
      .gte("final_date", in24Hours.toISOString())
      .lte("final_date", in26Hours.toISOString());

    if (eventsError) throw eventsError;

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(
        JSON.stringify({ message: "No events to remind about" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailsSent: string[] = [];

    for (const event of upcomingEvents as Event[]) {
      // Get all RSVPs for this event who are 'going' and not waitlisted
      const { data: rsvps, error: rsvpError } = await supabase
        .from("event_rsvps")
        .select("user_id")
        .eq("event_id", event.id)
        .eq("status", "going")
        .eq("is_waitlisted", false);

      if (rsvpError || !rsvps) continue;

      const userIds = rsvps.map(r => r.user_id);

      // Get profiles with emails
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);

      if (profilesError || !profiles) continue;

      // Get club name
      const { data: club } = await supabase
        .from("clubs")
        .select("name")
        .eq("id", event.club_id)
        .single();

      // Format date nicely
      const eventDate = new Date(event.final_date);
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      // Send reminder to each attendee
      for (const profile of profiles) {
        if (!profile.email) continue;

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center;">
              <h1 style="color: #ffd700; margin: 0;">🃏 Poker Night Tomorrow!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #eee;">
              <p style="font-size: 16px; color: #333;">Hey ${profile.display_name || 'Poker Pro'}!</p>
              <p style="font-size: 16px; color: #333;">This is your 24-hour reminder for:</p>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin: 0 0 10px; color: #1a1a2e;">${event.title}</h2>
                <p style="margin: 5px 0; color: #666;"><strong>📅 When:</strong> ${formattedDate}</p>
                ${event.location ? `<p style="margin: 5px 0; color: #666;"><strong>📍 Where:</strong> ${event.location}</p>` : ''}
                ${club?.name ? `<p style="margin: 5px 0; color: #666;"><strong>🎴 Club:</strong> ${club.name}</p>` : ''}
              </div>
              <p style="font-size: 16px; color: #333;">Make sure you're ready to play! 🎰</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                Home Hold'em Club - Your Private Poker Night Organizer
              </p>
            </div>
          </div>
        `;

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Home Hold'em Club <noreply@hello.homeholdem.com>",
              to: [profile.email],
              subject: `🃏 Reminder: ${event.title} is tomorrow!`,
              html,
            }),
          });

          if (res.ok) {
            emailsSent.push(profile.email);
          }
        } catch (emailError) {
          console.error(`Failed to send to ${profile.email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${emailsSent.length} reminder emails`,
        events_processed: upcomingEvents.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-event-reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
