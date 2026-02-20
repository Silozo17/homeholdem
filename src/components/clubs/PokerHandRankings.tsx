import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Spade } from 'lucide-react';
import { HandRankingsList } from '@/components/poker/HandRankingsList';
export function PokerHandRankings() {
  const { t } = useTranslation();

  const bettingRounds = [
    {
      name: t('poker.preflop'),
      description: t('poker.preflop_desc'),
    },
    {
      name: t('poker.flop'),
      description: t('poker.flop_desc'),
    },
    {
      name: t('poker.turn'),
      description: t('poker.turn_desc'),
    },
    {
      name: t('poker.river'),
      description: t('poker.river_desc'),
    },
    {
      name: t('poker.showdown'),
      description: t('poker.showdown_desc'),
    },
  ];

  const bettingActions = [
    { name: t('poker.check'), description: t('poker.check_desc') },
    { name: t('poker.bet'), description: t('poker.bet_desc') },
    { name: t('poker.call'), description: t('poker.call_desc') },
    { name: t('poker.raise'), description: t('poker.raise_desc') },
    { name: t('poker.fold'), description: t('poker.fold_desc') },
    { name: t('poker.all_in'), description: t('poker.all_in_desc') },
  ];

  const blindsInfo = [
    { name: t('poker.dealer_button'), description: t('poker.dealer_desc') },
    { name: t('poker.small_blind'), description: t('poker.small_blind_desc') },
    { name: t('poker.big_blind'), description: t('poker.big_blind_desc') },
    { name: t('poker.ante'), description: t('poker.ante_desc') },
  ];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Spade className="h-5 w-5 text-primary" />
          {t('poker.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="hand-rankings">
            <AccordionTrigger>{t('poker.hand_rankings')}</AccordionTrigger>
            <AccordionContent>
              <HandRankingsList />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="betting-rounds">
            <AccordionTrigger>{t('poker.betting_rounds')}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {bettingRounds.map((round, index) => (
                  <div key={round.name} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{round.name}</div>
                      <div className="text-sm text-muted-foreground">{round.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="betting-actions">
            <AccordionTrigger>{t('poker.betting_actions')}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                {bettingActions.map((action) => (
                  <div key={action.name}>
                    <span className="font-medium">{action.name}</span> – {action.description}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="blinds">
            <AccordionTrigger>{t('poker.blinds_button')}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                {blindsInfo.map((item) => (
                  <div key={item.name}>
                    <span className="font-medium">{item.name}</span> – {item.description}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
