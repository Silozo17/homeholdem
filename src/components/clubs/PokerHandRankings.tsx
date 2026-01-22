import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Spade } from 'lucide-react';

const handRankings = [
  {
    rank: 1,
    name: 'Royal Flush',
    description: 'A, K, Q, J, 10, all of the same suit.',
    example: 'A♠ K♠ Q♠ J♠ 10♠',
  },
  {
    rank: 2,
    name: 'Straight Flush',
    description: 'Five consecutive cards of the same suit.',
    example: '9♥ 8♥ 7♥ 6♥ 5♥',
  },
  {
    rank: 3,
    name: 'Four of a Kind',
    description: 'Four cards of the same rank.',
    example: 'K♠ K♥ K♦ K♣ 3♠',
  },
  {
    rank: 4,
    name: 'Full House',
    description: 'Three of a kind plus a pair.',
    example: 'Q♠ Q♥ Q♦ 9♣ 9♠',
  },
  {
    rank: 5,
    name: 'Flush',
    description: 'Five cards of the same suit, not in sequence.',
    example: 'A♦ J♦ 8♦ 6♦ 2♦',
  },
  {
    rank: 6,
    name: 'Straight',
    description: 'Five consecutive cards of different suits.',
    example: '10♠ 9♥ 8♦ 7♣ 6♠',
  },
  {
    rank: 7,
    name: 'Three of a Kind',
    description: 'Three cards of the same rank.',
    example: '7♠ 7♥ 7♦ K♣ 2♠',
  },
  {
    rank: 8,
    name: 'Two Pair',
    description: 'Two different pairs.',
    example: 'J♠ J♥ 4♦ 4♣ A♠',
  },
  {
    rank: 9,
    name: 'One Pair',
    description: 'Two cards of the same rank.',
    example: '10♠ 10♥ K♦ 7♣ 4♠',
  },
  {
    rank: 10,
    name: 'High Card',
    description: 'No matching cards; highest card plays.',
    example: 'A♠ J♥ 8♦ 6♣ 2♠',
  },
];

const bettingRounds = [
  {
    name: 'Pre-Flop',
    description: 'Each player is dealt two hole cards face down. Betting begins with the player left of the big blind.',
  },
  {
    name: 'The Flop',
    description: 'Three community cards are dealt face up. Second round of betting begins with the player left of the dealer button.',
  },
  {
    name: 'The Turn',
    description: 'A fourth community card is dealt face up. Third round of betting.',
  },
  {
    name: 'The River',
    description: 'A fifth and final community card is dealt. Final round of betting.',
  },
  {
    name: 'Showdown',
    description: 'If multiple players remain, cards are revealed and the best five-card hand wins.',
  },
];

export function PokerHandRankings() {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Spade className="h-5 w-5 text-primary" />
          Texas Hold'em Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="hand-rankings">
            <AccordionTrigger>Hand Rankings (Best to Worst)</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {handRankings.map((hand) => (
                  <div key={hand.rank} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {hand.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{hand.name}</div>
                      <div className="text-sm text-muted-foreground">{hand.description}</div>
                      <div className="text-sm font-mono mt-1 text-primary/80">{hand.example}</div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="betting-rounds">
            <AccordionTrigger>Betting Rounds</AccordionTrigger>
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
            <AccordionTrigger>Betting Actions</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Check</span> – Pass the action without betting (only if no bet has been made)</div>
                <div><span className="font-medium">Bet</span> – Place the first wager in a betting round</div>
                <div><span className="font-medium">Call</span> – Match the current bet</div>
                <div><span className="font-medium">Raise</span> – Increase the current bet</div>
                <div><span className="font-medium">Fold</span> – Surrender your cards and exit the hand</div>
                <div><span className="font-medium">All-In</span> – Bet all remaining chips</div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="blinds">
            <AccordionTrigger>Blinds & Button</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Dealer Button</span> – Rotates clockwise each hand, marks the dealer position</div>
                <div><span className="font-medium">Small Blind</span> – Forced bet posted by the player left of the button (usually half the big blind)</div>
                <div><span className="font-medium">Big Blind</span> – Forced bet posted by the player two seats left of the button</div>
                <div><span className="font-medium">Ante</span> – Optional small bet from all players before dealing (common in tournaments)</div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
