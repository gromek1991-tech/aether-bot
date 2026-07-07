import db from '../database/sqlite.js';

// Available boosters
export const BOOSTERS = {
  SPEED_2X: {
    id: 'speed_2x',
    name: '🚀 Speed 2x',
    description: 'Podwaja prędkość miningu na 4 godziny',
    multiplier: 2,
    duration_hours: 4,
    price: 10
  },
  SPEED_3X: {
    id: 'speed_3x',
    name: '⚡ Speed 3x',
    description: 'Potraja prędkość miningu na 2 godziny',
    multiplier: 3,
    duration_hours: 2,
    price: 25
  },
  SPEED_5X: {
    id: 'speed_5x',
    name: '🔥 Speed 5x',
    description: '5x prędkość miningu na 1 godzinę',
    multiplier: 5,
    duration_hours: 1,
    price: 50
  },
  EXTRA_SESSION: {
    id: 'extra_session',
    name: '⏱️ Extra Session',
    description: 'Dodatkowa sesja miningu (bez cooldown)',
    multiplier: 1,
    duration_hours: 0,
    price: 15,
    special: 'extra_session'
  },
  REFERRAL_BOOST: {
    id: 'referral_boost',
    name: '👥 Referral Boost',
    description: 'Podwaja bonusy z poleceń na 24 godziny',
    multiplier: 2,
    duration_hours: 24,
    price: 30,
    special: 'referral_boost'
  }
};

// Purchase booster
export function purchaseBooster(userId, boosterId) {
  const booster = Object.values(BOOSTERS).find(b => b.id === boosterId);

  if (!booster) {
    return { success: false, message: '❌ Nieznany booster.' };
  }

  const user = db.findUserById(userId);

  if (user.balance < booster.price) {
    return {
      success: false,
      message: `❌ Niewystarczający balans! Potrzebujesz ${booster.price} AET, masz ${user.balance.toFixed(2)} AET.`
    };
  }

  // Deduct balance
  const newBalance = user.balance - booster.price;
  db.updateUser(userId, { balance: newBalance });

  // Add boost
  if (booster.special === 'extra_session') {
    // Reset mining cooldown
    db.updateUser(userId, { last_mined: null });

    // Record transaction
    db.createTransaction(userId, 'booster', -booster.price, newBalance, `Booster: ${booster.name}`);

    return {
      success: true,
      message: `✅ ${booster.name} aktywowany!\n\n⏰ Cooldown miningu zresetowany.\n💰 Pozostały balans: ${newBalance.toFixed(2)} AET`
    };
  }

  const boost = db.createBoost(userId, booster.id, booster.multiplier, booster.duration_hours);

  // Record transaction
  db.createTransaction(userId, 'booster', -booster.price, newBalance, `Booster: ${booster.name}`);

  return {
    success: true,
    message: `✅ ${booster.name} aktywowany!\n\n📊 Mnożnik: ${booster.multiplier}x\n⏰ Czas: ${booster.duration_hours}h\n💰 Pozostały balans: ${newBalance.toFixed(2)} AET`,
    boost: booster,
    expiresAt: new Date(boost.expires_at)
  };
}

// Get active boosts
export function getActiveBoosts(userId) {
  return db.getActiveBoosts(userId);
}

// Get booster shop
export function getBoosterShop() {
  return Object.values(BOOSTERS);
}

// Format booster shop
export function formatBoosterShop(userBalance) {
  let text = '🛒 *Sklep Boosterów:*\n\n';

  Object.values(BOOSTERS).forEach((booster, index) => {
    const affordable = userBalance >= booster.price;
    const status = affordable ? '✅' : '❌';

    text += `${index + 1}. ${booster.name}\n`;
    text += `   📝 ${booster.description}\n`;
    text += `   💰 Cena: ${booster.price} AET ${status}\n\n`;
  });

  text += `\n💡 Aby kupić: /boost <numer>`;
  return text;
}

// Format active boosts
export function formatActiveBoosts(boosts) {
  if (!boosts || boosts.length === 0) {
    return '🚫 Brak aktywnych boosterów.';
  }

  let text = '🚀 *Aktywne Boostery:*\n\n';

  boosts.forEach(boost => {
    const booster = Object.values(BOOSTERS).find(b => b.id === boost.boost_type);
    const name = booster ? booster.name : boost.boost_type;
    const expiresAt = new Date(boost.expires_at);
    const remaining = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    text += `• ${name}\n`;
    text += `  ⏰ Pozostało: ${hours}h ${minutes}m\n\n`;
  });

  return text;
}