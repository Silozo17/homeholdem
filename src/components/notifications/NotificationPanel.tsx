import { useTranslation } from 'react-i18next';
import { Bell, Check, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';
import { isToday, isYesterday } from 'date-fns';

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  // Group notifications by date
  const groupedNotifications = notifications.reduce((acc, notification) => {
    const date = new Date(notification.created_at);
    let group: string;
    
    if (isToday(date)) {
      group = 'today';
    } else if (isYesterday(date)) {
      group = 'yesterday';
    } else {
      group = 'earlier';
    }
    
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(notification);
    return acc;
  }, {} as Record<string, typeof notifications>);

  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 [&>button]:hidden">
        <SheetHeader className="p-4 pt-6 safe-area-top border-b border-border/50">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('notifications.title')}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-8"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t('notifications.mark_all_read')}
                </Button>
              )}
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  {t('common.loading')}
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  {t('notifications.no_notifications')}
                </p>
              </div>
            ) : (
              <>
                {groupedNotifications.today && groupedNotifications.today.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                      {t('notifications.today')}
                    </p>
                    <div className="space-y-1">
                      {groupedNotifications.today.map(notification => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={markAsRead}
                          onClose={handleClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedNotifications.yesterday && groupedNotifications.yesterday.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                      {t('notifications.yesterday')}
                    </p>
                    <div className="space-y-1">
                      {groupedNotifications.yesterday.map(notification => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={markAsRead}
                          onClose={handleClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedNotifications.earlier && groupedNotifications.earlier.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                      {t('notifications.earlier')}
                    </p>
                    <div className="space-y-1">
                      {groupedNotifications.earlier.map(notification => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onRead={markAsRead}
                          onClose={handleClose}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
