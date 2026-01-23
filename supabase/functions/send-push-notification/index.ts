import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  user_ids: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  notification_type?: 'rsvp_updates' | 'date_finalized' | 'waitlist_promotion' | 'chat_messages' | 'blinds_up';
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: object
): Promise<boolean> {
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send push:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_ids, title, body, icon, url, tag, notification_type }: PushRequest = await req.json();

    if (!user_ids || !user_ids.length || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_ids, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user preferences if notification_type is specified
    let filteredUserIds = user_ids;
    if (notification_type) {
      const preferenceColumn = `push_${notification_type}`;
      
      const { data: preferences, error: prefError } = await supabase
        .from("user_preferences")
        .select("user_id")
        .in("user_id", user_ids)
        .eq(preferenceColumn, true);

      if (prefError) {
        console.error("Error fetching preferences:", prefError);
        // Continue with all users if preference check fails
      } else if (preferences) {
        const enabledUserIds = new Set(preferences.map(p => p.user_id));
        // Include users who have enabled the preference OR users without preferences (defaults to true)
        const { data: allPrefs } = await supabase
          .from("user_preferences")
          .select("user_id")
          .in("user_id", user_ids);
        
        const usersWithPrefs = new Set((allPrefs || []).map(p => p.user_id));
        
        filteredUserIds = user_ids.filter(id => 
          enabledUserIds.has(id) || !usersWithPrefs.has(id)
        );
      }
    }

    if (filteredUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "All users have disabled this notification type" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for the filtered users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", filteredUserIds);

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found for the specified users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = {
      title,
      body,
      icon: icon || "/favicon.ico",
      url: url || "/",
      tag: tag || "poker-notification",
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendWebPush(sub, payload))
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;

    // Clean up failed subscriptions
    const failedIndices = results
      .map((r, i) => (r.status === "rejected" || !r.value ? i : -1))
      .filter((i) => i >= 0);

    if (failedIndices.length > 0) {
      const failedEndpoints = failedIndices.map((i) => subscriptions[i].endpoint);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: results.length - successCount,
        filtered_out: user_ids.length - filteredUserIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
