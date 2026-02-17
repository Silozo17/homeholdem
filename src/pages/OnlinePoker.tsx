import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { OnlinePokerLobby } from '@/components/poker/OnlinePokerLobby';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';

export default function OnlinePoker() {
  const { user, loading } = useAuth();
  const { clubId } = useParams<{ clubId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const { isActive, loading: subLoading } = useSubscription();
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Auto-join table from invite deep link (?table=xxx)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam && !activeTableId) {
      setActiveTableId(tableParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, activeTableId, setSearchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  // Gate behind subscription
  if (!subLoading && !isActive) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Subscription required</div>
        </div>
        <PaywallDrawer open={!paywallOpen ? true : paywallOpen} onOpenChange={(open) => {
          setPaywallOpen(open);
          if (!open) navigate(-1);
        }} />
      </>
    );
  }

  if (activeTableId) {
    return (
      <OnlinePokerTable
        tableId={activeTableId}
        onLeave={() => setActiveTableId(null)}
      />
    );
  }

  return (
    <OnlinePokerLobby
      onJoinTable={(tableId) => setActiveTableId(tableId)}
      clubId={clubId}
    />
  );
}
