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

    const { tournament_id } = await req.json();
    if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tournament } = await admin.from("poker_tournaments").select("*").eq("id", tournament_id).single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get players with profiles
    const { data: players } = await admin.from("poker_tournament_players").select("*").eq("tournament_id", tournament_id).order("registered_at");

    const playerIds = (players || []).map((p: any) => p.player_id);
    const { data: profiles } = await admin.from("profiles").select("id, display_name, avatar_url").in("id", playerIds.length > 0 ? playerIds : ["none"]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const enrichedPlayers = (players || []).map((p: any) => ({
      ...p,
      display_name: profileMap.get(p.player_id)?.display_name || "Player",
      avatar_url: profileMap.get(p.player_id)?.avatar_url || null,
    }));

    // Get tables
    const { data: tables } = await admin.from("poker_tables").select("id, name, status, small_blind, big_blind, ante, max_seats").eq("tournament_id", tournament_id).order("name");

    // For each table, get seat counts
    const tableIds = (tables || []).map((t: any) => t.id);
    const { data: seats } = await admin.from("poker_seats").select("table_id, player_id, status").in("table_id", tableIds.length > 0 ? tableIds : ["none"]).eq("status", "active").not("player_id", "is", null);

    const seatCounts = new Map<string, number>();
    (seats || []).forEach((s: any) => { seatCounts.set(s.table_id, (seatCounts.get(s.table_id) || 0) + 1); });

    const enrichedTables = (tables || []).map((t: any) => ({
      ...t,
      player_count: seatCounts.get(t.id) || 0,
    }));

    // Calculate current blind level info
    const schedule = tournament.blind_schedule as any[];
    const currentLevelData = schedule.find((l: any) => l.level === tournament.current_level) || schedule[0];

    // Time remaining in current level
    let timeRemainingSeconds: number | null = null;
    if (tournament.level_started_at && currentLevelData?.duration_minutes) {
      const elapsed = (Date.now() - new Date(tournament.level_started_at).getTime()) / 1000;
      timeRemainingSeconds = Math.max(0, currentLevelData.duration_minutes * 60 - elapsed);
    }

    // Find which table the current user is at
    const myPlayer = enrichedPlayers.find((p: any) => p.player_id === user.id);

    return new Response(JSON.stringify({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        tournament_type: tournament.tournament_type,
        max_players: tournament.max_players,
        starting_stack: tournament.starting_stack,
        current_level: tournament.current_level,
        level_started_at: tournament.level_started_at,
        started_at: tournament.started_at,
        completed_at: tournament.completed_at,
        created_by: tournament.created_by,
        invite_code: tournament.invite_code,
        club_id: tournament.club_id,
        late_reg_levels: tournament.late_reg_levels,
        payout_structure: tournament.payout_structure,
      },
      blind_schedule: schedule,
      current_blinds: currentLevelData,
      time_remaining_seconds: timeRemainingSeconds,
      players: enrichedPlayers,
      tables: enrichedTables,
      my_table_id: myPlayer?.table_id || null,
      players_remaining: enrichedPlayers.filter((p: any) => p.status === "playing").length,
      total_players: enrichedPlayers.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("poker-tournament-state error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
