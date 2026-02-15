import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  for (const b of arr) result += chars[b % chars.length];
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const {
      name,
      tournament_type = "freezeout",
      max_players = 18,
      starting_stack = 5000,
      players_per_table = 9,
      blind_schedule,
      payout_structure = null,
      club_id = null,
      late_reg_levels = 3,
    } = body;

    if (!name?.trim()) return new Response(JSON.stringify({ error: "name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const defaultSchedule = [
      { level: 1, small: 25, big: 50, ante: 0, duration_minutes: 15 },
      { level: 2, small: 50, big: 100, ante: 0, duration_minutes: 15 },
      { level: 0, break: true, duration_minutes: 5 },
      { level: 3, small: 75, big: 150, ante: 25, duration_minutes: 15 },
      { level: 4, small: 100, big: 200, ante: 25, duration_minutes: 15 },
      { level: 5, small: 150, big: 300, ante: 50, duration_minutes: 15 },
      { level: 0, break: true, duration_minutes: 5 },
      { level: 6, small: 200, big: 400, ante: 50, duration_minutes: 15 },
      { level: 7, small: 300, big: 600, ante: 75, duration_minutes: 12 },
      { level: 8, small: 500, big: 1000, ante: 100, duration_minutes: 12 },
      { level: 9, small: 750, big: 1500, ante: 150, duration_minutes: 10 },
      { level: 10, small: 1000, big: 2000, ante: 200, duration_minutes: 10 },
    ];

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // If club_id, verify membership
    if (club_id) {
      const { data: member } = await admin.from("club_members").select("role").eq("club_id", club_id).eq("user_id", user.id).single();
      if (!member || !["owner", "admin"].includes(member.role)) {
        return new Response(JSON.stringify({ error: "Only club admins can create tournaments" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const invite_code = generateCode();

    const { data: tournament, error } = await admin.from("poker_tournaments").insert({
      name: name.trim(),
      tournament_type,
      max_players,
      starting_stack,
      players_per_table,
      blind_schedule: blind_schedule || defaultSchedule,
      payout_structure,
      club_id,
      created_by: user.id,
      invite_code,
      late_reg_levels,
      status: "registering",
    }).select().single();

    if (error) throw error;

    // Auto-register creator
    await admin.from("poker_tournament_players").insert({
      tournament_id: tournament.id,
      player_id: user.id,
      stack: starting_stack,
      status: "registered",
    });

    return new Response(JSON.stringify({ tournament }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("poker-create-tournament error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
