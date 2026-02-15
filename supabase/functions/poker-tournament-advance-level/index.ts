import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { tournament_id } = await req.json();
    if (!tournament_id) return new Response(JSON.stringify({ error: "tournament_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tournament } = await admin.from("poker_tournaments").select("*").eq("id", tournament_id).single();
    if (!tournament) return new Response(JSON.stringify({ error: "Tournament not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (tournament.created_by !== user.id) return new Response(JSON.stringify({ error: "Only creator can advance levels" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (tournament.status !== "running") return new Response(JSON.stringify({ error: "Tournament not running" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const schedule = tournament.blind_schedule as any[];
    const currentIndex = schedule.findIndex((l: any) => l.level === tournament.current_level);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= schedule.length) {
      return new Response(JSON.stringify({ error: "Already at max level" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const nextLevel = schedule[nextIndex];
    const now = new Date().toISOString();

    // Update tournament level
    await admin.from("poker_tournaments").update({
      current_level: nextLevel.level || tournament.current_level + 1,
      level_started_at: now,
    }).eq("id", tournament_id);

    // If it's a blind level (not break), update all tournament tables
    if (!nextLevel.break) {
      const { data: tables } = await admin.from("poker_tables").select("id").eq("tournament_id", tournament_id).neq("status", "closed");
      for (const t of (tables || [])) {
        await admin.from("poker_tables").update({
          small_blind: nextLevel.small,
          big_blind: nextLevel.big,
          ante: nextLevel.ante || 0,
        }).eq("id", t.id);
      }
    }

    // Broadcast level change
    const channel = admin.channel(`tournament:${tournament_id}`);
    await channel.send({
      type: "broadcast",
      event: "level_change",
      payload: {
        level: nextLevel,
        level_started_at: now,
        is_break: !!nextLevel.break,
      },
    });

    return new Response(JSON.stringify({
      new_level: nextLevel,
      level_started_at: now,
      is_break: !!nextLevel.break,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("poker-tournament-advance-level error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
