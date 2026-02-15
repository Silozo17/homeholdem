import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { tournament_id, invite_code } = await req.json();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find tournament by ID or invite code
    let query = admin.from("poker_tournaments").select("*");
    if (tournament_id) {
      query = query.eq("id", tournament_id);
    } else if (invite_code) {
      query = query.eq("invite_code", invite_code.toUpperCase());
    } else {
      return new Response(JSON.stringify({ error: "tournament_id or invite_code required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tournament } = await query.single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check status allows registration
    if (tournament.status !== "registering") {
      // Allow late registration if tournament is running and within late_reg_levels
      if (tournament.status === "running" && tournament.current_level <= tournament.late_reg_levels) {
        // Allow late reg
      } else {
        return new Response(JSON.stringify({ error: "Registration closed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // If club tournament, verify membership
    if (tournament.club_id) {
      const { data: member } = await admin.from("club_members").select("id").eq("club_id", tournament.club_id).eq("user_id", user.id).single();
      if (!member) return new Response(JSON.stringify({ error: "Club members only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check not already registered
    const { data: existing } = await admin.from("poker_tournament_players").select("id").eq("tournament_id", tournament.id).eq("player_id", user.id).maybeSingle();
    if (existing) return new Response(JSON.stringify({ error: "Already registered" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check capacity
    const { count } = await admin.from("poker_tournament_players").select("id", { count: "exact", head: true }).eq("tournament_id", tournament.id);
    if ((count || 0) >= tournament.max_players) return new Response(JSON.stringify({ error: "Tournament full" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Register
    const { data: reg, error } = await admin.from("poker_tournament_players").insert({
      tournament_id: tournament.id,
      player_id: user.id,
      stack: tournament.starting_stack,
      status: "registered",
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ registration: reg, tournament }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("poker-register-tournament error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
