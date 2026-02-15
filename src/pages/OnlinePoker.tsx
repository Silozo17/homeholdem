import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { OnlinePokerLobby } from '@/components/poker/OnlinePokerLobby';

export default function OnlinePoker() {
  const { user, loading } = useAuth();
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
    <OnlinePokerLobby
      onJoinTable={(tableId) => setActiveTableId(tableId)}
    />
  );
}
