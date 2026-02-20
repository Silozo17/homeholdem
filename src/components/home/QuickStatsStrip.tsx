import { useTranslation } from 'react-i18next';
import { Trophy, Target, TrendingUp } from 'lucide-react';

interface QuickStatsStripProps {
  wins: number;
  gamesPlayed: number;
  netProfit: string;
}

export function QuickStatsStrip(props: QuickStatsStripProps) {
  const { t } = useTranslation();

  const items = [
    { label: t('home.stat_wins'), value: props.wins, icon: Trophy, color: 'text-primary' },
    { label: t('home.stat_games'), value: props.gamesPlayed, icon: Target, color: 'text-emerald-400' },
    { label: t('home.stat_net'), value: props.netProfit, icon: TrendingUp, color: 'text-sky-400' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {items.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex-shrink-0 glass-card rounded-xl px-4 py-3 min-w-[100px] space-y-1 animate-slide-up-fade"
          >
            <Icon className={`h-4 w-4 ${stat.color}`} />
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
