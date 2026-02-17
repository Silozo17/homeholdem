import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Card types ──
type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
interface Card { suit: Suit; rank: Rank; }
interface HandResult { rank: number; name: string; score: number; bestCards: Card[]; }

const HAND_RANK_NAMES: Record<number, string> = {
  0: "High Card", 1: "One Pair", 2: "Two Pair", 3: "Three of a Kind",
  4: "Straight", 5: "Flush", 6: "Full House", 7: "Four of a Kind",
  8: "Straight Flush", 9: "Royal Flush",
};

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

// ── Deck ──
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}

function seededRandom(seedHex: string): () => number {
  let s = (parseInt(seedHex.substring(0, 8), 16) ^ parseInt(seedHex.substring(8, 16), 16)) >>> 0;
  return () => { s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0; return s / 0xffffffff; };
}

function seededShuffle(deck: Card[], seedHex: string): Card[] {
  const cards = [...deck]; const rng = seededRandom(seedHex);
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}

// ── Hand evaluator (ported from client) ──
function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) throw new Error("Need at least 5 cards");
  const combos = getCombinations(cards, 5);
  let best: HandResult | null = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.score > best.score) best = result;
  }
  return best!;
}

function evaluate5(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  const suits = sorted.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(ranks);
  const isAceLow = checkAceLowStraight(ranks);
  const straightHigh = isAceLow ? 5 : (isStraight ? ranks[0] : 0);
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) || 0) + 1);
  const groups = Array.from(counts.entries()).sort((a, b) => b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0]);
  const pattern = groups.map(g => g[1]).join("");

  if ((isStraight || isAceLow) && isFlush) {
    if (ranks[0] === 14 && ranks[1] === 13 && isStraight) return makeResult(9, [14], sorted);
    return makeResult(8, [straightHigh], sorted);
  }
  if (pattern === "41") return makeResult(7, [groups[0][0], groups[1][0]], sorted);
  if (pattern === "32") return makeResult(6, [groups[0][0], groups[1][0]], sorted);
  if (isFlush) return makeResult(5, ranks, sorted);
  if (isStraight || isAceLow) return makeResult(4, [straightHigh], sorted);
  if (pattern === "311") { const k = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a, b) => b - a); return makeResult(3, [groups[0][0], ...k], sorted); }
  if (pattern === "221") { const p = groups.filter(g => g[1] === 2).map(g => g[0]).sort((a, b) => b - a); return makeResult(2, [...p, groups.find(g => g[1] === 1)![0]], sorted); }
  if (pattern === "2111") { const k = groups.filter(g => g[1] === 1).map(g => g[0]).sort((a, b) => b - a); return makeResult(1, [groups[0][0], ...k], sorted); }
  return makeResult(0, ranks, sorted);
}

function checkStraight(r: number[]): boolean { for (let i = 0; i < r.length - 1; i++) if (r[i] - r[i + 1] !== 1) return false; return true; }
function checkAceLowStraight(r: number[]): boolean { return r[0] === 14 && r[1] === 5 && r[2] === 4 && r[3] === 3 && r[4] === 2; }
function makeResult(rank: number, tb: number[], bestCards: Card[]): HandResult {
  let score = rank * 1e10;
  for (let i = 0; i < tb.length; i++) score += tb[i] * Math.pow(15, 4 - i);
  return { rank, name: HAND_RANK_NAMES[rank], score, bestCards };
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  function bt(start: number, cur: T[]) {
    if (cur.length === k) { result.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); bt(i + 1, cur); cur.pop(); }
  }
  bt(0, []); return result;
}

// ── Helpers ──



interface SeatState {
  seat_id: string;
  seat_number: number;
  player_id: string;
  stack: number;
  status: string;
  current_round_bet: number;
  total_bet_this_hand: number;
  has_acted_this_round: boolean;
  consecutive_timeouts: number;
}

// ── Side pot calculation ──
interface Pot { amount: number; eligible_player_ids: string[]; }

