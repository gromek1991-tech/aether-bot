import db from '../database/sqlite.js';

// Game configuration
const GAME_CONFIG = {
  baseReward: 0.1,           // Base reward per tap
  maxEnergy: 100,            // Max energy
  energyRegenRate: 1,        // Energy regen per minute
  tapCooldown: 1000,         // 1 second between taps
  comboMultiplier: 1.5,      // Combo bonus
  comboWindow: 5000,         // 5 seconds for combo
  dailyBonus: 10,            // Daily login bonus
  streakBonus: 2,            // Bonus per day streak
  maxStreak: 7               // Max streak days
};

// Active game sessions
const activeSessions = new Map();

// Start game session
export function startGameSession(telegramId) {
  const user = db.findUser(telegramId);
  if (!user) return null;

  // Check energy
  const energy = getUserEnergy(user.id);
  
  const session = {
    userId: user.id,
    telegramId,
    taps: 0,
    combo: 0,
    lastTapTime: 0,
    energy: energy.current,
    startTime: Date.now()
  };

  activeSessions.set(telegramId, session);
  return session;
}

// Get user energy
export function getUserEnergy(userId) {
  const user = db.findUserById(userId);
  if (!user) return { current: 0, max: GAME_CONFIG.maxEnergy };

  // Calculate energy based on last active time
  const lastActive = user.last_mined ? new Date(user.last_mined).getTime() : Date.now();
  const minutesSinceActive = (Date.now() - lastActive) / (1000 * 60);
  const energyRegen = Math.floor(minutesSinceActive * GAME_CONFIG.energyRegenRate);
  
  const currentEnergy = Math.min(
    (user.energy || 0) + energyRegen,
    GAME_CONFIG.maxEnergy
  );

  return {
    current: currentEnergy,
    max: GAME_CONFIG.maxEnergy,
    regenRate: GAME_CONFIG.energyRegenRate
  };
}

// Process tap
export function processTap(telegramId) {
  const session = activeSessions.get(telegramId);
  if (!session) {
    return { success: false, message: '❌ Najpierw rozpocznij grę: /play' };
  }

  const now = Date.now();
  const timeSinceLastTap = now - session.lastTapTime;

  // Check cooldown
  if (timeSinceLastTap < GAME_CONFIG.tapCooldown) {
    return { success: false, message: '⏳ Za szybko! Poczekaj chwilę.' };
  }

  // Check energy
  if (session.energy <= 0) {
    return { success: false, message: '⚡ Brak energii! Poczekaj na regenerację.' };
  }

  // Calculate reward
  let reward = GAME_CONFIG.baseReward;
  let comboText = '';

  // Combo system
  if (timeSinceLastTap < GAME_CONFIG.comboWindow) {
    session.combo++;
    if (session.combo > 1) {
      reward *= Math.pow(GAME_CONFIG.comboMultiplier, Math.min(session.combo - 1, 5));
      comboText = ` 🔥 Combo x${session.combo}!`;
    }
  } else {
    session.combo = 1;
  }

  // Update session
  session.taps++;
  session.energy--;
  session.lastTapTime = now;

  // Add to balance
  const user = db.findUserById(session.userId);
  const newBalance = user.balance + reward;
  const newTotalMined = user.total_mined + reward;
  
  db.updateUser(session.userId, {
    balance: newBalance,
    total_mined: newTotalMined,
    energy: session.energy,
    last_mined: new Date().toISOString()
  });

  // Record transaction
  db.createTransaction(session.userId, 'tap', reward, newBalance, `Tap #${session.taps}`);

  // Check achievements
  checkTapAchievements(session.userId, session.taps);

  // Energy bar
  const energyPercent = Math.floor((session.energy / GAME_CONFIG.maxEnergy) * 100);
  const energyBar = '⚡'.repeat(Math.floor(energyPercent / 10)) + '░'.repeat(10 - Math.floor(energyPercent / 10));

  return {
    success: true,
    reward: reward.toFixed(3),
    combo: session.combo,
    taps: session.taps,
    energy: session.energy,
    maxEnergy: GAME_CONFIG.maxEnergy,
    energyBar,
    comboText,
    message: `👆 Tap! +${reward.toFixed(3)} AET${comboText}\n\n⚡ Energia: ${energyBar} ${session.energy}/${GAME_CONFIG.maxEnergy}\n🔢 Taps: ${session.taps}`
  };
}

