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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Shield, Search, MoreVertical, Key, Gift, Calendar, X, Users, CreditCard, UserPlus, Loader2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface UserWithSubscription {
  id: string;
  email: string | null;
  display_name: string;
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
  const { user, session } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAppAdmin();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [actionType, setActionType] = useState<'password_reset' | 'grant_monthly' | 'grant_annual' | 'revoke' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, display_name, created_at')
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
      return <Badge variant="outline" className="text-muted-foreground">No Subscription</Badge>;
    }

    const { status, trial_ends_at, current_period_end } = user.subscription;
    const now = new Date();

    if (status === 'trialing' && trial_ends_at) {
      const trialEnd = new Date(trial_ends_at);
      if (trialEnd > now) {
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Trial</Badge>;
      }
    }

    if (status === 'active' && current_period_end) {
      const periodEnd = new Date(current_period_end);
      if (periodEnd > now) {
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      }
    }

    return <Badge variant="destructive">Expired</Badge>;
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!selectedUser?.email || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-password-reset', {
        body: { email: selectedUser.email },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Sent',
        description: `Reset email sent to ${selectedUser.email}`,
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to send password reset',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  // Handle subscription management
  const handleSubscriptionAction = async (action: 'grant_monthly' | 'grant_annual' | 'revoke') => {
    if (!selectedUser || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: { 
          userId: selectedUser.id,
          action,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Refresh users list
      const { data: updatedSub } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, plan, trial_ends_at, current_period_end')
        .eq('user_id', selectedUser.id)
        .maybeSingle();

      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, subscription: updatedSub }
          : u
      ));

      const actionMessages = {
        grant_monthly: 'Monthly plan granted',
        grant_annual: 'Annual plan granted',
        revoke: 'Subscription revoked',
      };

      toast({
        title: t('common.success'),
        description: `${actionMessages[action]} for ${selectedUser.display_name}`,
      });
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update subscription',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  // Confirm action based on type
  const confirmAction = () => {
    if (actionType === 'password_reset') {
      handlePasswordReset();
    } else if (actionType) {
      handleSubscriptionAction(actionType);
    }
  };

  // Get action dialog content
  const getActionDialogContent = () => {
    switch (actionType) {
      case 'password_reset':
        return {
          title: 'Send Password Reset?',
          description: `This will send a password reset email to ${selectedUser?.email}`,
          action: 'Send Reset Email',
        };
      case 'grant_monthly':
        return {
          title: 'Grant Free Monthly Plan?',
          description: `This will give ${selectedUser?.display_name} a free monthly subscription.`,
          action: 'Grant Monthly Plan',
        };
      case 'grant_annual':
        return {
          title: 'Grant Free Annual Plan?',
          description: `This will give ${selectedUser?.display_name} a free annual subscription.`,
          action: 'Grant Annual Plan',
        };
      case 'revoke':
        return {
          title: 'Revoke Subscription?',
          description: `This will remove ${selectedUser?.display_name}'s current subscription.`,
          action: 'Revoke Subscription',
        };
      default:
        return { title: '', description: '', action: '' };
    }
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

  const dialogContent = getActionDialogContent();

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Manage users and subscriptions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
                <p className="text-xs text-muted-foreground">Active Subs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{recentSignups}</p>
                <p className="text-xs text-muted-foreground">New (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} of {totalUsers} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.display_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.email || 'No email'}
                  </TableCell>
                  <TableCell>{getSubscriptionBadge(user)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType('password_reset');
                          }}
                          disabled={!user.email}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Send Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType('grant_monthly');
                          }}
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Grant Free Monthly
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType('grant_annual');
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Grant Free Annual
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setActionType('revoke');
                          }}
                          className="text-destructive"
                          disabled={!user.subscription}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Revoke Subscription
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {searchQuery ? 'No users found matching your search' : 'No users found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionType && !!selectedUser} onOpenChange={(open) => {
        if (!open) {
          setActionType(null);
          setSelectedUser(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                dialogContent.action
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
