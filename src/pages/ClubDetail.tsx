import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/layout/Logo';
import { 
  ArrowLeft, 
  Users, 
  Copy, 
  Check,
  Crown,
  Shield,
  User,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface ClubMember {
  id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface Club {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
}

export default function ClubDetail() {
  const { clubId } = useParams<{ clubId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && clubId) {
      fetchClubData();
    }
  }, [user, clubId]);

  const fetchClubData = async () => {
    if (!user || !clubId) return;
    
    setLoadingData(true);

    // Fetch club details
    const { data: clubData, error: clubError } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single();

    if (clubError || !clubData) {
      toast.error('Club not found');
      navigate('/dashboard');
      return;
    }

    setClub(clubData);

    // Fetch members
    const { data: membersData, error: membersError } = await supabase
      .from('club_members')
      .select('id, role, joined_at, user_id')
      .eq('club_id', clubId)
      .order('role', { ascending: true });

    if (!membersError && membersData) {
      // Find current user's role
      const currentUserMember = membersData.find(m => m.user_id === user.id);
      if (currentUserMember) {
        setUserRole(currentUserMember.role as 'owner' | 'admin' | 'member');
      }

      // Fetch profiles for each member
      const userIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map the data correctly
      const mappedMembers = membersData.map(m => ({
        id: m.id,
        role: m.role as 'owner' | 'admin' | 'member',
        joined_at: m.joined_at,
        profile: profileMap.get(m.user_id) || { display_name: 'Unknown', avatar_url: null },
      }));

      setMembers(mappedMembers);
    }

    setLoadingData(false);
  };

  const copyInviteCode = async () => {
    if (!club) return;
    await navigator.clipboard.writeText(club.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-primary" />;
      case 'admin': return <Shield className="h-4 w-4 text-accent" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="min-h-screen bg-background card-suit-pattern">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center h-16 px-4 gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6 space-y-6">
        {/* Club Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gold-gradient">{club.name}</h1>
            {userRole && (
              <Badge variant={userRole === 'owner' ? 'default' : 'secondary'} className="capitalize">
                {userRole}
              </Badge>
            )}
          </div>
          {club.description && (
            <p className="text-muted-foreground">{club.description}</p>
          )}
        </div>

        {/* Invite Code Card */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm text-muted-foreground">Invite Code</p>
              <p className="text-2xl font-mono tracking-[0.3em] text-primary">
                {club.invite_code}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyInviteCode}
              className="border-border/50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {(userRole === 'owner' || userRole === 'admin') && (
          <Button className="w-full glow-gold">
            <Calendar className="mr-2 h-4 w-4" />
            Create Event
          </Button>
        )}

        {/* Members Section */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div 
                key={member.id}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    {member.profile.avatar_url ? (
                      <img 
                        src={member.profile.avatar_url} 
                        alt={member.profile.display_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {member.profile.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.profile.display_name}</p>
                    <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      {member.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Placeholder for upcoming features */}
        <Card className="bg-card/50 border-border/50 border-dashed">
          <CardContent className="py-8 text-center">
            <div className="text-3xl mb-3 opacity-30">🎰</div>
            <p className="text-muted-foreground">
              Events and game sessions coming soon!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
