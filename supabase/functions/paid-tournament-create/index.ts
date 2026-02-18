import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Admin check via app_admins table
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: adminRow } = await admin.from("app_admins").select("id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { name, entry_fee_pence, max_players, starting_stack, starting_sb, starting_bb, starting_ante, blind_interval_minutes, payout_preset, start_at } = body;

    if (!name || !entry_fee_pence || !max_players || !start_at) {
      return new Response(JSON.stringify({ error: "name, entry_fee_pence, max_players, start_at required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Compute payout_structure from preset
    const presets: Record<string, { position: number; percentage: number }[]> = {
      winner_takes_all: [{ position: 1, percentage: 100 }],
      top_2: [{ position: 1, percentage: 70 }, { position: 2, percentage: 30 }],
      top_3: [{ position: 1, percentage: 60 }, { position: 2, percentage: 30 }, { position: 3, percentage: 10 }],
    };
    const preset = payout_preset || "winner_takes_all";
    const structure = presets[preset] || presets.winner_takes_all;

    const { data, error } = await admin.from("paid_tournaments").insert({
      name,
      entry_fee_pence,
      max_players: Math.min(Math.max(max_players, 9), 900),
      starting_stack: starting_stack || 5000,
      starting_sb: starting_sb || 25,
      starting_bb: starting_bb || 50,
      starting_ante: starting_ante || 0,
      blind_interval_minutes: blind_interval_minutes || 15,
      payout_preset: preset,
      payout_structure: structure,
      start_at,
      created_by: user.id,
      status: "draft",
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ tournament: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paid-tournament-create error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
