import { useState, useEffect } from 'react';
import { Bug } from 'lucide-react';
import { OnlineTableState } from '@/lib/poker/online-types';
import { Card } from '@/lib/poker/types';

interface GameStateDebugPanelProps {
  tableState: OnlineTableState | null;
  myCards: Card[] | null;
  mySeatNumber: number | null;
  isMyTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  actionPending: boolean;
  connectionStatus: string;
}

export function GameStateDebugPanel({
  tableState,
  myCards,
  mySeatNumber,
  isMyTurn,
  amountToCall,
  canCheck,
  actionPending,
  connectionStatus,
}: GameStateDebugPanelProps) {
  const [open, setOpen] = useState(true);
  const [deadlineCountdown, setDeadlineCountdown] = useState<string | null>(null);

  const hand = tableState?.current_hand ?? null;
  const table = tableState?.table ?? null;
  const seats = tableState?.seats ?? [];

  // Live countdown for action deadline
  useEffect(() => {
    if (!hand?.action_deadline) {
      setDeadlineCountdown(null);
      return;
    }
    const tick = () => {
      const ms = new Date(hand.action_deadline!).getTime() - Date.now();
      if (ms <= 0) {
        setDeadlineCountdown('EXPIRED');
      } else {
        setDeadlineCountdown((ms / 1000).toFixed(1) + 's');
      }
    };
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [hand?.action_deadline]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-2 right-2 z-[1000] p-1.5 rounded-md"
        style={{
          background: 'hsl(0 0% 0% / 0.7)',
          border: '1px solid hsl(43 74% 49% / 0.5)',
          color: 'hsl(43 74% 60%)',
        }}
      >
        <Bug size={14} />
      </button>
    );
  }

  const shortId = (id?: string | null) => id ? id.slice(0, 8) : '—';

  return (
    <div
      className="fixed top-2 right-2 z-[1000] overflow-auto pointer-events-auto"
      style={{
        background: 'hsl(0 0% 0% / 0.85)',
        border: '1px solid hsl(43 74% 49% / 0.4)',
        borderRadius: 6,
        fontFamily: 'monospace',
        fontSize: 9,
        lineHeight: 1.4,
        color: 'hsl(0 0% 80%)',
        maxHeight: 'calc(100vh - 16px)',
        maxWidth: 280,
        padding: '4px 6px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1" style={{ color: 'hsl(43 74% 60%)' }}>
        <span className="font-bold text-[10px]">🐛 Debug</span>
        <button onClick={() => setOpen(false)} className="text-[9px] opacity-70 hover:opacity-100">✕</button>
      </div>

      {/* Table */}
      <Section title="TABLE">
        <Row k="name" v={table?.name} />
        <Row k="status" v={table?.status} />
        <Row k="blinds" v={table ? `${table.small_blind}/${table.big_blind}` : '—'} />
        <Row k="ante" v={table?.ante} />
        <Row k="blind_level" v={table?.blind_level} />
        <Row k="blind_timer" v={table ? `${table.blind_timer_minutes}m` : '—'} />
      </Section>

      {/* Hand */}
      <Section title="HAND">
        {hand ? (
          <>
            <Row k="id" v={shortId(hand.hand_id)} />
            <Row k="hand#" v={hand.hand_number} />
            <Row k="phase" v={hand.phase} highlight />
            <Row k="state_v" v={hand.state_version} />
            <Row k="D/SB/BB" v={`${hand.dealer_seat}/${hand.sb_seat}/${hand.bb_seat}`} />
            <Row k="community" v={hand.community_cards.length > 0 ? hand.community_cards.map(c => `${c.rank}${c.suit}`).join(' ') : '—'} />
          </>
        ) : (
          <div style={{ color: 'hsl(0 0% 50%)' }}>No active hand</div>
        )}
      </Section>

      {/* Actor */}
      {hand && (
        <Section title="ACTOR">
          <Row k="seat" v={hand.current_actor_seat ?? '—'} />
          <Row k="deadline" v={deadlineCountdown ?? '—'} highlight={deadlineCountdown === 'EXPIRED'} />
          <Row k="current_bet" v={hand.current_bet} />
          <Row k="min_raise" v={hand.min_raise} />
        </Section>
      )}

      {/* Pots */}
      {hand && hand.pots.length > 0 && (
        <Section title="POTS">
          {hand.pots.map((p, i) => (
            <Row key={i} k={`pot${i}`} v={`${p.amount} (${p.eligible_player_ids.length}p)`} />
          ))}
        </Section>
      )}

      {/* Seats */}
      <Section title={`SEATS (${seats.filter(s => s.player_id).length})`}>
        {seats.filter(s => s.player_id).map(s => (
          <div key={s.seat} className="flex gap-1" style={{ borderBottom: '1px solid hsl(0 0% 20%)', paddingBottom: 1, marginBottom: 1 }}>
            <span style={{ color: 'hsl(43 74% 49%)', minWidth: 12 }}>S{s.seat}</span>
            <span className="truncate" style={{ maxWidth: 50 }}>{s.display_name}</span>
            <span style={{ color: 'hsl(120 40% 55%)' }}>{s.stack}</span>
            <span style={{ color: 'hsl(200 50% 60%)' }}>{s.status}</span>
            {s.current_bet ? <span style={{ color: 'hsl(0 60% 60%)' }}>bet:{s.current_bet}</span> : null}
            {s.last_action && <span style={{ color: 'hsl(270 40% 65%)' }}>{s.last_action}</span>}
            {s.has_cards && <span>🃏</span>}
          </div>
        ))}
      </Section>

      {/* Client State */}
      <Section title="CLIENT">
        <Row k="mySeat" v={mySeatNumber ?? '—'} />
        <Row k="isMyTurn" v={isMyTurn ? '✅' : '❌'} />
        <Row k="toCall" v={amountToCall} />
        <Row k="canCheck" v={canCheck ? '✅' : '❌'} />
        <Row k="pending" v={actionPending ? '⏳' : '—'} />
        <Row k="conn" v={connectionStatus} highlight={connectionStatus !== 'connected'} />
      </Section>

      {/* My Cards */}
      <Section title="MY CARDS">
        <div>{myCards && myCards.length > 0 ? myCards.map(c => `${c.rank}${c.suit}`).join(' ') : '—'}</div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="font-bold" style={{ color: 'hsl(43 74% 49%)', fontSize: 8, letterSpacing: 1 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v?: string | number | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span style={{ color: 'hsl(0 0% 55%)' }}>{k}</span>
      <span style={{ color: highlight ? 'hsl(0 70% 60%)' : 'hsl(0 0% 85%)' }}>{String(v ?? '—')}</span>
    </div>
  );
}
