import db from '../database/sqlite.js';

// Active events
const activeEvents = new Map();

// Event types
export const EVENT_TYPES = {
  DOUBLE_MINING: {
    id: 'double_mining',
    name: '⛏️ Podwójny Mining',
    description: 'Wszystkie nagrody miningu x2!',
    multiplier: 2,
    duration: 72 * 60 * 60 * 1000, // 72 hours
    icon: '⛏️'
  },
  CLAN_WAR: {
    id: 'clan_war',
    name: '🏴 Wojna Klanów',
    description: 'Klany rywalizują o nagrody!',
    multiplier: 1,
    duration: 48 * 60 * 60 * 1000, // 48 hours
    icon: '🏴'
  },
  TAP_FRENZY: {
    id: 'tap_frenzy',
    name: '👆 Szaleństwo Tapów',
    description: 'Podwójne nagrody za tapy!',
    multiplier: 2,
    duration: 24 * 60 * 60 * 1000, // 24 hours
    icon: '👆'
  },
  AI_BOOST: {
    id: 'ai_boost',
    name: '🤖 Wzmocnienie AI',
    description: 'Potrójne nagrody za zadania AI!',
    multiplier: 3,
    duration: 12 * 60 * 60 * 1000, // 12 hours
    icon: '🤖'
  },
  WEEKEND_PARTY: {
    id: 'weekend_party',
    name: '🎉 Weekendowa Impreza',
    description: 'Wszystkie nagrody x1.5!',
    multiplier: 1.5,
    duration: 48 * 60 * 60 * 1000, // 48 hours
    icon: '🎉'
  }
};

// Start a new event
export function startEvent(eventType, customDuration = null) {
  const eventConfig = EVENT_TYPES[eventType];
  if (!eventConfig) return { success: false, message: '❌ Nieznany typ wydarzenia.' };

  // Check if event already active
  if (activeEvents.has(eventType)) {
    return { success: false, message: '❌ Wydarzenie już aktywne!' };
  }

  const event = {
    ...eventConfig,
    startTime: Date.now(),
    endTime: Date.now() + (customDuration || eventConfig.duration),
    participants: 0,
    totalRewards: 0
  };

  activeEvents.set(eventType, event);

  // Save to database
  if (!db.data.settings.events) {
    db.data.settings.events = [];
  }
  db.data.settings.events.push({
    type: eventType,
    startTime: new Date().toISOString(),
    endTime: new Date(event.endTime).toISOString()
  });
  db.save();

  return {
    success: true,
    event,
    message: `🎉 *Nowe Wydarzenie!*\n\n${event.icon} *${event.name}*\n📝 ${event.description}\n⏰ Czas trwania: ${formatDuration(event.duration)}\n\n🚀 Dołącz teraz!`
  };
}

// Get active events
export function getActiveEvents() {
  const now = Date.now();
  const events = [];

  for (const [type, event] of activeEvents) {
    if (event.endTime > now) {
      events.push({
        ...event,
        remaining: event.endTime - now,
        progress: (now - event.startTime) / (event.endTime - event.startTime)
      });
    } else {
      activeEvents.delete(type);
    }
  }

  return events;
}

// Get event multiplier for type
export function getEventMultiplier(eventType) {
  const events = getActiveEvents();
  const matchingEvent = events.find(e => e.id === eventType);
  return matchingEvent ? matchingEvent.multiplier : 1;
}

// Join event (track participation)
export function joinEvent(userId, eventType) {
  const events = getActiveEvents();
  const event = events.find(e => e.id === eventType);

  if (!event) {
    return { success: false, message: '❌ Wydarzenie nieaktywne.' };
  }

  event.participants++;
  event.totalRewards += 0; // Will be updated when rewards are given

  return {
    success: true,
    event,
    message: `✅ Dołączyłeś do wydarzenia!\n\n${event.icon} *${event.name}*\n📊 Multiplier: x${event.multiplier}\n⏰ Pozostało: ${formatDuration(event.remaining)}`
  };
}

// Complete event (end early)
export function completeEvent(eventType) {
  if (!activeEvents.has(eventType)) {
    return { success: false, message: '❌ Wydarzenie nieaktywne.' };
  }

  const event = activeEvents.get(eventType);
  activeEvents.delete(eventType);

  // Remove from database
  if (db.data.settings.events) {
    db.data.settings.events = db.data.settings.events.filter(
      e => e.type !== eventType
    );
    db.save();
  }

  return {
    success: true,
    event,
    message: `🏁 Wydarzenie zakończone!\n\n${event.icon} *${event.name}*\n👥 Uczestnicy: ${event.participants}\n💰 Rozdane nagrody: ${event.totalRewards.toFixed(2)} AET`
  };
}

// Format event list
export function formatEventList(events) {
  if (!events || events.length === 0) {
    return '📅 Brak aktywnych wydarzeń.';
  }

  let text = '📅 *Aktywne Wydarzenia:*\n\n';

  events.forEach(event => {
    const progress = Math.floor(event.progress * 100);
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

    text += `${event.icon} *${event.name}*\n`;
    text += `   📝 ${event.description}\n`;
    text += `   📊 Multiplier: x${event.multiplier}\n`;
    text += `   ⏰ Pozostało: ${formatDuration(event.remaining)}\n`;
    text += `   📈 Postęp: ${bar} ${progress}%\n\n`;
  });

  return text;
}

// Format duration
function formatDuration(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }

  return `${hours}h ${minutes}m`;
}

// Get events keyboard
export function getEventsKeyboard(events) {
  const buttons = events.map(event => [{
    text: `${event.icon} ${event.name} (x${event.multiplier})`,
    callback_data: `event_${event.id}`
  }]);

  buttons.push([{
    text: '🔄 Odśwież',
    callback_data: 'events_refresh'
  }]);

  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Handle event callback
export function handleEventCallback(callbackData) {
  if (callbackData === 'events_refresh') {
    return { action: 'refresh' };
  }

  if (callbackData.startsWith('event_')) {
    const eventId = callbackData.replace('event_', '');
    return { action: 'join', eventId };
  }

  return null;
}

// Auto-start events (called periodically)
export function autoStartEvents() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const hour = now.getHours();

  // Weekend party (Saturday-Sunday)
  if ((dayOfWeek === 0 || dayOfWeek === 6) && hour >= 10 && hour <= 22) {
    if (!activeEvents.has('WEEKEND_PARTY')) {
      startEvent('WEEKEND_PARTY');
    }
  }

  // Random events (10% chance per hour)
  if (Math.random() < 0.1 && activeEvents.size < 3) {
    const eventTypes = Object.keys(EVENT_TYPES);
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    if (!activeEvents.has(randomType)) {
      startEvent(randomType, 2 * 60 * 60 * 1000); // 2 hours
    }
  }
}

// Initialize events from database
export function initEvents() {
  if (db.data.settings.events) {
    const now = Date.now();
    db.data.settings.events.forEach(eventData => {
      const endTime = new Date(eventData.endTime).getTime();
      if (endTime > now) {
        const eventConfig = EVENT_TYPES[eventData.type];
        if (eventConfig) {
          activeEvents.set(eventData.type, {
            ...eventConfig,
            startTime: new Date(eventData.startTime).getTime(),
            endTime,
            participants: 0,
            totalRewards: 0
          });
        }
      }
    });
  }
}

export default {
  EVENT_TYPES,
  startEvent,
  getActiveEvents,
  getEventMultiplier,
  joinEvent,
  completeEvent,
  formatEventList,
  getEventsKeyboard,
  handleEventCallback,
  autoStartEvents,
  initEvents
};
