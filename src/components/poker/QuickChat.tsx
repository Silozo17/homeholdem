import { useState, useCallback, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { emoji: '👍', label: 'Thumbs Up' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😢', label: 'Cry' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🤯', label: 'Mind Blown' },
  { emoji: '😎', label: 'GG' },
  { emoji: '🙌', label: 'Nice Hand' },
];

const MESSAGES = ['Nice hand!', 'Good luck!', 'Bluff!', 'Oops!', 'GG', "Let's go!"];
const RECENT_KEY = 'poker-recent-emotes';

function getRecentEmotes(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addRecentEmote(emoji: string) {
  const recent = getRecentEmotes().filter(e => e !== emoji);
  recent.unshift(emoji);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 3)));
}

interface QuickChatProps {
  onSend: (text: string) => void;
}

export function QuickChat({ onSend }: QuickChatProps) {
  const [open, setOpen] = useState(false);
  const [recentEmotes, setRecentEmotes] = useState<string[]>([]);

  useEffect(() => {
    if (open) setRecentEmotes(getRecentEmotes());
  }, [open]);

  const handleSend = useCallback((text: string) => {
    // Track recently used emojis
    if (REACTIONS.some(r => r.emoji === text)) {
      addRecentEmote(text);
    }
    onSend(text);
    setOpen(false);
  }, [onSend]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors active:scale-90"
        >
          <MessageCircle className="h-3.5 w-3.5 text-foreground/80" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-64 p-2 z-[70]"
        style={{ background: 'hsl(160 25% 10% / 0.95)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.1)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Recently used */}
        {recentEmotes.length > 0 && (
          <>
            <p className="text-[8px] text-foreground/30 font-bold uppercase tracking-wider px-1 mb-0.5">Recent</p>
            <div className="flex gap-1 mb-1.5">
              {recentEmotes.map(emoji => (
                <button
                  key={`recent-${emoji}`}
                  onClick={() => handleSend(emoji)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-white/10 active:scale-90 transition-all"
                  style={{ border: '1px solid hsl(43 74% 49% / 0.2)' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Reaction grid */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {REACTIONS.map(({ emoji, label }) => (
            <button
              key={emoji}
              onClick={() => handleSend(emoji)}
              className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0 hover:bg-white/10 active:scale-90 transition-all"
              title={label}
            >
              <span className="text-lg leading-none">{emoji}</span>
              <span className="text-[7px] text-foreground/30 font-medium leading-tight mt-0.5">{label}</span>
            </button>
          ))}
        </div>

        {/* Quick messages */}
        <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1">
          {MESSAGES.map(msg => (
            <button
              key={msg}
              onClick={() => handleSend(msg)}
              className={cn(
                'text-[10px] font-bold text-foreground/80 py-1 px-2 rounded-md text-left',
                'hover:bg-white/10 active:scale-[0.98] transition-all',
              )}
            >
              {msg}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
