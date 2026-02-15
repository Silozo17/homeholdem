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

    const { table_id, hand_id } = await req.json();
    if (!table_id || !hand_id) {
      return new Response(
        JSON.stringify({ error: "table_id, hand_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is seated at this table
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: seat } = await admin
      .from("poker_seats")
      .select("id")
      .eq("table_id", table_id)
      .eq("player_id", user.id)
      .single();

    if (!seat) {
      return new Response(
        JSON.stringify({ error: "Not seated at this table" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check current hand
    const { data: hand } = await admin
      .from("poker_hands")
      .select("id, action_deadline, current_actor_seat")
      .eq("id", hand_id)
      .eq("table_id", table_id)
      .is("completed_at", null)
      .single();

    if (!hand) {
      return new Response(
        JSON.stringify({ error: "No active hand" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if deadline has actually passed
    if (!hand.action_deadline || new Date(hand.action_deadline) > new Date()) {
      return new Response(
        JSON.stringify({ error: "Deadline not passed yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to poker-action as a forced fold
    const actionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/poker-action`;
    const response = await fetch(actionUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        table_id,
        hand_id,
        action: "fold",
        amount: 0,
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("poker-timeout-ping error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
