import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { tournament_id } = await req.json();
    if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get tournament
    const { data: tournament } = await admin.from("paid_tournaments").select("*").eq("id", tournament_id).single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (tournament.status !== "scheduled") return new Response(JSON.stringify({ error: "Registration not open" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Registration closes 1 minute before start
    const startAt = new Date(tournament.start_at).getTime();
    const nowMs = Date.now();
    if (startAt - nowMs < 60 * 1000) return new Response(JSON.stringify({ error: "Registration closed (less than 1 minute before start)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check if user is app admin (bypasses Level 5 gate)
    const { data: adminRow } = await admin.from("app_admins").select("id").eq("user_id", user.id).maybeSingle();
    const isAppAdmin = !!adminRow;

    // Level 5 gate (skip for admins)
    if (!isAppAdmin) {
      const { data: xpRow } = await admin.from("player_xp").select("level").eq("user_id", user.id).maybeSingle();
      const playerLevel = xpRow?.level || 1;
      if (playerLevel < 5) return new Response(JSON.stringify({ error: "Level 5 required to register", current_level: playerLevel }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check not already registered
    const { data: existingReg } = await admin.from("paid_tournament_registrations")
      .select("id, status").eq("tournament_id", tournament_id).eq("user_id", user.id).maybeSingle();
    if (existingReg && !["cancelled", "pending"].includes(existingReg.status)) {
      return new Response(JSON.stringify({ error: "Already registered" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Race-safe capacity check
    const { data: remaining } = await admin.rpc("check_tournament_capacity", { _tournament_id: tournament_id });
    if (remaining === null || remaining <= 0) {
      return new Response(JSON.stringify({ error: "Tournament full" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create Stripe Checkout Session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

    const entryDisplay = `£${(tournament.entry_fee_pence / 100).toFixed(2)}`;
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: `Home Hold'em: ${tournament.name}`,
            description: `Tournament entry (${entryDisplay}) · Max ${tournament.max_players} players`,
          },
          unit_amount: tournament.entry_fee_pence,
        },
        quantity: 1,
      }],
      mode: "payment",
      payment_method_types: ['card'],
      locale: 'auto',
      metadata: { tournament_id, user_id: user.id },
      custom_text: {
        submit: { message: `You're entering "${tournament.name}". Good luck! 🃏` },
      },
      success_url: `${req.headers.get("origin")}/tournaments?registered=${tournament_id}`,
      cancel_url: `${req.headers.get("origin")}/tournaments`,
    });

    // Insert pending registration
    if (existingReg) {
      // Re-register after cancel
      await admin.from("paid_tournament_registrations").update({
        status: "pending",
        stripe_checkout_session_id: session.id,
        paid_amount_pence: tournament.entry_fee_pence,
      }).eq("id", existingReg.id);
    } else {
      await admin.from("paid_tournament_registrations").insert({
        tournament_id,
        user_id: user.id,
        paid_amount_pence: tournament.entry_fee_pence,
        stripe_checkout_session_id: session.id,
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paid-tournament-register error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
