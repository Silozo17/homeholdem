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
    if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
      console.log("Warning: poker-check-timeouts called without service role key");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Auto-fold stuck hands ──
    const cutoff = new Date(Date.now() - 10_000).toISOString();

    const { data: stuckHands, error } = await admin
      .from("poker_hands")
      .select("id, table_id, current_actor_seat, action_deadline, state_version")
      .is("completed_at", null)
      .lt("action_deadline", cutoff)
      .not("action_deadline", "is", null)
      .not("current_actor_seat", "is", null);

    if (error) {
      console.error("Error querying stuck hands:", error);
      throw error;
    }

    const results: any[] = [];

    for (const stuckHand of (stuckHands || [])) {
      try {
        const { data: actorSeat } = await admin
          .from("poker_seats")
          .select("player_id")
          .eq("table_id", stuckHand.table_id)
          .eq("seat_number", stuckHand.current_actor_seat)
          .single();

        if (!actorSeat?.player_id) {
          console.error(`No actor found for hand ${stuckHand.id}`);
          continue;
        }

        const actionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/poker-action`;
        const response = await fetch(actionUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table_id: stuckHand.table_id,
            hand_id: stuckHand.id,
            action: "fold",
            amount: 0,
          }),
        });

        const result = await response.json();
        results.push({ hand_id: stuckHand.id, status: response.status, result });
        console.log(`Auto-folded hand ${stuckHand.id}: ${response.status}`);
      } catch (handErr) {
        console.error(`Error processing stuck hand ${stuckHand.id}:`, handErr);
        results.push({ hand_id: stuckHand.id, status: 500, error: handErr.message });
      }
    }

    // ── 2. Auto-kick players with 2+ consecutive timeouts ──
    const { data: timeoutSeats } = await admin
      .from("poker_seats")
      .select("id, table_id, player_id, seat_number, consecutive_timeouts")
      .gte("consecutive_timeouts", 2)
      .not("player_id", "is", null);

    const kickResults: any[] = [];
    for (const seat of (timeoutSeats || [])) {
      try {
        console.log(`Auto-kicking player ${seat.player_id} from table ${seat.table_id} (${seat.consecutive_timeouts} timeouts)`);
        
        const leaveUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/poker-leave-table`;
        const response = await fetch(leaveUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table_id: seat.table_id,
            player_id: seat.player_id,
          }),
        });

        const result = await response.json();
        kickResults.push({ player_id: seat.player_id, table_id: seat.table_id, status: response.status });

        // Broadcast seat_change so other clients update
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
  } catch (err) {
    console.error("poker-check-timeouts error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
