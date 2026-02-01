import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { 
  generateVapidKeys, 
  exportVapidKeys, 
  exportApplicationServerKey 
} from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate new VAPID keys with extractable option
    const keys = await generateVapidKeys({ extractable: true });
    
    // Export as JWK format
    const exported = await exportVapidKeys(keys);
    
    // Export application server key (base64url encoded public key for browser)
    const publicKeyB64 = await exportApplicationServerKey(keys);

    return new Response(JSON.stringify({
      instructions: "Copy these values to your secrets:",
      VAPID_KEYS_JSON: JSON.stringify(exported),
      VITE_VAPID_PUBLIC_KEY: publicKeyB64,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Error generating VAPID keys:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
