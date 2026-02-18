import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ──
interface SeatState {
  seat_id: string;
  seat_number: number;
  player_id: string | null;
  stack: number;
  status: string;
  consecutive_timeouts: number;
}

function nextActiveSeat(
  seats: SeatState[],
  fromSeat: number,
  maxSeats: number,
  excludeStatuses: string[]
): number | null {
  for (let i = 1; i <= maxSeats; i++) {
    const s = (fromSeat + i) % maxSeats;
    const seat = seats.find(
      (se) => se.seat_number === s && se.player_id && !excludeStatuses.includes(se.status)
    );
    if (seat) return s;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Find stuck hands (deadline passed by 10s+) ──
    const cutoff = new Date(Date.now() - 5_000).toISOString();

    const { data: stuckHands, error } = await admin
      .from("poker_hands")
      .select("id, table_id, current_actor_seat, action_deadline, state_version, phase, community_cards, pots, current_bet, min_raise, dealer_seat, sb_seat, bb_seat, deck_seed_internal")
      .is("completed_at", null)
      .lt("action_deadline", cutoff)
      .not("action_deadline", "is", null)
      .not("current_actor_seat", "is", null);

    if (error) {
      console.error("Error querying stuck hands:", error);
      throw error;
    }

    const results: any[] = [];
    console.log(`[CHECK-TIMEOUTS] Found ${(stuckHands || []).length} stuck hand(s)`);

    for (const hand of stuckHands || []) {
      try {
        // Get table info
        const { data: table } = await admin
          .from("poker_tables")
          .select("max_seats, big_blind, small_blind, ante, id")
          .eq("id", hand.table_id)
          .single();

        if (!table) {
          console.error(`Table not found for hand ${hand.id}`);
          continue;
        }

        // Get all seats
        const { data: seats } = await admin
          .from("poker_seats")
          .select("id, seat_number, player_id, stack, status, consecutive_timeouts")
          .eq("table_id", hand.table_id);

        if (!seats) continue;

        // Get actions for this hand to determine fold status
        const { data: actions } = await admin
          .from("poker_actions")
          .select("player_id, action_type, amount, phase, sequence")
          .eq("hand_id", hand.id)
          .order("sequence", { ascending: true });

        // Build seat states with fold/all-in tracking from actions
        const seatStates: SeatState[] = seats
          .filter((s: any) => s.player_id)
          .map((s: any) => {
            let status = s.status === "sitting_out" || s.status === "disconnected" ? "folded" : "active";
            let totalBet = 0;
            let currentRoundBet = 0;

            for (const a of actions || []) {
              if (a.player_id !== s.player_id) continue;
              if (a.action_type === "fold") { status = "folded"; break; }
              totalBet += a.amount || 0;
              if (a.phase === hand.phase) currentRoundBet += a.amount || 0;
            }

            if (status === "active" && s.stack <= 0 && totalBet > 0) status = "all-in";

            return {
              seat_id: s.id,
              seat_number: s.seat_number,
              player_id: s.player_id,
              stack: s.stack,
              status,
              consecutive_timeouts: s.consecutive_timeouts || 0,
            };
          });

        // Find the actor seat
        const actorSeat = seatStates.find(
          (s) => s.seat_number === hand.current_actor_seat
        );

        if (!actorSeat || !actorSeat.player_id) {
          // Actor left the table — force-complete the hand
          console.log(`Actor seat ${hand.current_actor_seat} is empty for hand ${hand.id}, force-completing`);
          
          const nonFolded = seatStates.filter((s) => s.status !== "folded");
          if (nonFolded.length === 1) {
            // Award pot to the remaining player
            const winner = nonFolded[0];
            const totalPot = (hand.pots as any[]).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            winner.stack += totalPot;

            const dbSeatUpdates = seatStates.map((s) => {
              const originalSeat = seats.find((dbSeat: any) => dbSeat.id === s.seat_id);
              const wasNonParticipant = originalSeat?.status === "sitting_out" || originalSeat?.status === "disconnected";
              
              let dbStatus: string;
              if (wasNonParticipant) {
                dbStatus = originalSeat.status;
              } else if (s.status === "all-in" || s.status === "folded") {
                dbStatus = "active";
              } else {
                dbStatus = s.status;
              }
              
              return {
                seat_id: s.seat_id,
                stack: s.stack,
                status: dbStatus,
                consecutive_timeouts: s.consecutive_timeouts,
              };
            });

            const { data: commitResult } = await admin.rpc("commit_poker_state", {
              _hand_id: hand.id,
              _expected_version: hand.state_version,
              _new_phase: "complete",
              _community_cards: hand.community_cards,
              _pots: [{ amount: totalPot, winners: [winner.player_id] }],
              _current_actor_seat: null,
              _current_bet: 0,
              _min_raise: table.big_blind,
              _action_deadline: null,
              _completed_at: new Date().toISOString(),
              _results: {
                winners: [{ player_id: winner.player_id, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
                pots: [{ amount: totalPot, winners: [winner.player_id] }],
              },
              _deck_seed_revealed: null,
              _seat_updates: dbSeatUpdates,
              _action_record: null,
            });

            if (commitResult?.error) {
              console.error(`Commit failed for hand ${hand.id}: ${commitResult.error}`);
              results.push({ hand_id: hand.id, status: "commit_failed", error: commitResult.error });
              continue;
            }

        // Broadcast (parallel fetch)
        const pids1 = seatStates.filter(s => s.player_id).map(s => s.player_id!);
        const [profilesRes1, hcRes1] = await Promise.all([
          admin.from("profiles").select("id, display_name, avatar_url").in("id", pids1),
          admin.from("poker_hole_cards").select("player_id").eq("hand_id", hand.id),
        ]);
        const profileMap = new Map(((profilesRes1.data || []) as any[]).map((p: any) => [p.id, p]));
            const hcSet1 = new Set(((hcRes1.data || []) as any[]).map((r: any) => r.player_id));

            const channel = admin.channel(`poker:table:${hand.table_id}`);
            await channel.send({
              type: "broadcast",
              event: "game_state",
              payload: {
                hand_id: hand.id,
                phase: "complete",
                community_cards: hand.community_cards,
                pots: [{ amount: totalPot, winners: [winner.player_id] }],
                current_actor_seat: null,
                current_actor_id: null,
                dealer_seat: hand.dealer_seat,
                sb_seat: hand.sb_seat,
                bb_seat: hand.bb_seat,
                min_raise: table.big_blind,
                current_bet: 0,
                seats: seatStates.map((s) => {
                  const profile = profileMap.get(s.player_id!);
                  return {
                    seat: s.seat_number,
                    player_id: s.player_id,
                    display_name: profile?.display_name || "Player",
                    avatar_url: profile?.avatar_url || null,
                    stack: s.stack,
                    status: s.status,
                    current_bet: 0,
                    last_action: null,
                    has_cards: hcSet1.has(s.player_id) && s.status !== "folded",
                  };
                }),
                action_deadline: null,
                state_version: commitResult.state_version,
              },
            });

            await channel.send({
              type: "broadcast",
              event: "hand_result",
              payload: {
                hand_id: hand.id,
                winners: [{ player_id: winner.player_id, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
                revealed_cards: [],
                pots: [{ amount: totalPot, winners: [winner.player_id] }],
                community_cards: hand.community_cards,
                state_version: commitResult.state_version,
              },
            });

            await admin.from("poker_tables").update({ status: "waiting" }).eq("id", hand.table_id);
            results.push({ hand_id: hand.id, status: "force_completed_empty_seat" });
          }
          continue;
        }

        // ── Normal case: fold the timed-out actor ──
        actorSeat.status = "folded";
        actorSeat.consecutive_timeouts += 1;

        const nonFolded = seatStates.filter((s) => s.status !== "folded");

        let handComplete = false;
        let nextActorSeat: number | null = null;
        let newPhase = hand.phase;
        let completedResults: any = null;

        if (nonFolded.length <= 1) {
          // Hand is over — last player standing wins
          handComplete = true;
          newPhase = "complete";
          const winner = nonFolded[0];
          if (winner) {
            const totalPot = (hand.pots as any[]).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            winner.stack += totalPot;
            completedResults = {
              winners: [{ player_id: winner.player_id, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
              pots: [{ amount: totalPot, winners: [winner.player_id] }],
            };
          }
        } else {
          // Find next actor
          nextActorSeat = nextActiveSeat(
            seatStates,
            actorSeat.seat_number,
            table.max_seats,
            ["folded", "all-in", "sitting_out", "disconnected"]
          );
        }

        const actionDeadline = nextActorSeat !== null ? new Date(Date.now() + 45_000).toISOString() : null;

        const dbSeatUpdates = seatStates.map((s) => {
          const originalSeat = seats.find((dbSeat: any) => dbSeat.id === s.seat_id);
          const wasNonParticipant = originalSeat?.status === "sitting_out" || originalSeat?.status === "disconnected";
          
          let dbStatus: string;
          if (wasNonParticipant) {
            dbStatus = originalSeat.status;
          } else if (s.status === "all-in" || s.status === "folded") {
            dbStatus = "active";
          } else {
            dbStatus = s.status;
          }
          
          return {
            seat_id: s.seat_id,
            stack: s.stack,
            status: dbStatus,
            consecutive_timeouts: s.consecutive_timeouts,
          };
        });

        const actionRecord = {
          player_id: actorSeat.player_id,
          seat_number: actorSeat.seat_number,
          action_type: "fold",
          amount: 0,
          phase: hand.phase,
          sequence: (actions?.length || 0) + 1,
        };

        const finalPots = handComplete
          ? (completedResults?.pots || hand.pots)
          : hand.pots;

        const { data: commitResult } = await admin.rpc("commit_poker_state", {
          _hand_id: hand.id,
          _expected_version: hand.state_version,
          _new_phase: newPhase,
          _community_cards: hand.community_cards,
          _pots: finalPots,
          _current_actor_seat: nextActorSeat,
          _current_bet: hand.current_bet,
          _min_raise: hand.min_raise,
          _action_deadline: actionDeadline,
          _completed_at: handComplete ? new Date().toISOString() : null,
          _results: completedResults,
          _deck_seed_revealed: null,
          _seat_updates: dbSeatUpdates,
          _action_record: actionRecord,
        });

        if (commitResult?.error) {
          console.error(`Commit failed for hand ${hand.id}: ${commitResult.error}`);
          results.push({ hand_id: hand.id, status: "commit_failed", error: commitResult.error });
          continue;
        }

        // Broadcast updated game state
        const playerIds = seatStates.filter(s => s.player_id).map(s => s.player_id!);
        const [profilesRes2, hcRes2] = await Promise.all([
          admin.from("profiles").select("id, display_name, avatar_url").in("id", playerIds),
          admin.from("poker_hole_cards").select("player_id").eq("hand_id", hand.id),
        ]);
        const profileMap = new Map(((profilesRes2.data || []) as any[]).map((p: any) => [p.id, p]));
        const hcSet2 = new Set(((hcRes2.data || []) as any[]).map((r: any) => r.player_id));

        const publicState = {
          hand_id: hand.id,
          phase: newPhase,
          community_cards: hand.community_cards,
          pots: finalPots,
          current_actor_seat: nextActorSeat,
          current_actor_id: nextActorSeat !== null
            ? seatStates.find((s) => s.seat_number === nextActorSeat)?.player_id
            : null,
          dealer_seat: hand.dealer_seat,
          sb_seat: hand.sb_seat,
          bb_seat: hand.bb_seat,
          min_raise: hand.min_raise,
          current_bet: hand.current_bet,
          seats: seatStates.map((s) => {
            const profile = profileMap.get(s.player_id!);
            return {
              seat: s.seat_number,
              player_id: s.player_id,
              display_name: profile?.display_name || "Player",
              avatar_url: profile?.avatar_url || null,
              stack: s.stack,
              status: s.status,
              current_bet: 0,
              last_action: s.player_id === actorSeat.player_id ? "fold" : null,
              has_cards: hcSet2.has(s.player_id) && s.status !== "folded",
            };
          }),
          action_deadline: actionDeadline,
          state_version: commitResult.state_version,
        };

        const channel = admin.channel(`poker:table:${hand.table_id}`);
        await channel.send({ type: "broadcast", event: "game_state", payload: publicState });

        if (handComplete && completedResults) {
          await channel.send({
            type: "broadcast",
            event: "hand_result",
            payload: {
              hand_id: hand.id,
              winners: completedResults.winners,
              revealed_cards: [],
              pots: completedResults.pots,
              community_cards: hand.community_cards,
              state_version: commitResult.state_version,
            },
          });
          await admin.from("poker_tables").update({ status: "waiting" }).eq("id", hand.table_id);
        }

        console.log(`Auto-folded hand ${hand.id} seat ${actorSeat.seat_number} (timeouts: ${actorSeat.consecutive_timeouts})`);
        results.push({ hand_id: hand.id, status: "auto_folded", seat: actorSeat.seat_number });
      } catch (handErr: any) {
        console.error(`Error processing stuck hand ${hand.id}:`, handErr);
        results.push({ hand_id: hand.id, status: 500, error: handErr.message });
      }
    }

  // ── 2. Auto-kick players with 2+ consecutive timeouts ──
    const { data: timeoutSeats } = await admin
      .from("poker_seats")
      .select("id, table_id, player_id, seat_number, consecutive_timeouts")
      .gte("consecutive_timeouts", 2)
      .not("player_id", "is", null);

    const kickResults: any[] = [];
    for (const seat of timeoutSeats || []) {
      try {
        console.log(`Auto-kicking player ${seat.player_id} from table ${seat.table_id} (${seat.consecutive_timeouts} timeouts)`);

        // Clear the seat directly
        await admin
          .from("poker_seats")
          .update({ player_id: null, stack: 0, status: "active", consecutive_timeouts: 0 })
          .eq("id", seat.id);

        kickResults.push({ player_id: seat.player_id, table_id: seat.table_id, status: "kicked" });

        const channel = admin.channel(`poker:table:${seat.table_id}`);
        await channel.send({
          type: "broadcast",
          event: "seat_change",
          payload: { action: "kicked", seat: seat.seat_number, player_id: seat.player_id },
        });
      } catch (kickErr: any) {
        console.error(`Error kicking player ${seat.player_id}:`, kickErr);
        kickResults.push({ player_id: seat.player_id, status: 500, error: kickErr.message });
      }
    }

    // ── 3. Sweep tables past closing_at ──
    const closingResults: any[] = [];
    const { data: closingTables } = await admin
      .from("poker_tables")
      .select("id")
      .not("closing_at", "is", null)
      .lte("closing_at", new Date().toISOString());

    for (const ct of closingTables || []) {
      try {
        console.log(`[CHECK-TIMEOUTS] Sweeping expired closing table ${ct.id}`);

        // Force-complete any active hand
        const { data: activeHand } = await admin
          .from("poker_hands")
          .select("id")
          .eq("table_id", ct.id)
          .is("completed_at", null)
          .single();

        if (activeHand) {
          await admin.from("poker_hands").update({
            completed_at: new Date().toISOString(),
            phase: "complete",
          }).eq("id", activeHand.id);
        }

        // Broadcast table_closed
        const closingChannel = admin.channel(`poker:table:${ct.id}`);
        await closingChannel.send({
          type: "broadcast",
          event: "seat_change",
          payload: { action: "table_closed" },
        });

        // Cascade delete
        const { data: ctHands } = await admin.from("poker_hands").select("id").eq("table_id", ct.id);
        const ctHandIds = (ctHands || []).map((h: any) => h.id);
        if (ctHandIds.length > 0) {
          await admin.from("poker_hole_cards").delete().in("hand_id", ctHandIds);
          await admin.from("poker_actions").delete().in("hand_id", ctHandIds);
          await admin.from("poker_hands").delete().eq("table_id", ct.id);
        }
        await admin.from("poker_seats").delete().eq("table_id", ct.id);
        await admin.from("poker_tables").delete().eq("id", ct.id);

        closingResults.push({ table_id: ct.id, status: "deleted" });
      } catch (closingErr: any) {
        console.error(`Error sweeping closing table ${ct.id}:`, closingErr);
        closingResults.push({ table_id: ct.id, status: 500, error: closingErr.message });
      }
    }

    // ── 4. Kick players with stale heartbeats (90s+) ──
    const heartbeatCutoff = new Date(Date.now() - 90_000).toISOString();
    const { data: staleSeats } = await admin
      .from("poker_seats")
      .select("id, table_id, player_id, seat_number")
      .not("player_id", "is", null)
      .lt("last_heartbeat", heartbeatCutoff);

    const heartbeatKicks: any[] = [];
    for (const seat of staleSeats || []) {
      try {
        console.log(`[HEARTBEAT] Kicking stale player ${seat.player_id} from table ${seat.table_id}`);

        await admin
          .from("poker_seats")
          .update({ player_id: null, stack: 0, status: "active", consecutive_timeouts: 0 })
          .eq("id", seat.id);

        const hbChannel = admin.channel(`poker:table:${seat.table_id}`);
        await hbChannel.send({
          type: "broadcast",
          event: "seat_change",
          payload: { action: "disconnected", seat: seat.seat_number, player_id: seat.player_id },
        });

        heartbeatKicks.push({ player_id: seat.player_id, table_id: seat.table_id, status: "disconnected" });
      } catch (hbErr: any) {
        console.error(`Error kicking stale player ${seat.player_id}:`, hbErr);
        heartbeatKicks.push({ player_id: seat.player_id, status: 500, error: hbErr.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} stuck hand(s), kicked ${kickResults.length} inactive player(s), swept ${closingResults.length} closing table(s), heartbeat-kicked ${heartbeatKicks.length} stale player(s)`,
        results,
        kickResults,
        closingResults,
        heartbeatKicks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("poker-check-timeouts error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
