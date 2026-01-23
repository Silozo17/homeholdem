import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const PromoteSchema = z.object({
  event_id: z.string().uuid(),
  promoted_user_id: z.string().uuid(),
});

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

// Premium SVG icons
const partyPopperIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>`;

const sparklesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`;

const calendarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`;

const mapPinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

const cardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;

// Premium spade icon for header
const spadeIcon = `<span style="color: #d4af37; margin: 0 4px;">♠</span>`;

// Footer suits row
const footerSuits = `<div style="color: #3d5e52; font-size: 14px; letter-spacing: 8px; margin-top: 8px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.2);"><span style="color: #ef4444;">♥</span> <span style="color: #d4af37;">♠</span> <span style="color: #ef4444;">♦</span> <span style="color: #d4af37;">♣</span></div>`;

// Premium waitlist promotion email template with dark casino theme and premium SVG icons
function waitlistPromotionEmail(data: {
  eventTitle: string;
  eventDate?: string;
  location?: string;
  clubName?: string;
  eventUrl: string;
  recipientName?: string;
}): string {
  const safeTitle = escapeHtml(data.eventTitle);
  const safeName = data.recipientName ? escapeHtml(data.recipientName) : undefined;
  const safeClubName = data.clubName ? escapeHtml(data.clubName) : undefined;
  const safeLocation = data.location ? escapeHtml(data.location) : undefined;
  const safeDate = data.eventDate ? escapeHtml(data.eventDate) : undefined;
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
  <title>You're off the waitlist!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;" bgcolor="#0f1f1a">
  <div style="padding: 24px 16px; background-color: #0f1f1a;">
    <div style="background: linear-gradient(180deg, #172a24 0%, #0d1916 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);">
      <div style="text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(180deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.04) 50%, transparent 100%);">
        <p style="color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase; text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);">${spadeIcon}Home Hold'em Club${spadeIcon}</p>
      </div>
      <div style="padding: 40px 28px; text-align: center;">
        <div style="margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));">${partyPopperIcon}</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);">A spot opened up!</h1>
        <p style="color: #8fb5a5; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
          ${safeName ? `Great news ${safeName}! ` : ''}You've been promoted from the waitlist and your seat is now confirmed.
        </p>
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.12) 50%, rgba(212, 175, 55, 0.08) 100%); border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 0 30px rgba(212, 175, 55, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08);">
          <p style="margin: 0; color: #d4af37; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);">${sparklesIcon}Seat Confirmed</p>
        </div>
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.06) 50%, rgba(212, 175, 55, 0.03) 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 12px; padding: 20px 24px; margin: 0 0 28px; text-align: left; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06);">
          <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${safeTitle}</p>
          ${safeClubName ? `<p style="margin: 10px 0 0; color: #8fb5a5; font-size: 13px;">${cardIcon}${safeClubName}</p>` : ''}
          ${safeDate ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${calendarIcon}${safeDate}</p>` : ''}
          ${safeLocation ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">${mapPinIcon}${safeLocation}</p>` : ''}
        </div>
        <a href="${safeUrl}" style="display: inline-block; background: linear-gradient(135deg, #e8c84a 0%, #d4af37 40%, #b8962e 100%); color: #000000; font-weight: 700; font-size: 14px; padding: 16px 40px; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1px 0 rgba(0, 0, 0, 0.1); text-shadow: 0 1px 0 rgba(255, 255, 255, 0.2);">
          View Event
        </a>
      </div>
      <div style="text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.2); background: linear-gradient(0deg, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0.02) 50%, transparent 100%);">
        <p style="color: #4a7566; font-size: 11px; margin: 0; letter-spacing: 1px;">Home Hold'em Club</p>
        ${footerSuits}
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
    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = PromoteSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: parseResult.error.flatten().fieldErrors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_id, promoted_user_id } = parseResult.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("title, final_date, location, club_id")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", promoted_user_id)
      .single();

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get club name
    const { data: club } = await supabase
      .from("clubs")
      .select("name")
      .eq("id", event.club_id)
      .single();

    // Format date
    const eventDate = event.final_date 
      ? new Date(event.final_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : undefined;

    // Build event URL
    const eventUrl = `https://homeholdem.lovable.app/event/${event_id}`;

    const html = waitlistPromotionEmail({
      eventTitle: event.title,
      eventDate,
      location: event.location,
      clubName: club?.name,
      eventUrl,
      recipientName: profile.display_name,
    });

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Home Hold'em Club <noreply@hello.homeholdem.com>",
      to: [profile.email],
      subject: `You're off the waitlist for ${event.title}!`,
      html,
    });

    console.log("Waitlist promotion email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Waitlist promotion email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in promote-waitlist:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
