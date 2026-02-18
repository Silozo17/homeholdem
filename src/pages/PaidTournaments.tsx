import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trophy, Users, Clock, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/layout/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAppAdmin } from '@/hooks/useIsAppAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PaidTournamentAdmin } from '@/components/poker/PaidTournamentAdmin';
import { PaidTournamentDetail } from '@/components/poker/PaidTournamentDetail';
import { format } from 'date-fns';

export default function PaidTournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isAdmin } = useIsAppAdmin();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playerLevel, setPlayerLevel] = useState(1);

  const registered = searchParams.get('registered');

  useEffect(() => {
    if (registered) {
      toast({ title: "Registration pending", description: "Your payment is being confirmed." });
    }
  }, [registered]);

  useEffect(() => {
    fetchTournaments();
    if (user) fetchPlayerLevel();
  }, [user]);

  async function fetchTournaments() {
    const { data } = await supabase
      .from('paid_tournaments' as any)
      .select('*')
      .in('status', ['scheduled', 'running', 'complete'])
      .order('start_at', { ascending: true });
    setTournaments((data as any[]) || []);
    setLoading(false);
  }

  async function fetchPlayerLevel() {
    if (!user) return;
    const { data } = await supabase
      .from('player_xp')
      .select('level')
      .eq('user_id', user.id)
      .maybeSingle();
    setPlayerLevel(data?.level || 1);
  }

  async function handleRegister(tournamentId: string) {
    if (!user) { toast({ title: "Login required", variant: "destructive" }); return; }
    if (!isAdmin && playerLevel < 5) { toast({ title: "Level 5 required", description: `You are level ${playerLevel}`, variant: "destructive" }); return; }

    try {
      const { data, error } = await supabase.functions.invoke('paid-tournament-register', {
        body: { tournament_id: tournamentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, string> = {
      scheduled: 'bg-emerald-500/20 text-emerald-400',
      running: 'bg-amber-500/20 text-amber-400',
      complete: 'bg-muted text-muted-foreground',
    };
    return <Badge className={`${variants[status] || ''} text-[10px]`}>{status.toUpperCase()}</Badge>;
  }

  function estimatePrize(entryPence: number, maxPlayers: number) {
    const totalPence = entryPence * maxPlayers;
    const prize = Math.floor(totalPence * 5 / 9);
    return `£${(prize / 100).toFixed(2)}`;
  }

  if (selectedId) {
    return <PaidTournamentDetail
      tournamentId={selectedId}
      onBack={() => { setSelectedId(null); fetchTournaments(); }}
      isAdmin={isAdmin}
      playerLevel={playerLevel}
      onRegister={handleRegister}
    />;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden safe-area-bottom z-10 bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container relative flex items-center justify-center h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/poker')} className="absolute left-4 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <NotificationBell className="absolute right-4" />
        </div>
      </header>
      <div className="h-14 safe-area-top shrink-0" />

      <div className="flex-1 overflow-auto px-4 pt-4 space-y-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Paid Tournaments
            </h1>
            <p className="text-xs text-muted-foreground">Compete for real prizes</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Create
            </Button>
          )}
        </div>

        {playerLevel < 5 && !isAdmin && (
          <Card className="p-3 border-amber-500/30 bg-amber-500/10">
            <p className="text-xs text-amber-300">
              🔒 Level 5 required to register. You are level {playerLevel}. Keep playing to level up!
            </p>
          </Card>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No tournaments available yet.</div>
        ) : (
          <div className="space-y-3">
            {tournaments.map((t) => (
              <Card key={t.id} className="p-4 cursor-pointer hover:bg-card/80 transition" onClick={() => setSelectedId(t.id)}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
                  {getStatusBadge(t.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    Entry: £{(t.entry_fee_pence / 100).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-primary" />
                    Prize: {estimatePrize(t.entry_fee_pence, t.max_players)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Max: {t.max_players}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(t.start_at), 'dd MMM HH:mm')}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && isAdmin && (
        <PaidTournamentAdmin onClose={() => { setShowCreate(false); fetchTournaments(); }} />
      )}
    </div>
  );
}
