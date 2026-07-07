import db from '../database/sqlite.js';

const MINING_INTERVAL_MS = (process.env.MINING_INTERVAL_HOURS || 4) * 60 * 60 * 1000;
const MAX_OFFLINE_MS = (process.env.MAX_OFFLINE_HOURS || 8) * 60 * 60 * 1000;
const BASE_MINING_RATE = parseFloat(process.env.MINING_RATE || 1);

// Generate unique referral code
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (db.findUserByReferralCode?.(code));
  return code;
}

// Get user or create new one
export function getOrCreateUser(telegramId, username = null, firstName = null) {
  let user = db.findUser(telegramId);

  if (!user) {
    const referralCode = generateReferralCode();
    user = db.createUser(telegramId, username, firstName, referralCode);
  }

  return user;
}

// Start mining session
export function startMining(telegramId) {
  const user = getOrCreateUser(telegramId);

  // Check if already mining
  const activeSession = db.findActiveMiningSession(user.id);

  if (activeSession) {
    return { success: false, message: 'Już kopiesz! Sprawdź /balance' };
  }

  // Check cooldown
  if (user.last_mined) {
    const lastMined = new Date(user.last_mined).getTime();
    const now = Date.now();
    const timeSinceLastMined = now - lastMined;

    if (timeSinceLastMined < MINING_INTERVAL_MS) {
      const remainingMs = MINING_INTERVAL_MS - timeSinceLastMined;
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

      return {
        success: false,
        message: `⏳ Następny mining za ${remainingHours}h ${remainingMinutes}m`
      };
    }
  }

  // Check for active boosts
  const activeBoosts = db.getActiveBoosts(user.id);
  const activeBoost = activeBoosts.length > 0 ? activeBoosts[0] : null;
  const boostMultiplier = activeBoost ? activeBoost.multiplier : 1;
  const miningRate = user.mining_rate * boostMultiplier;

  // Create mining session
  const session = db.createMiningSession(user.id, boostMultiplier > 1);

  // Update last_mined
  db.updateUser(user.id, { last_mined: new Date().toISOString() });

  return {
    success: true,
    message: `⛏️ Mining rozpoczęty!\n\n📊 Prędkość: ${miningRate.toFixed(2)} AET/h\n⏱️ Czas: ${MINING_INTERVAL_MS / (60 * 60 * 1000)}h\n${boostMultiplier > 1 ? `🚀 Boost: ${boostMultiplier}x` : ''}`,
    sessionId: session.id,
    miningRate,
    duration: MINING_INTERVAL_MS
  };
}

// Claim mining rewards
export function claimMining(telegramId) {
  const user = getOrCreateUser(telegramId);

  const activeSession = db.findActiveMiningSession(user.id);

  if (!activeSession) {
    return { success: false, message: '❌ Nie masz aktywnego miningu. Użyj /mine aby rozpocząć.' };
  }

  const startedAt = new Date(activeSession.started_at).getTime();
  const now = Date.now();
  const elapsedMs = now - startedAt;
  const elapsedHours = elapsedMs / (60 * 60 * 1000);

  // Check if mining time completed
  if (elapsedMs < MINING_INTERVAL_MS) {
    const remainingMs = MINING_INTERVAL_MS - elapsedMs;
    const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

    return {
      success: false,
      message: `⏳ Mining w trakcie!\n\n⏱️ Pozostało: ${remainingHours}h ${remainingMinutes}m\n💰 Nagroda: ${(user.mining_rate * elapsedHours).toFixed(2)} AET`
    };
  }

  // Calculate reward (cap at MAX_OFFLINE_HOURS)
  const cappedHours = Math.min(elapsedHours, parseFloat(process.env.MAX_OFFLINE_HOURS || 8));
  const reward = user.mining_rate * cappedHours;

  // Update session
  db.updateMiningSession(activeSession.id, {
    ended_at: new Date().toISOString(),
    tokens_earned: reward
  });

  // Update user balance
  const newBalance = user.balance + reward;
  const newTotalMined = user.total_mined + reward;
  db.updateUser(user.id, {
    balance: newBalance,
    total_mined: newTotalMined
  });

  // Record transaction
  db.createTransaction(user.id, 'mining', reward, newBalance, `Mining session #${activeSession.id}`);

  // Process referral bonus
  if (user.referred_by) {
    const referralBonus = reward * 0.1;
    processReferralBonus(user.referred_by, referralBonus);
  }

  // Check achievements
  checkMiningAchievements(user.id, newTotalMined);

  return {
    success: true,
    message: `✅ Mining zakończony!\n\n💰 Zdobyte: ${reward.toFixed(2)} AET\n📊 Saldo: ${newBalance.toFixed(2)} AET\n⏱️ Czas: ${Math.floor(elapsedHours)}h ${Math.floor((elapsedHours % 1) * 60)}m`,
    reward,
    newBalance,
    newTotalMined
  };
}

