import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ApplicationServer,
  importVapidKeys,
  type PushSubscription,
} from "jsr:@negrel/webpush@0.5.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VITE_VAPID_PUBLIC_KEY")!;

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
  notification_type?: 'rsvp_updates' | 'date_finalized' | 'waitlist_promotion' | 'chat_messages' | 'blinds_up' | 'game_completed' | 'event_unlocked' | 'member_rsvp' | 'member_vote' | 'game_started' | 'player_eliminated' | 'rebuy_addon';
}

/**
 * Convert base64 URL-safe VAPID keys to JWK format for the webpush library.
 * VAPID public key is 65 bytes (uncompressed P-256 point: 0x04 || x || y)
 * VAPID private key is 32 bytes (EC private key d value)
 */
function base64UrlToJwk(publicKeyB64: string, privateKeyB64: string): { publicKey: JsonWebKey; privateKey: JsonWebKey } {
  // Decode base64url to bytes
  const publicKeyBytes = base64UrlDecode(publicKeyB64);
  const privateKeyBytes = base64UrlDecode(privateKeyB64);
  
  // Public key is 65 bytes: 0x04 prefix + 32 bytes X + 32 bytes Y
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  const d = privateKeyBytes;
  
  const publicKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64Url(x),
    y: bytesToBase64Url(y),
    ext: true,
  };
  
  const privateKey: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64Url(x),
    y: bytesToBase64Url(y),
    d: bytesToBase64Url(d),
    ext: true,
  };
  
  return { publicKey, privateKey };
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  let padded = str;
  while (padded.length % 4 !== 0) {
    padded += "=";
  }
  // Convert base64url to base64
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Initialize VAPID application server lazily
let appServer: ApplicationServer | null = null;

async function getAppServer(): Promise<ApplicationServer> {
  if (!appServer) {
    // Convert base64 URL VAPID keys to JWK format
    const jwkKeys = base64UrlToJwk(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    
    // Import VAPID keys
    const vapidKeys = await importVapidKeys(jwkKeys);
    
    appServer = await ApplicationServer.new({
      contactInformation: "mailto:support@homeholdem.app",
      vapidKeys,
    });
  }
  return appServer;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: object
): Promise<boolean> {
  try {
    const server = await getAppServer();
    
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    const subscriber = server.subscribe(pushSubscription);
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return true;
  } catch (error) {
    console.error("Failed to send push:", error);
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

    // Validate VAPID keys are configured
    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    console.log(`Sending push to ${subscriptions.length} subscriptions`);

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendWebPush(sub, payload))
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;

    const failedCount = results.length - successCount;

    console.log(`Push results: ${successCount} success, ${failedCount} failed`);

    // Clean up failed subscriptions (they may be expired/unsubscribed)
    const failedIndices = results
      .map((r, i) => (r.status === "rejected" || (r.status === "fulfilled" && !r.value) ? i : -1))
      .filter((i) => i >= 0);

    if (failedIndices.length > 0) {
      const failedEndpoints = failedIndices.map((i) => subscriptions[i].endpoint);
      console.log(`Cleaning up ${failedEndpoints.length} failed subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
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
