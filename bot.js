import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import db from './database/sqlite.js';
import { getOrCreateUser, startMining, claimMining, getMiningStatus, getUserStats } from './mining/engine.js';
import { purchaseBooster, getActiveBoosts, getBoosterShop, formatBoosterShop, formatActiveBoosts } from './mining/boosters.js';
import { chat, SYSTEM_PROMPTS } from './ai/assistant.js';
import { createAITask, completeAITask, getDailyTasksRemaining, TASK_TYPES, TASK_PROMPTS } from './ai/tasks.js';
import { processReferral, getReferralStats, getReferralLeaderboard } from './social/referral.js';
import { getMiningLeaderboard, getBalanceLeaderboard, getWeeklyLeaderboard, getUserRank, formatLeaderboard } from './social/leaderboard.js';
import { createClan, joinClan, leaveClan, getClanInfo, getUserClan, getClanLeaderboard, formatClanInfo } from './social/clans.js';
import { t, setUserLanguage, getLanguageKeyboard, getLanguageName, isValidLanguage } from "./i18n/index.js";
import { stakeTokens, getUserStakes, claimStakingReward, formatStakingShop, formatUserStakes, STAKING_PLANS } from "./mining/staking.js";
import { startGameSession, processTap, getGameStatus, stopGameSession, claimDailyBonus, getTapLeaderboard, formatTapLeaderboard } from "./game/tap.js";
import { startQuiz, answerQuestion, getQuizStatus, getCategories } from "./game/quiz.js";
import { SOCIAL_TASKS, getAvailableTasks, completeTask, formatTasksList, getTasksKeyboard, handleTaskCallback } from "./social/tasks.js";
import { EVENT_TYPES, startEvent, getActiveEvents, getEventMultiplier, joinEvent, formatEventList, getEventsKeyboard, handleEventCallback, initEvents, autoStartEvents } from "./game/events.js";
import { MARKET_ITEMS, createListing, getListings, buyItem, cancelListing, formatListings, getMarketKeyboard } from "./social/marketplace.js";
import { NOTIFICATION_TYPES, scheduleNotification, getUserNotifications, markAsRead, markAllAsRead, formatNotifications, getUnreadCount, initNotifications } from "./utils/notifications.js";

console.log('All imports OK');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });
const conversations = new Map();

// ===== WELCOME =====
bot.onText(/\/start/, (msg) => {
  const user = getOrCreateUser(msg.from.id, msg.from.username, msg.from.first_name);
  const text = msg.text.split(' ');
  if (text.length > 1 && text[1].startsWith('ref_')) {
    const result = processReferral(user.id, text[1].replace('ref_', ''));
    if (result.success) bot.sendMessage(msg.chat.id, `🎉 ${result.message}`);
  }
  bot.sendMessage(msg.chat.id, `🌟 *Witaj w AETHER!*\n\n⛏️ Mining & Gry\n🤖 AI Tasks\n👥 Społeczność\n💰 Zarabiaj AET!\n\nUżyj /menu aby zobaczyć wszystkie komendy.`, { parse_mode: "Markdown" });
});

// ===== MENU =====
bot.onText(/\/menu/, (msg) => {
  bot.sendMessage(msg.chat.id, `🎮 *Menu AETHER*\n\n⛏️ *Mining:*\n/mine - Rozpocznij mining\n/claim - Zbierz nagrody\n/balance - Sprawdź saldo\n/status - Status miningu\n\n🎮 *Gry:*\n/play - Gra tap\n/tap - Klikaj\n/quiz - Quiz\n/daily - Bonus dzienny\n/spin - Lucky Spin\n\n🛒 *Sklep:*\n/boost - Boostery\n/stake - Staking\n\n🤖 *AI:*\n/ai <tekst> - Czat AI\n/tasks - Zadania AI\n\n👥 *Społeczność:*\n/referral - Polecaj\n/leaderboard - Ranking\n/clan - Klan\n/socialtasks - Zadania\n/events - Wydarzenia\n/market - Rynek\n\n⚙️ *Inne:*\n/profile - Profil\n/language - Język\n/notifications - Powiadomienia\n/achievements - Osiągnięcia`, { parse_mode: "Markdown" });
});