// Process referral bonus
function processReferralBonus(referrerId, bonus) {
  const referrer = db.findUserById(referrerId);
  if (!referrer) return;

  const newBalance = referrer.balance + bonus;
  db.updateUser(referrerId, { balance: newBalance });

  db.createTransaction(referrerId, 'referral', bonus, newBalance, 'Mining referral bonus');
}

// Check mining achievements
function checkMiningAchievements(userId, totalMined) {
  const achievements = [
    { name: 'First Mining', threshold: 0, type: 'mining_first' },
    { name: '10 AET Mined', threshold: 10, type: 'mining_10' },
    { name: '100 AET Mined', threshold: 100, type: 'mining_100' },
    { name: '1000 AET Mined', threshold: 1000, type: 'mining_1000' },
    { name: '10000 AET Mined', threshold: 10000, type: 'mining_10000' }
  ];

  for (const achievement of achievements) {
    if (totalMined >= achievement.threshold) {
      db.createAchievement(userId, achievement.type, achievement.name);
    }
  }
}

// Get mining status
export function getMiningStatus(telegramId) {
  const user = getOrCreateUser(telegramId);

  const activeSession = db.findActiveMiningSession(user.id);

  if (!activeSession) {
    // Check cooldown
    if (user.last_mined) {
      const lastMined = new Date(user.last_mined).getTime();
      const now = Date.now();
      const timeSinceLastMined = now - lastMined;

      if (timeSinceLastMined < MINING_INTERVAL_MS) {
        const remainingMs = MINING_INTERVAL_MS - timeSinceLastMined;
        const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
        const remainingMinutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

        return {
          status: 'cooldown',
          message: `⏳ Następny mining za ${remainingHours}h ${remainingMinutes}m`,
          nextMining: new Date(lastMined + MINING_INTERVAL_MS)
        };
      }
    }

    return {
      status: 'ready',
      message: '✅ Gotowy do miningu! Użyj /mine'
    };
  }

  const startedAt = new Date(activeSession.started_at).getTime();
  const now = Date.now();
  const elapsedMs = now - startedAt;
  const elapsedHours = elapsedMs / (60 * 60 * 1000);
  const progress = Math.min(elapsedMs / MINING_INTERVAL_MS, 1);
  const estimatedReward = user.mining_rate * Math.min(elapsedHours, parseFloat(process.env.MAX_OFFLINE_HOURS || 8));

  return {
    status: 'mining',
    message: `⛏️ Kopanie w trakcie...`,
    progress,
    elapsedHours,
    estimatedReward,
    totalReward: activeSession.tokens_earned + estimatedReward,
    endsAt: new Date(startedAt + MINING_INTERVAL_MS)
  };
}

// Get user stats
export function getUserStats(telegramId) {
  const user = getOrCreateUser(telegramId);

  const totalSessions = db.data.mining_sessions.filter(s => s.user_id === user.id && s.ended_at).length;
  const totalTasks = db.data.ai_tasks.filter(t => t.user_id === user.id && t.status === 'completed').length;
  const totalReferrals = db.data.referrals.filter(r => r.referrer_id === user.id).length;
  const achievements = db.getUserAchievements(user.id);

  return {
    balance: user.balance,
    totalMined: user.total_mined,
    miningRate: user.mining_rate,
    totalSessions,
    totalTasks,
    totalReferrals,
    achievements: achievements.length,
    referralCode: user.referral_code
  };
}