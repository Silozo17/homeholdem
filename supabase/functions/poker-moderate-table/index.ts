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

    const { table_id, action, target_player_id } = await req.json();
    if (!table_id || !action) {
      return new Response(
        JSON.stringify({ error: "table_id and action required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get table and verify ownership
    const { data: table, error: tableErr } = await admin
      .from("poker_tables")
      .select("*")
      .eq("id", table_id)
      .single();

    if (tableErr || !table) {
      return new Response(JSON.stringify({ error: "Table not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only table creator can moderate
    if (table.created_by !== user.id) {
      return new Response(
        JSON.stringify({ error: "Only the table creator can moderate" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const channel = admin.channel(`poker:table:${table_id}`);

    if (action === "kick" && target_player_id) {
      // Check no active hand
      const { data: activeHand } = await admin
        .from("poker_hands")
        .select("id")
        .eq("table_id", table_id)
        .is("completed_at", null)
        .single();

      if (activeHand) {
        return new Response(
          JSON.stringify({ error: "Cannot kick during an active hand" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cannot kick yourself
      if (target_player_id === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot kick yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: seat } = await admin
        .from("poker_seats")
        .select("*")
        .eq("table_id", table_id)
        .eq("player_id", target_player_id)
        .single();

      if (!seat) {
        return new Response(
          JSON.stringify({ error: "Player not found at table" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await admin.from("poker_seats").delete().eq("id", seat.id);

      await channel.send({
        type: "broadcast",
        event: "seat_change",
        payload: {
          seat: seat.seat_number,
          player_id: null,
          action: "kicked",
          kicked_player_id: target_player_id,
        },
      });

      return new Response(
        JSON.stringify({ message: "Player kicked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "close") {
      // Check no active hand
      const { data: activeHand } = await admin
        .from("poker_hands")
        .select("id")
        .eq("table_id", table_id)
        .is("completed_at", null)
        .single();

      if (activeHand) {
        return new Response(
          JSON.stringify({ error: "Cannot close during an active hand" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Broadcast close before deleting
      await channel.send({
        type: "broadcast",
        event: "seat_change",
        payload: { action: "table_closed" },
      });

      // Cascade delete all related data
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

      return new Response(
        JSON.stringify({ message: "Table deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use 'kick' or 'close'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("poker-moderate-table error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
