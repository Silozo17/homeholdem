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

    const { table_id, seat_number, buy_in_amount } = await req.json();

    if (!table_id || seat_number === undefined || !buy_in_amount) {
      return new Response(
        JSON.stringify({ error: "table_id, seat_number, buy_in_amount required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get table
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

    if (table.status === "closed") {
      return new Response(JSON.stringify({ error: "Table is closed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block joins on tables that are scheduled for closure
    if (table.closing_at) {
      return new Response(JSON.stringify({ error: "Table is closing and no longer accepting players" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate buy-in range
    if (buy_in_amount < table.min_buy_in || buy_in_amount > table.max_buy_in) {
      return new Response(
        JSON.stringify({
          error: `Buy-in must be between ${table.min_buy_in} and ${table.max_buy_in}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate seat number
    if (seat_number < 0 || seat_number >= table.max_seats) {
      return new Response(
        JSON.stringify({ error: `Seat must be 0-${table.max_seats - 1}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing seats
    const { data: seats } = await admin
      .from("poker_seats")
      .select("*")
      .eq("table_id", table_id);

    // Player already seated?
    if (seats?.some((s: any) => s.player_id === user.id)) {
      return new Response(
        JSON.stringify({ error: "Already seated at this table" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Seat taken?
    if (seats?.some((s: any) => s.seat_number === seat_number)) {
      return new Response(JSON.stringify({ error: "Seat is taken" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Table full?
    if ((seats?.length || 0) >= table.max_seats) {
      return new Response(JSON.stringify({ error: "Table is full" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Club access check
    if (table.table_type === "club" && table.club_id) {
      const { data: isMember } = await supabase.rpc("is_club_member", {
        _user_id: user.id,
        _club_id: table.club_id,
      });
      if (!isMember) {
        return new Response(
          JSON.stringify({ error: "Not a club member" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Friends table: need invite code
    if (table.table_type === "friends" && table.created_by !== user.id) {
      // For friends tables, we accept if they know the table_id (came via invite link)
      // Additional invite_code validation can be added here
    }

    // Check for cached stack from previous session at this table
    const { data: cacheData } = await admin
      .from("poker_tables")
      .select("stack_cache")
      .eq("id", table_id)
      .single();
    const stackCache = (cacheData?.stack_cache as Record<string, number>) || {};
    const savedStack = stackCache[user.id];
    const startingStack = savedStack && savedStack > 0 ? savedStack : buy_in_amount;

    // Clear used cache entry
    if (savedStack) {
      const updatedCache = { ...stackCache };
      delete updatedCache[user.id];
      await admin.from("poker_tables").update({ stack_cache: updatedCache }).eq("id", table_id);
    }

    // Always insert as sitting_out — poker-start-hand will activate after 3s cooldown
    const initialStatus = "sitting_out";

    // Insert seat
    const { data: seat, error: seatErr } = await admin
      .from("poker_seats")
      .insert({
        table_id,
        seat_number,
        player_id: user.id,
        stack: startingStack,
        status: initialStatus,
      })
      .select()
      .single();

    if (seatErr) {
      throw seatErr;
    }

    // Fetch profile for broadcast payload
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, avatar_url, country_code")
      .eq("id", user.id)
      .single();

    // Broadcast seat change with full player info
    const channel = admin.channel(`poker:table:${table_id}`);
    await channel.send({
      type: "broadcast",
      event: "seat_change",
      payload: {
        seat: seat_number,
        player_id: user.id,
        display_name: profile?.display_name || 'Player',
        avatar_url: profile?.avatar_url || null,
        country_code: profile?.country_code || null,
        action: "join",
        stack: startingStack,
      },
    });

    // Notify watchers (in-app + push)
    try {
      const seatedPlayerIds = new Set((seats || []).map((s: any) => s.player_id));
      seatedPlayerIds.add(user.id); // include the joining player

      const { data: watchers } = await admin
        .from("poker_table_watchers")
        .select("user_id")
        .eq("table_id", table_id);

      if (watchers && watchers.length > 0) {
        const eligibleIds = watchers
          .map((w: any) => w.user_id)
          .filter((id: string) => !seatedPlayerIds.has(id));

        if (eligibleIds.length > 0) {
          const displayName = profile?.display_name || "A player";
          const tableName = table.name || "a table";

          // In-app notifications
          const notifRows = eligibleIds.map((uid: string) => ({
            user_id: uid,
            title: "Player Joined",
            body: `${displayName} joined ${tableName}`,
            type: "table_join",
            url: `/online-poker?table=${table_id}`,
            sender_id: user.id,
          }));
          await admin.from("notifications").insert(notifRows);

          // Push notifications (fire-and-forget)
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              user_ids: eligibleIds,
              title: "Player Joined",
              body: `${displayName} joined ${tableName}`,
              url: `/online-poker?table=${table_id}`,
              tag: `table-join-${table_id}`,
            }),
          }).catch(() => {});
        }
      }
    } catch (notifyErr) {
      console.error("Watcher notification error (non-fatal):", notifyErr);
    }

    return new Response(JSON.stringify({
      seat,
      display_name: profile?.display_name || 'Player',
      avatar_url: profile?.avatar_url || null,
      country_code: profile?.country_code || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("poker-join-table error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
