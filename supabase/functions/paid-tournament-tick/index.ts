import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const now = new Date();
    const results: any[] = [];

    // 1. Auto-start scheduled tournaments past start_at
    const { data: toStart } = await admin.from("paid_tournaments")
      .select("id")
      .eq("status", "scheduled")
      .lte("start_at", now.toISOString());

    if (toStart && toStart.length > 0) {
      // Call paid-tournament-start for each
      for (const t of toStart) {
        try {
          const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/paid-tournament-start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ tournament_id: t.id }),
          });
          const data = await res.json();
          results.push({ action: "auto_start", tournament_id: t.id, result: data });
        } catch (e) {
          results.push({ action: "auto_start", tournament_id: t.id, error: e.message });
        }
      }
    }

    // 2. Advance blinds for running tournaments
    const { data: running } = await admin.from("paid_tournaments")
      .select("*")
      .eq("status", "running");

    for (const tournament of (running || [])) {
      if (!tournament.level_started_at) continue;

      const levelStart = new Date(tournament.level_started_at);
      const elapsed = (now.getTime() - levelStart.getTime()) / 1000 / 60;

      if (elapsed >= tournament.blind_interval_minutes) {
        const newLevel = tournament.current_blind_level + 1;
        const multiplier = Math.pow(2, newLevel - 1);
        const newSb = tournament.starting_sb * multiplier;
        const newBb = tournament.starting_bb * multiplier;
        const newAnte = newLevel >= 3 ? Math.floor(tournament.starting_sb * Math.pow(2, newLevel - 3)) : 0;

        // Update tournament
        await admin.from("paid_tournaments").update({
          current_blind_level: newLevel,
          level_started_at: now.toISOString(),
        }).eq("id", tournament.id);

        // Update all tournament tables
        const { data: tables } = await admin.from("poker_tables")
          .select("id")
          .eq("paid_tournament_id", tournament.id)
          .neq("status", "closed");

        for (const table of (tables || [])) {
          await admin.from("poker_tables").update({
            small_blind: newSb,
            big_blind: newBb,
            ante: newAnte,
            blind_level: newLevel,
          }).eq("id", table.id);

          // Broadcast blinds_up
          const channel = admin.channel(`poker_table:${table.id}`);
          await channel.send({
            type: "broadcast",
            event: "blinds_up",
            payload: { level: newLevel, small_blind: newSb, big_blind: newBb, ante: newAnte },
          });
        }

        results.push({
          action: "blinds_advanced",
          tournament_id: tournament.id,
          new_level: newLevel,
          sb: newSb,
          bb: newBb,
          ante: newAnte,
        });
      }
    }

    // 3. Check for tournament completion and table balancing
    for (const tournament of (running || [])) {
      const { data: tables } = await admin.from("poker_tables")
        .select("id")
        .eq("paid_tournament_id", tournament.id)
        .neq("status", "closed");

      if (!tables || tables.length === 0) continue;

      // Count active players per table
      const tableCounts: { id: string; count: number; players: any[] }[] = [];
      let totalPlayers = 0;

      for (const table of tables) {
        const { data: seats } = await admin.from("poker_seats")
          .select("id, player_id, stack, seat_number")
          .eq("table_id", table.id)
          .not("player_id", "is", null)
          .gt("stack", 0);

        const activePlayers = seats || [];
        tableCounts.push({ id: table.id, count: activePlayers.length, players: activePlayers });
        totalPlayers += activePlayers.length;
      }

      // Tournament complete? (1 player left)
      if (totalPlayers <= 1) {
        const winner = tableCounts.find(t => t.count > 0)?.players[0];
        if (winner) {
          // Calculate prize pool
          const { data: regs } = await admin.from("paid_tournament_registrations")
            .select("paid_amount_pence")
            .eq("tournament_id", tournament.id)
            .eq("status", "paid");

          const totalPaid = (regs || []).reduce((sum: number, r: any) => sum + r.paid_amount_pence, 0);
          const prizePool = Math.floor(totalPaid * 5 / 9);

          // Get payout structure
          const payoutStructure = tournament.payout_structure as any[];
          const completedAt = new Date().toISOString();
          const dueAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

          // For now, winner gets full prize pool (winner_takes_all)
          // For top_2/top_3, we'd need finish positions tracked during eliminations
          for (const payout of payoutStructure) {
            if (payout.position === 1) {
              const amount = Math.floor(prizePool * payout.percentage / 100);
              await admin.from("paid_tournament_payouts").insert({
                tournament_id: tournament.id,
                user_id: winner.player_id,
                position: 1,
                amount_pence: amount,
                status: "pending",
                due_at: dueAt,
              });
            }
            // Position 2+ would come from elimination tracking
          }

          await admin.from("paid_tournaments").update({
            status: "complete",
            completed_at: completedAt,
          }).eq("id", tournament.id);

          // Close all tables
          for (const table of tables) {
            await admin.from("poker_tables").update({ status: "closed" }).eq("id", table.id);
          }

          results.push({ action: "tournament_complete", tournament_id: tournament.id, winner: winner.player_id });
        }
        continue;
      }

      // Table balancing: check if tables are uneven (diff >= 2)
      if (tableCounts.length > 1) {
        // Check if all fit in one table (merge)
        if (totalPlayers <= 9 && tableCounts.length > 1) {
          // Merge to the table with most players
          const targetTable = tableCounts.sort((a, b) => b.count - a.count)[0];
          for (const table of tableCounts) {
            if (table.id === targetTable.id) continue;
            // Check no active hand on source table
            const { data: activeHand } = await admin.from("poker_hands")
              .select("id")
              .eq("table_id", table.id)
              .is("completed_at", null)
              .maybeSingle();
            if (activeHand) continue; // Skip if hand in progress

            // Move players to target table
            for (const player of table.players) {
              // Find empty seat at target
              const { data: emptySeat } = await admin.from("poker_seats")
                .select("id, seat_number")
                .eq("table_id", targetTable.id)
                .is("player_id", null)
                .limit(1)
                .maybeSingle();

              if (emptySeat) {
                // Clear old seat
                await admin.from("poker_seats").update({
                  player_id: null, stack: 0, status: "active",
                }).eq("table_id", table.id).eq("player_id", player.player_id);

                // Fill new seat
                await admin.from("poker_seats").update({
                  player_id: player.player_id, stack: player.stack, status: "active",
                }).eq("id", emptySeat.id);
              }
            }
            // Close empty table
            await admin.from("poker_tables").update({ status: "closed" }).eq("id", table.id);
            results.push({ action: "table_merged", from: table.id, to: targetTable.id });
          }
        } else {
          // Balance: move from largest to smallest if diff >= 2
          const sorted = tableCounts.sort((a, b) => b.count - a.count);
          const largest = sorted[0];
          const smallest = sorted[sorted.length - 1];

          if (largest.count - smallest.count >= 2) {
            // Check no active hand on largest table
            const { data: activeHand } = await admin.from("poker_hands")
              .select("id")
              .eq("table_id", largest.id)
              .is("completed_at", null)
              .maybeSingle();

            if (!activeHand && largest.players.length > 0) {
              const playerToMove = largest.players[largest.players.length - 1];
              const { data: emptySeat } = await admin.from("poker_seats")
                .select("id")
                .eq("table_id", smallest.id)
                .is("player_id", null)
                .limit(1)
                .maybeSingle();

              if (emptySeat) {
                await admin.from("poker_seats").update({
                  player_id: null, stack: 0, status: "active",
                }).eq("table_id", largest.id).eq("player_id", playerToMove.player_id);

                await admin.from("poker_seats").update({
                  player_id: playerToMove.player_id, stack: playerToMove.stack, status: "active",
                }).eq("id", emptySeat.id);

                results.push({ action: "player_balanced", player: playerToMove.player_id, from: largest.id, to: smallest.id });
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ tick_results: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paid-tournament-tick error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
