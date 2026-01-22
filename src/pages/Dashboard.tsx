import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';
import { Plus, Users } from 'lucide-react';
import { CreateClubDialog } from '@/components/clubs/CreateClubDialog';
import { JoinClubDialog } from '@/components/clubs/JoinClubDialog';
import { ClubCard } from '@/components/clubs/ClubCard';

interface ClubWithRole {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  role: 'owner' | 'admin' | 'member';
  member_count: number;
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubWithRole[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchClubs();
    }
  }, [user]);

  const fetchClubs = async () => {
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
  };

  // Removed handleSignOut - now in Settings page

  if (loading) {
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
        <div className="container flex items-center h-16 px-4">
          <Logo size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gold-gradient">Your Clubs</h2>
          <p className="text-muted-foreground">
            Manage your poker clubs and upcoming events
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="flex-1 glow-gold"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Club
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setJoinDialogOpen(true)}
            className="flex-1 border-border/50 hover:bg-secondary"
          >
            <Users className="mr-2 h-4 w-4" /> Join Club
          </Button>
        </div>

        {/* Clubs List */}
        {loadingClubs ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <Card className="bg-card/50 border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-4 opacity-30">♠ ♥ ♦ ♣</div>
              <CardTitle className="text-lg mb-2">No clubs yet</CardTitle>
              <CardDescription>
                Create your first club or join an existing one with an invite code.
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
