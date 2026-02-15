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

    const url = new URL(req.url);
    const table_id = url.searchParams.get("table_id");

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

    // Get table info
    const { data: table } = await admin
      .from("poker_tables")
      .select("*")
      .eq("id", table_id)
      .single();

    if (!table) {
      return new Response(JSON.stringify({ error: "Table not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get seats
    const { data: seats } = await admin
      .from("poker_seats")
      .select("*")
      .eq("table_id", table_id)
      .order("seat_number");

    // Get profiles for seated players
    const playerIds = (seats || [])
      .map((s: any) => s.player_id)
      .filter(Boolean);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", playerIds.length > 0 ? playerIds : ["none"]);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    // Get current hand (if any) from the public view
    const { data: currentHand } = await admin
      .from("poker_hands")
      .select(
        "id, hand_number, dealer_seat, sb_seat, bb_seat, phase, community_cards, pots, current_actor_seat, current_bet, min_raise, action_deadline, deck_seed_commitment, started_at, completed_at, results, state_version"
      )
      .eq("table_id", table_id)
      .is("completed_at", null)
      .order("hand_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get player's own hole cards if there's an active hand
    let myCards = null;
    if (currentHand) {
      // Use user's supabase client (RLS enforced)
      const { data: holeCards } = await supabase
        .from("poker_hole_cards")
        .select("cards")
        .eq("hand_id", currentHand.id)
        .eq("player_id", user.id)
        .single();
      myCards = holeCards?.cards || null;
    }

    // Build seat info with profiles
    const seatInfo = (seats || []).map((s: any) => {
      const profile = profileMap.get(s.player_id);
      return {
        seat: s.seat_number,
        player_id: s.player_id,
        display_name: profile?.display_name || "Player",
        avatar_url: profile?.avatar_url || null,
        stack: s.stack,
        status: s.status,
        has_cards:
          currentHand && s.status === "active" && s.player_id ? true : false,
      };
    });

    const response: any = {
      table: {
        id: table.id,
        name: table.name,
        table_type: table.table_type,
        max_seats: table.max_seats,
        small_blind: table.small_blind,
        big_blind: table.big_blind,
        ante: table.ante,
        min_buy_in: table.min_buy_in,
        max_buy_in: table.max_buy_in,
        status: table.status,
        invite_code: table.invite_code,
        club_id: table.club_id,
        created_by: table.created_by,
      },
      seats: seatInfo,
      current_hand: currentHand
        ? {
            hand_id: currentHand.id,
            hand_number: currentHand.hand_number,
            phase: currentHand.phase,
            community_cards: currentHand.community_cards,
            pots: currentHand.pots,
            current_actor_seat: currentHand.current_actor_seat,
            current_bet: currentHand.current_bet,
            min_raise: currentHand.min_raise,
            action_deadline: currentHand.action_deadline,
            dealer_seat: currentHand.dealer_seat,
            sb_seat: currentHand.sb_seat,
            bb_seat: currentHand.bb_seat,
            state_version: currentHand.state_version,
            blinds: {
              small: table.small_blind,
              big: table.big_blind,
              ante: table.ante,
            },
          }
        : null,
      my_cards: myCards,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("poker-table-state error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
