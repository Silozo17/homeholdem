import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionOverlayProps {
  isDisconnected: boolean;
  onReconnect: () => void;
}

export function ConnectionOverlay({ isDisconnected, onReconnect }: ConnectionOverlayProps) {
  const { t } = useTranslation();
  const [reconnecting, setReconnecting] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!isDisconnected) {
      setReconnecting(false);
      setAttempts(0);
    }
  }, [isDisconnected]);

  // Auto-reconnect every 5 seconds up to 6 attempts
  useEffect(() => {
    if (!isDisconnected || reconnecting || attempts >= 6) return;
    const timer = setTimeout(() => {
      setReconnecting(true);
      setAttempts(prev => prev + 1);
      onReconnect();
      setTimeout(() => setReconnecting(false), 2000);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isDisconnected, reconnecting, attempts, onReconnect]);

  if (!isDisconnected) return null;

  const handleManualReconnect = () => {
    setReconnecting(true);
    setAttempts(prev => prev + 1);
    onReconnect();
    setTimeout(() => setReconnecting(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-4 p-6 rounded-2xl max-w-xs text-center"
        style={{
          background: 'linear-gradient(180deg, hsl(160 25% 12% / 0.95), hsl(160 30% 8% / 0.98))',
          border: '1px solid hsl(0 60% 45% / 0.4)',
          boxShadow: '0 8px 32px hsl(0 0% 0% / 0.5)',
        }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-destructive/20">
          <WifiOff className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          {t('poker_online.connection_lost')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {reconnecting
            ? t('poker_online.reconnecting')
            : attempts >= 6
              ? t('poker_online.reconnect_failed')
              : t('poker_online.reconnecting')
          }
        </p>
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
