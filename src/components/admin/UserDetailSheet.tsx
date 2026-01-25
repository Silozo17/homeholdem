import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { UserAvatar } from '@/components/common/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { 
  X, 
  Key, 
  Gift, 
  Calendar, 
  Mail, 
  Pencil, 
  Check,
  Trophy,
  Gamepad2,
  Coins,
  Users,
  Loader2,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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

interface UserStats {
  totalGames: number;
  wins: number;
  totalWinnings: number;
  clubCount: number;
}

interface UserDetailSheetProps {
  user: UserWithSubscription | null;
  onClose: () => void;
  onUserUpdated: (user: UserWithSubscription) => void;
}

export function UserDetailSheet({ user, onClose, onUserUpdated }: UserDetailSheetProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  
  const [stats, setStats] = useState<UserStats>({ totalGames: 0, wins: 0, totalWinnings: 0, clubCount: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  const [actionType, setActionType] = useState<'password_reset' | 'grant_monthly' | 'grant_annual' | 'revoke' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch user stats when user changes
  useEffect(() => {
    if (!user) return;
    
    setNewDisplayName(user.display_name);
    fetchUserStats(user.id);
  }, [user?.id]);

  const fetchUserStats = async (userId: string) => {
    setLoadingStats(true);
    try {
      // Fetch game players for this user
      const { data: gamePlayers } = await supabase
        .from('game_players')
        .select('id, finish_position')
        .eq('user_id', userId);

      // Fetch club memberships
      const { data: clubMemberships } = await supabase
        .from('club_members')
        .select('id')
        .eq('user_id', userId);

      // Fetch transactions for winnings
      const playerIds = gamePlayers?.map(p => p.id) || [];
      let totalWinnings = 0;
      
      if (playerIds.length > 0) {
        const { data: transactions } = await supabase
          .from('game_transactions')
          .select('amount, transaction_type')
          .in('game_player_id', playerIds)
          .eq('transaction_type', 'payout');
        
        totalWinnings = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      }

      setStats({
        totalGames: gamePlayers?.length || 0,
        wins: gamePlayers?.filter(p => p.finish_position === 1).length || 0,
        totalWinnings,
        clubCount: clubMemberships?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!user || !newDisplayName.trim()) return;
    
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      onUserUpdated({ ...user, display_name: newDisplayName.trim() });
      setEditingName(false);
      toast({ title: 'Display name updated' });
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({ 
        title: t('common.error'), 
        description: 'Failed to update display name',
        variant: 'destructive' 
      });
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-send-password-reset', {
        body: { email: user.email },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      toast({ title: 'Password Reset Sent', description: `Reset email sent to ${user.email}` });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({ title: t('common.error'), description: 'Failed to send password reset', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const handleSubscriptionAction = async (action: 'grant_monthly' | 'grant_annual' | 'revoke') => {
    if (!user || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: { userId: user.id, action },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      // Refresh subscription data
      const { data: updatedSub } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, plan, trial_ends_at, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();

      onUserUpdated({ ...user, subscription: updatedSub });

      const messages = {
        grant_monthly: 'Monthly plan granted',
        grant_annual: 'Annual plan granted',
        revoke: 'Subscription revoked',
      };
      toast({ title: t('common.success'), description: messages[action] });
    } catch (error) {
      console.error('Error managing subscription:', error);
      toast({ title: t('common.error'), description: 'Failed to update subscription', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const confirmAction = () => {
    if (actionType === 'password_reset') {
      handlePasswordReset();
    } else if (actionType) {
      handleSubscriptionAction(actionType);
    }
  };

  const getSubscriptionBadge = () => {
    if (!user?.subscription) {
      return <Badge variant="outline" className="text-muted-foreground">No Subscription</Badge>;
    }

    const { status, trial_ends_at, current_period_end } = user.subscription;
    const now = new Date();

    if (status === 'trialing' && trial_ends_at && new Date(trial_ends_at) > now) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Trial</Badge>;
    }

    if (status === 'active' && current_period_end && new Date(current_period_end) > now) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
    }

    return <Badge variant="destructive">Expired</Badge>;
  };

  const getSubscriptionExpiry = () => {
    if (!user?.subscription) return null;
    const { current_period_end, trial_ends_at, status } = user.subscription;
    const date = status === 'trialing' ? trial_ends_at : current_period_end;
    if (!date) return null;
    return format(new Date(date), 'MMM d, yyyy');
  };

  const getActionDialogContent = () => {
    switch (actionType) {
      case 'password_reset':
        return { title: 'Send Password Reset?', description: `This will send a password reset email to ${user?.email}`, action: 'Send Reset Email' };
      case 'grant_monthly':
        return { title: 'Grant Free Monthly Plan?', description: `This will give ${user?.display_name} a free monthly subscription.`, action: 'Grant Monthly Plan' };
      case 'grant_annual':
        return { title: 'Grant Free Annual Plan?', description: `This will give ${user?.display_name} a free annual subscription.`, action: 'Grant Annual Plan' };
      case 'revoke':
        return { title: 'Revoke Subscription?', description: `This will remove ${user?.display_name}'s current subscription.`, action: 'Revoke Subscription' };
      default:
        return { title: '', description: '', action: '' };
    }
  };

  const dialogContent = getActionDialogContent();

  return (
    <>
      <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md p-0 [&>button]:hidden"
        >
          <SheetHeader className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-border/50">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">User Details</SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-5rem-env(safe-area-inset-top))]">
            {user && (
              <div className="p-4 space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <UserAvatar 
                    name={user.display_name} 
                    avatarUrl={user.avatar_url} 
                    size="lg" 
                    className="h-20 w-20 text-2xl"
                  />
                  
                  {editingName ? (
                    <div className="flex items-center gap-2 w-full max-w-[200px]">
                      <Input
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="text-center text-base"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={handleSaveDisplayName}
                        disabled={savingName}
                      >
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => {
                          setEditingName(false);
                          setNewDisplayName(user.display_name);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{user.display_name}</h2>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={() => setEditingName(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>

                  <div className="flex items-center gap-2">
                    {getSubscriptionBadge()}
                    {getSubscriptionExpiry() && (
                      <span className="text-xs text-muted-foreground">
                        Expires: {getSubscriptionExpiry()}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Member since {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Quick Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                          <Gamepad2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-lg font-bold">{stats.totalGames}</p>
                          <p className="text-[10px] text-muted-foreground">Games</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                          <Trophy className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-lg font-bold">{stats.wins}</p>
                          <p className="text-[10px] text-muted-foreground">Wins</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                          <Coins className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-lg font-bold">£{stats.totalWinnings}</p>
                          <p className="text-[10px] text-muted-foreground">Won</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-secondary/50">
                          <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-lg font-bold">{stats.clubCount}</p>
                          <p className="text-[10px] text-muted-foreground">Clubs</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Account</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActionType('password_reset')}
                      disabled={!user.email}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Send Password Reset
                    </Button>
                  </CardContent>
                </Card>

                {/* Subscription Actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActionType('grant_monthly')}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Grant Free Monthly
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setActionType('grant_annual')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Grant Free Annual
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => setActionType('revoke')}
                      disabled={!user.subscription}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Revoke Subscription
                    </Button>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-destructive">Danger Zone</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start opacity-50"
                      disabled
                    >
                      Ban User (coming soon)
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start opacity-50"
                      disabled
                    >
                      Delete Account (coming soon)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={(open) => !open && setActionType(null)}>
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
    </>
  );
}
