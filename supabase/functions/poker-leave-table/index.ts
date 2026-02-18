import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { table_id } = await req.json();
    if (!table_id) {
      return new Response(JSON.stringify({ error: "table_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find player's seat
    const { data: seat } = await admin
      .from("poker_seats")
      .select("*")
      .eq("table_id", table_id)
      .eq("player_id", user.id)
      .single();

    if (!seat) {
      return new Response(
        JSON.stringify({ message: "Not seated", stack: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if mid-hand
    const { data: activeHand } = await admin
      .from("poker_hands")
      .select("id")
      .eq("table_id", table_id)
      .is("completed_at", null)
      .single();

    // Count other seated players (excluding the leaving player)
    const { data: allSeats } = await admin
      .from("poker_seats")
      .select("id, player_id")
      .eq("table_id", table_id)
      .not("player_id", "is", null);

    const otherSeats = (allSeats || []).filter(s => s.player_id !== user.id);
    const remainingAfterLeave = otherSeats.length;

    if (activeHand) {
      // FIX SV-1: When leaving mid-hand, properly resolve the hand
      // If only 1 opponent remains, award pot and broadcast result
      if (remainingAfterLeave <= 1) {
        // Get hand details for pot award
        const { data: handData } = await admin
          .from("poker_hands")
          .select("*, table_id")
          .eq("id", activeHand.id)
          .single();

        if (handData && otherSeats.length === 1) {
          const winnerId = otherSeats[0].player_id;
          const pots = (handData.pots as any[]) || [];
          const totalPot = pots.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

          // Get winner's current seat for stack update
          const { data: winnerSeat } = await admin
            .from("poker_seats")
            .select("id, stack")
            .eq("table_id", table_id)
            .eq("player_id", winnerId)
            .single();

          if (winnerSeat) {
            const newStack = winnerSeat.stack + totalPot;

            // Commit via RPC for version safety
            const { data: commitResult } = await admin.rpc("commit_poker_state", {
              _hand_id: activeHand.id,
              _expected_version: handData.state_version,
              _new_phase: "complete",
              _community_cards: handData.community_cards,
              _pots: [{ amount: totalPot, winners: [winnerId] }],
              _current_actor_seat: null,
              _current_bet: 0,
              _min_raise: 0,
              _action_deadline: null,
              _completed_at: new Date().toISOString(),
              _results: {
                winners: [{ player_id: winnerId, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
                pots: [{ amount: totalPot, winners: [winnerId] }],
              },
              _deck_seed_revealed: null,
              _seat_updates: [{ seat_id: winnerSeat.id, stack: newStack, status: "active", consecutive_timeouts: 0 }],
              _action_record: null,
            });

            if (!commitResult?.error) {
              // Get winner profile for broadcast
              const { data: winnerProfile } = await admin.from("profiles").select("display_name, avatar_url").eq("id", winnerId).single();

              const leaveChannel = admin.channel(`poker:table:${table_id}`);
              await leaveChannel.send({
                type: "broadcast",
                event: "game_state",
                payload: {
                  hand_id: activeHand.id,
                  phase: "complete",
                  community_cards: handData.community_cards,
                  pots: [{ amount: totalPot, winners: [winnerId] }],
                  current_actor_seat: null,
                  current_actor_id: null,
                  seats: [{
                    seat: otherSeats[0].id ? undefined : 0,
                    player_id: winnerId,
                    display_name: winnerProfile?.display_name || "Player",
                    avatar_url: winnerProfile?.avatar_url || null,
                    stack: newStack,
                    status: "active",
                    current_bet: 0,
                    last_action: null,
                    has_cards: true,
                  }],
                  state_version: commitResult.state_version,
                },
              });

              await leaveChannel.send({
                type: "broadcast",
                event: "hand_result",
                payload: {
                  hand_id: activeHand.id,
                  winners: [{ player_id: winnerId, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
                  revealed_cards: [],
                  pots: [{ amount: totalPot, winners: [winnerId] }],
                  community_cards: handData.community_cards,
                  state_version: commitResult.state_version,
                },
              });

              await admin.from("poker_tables").update({ status: "waiting" }).eq("id", table_id);
            }
          }
        } else {
          // Fallback: force-complete without pot award if something unexpected
          await admin
            .from("poker_hands")
            .update({ completed_at: new Date().toISOString(), phase: "complete" })
            .eq("id", activeHand.id);
        }
      } else {
        // ── 2+ players remain: fold the leaving player and advance turn ──
        const { data: handData } = await admin
          .from("poker_hands")
          .select("*")
          .eq("id", activeHand.id)
          .single();

        if (handData) {
          // Next action sequence number
          const { data: actions } = await admin
            .from("poker_actions")
            .select("sequence")
            .eq("hand_id", activeHand.id)
            .order("sequence", { ascending: false })
            .limit(1);
          const nextSeq = ((actions?.[0]?.sequence) ?? 0) + 1;

          // Insert fold action for the leaving player
          await admin.from("poker_actions").insert({
            hand_id: activeHand.id,
            player_id: user.id,
            seat_number: seat.seat_number,
            action_type: "fold",
            amount: 0,
            phase: handData.phase,
            sequence: nextSeq,
          });

          // Read all seats + table config for turn logic
          const [{ data: allSeatsFull }, { data: tableData }] = await Promise.all([
            admin.from("poker_seats").select("*").eq("table_id", table_id),
            admin.from("poker_tables").select("max_seats").eq("id", table_id).single(),
          ]);

          const maxSeats = tableData?.max_seats ?? 9;

          // Determine how many non-folded players remain (excluding leaving player)
          // A player is "folded" if they have a fold action in this hand
          const { data: foldActions } = await admin
            .from("poker_actions")
            .select("player_id")
            .eq("hand_id", activeHand.id)
            .eq("action_type", "fold");
          const foldedPlayerIds = new Set((foldActions || []).map((a: any) => a.player_id));

          const activeSeatsFull = (allSeatsFull || []).filter((s: any) =>
            s.player_id &&
            s.player_id !== user.id &&
            s.status === "active" &&
            !foldedPlayerIds.has(s.player_id)
          );

          if (activeSeatsFull.length <= 1 && activeSeatsFull.length > 0) {
            // Only 1 non-folded player left → award pot (last standing)
            const winnerId = activeSeatsFull[0].player_id;
            const pots = (handData.pots as any[]) || [];
            const totalPot = pots.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            const newStack = activeSeatsFull[0].stack + totalPot;

            const { data: commitResult } = await admin.rpc("commit_poker_state", {
              _hand_id: activeHand.id,
              _expected_version: handData.state_version,
              _new_phase: "complete",
              _community_cards: handData.community_cards,
              _pots: [{ amount: totalPot, winners: [winnerId] }],
              _current_actor_seat: null,
              _current_bet: 0,
              _min_raise: 0,
              _action_deadline: null,
              _completed_at: new Date().toISOString(),
              _results: {
                winners: [{ player_id: winnerId, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
                pots: [{ amount: totalPot, winners: [winnerId] }],
              },
              _deck_seed_revealed: null,
              _seat_updates: [{ seat_id: activeSeatsFull[0].id, stack: newStack, status: "active", consecutive_timeouts: 0 }],
              _action_record: null,
            });

            if (!commitResult?.error) {
              const { data: winnerProfile } = await admin.from("profiles").select("display_name, avatar_url").eq("id", winnerId).single();
              const ch = admin.channel(`poker:table:${table_id}`);
              await ch.send({
                type: "broadcast",
                event: "game_state",
                payload: {
                  hand_id: activeHand.id,
                  phase: "complete",
                  community_cards: handData.community_cards,
                  pots: [{ amount: totalPot, winners: [winnerId] }],
                  current_actor_seat: null,
                  current_actor_id: null,
                  state_version: commitResult.state_version,
                },
              });
              await ch.send({
                type: "broadcast",
                event: "hand_result",
                payload: {
                  hand_id: activeHand.id,
                  winners: [{ player_id: winnerId, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
                  revealed_cards: [],
                  pots: [{ amount: totalPot, winners: [winnerId] }],
                  community_cards: handData.community_cards,
                  state_version: commitResult.state_version,
                },
              });
              await admin.from("poker_tables").update({ status: "waiting" }).eq("id", table_id);
            }
          } else if (handData.current_actor_seat === seat.seat_number) {
            // Leaving player was the current actor → advance turn clockwise
            const eligible = (allSeatsFull || []).filter((s: any) =>
              s.player_id &&
              s.player_id !== user.id &&
              s.status === "active" &&
              !foldedPlayerIds.has(s.player_id)
            );

            let nextActorSeat: number | null = null;
            for (let i = 1; i <= maxSeats; i++) {
              const checkSeat = (seat.seat_number + i) % maxSeats;
              const found = eligible.find((s: any) => s.seat_number === checkSeat);
              if (found) { nextActorSeat = found.seat_number; break; }
            }
            if (nextActorSeat === null && eligible.length > 0) {
              nextActorSeat = eligible[0].seat_number;
            }

            if (nextActorSeat !== null) {
              const deadline = new Date(Date.now() + 20_000).toISOString();
              const { data: commitResult } = await admin.rpc("commit_poker_state", {
                _hand_id: activeHand.id,
                _expected_version: handData.state_version,
                _new_phase: handData.phase,
                _community_cards: handData.community_cards,
                _pots: handData.pots,
                _current_actor_seat: nextActorSeat,
                _current_bet: handData.current_bet,
                _min_raise: handData.min_raise,
                _action_deadline: deadline,
                _completed_at: null,
                _results: null,
                _deck_seed_revealed: null,
                _seat_updates: null,
                _action_record: null,
              });

              if (!commitResult?.error) {
                // Find next actor's player_id for broadcast
                const nextSeatData = eligible.find((s: any) => s.seat_number === nextActorSeat);
                const ch = admin.channel(`poker:table:${table_id}`);
                await ch.send({
                  type: "broadcast",
                  event: "game_state",
                  payload: {
                    hand_id: activeHand.id,
                    phase: handData.phase,
                    community_cards: handData.community_cards,
                    pots: handData.pots,
                    current_actor_seat: nextActorSeat,
                    current_actor_id: nextSeatData?.player_id ?? null,
                    current_bet: handData.current_bet,
                    min_raise: handData.min_raise,
                    action_deadline: deadline,
                    state_version: commitResult.state_version,
                  },
                });
              }
            }
          }
          // If leaving player was NOT the current actor, no state commit needed
        }
      }

      // Delete seat immediately (player is leaving)
      await admin.from("poker_seats").delete().eq("id", seat.id);
    } else {
      // No active hand — remove seat immediately
      const { error: deleteErr } = await admin
        .from("poker_seats")
        .delete()
        .eq("id", seat.id);
      if (deleteErr) throw deleteErr;
    }

    const channel = admin.channel(`poker:table:${table_id}`);

    // Broadcast seat leave
    await channel.send({
      type: "broadcast",
      event: "seat_change",
      payload: {
        seat: seat.seat_number,
        player_id: null,
        display_name: null,
        action: "leave",
        remaining_players: remainingAfterLeave,
      },
    });

    // If no players remain, handle table cleanup
    if (remainingAfterLeave === 0) {
      // Check if this is a persistent/community table
      const { data: tableInfo } = await admin
        .from("poker_tables")
        .select("is_persistent")
        .eq("id", table_id)
        .single();

      if (tableInfo?.is_persistent) {
        // Community table: reset to waiting, do NOT delete
        await admin.from("poker_tables").update({ status: "waiting" }).eq("id", table_id);
      } else {
        // Non-persistent: broadcast close and cascade-delete
        await channel.send({
          type: "broadcast",
          event: "seat_change",
          payload: { action: "table_closed" },
        });

        const { data: hands } = await admin
          .from("poker_hands")
          .select("id")
          .eq("table_id", table_id);
        const handIds = (hands || []).map((h: any) => h.id);
        if (handIds.length > 0) {
          await admin.from("poker_hole_cards").delete().in("hand_id", handIds);
          await admin.from("poker_actions").delete().in("hand_id", handIds);
          await admin.from("poker_hands").delete().eq("table_id", table_id);
        }
        await admin.from("poker_seats").delete().eq("table_id", table_id);
        await admin.from("poker_tables").delete().eq("id", table_id);
      }
    }

    return new Response(
      JSON.stringify({ message: "Left table", stack: seat.stack, remaining_players: remainingAfterLeave }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("poker-leave-table error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
