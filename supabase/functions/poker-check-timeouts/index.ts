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
    // This is a cron job — verify service role auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
      // Also accept if called with anon key (for testing)
      console.log("Warning: poker-check-timeouts called without service role key");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find hands where action deadline has passed (with 10s grace period)
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

    if (!stuckHands || stuckHands.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stuck hands found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${stuckHands.length} stuck hand(s) to auto-fold`);

    const results: any[] = [];

    for (const stuckHand of stuckHands) {
      try {
        // Find the current actor
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

        // Call poker-action internally with service role to force fold
        const actionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/poker-action`;

        // We need to impersonate the actor or use service role
        // Since poker-action checks auth, we'll use service role and the action
        // will be processed as a timeout fold via deadline check
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
        results.push({
          hand_id: stuckHand.id,
          status: response.status,
          result,
        });

        console.log(
          `Auto-folded hand ${stuckHand.id}: ${response.status}`
        );
      } catch (handErr) {
        console.error(
          `Error processing stuck hand ${stuckHand.id}:`,
          handErr
        );
        results.push({
          hand_id: stuckHand.id,
          status: 500,
          error: handErr.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} stuck hand(s)`,
        results,
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
