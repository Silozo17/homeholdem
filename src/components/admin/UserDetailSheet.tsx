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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Calendar as CalendarIcon, 
  Pencil, 
  Check,
  Trophy,
  Gamepad2,
  Coins,
  Users,
  Loader2,
  XCircle,
  CreditCard,
  ChevronDown,
  RefreshCw,
  Ban,
  Clock,
  Trash2,
  ShieldOff,
  AlertTriangle
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

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  refunded: boolean;
  amount_refunded: number;
  created: number;
  description: string | null;
  payment_intent: string | null;
}

interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  items: { id: string; price: { id: string; unit_amount: number | null; currency: string; recurring: unknown } }[];
}

interface BanRecord {
  id: string;
  user_id: string;
  banned_at: string;
  banned_by: string | null;
  reason: string | null;
  type: string;
  expires_at: string | null;
}

interface UserDetailSheetProps {
  user: UserWithSubscription | null;
  onClose: () => void;
  onUserUpdated: (user: UserWithSubscription) => void;
}

type ActionType = 
  | 'password_reset' 
  | 'grant_monthly' 
  | 'grant_annual' 
  | 'revoke'
  | 'ban_user'
  | 'suspend_user'
  | 'unban_user'
  | 'delete_account'
  | 'cancel_stripe_subscription'
  | 'issue_refund'
  | null;

