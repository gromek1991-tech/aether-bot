import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../database/sqlite.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.WEBAPP_PORT || 3001;

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Send JSON response
function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve index.html
  if (req.url === '/' || req.url === '/index.html') {
    const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  
  // API: Health check
  if (req.url === '/api/health') {
    sendJSON(res, { status: 'ok', version: '1.0.0' });
    return;
  }
  
  // API: Get user status
  if (req.url.startsWith('/api/user/') && req.method === 'GET') {
    const telegramId = parseInt(req.url.split('/api/user/')[1]);
    const user = db.findUser(telegramId);
    
    if (!user) {
      sendJSON(res, { error: 'User not found' }, 404);
      return;
    }
    
    sendJSON(res, {
      id: user.id,
      balance: user.balance || 0,
      totalMined: user.total_mined || 0,
      energy: user.energy || 100,
      maxEnergy: 100,
      level: user.level || 1,
      xp: user.xp || 0,
      taps: user.total_taps || 0,
      petEvolution: Math.min(Math.floor((user.total_mined || 0) / 100), 4)
    });
    return;
  }
  
  // API: Process tap
  if (req.url === '/api/tap' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = db.findUser(body.telegramId);
    
    if (!user) {
      sendJSON(res, { error: 'User not found' }, 404);
      return;
    }
    
    // Check energy
    if ((user.energy || 100) <= 0) {
      sendJSON(res, { error: 'No energy', energy: 0 });
      return;
    }
    
    // Calculate reward
    const combo = body.combo || 1;
    const reward = 0.1 * Math.min(1 + combo * 0.5, 5);
    
    // Update user
    const newBalance = (user.balance || 0) + reward;
    const newEnergy = (user.energy || 100) - 1;
    const newXp = (user.xp || 0) + 1;
    
    db.updateUser(user.id, {
      balance: newBalance,
      energy: newEnergy,
      xp: newXp,
      total_taps: (user.total_taps || 0) + 1,
      total_mined: (user.total_mined || 0) + reward
    });
    
    // Record transaction
    db.createTransaction(user.id, 'tap', reward, newBalance, 'Mini App tap');
    
    sendJSON(res, {
      success: true,
      reward,
      balance: newBalance,
      energy: newEnergy,
      xp: newXp,
      taps: (user.total_taps || 0) + 1
    });
    return;
  }
  
  // API: Claim daily bonus
  if (req.url === '/api/daily' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = db.findUser(body.telegramId);
    
    if (!user) {
      sendJSON(res, { error: 'User not found' }, 404);
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (user.last_daily_bonus === today) {
      sendJSON(res, { error: 'Already claimed today' });
      return;
    }
    
    const streak = Math.min((user.daily_streak || 0) + 1, 7);
    const bonus = 10 + (streak - 1) * 2;
    
    const newBalance = (user.balance || 0) + bonus;
    db.updateUser(user.id, {
      balance: newBalance,
      last_daily_bonus: today,
      daily_streak: streak
    });
    
    db.createTransaction(user.id, 'daily_bonus', bonus, newBalance, 'Mini App daily');
    
    sendJSON(res, {
      success: true,
      bonus,
      streak,
      balance: newBalance
    });
    return;
  }
  
  // API: Get leaderboard
  if (req.url === '/api/leaderboard' && req.method === 'GET') {
    const leaders = db.getMiningLeaderboard(20).map((u, i) => ({
      rank: i + 1,
      username: u.username || u.first_name || 'Anonim',
      balance: u.balance || 0,
      taps: u.total_taps || 0
    }));
    
    sendJSON(res, leaders);
    return;
  }
  
  // API: Get stats
  if (req.url === '/api/stats' && req.method === 'GET') {
    const users = db.data.users.length;
    const totalMined = db.data.users.reduce((sum, u) => sum + (u.total_mined || 0), 0);
    const totalTaps = db.data.users.reduce((sum, u) => sum + (u.total_taps || 0), 0);
    
    sendJSON(res, {
      users,
      totalMined: totalMined.toFixed(2),
      totalTaps
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🎮 AETHER Mini App: http://localhost:${PORT}`);
  console.log(`📱 Telegram Web App URL: https://t.me/AETHERBOT1000_bot/app`);
});
