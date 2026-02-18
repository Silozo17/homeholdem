import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Trophy, Users, Clock, Coins, Check, X, Play, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Props {
  tournamentId: string;
  onBack: () => void;
  isAdmin: boolean;
  playerLevel: number;
  onRegister: (id: string) => void;
}

export function PaidTournamentDetail({ tournamentId, onBack, isAdmin, playerLevel, onRegister }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<any>(null);
  const [regCount, setRegCount] = useState(0);
  const [myReg, setMyReg] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [myTableId, setMyTableId] = useState<string | null>(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);

  useEffect(() => { fetchData(); }, [tournamentId]);

  // Check registration countdown (closes 1 min before start)
  useEffect(() => {
    if (!tournament || tournament.status !== 'scheduled') return;
    const checkCutoff = () => {
      const timeLeft = new Date(tournament.start_at).getTime() - Date.now();
      setRegistrationClosed(timeLeft < 60 * 1000);
    };
    checkCutoff();
    const interval = setInterval(checkCutoff, 5000);
    return () => clearInterval(interval);
  }, [tournament]);

  // Find my table if tables are created
  useEffect(() => {
    if (!user || !tournament?.tables_created_at) return;
    async function findMyTable() {
      const { data: tables } = await supabase.from('poker_tables')
        .select('id')
        .eq('paid_tournament_id', tournamentId)
        .neq('status', 'closed');
      if (!tables || tables.length === 0) return;
      for (const table of tables) {
        const { data: seat } = await supabase.from('poker_seats')
          .select('id')
          .eq('table_id', table.id)
          .eq('player_id', user!.id)
          .maybeSingle();
        if (seat) { setMyTableId(table.id); return; }
      }
    }
    findMyTable();
  }, [user, tournament?.tables_created_at, tournamentId]);

  async function fetchData() {
    const [tRes, regRes, myRegRes, payRes] = await Promise.all([
      supabase.from('paid_tournaments' as any).select('*').eq('id', tournamentId).single(),
      supabase.from('paid_tournament_registrations' as any).select('id', { count: 'exact', head: true }).eq('tournament_id', tournamentId).in('status', ['pending', 'paid']),
      user ? supabase.from('paid_tournament_registrations' as any).select('*').eq('tournament_id', tournamentId).eq('user_id', user.id).maybeSingle() : { data: null },
      isAdmin ? supabase.from('paid_tournament_payouts' as any).select('*').eq('tournament_id', tournamentId).order('position') : { data: [] },
    ]);
    setTournament((tRes as any).data);
    setRegCount((regRes as any).count || 0);
    setMyReg((myRegRes as any).data);
    setPayouts(((payRes as any).data as any[]) || []);
    setLoading(false);
  }

  async function handlePublish() {
    const { data, error } = await supabase.functions.invoke('paid-tournament-manage', {
      body: { action: 'publish', tournament_id: tournamentId },
    });
    if (error || data?.error) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    toast({ title: "Published! Registration open." });
    fetchData();
  }

  async function handleCancel() {
    const { data, error } = await supabase.functions.invoke('paid-tournament-manage', {
      body: { action: 'cancel', tournament_id: tournamentId },
    });
    if (error || data?.error) { toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" }); return; }
    toast({ title: "Tournament cancelled" });
    fetchData();
  }

  async function handleMarkPaid(payoutId: string) {
    const { data, error } = await supabase.functions.invoke('paid-tournament-manage', {
      body: { action: 'mark_payout_paid', tournament_id: tournamentId, payout_id: payoutId, notes: payoutNotes },
    });
    if (error || data?.error) { toast({ title: "Error", variant: "destructive" }); return; }
    toast({ title: "Payout marked as paid" });
    setPayoutNotes('');
    fetchData();
  }

  if (loading || !tournament) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;

  const totalPaidPence = regCount * tournament.entry_fee_pence;
  const prizePool = Math.floor(totalPaidPence * 5 / 9);
  const presetLabels: Record<string, string> = {
    winner_takes_all: 'Winner Takes All (100%)',
    top_2: 'Top 2 (70% / 30%)',
    top_3: 'Top 3 (60% / 30% / 10%)',
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden safe-area-bottom z-10 bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-bold text-foreground text-sm truncate max-w-[60%]">{tournament.name}</span>
        </div>
      </header>
      <div className="h-14 safe-area-top shrink-0" />

      <div className="flex-1 overflow-auto px-4 pt-4 space-y-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Status & Info */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={`text-[10px] ${tournament.status === 'running' ? 'bg-amber-500/20 text-amber-400' : tournament.status === 'scheduled' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {tournament.status.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(tournament.start_at), 'dd MMM yyyy HH:mm')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Coins className="h-3.5 w-3.5" /> Entry: £{(tournament.entry_fee_pence / 100).toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <Trophy className="h-3.5 w-3.5" /> Prize: £{(prizePool / 100).toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {regCount} / {tournament.max_players}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Blinds: {tournament.blind_interval_minutes}m
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground">
            Payout: {presetLabels[tournament.payout_preset] || tournament.payout_preset}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Blinds: {tournament.starting_sb}/{tournament.starting_bb} • Stack: {tournament.starting_stack.toLocaleString()}
          </div>
          {tournament.status === 'running' && tournament.current_blind_level > 0 && (
            <div className="text-[10px] text-amber-400">
              Current Level {tournament.current_blind_level}: {tournament.starting_sb * Math.pow(2, tournament.current_blind_level - 1)}/{tournament.starting_bb * Math.pow(2, tournament.current_blind_level - 1)}
            </div>
          )}
        </Card>

        {/* Registration */}
        {tournament.status === 'scheduled' && (
          <Card className="p-4 space-y-3">
            {myReg?.status === 'paid' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Check className="h-4 w-4" /> You are registered!
                </div>
                {myTableId && (
                  <Button className="w-full gap-2" onClick={() => navigate(`/poker/table/${myTableId}`)}>
                    <LogIn className="h-4 w-4" /> Join Table
                  </Button>
                )}
              </div>
            ) : myReg?.status === 'pending' ? (
              <div className="text-amber-400 text-sm">Payment pending...</div>
            ) : (
              <>
                {registrationClosed && (
                  <div className="text-xs text-destructive">Registration closed (less than 1 min before start)</div>
                )}
                <Button
                  className="w-full"
                  onClick={() => onRegister(tournamentId)}
                  disabled={(!isAdmin && playerLevel < 5) || regCount >= tournament.max_players || registrationClosed}
                >
                  {registrationClosed ? 'Registration Closed' :
                    (!isAdmin && playerLevel < 5) ? `Level 5 Required (Lvl ${playerLevel})` :
                      regCount >= tournament.max_players ? 'Tournament Full' :
                        `Register — £${(tournament.entry_fee_pence / 100).toFixed(2)}`}
                </Button>
              </>
            )}
          </Card>
        )}

        {/* Running tournament - Join Table */}
        {tournament.status === 'running' && myTableId && (
          <Card className="p-4">
            <Button className="w-full gap-2" onClick={() => navigate(`/poker/table/${myTableId}`)}>
              <LogIn className="h-4 w-4" /> Go to My Table
            </Button>
          </Card>
        )}

        {/* Admin Controls */}
        {isAdmin && (
          <Card className="p-4 space-y-3 border-primary/30">
            <h3 className="text-sm font-semibold text-foreground">Admin Controls</h3>
            <div className="flex gap-2 flex-wrap">
              {tournament.status === 'draft' && (
                <Button size="sm" onClick={handlePublish} className="gap-1">
                  <Play className="h-3 w-3" /> Publish
                </Button>
              )}
              {['draft', 'scheduled', 'running'].includes(tournament.status) && (
                <Button size="sm" variant="destructive" onClick={handleCancel} className="gap-1">
                  <X className="h-3 w-3" /> Cancel
                </Button>
              )}
            </div>

            {/* Payouts */}
            {payouts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Payouts</h4>
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded p-2">
                    <div className="text-xs">
                      <span className="text-foreground">#{p.position}</span>
                      <span className="text-muted-foreground ml-2">£{(p.amount_pence / 100).toFixed(2)}</span>
                      {p.status === 'paid' && <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 text-[9px]">PAID</Badge>}
                    </div>
                    {p.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Textarea
                          className="h-6 text-[10px] w-24"
                          placeholder="Notes"
                          value={payoutNotes}
                          onChange={e => setPayoutNotes(e.target.value)}
                        />
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleMarkPaid(p.id)}>
                          Mark Paid
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
