import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { Logo } from '@/components/layout/Logo';
import { Input } from '@/components/ui/input';
import { Settings, Users, ChevronRight, BarChart3, Trophy, Target, Flame, Crown, Shield, Pencil, Check, X, Globe, MessageSquare, UserPlus } from 'lucide-react';
import { COUNTRIES, isoToEmoji } from '@/lib/countries';
import { CountrySelector } from '@/components/profile/CountrySelector';
import { toast } from '@/hooks/use-toast';
import { PaywallDrawer } from '@/components/subscription/PaywallDrawer';
import { HeaderSocialIcons } from '@/components/layout/HeaderSocialIcons';
import { useIsAppAdmin } from '@/hooks/useIsAppAdmin';
import { usePlayerLevel } from '@/hooks/usePlayerLevel';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';

interface ProfileData {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  country_code: string | null;
}

interface ClubMembership {
  club_id: string;
  role: 'owner' | 'admin' | 'member';
  club: {
    id: string;
    name: string;
  };
}

interface QuickStats {
  totalGames: number;
  totalWins: number;
  clubCount: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [clubs, setClubs] = useState<ClubMembership[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats>({
    totalGames: 0,
    totalWins: 0,
    clubCount: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editingCountry, setEditingCountry] = useState(false);
  const { isAdmin } = useIsAppAdmin();
  const levelData = usePlayerLevel(user?.id);

  const dateLocale = i18n.language === 'pl' ? pl : enUS;

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

    // Find placeholder players linked to this user
    const { data: linkedPlaceholders } = await supabase
      .from('placeholder_players')
      .select('id')
      .eq('linked_user_id', user.id);

    const placeholderIds = linkedPlaceholders?.map(p => p.id) || [];

    // Fetch quick game statistics
    let gamePlayersQuery = supabase
      .from('game_players')
      .select('id, finish_position');

    if (placeholderIds.length > 0) {
      gamePlayersQuery = gamePlayersQuery.or(
        `user_id.eq.${user.id},placeholder_player_id.in.(${placeholderIds.join(',')})`
      );
    } else {
      gamePlayersQuery = gamePlayersQuery.eq('user_id', user.id);
    }

    const { data: gamePlayersData } = await gamePlayersQuery;

    const totalGames = gamePlayersData?.length || 0;
    const totalWins = gamePlayersData?.filter(p => p.finish_position === 1).length || 0;
    const clubCount = memberships?.length || 0;

    setQuickStats({ totalGames, totalWins, clubCount });

    // Calculate achievements
    const achievementsList: Achievement[] = [
      {
        id: 'first_game',
        name: t('profile.achievements.first_game'),
        description: t('profile.achievements.first_game_desc'),
        icon: <Target className="h-5 w-5" />,
        unlocked: totalGames >= 1,
      },
      {
        id: 'first_win',
        name: t('profile.achievements.first_win'),
        description: t('profile.achievements.first_win_desc'),
        icon: <Trophy className="h-5 w-5" />,
        unlocked: totalWins >= 1,
      },
      {
        id: 'five_games',
        name: t('profile.achievements.five_games'),
        description: t('profile.achievements.five_games_desc'),
        icon: <Flame className="h-5 w-5" />,
        unlocked: totalGames >= 5,
      },
      {
        id: 'three_wins',
        name: t('profile.achievements.three_wins'),
        description: t('profile.achievements.three_wins_desc'),
        icon: <Trophy className="h-5 w-5 text-primary" />,
        unlocked: totalWins >= 3,
      },
    ];

    setAchievements(achievementsList);
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
        <div className="animate-pulse text-primary">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-16 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaywallOpen(true)}
            className="absolute left-4 text-primary hover:text-primary/80"
          >
            <Crown className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <div className="absolute right-4 flex items-center gap-1">
            <HeaderSocialIcons />
          </div>
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

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
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-8 text-lg font-bold bg-background/50"
                      maxLength={30}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-success shrink-0"
                      disabled={savingName || !newName.trim()}
                      onClick={async () => {
                        if (!user || !newName.trim()) return;
                        setSavingName(true);
                        const { error } = await supabase
                          .from('profiles')
                          .update({ display_name: newName.trim() })
                          .eq('id', user.id);
                        setSavingName(false);
                        if (error) {
                          toast({ title: 'Error', description: 'Failed to update name', variant: 'destructive' });
                        } else {
                          setProfile(prev => prev ? { ...prev, display_name: newName.trim() } : prev);
                          setEditingName(false);
                          toast({ title: 'Name updated' });
                        }
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground shrink-0"
                      onClick={() => setEditingName(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gold-gradient">
                      {profile?.display_name}
                    </h1>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setNewName(profile?.display_name || '');
                        setEditingName(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile?.created_at ? t('profile.member_since', { date: format(new Date(profile.created_at), 'MMM yyyy', { locale: dateLocale }) }) : ''}
                </p>
                {/* Country row */}
                <div className="flex items-center gap-1.5 mt-1">
                  {editingCountry ? (
                    <CountrySelector
                      value={profile?.country_code ?? null}
                      onChange={async (code) => {
                        if (!user) return;
                        const { error } = await supabase
                          .from('profiles')
                          .update({ country_code: code })
                          .eq('id', user.id);
                        if (!error) {
                          setProfile((prev) => prev ? { ...prev, country_code: code } : prev);
                        }
                        setEditingCountry(false);
                      }}
                      className="h-7 text-xs"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingCountry(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {profile?.country_code ? (
                        <>
                          <span className="text-sm leading-none">{isoToEmoji(profile.country_code)}</span>
                          <span>{COUNTRIES.find((c) => c.code === profile.country_code)?.name ?? profile.country_code}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-3.5 w-3.5" />
                          <span>Set country</span>
                        </>
                      )}
                      <Pencil className="h-3 w-3 opacity-50" />
                    </button>
                  )}
                </div>
                {levelData && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">Lvl {levelData.level}</span>
                      <span className="text-[10px] text-muted-foreground">{levelData.totalXp.toLocaleString()} / {levelData.xpForNextLevel.toLocaleString()} XP</span>
                    </div>
                    <Progress value={levelData.progress * 100} className="h-1.5 mt-1" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Summary */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4">
            <p className="text-center text-muted-foreground">
              {t('profile.quick_summary', {
                games: quickStats.totalGames,
                wins: quickStats.totalWins,
                clubs: quickStats.clubCount,
              })}
            </p>
          </CardContent>
        </Card>

        {/* View Full Stats Button */}
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => navigate('/stats')}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>{t('profile.view_full_stats')}</span>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Messages & Friends */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start gap-2 h-auto py-3"
            onClick={() => navigate('/inbox')}
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>Messages</span>
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2 h-auto py-3"
            onClick={() => navigate('/friends')}
          >
            <UserPlus className="h-5 w-5 text-primary" />
            <span>Friends</span>
          </Button>
        </div>

        {/* Achievements */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t('profile.achievements.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border ${
                    achievement.unlocked
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/30 border-border/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}>
                      {achievement.icon}
                    </div>
                    <span className="text-sm font-medium">{achievement.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Clubs */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('profile.my_clubs')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('profile.no_clubs')}
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
                      {t(`roles.${membership.role}`)}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Panel Link - Only visible to app admins */}
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full justify-between border-primary/30 hover:bg-primary/10"
            onClick={() => navigate('/admin')}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Admin Panel</span>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </main>

      <PaywallDrawer open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