// ===== MINING =====
bot.onText(/\/mine/, (msg) => { const r = startMining(msg.from.id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/claim/, (msg) => { const r = claimMining(msg.from.id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/status/, (msg) => { const r = getMiningStatus(msg.from.id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/balance/, (msg) => { const s = getUserStats(msg.from.id); bot.sendMessage(msg.chat.id, `💰 *Saldo: ${s.balance.toFixed(2)} AET*\n\n⛏️ Wykopane: ${s.totalMined.toFixed(2)} AET\n🚀 Prędkość: ${s.miningRate.toFixed(2)} AET/h`, { parse_mode: "Markdown" }); });
bot.onText(/\/stats/, (msg) => { const s = getUserStats(msg.from.id); bot.sendMessage(msg.chat.id, `📊 *Statystyki*\n\n💰 Saldo: ${s.balance.toFixed(2)} AET\n⛏️ Wykopane: ${s.totalMined.toFixed(2)} AET\n🚀 Prędkość: ${s.miningRate.toFixed(2)} AET/h\n👥 Polecenia: ${s.totalReferrals}\n🏆 Osiągnięcia: ${s.achievements}`, { parse_mode: "Markdown" }); });

// ===== BOOSTERS =====
bot.onText(/\/boost$/, (msg) => { const u = getOrCreateUser(msg.from.id); bot.sendMessage(msg.chat.id, formatBoosterShop(u.balance), { parse_mode: "Markdown" }); });
bot.onText(/\/boost (\d+)/, (msg, m) => { const shop = getBoosterShop(); const idx = parseInt(m[1]) - 1; if (idx >= 0 && idx < shop.length) { const r = purchaseBooster(msg.from.id, shop[idx].id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); } else { bot.sendMessage(msg.chat.id, '❌ Nieprawidłowy numer.'); } });
bot.onText(/\/boosts/, (msg) => { const b = getActiveBoosts(msg.from.id); bot.sendMessage(msg.chat.id, formatActiveBoosts(b), { parse_mode: "Markdown" }); });

// ===== STAKING =====
bot.onText(/\/stake$/, (msg) => { const u = getOrCreateUser(msg.from.id); bot.sendMessage(msg.chat.id, formatStakingShop(u.balance), { parse_mode: "Markdown" }); });
bot.onText(/\/stake (\d+) (\d+)/, (msg, m) => { const plans = Object.values(STAKING_PLANS); const idx = parseInt(m[1]) - 1; if (idx >= 0 && idx < plans.length) { const r = stakeTokens(msg.from.id, plans[idx].id, parseInt(m[2])); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); } else { bot.sendMessage(msg.chat.id, '❌ Nieprawidłowy plan.'); } });
bot.onText(/\/stakes/, (msg) => { const s = getUserStakes(msg.from.id); bot.sendMessage(msg.chat.id, formatUserStakes(s), { parse_mode: "Markdown" }); });

// ===== AI =====
bot.onText(/\/tasks/, (msg) => { bot.sendMessage(msg.chat.id, `🤖 *Zadania AI*\n\n/translate <tekst> - Tłumaczenie (0.5 AET)\n/summarize <tekst> - Podsumowanie (0.3 AET)\n/analyze <tekst> - Analiza (0.8 AET)\n/generate <tekst> - Generowanie (1.0 AET)\n\n Dzienny limit: ${getDailyTasksRemaining(msg.from.id)}`, { parse_mode: "Markdown" }); });
bot.onText(/\/translate (.+)/, async (msg, m) => { const t = createAITask(msg.from.id, 'translate', m[1]); if (!t.success) return bot.sendMessage(msg.chat.id, t.message); try { const r = await chat([{role:'user',content:m[1]}], {systemPrompt:SYSTEM_PROMPTS.translator}); completeAITask(t.taskId, r); bot.sendMessage(msg.chat.id, `📝 ${r}\n\n💰 +${t.reward} AET`, { parse_mode: "Markdown" }); } catch(e) { bot.sendMessage(msg.chat.id, '❌ Błąd AI.'); } });
bot.onText(/\/summarize (.+)/, async (msg, m) => { const t = createAITask(msg.from.id, 'summarize', m[1]); if (!t.success) return bot.sendMessage(msg.chat.id, t.message); try { const r = await chat([{role:'user',content:m[1]}], {systemPrompt:SYSTEM_PROMPTS.summarizer}); completeAITask(t.taskId, r); bot.sendMessage(msg.chat.id, `📋 ${r}\n\n💰 +${t.reward} AET`, { parse_mode: "Markdown" }); } catch(e) { bot.sendMessage(msg.chat.id, '❌ Błąd AI.'); } });
bot.onText(/\/analyze (.+)/, async (msg, m) => { const t = createAITask(msg.from.id, 'analyze', m[1]); if (!t.success) return bot.sendMessage(msg.chat.id, t.message); try { const r = await chat([{role:'user',content:m[1]}], {systemPrompt:SYSTEM_PROMPTS.analyst}); completeAITask(t.taskId, r); bot.sendMessage(msg.chat.id, `🔍 ${r}\n\n💰 +${t.reward} AET`, { parse_mode: "Markdown" }); } catch(e) { bot.sendMessage(msg.chat.id, '❌ Błąd AI.'); } });
bot.onText(/\/generate (.+)/, async (msg, m) => { const t = createAITask(msg.from.id, 'generate', m[1]); if (!t.success) return bot.sendMessage(msg.chat.id, t.message); try { const r = await chat([{role:'user',content:m[1]}]); completeAITask(t.taskId, r); bot.sendMessage(msg.chat.id, `✨ ${r}\n\n💰 +${t.reward} AET`, { parse_mode: "Markdown" }); } catch(e) { bot.sendMessage(msg.chat.id, '❌ Błąd AI.'); } });
bot.onText(/\/ai (.+)/, async (msg, m) => { const uid = msg.from.id; if (!conversations.has(uid)) conversations.set(uid, []); const h = conversations.get(uid); h.push({role:'user',content:m[1]}); if (h.length > 20) h.splice(0, h.length - 20); try { const r = await chat(h, {systemPrompt:SYSTEM_PROMPTS.assistant}); h.push({role:'assistant',content:r}); bot.sendMessage(msg.chat.id, r); } catch(e) { bot.sendMessage(msg.chat.id, '❌ Błąd AI.'); } });
bot.onText(/\/clear/, (msg) => { conversations.delete(msg.from.id); bot.sendMessage(msg.chat.id, '🗑️ Historia wyczyszczona.'); });

// ===== REFERRAL =====
bot.onText(/\/referral/, (msg) => { const s = getReferralStats(msg.from.id); bot.sendMessage(msg.chat.id, `👥 *System Poleceń*\n\n🔗 Kod: \`${s.referralCode}\`\n👥 Polecone: ${s.totalReferrals}\n💰 Zarobione: ${s.totalBonus.toFixed(2)} AET\n\nLink: \`https://t.me/AETHERBOT1000_bot?start=ref_${s.referralCode}\``, { parse_mode: "Markdown" }); });
bot.onText(/\/ref (.+)/, (msg, m) => { const r = processReferral(msg.from.id, m[1]); bot.sendMessage(msg.chat.id, r.message); });

// ===== LEADERBOARD =====
bot.onText(/\/leaderboard/, (msg) => { const l = getMiningLeaderboard(10); bot.sendMessage(msg.chat.id, formatLeaderboard(l, 'mining'), { parse_mode: "Markdown" }); });

// ===== CLAN =====
bot.onText(/\/clan$/, (msg) => { const c = getUserClan(msg.from.id); if (c) { const info = getClanInfo(c.id); bot.sendMessage(msg.chat.id, formatClanInfo(info), { parse_mode: "Markdown" }); } else { bot.sendMessage(msg.chat.id, '🏴 Nie jesteś w klanie.\n\n/clan create <nazwa>\n/clan join <id>'); } });
bot.onText(/\/clan create (.+)/, (msg, m) => { const r = createClan(msg.from.id, m[1]); bot.sendMessage(msg.chat.id, r.message); });
bot.onText(/\/clan join (\d+)/, (msg, m) => { const r = joinClan(msg.from.id, parseInt(m[1])); bot.sendMessage(msg.chat.id, r.message); });
bot.onText(/\/clan leave/, (msg) => { const r = leaveClan(msg.from.id); bot.sendMessage(msg.chat.id, r.message); });

// ===== GAME =====
bot.onText(/\/play/, (msg) => { startGameSession(msg.from.id); const s = getGameStatus(msg.from.id); bot.sendMessage(msg.chat.id, s.message, { parse_mode: "Markdown" }); });
bot.onText(/\/tap/, (msg) => { const r = processTap(msg.from.id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/game/, (msg) => { const s = getGameStatus(msg.from.id); bot.sendMessage(msg.chat.id, s.message, { parse_mode: "Markdown" }); });
bot.onText(/\/stopgame/, (msg) => { const r = stopGameSession(msg.from.id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/daily/, (msg) => { const r = claimDailyBonus(msg.from.id); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/tapleaderboard/, (msg) => { const l = getTapLeaderboard(10); bot.sendMessage(msg.chat.id, formatTapLeaderboard(l), { parse_mode: "Markdown" }); });

// ===== QUIZ =====
bot.onText(/\/quiz(?:\s+(\w+))?/, (msg, m) => { const r = startQuiz(msg.from.id, m[1] || 'all'); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/quizstatus/, (msg) => { const s = getQuizStatus(msg.from.id); bot.sendMessage(msg.chat.id, s.message, { parse_mode: "Markdown" }); });
bot.onText(/\/categories/, (msg) => { const c = getCategories(); let txt = '🧠 *Kategorie:*\n\n'; c.forEach(x => { txt += `${x.name} (${x.questions} pytań)\n`; }); bot.sendMessage(msg.chat.id, txt, { parse_mode: "Markdown" }); });
bot.onText(/^[1-4]$/, (msg) => { const r = answerQuestion(msg.from.id, msg.text); if (r.success) bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });

// ===== SOCIAL TASKS =====
bot.onText(/\/socialtasks/, (msg) => { const tasks = getAvailableTasks(msg.from.id); bot.sendMessage(msg.chat.id, formatTasksList(tasks), { parse_mode: "Markdown", ...getTasksKeyboard(tasks) }); });

// ===== EVENTS =====
bot.onText(/\/events/, (msg) => { const e = getActiveEvents(); bot.sendMessage(msg.chat.id, formatEventList(e), { parse_mode: "Markdown", ...getEventsKeyboard(e) }); });

// ===== MARKET =====
bot.onText(/\/market/, (msg) => { const l = getListings(); bot.sendMessage(msg.chat.id, formatListings(l), { parse_mode: "Markdown", ...getMarketKeyboard(l) }); });
bot.onText(/\/sell (.+) (\d+)/, (msg, m) => { const r = createListing(msg.from.id, m[1], parseInt(m[2])); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });
bot.onText(/\/buy (.+)/, (msg, m) => { const r = buyItem(msg.from.id, m[1]); bot.sendMessage(msg.chat.id, r.message, { parse_mode: "Markdown" }); });

// ===== LANGUAGE =====
bot.onText(/\/language/, (msg) => { bot.sendMessage(msg.chat.id, t(msg.from.id, 'language.title'), getLanguageKeyboard()); });

// ===== PROFILE =====
bot.onText(/\/profile/, (msg) => { const u = getOrCreateUser(msg.from.id); const s = getUserStats(msg.from.id); bot.sendMessage(msg.chat.id, `👤 *Profil*\n\n📛 ${u.username || u.first_name}\n📊 Poziom: ${u.level || 1}\n💰 Saldo: ${u.balance.toFixed(2)} AET\n⛏️ Wykopane: ${u.totalMined.toFixed(2)} AET\n👆 Taps: ${u.total_taps || 0}\n👥 Polecenia: ${s.totalReferrals}\n🏆 Osiągnięcia: ${s.achievements}`, { parse_mode: "Markdown" }); });

// ===== NOTIFICATIONS =====
bot.onText(/\/notifications/, (msg) => { const n = getUserNotifications(msg.from.id); bot.sendMessage(msg.chat.id, formatNotifications(n), { parse_mode: "Markdown" }); });

// ===== ACHIEVEMENTS =====
bot.onText(/\/achievements/, (msg) => { const a = db.getUserAchievements(msg.from.id); let txt = '🏆 *Osiągnięcia:*\n\n'; if (a.length === 0) txt += 'Brak osiągnięć. Zdobywaj je grając!'; else a.forEach(x => { txt += `✅ ${x.achievement_name}\n`; }); bot.sendMessage(msg.chat.id, txt, { parse_mode: "Markdown" }); });

// ===== SPIN =====
bot.onText(/\/spin/, (msg) => { const u = getOrCreateUser(msg.from.id); const today = new Date().toISOString().split('T')[0]; if (u.last_spin === today) return bot.sendMessage(msg.chat.id, '🎰 Już kręciłeś dzisiaj!'); const prizes = [1,2,5,10,25,50,100]; const prize = prizes[Math.floor(Math.random()*prizes.length)]; db.updateUser(u.id, { balance: u.balance + prize, last_spin: today }); bot.sendMessage(msg.chat.id, `🎰 *Lucky Spin!*\n\n🎉 Wygrałeś: *${prize} AET*\n💰 Saldo: ${(u.balance + prize).toFixed(2)} AET`, { parse_mode: "Markdown" }); });

// ===== CALLBACKS =====
bot.on('callback_query', (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  
  // Language
  if (data.startsWith('lang_')) {
    const lang = data.replace('lang_', '');
    if (isValidLanguage(lang)) {
      setUserLanguage(userId, lang);
      bot.answerCallbackQuery(query.id, { text: '✅' });
      bot.editMessageText(t(userId, 'language.selected') + ' ' + getLanguageName(lang), { chat_id: chatId, message_id: query.message.message_id });
    }
  }
  // Tasks
  if (data.startsWith('task_')) {
    const result = handleTaskCallback(data);
    if (result?.action === 'complete') {
      const r = completeTask(userId, result.taskId);
      bot.answerCallbackQuery(query.id, { text: r.success ? '✅' : '❌' });
      bot.sendMessage(chatId, r.message, { parse_mode: "Markdown" });
    }
    if (data === 'tasks_refresh') {
      const tasks = getAvailableTasks(userId);
      bot.editMessageText(formatTasksList(tasks), { chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getTasksKeyboard(tasks) });
    }
  }
  // Events
  if (data.startsWith('event_')) {
    const result = handleEventCallback(data);
    if (result?.action === 'join') {
      const r = joinEvent(userId, result.eventId);
      bot.answerCallbackQuery(query.id, { text: r.success ? '✅' : '❌' });
      bot.sendMessage(chatId, r.message, { parse_mode: "Markdown" });
    }
  }
  // Market
  if (data.startsWith('buy_')) {
    const r = buyItem(userId, data.replace('buy_', ''));
    bot.answerCallbackQuery(query.id, { text: r.success ? '✅' : '❌' });
    bot.sendMessage(chatId, r.message, { parse_mode: "Markdown" });
  }
  if (data === 'market_refresh') {
    const l = getListings();
    bot.editMessageText(formatListings(l), { chat_id: chatId, message_id: query.message.message_id, parse_mode: "Markdown", ...getMarketKeyboard(l) });
  }
});

// ===== MINING CHECKER =====
// ===== SPACE MINING GAME =====
bot.onText(/\/space/, (msg) => {
  bot.sendMessage(msg.chat.id, `🚀 *Space Mining Game*\n\nZbieraj 💎 i unikaj ☄️!\n\nOtwórz grę: http://localhost:3002\n\nLub kliknij przycisk poniżej:`, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "🚀 Graj!", url: "http://localhost:3002" }]]
    }
  });
});

bot.onText(/\/highscore/, (msg) => {
  const leaders = db.data.users
    .filter(u => (u.total_taps || 0) > 0)
    .sort((a, b) => (b.total_taps || 0) - (a.total_taps || 0))
    .slice(0, 10);
  
  let text = "🏆 *Space Mining Highscores:*\n\n";
  const medals = ["🥇", "🥈", "🥉"];
  leaders.forEach((u, i) => {
    text += `${medals[i] || `${i+1}.`} ${u.username || u.first_name}: ${u.total_taps || 0} pts\n`;
  });
  
  if (leaders.length === 0) text += "Brak wyników. Zagraj: /space";
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});
setInterval(() => {
  const sessions = db.getAllActiveMiningSessions();
  const MINING_INTERVAL_MS = (process.env.MINING_INTERVAL_HOURS || 4) * 60 * 60 * 1000;
  sessions.forEach(s => {
    const user = db.findUserById(s.user_id);
    if (!user) return;
    const elapsed = Date.now() - new Date(s.started_at).getTime();
    if (elapsed >= MINING_INTERVAL_MS) {
      const reward = parseFloat(process.env.MINING_RATE || 1) * Math.min(elapsed / (60*60*1000), 8);
      bot.sendMessage(user.telegram_id, `✅ *Mining zakończony!*\n💰 +${reward.toFixed(2)} AET\n/use /claim aby odebrać`, { parse_mode: "Markdown" }).catch(() => {});
    }
  });
}, 5 * 60 * 1000);

// ===== ERROR HANDLING =====
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.code);
});

process.on('SIGINT', () => { bot.stopPolling(); process.exit(0); });
process.on('SIGTERM', () => { bot.stopPolling(); process.exit(0); });

// ===== INIT =====
initEvents();
initNotifications();
setInterval(() => { autoStartEvents(); }, 60 * 60 * 1000);

console.log('🌟 AETHER Bot uruchomiony!');
console.log('📌 Komendy: /start, /mine, /claim, /balance, /play, /tap, /quiz, /daily, /spin, /boost, /stake, /ai, /referral, /leaderboard, /clan, /language, /profile, /menu');
console.log('⏳ Czekam na połączenie z Telegram...');
