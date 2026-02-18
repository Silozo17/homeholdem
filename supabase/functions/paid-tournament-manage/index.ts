import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { data: adminRow } = await admin.from("app_admins").select("id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, tournament_id, payout_id, notes } = await req.json();
    if (!action || !tournament_id) {
      return new Response(JSON.stringify({ error: "action and tournament_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: tournament } = await admin.from("paid_tournaments").select("*").eq("id", tournament_id).single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "publish") {
      if (tournament.status !== "draft") return new Response(JSON.stringify({ error: "Can only publish draft tournaments" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("paid_tournaments").update({ status: "scheduled" }).eq("id", tournament_id);
      return new Response(JSON.stringify({ success: true, status: "scheduled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel") {
      if (tournament.status === "complete" || tournament.status === "cancelled") {
        return new Response(JSON.stringify({ error: "Cannot cancel" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await admin.from("paid_tournaments").update({ status: "cancelled" }).eq("id", tournament_id);
      return new Response(JSON.stringify({ success: true, status: "cancelled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "mark_payout_paid") {
      if (!payout_id) return new Response(JSON.stringify({ error: "payout_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await admin.from("paid_tournament_payouts").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        notes: notes || null,
      }).eq("id", payout_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("paid-tournament-manage error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
