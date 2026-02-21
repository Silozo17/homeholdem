import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionOverlayProps {
  status: ConnectionStatus;
  onReconnect: () => void;
  handInProgress?: boolean;
  lastPhase?: string | null;
  myStack?: number | null;
}

const BACKOFF_DELAYS = [2000, 4000, 8000, 16000, 30000, 30000];
const MAX_ATTEMPTS = BACKOFF_DELAYS.length;

export function ConnectionOverlay({ status, onReconnect, handInProgress, lastPhase, myStack }: ConnectionOverlayProps) {
  const { t } = useTranslation();
  const [reconnecting, setReconnecting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatusRef = useRef<ConnectionStatus>(status);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show "Reconnected!" flash when recovering
  useEffect(() => {
    const wasDisconnected = prevStatusRef.current === 'reconnecting' || prevStatusRef.current === 'disconnected';
    if (wasDisconnected && status === 'connected') {
      setShowSuccess(true);
      setReconnecting(false);
      setAttempts(0);
      const timer = setTimeout(() => setShowSuccess(false), 1500);
      prevStatusRef.current = status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  // Reset state when connected
  useEffect(() => {
    if (status === 'connected') {
      setReconnecting(false);
      setAttempts(0);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
  }, [status]);

  // Auto-reconnect with exponential backoff
  useEffect(() => {
    if (status === 'connected' || reconnecting || attempts >= MAX_ATTEMPTS) return;
    if (status !== 'disconnected' && status !== 'reconnecting') return;

    const delay = BACKOFF_DELAYS[attempts] ?? 30000;
    timerRef.current = setTimeout(() => {
      setReconnecting(true);
      setAttempts(prev => prev + 1);
      onReconnect();
      setTimeout(() => setReconnecting(false), 2000);
    }, delay);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [status, reconnecting, attempts, onReconnect]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Success flash
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, hsl(142 50% 15% / 0.95), hsl(142 40% 10% / 0.98))',
            border: '1px solid hsl(142 60% 45% / 0.5)',
            boxShadow: '0 0 20px hsl(142 60% 45% / 0.3)',
          }}
        >
          <Wifi className="h-5 w-5 text-green-400" />
          <span className="text-sm font-bold text-green-300">{t('poker_online.reconnected')}</span>
        </div>
      </div>
    );
  }

  if (status === 'connected') return null;

  const progressPct = (attempts / MAX_ATTEMPTS) * 100;
  const isExhausted = attempts >= MAX_ATTEMPTS;

  const handleManualReconnect = () => {
    setReconnecting(true);
    setAttempts(prev => Math.min(prev + 1, MAX_ATTEMPTS));
    onReconnect();
    setTimeout(() => setReconnecting(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-3 p-5 rounded-2xl max-w-xs w-[280px] text-center"
        style={{
          background: 'linear-gradient(180deg, hsl(160 25% 12% / 0.95), hsl(160 30% 8% / 0.98))',
          border: '1px solid hsl(0 60% 45% / 0.4)',
          boxShadow: '0 8px 32px hsl(0 0% 0% / 0.5)',
        }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-destructive/20">
          <WifiOff className="h-6 w-6 text-destructive" />
        </div>

        <h3 className="text-base font-bold text-foreground">
          {t('poker_online.connection_lost')}
        </h3>

        {/* Hand context info */}
        {handInProgress && (
          <div
            className="w-full rounded-lg px-3 py-2 text-left space-y-1"
            style={{
              background: 'hsl(43 30% 12% / 0.6)',
              border: '1px solid hsl(43 74% 49% / 0.2)',
            }}
          >
            {lastPhase && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-foreground/50">{t('poker_online.hand_label')}</span>
                <span className="text-primary font-bold capitalize">{lastPhase === 'preflop' ? t('poker_online.pre_flop') : lastPhase}</span>
              </div>
            )}
            {myStack != null && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-foreground/50">{t('poker_online.your_stack')}</span>
                <span className="text-foreground font-bold">{myStack.toLocaleString()}</span>
              </div>
            )}
            <p className="text-[10px] text-foreground/40 italic">
              {t('poker_online.reconnect_restore')}
            </p>
          </div>
        )}

        {/* Progress */}
        <div className="w-full space-y-1">
          <Progress
            value={progressPct}
            className="h-1.5 bg-secondary/40"
          />
          <p className="text-[10px] text-muted-foreground">
            {reconnecting
              ? t('poker_online.reconnecting')
              : isExhausted
                ? t('poker_online.auto_reconnect_exhausted')
                : t('poker_online.reconnect_attempt', { current: attempts, max: MAX_ATTEMPTS })
            }
          </p>
        </div>

        <Button
          onClick={handleManualReconnect}
          disabled={reconnecting}
          className="w-full gap-2"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 ${reconnecting ? 'animate-spin' : ''}`} />
          {t('poker_online.reconnect')}
        </Button>
      </div>
    </div>
  );
}
