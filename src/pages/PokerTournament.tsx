import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { TournamentLobby } from '@/components/poker/TournamentLobby';
import { useSubscription } from '@/hooks/useSubscription';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';

export default function PokerTournament() {
  const { user, loading } = useAuth();
  const { clubId } = useParams<{ clubId?: string }>();
  const navigate = useNavigate();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const { isActive, loading: subLoading } = useSubscription();
  const [paywallOpen, setPaywallOpen] = useState(false);

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
    <TournamentLobby
      onJoinTable={(tableId) => setActiveTableId(tableId)}
      clubId={clubId}
    />
  );
}