export function UserDetailSheet({ user, onClose, onUserUpdated }: UserDetailSheetProps) {
  const { t } = useTranslation();
  const { session } = useAuth();
  
  const [stats, setStats] = useState<UserStats>({ totalGames: 0, wins: 0, totalWinnings: 0, clubCount: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  
  const [actionType, setActionType] = useState<ActionType>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stripe state
  const [stripeOpen, setStripeOpen] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [charges, setCharges] = useState<StripeCharge[]>([]);
  const [stripeSubscriptions, setStripeSubscriptions] = useState<StripeSubscription[]>([]);
  const [selectedCharge, setSelectedCharge] = useState<StripeCharge | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [selectedStripeSubId, setSelectedStripeSubId] = useState<string | null>(null);

  // Ban state
  const [banRecord, setBanRecord] = useState<BanRecord | null>(null);
  const [banReason, setBanReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState<Date | undefined>();

  // Fetch user stats and ban status when user changes
  useEffect(() => {
    if (!user) return;
    
    setNewDisplayName(user.display_name);
    fetchUserStats(user.id);
    checkBanStatus(user.id);
    // Reset stripe data
    setCharges([]);
    setStripeSubscriptions([]);
    setStripeOpen(false);
  }, [user?.id]);

  const fetchUserStats = async (userId: string) => {
    setLoadingStats(true);
    try {
      const { data: gamePlayers } = await supabase
        .from('game_players')
        .select('id, finish_position')
        .eq('user_id', userId);

      const { data: clubMemberships } = await supabase
        .from('club_members')
        .select('id')
        .eq('user_id', userId);

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

  const checkBanStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('banned_users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setBanRecord(data);
    } catch (error) {
      console.error('Error checking ban status:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user?.email || !session?.access_token) return;
    
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-stripe-operations', {
        body: { action: 'get_payment_history', userEmail: user.email },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setCharges(data.charges || []);
      setStripeSubscriptions(data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast({ title: t('common.error'), description: 'Failed to load payment history', variant: 'destructive' });
    } finally {
      setLoadingPayments(false);
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
      toast({ title: t('common.error'), description: 'Failed to update display name', variant: 'destructive' });
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

  const handleCancelStripeSubscription = async () => {
    if (!selectedStripeSubId || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-stripe-operations', {
        body: { action: 'cancel_subscription', subscriptionId: selectedStripeSubId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      toast({ title: 'Subscription Canceled', description: 'Stripe subscription has been canceled' });
      
      // Refresh payment history
      await fetchPaymentHistory();
      
      // Also refresh local subscription
      const { data: updatedSub } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, plan, trial_ends_at, current_period_end')
        .eq('user_id', user!.id)
        .maybeSingle();
      onUserUpdated({ ...user!, subscription: updatedSub });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({ title: t('common.error'), description: 'Failed to cancel subscription', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setActionType(null);
      setSelectedStripeSubId(null);
    }
  };

  const handleIssueRefund = async () => {
    if (!selectedCharge || !session?.access_token) return;

    setActionLoading(true);
    try {
      const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
      
      const { error } = await supabase.functions.invoke('admin-stripe-operations', {
        body: { 
          action: 'create_refund', 
          chargeId: selectedCharge.id,
          amount: amountCents 
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      toast({ title: 'Refund Issued', description: 'The refund has been processed' });
      await fetchPaymentHistory();
    } catch (error) {
      console.error('Error issuing refund:', error);
      toast({ title: t('common.error'), description: 'Failed to issue refund', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setActionType(null);
      setSelectedCharge(null);
      setRefundAmount('');
    }
  };

  const handleBanAction = async (action: 'ban' | 'suspend' | 'unban') => {
    if (!user || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-ban-user', {
        body: { 
          userId: user.id, 
          action,
          reason: banReason || undefined,
          expiresAt: action === 'suspend' && suspendUntil ? suspendUntil.toISOString() : undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      const messages = {
        ban: 'User has been banned',
        suspend: 'User has been suspended',
        unban: 'User has been unbanned',
      };
      toast({ title: t('common.success'), description: messages[action] });
      
      await checkBanStatus(user.id);
      setBanReason('');
      setSuspendUntil(undefined);
    } catch (error) {
      console.error('Error managing ban:', error);
      toast({ title: t('common.error'), description: 'Failed to update ban status', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!user || !session?.access_token) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: user.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      toast({ title: 'Account Deleted', description: 'The user account has been permanently deleted' });
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({ title: t('common.error'), description: 'Failed to delete account', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const confirmAction = () => {
    switch (actionType) {
      case 'password_reset':
        handlePasswordReset();
        break;
      case 'grant_monthly':
      case 'grant_annual':
      case 'revoke':
        handleSubscriptionAction(actionType);
        break;
      case 'cancel_stripe_subscription':
        handleCancelStripeSubscription();
        break;
      case 'issue_refund':
        handleIssueRefund();
        break;
      case 'ban_user':
        handleBanAction('ban');
        break;
      case 'suspend_user':
        handleBanAction('suspend');
        break;
      case 'unban_user':
        handleBanAction('unban');
        break;
      case 'delete_account':
        handleDeleteUser();
        break;
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
      case 'cancel_stripe_subscription':
        return { title: 'Cancel Stripe Subscription?', description: 'This will immediately cancel the subscription in Stripe. The user will lose access.', action: 'Cancel Subscription' };
      case 'issue_refund':
        return { 
          title: 'Issue Refund?', 
          description: refundAmount 
            ? `This will refund £${refundAmount} for charge ${selectedCharge?.id.slice(-8)}`
            : `This will issue a full refund (£${((selectedCharge?.amount || 0) - (selectedCharge?.amount_refunded || 0)) / 100}) for charge ${selectedCharge?.id.slice(-8)}`,
          action: 'Issue Refund'
        };
      case 'ban_user':
        return { title: 'Ban User?', description: `This will permanently ban ${user?.display_name} from accessing the app.`, action: 'Ban User' };
      case 'suspend_user':
        return { title: 'Suspend User?', description: `This will temporarily suspend ${user?.display_name} until ${suspendUntil ? format(suspendUntil, 'MMM d, yyyy') : 'the specified date'}.`, action: 'Suspend User' };
      case 'unban_user':
        return { title: 'Unban User?', description: `This will remove the ban on ${user?.display_name} and restore their access.`, action: 'Unban User' };
      case 'delete_account':
        return { title: 'Delete Account?', description: `This will PERMANENTLY DELETE ${user?.display_name}'s account and all associated data. This cannot be undone!`, action: 'Delete Account' };
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
                {/* Ban Alert */}
                {banRecord && (
                  <Card className="border-destructive bg-destructive/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Ban className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-destructive">
                            {banRecord.type === 'suspend' ? 'User Suspended' : 'User Banned'}
                          </p>
                          {banRecord.reason && (
                            <p className="text-sm text-muted-foreground mt-1">Reason: {banRecord.reason}</p>
                          )}
                          {banRecord.expires_at && (
                            <p className="text-sm text-muted-foreground">
                              Until: {format(new Date(banRecord.expires_at), 'MMM d, yyyy HH:mm')}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Since {format(new Date(banRecord.banned_at), 'MMM d, yyyy')}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => setActionType('unban_user')}
                          >
                            <ShieldOff className="h-3 w-3 mr-1" />
                            Unban User
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                      <Button size="icon" variant="ghost" onClick={handleSaveDisplayName} disabled={savingName}>
                        {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingName(false); setNewDisplayName(user.display_name); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{user.display_name}</h2>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">{user.email || 'No email'}</p>

                  <div className="flex items-center gap-2">
                    {getSubscriptionBadge()}
                    {getSubscriptionExpiry() && (
                      <span className="text-xs text-muted-foreground">Expires: {getSubscriptionExpiry()}</span>
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

                {/* Stripe Payments */}
                <Collapsible open={stripeOpen} onOpenChange={setStripeOpen}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-2 cursor-pointer hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Stripe Payments
                          </CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${stripeOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={fetchPaymentHistory}
                          disabled={loadingPayments || !user.email}
                        >
                          {loadingPayments ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          {charges.length > 0 ? 'Refresh' : 'Load Payment History'}
                        </Button>

                        {charges.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Recent Charges</p>
                            {charges.slice(0, 5).map((charge) => (
                              <div key={charge.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-sm">
                                <div>
                                  <p className="font-medium">
                                    {(charge.currency === 'gbp' ? '£' : charge.currency.toUpperCase() + ' ')}{(charge.amount / 100).toFixed(2)}
                                    {charge.refunded && <Badge variant="outline" className="ml-2 text-[10px]">Refunded</Badge>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(charge.created * 1000), 'MMM d, yyyy')}
                                  </p>
                                </div>
                                {!charge.refunded && charge.amount > charge.amount_refunded && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => { setSelectedCharge(charge); setActionType('issue_refund'); }}
                                  >
                                    Refund
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {stripeSubscriptions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Subscriptions</p>
                            {stripeSubscriptions.map((sub) => (
                              <div key={sub.id} className="p-2 rounded bg-secondary/30 text-sm">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium flex items-center gap-2">
                                      {sub.items[0]?.price.unit_amount 
                                        ? `£${(sub.items[0].price.unit_amount / 100).toFixed(2)}/mo`
                                        : 'Custom plan'}
                                      <Badge 
                                        className={
                                          sub.status === 'active' 
                                            ? 'bg-green-500/20 text-green-400' 
                                            : 'bg-muted text-muted-foreground'
                                        }
                                      >
                                        {sub.status}
                                      </Badge>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {sub.status === 'active' && `Renews: ${format(new Date(sub.current_period_end * 1000), 'MMM d, yyyy')}`}
                                      {sub.canceled_at && `Canceled: ${format(new Date(sub.canceled_at * 1000), 'MMM d, yyyy')}`}
                                    </p>
                                  </div>
                                  {sub.status === 'active' && !sub.cancel_at_period_end && (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => { setSelectedStripeSubId(sub.id); setActionType('cancel_stripe_subscription'); }}
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {charges.length === 0 && stripeSubscriptions.length === 0 && !loadingPayments && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No Stripe data found
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

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
                    <Button variant="outline" className="w-full justify-start" onClick={() => setActionType('grant_monthly')}>
                      <Gift className="h-4 w-4 mr-2" />
                      Grant Free Monthly
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setActionType('grant_annual')}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
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
                {!banRecord && (
                  <Card className="border-destructive/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
                        <Textarea 
                          placeholder="Enter reason for ban/suspension..."
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          className="min-h-[60px]"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setActionType('ban_user')}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Ban
                        </Button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="flex-1">
                              <Clock className="h-4 w-4 mr-2" />
                              Suspend
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={suspendUntil}
                              onSelect={(date) => {
                                setSuspendUntil(date);
                                if (date) setActionType('suspend_user');
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => setActionType('delete_account')}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </CardContent>
                  </Card>
                )}
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
          
          {actionType === 'issue_refund' && (
            <div className="py-2">
              <Label className="text-sm">Refund Amount (leave empty for full refund)</Label>
              <Input 
                type="number" 
                step="0.01"
                placeholder={`Full: £${((selectedCharge?.amount || 0) - (selectedCharge?.amount_refunded || 0)) / 100}`}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction} 
              disabled={actionLoading}
              className={actionType === 'delete_account' || actionType === 'ban_user' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
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
