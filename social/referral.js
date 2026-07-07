import db from '../database/sqlite.js';

const REFERRAL_BONUS = parseFloat(process.env.REFERRAL_BONUS || 0.1);
const REFERRAL_BONUS_MINING = parseFloat(process.env.REFERRAL_BONUS_MINING || 0.05);

// Process referral when new user joins
export function processReferral(newUserId, referralCode) {
  const referrer = db.data.users.find(u => u.referral_code === referralCode);

  if (!referrer) {
    return { success: false, message: '❌ Nieprawidłowy kod polecający.' };
  }

  const newUser = db.findUserById(newUserId);

  if (newUser.referred_by) {
    return { success: false, message: '❌ Już zostałeś polecony przez kogoś innego.' };
  }

  if (referrer.id === newUserId) {
    return { success: false, message: '❌ Nie możesz polecić samego siebie.' };
  }

  // Update new user
  db.updateUser(newUserId, { referred_by: referrer.id });

  // Create referral record
  db.createReferral(referrer.id, newUserId);

  // Give bonus to referrer
  const newBalance = referrer.balance + REFERRAL_BONUS;
  db.updateUser(referrer.id, { balance: newBalance });

  // Record transaction
  db.createTransaction(referrer.id, 'referral_signup', REFERRAL_BONUS, newBalance, `Referral: User #${newUserId}`);

  return {
    success: true,
    message: `🎉 ${referrer.username || 'Użytkownik'} otrzymał ${REFERRAL_BONUS} AET za polecenie!`,
    referrer: referrer.username,
    bonus: REFERRAL_BONUS
  };
}

// Get referral stats
export function getReferralStats(userId) {
  const user = db.findUserById(userId);
  const stats = db.getReferralStats(userId);

  const recentReferrals = stats.recent.map(r => {
    const referred = db.findUserById(r.referred_id);
    return {
      ...r,
      username: referred?.username,
      first_name: referred?.first_name
    };
  });

  return {
    referralCode: user.referral_code,
    totalReferrals: stats.count,
    totalBonus: stats.totalBonus,
    recentReferrals
  };
}

// Get referral leaderboard
export function getReferralLeaderboard(limit = 10) {
  return db.data.users
    .map(user => {
      const stats = db.getReferralStats(user.id);
      return {
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        referral_count: stats.count,
        total_earned: stats.totalBonus
      };
    })
    .filter(u => u.referral_count > 0)
    .sort((a, b) => b.referral_count - a.referral_count || b.total_earned - a.total_earned)
    .slice(0, limit);
}