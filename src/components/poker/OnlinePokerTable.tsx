import { useState, useEffect, useCallback } from 'react';
import { useOnlinePokerTable } from '@/hooks/useOnlinePokerTable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { PlayerAvatar } from './PlayerAvatar';
import { DealerButton } from './DealerButton';
import { DealerCharacter } from './DealerCharacter';
import { TableFelt } from './TableFelt';
import { TurnTimer } from './TurnTimer';
import { usePokerSounds } from '@/hooks/usePokerSounds';
import { ConnectionOverlay } from './ConnectionOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Play, LogOut, Users, Copy, Check, Volume2, VolumeX, Eye, UserX, XCircle, MoreVertical, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InvitePlayersDialog } from './InvitePlayersDialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { OnlineSeatInfo } from '@/lib/poker/online-types';
import leatherBg from '@/assets/leather-bg.jpg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callEdge(fn: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Edge function error');
  return data;
}

interface OnlinePokerTableProps {
  tableId: string;
  onLeave: () => void;
}

// Seat positions matching PokerTablePro layout
const SEAT_POSITIONS: Record<number, { x: number; y: number }[]> = {
  2: [{ x: 50, y: 88 }, { x: 50, y: 6 }],
  3: [{ x: 50, y: 88 }, { x: 14, y: 28 }, { x: 86, y: 28 }],
  4: [{ x: 50, y: 88 }, { x: 86, y: 48 }, { x: 50, y: 6 }, { x: 14, y: 48 }],
  5: [{ x: 50, y: 88 }, { x: 90, y: 52 }, { x: 76, y: 6 }, { x: 24, y: 6 }, { x: 10, y: 52 }],
  6: [{ x: 50, y: 88 }, { x: 90, y: 58 }, { x: 82, y: 6 }, { x: 50, y: 2 }, { x: 18, y: 6 }, { x: 10, y: 58 }],
  7: [{ x: 50, y: 88 }, { x: 90, y: 62 }, { x: 86, y: 22 }, { x: 64, y: 2 }, { x: 36, y: 2 }, { x: 14, y: 22 }, { x: 10, y: 62 }],
  8: [{ x: 50, y: 88 }, { x: 90, y: 62 }, { x: 90, y: 22 }, { x: 66, y: 2 }, { x: 34, y: 2 }, { x: 10, y: 22 }, { x: 10, y: 62 }, { x: 76, y: 88 }],
  9: [{ x: 50, y: 88 }, { x: 90, y: 68 }, { x: 92, y: 32 }, { x: 74, y: 2 }, { x: 50, y: 0 }, { x: 26, y: 2 }, { x: 8, y: 32 }, { x: 10, y: 68 }, { x: 24, y: 88 }],
};

