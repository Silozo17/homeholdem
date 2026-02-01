import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClubCurrency } from '@/hooks/useClubCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wallet, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Settlement {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  is_settled: boolean;
  settled_at: string | null;
  game_session_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Member {
  user_id: string;
  display_name: string;
}

interface PaymentLedgerProps {
  clubId: string;
  isAdmin: boolean;
}

export function PaymentLedger({ clubId, isAdmin }: PaymentLedgerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { symbol } = useClubCurrency(clubId);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [clubId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch settlements
    const { data: settlementsData } = await supabase
      .from('settlements')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (settlementsData) {
      setSettlements(settlementsData);
    }

    // Fetch members
    const { data: membersData } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId);

    if (membersData) {
      const userIds = membersData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      if (profiles) {
        setMembers(profiles.map(p => ({ user_id: p.id, display_name: p.display_name })));
      }
    }

    setLoading(false);
  };

  const handleAddSettlement = async () => {
    if (!fromUserId || !toUserId || !amountInput || fromUserId === toUserId) {
      toast.error(t('settlements_section.fill_fields'));
      return;
    }

    const parsedAmount = parseInt(amountInput) || 0;
    if (parsedAmount <= 0) {
      toast.error(t('settlements_section.fill_fields'));
      return;
    }

    const { error } = await supabase
      .from('settlements')
      .insert({
        club_id: clubId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount: parsedAmount,
        notes: notes || null,
      });

    if (error) {
      toast.error(t('settlements_section.failed_add'));
      return;
    }

    toast.success(t('settlements_section.added'));
    setShowAdd(false);
    setFromUserId('');
    setToUserId('');
    setAmountInput('');
    setNotes('');
    fetchData();
  };

  const handleMarkSettled = async (settlementId: string) => {
    const { error } = await supabase
      .from('settlements')
      .update({ 
        is_settled: true, 
        settled_at: new Date().toISOString(),
        settled_by: user?.id 
      })
      .eq('id', settlementId);

    if (error) {
      toast.error(t('settlements_section.failed_mark_settled'));
      return;
    }

    toast.success(t('settlements_section.marked_paid'));
    fetchData();
  };

  const handleDelete = async (settlementId: string) => {
    const { error } = await supabase
      .from('settlements')
      .delete()
      .eq('id', settlementId);

    if (error) {
      toast.error(t('settlements_section.failed_delete'));
      return;
    }

    toast.success(t('settlements_section.deleted'));
    fetchData();
  };

  const getMemberName = (userId: string) => {
    return members.find(m => m.user_id === userId)?.display_name || 'Unknown';
  };

  // Calculate net balances
  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    
    // Initialize all members with 0
    members.forEach(m => { balances[m.user_id] = 0; });

    // Only count unsettled debts
    settlements
      .filter(s => !s.is_settled)
      .forEach(s => {
        balances[s.from_user_id] = (balances[s.from_user_id] || 0) - s.amount;
        balances[s.to_user_id] = (balances[s.to_user_id] || 0) + s.amount;
      });

    return Object.entries(balances)
      .map(([userId, balance]) => ({ userId, balance, name: getMemberName(userId) }))
      .filter(b => b.balance !== 0)
      .sort((a, b) => b.balance - a.balance);
  };

  const balances = calculateBalances();
  const pendingSettlements = settlements.filter(s => !s.is_settled);
  const settledSettlements = settlements.filter(s => s.is_settled);

  if (loading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8">
          <div className="animate-pulse text-center text-muted-foreground">{t('settlements_section.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t('settlements_section.title')}
            </CardTitle>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('common.add')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Net Balances */}
          {balances.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('settlements_section.net_balances')}</p>
              <div className="space-y-1">
                {balances.map(b => (
                  <div key={b.userId} className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-lg">
                    <span className="font-medium">{b.name}</span>
                    <Badge variant={b.balance > 0 ? 'default' : 'destructive'}>
                      {b.balance > 0 ? `${t('settlements_section.owed')} ${symbol}${b.balance}` : `${t('settlements_section.owes')} ${symbol}${Math.abs(b.balance)}`}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Settlements */}
          {pendingSettlements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('settlements_section.pending')}</p>
              <div className="space-y-2">
                {pendingSettlements.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{getMemberName(s.from_user_id)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getMemberName(s.to_user_id)}</span>
                      <Badge variant="outline" className="ml-2">{symbol}{s.amount}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleMarkSettled(s.id)}>
                          <Check className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settled */}
          {settledSettlements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('settlements_section.settled')}</p>
              <div className="space-y-1">
                {settledSettlements.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg opacity-60">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{getMemberName(s.from_user_id)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{getMemberName(s.to_user_id)}</span>
                      <span className="text-muted-foreground">{symbol}{s.amount}</span>
                    </div>
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {settlements.length === 0 && (
            <div className="text-center py-6">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                {t('settlements_section.no_settlements')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Settlement Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settlements_section.add_settlement')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('settlements_section.from_label')}</Label>
              <Select value={fromUserId} onValueChange={setFromUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settlements_section.select_player')} />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('settlements_section.to_label')}</Label>
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('settlements_section.select_player')} />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('settlements_section.amount')} ({symbol})</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amountInput}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^\d*$/.test(value)) {
                    setAmountInput(value);
                  }
                }}
                onBlur={() => {
                  if (amountInput === '') setAmountInput('');
                }}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settlements_section.notes')}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('settlements_section.notes_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddSettlement}>{t('settlements_section.add_settlement')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
