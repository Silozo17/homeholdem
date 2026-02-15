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
      // Idempotent: if not seated, just return success
      return new Response(
        JSON.stringify({ message: "Not seated", stack: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if mid-hand — if so, mark as folded for current hand
    const { data: activeHand } = await admin
      .from("poker_hands")
      .select("id")
      .eq("table_id", table_id)
      .is("completed_at", null)
      .single();

    if (activeHand) {
      // Player leaving mid-hand — they'll be auto-folded by the game engine
      // For now, just mark seat as sitting_out
      await admin
        .from("poker_seats")
        .update({ status: "sitting_out" })
        .eq("id", seat.id);

      return new Response(
        JSON.stringify({
          message: "Marked as sitting out. Will be removed after hand completes.",
          stack: seat.stack,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No active hand — remove seat immediately
    const { error: deleteErr } = await admin
      .from("poker_seats")
      .delete()
      .eq("id", seat.id);

    if (deleteErr) throw deleteErr;

    // Broadcast seat change
    const channel = admin.channel(`poker:table:${table_id}`);
    await channel.send({
      type: "broadcast",
      event: "seat_change",
      payload: {
        seat: seat.seat_number,
        player_id: null,
        display_name: null,
        action: "leave",
      },
    });

    return new Response(
      JSON.stringify({ message: "Left table", stack: seat.stack }),
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