// Get game status
export function getGameStatus(telegramId) {
  const session = activeSessions.get(telegramId);
  const user = db.findUser(telegramId);
  
  if (!user) {
    return { active: false, message: '❌ Nie zalogowano.' };
  }

  const energy = getUserEnergy(user.id);

  if (!session) {
    return {
      active: false,
      balance: user.balance.toFixed(2),
      totalTaps: user.total_taps || 0,
      energy: energy.current,
      maxEnergy: energy.max,
      message: `🎮 AETHER Tap Game\n\n💰 Saldo: ${user.balance.toFixed(2)} AET\n⚡ Energia: ${energy.current}/${energy.max}\n\n🎮 Aby rozpocząć: /play`
    };
  }

  const energyPercent = Math.floor((session.energy / GAME_CONFIG.maxEnergy) * 100);
  const energyBar = '⚡'.repeat(Math.floor(energyPercent / 10)) + '░'.repeat(10 - Math.floor(energyPercent / 10));

  return {
    active: true,
    balance: user.balance.toFixed(2),
    taps: session.taps,
    combo: session.combo,
    energy: session.energy,
    maxEnergy: GAME_CONFIG.maxEnergy,
    energyBar,
    message: `🎮 AETHER Tap Game\n\n💰 Saldo: ${user.balance.toFixed(2)} AET\n🔢 Taps: ${session.taps}\n🔥 Combo: x${session.combo}\n⚡ Energia: ${energyBar} ${session.energy}/${session.maxEnergy}\n\n👆 Klikaj: /tap`
  };
}

// Stop game session
export function stopGameSession(telegramId) {
  const session = activeSessions.get(telegramId);
  if (session) {
    activeSessions.delete(telegramId);
    return {
      success: true,
      message: `🎮 Gra zakończona!\n\n🔢 Taps: ${session.taps}\n💰 Zarobione: ${(session.taps * GAME_CONFIG.baseReward).toFixed(2)} AET`
    };
  }
  return { success: false, message: '❌ Nie aktywna gra.' };
}

// Get daily bonus
export function claimDailyBonus(telegramId) {
  const user = db.findUser(telegramId);
  if (!user) return { success: false, message: '❌ Nie zalogowano.' };

  const today = new Date().toISOString().split('T')[0];
  const lastBonus = user.last_daily_bonus;

  if (lastBonus === today) {
    return { success: false, message: '❌ Dzienny bonus już odebrany! Wróć jutro.' };
  }

  // Calculate streak
  let streak = 1;
  if (lastBonus) {
    const lastDate = new Date(lastBonus);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak = (user.daily_streak || 0) + 1;
    } else if (diffDays > 1) {
      streak = 1;
    }
  }

  streak = Math.min(streak, GAME_CONFIG.maxStreak);
  const bonus = GAME_CONFIG.dailyBonus + (streak - 1) * GAME_CONFIG.streakBonus;

  // Add bonus
  const newBalance = user.balance + bonus;
  db.updateUser(user.id, {
    balance: newBalance,
    last_daily_bonus: today,
    daily_streak: streak
  });

  // Record transaction
  db.createTransaction(user.id, 'daily_bonus', bonus, newBalance, `Daily bonus (streak: ${streak})`);

  const streakBar = '🔥'.repeat(streak) + '⬜'.repeat(GAME_CONFIG.maxStreak - streak);

  return {
    success: true,
    bonus,
    streak,
    newBalance,
    message: `🎁 Dzienny Bonus!\n\n💰 Bonus: +${bonus} AET\n🔥 Streak: ${streakBar} ${streak}/${GAME_CONFIG.maxStreak}\n📊 Nowe saldo: ${newBalance.toFixed(2)} AET`
  };
}

// Check tap achievements
function checkTapAchievements(userId, totalTaps) {
  const achievements = [
    { name: 'First Tap', threshold: 1, type: 'tap_first' },
    { name: '100 Taps', threshold: 100, type: 'tap_100' },
    { name: '1000 Taps', threshold: 1000, type: 'tap_1000' },
    { name: '10000 Taps', threshold: 10000, type: 'tap_10000' }
  ];

  for (const achievement of achievements) {
    if (totalTaps >= achievement.threshold) {
      db.createAchievement(userId, achievement.type, achievement.name);
    }
  }
}

// Get game leaderboard
export function getTapLeaderboard(limit = 10) {
  return db.data.users
    .filter(u => (u.total_taps || 0) > 0)
    .sort((a, b) => (b.total_taps || 0) - (a.total_taps || 0))
    .slice(0, limit)
    .map((u, i) => ({
      rank: i + 1,
      username: u.username || u.first_name || 'Anonim',
      taps: u.total_taps || 0,
      balance: u.balance.toFixed(2)
    }));
}

// Format leaderboard
export function formatTapLeaderboard(leaderboard) {
  if (!leaderboard || leaderboard.length === 0) {
    return '📊 Brak danych w rankingu tapów.';
  }

  const medals = ['🥇', '🥈', '🥉'];
  let text = '👆 *Ranking Tapów:*\n\n';

  leaderboard.forEach((user, index) => {
    const medal = medals[index] || `${index + 1}.`;
    text += `${medal} *${user.username}*\n`;
    text += `   👆 Taps: ${user.taps}\n`;
    text += `   💰 Saldo: ${user.balance} AET\n\n`;
  });

  return text;
}

export default {
  GAME_CONFIG,
  startGameSession,
  processTap,
  getGameStatus,
  stopGameSession,
  claimDailyBonus,
  getTapLeaderboard,
  formatTapLeaderboard,
  getUserEnergy
};
