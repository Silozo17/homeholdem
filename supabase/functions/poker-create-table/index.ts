import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

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

    const body = await req.json();
    const {
      name,
      table_type = "friends",
      max_seats = 9,
      small_blind = 50,
      big_blind = 100,
      ante = 0,
      min_buy_in = 1000,
      max_buy_in = 10000,
      club_id = null,
      blind_timer_minutes = 0,
    } = body;

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If club table, verify membership
    if (club_id && table_type === "club") {
      const { data: isMember } = await supabase.rpc("is_club_member", {
        _user_id: user.id,
        _club_id: club_id,
      });
      if (!isMember) {
        return new Response(
          JSON.stringify({ error: "Not a club member" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const invite_code = generateInviteCode();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: table, error: insertError } = await admin
      .from("poker_tables")
      .insert({
        created_by: user.id,
        name: name.trim(),
        table_type,
        max_seats,
        small_blind,
        big_blind,
        ante,
        min_buy_in,
        max_buy_in,
        club_id: table_type === "club" ? club_id : null,
        invite_code,
        blind_timer_minutes: [0, 5, 10, 15, 30].includes(blind_timer_minutes) ? blind_timer_minutes : 0,
        original_small_blind: small_blind,
        original_big_blind: big_blind,
        blind_level: 0,
        last_blind_increase_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Auto-seat the creator at seat 0
    const { error: seatError } = await admin.from("poker_seats").insert({
      table_id: table.id,
      seat_number: 0,
      player_id: user.id,
      stack: max_buy_in,
      status: "active",
    });

    if (seatError) {
      console.error("Failed to auto-seat creator:", seatError);
    }

    return new Response(JSON.stringify({ table }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("poker-create-table error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
