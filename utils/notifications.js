import db from '../database/sqlite.js';

// Notification types
export const NOTIFICATION_TYPES = {
  ENERGY_FULL: {
    id: 'energy_full',
    icon: '⚡',
    message: 'Twoja energia jest pełna! Czas na tapy!',
    priority: 'medium'
  },
  MINING_COMPLETE: {
    id: 'mining_complete',
    icon: '⛏️',
    message: 'Mining zakończony! Zbierz nagrody!',
    priority: 'high'
  },
  DAILY_BONUS: {
    id: 'daily_bonus',
    icon: '🎁',
    message: 'Twój dzienny bonus czeka na odbiór!',
    priority: 'medium'
  },
  EVENT_STARTING: {
    id: 'event_starting',
    icon: '🎉',
    message: 'Nowe wydarzenie startuje za 5 minut!',
    priority: 'high'
  },
  STREAK_WARNING: {
    id: 'streak_warning',
    icon: '🔥',
    message: 'Nie zapomnij o dziennym bonusie! Stracisz streak!',
    priority: 'high'
  },
  REFERRAL_BONUS: {
    id: 'referral_bonus',
    icon: '👥',
    message: 'Nowa osoba dołączyła przez Twój link!',
    priority: 'low'
  },
  LEVEL_UP: {
    id: 'level_up',
    icon: '🎉',
    message: 'Gratulacje! Osiągnąłeś nowy poziom!',
    priority: 'medium'
  },
  ACHIEVEMENT_UNLOCKED: {
    id: 'achievement_unlocked',
    icon: '🏆',
    message: 'Odblokowałeś nowe osiągnięcie!',
    priority: 'low'
  }
};

// Notification queue
const notificationQueue = new Map();

// Schedule notification
export function scheduleNotification(userId, type, delay = 0, data = {}) {
  const notifConfig = NOTIFICATION_TYPES[type];
  if (!notifConfig) return null;

  const notification = {
    id: `${userId}_${Date.now()}`,
    userId,
    type,
    icon: notifConfig.icon,
    message: notifConfig.message,
    priority: notifConfig.priority,
    data,
    scheduledAt: Date.now(),
    sentAt: null,
    read: false
  };

  if (!notificationQueue.has(userId)) {
    notificationQueue.set(userId, []);
  }
  notificationQueue.get(userId).push(notification);

  // Schedule send
  if (delay > 0) {
    setTimeout(() => {
      sendNotification(notification);
    }, delay);
  }

  return notification;
}

// Send notification immediately
export function sendNotification(notification) {
  const user = db.findUserById(notification.userId);
  if (!user) return;

  notification.sentAt = Date.now();

  // In a real implementation, this would send via Telegram API
  // For now, we log it
  console.log(`📢 Notification to ${user.username || user.first_name}: ${notification.message}`);

  return notification;
}

// Get user notifications
export function getUserNotifications(userId, unreadOnly = false) {
  const notifications = notificationQueue.get(userId) || [];

  if (unreadOnly) {
    return notifications.filter(n => !n.read);
  }

  return notifications.sort((a, b) => b.scheduledAt - a.scheduledAt);
}

// Mark notification as read
export function markAsRead(userId, notificationId) {
  const notifications = notificationQueue.get(userId) || [];
  const notification = notifications.find(n => n.id === notificationId);

  if (notification) {
    notification.read = true;
    return true;
  }

  return false;
}

// Mark all as read
export function markAllAsRead(userId) {
  const notifications = notificationQueue.get(userId) || [];
  notifications.forEach(n => n.read = true);
}

// Clear old notifications (older than 7 days)
export function clearOldNotifications() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const [userId, notifications] of notificationQueue) {
    const filtered = notifications.filter(n => n.scheduledAt > sevenDaysAgo);
    if (filtered.length === 0) {
      notificationQueue.delete(userId);
    } else {
      notificationQueue.set(userId, filtered);
    }
  }
}

// Check and send automatic notifications
export function checkAutomaticNotifications() {
  const users = db.data.users;

  users.forEach(user => {
    // Energy full notification
    const energy = user.energy || 100;
    if (energy >= 100) {
      scheduleNotification(user.id, 'ENERGY_FULL', 0);
    }

    // Daily bonus reminder (if streak might break)
    if (user.daily_streak > 0 && user.last_daily_bonus) {
      const lastBonus = new Date(user.last_daily_bonus);
      const now = new Date();
      const hoursSinceLastBonus = (now - lastBonus) / (1000 * 60 * 60);

      if (hoursSinceLastBonus > 20 && hoursSinceLastBonus < 24) {
        scheduleNotification(user.id, 'STREAK_WARNING', 0);
      }
    }
  });
}

// Format notifications
export function formatNotifications(notifications) {
  if (!notifications || notifications.length === 0) {
    return '🔔 Brak powiadomień.';
  }

  let text = '🔔 *Powiadomienia:*\n\n';

  notifications.slice(0, 10).forEach(notif => {
    const readStatus = notif.read ? '' : ' (nowe)';
    text += `${notif.icon} ${notif.message}${readStatus}\n`;
  });

  return text;
}

// Get unread count
export function getUnreadCount(userId) {
  return getUserNotifications(userId, true).length;
}

// Clear all notifications for user
export function clearAllNotifications(userId) {
  notificationQueue.delete(userId);
}

// Initialize (called on startup)
export function initNotifications() {
  // Clear old notifications
  clearOldNotifications();

  // Check automatic notifications
  checkAutomaticNotifications();

  // Set up periodic checks
  setInterval(() => {
    checkAutomaticNotifications();
    clearOldNotifications();
  }, 5 * 60 * 1000); // Every 5 minutes
}

export default {
  NOTIFICATION_TYPES,
  scheduleNotification,
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  clearOldNotifications,
  checkAutomaticNotifications,
  formatNotifications,
  getUnreadCount,
  clearAllNotifications,
  initNotifications
};
