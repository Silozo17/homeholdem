import { useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerProfileDrawer } from '@/components/poker/PlayerProfileDrawer';

interface TappablePlayerProps {
  userId: string;
  children: ReactNode;
  disabled?: boolean;
}

export function TappablePlayer({ userId, children, disabled }: TappablePlayerProps) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isMe = user?.id === userId;
  const isInteractive = !isMe && !disabled && !!userId;

  return (
    <>
      <div
        onClick={isInteractive ? () => setSelectedId(userId) : undefined}
        className={isInteractive ? 'cursor-pointer' : ''}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter') setSelectedId(userId); } : undefined}
      >
        {children}
      </div>
      <PlayerProfileDrawer
        playerId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
