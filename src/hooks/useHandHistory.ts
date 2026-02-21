import { useState, useCallback, useRef } from 'react';
import { Card } from '@/lib/poker/types';
import { RevealedCard, HandWinner } from '@/hooks/useOnlinePokerTable';

export interface HandAction {
  playerName: string;
  action: string;
  amount: number;
  phase: string;
  timestamp: number;
}

export interface HandPlayerSnapshot {
  name: string;
  seatIndex: number;
  startStack: number;
  playerId: string;
}

export interface HandRecord {
  handId: string;
  handNumber: number;
  players: HandPlayerSnapshot[];
  actions: HandAction[];
  communityCards: Card[];
  winners: HandWinner[];
  pots: Array<{ amount: number }>;
  myCards: Card[] | null;
  revealedCards: RevealedCard[];
  timestamp: number;
}

const MAX_HANDS = 10;
const MAX_TABLES = 5;
const STORAGE_PREFIX = 'poker-hand-history-';

function loadFromStorage(tableId: string): HandRecord[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveToStorage(tableId: string, records: HandRecord[]) {
  try {
    const trimmed = records.slice(-MAX_HANDS);
    localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(trimmed));

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    if (keys.length > MAX_TABLES) {
      const sorted = keys.map(k => {
        try {
          const data = JSON.parse(localStorage.getItem(k) || '[]');
          return { key: k, ts: data[0]?.timestamp ?? 0 };
        } catch { return { key: k, ts: 0 }; }
      }).sort((a, b) => a.ts - b.ts);
      for (let i = 0; i < sorted.length - MAX_TABLES; i++) {
        localStorage.removeItem(sorted[i].key);
      }
    }
  } catch {}
}

export interface UseHandHistoryReturn {
  lastHand: HandRecord | null;
  handHistory: HandRecord[];
  startNewHand: (handId: string, handNumber: number, players: HandPlayerSnapshot[]) => void;
  recordAction: (action: HandAction) => void;
  finalizeHand: (data: {
    communityCards: Card[];
    winners: HandWinner[];
    pots: Array<{ amount: number }>;
    myCards: Card[] | null;
    revealedCards: RevealedCard[];
  }) => void;
  exportCSV: () => string;
}

export function useHandHistory(tableId: string): UseHandHistoryReturn {
  const [handHistory, setHandHistory] = useState<HandRecord[]>(() => loadFromStorage(tableId));
  const currentHandRef = useRef<Partial<HandRecord> | null>(null);

  const lastHand = handHistory.length > 0 ? handHistory[handHistory.length - 1] : null;

  const startNewHand = useCallback((handId: string, handNumber: number, players: HandPlayerSnapshot[]) => {
    currentHandRef.current = {
      handId,
      handNumber,
      players,
      actions: [],
      communityCards: [],
      winners: [],
      pots: [],
      myCards: null,
      revealedCards: [],
      timestamp: Date.now(),
    };
  }, []);

  const recordAction = useCallback((action: HandAction) => {
    if (currentHandRef.current) {
      currentHandRef.current.actions = [...(currentHandRef.current.actions || []), action];
    }
  }, []);

  const finalizeHand = useCallback((data: {
    communityCards: Card[];
    winners: HandWinner[];
    pots: Array<{ amount: number }>;
    myCards: Card[] | null;
    revealedCards: RevealedCard[];
  }) => {
    const current = currentHandRef.current;
    if (!current || !current.handId) return;

    const record: HandRecord = {
      handId: current.handId!,
      handNumber: current.handNumber!,
      players: current.players || [],
      actions: current.actions || [],
      communityCards: data.communityCards,
      winners: data.winners,
      pots: data.pots,
      myCards: data.myCards,
      revealedCards: data.revealedCards,
      timestamp: current.timestamp || Date.now(),
    };

    setHandHistory(prev => {
      const updated = [...prev, record].slice(-MAX_HANDS);
      saveToStorage(tableId, updated);
      return updated;
    });

    currentHandRef.current = null;
  }, [tableId]);

  const exportCSV = useCallback(() => {
    const headers = ['Hand#', 'Date', 'Players', 'My Cards', 'Community Cards', 'Winner', 'Pot'];
    const rows = handHistory.map(h => {
      const date = new Date(h.timestamp).toLocaleString();
      const players = h.players.map(p => p.name).join('; ');
      const myCards = h.myCards ? h.myCards.map(c => `${c.rank}${c.suit}`).join(' ') : '-';
      const community = h.communityCards.map(c => `${c.rank}${c.suit}`).join(' ');
      const winner = h.winners.map(w => `${w.display_name} (${w.hand_name})`).join('; ');
      const pot = h.pots.reduce((s, p) => s + p.amount, 0);
      return [h.handNumber, date, players, myCards, community, winner, pot].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }, [handHistory]);

  return { lastHand, handHistory, startNewHand, recordAction, finalizeHand, exportCSV };
}