export function OnlinePokerTable({ tableId, onLeave }: OnlinePokerTableProps) {
  const { user } = useAuth();
  const {
    tableState, myCards, loading, error, mySeatNumber, isMyTurn,
    amountToCall, canCheck, joinTable, leaveTable, startHand, sendAction,
  } = useOnlinePokerTable(tableId);

  const [buyInAmount, setBuyInAmount] = useState('');
  const [joining, setJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const { play, enabled: soundEnabled, toggle: toggleSound } = usePokerSounds();
  const [dealerExpression, setDealerExpression] = useState<'neutral' | 'smile' | 'surprise'>('neutral');
  const [prevPhase, setPrevPhase] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Sound triggers on phase changes
  const currentPhase = tableState?.current_hand?.phase ?? null;
  useEffect(() => {
    if (currentPhase && currentPhase !== prevPhase) {
      if (currentPhase === 'preflop' && !prevPhase) play('shuffle');
      if (currentPhase === 'flop' || currentPhase === 'turn' || currentPhase === 'river') play('flip');
      if (currentPhase === 'showdown' || currentPhase === 'complete') {
        play('win');
        setDealerExpression('smile');
        setTimeout(() => setDealerExpression('neutral'), 2500);
      }
      setPrevPhase(currentPhase);
    }
    if (!currentPhase) setPrevPhase(null);
  }, [currentPhase, prevPhase, play]);

  // Listen for kicked broadcast
  useEffect(() => {
    if (!tableState || !user) return;
    // The seat_change broadcast with action=kicked is handled by the hook's refreshState
    // But we also check if WE were kicked
    const checkKicked = () => {
      if (mySeatNumber !== null) return; // still seated
    };
    checkKicked();
  }, [tableState, user, mySeatNumber]);

  // Your turn sound
  useEffect(() => {
    if (isMyTurn) play('yourTurn');
  }, [isMyTurn, play]);

  // Track connection status
  useEffect(() => {
    if (error && (error.includes('fetch') || error.includes('network') || error.includes('Failed'))) {
      setIsDisconnected(true);
    } else if (tableState) {
      setIsDisconnected(false);
    }
  }, [error, tableState]);

  const handleReconnect = useCallback(() => {
    window.location.reload();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading table...</div>
      </div>
    );
  }

  if (error || !tableState) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-destructive">{error || 'Table not found'}</p>
        <Button variant="outline" onClick={onLeave}>Go Back</Button>
      </div>
    );
  }

  const { table, seats, current_hand: hand } = tableState;
  const isSeated = mySeatNumber !== null;
  const isSpectator = !isSeated;
  const isCreator = user?.id === table.created_by;
  const activeSeats = seats.filter(s => s.player_id);
  const canStartHand = (isCreator || isSeated) && !hand && activeSeats.length >= 2;
  const totalPot = hand?.pots?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const mySeat = seats.find(s => s.player_id === user?.id);
  const canModerate = isCreator && !hand;

  const handleKickPlayer = async (playerId: string) => {
    try {
      await callEdge('poker-moderate-table', { table_id: tableId, action: 'kick', target_player_id: playerId });
      toast({ title: 'Player removed' });
      setKickTarget(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCloseTable = async () => {
    try {
      await callEdge('poker-moderate-table', { table_id: tableId, action: 'close' });
      toast({ title: 'Table closed' });
      setCloseConfirm(false);
      onLeave();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleJoinSeat = async (seatNum: number) => {
    const amount = parseInt(buyInAmount) || table.max_buy_in;
    if (amount < table.min_buy_in || amount > table.max_buy_in) {
      toast({ title: 'Invalid buy-in', description: `Must be between ${table.min_buy_in} and ${table.max_buy_in}`, variant: 'destructive' });
      return;
    }
    setJoining(true);
    try { await joinTable(seatNum, amount); toast({ title: 'Seated!' }); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    finally { setJoining(false); }
  };

  const handleLeave = async () => {
    try { await leaveTable(); onLeave(); }
    catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  const copyInviteCode = () => {
    if (table.invite_code) {
      navigator.clipboard.writeText(table.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAction = (action: any) => {
    if (action.type === 'check') play('check');
    else if (action.type === 'call') play('chipClink');
    else if (action.type === 'raise') play('chipStack');
    else if (action.type === 'all-in') play('allIn');
    const actionType = action.type === 'all-in' ? 'all_in' : action.type;
    sendAction(actionType, action.amount);
  };

  // Build seat array for all positions
  const allSeats: (OnlineSeatInfo | null)[] = Array.from({ length: table.max_seats }, (_, i) => {
    return seats.find(s => s.seat === i) || null;
  });

  const positions = SEAT_POSITIONS[Math.min(Math.max(table.max_seats, 2), 9)] || SEAT_POSITIONS[9];

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden z-[60]">
      {/* Leather background */}
      <img src={leatherBg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 z-20 safe-area-top shrink-0 relative"
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 0% / 0.5), hsl(0 0% 0% / 0.3))',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(43 74% 49% / 0.15)',
        }}
      >
        <button onClick={isSeated ? handleLeave : onLeave}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-foreground/80" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-foreground/80 truncate max-w-[120px]">{table.name}</span>
          {hand && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{
                background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 60% 40%))',
                color: 'hsl(160 30% 8%)',
                boxShadow: '0 1px 4px rgba(200,160,40,0.3)',
              }}
            >
              #{hand.hand_number}
            </span>
          )}
          <span className="text-[10px] text-foreground/60 font-medium">{table.small_blind}/{table.big_blind}</span>
        </div>

        <div className="flex items-center gap-1">
          {table.invite_code && (
            <button onClick={copyInviteCode}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
            >
              {codeCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-foreground/80" />}
            </button>
          )}
          <button onClick={() => setInviteOpen(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
          >
            <UserPlus className="h-3.5 w-3.5 text-foreground/80" />
          </button>
          <button onClick={toggleSound}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-foreground/80" /> : <VolumeX className="h-3.5 w-3.5 text-foreground/40" />}
          </button>
          {isSpectator && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-secondary-foreground font-bold">
              <Eye className="h-2.5 w-2.5" /> Watching
            </span>
          )}
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90">
                  <MoreVertical className="h-3.5 w-3.5 text-foreground/80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canModerate && activeSeats.filter(s => s.player_id !== user?.id).map(s => (
                  <DropdownMenuItem key={s.player_id} onClick={() => setKickTarget({ id: s.player_id!, name: s.display_name })}>
                    <UserX className="h-3.5 w-3.5 mr-2" /> Kick {s.display_name}
                  </DropdownMenuItem>
                ))}
                {canModerate && (
                  <DropdownMenuItem onClick={() => setCloseConfirm(true)} className="text-destructive">
                    <XCircle className="h-3.5 w-3.5 mr-2" /> Close Table
                  </DropdownMenuItem>
                )}
                {!canModerate && hand && (
                  <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                    Wait for hand to end
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <div className="flex items-center gap-0.5 text-[10px] text-foreground/50">
            <Users className="h-3 w-3" />
            <span>{activeSeats.length}/{table.max_seats}</span>
          </div>
        </div>
      </div>

      {/* Main table area */}
      <div className="flex-1 relative z-10">
        <TableFelt className="absolute inset-0">
          {/* Dealer character — top center */}
          <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: '2%' }}>
            <DealerCharacter expression={dealerExpression} />
          </div>

          {/* Pot display */}
          {totalPot > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '38%' }}>
              <PotDisplay pot={totalPot} />
            </div>
          )}

          {/* Community cards */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10 flex gap-1.5 items-center" style={{ top: '48%' }}>
            {(hand?.community_cards || []).map((card, i) => (
              <CardDisplay key={i} card={card} size="md" dealDelay={i * 0.12} />
            ))}
            {Array.from({ length: 5 - (hand?.community_cards?.length || 0) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-10 h-14 rounded-lg border border-border/10 bg-black/10" />
            ))}
          </div>

          {/* Phase indicator */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '62%' }}>
            {hand ? (
              <span className={cn(
                'text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold',
                (hand.phase === 'flop' || hand.phase === 'turn' || hand.phase === 'river') && 'animate-phase-flash',
              )} style={{ textShadow: '0 0 8px rgba(0,0,0,0.5)' }}>
                {hand.phase === 'preflop' ? 'Pre-Flop' : hand.phase === 'complete' ? 'Showdown' : hand.phase}
              </span>
            ) : (
              <span className="text-[9px] text-foreground/20 italic font-medium"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {canStartHand ? 'Ready to deal' : 'Waiting for players...'}
              </span>
            )}
          </div>

          {/* Deal button when no active hand */}
          {!hand && canStartHand && (
            <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: '70%' }}>
              <button onClick={startHand}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-xs active:scale-90 transition-all"
                style={{
                  background: 'linear-gradient(135deg, hsl(43 80% 50%), hsl(43 74% 38%))',
                  color: 'hsl(160 30% 8%)',
                  boxShadow: '0 3px 12px rgba(200,160,40,0.4), 0 0 20px hsl(43 74% 49% / 0.2)',
                  border: '1px solid hsl(43 70% 55%)',
                }}
              >
                <Play className="h-3.5 w-3.5" /> Deal Hand
              </button>
            </div>
          )}

          {/* Player seats around the table */}
          {allSeats.map((seatData, seatIndex) => {
            const pos = positions[seatIndex] || { x: 50, y: 50 };
            const isMe = seatData?.player_id === user?.id;
            const isCurrentActor = hand?.current_actor_seat === seatIndex;
            const isDealer = hand?.dealer_seat === seatIndex;
            const isFolded = seatData?.status === 'folded';
            const isEmpty = !seatData?.player_id;
            const isShowdown = hand?.phase === 'showdown' || hand?.phase === 'complete';

            // Skip my seat in perimeter (shown at bottom)
            if (isMe) return null;

            return (
              <div
                key={seatIndex}
                className={cn(
                  'absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300',
                  !isEmpty && !isCurrentActor && hand && !isShowdown ? 'seat-dimmed' : 'seat-active',
                )}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                {isEmpty ? (
                  <EmptySeatDisplay
                    seatNumber={seatIndex}
                    canJoin={!isSeated}
                    onJoin={() => handleJoinSeat(seatIndex)}
                  />
                ) : (
                  <OnlineSeatDisplay
                    seatData={seatData!}
                    seatNumber={seatIndex}
                    isCurrentActor={isCurrentActor && !isFolded}
                    isDealer={!!isDealer}
                    isFolded={!!isFolded}
                    hasCards={!!seatData?.has_cards && !!hand}
                    isShowdown={!!isShowdown}
                  />
                )}
              </div>
            );
          })}
        </TableFelt>
      </div>

      {/* My seat at bottom */}
      {isSeated && mySeat ? (
        <div className="px-3 py-2 z-20 safe-area-bottom shrink-0 relative"
          style={{ background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.7))' }}
        >
          <div className="flex items-center justify-center gap-4 mb-1.5">
            {/* My hole cards */}
            <div className="flex gap-1.5">
              {myCards && myCards.length > 0 ? (
                myCards.map((card, i) => <CardDisplay key={i} card={card} size="lg" dealDelay={i * 0.15} />)
              ) : hand ? (
                <>
                  <CardDisplay faceDown size="lg" />
                  <CardDisplay faceDown size="lg" />
                </>
              ) : null}
            </div>

            {/* My info */}
            <div className="text-center">
              <div className="relative flex items-center gap-1.5 justify-center">
                <PlayerAvatar
                  name="You"
                  index={0}
                  status={mySeat.status === 'folded' ? 'folded' : 'active'}
                  isCurrentPlayer={isMyTurn}
                  size="xl"
                />
                {hand?.dealer_seat === mySeatNumber && <DealerButton className="scale-75" />}
                {isMyTurn && <TurnTimer active={true} size={40} strokeWidth={2.5} />}
              </div>
              <p className="text-sm font-black text-primary mt-0.5 tabular-nums"
                style={{ textShadow: '0 0 8px hsl(43 74% 49% / 0.4)' }}
              >
                {mySeat.stack.toLocaleString()}
              </p>
              {mySeat.last_action && (
                <span className={cn(
                  'text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in',
                  mySeat.last_action.startsWith('Fold') ? 'bg-muted/80 text-muted-foreground' :
                  mySeat.last_action.includes('Raise') || mySeat.last_action.includes('All')
                    ? 'bg-destructive/30 text-destructive' : 'bg-secondary/80 text-secondary-foreground',
                )} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                  {mySeat.last_action}
                </span>
              )}
            </div>
          </div>

          {/* Betting controls */}
          {isMyTurn && (
            <BettingControls
              canCheck={canCheck}
              amountToCall={amountToCall}
              minRaise={hand?.min_raise ?? table.big_blind}
              maxBet={hand?.current_bet ?? 0}
              playerChips={mySeat.stack}
              bigBlind={table.big_blind}
              pot={totalPot}
              onAction={handleAction}
            />
          )}

          {/* Leave table button when no hand active */}
          {!hand && (
            <button
              onClick={handleLeave}
              className="flex items-center justify-center gap-1.5 w-full mt-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(180deg, hsl(0 0% 15%), hsl(0 0% 10%))',
                color: 'hsl(0 0% 60%)',
                border: '1px solid hsl(0 0% 20%)',
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> Leave Table
            </button>
          )}
        </div>
      ) : isSpectator ? (
        <div className="px-4 py-3 z-20 safe-area-bottom shrink-0 relative"
          style={{ background: 'linear-gradient(180deg, transparent, hsl(0 0% 0% / 0.7))' }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-foreground/40" />
            <span className="text-xs text-foreground/50 font-bold">Spectating</span>
          </div>
          {!hand ? (
            <>
              <p className="text-[10px] text-center text-foreground/40 mb-2 font-medium">
                Tap an empty seat to join
              </p>
              <div className="flex items-center gap-2 max-w-xs mx-auto">
                <Input
                  type="number"
                  placeholder={`Buy-in (${table.min_buy_in}-${table.max_buy_in})`}
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                  className="text-center text-sm bg-black/30 border-border/30"
                />
              </div>
            </>
          ) : (
            <p className="text-[10px] text-center text-foreground/30 font-medium">
              Wait for the current hand to finish before joining
            </p>
          )}
          <button
            onClick={onLeave}
            className="flex items-center justify-center gap-1.5 w-full mt-2 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 max-w-xs mx-auto"
            style={{
              background: 'linear-gradient(180deg, hsl(0 0% 15%), hsl(0 0% 10%))',
              color: 'hsl(0 0% 60%)',
              border: '1px solid hsl(0 0% 20%)',
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Leave
          </button>
        </div>
      ) : null}

      {/* YOUR TURN indicator */}
      {isMyTurn && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
          <span className="text-[10px] px-3 py-1 rounded-full font-black animate-turn-pulse"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.3), hsl(43 74% 49% / 0.15))',
              color: 'hsl(43 74% 60%)',
              border: '1px solid hsl(43 74% 49% / 0.4)',
              textShadow: '0 0 8px hsl(43 74% 49% / 0.5)',
            }}
          >
            YOUR TURN
          </span>
        </div>
      )}

      {/* Kick confirmation dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={(open) => !open && setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kick {kickTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {kickTarget?.name} from the table. They can rejoin later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => kickTarget && handleKickPlayer(kickTarget.id)} className="bg-destructive text-destructive-foreground">
              Kick Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close table confirmation */}
      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Table?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all players and permanently close the table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseTable} className="bg-destructive text-destructive-foreground">
              Close Table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connection lost overlay */}
      <ConnectionOverlay isDisconnected={isDisconnected} onReconnect={handleReconnect} />

      {/* Invite players dialog */}
      <InvitePlayersDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tableId={tableId}
        tableName={table.name}
        clubId={table.club_id}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function EmptySeatDisplay({ seatNumber, canJoin, onJoin }: { seatNumber: number; canJoin: boolean; onJoin: () => void }) {
  return (
    <button
      onClick={canJoin ? onJoin : undefined}
      disabled={!canJoin}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg min-w-[52px] min-h-[52px] transition-all',
        canJoin ? 'hover:bg-white/5 cursor-pointer' : 'opacity-20',
      )}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
        style={{
          background: 'linear-gradient(135deg, hsl(160 20% 15%), hsl(160 25% 10%))',
          border: canJoin ? '1.5px dashed hsl(43 74% 49% / 0.4)' : '1px dashed hsl(0 0% 20%)',
          color: canJoin ? 'hsl(43 74% 49% / 0.7)' : 'hsl(0 0% 30%)',
        }}
      >
        {seatNumber + 1}
      </div>
      {canJoin && (
        <span className="text-[7px] text-primary/70 font-bold uppercase tracking-wider"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          Sit
        </span>
      )}
    </button>
  );
}

