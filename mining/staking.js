import db from '../database/sqlite.js';

// Staking plans
export const STAKING_PLANS = {
  BASIC: {
    id: 'basic',
    name: '📦 Podstawowy',
    duration_days: 30,
    apy: 10,
    min_amount: 10,
    description: '30 dni, 10% APY'
  },
  PREMIUM: {
    id: 'premium',
    name: '💎 Premium',
    duration_days: 90,
    apy: 25,
    min_amount: 100,
    description: '90 dni, 25% APY'
  },
  ELITE: {
    id: 'elite',
    name: '👑 Elite',
    duration_days: 180,
    apy: 50,
    min_amount: 500,
    description: '180 dni, 50% APY'
  }
};

// Stake tokens
export function stakeTokens(userId, planId, amount) {
  const plan = Object.values(STAKING_PLANS).find(p => p.id === planId);
  
  if (!plan) {
    return { success: false, message: '❌ Nieznany plan stakingowy.' };
  }
  
  const user = db.findUserById(userId);
  
  if (user.balance < amount) {
    return {
      success: false,
      message: `❌ Niewystarczający balans! Potrzebujesz ${amount} AET, masz ${user.balance.toFixed(2)} AET.`
    };
  }
  
  if (amount < plan.min_amount) {
    return {
      success: false,
      message: `❌ Minimalna kwota dla tego planu to ${plan.min_amount} AET.`
    };
  }
  
  // Deduct from balance
  const newBalance = user.balance - amount;
  db.updateUser(userId, { balance: newBalance });
  
  // Create staking record
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.duration_days);
  
  const stake = {
    id: db.data.boosts.length + 1, // Reuse boosts collection
    user_id: userId,
    boost_type: `stake_${planId}`,
    multiplier: plan.apy / 100,
    duration_hours: plan.duration_days * 24,
    expires_at: endDate.toISOString(),
    created_at: startDate.toISOString(),
    amount: amount,
    plan_id: planId
  };
  
  db.data.boosts.push(stake);
  db.save();
  
  // Record transaction
  db.createTransaction(userId, 'stake', -amount, newBalance, `Staking: ${plan.name}`);
  
  return {
    success: true,
    message: `✅ Tokeny stakeowane!\n\n📦 Plan: ${plan.name}\n💰 Kwota: ${amount} AET\n📈 APY: ${plan.apy}%\n⏰ Koniec: ${endDate.toLocaleDateString('pl-PL')}`,
    stake,
    newBalance
  };
}

// Calculate staking rewards
export function calculateStakingReward(amount, apy, daysStaked) {
  const dailyRate = apy / 100 / 365;
  return amount * dailyRate * daysStaked;
}

// Get user stakes
export function getUserStakes(userId) {
  return db.data.boosts
    .filter(b => b.user_id === userId && b.boost_type?.startsWith('stake_'))
    .map(stake => {
      const plan = Object.values(STAKING_PLANS).find(p => p.id === stake.plan_id);
      const startDate = new Date(stake.created_at);
      const now = new Date();
      const endDate = new Date(stake.expires_at);
      
      const daysStaked = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
      const totalDays = plan?.duration_days || 30;
      const remainingDays = Math.max(0, Math.floor((endDate - now) / (1000 * 60 * 60 * 24)));
      const progress = Math.min(daysStaked / totalDays, 1);
      
      // Calculate pending reward
      const pendingReward = calculateStakingReward(
        stake.amount,
        plan?.apy || 10,
        daysStaked
      );
      
      return {
        ...stake,
        plan_name: plan?.name || 'Unknown',
        apy: plan?.apy || 10,
        progress,
        daysStaked,
        remainingDays,
        pendingReward: pendingReward.toFixed(2),
        isComplete: remainingDays <= 0
      };
    });
}

// Claim staking rewards
export function claimStakingReward(userId, stakeId) {
  const stake = db.data.boosts.find(b => b.id === stakeId && b.user_id === userId);
  
  if (!stake) {
    return { success: false, message: '❌ Stake nie znaleziony.' };
  }
  
  const plan = Object.values(STAKING_PLANS).find(p => p.id === stake.plan_id);
  const startDate = new Date(stake.created_at);
  const now = new Date();
  const daysStaked = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  
  const reward = calculateStakingReward(
    stake.amount,
    plan?.apy || 10,
    daysStaked
  );
  
  // Add reward to balance
  const user = db.findUserById(userId);
  const newBalance = user.balance + reward;
  db.updateUser(userId, { balance: newBalance });
  
  // Remove stake if complete
  if (new Date(stake.expires_at) <= now) {
    const stakeIndex = db.data.boosts.findIndex(b => b.id === stakeId);
    if (stakeIndex !== -1) {
      db.data.boosts.splice(stakeIndex, 1);
    }
    
    // Return staked amount
    const returnBalance = newBalance + stake.amount;
    db.updateUser(userId, { balance: returnBalance });
    
    db.save();
    
    return {
      success: true,
      message: `✅ Staking zakończony!\n\n💰 Zwrot: ${stake.amount} AET\n📈 Nagroda: ${reward.toFixed(2)} AET\n📊 Nowe saldo: ${returnBalance.toFixed(2)} AET`,
      reward,
      returned: stake.amount,
      newBalance: returnBalance
    };
  }
  
  // Record transaction
  db.createTransaction(userId, 'staking_reward', reward, newBalance, `Staking reward: ${daysStaked} days`);
  
  return {
    success: true,
    message: `✅ Nagroda ze stakingu!\n\n📈 Nagroda: ${reward.toFixed(2)} AET\n⏰ Pozostało: ${Math.floor((new Date(stake.expires_at) - now) / (1000 * 60 * 60 * 24))} dni\n📊 Nowe saldo: ${newBalance.toFixed(2)} AET`,
    reward,
    newBalance
  };
}

// Format staking shop
export function formatStakingShop(userBalance) {
  let text = '📈 *Sklep Stakingu:*\n\n';
  
  Object.values(STAKING_PLANS).forEach((plan, index) => {
    const affordable = userBalance >= plan.min_amount;
    const status = affordable ? '✅' : '❌';
    
    text += `${index + 1}. ${plan.name}\n`;
    text += `   📝 ${plan.description}\n`;
    text += `   💰 Minimalna: ${plan.min_amount} AET ${status}\n\n`;
  });
  
  text += `\n💡 Aby stakeować: /stake <numer> <kwota>`;
  return text;
}

// Format user stakes
export function formatUserStakes(stakes) {
  if (!stakes || stakes.length === 0) {
    return '🚫 Brak aktywnych stakeów.';
  }
  
  let text = '📈 *Aktywne Stakingi:*\n\n';
  
  stakes.forEach(stake => {
    const progress = Math.floor(stake.progress * 100);
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    
    text += `${stake.plan_name}\n`;
    text += `   💰 Kwota: ${stake.amount} AET\n`;
    text += `   📈 APY: ${stake.apy}%\n`;
    text += `   ⏰ Pozostało: ${stake.remainingDays} dni\n`;
    text += `   📊 Postęp: ${bar} ${progress}%\n`;
    text += `   💎 Nagroda: ${stake.pendingReward} AET\n\n`;
  });
  
  return text;
}
