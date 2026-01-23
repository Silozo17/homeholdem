import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/layout/Logo';
import { Plus, Users } from 'lucide-react';
import { CreateClubDialog } from '@/components/clubs/CreateClubDialog';
import { JoinClubDialog } from '@/components/clubs/JoinClubDialog';
import { ClubCard } from '@/components/clubs/ClubCard';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { toast } from 'sonner';
import { SuitRow } from '@/components/common/CardSuits';

interface ClubWithRole {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  role: 'owner' | 'admin' | 'member';
  member_count: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState<ClubWithRole[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [processingInvite, setProcessingInvite] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const fetchClubs = useCallback(async () => {
    if (!user) return;
    
    setLoadingClubs(true);
    
    // Get clubs the user is a member of
    const { data: memberships, error } = await supabase
      .from('club_members')
      .select(`
        role,
        club:clubs (
          id,
          name,
          description,
          invite_code
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching clubs:', error);
      setLoadingClubs(false);
      return;
    }

    // Get member counts for each club
    const clubsWithCounts = await Promise.all(
      (memberships || []).map(async (m) => {
        const club = m.club as { id: string; name: string; description: string | null; invite_code: string };
        const { count } = await supabase
          .from('club_members')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id);
        
        return {
          ...club,
          role: m.role as 'owner' | 'admin' | 'member',
          member_count: count || 0,
        };
      })
    );

    setClubs(clubsWithCounts);
    setLoadingClubs(false);
  }, [user]);

  // Auto-join club from invite link
  const processInviteCode = useCallback(async (inviteCode: string) => {
    if (!user || processingInvite) return;
    
    setProcessingInvite(true);

    try {
      // Use secure RPC function to lookup club by invite code
      const { data: clubData, error: clubError } = await supabase
        .rpc('lookup_club_by_invite_code', { _invite_code: inviteCode })
        .single();

      if (clubError || !clubData) {
        toast.error(t('club.invalid_code'));
        return;
      }

      const club = clubData as { id: string; name: string };

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', club.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast.info(t('club.already_member', { name: club.name }));
        navigate(`/club/${club.id}`);
        return;
      }

      // Join the club
      const { error: joinError } = await supabase
        .from('club_members')
        .insert({
          club_id: club.id,
          user_id: user.id,
          role: 'member',
        });

      if (joinError) {
        toast.error(t('club.join_failed'));
        return;
      }

      toast.success(t('club.welcome', { name: club.name }));
      navigate(`/club/${club.id}`);
    } finally {
      setProcessingInvite(false);
      // Clear the stored invite code
      localStorage.removeItem('pendingInviteCode');
      // Clear URL params if present
      if (searchParams.get('join')) {
        searchParams.delete('join');
        setSearchParams(searchParams);
      }
    }
  }, [user, processingInvite, navigate, searchParams, setSearchParams, t]);

  useEffect(() => {
    if (user) {
      fetchClubs();
      
      // Check for pending invite code (from URL or localStorage)
      const urlInviteCode = searchParams.get('join');
      const storedInviteCode = localStorage.getItem('pendingInviteCode');
      const inviteCode = urlInviteCode || storedInviteCode;
      
      if (inviteCode) {
        processInviteCode(inviteCode.toUpperCase());
      }
    }
  }, [user, fetchClubs, searchParams, processInviteCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="container flex items-center justify-center h-16 px-4">
            <Skeleton className="h-10 w-40" />
          </div>
        </header>
        <main className="container px-4 py-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container flex items-center justify-center h-16 px-4">
          <Logo size="sm" />
        </div>
      </header>
      {/* Header spacer */}
      <div className="h-16 safe-area-top" />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gold-gradient">{t('dashboard.your_clubs')}</h2>
          <p className="text-muted-foreground">
            {t('dashboard.manage_clubs')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="flex-1 glow-gold"
          >
            <Plus className="mr-2 h-4 w-4" /> {t('club.create')}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setJoinDialogOpen(true)}
            className="flex-1 border-border/50 hover:bg-secondary"
          >
            <Users className="mr-2 h-4 w-4" /> {t('club.join')}
          </Button>
        </div>

        {/* Clubs List */}
        {loadingClubs ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card/50 border-border/50">
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <Card className="bg-card/50 border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <SuitRow size="xl" opacity={0.3} className="mb-4" />
              <CardTitle className="text-lg mb-2">{t('dashboard.no_clubs')}</CardTitle>
              <CardDescription>
                {t('dashboard.no_clubs_description')}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clubs.map((club) => (
              <ClubCard 
                key={club.id} 
                club={club} 
                onClick={() => navigate(`/club/${club.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <CreateClubDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchClubs}
      />
      <JoinClubDialog 
        open={joinDialogOpen} 
        onOpenChange={setJoinDialogOpen}
        onSuccess={fetchClubs}
      />
    </div>
  );
}
