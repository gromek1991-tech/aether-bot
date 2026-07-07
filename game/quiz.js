import db from '../database/sqlite.js';

// Quiz questions
const QUESTIONS = [
  // Crypto
  { q: "Co to jest Bitcoin?", a: ["Kryptowaluta", "Aplikacja", "Gra", "Film"], correct: 0, category: "crypto", reward: 2 },
  { q: "Kto stworzył Bitcoin?", a: ["Satoshi Nakamoto", "Elon Musk", "Vitalik Buterin", "Bill Gates"], correct: 0, category: "crypto", reward: 3 },
  { q: "Co to jest blockchain?", a: [" Łańcuch bloków", "Grupa ludzi", "Aplikacja mobilna", "Serwer"], correct: 0, category: "crypto", reward: 2 },
  { q: "Ile kosztował Bitcoin w 2010?", a: ["$0.003", "$100", "$1000", "$10000"], correct: 0, category: "crypto", reward: 4 },
  { q: "Co to jest mining?", a: ["Wydobywanie kryptowalut", "Kopanie w ziemi", "Gra komputerowa", "Program komputerowy"], correct: 0, category: "crypto", reward: 2 },
  { q: "Co to jest Ethereum?", a: ["Platforma blockchain", "Kryptowaluta", "Giełda", "Portfel"], correct: 0, category: "crypto", reward: 3 },
  { q: "Co to jest DeFi?", a: ["Zdecentralizowane finanse", "Darmowe finanse", "Duże finanse", "Dobre finanse"], correct: 0, category: "crypto", reward: 3 },
  { q: "Co to jest NFT?", a: ["Non-fungible token", "Nowy fundusz tokenów", "Następna generacja", "Nie-fajny token"], correct: 0, category: "crypto", reward: 3 },
  { q: "Co to jest stablecoin?", a: ["Stabilna kryptowaluta", "Stara kryptowaluta", "Szybka kryptowaluta", "Silna kryptowaluta"], correct: 0, category: "crypto", reward: 2 },
  { q: "Co to jest halving?", a: ["Zmniejszenie nagrody o połowę", "Podwojenie nagrody", "Zmiana hasła", "Aktualizacja systemu"], correct: 0, category: "crypto", reward: 4 },
  
  // AI
  { q: "Co to jest AI?", a: ["Sztuczna inteligencja", "Nowy telefon", "Gra komputerowa", "Aplikacja"], correct: 0, category: "ai", reward: 2 },
  { q: "Co to jest machine learning?", a: ["Uczenie maszynowe", "Maszyna do nauki", "Nowy komputer", "Program"], correct: 0, category: "ai", reward: 3 },
  { q: "Co to jest neural network?", a: ["Sieć neuronowa", "Nowa sieć internetowa", "Połączenie komputerów", "Grupa ludzi"], correct: 0, category: "ai", reward: 3 },
  { q: "Kto stworzył ChatGPT?", a: ["OpenAI", "Google", "Facebook", "Microsoft"], correct: 0, category: "ai", reward: 2 },
  { q: "Co to jest LLM?", a: ["Large Language Model", "Little Language Model", "Long Language Model", "Light Language Model"], correct: 0, category: "ai", reward: 4 },
  
  // AETHER
  { q: "Co to jest AETHER?", a: ["Token AI", "Aplikacja mobilna", "Gra komputerowa", "Film"], correct: 0, category: "aether", reward: 2 },
  { q: "Ile języków obsługuje AETHER?", a: ["5", "3", "10", "2"], correct: 0, category: "aether", reward: 2 },
  { q: "Co to jest AET?", a: ["Token AETHER", "Aplikacja", "Gra", "Film"], correct: 0, category: "aether", reward: 2 },
  { q: "Jak zdobyć AET?", a: ["Mining, tapy, zadania", "Tylko mining", "Tylko tapy", "Tylko zadania"], correct: 0, category: "aether", reward: 3 },
  { q: "Co to jest staking?", a: ["Zamrożenie tokenów", "Wydobywanie", "Sprzedaż", "Kupno"], correct: 0, category: "aether", reward: 3 }
];

// Active quiz sessions
const activeQuizzes = new Map();

// Start quiz
export function startQuiz(telegramId, category = 'all') {
  const user = db.findUser(telegramId);
  if (!user) return { success: false, message: '❌ Użytkownik nie znaleziony.' };

  // Get questions for category
  let questions = category === 'all' 
    ? QUESTIONS 
    : QUESTIONS.filter(q => q.category === category);

  // Shuffle and pick 5
  questions = questions.sort(() => Math.random() - 0.5).slice(0, 5);

  const quiz = {
    userId: user.id,
    telegramId,
    questions,
    currentQuestion: 0,
    score: 0,
    totalReward: 0,
    startTime: Date.now()
  };

  activeQuizzes.set(telegramId, quiz);

  return {
    success: true,
    quiz,
    message: `🧠 *Quiz AETHER*\n\n📝 Pytania: ${questions.length}\n💰 Potencjalna nagroda: ${questions.reduce((sum, q) => sum + q.reward, 0)} AET\n\nGotowy? Zacznij pisząc numer odpowiedzi (1-4)!`
  };
}

