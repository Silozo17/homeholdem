import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { buildAppUrl } from '@/lib/app-url';

interface ShareClubProps {
  clubName: string;
  inviteCode: string;
}

export function ShareClub({ clubName, inviteCode }: ShareClubProps) {
  const [copied, setCopied] = useState(false);

  const joinUrl = buildAppUrl(`/dashboard?join=${inviteCode}`);

  const shareMessage = `🃏 Join our poker club: ${clubName}!\n\nUse code: ${inviteCode}\nOr join directly: ${joinUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success('Invite message copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-border/50">
          <Share2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Share to WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyInvite}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          Copy Invite
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
