import { useState } from 'react';
import { useOnlinePokerTable } from '@/hooks/useOnlinePokerTable';
import { useAuth } from '@/contexts/AuthContext';
import { CardDisplay } from './CardDisplay';
import { PotDisplay } from './PotDisplay';
import { BettingControls } from './BettingControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, LogOut, Users, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { OnlineSeatInfo } from '@/lib/poker/online-types';

interface OnlinePokerTableProps {
  tableId: string;
  onLeave: () => void;
}

export function OnlinePokerTable({ tableId, onLeave }: OnlinePokerTableProps) {
  const { user } = useAuth();
  const {
    tableState,
    myCards,
    loading,
    error,
    mySeatNumber,
    isMyTurn,
    amountToCall,
    canCheck,
    joinTable,
    leaveTable,
    startHand,
    sendAction,
  } = useOnlinePokerTable(tableId);

  const [buyInAmount, setBuyInAmount] = useState('');
  const [joining, setJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Loading table...</div>
      </div>
    );
  }

  if (error || !tableState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive">{error || 'Table not found'}</p>
        <Button variant="outline" onClick={onLeave}>Go Back</Button>
      </div>
    );
  }

  const { table, seats, current_hand: hand } = tableState;
  const isSeated = mySeatNumber !== null;
  const isCreator = user?.id === table.created_by;
  const activeSeats = seats.filter(s => s.player_id);
  const canStartHand = (isCreator || isSeated) && !hand && activeSeats.length >= 2;
  const totalPot = hand?.pots?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const mySeat = seats.find(s => s.player_id === user?.id);

  const handleJoinSeat = async (seatNum: number) => {
    const amount = parseInt(buyInAmount) || table.max_buy_in;
    if (amount < table.min_buy_in || amount > table.max_buy_in) {
      toast({ title: 'Invalid buy-in', description: `Must be between ${table.min_buy_in} and ${table.max_buy_in}`, variant: 'destructive' });
      return;
    }
    setJoining(true);
    try {
      await joinTable(seatNum, amount);
      toast({ title: 'Seated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveTable();
      onLeave();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyInviteCode = () => {
    if (table.invite_code) {
      navigator.clipboard.writeText(table.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Build seat layout - all seats around the table
  const allSeats: (OnlineSeatInfo | null)[] = Array.from({ length: table.max_seats }, (_, i) => {
    return seats.find(s => s.seat === i) || null;
  });

  // Split: my seat at bottom, others on top
  const otherSeats = allSeats.map((seat, i) => ({ seat, index: i }))
    .filter(({ index }) => index !== mySeatNumber);

  return (
    <div className="flex flex-col h-full min-h-[80vh] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <Button variant="ghost" size="icon" onClick={isSeated ? handleLeave : onLeave}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{table.name}</p>
          <p className="text-xs text-muted-foreground">
            {hand ? `Hand #${hand.hand_number} • ${hand.phase}` : 'Waiting'}
            {' • '}{table.small_blind}/{table.big_blind}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {table.invite_code && (
            <Button variant="ghost" size="icon" onClick={copyInviteCode} className="h-8 w-8">
              {codeCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{activeSeats.length}/{table.max_seats}</span>
          </div>
        </div>
      </div>

      {/* Other players - top area */}
      <div className="flex flex-wrap justify-center gap-1 px-2 py-1">
        {otherSeats.map(({ seat: seatData, index }) => (
          <OnlineSeatDisplay
            key={index}
            seatNumber={index}
            seatData={seatData}
            hand={hand}
            isCurrentActor={hand?.current_actor_seat === index}
            onJoin={!isSeated && !seatData?.player_id ? () => handleJoinSeat(index) : undefined}
          />
        ))}
      </div>

      {/* Table felt - center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 mx-4 rounded-2xl bg-secondary/30 border border-border/50 p-4 min-h-[180px]">
        {totalPot > 0 && <PotDisplay pot={totalPot} />}

        {/* Community cards */}
        <div className="flex gap-1.5 min-h-[64px] items-center">
          {(hand?.community_cards || []).map((card, i) => (
            <CardDisplay key={i} card={card} size="md" />
          ))}
          {Array.from({ length: 5 - (hand?.community_cards?.length || 0) }).map((_, i) => (
            <div key={`empty-${i}`} className="w-11 h-16 rounded-md border border-border/30 bg-secondary/20" />
          ))}
        </div>

        {/* Phase indicator */}
        {hand && (
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {hand.phase === 'preflop' ? 'Pre-Flop' : hand.phase}
          </span>
        )}

        {/* Start hand / waiting messaging */}
        {!hand && isSeated && (
          <div className="text-center space-y-2">
            {canStartHand ? (
              <Button onClick={startHand} size="sm" className="gap-2">
                <Play className="h-4 w-4" /> Deal Hand
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for more players...</p>
            )}
          </div>
        )}
      </div>

      {/* My seat - bottom */}
      {isSeated && mySeat ? (
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <div className="flex gap-1">
              {myCards && myCards.length > 0 ? (
                myCards.map((card, i) => <CardDisplay key={i} card={card} size="lg" />)
              ) : hand ? (
                <>
                  <CardDisplay faceDown size="lg" />
                  <CardDisplay faceDown size="lg" />
                </>
              ) : null}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-primary">You</p>
              <p className="text-lg font-bold text-foreground">{mySeat.stack.toLocaleString()}</p>
              {mySeat.last_action && (
                <p className="text-xs text-muted-foreground">{mySeat.last_action}</p>
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
              onAction={(action) => {
                const actionType = action.type === 'all-in' ? 'all_in' : action.type;
                sendAction(actionType, action.amount);
              }}
            />
          )}
        </div>
      ) : !isSeated ? (
        /* Join controls */
        <div className="px-4 py-4 space-y-3 border-t border-border">
          <p className="text-sm text-center text-muted-foreground">Tap an empty seat to join</p>
          <div className="flex items-center gap-2 max-w-xs mx-auto">
            <Input
              type="number"
              placeholder={`Buy-in (${table.min_buy_in}-${table.max_buy_in})`}
              value={buyInAmount}
              onChange={(e) => setBuyInAmount(e.target.value)}
              className="text-center"
            />
          </div>
        </div>
      ) : null}

      {/* Leave button */}
      {isSeated && !hand && (
        <div className="px-4 pb-4">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLeave}>
            <LogOut className="h-4 w-4" /> Leave Table
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual seat display component
function OnlineSeatDisplay({
  seatNumber,
  seatData,
  hand,
  isCurrentActor,
  onJoin,
}: {
  seatNumber: number;
  seatData: OnlineSeatInfo | null;
  hand: any;
  isCurrentActor: boolean;
  onJoin?: () => void;
}) {
  const isEmpty = !seatData?.player_id;
  const isFolded = seatData?.status === 'folded';
  const isAllIn = seatData?.status === 'all-in';

  if (isEmpty) {
    return (
      <button
        onClick={onJoin}
        disabled={!onJoin}
        className={cn(
          'flex flex-col items-center justify-center gap-1 p-2 rounded-lg min-w-[72px] min-h-[80px] transition-all',
          'border border-dashed border-border/40',
          onJoin ? 'hover:bg-secondary/30 hover:border-primary/40 cursor-pointer' : 'opacity-30',
        )}
      >
        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs text-muted-foreground">
          {seatNumber + 1}
        </div>
        {onJoin && <span className="text-[10px] text-muted-foreground">Sit</span>}
      </button>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center gap-1 p-2 rounded-lg min-w-[72px] transition-all',
      isCurrentActor && !isFolded && 'ring-2 ring-primary bg-primary/10',
      isFolded && 'opacity-40',
      isAllIn && 'ring-2 ring-destructive',
    )}>
      {/* Cards face-down indicator */}
      <div className="flex gap-0.5">
        {hand && seatData?.has_cards && !isFolded ? (
          <>
            <CardDisplay faceDown size="sm" />
            <CardDisplay faceDown size="sm" />
          </>
        ) : (
          <div className="h-12 w-8" />
        )}
      </div>

      {/* Name & stack */}
      <div className="text-center">
        <p className="text-xs font-semibold truncate max-w-[72px] text-foreground">
          {seatData.display_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {seatData.stack.toLocaleString()}
        </p>
      </div>

      {/* Last action */}
      {seatData.last_action && (
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full',
          seatData.last_action.startsWith('Fold') ? 'bg-muted text-muted-foreground' :
          seatData.last_action.includes('Raise') || seatData.last_action.includes('All')
            ? 'bg-destructive/20 text-destructive'
            : 'bg-secondary text-secondary-foreground',
        )}>
          {seatData.last_action}
        </span>
      )}
    </div>
  );
}
