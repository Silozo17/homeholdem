import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, ArrowRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface UpcomingEventBannerProps {
  event: {
    id: string;
    title: string;
    final_date: string | null;
    club_name: string;
  };
}

export function UpcomingEventBanner({ event }: UpcomingEventBannerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className="w-full glass-card rounded-xl p-4 flex items-center gap-4 text-left group active:scale-[0.98] transition-transform animate-slide-up-fade"
    >
      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Calendar className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{event.club_name} • {t('home.upcoming')}</p>
        <p className="font-bold text-foreground text-sm truncate">{event.title}</p>
        {event.final_date && (
          <p className="text-xs text-primary">
            {format(new Date(event.final_date), 'EEE, MMM d')} • {formatDistanceToNow(new Date(event.final_date), { addSuffix: true })}
          </p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </button>
  );
}
