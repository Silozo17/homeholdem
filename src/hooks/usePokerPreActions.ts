import { useState, useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { PreActionType } from '@/components/poker/PreActionButtons';
import { OnlineTableState } from '@/lib/poker/online-types';

interface UsePokerPreActionsParams {
  isMyTurn: boolean;
  amountToCall: number;
  canCheck: boolean;
  tableState: OnlineTableState | null;
  handleActionRef: MutableRefObject<(action: { type: string; amount?: number }) => Promise<void>>;
  haptic: (type: string) => void;
  play: (sound: string) => void;
  setCriticalTimeActive: (v: boolean) => void;
}

interface UsePokerPreActionsReturn {
  preAction: PreActionType;
  setPreAction: (v: PreActionType) => void;
}

export function usePokerPreActions({
  isMyTurn, amountToCall, canCheck, tableState,
  handleActionRef, haptic, play, setCriticalTimeActive,
}: UsePokerPreActionsParams): UsePokerPreActionsReturn {
  const [preAction, setPreAction] = useState<PreActionType>(null);
  const prevIsMyTurnRef = useRef(false);
  const prevBetRef = useRef<number>(0);

  // Your turn: sound + haptic + pre-action execution
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current) {
      if (preAction) {
        const executePreAction = async () => {
          let actionToFire: { type: string; amount?: number } | null = null;
          if (preAction === 'check_fold') {
            actionToFire = amountToCall === 0 ? { type: 'check' } : { type: 'fold' };
          } else if (preAction === 'call_any') {
            actionToFire = amountToCall === 0 ? { type: 'check' } : { type: 'call' };
          } else if (preAction === 'check') {
            if (amountToCall === 0) actionToFire = { type: 'check' };
          }
          setPreAction(null);
          if (actionToFire) {
            haptic(actionToFire.type as any);
            await handleActionRef.current(actionToFire);
            return;
          }
        };
        executePreAction();
      } else {
        play('yourTurn');
        haptic('cardReveal');
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      }
    }
    prevIsMyTurnRef.current = isMyTurn;
    if (!isMyTurn) {
      setCriticalTimeActive(false);
    }
  }, [isMyTurn, play, haptic, preAction, amountToCall]);

  // Clear pre-action on new hand
  useEffect(() => {
    const currentHandId = tableState?.current_hand?.hand_id ?? null;
    if (currentHandId) {
      setPreAction(null);
    }
  }, [tableState?.current_hand?.hand_id]);

  // Invalidate pre-action "check" if a bet comes in
  useEffect(() => {
    const currentBet = tableState?.current_hand?.current_bet ?? 0;
    if (preAction === 'check' && currentBet > prevBetRef.current && currentBet > 0) {
      setPreAction(null);
    }
    prevBetRef.current = currentBet;
  }, [tableState?.current_hand?.current_bet, preAction]);

  return { preAction, setPreAction };
}
