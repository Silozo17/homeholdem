import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Logo } from '@/components/layout/Logo';
import { Settings, Trophy, TrendingUp, Users, Calendar, Crown, Medal, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface ProfileData {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface ClubMembership {
  club_id: string;
  role: 'owner' | 'admin' | 'member';
  club: {
    id: string;
    name: string;
  };
}

interface PlayerStats {
  totalGames: number;
  totalWins: number;
  totalCashes: number;
  totalPrizeMoney: number;
  totalBuyIns: number;
  netProfit: number;
}

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [stats, setStats] = useState<PlayerStats>({
    totalGames: 0,
    totalWins: 0,
    totalCashes: 0,
    totalPrizeMoney: 0,
    totalBuyIns: 0,
    netProfit: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoadingData(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch club memberships
    const { data: memberships } = await supabase
      .from('club_members')
      .select('club_id, role, clubs(id, name)')
      .eq('user_id', user.id);

    if (memberships) {
      setClubs(memberships.map(m => ({
        club_id: m.club_id,
        role: m.role,
        club: m.clubs as { id: string; name: string },
      })));
    }

    // Fetch game statistics
    const { data: gamePlayersData } = await supabase
      .from('game_players')
      .select('id, finish_position, game_session_id')
      .eq('user_id', user.id);

    const { data: transactionsData } = await supabase
      .from('game_transactions')
      .select('amount, transaction_type, game_player_id')
      .in('game_player_id', gamePlayersData?.map(p => p.id) || []);

    if (gamePlayersData && transactionsData) {
      const totalGames = gamePlayersData.length;
      const totalWins = gamePlayersData.filter(p => p.finish_position === 1).length;
      const totalCashes = gamePlayersData.filter(p => p.finish_position && p.finish_position <= 3).length;
      
      let totalBuyIns = 0;
      let totalPrizeMoney = 0;
      
      transactionsData.forEach(t => {
        if (['buy_in', 'rebuy', 'addon'].includes(t.transaction_type)) {
          totalBuyIns += t.amount;
        } else if (t.transaction_type === 'payout') {
          totalPrizeMoney += Math.abs(t.amount);
        }
      });

      setStats({
        totalGames,
        totalWins,
        totalCashes,
        totalPrizeMoney,
        totalBuyIns,
        netProfit: totalPrizeMoney - totalBuyIns,
      });
    }

    setLoadingData(false);
  };

  const handleAvatarUpdate = (newUrl: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: newUrl });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container relative flex items-center justify-center h-16 px-4">
          <Logo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            className="absolute right-4 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AvatarUpload
                userId={user?.id || ''}
                currentAvatarUrl={profile?.avatar_url || null}
                displayName={profile?.display_name || ''}
                onUploadComplete={handleAvatarUpdate}
              />
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gold-gradient">
                  {profile?.display_name}
                </h1>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Games</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalGames}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Wins</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalWins}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Medal className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Cashes</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalCashes}</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Win Rate</span>
              </div>
              <div className="text-2xl font-bold">
                {stats.totalGames > 0 
                  ? Math.round((stats.totalWins / stats.totalGames) * 100) 
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Buy-ins</span>
              <span className="font-medium">£{stats.totalBuyIns.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Winnings</span>
              <span className="font-medium text-success">£{stats.totalPrizeMoney.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-medium">Net Profit/Loss</span>
              <span className={`font-bold ${stats.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.netProfit >= 0 ? '+' : ''}£{stats.netProfit.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* My Clubs */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              My Clubs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                You haven't joined any clubs yet.
              </p>
            ) : (
              <div className="space-y-2">
                {clubs.map((membership) => (
                  <button
                    key={membership.club_id}
                    onClick={() => navigate(`/club/${membership.club_id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <span className="font-medium">{membership.club.name}</span>
                    <Badge variant={getRoleBadgeVariant(membership.role)}>
                      {membership.role}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
