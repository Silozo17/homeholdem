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

    const { tournament_id, eliminated_player_id } = await req.json();
    if (!tournament_id || !eliminated_player_id) return new Response(JSON.stringify({ error: "tournament_id and eliminated_player_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tournament } = await admin.from("poker_tournaments").select("*").eq("id", tournament_id).single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (tournament.status !== "running") return new Response(JSON.stringify({ error: "Tournament not running" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Count remaining players for finish position
    const { data: allPlayers } = await admin.from("poker_tournament_players").select("*").eq("tournament_id", tournament_id);
    const remainingBefore = (allPlayers || []).filter((p: any) => p.status === "playing").length;
    const finishPosition = remainingBefore; // e.g., 5 remaining = this player finishes 5th

    // Eliminate the player
    const now = new Date().toISOString();
    await admin.from("poker_tournament_players").update({
      status: "eliminated",
      eliminated_at: now,
      finish_position: finishPosition,
    }).eq("tournament_id", tournament_id).eq("player_id", eliminated_player_id);

    const remainingAfter = remainingBefore - 1;

    // Check if tournament is over (1 player left)
    if (remainingAfter <= 1) {
      // Set winner
      const winner = (allPlayers || []).find((p: any) => p.player_id !== eliminated_player_id && p.status === "playing");
      if (winner) {
        await admin.from("poker_tournament_players").update({
          finish_position: 1,
        }).eq("id", winner.id);

        // Calculate payouts if payout_structure exists
        if (tournament.payout_structure) {
          const totalBuyIn = tournament.starting_stack * (allPlayers || []).length;
          const payouts = tournament.payout_structure as any[];
          for (const payout of payouts) {
            const player = (allPlayers || []).find((p: any) => {
              if (p.player_id === eliminated_player_id && payout.position === finishPosition) return true;
              if (p.player_id === winner.player_id && payout.position === 1) return true;
              return p.finish_position === payout.position;
            });
            if (player) {
              const amount = Math.round(totalBuyIn * (payout.percentage / 100));
              await admin.from("poker_tournament_players").update({ payout_amount: amount }).eq("id", player.id);
            }
          }
        }
      }

      // Complete tournament
      await admin.from("poker_tournaments").update({
        status: "completed",
        completed_at: now,
      }).eq("id", tournament_id);

      // Close all tournament tables
      const { data: tables } = await admin.from("poker_tables").select("id").eq("tournament_id", tournament_id);
      for (const t of (tables || [])) {
        await admin.from("poker_tables").update({ status: "closed" }).eq("id", t.id);
      }

      return new Response(JSON.stringify({
        eliminated: true,
        finish_position: finishPosition,
        tournament_complete: true,
        winner_id: winner?.player_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Table balancing check
    let balanceAction: any = null;
    const tables = await admin.from("poker_tables").select("id").eq("tournament_id", tournament_id).neq("status", "closed");
    if ((tables.data || []).length > 1) {
      const tableIds = (tables.data || []).map((t: any) => t.id);
      const tableCounts: { id: string; count: number }[] = [];

      for (const tid of tableIds) {
        const { count } = await admin.from("poker_seats").select("id", { count: "exact", head: true }).eq("table_id", tid).eq("status", "active").not("player_id", "is", null);
        tableCounts.push({ id: tid, count: count || 0 });
      }

      // Check if remaining players fit in one table → merge
      const ppt = tournament.players_per_table;
      if (remainingAfter <= ppt && tableCounts.length > 1) {
        balanceAction = { type: "merge", message: `All ${remainingAfter} players fit at one table. Final table merge needed.` };
      } else {
        // Check imbalance (difference > 1)
        const max = Math.max(...tableCounts.map(t => t.count));
        const min = Math.min(...tableCounts.map(t => t.count));
        if (max - min >= 2) {
          balanceAction = { type: "balance", message: "Tables unbalanced, rebalancing needed." };
        }
      }
    }

    // Broadcast elimination
    const channel = admin.channel(`tournament:${tournament_id}`);
    await channel.send({
      type: "broadcast",
      event: "elimination",
      payload: {
        eliminated_player_id,
        finish_position: finishPosition,
        players_remaining: remainingAfter,
        balance_action: balanceAction,
      },
    });

    return new Response(JSON.stringify({
      eliminated: true,
      finish_position: finishPosition,
      players_remaining: remainingAfter,
      tournament_complete: false,
      balance_action: balanceAction,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("poker-tournament-eliminate error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
