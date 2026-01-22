import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, HelpCircle } from 'lucide-react';

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
  capacity: number;
}

export function AttendeesList({ going, waitlist, maybe, capacity }: AttendeesListProps) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Attendees
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
              Going ({going.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {going.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {attendee.profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
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
              Waitlist ({waitlist.length})
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
              Maybe ({maybe.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {maybe.map((attendee) => (
                <div
                  key={attendee.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border/30 rounded-full"
                >
                  <span className="text-sm text-muted-foreground">{attendee.profile.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {going.length === 0 && waitlist.length === 0 && maybe.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No RSVPs yet. Be the first!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
