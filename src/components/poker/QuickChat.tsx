import { useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const EMOJIS = ['👍', '😂', '😢', '😡', '🔥', '❤️', '😎', '🤔'];
const MESSAGES = ['Nice hand!', 'Good luck!', 'Bluff!', 'Oops!', 'GG', "Let's go!"];

interface QuickChatProps {
  onSend: (text: string) => void;
}

export function QuickChat({ onSend }: QuickChatProps) {
  const [open, setOpen] = useState(false);

  const handleSend = useCallback((text: string) => {
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
        className="w-56 p-2 z-[70]"
        style={{ background: 'hsl(160 25% 10% / 0.95)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.1)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Emojis */}
        <div className="flex flex-wrap gap-1 mb-2">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleSend(emoji)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-white/10 active:scale-90 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
        {/* Messages */}
        <div className="flex flex-col gap-0.5">
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
