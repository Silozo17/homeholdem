import { format } from 'date-fns';
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
  const [copied, setCopied] = useState(false);

  const eventUrl = `${window.location.origin}/event/${eventId}`;
  
  const formattedDate = eventDate 
    ? format(new Date(eventDate), "EEEE, MMM d 'at' h:mm a")
    : 'Date TBD';

  const spotsLeft = capacity - goingCount;
  const spotsText = spotsLeft > 0 
    ? `${spotsLeft} spots left!` 
    : 'Waitlist open';

  // Build the share message
  const shareMessage = [
    `🃏 *${eventTitle}*`,
    '',
    `📅 ${formattedDate}`,
    location ? `📍 ${location}` : null,
    '',
    `👥 ${goingCount}/${capacity} confirmed • ${spotsText}`,
    '',
    `RSVP here: ${eventUrl}`,
  ].filter(Boolean).join('\n');

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    toast.success('Link copied!');
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
          Share to WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
