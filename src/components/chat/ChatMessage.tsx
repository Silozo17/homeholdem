import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';

interface ChatMessageProps {
  message: string;
  senderName: string;
  avatarUrl?: string | null;
  timestamp: string;
  isOwnMessage: boolean;
}

export function ChatMessage({ message, senderName, avatarUrl, timestamp, isOwnMessage }: ChatMessageProps) {
  return (
    <div className={cn("flex gap-2 mb-3", isOwnMessage && "flex-row-reverse")}>
      <UserAvatar 
        name={senderName} 
        avatarUrl={avatarUrl}
        size="sm"
        className="flex-shrink-0"
      />
      <div className={cn("max-w-[75%]", isOwnMessage && "text-right")}>
        <div className={cn("flex items-baseline gap-2 mb-1", isOwnMessage && "flex-row-reverse")}>
          <span className="text-xs font-medium text-foreground">{senderName}</span>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(timestamp), 'HH:mm')}
          </span>
        </div>
        <div className={cn(
          "rounded-2xl px-3 py-2 text-sm",
          isOwnMessage 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-secondary text-secondary-foreground rounded-tl-sm"
        )}>
          {message}
        </div>
      </div>
    </div>
  );
}
