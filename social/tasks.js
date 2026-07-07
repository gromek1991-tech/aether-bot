import db from '../database/sqlite.js';

// Social tasks configuration
export const SOCIAL_TASKS = {
  JOIN_CHANNEL: {
    id: 'join_channel',
    name: '📢 Dołącz do kanału',
    description: 'Dołącz do oficjalnego kanału AETHER',
    reward: 5,
    type: 'channel',
    link: 'https://t.me/AETHER-official',
    cooldown: 0 // one-time
  },
  FOLLOW_TWITTER: {
    id: 'follow_twitter',
    name: '🐦 Obserwuj Twitter',
    description: 'Obserwuj @AETHERonTwitter',
    reward: 10,
    type: 'social',
    link: 'https://twitter.com/AETHER',
    cooldown: 0
  },
  SHARE_POST: {
    id: 'share_post',
    name: '📤 Udostępnij post',
    description: 'Udostępnij post AETHER w swojej grupie',
    reward: 3,
    type: 'share',
    cooldown: 86400000 // 24h
  },
  INVITE_5: {
    id: 'invite_5',
    name: '👥 Zaproś 5 osób',
    description: 'Zaproś 5 nowych użytkowników',
    reward: 25,
    type: 'referral',
    required: 5,
    cooldown: 0
  },
  DAILY_CHALLENGE: {
    id: 'daily_challenge',
    name: '🎯 Dziennie wyzwanie',
    description: 'Wykonaj dzienne wyzwanie AI',
    reward: 15,
    type: 'daily',
    cooldown: 86400000
  },
  MINE_3_TIMES: {
    id: 'mine_3_times',
    name: '⛏️ Mining 3 razy',
    description: 'Uruchom mining 3 razy',
    reward: 10,
    type: 'mining',
    required: 3,
    cooldown: 86400000
  },
  TAP_100: {
    id: 'tap_100',
    name: '👆 100 tapów',
    description: 'Wykonaj 100 tapów w jednej sesji',
    reward: 8,
    type: 'tap',
    required: 100,
    cooldown: 86400000
  },
  COMPLETE_3_AI: {
    id: 'complete_3_ai',
    name: '🤖 3 zadania AI',
    description: 'Wykonaj 3 zadania AI',
    reward: 12,
    type: 'ai_task',
    required: 3,
    cooldown: 86400000
  }
};

// Get available tasks for user
export function getAvailableTasks(userId) {
  const user = db.findUserById(userId);
  if (!user) return [];

  const completedTasks = db.data.transactions
    .filter(t => t.user_id === userId && t.type === 'social_task')
    .map(t => t.reference);

  const tasks = Object.values(SOCIAL_TASKS).map(task => {
    const completed = completedTasks.includes(task.id);
    const canComplete = !completed && checkTaskRequirement(task, user);
    
    return {
      ...task,
      completed,
      canComplete,
      status: completed ? '✅' : canComplete ? '🎁' : '🔒'
    };
  });

  return tasks;
}

// Check if user meets task requirement
function checkTaskRequirement(task, user) {
  switch (task.type) {
    case 'referral':
      const referrals = db.data.referrals.filter(r => r.referrer_id === user.id);
      return referrals.length >= task.required;
    
    case 'mining':
      const miningSessions = db.data.mining_sessions.filter(
        s => s.user_id === user.id && s.ended_at
      );
      const today = new Date().toISOString().split('T')[0];
      const todaySessions = miningSessions.filter(
        s => s.ended_at.startsWith(today)
      );
      return todaySessions.length >= task.required;
    
    case 'tap':
      return (user.total_taps || 0) >= task.required;
    
    case 'ai_task':
      const todayTasks = db.data.ai_tasks.filter(
        t => t.user_id === user.id && 
        t.status === 'completed' &&
        t.completed_at && 
        t.completed_at.startsWith(new Date().toISOString().split('T')[0])
      );
      return todayTasks.length >= task.required;
    
    default:
      return true;
  }
}

// Complete a task
export function completeTask(userId, taskId) {
  const user = db.findUserById(userId);
  if (!user) return { success: false, message: '❌ Użytkownik nie znaleziony.' };

  const task = SOCIAL_TASKS[taskId.toUpperCase().replace(/-/g, '_')];
  if (!task) return { success: false, message: '❌ Nieznane zadanie.' };

  // Check if already completed
  const alreadyCompleted = db.data.transactions.some(
    t => t.user_id === userId && t.type === 'social_task' && t.reference === task.id
  );

  if (alreadyCompleted) {
    return { success: false, message: '❌ Zadanie już wykonane!' };
  }

  // Check requirement
  if (!checkTaskRequirement(task, user)) {
    return { success: false, message: '❌ Nie spełniasz wymagań tego zadania.' };
  }

  // Award reward
  const newBalance = user.balance + task.reward;
  db.updateUser(userId, { balance: newBalance });

  // Record transaction
  db.createTransaction(
    userId,
    'social_task',
    task.reward,
    newBalance,
    task.id
  );

  return {
    success: true,
    reward: task.reward,
    newBalance,
    message: `✅ Zadanie wykonane!\n\n${task.name}\n💰 Nagroda: +${task.reward} AET\n📊 Nowe saldo: ${newBalance.toFixed(2)} AET`
  };
}

// Format tasks list
export function formatTasksList(tasks) {
  if (!tasks || tasks.length === 0) {
    return '📋 Brak dostępnych zadań.';
  }

  let text = '📋 *Zadania Społecznościowe:*\n\n';

  tasks.forEach((task, index) => {
    text += `${task.status} *${task.name}*\n`;
    text += `   📝 ${task.description}\n`;
    text += `   💰 +${task.reward} AET\n\n`;
  });

  text += '\n💡 Wykonaj zadania klikając przyciski poniżej.';
  return text;
}

// Get tasks keyboard
export function getTasksKeyboard(tasks) {
  const buttons = tasks
    .filter(t => t.canComplete && !t.completed)
    .slice(0, 8) // Max 8 buttons
    .map(task => [{
      text: `${task.status} ${task.name.replace(/[^\w\s]/gi, '').trim()}`,
      callback_data: `task_${task.id}`
    }]);

  // Add refresh button
  buttons.push([{
    text: '🔄 Odśwież',
    callback_data: 'tasks_refresh'
  }]);

  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
}

// Handle task callback
export function handleTaskCallback(callbackData) {
  if (callbackData === 'tasks_refresh') {
    return { action: 'refresh' };
  }

  if (callbackData.startsWith('task_')) {
    const taskId = callbackData.replace('task_', '');
    return { action: 'complete', taskId };
  }

  return null;
}

export default {
  SOCIAL_TASKS,
  getAvailableTasks,
  completeTask,
  formatTasksList,
  getTasksKeyboard,
  handleTaskCallback
};
