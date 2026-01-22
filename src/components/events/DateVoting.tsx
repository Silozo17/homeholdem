import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Calendar, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateOption {
  id: string;
  proposed_date: string;
  vote_count: number;
  user_voted: boolean;
}

interface DateVotingProps {
  options: DateOption[];
  onVote: (optionId: string) => void;
  onFinalize?: (optionId: string) => void;
}

export function DateVoting({ options, onVote, onFinalize }: DateVotingProps) {
  const maxVotes = Math.max(...options.map(o => o.vote_count), 1);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Vote for Date
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option) => (
          <div 
            key={option.id}
            className={cn(
              "relative flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
              option.user_voted 
                ? "border-primary bg-primary/10" 
                : "border-border/50 bg-secondary/30 hover:border-primary/50"
            )}
            onClick={() => onVote(option.id)}
          >
            {/* Vote bar background */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-primary/20 rounded-lg transition-all"
              style={{ width: `${(option.vote_count / maxVotes) * 100}%` }}
            />
            
            <div className="relative flex items-center gap-3">
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                option.user_voted 
                  ? "border-primary bg-primary" 
                  : "border-muted-foreground"
              )}>
                {option.user_voted && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div>
                <p className="font-medium">
                  {format(new Date(option.proposed_date), "EEEE, MMM d")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(option.proposed_date), "h:mm a")}
                </p>
              </div>
            </div>
            
            <div className="relative flex items-center gap-2">
              <span className="text-sm font-medium">
                {option.vote_count} {option.vote_count === 1 ? 'vote' : 'votes'}
              </span>
              {onFinalize && option.vote_count > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFinalize(option.id);
                  }}
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Finalize
                </Button>
              )}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Tap to vote • You can vote for multiple dates
        </p>
      </CardContent>
    </Card>
  );
}
