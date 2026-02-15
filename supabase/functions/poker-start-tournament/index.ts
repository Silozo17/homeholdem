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

    const { tournament_id } = await req.json();
    if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tournament } = await admin.from("poker_tournaments").select("*").eq("id", tournament_id).single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (tournament.created_by !== user.id) return new Response(JSON.stringify({ error: "Only creator can start" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (tournament.status !== "registering") return new Response(JSON.stringify({ error: "Tournament already started" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get registered players
    const { data: players } = await admin.from("poker_tournament_players").select("*").eq("tournament_id", tournament_id).eq("status", "registered").order("registered_at");
    if (!players || players.length < 2) return new Response(JSON.stringify({ error: "Need at least 2 players" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ppt = tournament.players_per_table;
    const numTables = Math.ceil(players.length / ppt);

    // Get first blind level
    const schedule = tournament.blind_schedule as any[];
    const firstLevel = schedule.find((l: any) => !l.break) || { small: 25, big: 50, ante: 0 };

    // Create tables
    const tableIds: string[] = [];
    for (let t = 0; t < numTables; t++) {
      const { data: table, error: tErr } = await admin.from("poker_tables").insert({
        name: `${tournament.name} - Table ${t + 1}`,
        table_type: "club",
        max_seats: ppt,
        small_blind: firstLevel.small,
        big_blind: firstLevel.big,
        ante: firstLevel.ante || 0,
        min_buy_in: tournament.starting_stack,
        max_buy_in: tournament.starting_stack,
        created_by: user.id,
        club_id: tournament.club_id,
        tournament_id: tournament_id,
        status: "waiting",
        invite_code: generateCode(),
      }).select().single();

      if (tErr) throw tErr;
      tableIds.push(table.id);

      // Create empty seats
      for (let s = 0; s < ppt; s++) {
        await admin.from("poker_seats").insert({ table_id: table.id, seat_number: s, stack: 0, status: "empty" });
      }
    }

    // Assign players round-robin to tables and seats
    for (let i = 0; i < players.length; i++) {
      const tableIndex = i % numTables;
      const seatNumber = Math.floor(i / numTables);
      const tableId = tableIds[tableIndex];

      // Seat the player
      await admin.from("poker_seats").update({
        player_id: players[i].player_id,
        stack: tournament.starting_stack,
        status: "active",
      }).eq("table_id", tableId).eq("seat_number", seatNumber);

      // Update tournament player record
      await admin.from("poker_tournament_players").update({
        table_id: tableId,
        seat_number: seatNumber,
        status: "playing",
      }).eq("id", players[i].id);
    }

    // Update tournament status
    const now = new Date().toISOString();
    await admin.from("poker_tournaments").update({
      status: "running",
      started_at: now,
      current_level: 1,
      level_started_at: now,
    }).eq("id", tournament_id);

    return new Response(JSON.stringify({
      tournament_id,
      tables: tableIds,
      player_count: players.length,
      table_count: numTables,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("poker-start-tournament error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
