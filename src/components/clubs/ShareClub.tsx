import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const joinUrl = buildAppUrl(`/dashboard?join=${inviteCode}`);

  const shareMessage = `🃏 ${t('club.share_club')}: ${clubName}!\n\n${t('club.invite_code')}: ${inviteCode}\n${joinUrl}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success(t('common.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('common.error'));
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
          {t('club.share_to_whatsapp')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyInvite}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {t('club.copy_invite')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
