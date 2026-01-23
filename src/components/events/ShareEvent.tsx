import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { pl, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { buildAppUrl } from '@/lib/app-url';

interface ShareEventProps {
  eventTitle: string;
  eventDate?: string | null;
  location?: string | null;
  eventId: string;
  goingCount: number;
  capacity: number;
}

export function ShareEvent({ 
  eventTitle, 
  eventDate, 
  location, 
  eventId,
  goingCount,
  capacity
}: ShareEventProps) {
  const { t, i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  const eventUrl = buildAppUrl(`/event/${eventId}`);
  
  const formattedDate = eventDate 
    ? format(new Date(eventDate), "EEEE, MMM d 'at' h:mm a", { locale: dateLocale })
    : t('event.date_tbd');

  const spotsLeft = capacity - goingCount;
  const spotsText = spotsLeft > 0 
    ? t('event.spots_left', { count: spotsLeft })
    : t('event.waitlist');

  // Build the share message
  const shareMessage = [
    `🃏 *${eventTitle}*`,
    '',
    `📅 ${formattedDate}`,
    location ? `📍 ${location}` : null,
    '',
    `👥 ${goingCount}/${capacity} ${t('event.confirmed').toLowerCase()} • ${spotsText}`,
    '',
    `RSVP: ${eventUrl}`,
  ].filter(Boolean).join('\n');

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    toast.success(t('event.link_copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
          {t('club.share_to_whatsapp')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {t('event.copy_link')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
