import { Mic, MicOff, Headphones, HeadphoneOff, PhoneCall, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceChatControlsProps {
  connected: boolean;
  connecting: boolean;
  micMuted: boolean;
  deafened: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMic: () => void;
  onToggleDeafen: () => void;
}

export function VoiceChatControls({
  connected, connecting, micMuted, deafened,
  onConnect, onDisconnect, onToggleMic, onToggleDeafen,
}: VoiceChatControlsProps) {
  if (!connected) {
    return (
      <button
        onClick={onConnect}
        disabled={connecting}
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center transition-colors active:scale-90',
          connecting ? 'bg-primary/30 animate-pulse' : 'bg-emerald-600/40 hover:bg-emerald-600/60'
        )}
        title="Join Voice Chat"
      >
        <PhoneCall className="h-3.5 w-3.5 text-emerald-300" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {/* Mic toggle */}
      <button
        onClick={onToggleMic}
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center transition-colors active:scale-90',
          micMuted
            ? 'bg-destructive/30 hover:bg-destructive/50'
            : 'bg-emerald-600/40 hover:bg-emerald-600/60'
        )}
        title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
      >
        {micMuted
          ? <MicOff className="h-3.5 w-3.5 text-destructive/80" />
          : <Mic className="h-3.5 w-3.5 text-emerald-300" />
        }
      </button>

      {/* Deafen toggle */}
      <button
        onClick={onToggleDeafen}
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center transition-colors active:scale-90',
          deafened
            ? 'bg-destructive/30 hover:bg-destructive/50'
            : 'bg-white/10 hover:bg-white/20'
        )}
        title={deafened ? 'Undeafen' : 'Deafen'}
      >
        {deafened
          ? <HeadphoneOff className="h-3.5 w-3.5 text-destructive/80" />
          : <Headphones className="h-3.5 w-3.5 text-foreground/80" />
        }
      </button>

      {/* Disconnect */}
      <button
        onClick={onDisconnect}
        className="w-7 h-7 rounded-full flex items-center justify-center bg-destructive/30 hover:bg-destructive/50 transition-colors active:scale-90"
        title="Leave Voice Chat"
      >
        <PhoneOff className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}