// Answer question
export function answerQuestion(telegramId, answer) {
  const quiz = activeQuizzes.get(telegramId);
  if (!quiz) {
    return { success: false, message: '❌ Nie masz aktywnego quizu. Użyj /quiz aby rozpocząć.' };
  }

  const question = quiz.questions[quiz.currentQuestion];
  if (!question) {
    return endQuiz(telegramId);
  }

  const answerIndex = parseInt(answer) - 1;
  if (answerIndex < 0 || answerIndex > 3) {
    return { success: false, message: '❌ Podaj numer 1-4.' };
  }

  const isCorrect = answerIndex === question.correct;
  let message = '';

  if (isCorrect) {
    quiz.score++;
    quiz.totalReward += question.reward;
    message = `✅ Poprawnie! +${question.reward} AET\n\n`;
  } else {
    message = `❌ Błędzie! Prawidłowa odpowiedź: ${question.a[question.correct]}\n\n`;
  }

  quiz.currentQuestion++;

  // Check if quiz ended
  if (quiz.currentQuestion >= quiz.questions.length) {
    return endQuiz(telegramId);
  }

  // Next question
  const nextQ = quiz.questions[quiz.currentQuestion];
  message += `📝 *Pytanie ${quiz.currentQuestion + 1}/${quiz.questions.length}:*\n\n`;
  message += `${nextQ.q}\n\n`;
  nextQ.a.forEach((a, i) => {
    message += `${i + 1}. ${a}\n`;
  });

  return {
    success: true,
    isCorrect,
    message,
    score: quiz.score,
    remaining: quiz.questions.length - quiz.currentQuestion
  };
}

// End quiz
function endQuiz(telegramId) {
  const quiz = activeQuizzes.get(telegramId);
  if (!quiz) {
    return { success: false, message: '❌ Quiz nie znaleziony.' };
  }

  // Award reward
  const user = db.findUserById(quiz.userId);
  if (user && quiz.totalReward > 0) {
    const newBalance = user.balance + quiz.totalReward;
    db.updateUser(quiz.userId, { balance: newBalance });
    db.createTransaction(quiz.userId, 'quiz', quiz.totalReward, newBalance, `Quiz: ${quiz.score}/${quiz.questions.length}`);
  }

  const timeTaken = Math.floor((Date.now() - quiz.startTime) / 1000);
  const percentage = Math.floor((quiz.score / quiz.questions.length) * 100);

  let emoji = '🏆';
  if (percentage === 100) emoji = '🌟';
  else if (percentage >= 80) emoji = '🎉';
  else if (percentage >= 60) emoji = '👍';
  else if (percentage >= 40) emoji = '😊';
  else emoji = '📚';

  const message = `${emoji} *Quiz Zakończone!*\n\n📊 Wynik: ${quiz.score}/${quiz.questions.length} (${percentage}%)\n💰 Nagroda: +${quiz.totalReward} AET\n⏱️ Czas: ${timeTaken}s\n\n${percentage === 100 ? '🌟 Perfekcyjny wynik!' : '📚 Spróbuj ponownie aby poprawić wynik!'}`;

  activeQuizzes.delete(telegramId);

  return {
    success: true,
    score: quiz.score,
    total: quiz.questions.length,
    reward: quiz.totalReward,
    message
  };
}

// Get quiz status
export function getQuizStatus(telegramId) {
  const quiz = activeQuizzes.get(telegramId);
  if (!quiz) {
    return { active: false, message: '🧠 Brak aktywnego quizu. Użyj /quiz aby rozpocząć.' };
  }

  const question = quiz.questions[quiz.currentQuestion];
  let text = `🧠 *Quiz AETHER*\n\n`;
  text += `📝 Pytanie ${quiz.currentQuestion + 1}/${quiz.questions.length}\n`;
  text += `💰 Nagroda: ${quiz.totalReward} AET\n\n`;
  text += `${question.q}\n\n`;
  question.a.forEach((a, i) => {
    text += `${i + 1}. ${a}\n`;
  });

  return {
    active: true,
    question: quiz.currentQuestion + 1,
    total: quiz.questions.length,
    message: text
  };
}

// Get categories
export function getCategories() {
  return [
    { id: 'all', name: '🎲 Wszystkie', questions: QUESTIONS.length },
    { id: 'crypto', name: '💰 Kryptowaluty', questions: QUESTIONS.filter(q => q.category === 'crypto').length },
    { id: 'ai', name: '🤖 AI', questions: QUESTIONS.filter(q => q.category === 'ai').length },
    { id: 'aether', name: '🌟 AETHER', questions: QUESTIONS.filter(q => q.category === 'aether').length }
  ];
}

export default {
  startQuiz,
  answerQuestion,
  getQuizStatus,
  getCategories
};
