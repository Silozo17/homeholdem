import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromoteRequest {
  event_id: string;
  promoted_user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_id, promoted_user_id }: PromoteRequest = await req.json();

    if (!event_id || !promoted_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing event_id or promoted_user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      : 'TBD';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 30px; text-align: center;">
          <h1 style="color: #22c55e; margin: 0;">🎉 You're In!</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #eee;">
          <p style="font-size: 16px; color: #333;">Great news, ${profile.display_name || 'Poker Pro'}!</p>
          <p style="font-size: 16px; color: #333;">A spot opened up and you've been <strong>promoted from the waitlist</strong> for:</p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h2 style="margin: 0 0 10px; color: #1a1a2e;">${event.title}</h2>
            <p style="margin: 5px 0; color: #666;"><strong>📅 When:</strong> ${eventDate}</p>
            ${event.location ? `<p style="margin: 5px 0; color: #666;"><strong>📍 Where:</strong> ${event.location}</p>` : ''}
            ${club?.name ? `<p style="margin: 5px 0; color: #666;"><strong>🎴 Club:</strong> ${club.name}</p>` : ''}
          </div>
          <p style="font-size: 16px; color: #333;">Your seat is now confirmed. See you at the table! 🃏</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            Home Hold'em Club - Your Private Poker Night Organizer
          </p>
        </div>
      </div>
    `;

    // Send the email
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Home Hold'em Club <poker@resend.dev>",
        to: [profile.email],
        subject: `🎉 You're off the waitlist for ${event.title}!`,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`Failed to send email: ${errorData}`);
    }

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
