import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Card types ──
type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
interface Card {
  suit: Suit;
  rank: Rank;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// ── Seeded PRNG (Linear Congruential Generator) ──
function seededRandom(seedHex: string): () => number {
  // Use multiple segments of seed for better distribution
  let s =
    (parseInt(seedHex.substring(0, 8), 16) ^
      parseInt(seedHex.substring(8, 16), 16)) >>>
    0;
  return () => {
    s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0;
    return s / 0xffffffff;
  };
}

function seededShuffle(deck: Card[], seedHex: string): Card[] {
  const cards = [...deck];
  const rng = seededRandom(seedHex);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(hash));
}

// ── Seat position helpers ──
function nextActiveSeat(
  seats: any[],
  fromSeat: number,
  maxSeats: number
): number {
  for (let i = 1; i <= maxSeats; i++) {
    const s = (fromSeat + i) % maxSeats;
    const seat = seats.find(
      (se: any) => se.seat_number === s && se.status === "active" && se.player_id
    );
    if (seat) return s;
  }
  return fromSeat;
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

    // Get table
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

    // ── Blind escalation (doubling logic) ──
    let blindsIncreased = false;
    let oldSmall = table.small_blind;
    let oldBig = table.big_blind;
    if (table.blind_timer_minutes > 0) {
      if (!table.last_blind_increase_at) {
        // First hand -- start the blind timer NOW
        const now = new Date().toISOString();
        await admin.from("poker_tables")
          .update({ last_blind_increase_at: now })
          .eq("id", table_id);
        table.last_blind_increase_at = now;
      } else {
        const lastIncrease = new Date(table.last_blind_increase_at).getTime();
        const intervalMs = table.blind_timer_minutes * 60 * 1000;
        const elapsed = Date.now() - lastIncrease;
        let levelsToAdd = Math.floor(elapsed / intervalMs);
        if (levelsToAdd > 0) {
          const newLevel = (table.blind_level || 0) + levelsToAdd;
          const origSmall = table.original_small_blind || table.small_blind;
          const origBig = table.original_big_blind || table.big_blind;
          const newSmall = origSmall * Math.pow(2, newLevel);
          const newBig = origBig * Math.pow(2, newLevel);
          await admin
            .from("poker_tables")
            .update({
              small_blind: newSmall,
              big_blind: newBig,
              blind_level: newLevel,
              last_blind_increase_at: new Date().toISOString(),
            })
            .eq("id", table_id);
          table.small_blind = newSmall;
          table.big_blind = newBig;
          table.blind_level = newLevel;
          table.last_blind_increase_at = new Date().toISOString();
          blindsIncreased = true;
        }
      }
    }

    // Verify user is creator or seated
    const { data: userSeat } = await admin
      .from("poker_seats")
      .select("id")
      .eq("table_id", table_id)
      .eq("player_id", user.id)
      .single();

    if (table.created_by !== user.id && !userSeat) {
      return new Response(
        JSON.stringify({ error: "Not authorized to start hand" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check no active hand
    const { data: activeHand } = await admin
      .from("poker_hands")
      .select("id")
      .eq("table_id", table_id)
      .is("completed_at", null)
      .limit(1)
      .maybeSingle();

    if (activeHand) {
      return new Response(
        JSON.stringify({ error: "Hand already in progress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Activate sitting_out players for the new hand
    await admin
      .from("poker_seats")
      .update({ status: "active" })
      .eq("table_id", table_id)
      .eq("status", "sitting_out")
      .gt("stack", 0);

    // Get active seats
    const { data: seats } = await admin
      .from("poker_seats")
      .select("*")
      .eq("table_id", table_id)
      .eq("status", "active")
      .not("player_id", "is", null)
      .order("seat_number");

    if (!seats || seats.length < 2) {
      return new Response(
        JSON.stringify({ error: "Need at least 2 players" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out players with 0 chips
    const activePlayers = seats.filter((s: any) => s.stack > 0);
    if (activePlayers.length < 2) {
      return new Response(
        JSON.stringify({ error: "Need at least 2 players with chips" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get last hand number for this table
    const { data: lastHand } = await admin
      .from("poker_hands")
      .select("hand_number, dealer_seat")
      .eq("table_id", table_id)
      .order("hand_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const handNumber = (lastHand?.hand_number || 0) + 1;

    // Determine dealer position (rotate from last hand)
    let dealerSeat: number;
    if (lastHand) {
      dealerSeat = nextActiveSeat(
        activePlayers,
        lastHand.dealer_seat,
        table.max_seats
      );
    } else {
      dealerSeat = activePlayers[0].seat_number;
    }

    // Determine SB and BB
    let sbSeat: number;
    let bbSeat: number;

    if (activePlayers.length === 2) {
      // Heads-up: dealer is SB
      sbSeat = dealerSeat;
      bbSeat = nextActiveSeat(activePlayers, dealerSeat, table.max_seats);
    } else {
      sbSeat = nextActiveSeat(activePlayers, dealerSeat, table.max_seats);
      bbSeat = nextActiveSeat(activePlayers, sbSeat, table.max_seats);
    }

    // Generate deck seed
    const seedBytes = new Uint8Array(32);
    crypto.getRandomValues(seedBytes);
    const seedHex = toHex(seedBytes);
    const commitment = await sha256Hex(seedHex);

    // Shuffle deck
    const deck = seededShuffle(createDeck(), seedHex);

    // Deal 2 cards to each active player
    const holeCardInserts: any[] = [];
    let deckIndex = 0;
    for (const player of activePlayers) {
      const cards = [deck[deckIndex], deck[deckIndex + 1]];
      deckIndex += 2;
      holeCardInserts.push({
        player_id: player.player_id,
        seat_number: player.seat_number,
        cards,
      });
    }

    // Post blinds and antes
    const seatUpdates: any[] = [];
    const actionRecords: any[] = [];
    let potTotal = 0;
    let sequence = 0;

    // Antes
    if (table.ante > 0) {
      for (const player of activePlayers) {
        const anteAmount = Math.min(table.ante, player.stack);
        potTotal += anteAmount;
        seatUpdates.push({
          id: player.id,
          stack: player.stack - anteAmount,
          seat_number: player.seat_number,
          player_id: player.player_id,
          current_round_bet: anteAmount,
        });
        sequence++;
        actionRecords.push({
          player_id: player.player_id,
          seat_number: player.seat_number,
          action_type: "post_ante",
          amount: anteAmount,
          phase: "preflop",
          sequence,
        });
      }
    }

    // Small blind
    const sbPlayer = activePlayers.find((p: any) => p.seat_number === sbSeat)!;
    const sbAmount = Math.min(table.small_blind, sbPlayer.stack);
    const sbExisting = seatUpdates.find(
      (u: any) => u.player_id === sbPlayer.player_id
    );
    const sbStackAfterAnte = sbExisting
      ? sbExisting.stack
      : sbPlayer.stack;
    const sbActual = Math.min(sbAmount, sbStackAfterAnte);
    if (sbExisting) {
      sbExisting.stack -= sbActual;
      sbExisting.current_round_bet += sbActual;
    } else {
      seatUpdates.push({
        id: sbPlayer.id,
        stack: sbPlayer.stack - sbActual,
        seat_number: sbPlayer.seat_number,
        player_id: sbPlayer.player_id,
        current_round_bet: sbActual,
      });
    }
    potTotal += sbActual;
    sequence++;
    actionRecords.push({
      player_id: sbPlayer.player_id,
      seat_number: sbSeat,
      action_type: "post_blind",
      amount: sbActual,
      phase: "preflop",
      sequence,
    });

    // Big blind
    const bbPlayer = activePlayers.find((p: any) => p.seat_number === bbSeat)!;
    const bbExisting = seatUpdates.find(
      (u: any) => u.player_id === bbPlayer.player_id
    );
    const bbStackAfterAnte = bbExisting
      ? bbExisting.stack
      : bbPlayer.stack;
    const bbActual = Math.min(table.big_blind, bbStackAfterAnte);
    if (bbExisting) {
      bbExisting.stack -= bbActual;
      bbExisting.current_round_bet += bbActual;
    } else {
      seatUpdates.push({
        id: bbPlayer.id,
        stack: bbPlayer.stack - bbActual,
        seat_number: bbPlayer.seat_number,
        player_id: bbPlayer.player_id,
        current_round_bet: bbActual,
      });
    }
    potTotal += bbActual;
    sequence++;
    actionRecords.push({
      player_id: bbPlayer.player_id,
      seat_number: bbSeat,
      action_type: "post_blind",
      amount: bbActual,
      phase: "preflop",
      sequence,
    });

    // First actor: UTG (left of BB), or SB in heads-up
    let firstActor: number;
    if (activePlayers.length === 2) {
      firstActor = sbSeat; // In heads-up, dealer/SB acts first preflop
    } else {
      firstActor = nextActiveSeat(activePlayers, bbSeat, table.max_seats);
    }

    const actionDeadline = new Date(Date.now() + 30_000).toISOString();

    // Create hand row
    const { data: hand, error: handErr } = await admin
      .from("poker_hands")
      .insert({
        table_id,
        hand_number: handNumber,
        dealer_seat: dealerSeat,
        sb_seat: sbSeat,
        bb_seat: bbSeat,
        phase: "preflop",
        community_cards: [],
        pots: [
          {
            amount: potTotal,
            eligible_player_ids: activePlayers.map((p: any) => p.player_id),
          },
        ],
        current_actor_seat: firstActor,
        current_bet: bbActual,
        min_raise: table.big_blind,
        action_deadline: actionDeadline,
        deck_seed_commitment: commitment,
        deck_seed_internal: seedHex,
        state_version: 0,
      })
      .select()
      .single();

    if (handErr) throw handErr;

    // Insert hole cards
    for (const hc of holeCardInserts) {
      await admin.from("poker_hole_cards").insert({
        hand_id: hand.id,
        player_id: hc.player_id,
        seat_number: hc.seat_number,
        cards: hc.cards,
      });
    }

    // Update seat stacks
    for (const su of seatUpdates) {
      await admin
        .from("poker_seats")
        .update({ stack: su.stack })
        .eq("id", su.id);
    }

    // Insert action records
    for (const ar of actionRecords) {
      await admin.from("poker_actions").insert({
        hand_id: hand.id,
        ...ar,
      });
    }

    // Update table status
    await admin
      .from("poker_tables")
      .update({ status: "playing" })
      .eq("id", table_id);

    // Get profiles for broadcast
    const playerIds = activePlayers.map((p: any) => p.player_id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", playerIds);
    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    // Build public state (NO hole cards)
    const publicState = {
      hand_id: hand.id,
      phase: "preflop",
      community_cards: [],
      pots: hand.pots,
      current_actor_id:
        activePlayers.find((p: any) => p.seat_number === firstActor)
          ?.player_id || null,
      dealer_seat: dealerSeat,
      sb_seat: sbSeat,
      bb_seat: bbSeat,
      min_raise: table.big_blind,
      current_bet: bbActual,
      seats: activePlayers.map((p: any) => {
        const su = seatUpdates.find(
          (u: any) => u.player_id === p.player_id
        );
        const profile = profileMap.get(p.player_id);
        return {
          seat: p.seat_number,
          player_id: p.player_id,
          display_name: profile?.display_name || "Player",
          avatar_url: profile?.avatar_url || null,
          stack: su ? su.stack : p.stack,
          status: "active",
          current_bet: su ? su.current_round_bet : 0,
          last_action: null,
          has_cards: true,
        };
      }),
      action_deadline: actionDeadline,
      hand_number: handNumber,
      blinds: {
        small: table.small_blind,
        big: table.big_blind,
        ante: table.ante,
      },
      blind_timer: {
        blind_timer_minutes: table.blind_timer_minutes,
        blind_level: table.blind_level || 0,
        last_blind_increase_at: table.last_blind_increase_at || null,
      },
      state_version: 0,
    };

    // Broadcast public state
    const channel = admin.channel(`poker:table:${table_id}`);
    await channel.send({
      type: "broadcast",
      event: "game_state",
      payload: publicState,
    });

    // Broadcast blinds_up event if blinds increased
    if (blindsIncreased) {
      await channel.send({
        type: "broadcast",
        event: "blinds_up",
        payload: {
          old_small: oldSmall,
          old_big: oldBig,
          new_small: table.small_blind,
          new_big: table.big_blind,
          blind_level: table.blind_level,
        },
      });
    }

    return new Response(
      JSON.stringify({ hand_id: hand.id, state: publicState }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("poker-start-hand error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
