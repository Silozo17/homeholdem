import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDirectMessages } from '@/hooks/useDirectMessages';

export function HeaderSocialIcons() {
  const navigate = useNavigate();
  const { unreadCount } = useDirectMessages();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/inbox')}
        className="relative text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/friends')}
        className="text-muted-foreground hover:text-foreground"
      >
        <Users className="h-5 w-5" />
      </Button>
    </>
  );
}
