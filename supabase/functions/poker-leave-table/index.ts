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
      // If only 1 opponent remains, auto-complete the hand so the table isn't stuck
      if (remainingAfterLeave <= 1) {
        await admin
          .from("poker_hands")
          .update({ completed_at: new Date().toISOString(), phase: "complete" })
          .eq("id", activeHand.id);
      }

      // Delete seat immediately (don't just mark sitting_out — player is leaving)
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

    // If no players remain, auto-close the table
    if (remainingAfterLeave === 0) {
      await admin
        .from("poker_tables")
        .update({ status: "closed" })
        .eq("id", table_id);

      await channel.send({
        type: "broadcast",
        event: "seat_change",
        payload: { action: "table_closed" },
      });
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
