import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PokerHandRankings } from '@/components/clubs/PokerHandRankings';
import { Logo } from '@/components/layout/Logo';

export default function Rules() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header with centered logo */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container flex items-center justify-center h-16 px-4 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="absolute left-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

      <main className="container px-4 py-6 pb-24">
        <h1 className="text-2xl font-bold text-gold-gradient mb-6 text-center">
          {t('poker.texas_holdem_rules')}
        </h1>
        <PokerHandRankings />
      </main>
    </div>
  );
}
