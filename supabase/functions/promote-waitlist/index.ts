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

// Premium email template - inline with casino green theme
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
  <title>You're off the waitlist!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f1f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="padding: 24px 16px; background-color: #0f1f1a;">
    <div style="background: linear-gradient(180deg, #172a24 0%, #0d1916 100%); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(212, 175, 55, 0.1);">
      <div style="text-align: center; padding: 28px 16px 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.15); background: linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, transparent 100%);">
        <p style="color: #d4af37; font-size: 11px; font-weight: 600; letter-spacing: 4px; margin: 0; text-transform: uppercase;">♠ Home Hold'em Club ♠</p>
      </div>
      <div style="padding: 40px 28px; text-align: center;">
        <div style="font-size: 48px; line-height: 1; margin-bottom: 20px;">🎉</div>
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 12px; line-height: 1.3;">A spot opened up!</h1>
        <p style="color: #7a9e90; font-size: 15px; line-height: 1.5; margin: 0 0 28px;">
          ${safeName ? `Great news ${safeName}! ` : ''}You've been promoted from the waitlist and your seat is now confirmed.
        </p>
        <div style="background: linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.06) 100%); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 20px 24px; margin: 0 0 28px; text-align: left;">
          <p style="margin: 0 0 4px; color: #ffffff; font-weight: 600; font-size: 16px;">${safeTitle}</p>
          ${safeClubName ? `<p style="margin: 8px 0 0; color: #7a9e90; font-size: 13px;">🎴 ${safeClubName}</p>` : ''}
          ${safeDate ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">📅 ${safeDate}</p>` : ''}
          ${safeLocation ? `<p style="margin: 8px 0 0; color: #b8d4c8; font-size: 14px;">📍 ${safeLocation}</p>` : ''}
        </div>
        <a href="${safeUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b8962e 100%); color: #000000; font-weight: 600; font-size: 14px; padding: 16px 40px; border-radius: 8px; text-decoration: none; text-align: center; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);">
          View Event
        </a>
      </div>
      <div style="text-align: center; padding: 20px 24px; border-top: 1px solid rgba(212, 175, 55, 0.15); background: linear-gradient(0deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%);">
        <p style="color: #3d5e52; font-size: 11px; margin: 0; letter-spacing: 1px;">Home Hold'em Club</p>
        <p style="color: #2d4a40; font-size: 14px; letter-spacing: 8px; margin-top: 8px;">♥ ♠ ♦ ♣</p>
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
      subject: `🎉 You're off the waitlist for ${event.title}!`,
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
