import db from '../database/sqlite.js';

// Get mining leaderboard
export function getMiningLeaderboard(limit = 10) {
  return db.getMiningLeaderboard(limit);
}

// Get balance leaderboard
export function getBalanceLeaderboard(limit = 10) {
  return db.getBalanceLeaderboard(limit);
}

// Get weekly leaderboard
export function getWeeklyLeaderboard(limit = 10) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyData = {};

  db.data.transactions
    .filter(t => new Date(t.created_at) >= weekAgo && ['mining', 'ai_task', 'referral'].includes(t.type))
    .forEach(t => {
      if (!weeklyData[t.user_id]) {
        weeklyData[t.user_id] = 0;
      }
      weeklyData[t.user_id] += t.amount;
    });

  return Object.entries(weeklyData)
    .map(([userId, amount]) => {
      const user = db.findUserById(parseInt(userId));
      return {
        id: user?.id,
        username: user?.username,
        first_name: user?.first_name,
        weekly_earned: amount
      };
    })
    .filter(u => u.id)
    .sort((a, b) => b.weekly_earned - a.weekly_earned)
    .slice(0, limit);
}

// Get user rank
export function getUserRank(userId, type = 'mining') {
  return db.getUserRank(userId, type);
}

// Format leaderboard
export function formatLeaderboard(leaderboard, type = 'mining') {
  if (!leaderboard || leaderboard.length === 0) {
    return '📊 Brak danych w rankingu.';
  }

  const medals = ['🥇', '🥈', '🥉'];
  let text = '';

  if (type === 'mining') {
    text = '⛏️ *Ranking Miners:*\n\n';
  } else if (type === 'balance') {
    text = '💰 *Ranking Balansów:*\n\n';
  } else if (type === 'weekly') {
    text = '📅 *Ranking Tygodniowy:*\n\n';
  }

  leaderboard.forEach((user, index) => {
    const medal = medals[index] || `${index + 1}.`;
    const name = user.username ? `@${user.username}` : (user.first_name || 'Anonim');

    if (type === 'mining') {
      text += `${medal} *${name}*\n`;
      text += `   ⛏️ Wykopane: ${user.total_mined.toFixed(2)} AET\n`;
      text += `   💰 Saldo: ${user.balance.toFixed(2)} AET\n\n`;
    } else if (type === 'balance') {
      text += `${medal} *${name}*\n`;
      text += `   💰 Saldo: ${user.balance.toFixed(2)} AET\n`;
      text += `   ⛏️ Wykopane: ${user.total_mined.toFixed(2)} AET\n\n`;
    } else if (type === 'weekly') {
      text += `${medal} *${name}*\n`;
      text += `   📈 Tydzień: +${user.weekly_earned.toFixed(2)} AET\n\n`;
    }
  });

  return text;
}