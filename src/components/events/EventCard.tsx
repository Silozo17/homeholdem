import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { pl, enUS } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ChevronRight, Clock, Lock } from 'lucide-react';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    final_date: string | null;
    is_finalized: boolean;
    max_tables: number;
    seats_per_table: number;
    going_count: number;
    maybe_count: number;
  };
  onClick: () => void;
  isLocked?: boolean;
}

export function EventCard({ event, onClick, isLocked = false }: EventCardProps) {
  const { t, i18n } = useTranslation();
  const totalCapacity = event.max_tables * event.seats_per_table;
  const isFull = event.going_count >= totalCapacity;
  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  return (
    <Card 
      className="bg-card/50 border-border/50 hover:border-primary/50 hover:glow-gold transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {event.title}
              </CardTitle>
              {event.is_finalized ? (
                <Badge variant="default" className="text-xs">{t('event.confirmed')}</Badge>
              ) : isLocked ? (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1" />
                  {t('event.locked')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">{t('event.voting')}</Badge>
              )}
            </div>
            {event.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {event.description}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {event.final_date ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(event.final_date), "EEE, MMM d 'at' h:mm a", { locale: dateLocale })}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {isLocked ? (
                <>
                  <Lock className="h-4 w-4" />
                  <span>{t('event.waiting_previous')}</span>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  <span>{t('event.date_tbd')}</span>
                </>
              )}
            </div>
          )}
          
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="truncate max-w-[150px]">{event.location}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-foreground font-medium">{event.going_count}</span>
              <span className="text-muted-foreground">{t('event.going').toLowerCase()}</span>
            </div>
            {event.maybe_count > 0 && (
              <span className="text-muted-foreground">
                +{event.maybe_count} {t('event.maybe').toLowerCase()}
              </span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {isFull ? (
              <Badge variant="destructive" className="text-xs">{t('event.full')}</Badge>
            ) : (
              <span>{t('event.spots_left', { count: totalCapacity - event.going_count })}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
