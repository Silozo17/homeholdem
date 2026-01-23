import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronRight, Crown, Shield } from 'lucide-react';

interface ClubCardProps {
  club: {
    id: string;
    name: string;
    description: string | null;
    role: 'owner' | 'admin' | 'member';
    member_count: number;
  };
  onClick: () => void;
}

export function ClubCard({ club, onClick }: ClubCardProps) {
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
      className="bg-card/50 border-border/50 hover:border-primary/50 hover:glow-gold transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {club.name}
            </CardTitle>
            {club.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {club.description}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
