import db from '../database/sqlite.js';

// Marketplace listings
const listings = new Map();

// Item types
export const ITEM_TYPES = {
  BOOSTER: 'booster',
  ACHIEVEMENT: 'achievement',
  PET_SKIN: 'pet_skin',
  BADGE: 'badge'
};

// Available items for sale
export const MARKET_ITEMS = {
  // Boosters
  SPEED_2X: {
    id: 'speed_2x',
    name: '🚀 Speed 2x',
    type: ITEM_TYPES.BOOSTER,
    basePrice: 10,
    description: 'Podwaja prędkość na 4h'
  },
  SPEED_3X: {
    id: 'speed_3x',
    name: '⚡ Speed 3x',
    type: ITEM_TYPES.BOOSTER,
    basePrice: 25,
    description: 'Potraja prędkość na 2h'
  },
  EXTRA_ENERGY: {
    id: 'extra_energy',
    name: '🔋 Extra Energy',
    type: ITEM_TYPES.BOOSTER,
    basePrice: 5,
    description: '+50 energii'
  },
  // Pet skins
  GOLDEN_BOT: {
    id: 'golden_bot',
    name: '✨ Golden Bot',
    type: ITEM_TYPES.PET_SKIN,
    basePrice: 100,
    description: 'Złota wersja bota'
  },
  CYBER_FOX: {
    id: 'cyber_fox',
    name: '🦊 Cyber Fox',
    type: ITEM_TYPES.PET_SKIN,
    basePrice: 150,
    description: 'Cyberpunkowa wersja lisa'
  },
  // Badges
  EARLY_ADOPTER: {
    id: 'early_adopter',
    name: '🏆 Early Adopter',
    type: ITEM_TYPES.BADGE,
    basePrice: 50,
    description: 'Odznaka za wczesne wsparcie'
  },
  TOP_MINER: {
    id: 'top_miner',
    name: '⛏️ Top Miner',
    type: ITEM_TYPES.BADGE,
    basePrice: 75,
    description: 'Odznaka najlepszego miningera'
  }
};

// Create listing
export function createListing(sellerId, itemId, price) {
  const item = MARKET_ITEMS[itemId.toUpperCase().replace(/-/g, '_')];
  if (!item) {
    return { success: false, message: '❌ Nieznany przedmiot.' };
  }

  const user = db.findUserById(sellerId);
  if (!user) {
    return { success: false, message: '❌ Użytkownik nie znaleziony.' };
  }

  if (price < item.basePrice * 0.5 || price > item.basePrice * 2) {
    return {
      success: false,
      message: `❌ Cena musi być między ${(item.basePrice * 0.5).toFixed(0)} a ${(item.basePrice * 2).toFixed(0)} AET.`
    };
  }

  const listingId = `${sellerId}_${Date.now()}`;
  const listing = {
    id: listingId,
    sellerId,
    sellerName: user.username || user.first_name || 'Anonim',
    itemId: item.id,
    itemName: item.name,
    itemType: item.type,
    price,
    createdAt: Date.now()
  };

  listings.set(listingId, listing);

  return {
    success: true,
    listing,
    message: `✅ Przedmiot wystawiony!\n\n${item.name}\n💰 Cena: ${price} AET\n📋 ID: ${listingId}`
  };
}

// Get listings
export function getListings(type = null, limit = 20) {
  let items = Array.from(listings.values());

  if (type) {
    items = items.filter(l => l.itemType === type);
  }

  return items
    .sort((a, b) => a.price - b.price)
    .slice(0, limit);
}

// Buy item
export function buyItem(buyerId, listingId) {
  const listing = listings.get(listingId);
  if (!listing) {
    return { success: false, message: '❌ Przedmiot nie znaleziony.' };
  }

  if (listing.sellerId === buyerId) {
    return { success: false, message: '❌ Nie możesz kupić własnego przedmiotu.' };
  }

  const buyer = db.findUserById(buyerId);
  if (!buyer) {
    return { success: false, message: '❌ Użytkownik nie znaleziony.' };
  }

  if (buyer.balance < listing.price) {
    return {
      success: false,
      message: `❌ Niewystarczający balans! Potrzebujesz ${listing.price} AET.`
    };
  }

  // Transfer AET
  const buyerNewBalance = buyer.balance - listing.price;
  db.updateUser(buyerId, { balance: buyerNewBalance });

  const seller = db.findUserById(listing.sellerId);
  if (seller) {
    const sellerNewBalance = seller.balance + listing.price;
    db.updateUser(listing.sellerId, { balance: sellerNewBalance });

    // Record transactions
    db.createTransaction(buyerId, 'marketplace_buy', -listing.price, buyerNewBalance, `Kupiono: ${listing.itemName}`);
    db.createTransaction(listing.sellerId, 'marketplace_sell', listing.price, sellerNewBalance, `Sprzedano: ${listing.itemName}`);
  }

  // Remove listing
  listings.delete(listingId);

  // Grant item to buyer
  grantItem(buyerId, listing.itemId, listing.itemType);

  return {
    success: true,
    item: listing,
    message: `✅ Kupiono!\n\n${listing.itemName}\n💰 Zapłacono: ${listing.price} AET\n📊 Nowe saldo: ${buyerNewBalance.toFixed(2)} AET`
  };
}

// Grant item to user
function grantItem(userId, itemId, itemType) {
  switch (itemType) {
    case ITEM_TYPES.BOOSTER:
      // Apply booster
      if (itemId === 'extra_energy') {
        const user = db.findUserById(userId);
        db.updateUser(userId, { energy: Math.min((user.energy || 100) + 50, 100) });
      }
      break;

    case ITEM_TYPES.PET_SKIN:
    case ITEM_TYPES.BADGE:
      // Store in user achievements
      db.createAchievement(userId, itemId, itemId.replace(/_/g, ' '));
      break;
  }
}

// Cancel listing
export function cancelListing(sellerId, listingId) {
  const listing = listings.get(listingId);
  if (!listing) {
    return { success: false, message: '❌ Przedmiot nie znaleziony.' };
  }

  if (listing.sellerId !== sellerId) {
    return { success: false, message: '❌ To nie Twój przedmiot.' };
  }

  listings.delete(listingId);

  return {
    success: true,
    message: `✅ Wystawienie anulowane: ${listing.itemName}`
  };
}

// Format listings
export function formatListings(listings, title = '🛒 Rynek') {
  if (!listings || listings.length === 0) {
    return `${title}\n\nBrak dostępnych przedmiotów.`;
  }

  let text = `${title}:\n\n`;

  listings.forEach((listing, index) => {
    text += `${index + 1}. ${listing.itemName}\n`;
    text += `   💰 ${listing.price} AET\n`;
    text += `   👤 ${listing.sellerName}\n`;
    text += `   📋 ID: ${listing.id}\n\n`;
  });

  text += '\n💡 Kup: /buy <ID>';
  return text;
}

// Get market keyboard
export function getMarketKeyboard(listings) {
  const buttons = listings.slice(0, 8).map(listing => [{
    text: `${listing.itemName} - ${listing.price} AET`,
    callback_data: `buy_${listing.id}`
  }]);

  buttons.push([
    { text: '📤 Wystaw', callback_data: 'market_sell' },
    { text: '🔄 Odśwież', callback_data: 'market_refresh' }
  ]);

  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

export default {
  ITEM_TYPES,
  MARKET_ITEMS,
  createListing,
  getListings,
  buyItem,
  cancelListing,
  formatListings,
  getMarketKeyboard
};
