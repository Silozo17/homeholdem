import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { 
  Users, Calendar, CheckCircle, Home, MessageCircle, CalendarPlus, UserPlus, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  rsvp: <Users className="h-4 w-4" />,
  date_finalized: <Calendar className="h-4 w-4" />,
  waitlist_promotion: <CheckCircle className="h-4 w-4" />,
  host_confirmed: <Home className="h-4 w-4" />,
  chat_message: <MessageCircle className="h-4 w-4" />,
  event_created: <CalendarPlus className="h-4 w-4" />,
  club_invite: <UserPlus className="h-4 w-4" />,
};

export function NotificationItem({ notification, onRead, onClose }: NotificationItemProps) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language === 'pl' ? pl : enUS;
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
      onRead(notification.id);
    }
    if (notification.url) {
      navigate(notification.url);
      onClose();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: dateLocale,
  });

  const icon = typeIcons[notification.type] || <Bell className="h-4 w-4" />;

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
        isUnread 
          ? "bg-primary/5 hover:bg-primary/10" 
          : "hover:bg-muted/50"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUnread ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm truncate",
            isUnread ? "font-semibold" : "font-medium"
          )}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo}
        </p>
      </div>
    </button>
  );
}
