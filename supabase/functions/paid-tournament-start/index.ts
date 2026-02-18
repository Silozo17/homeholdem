import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Can be called by admin manually or by cron
    const authHeader = req.headers.get("Authorization");
    let body: any = {};
    try { body = await req.json(); } catch {}

    const { tournament_id } = body;

    // If tournament_id provided, start that specific one (admin call)
    // Otherwise, find all scheduled tournaments past their start_at (cron call)
    const tournamentsToStart: any[] = [];

    if (tournament_id) {
      // Verify admin
      if (authHeader) {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminRow } = await admin.from("app_admins").select("id").eq("user_id", user.id).maybeSingle();
          if (!adminRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      const { data: t } = await admin.from("paid_tournaments").select("*").eq("id", tournament_id).single();
      if (t && t.status === "scheduled") tournamentsToStart.push(t);
    } else {
      // Cron: find all scheduled tournaments past start_at
      const { data: ts } = await admin.from("paid_tournaments")
        .select("*")
        .eq("status", "scheduled")
        .lte("start_at", new Date().toISOString());
      if (ts) tournamentsToStart.push(...ts);
    }

    const results: any[] = [];

    for (const tournament of tournamentsToStart) {
      // Get paid registrations
      const { data: regs } = await admin.from("paid_tournament_registrations")
        .select("user_id")
        .eq("tournament_id", tournament.id)
        .eq("status", "paid");

      const players = regs || [];
      if (players.length < 2) {
        results.push({ tournament_id: tournament.id, error: "Not enough players", count: players.length });
        continue;
      }

      // Calculate tables needed (max 9 per table)
      const playersPerTable = 9;
      const numTables = Math.ceil(players.length / playersPerTable);
      const now = new Date().toISOString();

      // Create tables
      const tableIds: string[] = [];
      for (let t = 0; t < numTables; t++) {
        const { data: table, error: tableErr } = await admin.from("poker_tables").insert({
          name: `${tournament.name} - Table ${t + 1}`,
          created_by: tournament.created_by,
          max_seats: 9,
          small_blind: tournament.starting_sb,
          big_blind: tournament.starting_bb,
          ante: tournament.starting_ante,
          original_small_blind: tournament.starting_sb,
          original_big_blind: tournament.starting_bb,
          blind_timer_minutes: tournament.blind_interval_minutes,
          table_type: "private",
          status: "active",
          paid_tournament_id: tournament.id,
          is_persistent: false,
        }).select("id").single();

        if (tableErr) { console.error("Table creation error:", tableErr); continue; }
        tableIds.push(table.id);

        // Create 9 empty seats
        const seats = Array.from({ length: 9 }, (_, i) => ({
          table_id: table.id,
          seat_number: i + 1,
          player_id: null,
          stack: 0,
          status: "active" as const,
        }));
        await admin.from("poker_seats").insert(seats);
      }

      // Round-robin seat players
      const shuffled = players.sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        const tableIdx = i % numTables;
        const seatNum = Math.floor(i / numTables) + 1;
        const tableId = tableIds[tableIdx];

        await admin.from("poker_seats").update({
          player_id: shuffled[i].user_id,
          stack: tournament.starting_stack,
          status: "active",
        }).eq("table_id", tableId).eq("seat_number", seatNum);
      }

      // Update tournament status
      await admin.from("paid_tournaments").update({
        status: "running",
        started_at: now,
        current_blind_level: 1,
        level_started_at: now,
      }).eq("id", tournament.id);

      results.push({
        tournament_id: tournament.id,
        tables_created: numTables,
        players_seated: shuffled.length,
        table_ids: tableIds,
      });
    }

    return new Response(JSON.stringify({ started: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paid-tournament-start error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

