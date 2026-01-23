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

// HTML escape function to prevent XSS
function escapeHtml(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (c) => htmlEscapeMap[c] || c);
}

// Premium event reminder email template with dark casino theme and shine effects
function eventReminderEmail(data: {
  eventTitle: string;
  eventDate: string;
  location?: string;
  clubName?: string;
  eventUrl: string;
  recipientName?: string;
}): string {
  const safeTitle = escapeHtml(data.eventTitle);
  const safeName = data.recipientName ? escapeHtml(data.recipientName) : undefined;
  const safeClubName = data.clubName ? escapeHtml(data.clubName) : undefined;
  const safeLocation = data.location ? escapeHtml(data.location) : undefined;
  const safeDate = escapeHtml(data.eventDate);
  const safeUrl = encodeURI(data.eventUrl);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body { background-color: #0f1f1a !important; }
  </style>
  <title>Poker Night Tomorrow!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" bgcolor="#0f1f1a">
  <div style="padding: 24px 16px; background-color: #0f1f1a;">
    <div style="background: linear-gradient(180deg, #172a24 0%, #0d1916 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);">
      <div style="text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 50%, transparent 100%);">
        <p style="color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase; text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);">♠ Home Hold'em Club ♠</p>
      </div>
      <div style="padding: 40px 28px; text-align: center;">
        <div style="font-size: 48px; line-height: 1; margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));">⏰</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">Tomorrow night</h1>
        <p style="color: #8fb5a5; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          ${safeName ? `Hey ${safeName}! ` : ''}Don't forget – you have a poker night coming up!
        </p>
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.12) 50%, rgba(212, 175, 55, 0.08) 100%); border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 0 30px rgba(212, 175, 55, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08);">
          <p style="margin: 0; color: #d4af37; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">🎰 Get Ready! 🎰</p>
        </div>
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.06) 50%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px 24px; margin: 0 0 28px; text-align: left; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06);">
          <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${safeTitle}</p>
          ${safeClubName ? `<p style="margin: 10px 0 0; color: #8fb5a5; font-size: 13px;">🎴 ${safeClubName}</p>` : ''}
          <p style="margin: 12px 0 0; color: #b8d4c8; font-size: 14px;">📅 ${safeDate}</p>
          ${safeLocation ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">📍 ${safeLocation}</p>` : ''}
        </div>
        <a href="${safeUrl}" style="display: inline-block; background: linear-gradient(135deg, #e8c84a 0%, #d4af37 40%, #b8962e 100%); color: #000000; font-weight: 700; font-size: 14px; padding: 16px 40px; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.1); text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);">
          View Details
        </a>
      </div>
      <div style="text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(0deg, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0.02) 50%, transparent 100%);">
        <p style="color: #4a7566; font-size: 11px; margin: 0; letter-spacing: 1px;">Home Hold'em Club</p>
        <p style="color: #3d5e52; font-size: 14px; letter-spacing: 8px; margin-top: 8px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.2);">♥ ♠ ♦ ♣</p>
      </div>
    </div>
  </div>
</body>
</html>`;
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

      // Build event URL
      const eventUrl = `https://homeholdem.lovable.app/event/${event.id}`;

      // Send reminder to each attendee
      for (const profile of profiles) {
        if (!profile.email) continue;

        const html = eventReminderEmail({
          eventTitle: event.title,
          eventDate: formattedDate,
          location: event.location || undefined,
          clubName: club?.name,
          eventUrl,
          recipientName: profile.display_name,
        });

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
