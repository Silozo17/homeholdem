import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAppAdmin } from '@/hooks/useIsAppAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/common/UserAvatar';
import { UserDetailSheet } from '@/components/admin/UserDetailSheet';
import { toast } from '@/hooks/use-toast';
import { Shield, Search, Users, CreditCard, UserPlus, Loader2, ChevronRight } from 'lucide-react';

interface UserWithSubscription {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  subscription?: {
    id: string;
    status: string;
    plan: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
}

export default function Admin() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAppAdmin();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  // Fetch all users with subscriptions
  useEffect(() => {
    async function fetchUsers() {
      if (!isAdmin) return;

      try {
        // Fetch all profiles including avatar_url
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url, created_at')
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        // Fetch all subscriptions
        const { data: subscriptions, error: subscriptionsError } = await supabase
          .from('subscriptions')
          .select('id, user_id, status, plan, trial_ends_at, current_period_end');

        if (subscriptionsError) throw subscriptionsError;

        // Combine profiles with subscriptions
        const usersWithSubs = profiles?.map(profile => ({
          ...profile,
          subscription: subscriptions?.find(sub => sub.user_id === profile.id) || null,
        })) || [];

        setUsers(usersWithSubs);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to load users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [isAdmin, t]);

  // Filter users by search query
  const filteredUsers = users.filter(user =>
    user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get subscription status badge
  const getSubscriptionBadge = (user: UserWithSubscription) => {
    if (!user.subscription) {
      return <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5">Free</Badge>;
    }

    const { status, trial_ends_at, current_period_end } = user.subscription;
    const now = new Date();

    if (status === 'trialing' && trial_ends_at) {
      const trialEnd = new Date(trial_ends_at);
      if (trialEnd > now) {
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5">Trial</Badge>;
      }
    }

    if (status === 'active' && current_period_end) {
      const periodEnd = new Date(current_period_end);
      if (periodEnd > now) {
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5">Pro</Badge>;
      }
    }

    return <Badge variant="destructive" className="text-[10px] px-1.5">Expired</Badge>;
  };

  const handleUserUpdated = (updatedUser: UserWithSubscription) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    setSelectedUser(updatedUser);
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
        <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  // Stats
  const totalUsers = users.length;
  const activeSubscriptions = users.filter(u => {
    if (!u.subscription) return false;
    const { status, trial_ends_at, current_period_end } = u.subscription;
    const now = new Date();
    if (status === 'trialing' && trial_ends_at && new Date(trial_ends_at) > now) return true;
    if (status === 'active' && current_period_end && new Date(current_period_end) > now) return true;
    return false;
  }).length;
  const recentSignups = users.filter(u => {
    const created = new Date(u.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created > weekAgo;
  }).length;

  return (
    <div className="container mx-auto py-6 px-4 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Manage users and subscriptions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{totalUsers}</p>
                <p className="text-[10px] text-muted-foreground">Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{activeSubscriptions}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xl font-bold">{recentSignups}</p>
                <p className="text-[10px] text-muted-foreground">New (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 text-base"
        />
      </div>

      {/* Users List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Users</CardTitle>
          <CardDescription className="text-xs">
            {filteredUsers.length} of {totalUsers} users
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <UserAvatar name={u.display_name} avatarUrl={u.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.display_name}</p>
                </div>
                {getSubscriptionBadge(u)}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No users found matching your search' : 'No users found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}
