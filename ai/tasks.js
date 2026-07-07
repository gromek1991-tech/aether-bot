import db from '../database/sqlite.js';

const DAILY_AI_TASKS = parseInt(process.env.DAILY_AI_TASKS || 10);

// AI Task types
export const TASK_TYPES = {
  TRANSLATE: 'translate',
  SUMMARIZE: 'summarize',
  ANALYZE: 'analyze',
  GENERATE: 'generate',
  CHAT: 'chat'
};

// Task rewards
const TASK_REWARDS = {
  [TASK_TYPES.TRANSLATE]: 0.5,
  [TASK_TYPES.SUMMARIZE]: 0.3,
  [TASK_TYPES.ANALYZE]: 0.8,
  [TASK_TYPES.GENERATE]: 1.0,
  [TASK_TYPES.CHAT]: 0.2
};

// Get daily tasks remaining
export function getDailyTasksRemaining(userId) {
  const completedToday = db.getDailyTaskCount(userId);
  return Math.max(0, DAILY_AI_TASKS - completedToday);
}

// Create AI task
export function createAITask(userId, taskType, taskData = null) {
  const remaining = getDailyTasksRemaining(userId);

  if (remaining <= 0) {
    return { success: false, message: '❌ Dzienny limit zadań osiągnięty! Wróć jutro.' };
  }

  const reward = TASK_REWARDS[taskType] || 0.2;
  const task = db.createAITask(userId, taskType, taskData, reward);

  return {
    success: true,
    taskId: task.id,
    taskType,
    reward,
    remaining: remaining - 1
  };
}

// Complete AI task
export function completeAITask(taskId, result) {
  const task = db.findAITask(taskId);

  if (!task) {
    return { success: false, message: '❌ Zadanie nie znalezione.' };
  }

  if (task.status === 'completed') {
    return { success: false, message: '❌ Zadanie już wykonane.' };
  }

  // Update task
  db.updateAITask(taskId, {
    status: 'completed',
    result,
    completed_at: new Date().toISOString()
  });

  // Add reward to user balance
  const user = db.findUserById(task.user_id);
  const newBalance = user.balance + task.reward;

  db.updateUser(task.user_id, { balance: newBalance });

  // Record transaction
  db.createTransaction(task.user_id, 'ai_task', task.reward, newBalance, `AI Task: ${task.task_type}`);

  return {
    success: true,
    reward: task.reward,
    newBalance,
    taskType: task.task_type
  };
}

// Get user's AI tasks
export function getUserAITasks(userId, limit = 10) {
  return db.data.ai_tasks
    .filter(t => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

// AI Task prompts
export const TASK_PROMPTS = {
  [TASK_TYPES.TRANSLATE]: {
    name: '📝 Tłumaczenie',
    description: 'Przetłumacz tekst na inny język',
    prompt: (text, targetLang = 'angielski') =>
      `Przetłumacz następujący tekst na ${targetLang}. Zwróć tylko przetłumaczony tekst, bez dodatkowych komentarzy.\n\nTekst: ${text}`
  },
  [TASK_TYPES.SUMMARIZE]: {
    name: '📋 Podsumowanie',
    description: 'Podsumuj długi tekst',
    prompt: (text) =>
      `Podsumuj następujący tekst w 2-3 zdaniach. Bądź zwięzły i trafny.\n\nTekst: ${text}`
  },
  [TASK_TYPES.ANALYZE]: {
    name: '🔍 Analiza',
    description: 'Przeanalizuj tekst pod kątem sentymentu i tematów',
    prompt: (text) =>
      `Przeanalizuj następujący tekst:\n1. Sentyment (pozytywny/negatywny/neutralny)\n2. Główne tematy\n3. Kluczowe informacje\n\nTekst: ${text}`
  },
  [TASK_TYPES.GENERATE]: {
    name: '✨ Generowanie',
    description: 'Wygeneruj tekst na podstawie promptu',
    prompt: (text) =>
      `Wygeneruj tekst na podstawie poniższego opisu. Bądź kreatywny i użyteczny.\n\nOpis: ${text}`
  },
  [TASK_TYPES.CHAT]: {
    name: '💬 Czat AI',
    description: 'Porozmawiaj z AI',
    prompt: (text) => text
  }
};