function calculatePots(seatStates: SeatState[]): Pot[] {
  // Get all players who contributed (not folded at time of contribution tracking)
  const contributors = seatStates.filter(s => s.total_bet_this_hand > 0);
  if (contributors.length === 0) return [];

  // Get unique contribution levels from all-in players + the max
  const allInLevels = contributors
    .filter(s => s.status === "all-in")
    .map(s => s.total_bet_this_hand)
    .sort((a, b) => a - b);

  // Add a level for the max contribution
  const maxContribution = Math.max(...contributors.map(s => s.total_bet_this_hand));
  const levels = [...new Set([...allInLevels, maxContribution])].sort((a, b) => a - b);

  const pots: Pot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const increment = level - previousLevel;
    if (increment <= 0) continue;

    // Players eligible for this pot level: not folded AND contributed at least this level
    const eligible = seatStates.filter(s =>
      s.status !== "folded" && s.total_bet_this_hand >= level
    );

    // Amount in this pot: each contributor who bet at least previousLevel contributes increment (capped)
    let potAmount = 0;
    for (const c of contributors) {
      const contribution = Math.min(increment, Math.max(0, c.total_bet_this_hand - previousLevel));
      potAmount += contribution;
    }

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({ amount: potAmount, eligible_player_ids: eligible.map(e => e.player_id) });
    }

    previousLevel = level;
  }

  return pots;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { table_id, hand_id, action, amount = 0 } = body;

    if (!table_id || !hand_id || !action) {
      return new Response(JSON.stringify({ error: "table_id, hand_id, action required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. Read state (no hole cards)
    const { data: stateData, error: stateErr } = await admin.rpc("read_poker_hand_state", { _table_id: table_id, _hand_id: hand_id });
    if (stateErr) throw stateErr;
    if (stateData?.error) return new Response(JSON.stringify({ error: stateData.error }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const hand = stateData.hand;
    const seats: any[] = stateData.seats;

    // Get table info
    const { data: table } = await admin.from("poker_tables").select("*").eq("id", table_id).single();
    if (!table) return new Response(JSON.stringify({ error: "Table not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 2. Validate it's this player's turn
    const playerSeat = seats.find((s: any) => s.player_id === user.id);
    if (!playerSeat) return new Response(JSON.stringify({ error: "Not seated" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let actualAction = action;
    let actualAmount = amount;

    // Check deadline
    const deadlinePassed = hand.action_deadline && new Date(hand.action_deadline) < new Date();

    if (playerSeat.seat_number !== hand.current_actor_seat) {
      // If deadline passed and this is a timeout ping from another player, allow fold of current actor
      if (deadlinePassed) {
        // Process as a forced fold of the current actor
        return await processAction(admin, table, hand, seats, hand.current_actor_seat, "fold", 0, true);
      }
      return new Response(JSON.stringify({ error: "Not your turn" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If deadline passed, force fold
    if (deadlinePassed) {
      actualAction = "fold";
      actualAmount = 0;
    }

    console.log(`[ACTION] hand=${hand_id} player=${user.id} action=${actualAction} amount=${actualAmount} deadline_passed=${deadlinePassed}`);
    return await processAction(admin, table, hand, seats, playerSeat.seat_number, actualAction, actualAmount, false);
  } catch (err) {
    console.error("poker-action error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function processAction(
  admin: any, table: any, hand: any, seats: any[],
  actorSeatNum: number, action: string, amount: number, isTimeout: boolean
): Promise<Response> {
  const actorSeat = seats.find((s: any) => s.seat_number === actorSeatNum);
  if (!actorSeat) {
    return new Response(JSON.stringify({ error: "Actor seat not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Build seat states for computation
  // We need to track current round bets. For simplicity we'll use the actions log.
  const { data: actions } = await admin.from("poker_actions")
    .select("*")
    .eq("hand_id", hand.id)
    .order("sequence", { ascending: true });

  const seatStates: SeatState[] = seats
    .filter((s: any) => s.player_id)
    .map((s: any) => {
      // Calculate current round bet and total bet from actions
      let totalBet = 0;
      let currentRoundBet = 0;
      let status = s.status === "sitting_out" || s.status === "disconnected" ? "folded" : "active";
      let hasActed = false;

      for (const a of (actions || [])) {
        if (a.player_id !== s.player_id) continue;
        if (a.action_type === "fold") { status = "folded"; break; }

        totalBet += a.amount || 0;
        if (a.phase === hand.phase) {
          currentRoundBet += a.amount || 0;
          if (!["post_blind", "post_ante"].includes(a.action_type)) hasActed = true;
        }
      }

      // Check for all-in
      if (status === "active" && s.stack <= 0 && totalBet > 0) status = "all-in";

      return {
        seat_id: s.id,
        seat_number: s.seat_number,
        player_id: s.player_id,
        stack: s.stack,
        status,
        current_round_bet: currentRoundBet,
        total_bet_this_hand: totalBet,
        has_acted_this_round: hasActed,
        consecutive_timeouts: s.consecutive_timeouts || 0,
      };
    });

  const actor = seatStates.find(s => s.seat_number === actorSeatNum)!;
  const currentBet = hand.current_bet || 0;
  const minRaise = hand.min_raise || table.big_blind;

  // 3. Validate action
  const toCall = currentBet - actor.current_round_bet;

  if (action === "check") {
    if (toCall > 0) {
      return new Response(JSON.stringify({ error: "Cannot check, must call or raise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } else if (action === "call") {
    if (toCall <= 0) {
      // Treat as check
    }
  } else if (action === "raise") {
    const raiseAmount = amount;
    if (raiseAmount < currentBet + minRaise && raiseAmount < actor.stack + actor.current_round_bet) {
      return new Response(JSON.stringify({ error: `Raise must be at least ${currentBet + minRaise}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  // 4. Apply action
  const newSequence = (actions?.length || 0) + 1;
  let newCurrentBet = currentBet;
  let newMinRaise = minRaise;
  let betAmount = 0;

  switch (action) {
    case "fold":
      actor.status = "folded";
      break;
    case "check":
      // No chip movement
      break;
    case "call": {
      betAmount = Math.min(toCall, actor.stack);
      actor.stack -= betAmount;
      actor.current_round_bet += betAmount;
      actor.total_bet_this_hand += betAmount;
      if (actor.stack <= 0) actor.status = "all-in";
      break;
    }
    case "raise": {
      const totalToPut = amount - actor.current_round_bet; // amount is the total bet level
      betAmount = Math.min(totalToPut, actor.stack);
      const raiseIncrement = (actor.current_round_bet + betAmount) - currentBet;
      actor.stack -= betAmount;
      actor.current_round_bet += betAmount;
      actor.total_bet_this_hand += betAmount;
      newCurrentBet = actor.current_round_bet;
      if (raiseIncrement > 0) newMinRaise = raiseIncrement;
      if (actor.stack <= 0) actor.status = "all-in";
      // Reset "has acted" for other active players since there's a new raise
      for (const s of seatStates) {
        if (s.player_id !== actor.player_id && s.status === "active") {
          s.has_acted_this_round = false;
        }
      }
      break;
    }
    case "all_in":
    case "all-in": {
      betAmount = actor.stack;
      actor.current_round_bet += betAmount;
      actor.total_bet_this_hand += betAmount;
      if (actor.current_round_bet > currentBet) {
        const raiseIncrement = actor.current_round_bet - currentBet;
        newCurrentBet = actor.current_round_bet;
        // Only reopen if it's a full raise
        if (raiseIncrement >= minRaise) {
          newMinRaise = raiseIncrement;
          for (const s of seatStates) {
            if (s.player_id !== actor.player_id && s.status === "active") {
              s.has_acted_this_round = false;
            }
          }
        }
      }
      actor.stack = 0;
      actor.status = "all-in";
      break;
    }
  }

  actor.has_acted_this_round = true;
  if (isTimeout) actor.consecutive_timeouts += 1;
  else actor.consecutive_timeouts = 0;

  // 5. Determine if betting round is complete
  const activePlayers = seatStates.filter(s => s.status === "active");
  const allInPlayers = seatStates.filter(s => s.status === "all-in");
  const nonFolded = seatStates.filter(s => s.status !== "folded");

  let roundComplete = false;
  let handComplete = false;
  let newPhase = hand.phase;

  // If only one non-folded player remains, hand is over
  if (nonFolded.length <= 1) {
    handComplete = true;
    newPhase = "complete";
  } else if (activePlayers.length === 0) {
    // All remaining players are all-in — run out community cards
    roundComplete = true;
  } else {
    // Check if all active players have acted and bets are equal
    const allActed = activePlayers.every(p => p.has_acted_this_round);
    const allBetsEqual = activePlayers.every(p => p.current_round_bet === newCurrentBet);
    roundComplete = allActed && allBetsEqual;
  }

  // 6. Advance phase if needed
  let communityCards: Card[] = hand.community_cards || [];
  let deckSeedRevealed: string | null = null;
  let results: any = null;
  let showdownCards: any = null;

  if (!handComplete && roundComplete) {
    // Deal community cards
    const deckSeed = hand.deck_seed_internal;
    const deck = seededShuffle(createDeck(), deckSeed);
    const numPlayers = seatStates.filter(s => s.total_bet_this_hand > 0 || s.status !== "folded").length;
    // Skip hole cards (2 * numPlayers) — actually we need to know how many were dealt
    // Count hole card entries
    const { count: holeCardCount } = await admin.from("poker_hole_cards").select("id", { count: "exact", head: true }).eq("hand_id", hand.id);
    const skipCards = (holeCardCount || numPlayers) * 2;

    const phaseOrder = ["preflop", "flop", "turn", "river", "showdown"];
    const currentPhaseIdx = phaseOrder.indexOf(hand.phase);
    const nextPhaseIdx = currentPhaseIdx + 1;
    newPhase = phaseOrder[nextPhaseIdx] || "showdown";

    // Deal community cards based on phase transition
    let deckOffset = skipCards;
    if (newPhase === "flop" || currentPhaseIdx < 1) {
      // Deal 3 cards for flop
      communityCards = [deck[deckOffset], deck[deckOffset + 1], deck[deckOffset + 2]];
    } else if (newPhase === "turn" || (currentPhaseIdx >= 1 && communityCards.length === 3)) {
      communityCards = [...communityCards, deck[deckOffset + 3]];
    } else if (newPhase === "river" || (currentPhaseIdx >= 2 && communityCards.length === 4)) {
      communityCards = [...communityCards, deck[deckOffset + 4]];
    }

    // If all active players are all-in, run out all remaining cards
    if (activePlayers.length <= 1 && allInPlayers.length > 0 && nonFolded.length > 1) {
      // Run out all community cards at once
      while (communityCards.length < 5) {
        communityCards.push(deck[deckOffset + communityCards.length]);
      }
      newPhase = "showdown";
    }

    // Reset for new betting round
    for (const s of seatStates) {
      s.current_round_bet = 0;
      s.has_acted_this_round = false;
    }
    newCurrentBet = 0;
    newMinRaise = table.big_blind;
  }

  // 7. Handle showdown
  if (newPhase === "showdown" && communityCards.length >= 5) {
    // Fetch showdown cards
    const { data: showdownData } = await admin.rpc("read_showdown_cards", { _hand_id: hand.id });
    showdownCards = showdownData;

    // Evaluate hands
    const pots = calculatePots(seatStates);
    const playerHands: { player_id: string; hand: HandResult; holeCards: Card[] }[] = [];

    for (const sc of (showdownCards || [])) {
      const playerState = seatStates.find(s => s.player_id === sc.player_id);
      if (!playerState || playerState.status === "folded") continue;

      try {
        const holeCards = sc.cards as Card[];
        const allCards = [...holeCards, ...communityCards];
        const handResult = evaluateHand(allCards);
        playerHands.push({ player_id: sc.player_id, hand: handResult, holeCards });
        console.log(`[SHOWDOWN] player=${sc.player_id} hole=${JSON.stringify(holeCards)} hand=${handResult.name} score=${handResult.score}`);
      } catch (e) {
        console.error(`Failed to evaluate hand for ${sc.player_id}:`, e);
      }
    }

    // Safety: warn on score collision with different hand names
    for (let i = 0; i < playerHands.length; i++) {
      for (let j = i + 1; j < playerHands.length; j++) {
        if (playerHands[i].hand.score === playerHands[j].hand.score && playerHands[i].hand.name !== playerHands[j].hand.name) {
          console.warn(`[SHOWDOWN WARNING] Score collision: ${playerHands[i].player_id} (${playerHands[i].hand.name}) vs ${playerHands[j].player_id} (${playerHands[j].hand.name}) both score=${playerHands[i].hand.score}`);
        }
      }
    }

    console.log(`[SHOWDOWN] community=${JSON.stringify(communityCards)}`);

    // Distribute pots
    const winners: any[] = [];
    for (let potIdx = 0; potIdx < pots.length; potIdx++) {
      const pot = pots[potIdx];
      const eligibleHands = playerHands.filter(ph => pot.eligible_player_ids.includes(ph.player_id));
      if (eligibleHands.length === 0) continue;

      eligibleHands.sort((a, b) => b.hand.score - a.hand.score);
      const bestScore = eligibleHands[0].hand.score;
      const potWinners = eligibleHands.filter(h => h.hand.score === bestScore);
      const share = Math.floor(pot.amount / potWinners.length);

      for (const w of potWinners) {
        const seat = seatStates.find(s => s.player_id === w.player_id)!;
        seat.stack += share;
        winners.push({
          player_id: w.player_id,
          pot_index: potIdx,
          amount: share,
          hand_name: w.hand.name,
        });
      }
    }

    // Build audit trail
    const hand_details = playerHands.map(ph => ({
      player_id: ph.player_id,
      hole_cards: ph.holeCards,
      hand_name: ph.hand.name,
      score: ph.hand.score,
    }));

    results = { winners, pots, hand_details, community_cards: communityCards };
    handComplete = true;
    newPhase = "complete";
    deckSeedRevealed = hand.deck_seed_internal;
  }

  // Handle single winner (everyone else folded)
  if (handComplete && !results) {
    const winner = nonFolded[0];
    if (winner) {
      const pots = calculatePots(seatStates);
      const totalPot = pots.reduce((sum, p) => sum + p.amount, 0);
      winner.stack += totalPot;
      results = {
        winners: [{ player_id: winner.player_id, pot_index: 0, amount: totalPot, hand_name: "Last standing" }],
        pots: [{ amount: totalPot, winners: [winner.player_id] }],
      };
      deckSeedRevealed = null; // Don't reveal seed for non-showdown
    }
  }

  // 8. Find next actor
  let nextActorSeat: number | null = null;
  if (!handComplete && !roundComplete) {
    nextActorSeat = nextActiveSeat(seatStates, actorSeatNum, table.max_seats, ["folded", "all-in", "sitting_out", "disconnected"]);
  } else if (!handComplete && roundComplete && newPhase !== "showdown") {
    // New betting round: first active player left of dealer
    nextActorSeat = nextActiveSeat(seatStates, hand.dealer_seat, table.max_seats, ["folded", "all-in", "sitting_out", "disconnected"]);
  }

  const actionDeadline = nextActorSeat !== null ? new Date(Date.now() + 20_000).toISOString() : null;

  // 9. Commit state
  const seatUpdates = seatStates.map(s => {
    const originalSeat = seats.find((dbSeat: any) => dbSeat.id === s.seat_id);
    const wasNonParticipant = originalSeat?.status === "sitting_out" || originalSeat?.status === "disconnected";
    
    let dbStatus: string;
    if (wasNonParticipant) {
      dbStatus = originalSeat.status;
    } else if (s.status === "folded") {
      dbStatus = "active";
    } else {
      dbStatus = s.status;
    }
    
    return {
      seat_id: s.seat_id,
      stack: s.stack,
      status: dbStatus,
      consecutive_timeouts: s.consecutive_timeouts,
    };
  });

  // For folded/all-in, we track in the actions log, not seat status
  // Seats keep their original status unless all-in
  const dbSeatUpdates = seatStates.map(s => {
    const originalSeat = seats.find((dbSeat: any) => dbSeat.id === s.seat_id);
    const wasNonParticipant = originalSeat?.status === "sitting_out" || originalSeat?.status === "disconnected";
    
    let dbStatus: string;
    if (wasNonParticipant) {
      dbStatus = originalSeat.status;
    } else if (s.status === "all-in" || s.status === "folded") {
      dbStatus = "active";
    } else {
      dbStatus = s.status;
    }
    
    return {
      seat_id: s.seat_id,
      stack: s.stack,
      status: dbStatus,
      consecutive_timeouts: s.consecutive_timeouts,
    };
  });

  const actionRecord = {
    player_id: actorSeat.player_id,
    seat_number: actorSeatNum,
    action_type: action === "all-in" ? "all_in" : action,
    amount: betAmount,
    phase: hand.phase,
    sequence: newSequence,
  };

  const finalPots = handComplete ? (results?.pots || []) : calculatePots(seatStates);

  const { data: commitResult, error: commitErr } = await admin.rpc("commit_poker_state", {
    _hand_id: hand.id,
    _expected_version: hand.state_version,
    _new_phase: newPhase,
    _community_cards: communityCards,
    _pots: finalPots,
    _current_actor_seat: nextActorSeat,
    _current_bet: newCurrentBet,
    _min_raise: newMinRaise,
    _action_deadline: actionDeadline,
    _completed_at: handComplete ? new Date().toISOString() : null,
    _results: results,
    _deck_seed_revealed: deckSeedRevealed,
    _seat_updates: dbSeatUpdates,
    _action_record: actionRecord,
  });

  if (commitErr) throw commitErr;
  if (commitResult?.error === "version_conflict") {
    console.log(`[ACTION] version_conflict hand=${hand.id} seat=${actorSeatNum} v=${hand.state_version}`);
    return new Response(JSON.stringify({ error: "action_superseded" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  console.log(`[ACTION] committed hand=${hand.id} seat=${actorSeatNum} action=${action} phase=${hand.phase}->${newPhase} next_actor=${nextActorSeat} complete=${handComplete}`);

  // 10. Get profiles for broadcast
  const playerIds = seatStates.map(s => s.player_id);
  const { data: profiles } = await admin.from("profiles").select("id, display_name, avatar_url").in("id", playerIds);
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // FIX MH-1: Only include players who actually have hole cards for this hand
  // This prevents mid-hand joiners (sitting_out) from appearing with has_cards:true
  const { data: holeCardRows } = await admin.from("poker_hole_cards").select("player_id").eq("hand_id", hand.id);
  const holeCardPlayerIds = new Set((holeCardRows || []).map((r: any) => r.player_id));

  // 11. Broadcast public state
  const publicState = {
    hand_id: hand.id,
    phase: newPhase,
    community_cards: communityCards,
    pots: finalPots,
    current_actor_seat: nextActorSeat,
    current_actor_id: nextActorSeat !== null ? seatStates.find(s => s.seat_number === nextActorSeat)?.player_id : null,
    dealer_seat: hand.dealer_seat,
    sb_seat: hand.sb_seat,
    bb_seat: hand.bb_seat,
    min_raise: newMinRaise,
    current_bet: newCurrentBet,
    seats: seatStates.map(s => {
      const profile = profileMap.get(s.player_id);
      return {
        seat: s.seat_number,
        player_id: s.player_id,
        display_name: profile?.display_name || "Player",
        avatar_url: profile?.avatar_url || null,
        stack: s.stack,
        status: s.status,
        current_bet: s.current_round_bet,
        last_action: s.player_id === actorSeat.player_id ? action : null,
        has_cards: holeCardPlayerIds.has(s.player_id) && s.status !== "folded",
      };
    }),
    action_deadline: actionDeadline,
    hand_number: hand.hand_number,
    blinds: { small: table.small_blind, big: table.big_blind, ante: table.ante },
    state_version: commitResult.state_version,
  };

  const channel = admin.channel(`poker:table:${table.id}`);
  await channel.send({ type: "broadcast", event: "game_state", payload: publicState });

  // Broadcast hand result if complete
  if (handComplete && results) {
    const revealedCards = showdownCards
      ? (showdownCards as any[]).filter((sc: any) => seatStates.find(s => s.player_id === sc.player_id && s.status !== "folded"))
          .map((sc: any) => ({ player_id: sc.player_id, cards: sc.cards }))
      : [];

    await channel.send({
      type: "broadcast",
      event: "hand_result",
      payload: {
        hand_id: hand.id,
        winners: results.winners,
        revealed_cards: revealedCards,
        pots: results.pots,
        community_cards: communityCards,
        state_version: commitResult.state_version,
      },
    });

    // Update table status back to waiting
    await admin.from("poker_tables").update({ status: "waiting" }).eq("id", table.id);
  }

  return new Response(JSON.stringify({ success: true, state_version: commitResult.state_version }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function nextActiveSeat(seats: SeatState[], fromSeat: number, maxSeats: number, excludeStatuses: string[]): number | null {
  for (let i = 1; i <= maxSeats; i++) {
    const s = (fromSeat + i) % maxSeats;
    const seat = seats.find(se => se.seat_number === s && !excludeStatuses.includes(se.status));
    if (seat) return s;
  }
  return null;
}
