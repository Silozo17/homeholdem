import { useState, useCallback, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const REACTION_KEYS = [
  { emoji: '👍', key: 'thumbs_up' },
  { emoji: '👏', key: 'clap' },
  { emoji: '😂', key: 'laugh' },
  { emoji: '😢', key: 'cry' },
  { emoji: '🔥', key: 'fire' },
  { emoji: '🤯', key: 'mind_blown' },
  { emoji: '😎', key: 'gg' },
  { emoji: '🙌', key: 'nice_hand' },
  { emoji: '💀', key: 'dead' },
  { emoji: '🤑', key: 'money' },
  { emoji: '🫣', key: 'peeking' },
  { emoji: '🤡', key: 'clown' },
];

// Poker slang stays in English intentionally — universal poker language
const MESSAGES = [
  'Nice hand!', 'Good luck!', 'Bluff!', 'Oops!', 'GG', "Let's go!",
  'Ship it!', "You're bluffing!", 'I knew it!', 'Slow roll much?',
  'Donkey!', 'Fish on!', 'Run it twice?', "That's poker baby",
  'All day!', 'Come at me', 'Easy game', 'Pay me',
  'Wow', 'Brutal',
];

const REACTION_EMOJIS = REACTION_KEYS.map(r => r.emoji);
const ALL_ITEMS = [...REACTION_EMOJIS, ...MESSAGES];

const FREQ_KEY = 'poker-chat-freq';

function getFrequencies(): Record<string, number> {
  try {
    const raw = localStorage.getItem(FREQ_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function incrementFreq(item: string) {
  const freq = getFrequencies();
  freq[item] = (freq[item] || 0) + 1;
  localStorage.setItem(FREQ_KEY, JSON.stringify(freq));
}

function getTop5(): string[] {
  const freq = getFrequencies();
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item]) => item);
}

interface QuickChatProps {
  onSend: (text: string) => void;
}

export function QuickChat({ onSend }: QuickChatProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [topItems, setTopItems] = useState<string[]>([]);

  useEffect(() => {
    if (open) setTopItems(getTop5());
  }, [open]);

  const handleSend = useCallback((text: string) => {
    incrementFreq(text);
    onSend(text);
    setOpen(false);
  }, [onSend]);

  const isEmoji = (text: string) => REACTION_EMOJIS.includes(text);

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
        className="w-64 p-0 z-[70]"
        style={{ background: 'hsl(160 25% 10% / 0.95)', backdropFilter: 'blur(12px)', border: '1px solid hsl(0 0% 100% / 0.1)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Top 5 most used — pinned outside scroll */}
        {topItems.length > 0 && (
          <div className="px-2 pt-2 pb-1 border-b border-white/5">
            <p className="text-[8px] text-foreground/30 font-bold uppercase tracking-wider px-1 mb-0.5">{t('poker_quick_chat.most_used')}</p>
            <div className="flex gap-1 flex-wrap">
              {topItems.map(item => (
                <button
                  key={`top-${item}`}
                  onClick={() => handleSend(item)}
                  className={cn(
                    'rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all',
                    isEmoji(item) ? 'w-9 h-9 text-lg' : 'text-[10px] font-bold text-foreground/80 py-1 px-2',
                  )}
                  style={{ border: '1px solid hsl(43 74% 49% / 0.2)' }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="max-h-[280px] overflow-y-auto p-2 scrollbar-hide">
          {/* Reaction grid */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {REACTION_KEYS.map(({ emoji, key }) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-0 hover:bg-white/10 active:scale-90 transition-all"
                title={t(`poker_quick_chat.${key}`)}
              >
                <span className="text-lg leading-none">{emoji}</span>
                <span className="text-[7px] text-foreground/30 font-medium leading-tight mt-0.5">{t(`poker_quick_chat.${key}`)}</span>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