function OnlineSeatDisplay({
  seatData, seatNumber, isCurrentActor, isDealer, isFolded, hasCards, isShowdown,
}: {
  seatData: OnlineSeatInfo;
  seatNumber: number;
  isCurrentActor: boolean;
  isDealer: boolean;
  isFolded: boolean;
  hasCards: boolean;
  isShowdown: boolean;
}) {
  const isAllIn = seatData.status === 'all-in';

  return (
    <div className={cn(
      'flex flex-col items-center gap-0.5 transition-all duration-300',
      isFolded && 'opacity-40',
    )}>
      {/* Avatar + dealer + timer */}
      <div className="relative">
        <PlayerAvatar
          name={seatData.display_name}
          index={seatNumber}
          status={isFolded ? 'folded' : isAllIn ? 'all-in' : 'active'}
          isCurrentPlayer={isCurrentActor}
          size="xl"
        />
        {isDealer && <DealerButton className="absolute -top-0.5 -right-0.5 scale-75" />}
        {isCurrentActor && <TurnTimer active={true} size={40} strokeWidth={2.5} />}
      </div>

      {/* Face-down cards */}
      {hasCards && !isFolded && (
        <div className="flex gap-0.5 mt-0.5">
          <CardDisplay faceDown size="sm" dealDelay={0} />
          <CardDisplay faceDown size="sm" dealDelay={0.1} />
        </div>
      )}
      {(!hasCards || isFolded) && <div className="h-[40px]" />}

      {/* Name */}
      <p className="text-[9px] font-bold text-foreground/90 truncate max-w-[56px] leading-tight"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        {seatData.display_name}
      </p>

      {/* Stack */}
      <p className="text-[9px] text-primary/80 font-semibold leading-none tabular-nums"
        style={{ textShadow: '0 0 6px hsl(43 74% 49% / 0.3)' }}
      >
        {seatData.stack.toLocaleString()}
      </p>

      {/* Action badge */}
      {seatData.last_action && (
        <span className={cn(
          'text-[8px] px-1.5 py-0.5 rounded-full font-bold animate-fade-in leading-tight',
          seatData.last_action.startsWith('Fold') && 'bg-muted/80 text-muted-foreground',
          (seatData.last_action.includes('Raise') || seatData.last_action.includes('All')) && 'bg-destructive/30 text-destructive border border-destructive/30',
          (seatData.last_action.startsWith('Call') || seatData.last_action.startsWith('Check')) && 'bg-secondary/80 text-secondary-foreground',
        )} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {seatData.last_action}
        </span>
      )}

      {/* Current bet */}
      {(seatData.current_bet ?? 0) > 0 && !isShowdown && (
        <div className="flex items-center gap-0.5 mt-0.5 animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(43 74% 49%), hsl(43 60% 35%))',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          />
          <span className="text-[8px] font-bold text-primary" style={{ textShadow: '0 0 4px hsl(43 74% 49% / 0.4)' }}>
            {(seatData.current_bet ?? 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
