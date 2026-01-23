import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { pl, enUS } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Calendar, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';

interface Voter {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface DateOption {
  id: string;
  proposed_date: string;
  vote_count: number;
  user_voted: boolean;
  voters?: Voter[];
}

interface DateVotingProps {
  options: DateOption[];
  onVote: (optionId: string) => void;
  onFinalize?: (optionId: string) => void;
}

export function DateVoting({ options, onVote, onFinalize }: DateVotingProps) {
  const { t, i18n } = useTranslation();
  const maxVotes = Math.max(...options.map(o => o.vote_count), 1);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const dateLocale = i18n.language === 'pl' ? pl : enUS;

  const toggleVoterList = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOption(prev => prev === optionId ? null : optionId);
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t('event.vote_for_date')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option) => (
          <div key={option.id} className="space-y-2">
            <div 
              className={cn(
                "relative flex flex-col gap-3 p-4 rounded-lg border transition-all cursor-pointer",
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
              
              {/* Row 1: Checkbox + Date/Time */}
              <div className="relative flex items-start gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
                  option.user_voted 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )}>
                  {option.user_voted && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-base">
                    {format(new Date(option.proposed_date), "EEEE, MMM d", { locale: dateLocale })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(option.proposed_date), "h:mm a", { locale: dateLocale })}
                  </p>
                </div>
              </div>
              
              {/* Row 2: Vote count + Finalize button */}
              <div className="relative flex items-center justify-between pl-8">
                <button
                  onClick={(e) => toggleVoterList(option.id, e)}
                  className={cn(
                    "text-sm font-medium flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors -ml-2",
                    option.voters && option.voters.length > 0 
                      ? "hover:bg-secondary/50 cursor-pointer" 
                      : "cursor-default"
                  )}
                >
                  {t('event.vote_count', { count: option.vote_count })}
                  {option.voters && option.voters.length > 0 && (
                    expandedOption === option.id 
                      ? <ChevronUp className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {onFinalize && option.vote_count > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFinalize(option.id);
                    }}
                  >
                    <Crown className="h-3.5 w-3.5 mr-1.5" />
                    {t('event.finalize')}
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded voter list */}
            {expandedOption === option.id && option.voters && option.voters.length > 0 && (
              <div className="ml-4 p-3 bg-secondary/20 rounded-lg border border-border/30 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{t('event.voters')}:</p>
                <div className="flex flex-wrap gap-2">
                  {option.voters.map((voter) => (
                    <div 
                      key={voter.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-background/50 rounded-full"
                    >
                      <UserAvatar 
                        name={voter.display_name} 
                        avatarUrl={voter.avatar_url}
                        size="xs"
                      />
                      <span className="text-xs font-medium">{voter.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-2">
          {t('event.voting_instructions')}
        </p>
      </CardContent>
    </Card>
  );
}
