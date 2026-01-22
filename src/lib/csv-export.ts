interface PlayerStats {
  user_id: string;
  display_name: string;
  games_played: number;
  wins: number;
  total_buy_ins: number;
  total_winnings: number;
  net_profit: number;
}

interface GameHistoryRow {
  date: string;
  event_title: string;
  players: number;
  prize_pool: number;
  winner: string;
}

export function exportLeaderboardToCSV(stats: PlayerStats[], clubName: string) {
  const headers = ['Rank', 'Player', 'Games Played', 'Wins', 'Total Buy-ins', 'Total Winnings', 'Net Profit'];
  
  const rows = stats.map((player, index) => [
    index + 1,
    player.display_name,
    player.games_played,
    player.wins,
    player.total_buy_ins,
    player.total_winnings,
    player.net_profit,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  downloadCSV(csvContent, `${clubName}-leaderboard-${formatDate(new Date())}.csv`);
}

export function exportGameHistoryToCSV(games: GameHistoryRow[], clubName: string) {
  const headers = ['Date', 'Event', 'Players', 'Prize Pool', 'Winner'];
  
  const rows = games.map(game => [
    game.date,
    `"${game.event_title}"`,
    game.players,
    game.prize_pool,
    `"${game.winner}"`,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  downloadCSV(csvContent, `${clubName}-game-history-${formatDate(new Date())}.csv`);
}

export function exportSessionSummaryToCSV(
  sessionData: {
    eventTitle: string;
    date: string;
    players: Array<{
      name: string;
      buyIn: number;
      rebuys: number;
      addons: number;
      totalIn: number;
      payout: number;
      netResult: number;
      position: number | null;
    }>;
    totalPrizePool: number;
  },
  clubName: string
) {
  const headers = ['Position', 'Player', 'Buy-in', 'Rebuys', 'Add-ons', 'Total In', 'Payout', 'Net Result'];
  
  const sortedPlayers = [...sessionData.players].sort((a, b) => {
    if (a.position === null && b.position === null) return 0;
    if (a.position === null) return 1;
    if (b.position === null) return -1;
    return a.position - b.position;
  });

  const rows = sortedPlayers.map(player => [
    player.position || '-',
    `"${player.name}"`,
    player.buyIn,
    player.rebuys,
    player.addons,
    player.totalIn,
    player.payout,
    player.netResult,
  ]);

  const csvContent = [
    `Event: ${sessionData.eventTitle}`,
    `Date: ${sessionData.date}`,
    `Total Prize Pool: ${sessionData.totalPrizePool}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  downloadCSV(csvContent, `${clubName}-session-${formatDate(new Date(sessionData.date))}.csv`);
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
