import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { TournamentLobby } from '@/components/poker/TournamentLobby';

export default function PokerTournament() {
  const { user, loading } = useAuth();
  const { clubId } = useParams<{ clubId?: string }>();
  const navigate = useNavigate();
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

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
