import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, HelpCircle, X } from 'lucide-react';
import { UserAvatar } from '@/components/common/UserAvatar';

interface Attendee {
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  is_waitlisted: boolean;
  waitlist_position: number | null;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface AttendeesListProps {
  going: Attendee[];
  waitlist: Attendee[];
  maybe: Attendee[];
  notGoing: Attendee[];
  capacity: number;
}

export function AttendeesList({ going, waitlist, maybe, notGoing, capacity }: AttendeesListProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('event.attendees')}
          </CardTitle>
          <Badge variant="outline">
            {going.length}/{capacity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Going */}
        {going.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {t('event.going')} ({going.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {going.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full"
                >
                  <UserAvatar 
                    name={attendee.profile.display_name} 
                    avatarUrl={attendee.profile.avatar_url}
                    size="xs"
                  />
                  <span className="text-sm font-medium">{attendee.profile.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waitlist */}
        {waitlist.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('event.waitlist')} ({waitlist.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {waitlist.map((attendee, index) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border border-border/50 rounded-full"
                >
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm">{attendee.profile.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Maybe */}
        {maybe.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              {t('event.maybe')} ({maybe.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {maybe.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border/30 rounded-full"
                >
                  <UserAvatar 
                    name={attendee.profile.display_name} 
                    avatarUrl={attendee.profile.avatar_url}
                    size="xs"
                  />
                  <span className="text-sm text-muted-foreground">{attendee.profile.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Can't Go */}
        {notGoing.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <X className="h-3 w-3" />
              {t('event.cant_go')} ({notGoing.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {notGoing.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/30 rounded-full"
                >
                  <UserAvatar 
                    name={attendee.profile.display_name} 
                    avatarUrl={attendee.profile.avatar_url}
                    size="xs"
                  />
                  <span className="text-sm text-muted-foreground">{attendee.profile.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {going.length === 0 && waitlist.length === 0 && maybe.length === 0 && notGoing.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            {t('event.no_rsvps')} {t('event.be_first')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
