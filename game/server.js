import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../database/sqlite.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.GAME_PORT || 3002;

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

// Send JSON
function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve game.html
  if (req.url === '/' || req.url === '/game.html') {
    const html = readFileSync(join(__dirname, 'game.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  
  // API: Health
  if (req.url === '/api/health') {
    sendJSON(res, { status: 'ok', game: 'Space Mining' });
    return;
  }
  
  // API: Submit score
  if (req.url === '/api/score' && req.method === 'POST') {
    const body = await parseBody(req);
    const user = db.findUser(body.telegramId);
    
    if (!user) {
      sendJSON(res, { error: 'User not found' }, 404);
      return;
    }
    
    // Award AET based on score
    const aetEarned = body.aet || 0;
    const newBalance = user.balance + aetEarned;
    
    db.updateUser(user.id, {
      balance: newBalance,
      total_taps: (user.total_taps || 0) + body.score
    });
    
    db.createTransaction(user.id, 'game', aetEarned, newBalance, `Space Mining: ${body.score} points`);
    
    sendJSON(res, {
      success: true,
      score: body.score,
      aetEarned,
      newBalance
    });
    return;
  }
  
  // API: Leaderboard
  if (req.url === '/api/leaderboard') {
    const leaders = db.data.users
      .filter(u => (u.total_taps || 0) > 0)
      .sort((a, b) => (b.total_taps || 0) - (a.total_taps || 0))
      .slice(0, 20)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username || u.first_name || 'Anonim',
        score: u.total_taps || 0,
        balance: u.balance || 0
      }));
    
    sendJSON(res, leaders);
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🚀 Space Mining Game: http://localhost:${PORT}`);
});
