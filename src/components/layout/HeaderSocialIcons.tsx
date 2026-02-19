import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MessageSquare, Users, Bell, Settings, BookOpen, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

interface HeaderSocialIconsProps {
  extraItems?: { icon: React.ReactNode; label: string; onClick: () => void }[];
}

export function HeaderSocialIcons({ extraItems }: HeaderSocialIconsProps) {
  const navigate = useNavigate();
  const { unreadCount: msgUnread } = useDirectMessages();
  const { unreadCount: notifUnread } = useNotifications();
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            {(msgUnread > 0 || notifUnread > 0) && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-popover border-border z-50">
          <DropdownMenuItem onClick={() => navigate('/inbox')} className="gap-3 cursor-pointer">
            <MessageSquare className="h-4 w-4" />
            <span className="flex-1">Messages</span>
            {msgUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {msgUnread > 99 ? '99+' : msgUnread}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/friends')} className="gap-3 cursor-pointer">
            <Users className="h-4 w-4" />
            <span className="flex-1">Friends</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setNotifPanelOpen(true)} className="gap-3 cursor-pointer">
            <Bell className="h-4 w-4" />
            <span className="flex-1">Notifications</span>
            {notifUnread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {notifUnread > 99 ? '99+' : notifUnread}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/rules')} className="gap-3 cursor-pointer">
            <BookOpen className="h-4 w-4" />
            <span className="flex-1">Rules</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/install')} className="gap-3 cursor-pointer">
            <Download className="h-4 w-4" />
            <span className="flex-1">Install App</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-3 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span className="flex-1">Settings</span>
          </DropdownMenuItem>
          {extraItems?.map((item, i) => (
            <DropdownMenuItem key={i} onClick={item.onClick} className="gap-3 cursor-pointer">
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationPanel open={notifPanelOpen} onOpenChange={setNotifPanelOpen} />
    </>
  );
}
