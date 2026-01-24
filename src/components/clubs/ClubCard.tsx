import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight, Crown, Shield, Lock } from 'lucide-react';

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    description: string | null;
    role: 'owner' | 'admin' | 'member';
    member_count: number;
  };
  isLocked?: boolean;
  onClick: () => void;
}

export function ClubCard({ club, isLocked = false, onClick }: ClubCardProps) {
  const { t } = useTranslation();

  const roleIcon = {
    owner: <Crown className="h-3 w-3" />,
    admin: <Shield className="h-3 w-3" />,
    member: null,
  };

  const roleBadgeVariant = {
    owner: 'default' as const,
    admin: 'secondary' as const,
    member: 'outline' as const,
  };

  return (
    <Card 
      className={`bg-card/50 border-border/50 transition-all cursor-pointer group relative ${
        isLocked 
          ? 'opacity-60 hover:opacity-80' 
          : 'hover:border-primary/50 hover:glow-gold'
      }`}
      onClick={onClick}
    >
      {/* Lock overlay for locked clubs */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg bg-background/20 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {t('subscription.upgrade_to_access', 'Upgrade to Access')}
            </span>
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={`text-lg transition-colors ${
              isLocked ? 'text-muted-foreground' : 'group-hover:text-primary'
            }`}>
              {club.name}
            </CardTitle>
            {club.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {club.description}
              </p>
            )}
          </div>
          {isLocked ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{t('club.members_count', { count: club.member_count })}</span>
          </div>
          <Badge variant={roleBadgeVariant[club.role]} className="capitalize">
            {roleIcon[club.role]}
            <span className={roleIcon[club.role] ? 'ml-1' : ''}>{t(`roles.${club.role}`)}</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
