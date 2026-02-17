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

            const dbSeatUpdates = seatStates.map((s) => ({
              seat_id: s.seat_id,
              stack: s.stack,
              status: s.status === "all-in" || s.status === "folded" ? "active" : s.status,
              consecutive_timeouts: s.consecutive_timeouts,
            }));

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

            // Broadcast
            // Fetch hole card ownership for has_cards accuracy
            const { data: hcRows1 } = await admin.from("poker_hole_cards").select("player_id").eq("hand_id", hand.id);
            const hcSet1 = new Set((hcRows1 || []).map((r: any) => r.player_id));

            const { data: profiles } = await admin.from("profiles").select("id, display_name, avatar_url").in("id", seatStates.filter(s => s.player_id).map(s => s.player_id!));
            const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

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

        const actionDeadline = nextActorSeat !== null ? new Date(Date.now() + 20_000).toISOString() : null;

        const dbSeatUpdates = seatStates.map((s) => ({
          seat_id: s.seat_id,
          stack: s.stack,
          status: s.status === "all-in" || s.status === "folded" ? "active" : s.status,
          consecutive_timeouts: s.consecutive_timeouts,
        }));

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
        const [{ data: profiles }, { data: hcRows2 }] = await Promise.all([
          admin.from("profiles").select("id, display_name, avatar_url").in("id", playerIds),
          admin.from("poker_hole_cards").select("player_id").eq("hand_id", hand.id),
        ]);
        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
        const hcSet2 = new Set((hcRows2 || []).map((r: any) => r.player_id));

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
              has_cards: hcSet2.has(s.player_id!) && s.status !== "folded",
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
    // P0-D: Only kick players with 2+ consecutive timeouts AND no active hand on their table
    const { data: timeoutSeats } = await admin
      .from("poker_seats")
      .select("id, table_id, player_id, seat_number, consecutive_timeouts")
      .gte("consecutive_timeouts", 2)
      .not("player_id", "is", null);

    const kickResults: any[] = [];
    for (const seat of timeoutSeats || []) {
      try {
        // Check if there's an active hand on this table — if so, defer kick
        const { data: activeHandForTable } = await admin
          .from("poker_hands")
          .select("id")
          .eq("table_id", seat.table_id)
          .is("completed_at", null)
          .limit(1)
          .maybeSingle();

        if (activeHandForTable) {
          console.log(`[CHECK-TIMEOUTS] Skipping kick for ${seat.player_id} — hand active on table ${seat.table_id}`);
          kickResults.push({ player_id: seat.player_id, table_id: seat.table_id, status: "deferred_active_hand" });
          continue;
        }

        console.log(`[CHECK-TIMEOUTS] Auto-kicking player ${seat.player_id} from table ${seat.table_id} (${seat.consecutive_timeouts} timeouts)`);

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
          payload: { action: "leave", seat: seat.seat_number, player_id: seat.player_id },
        });
      } catch (kickErr: any) {
        console.error(`Error kicking player ${seat.player_id}:`, kickErr);
        kickResults.push({ player_id: seat.player_id, status: 500, error: kickErr.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} stuck hand(s), kicked ${kickResults.length} inactive player(s)`,
        results,
        kickResults,
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
