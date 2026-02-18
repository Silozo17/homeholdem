import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig || !webhookSecret) {
      return new Response(JSON.stringify({ error: "Missing signature or secret" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const tournamentId = session.metadata?.tournament_id;
      const userId = session.metadata?.user_id;

      if (!tournamentId || !userId) {
        console.log("Non-tournament checkout, ignoring");
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // Idempotent: find registration
      const { data: reg } = await admin.from("paid_tournament_registrations")
        .select("id, status")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();

      if (!reg) {
        // Registration created by checkout but not found - create it
        await admin.from("paid_tournament_registrations").insert({
          tournament_id: tournamentId,
          user_id: userId,
          paid_amount_pence: session.amount_total || 0,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          status: "paid",
        });
      } else if (reg.status !== "paid") {
        // Update to paid
        await admin.from("paid_tournament_registrations").update({
          status: "paid",
          stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
          paid_amount_pence: session.amount_total || 0,
        }).eq("id", reg.id);
      }
      // If already paid, skip (idempotent)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paid-tournament-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
