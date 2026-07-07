import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from './database/sqlite.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// API endpoints
const API = {
  // Get global stats
  '/api/stats': () => {
    const users = db.data.users.length;
    const totalMined = db.data.users.reduce((sum, u) => sum + u.total_mined, 0);
    const totalBalance = db.data.users.reduce((sum, u) => sum + u.balance, 0);
    const activeSessions = db.getAllActiveMiningSessions().length;
    const totalTransactions = db.data.transactions.length;

    return {
      users,
      totalMined: totalMined.toFixed(2),
      totalBalance: totalBalance.toFixed(2),
      activeSessions,
      totalTransactions
    };
  },

  // Get leaderboard
  '/api/leaderboard': () => {
    return db.getMiningLeaderboard(20).map((u, i) => ({
      rank: i + 1,
      username: u.username || u.first_name || 'Anonim',
      totalMined: u.total_mined.toFixed(2),
      balance: u.balance.toFixed(2)
    }));
  },

  // Get recent transactions
  '/api/transactions': () => {
    return db.data.transactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50)
      .map(t => {
        const user = db.findUserById(t.user_id);
        return {
          ...t,
          username: user?.username || user?.first_name || 'Anonim'
        };
      });
  },

  // Get clans
  '/api/clans': () => {
    return db.data.clans.map(c => {
      const leader = db.findUserById(c.leader_id);
      return {
        ...c,
        leader_name: leader?.username || leader?.first_name || 'Nieznany'
      };
    });
  }
};

// HTML Dashboard
function getDashboard() {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AETHER Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header {
      text-align: center;
      padding: 40px 0;
    }
    h1 {
      font-size: 3rem;
      background: linear-gradient(90deg, #8B5CF6, #3B82F6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 10px;
    }
    .subtitle { color: #94a3b8; font-size: 1.2rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 40px 0;
    }
    .stat-card {
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      background: linear-gradient(90deg, #10B981, #3B82F6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-label { color: #94a3b8; margin-top: 8px; }
    .section {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 24px;
      margin: 20px 0;
    }
    .section-title {
      font-size: 1.5rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    th { color: #94a3b8; font-weight: 500; }
    tr:hover { background: rgba(255,255,255,0.05); }
    .rank-1 { color: #FFD700; }
    .rank-2 { color: #C0C0C0; }
    .rank-3 { color: #CD7F32; }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(90deg, #8B5CF6, #3B82F6);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 20px;
      transition: transform 0.2s;
    }
    .btn:hover { transform: scale(1.05); }
    footer {
      text-align: center;
      padding: 40px 0;
      color: #64748b;
    }
    .loading { text-align: center; padding: 40px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AETHER</h1>
      <p class="subtitle">Mine the Future of AI</p>
    </header>

    <div class="stats-grid" id="stats">
      <div class="loading">Ładowanie...</div>
    </div>

    <div class="section">
      <h2 class="section-title">⛏️ Ranking Miners</h2>
      <table id="leaderboard">
        <thead>
          <tr>
            <th>#</th>
            <th>Użytkownik</th>
            <th>Wykopane</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="4" class="loading">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">🏴 Klany</h2>
      <table id="clans">
        <thead>
          <tr>
            <th>Nazwa</th>
            <th>Lider</th>
            <th>Członkowie</th>
            <th>Wykopane</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="4" class="loading">Ładowanie...</td></tr>
        </tbody>
      </table>
    </div>

    <div style="text-align: center">
      <a href="https://t.me/AETHERMinerBot" class="btn">🚀 Otwórz Bota Telegram</a>
    </div>

    <footer>
      <p>AETHER © 2026 | Mine the Future of AI</p>
    </footer>
  </div>

  <script>
    async function loadData() {
      try {
        // Load stats
        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();
        document.getElementById('stats').innerHTML = \`
          <div class="stat-card">
            <div class="stat-value">\${stats.users}</div>
            <div class="stat-label">Użytkowników</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${stats.totalMined}</div>
            <div class="stat-label">Wykopano AET</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${stats.activeSessions}</div>
            <div class="stat-label">Aktywnych Miningów</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${stats.totalTransactions}</div>
            <div class="stat-label">Transakcji</div>
          </div>
        \`;

        // Load leaderboard
        const leaderRes = await fetch('/api/leaderboard');
        const leaders = await leaderRes.json();
        const leaderHtml = leaders.map((u, i) => \`
          <tr>
            <td class="\${i < 3 ? 'rank-' + (i+1) : ''}">\${['🥇','🥈','🥉'][i] || i+1}</td>
            <td>\${u.username}</td>
            <td>\${u.totalMined} AET</td>
            <td>\${u.balance} AET</td>
          </tr>
        \`).join('');
        document.querySelector('#leaderboard tbody').innerHTML = leaderHtml || '<tr><td colspan="4">Brak danych</td></tr>';

        // Load clans
        const clanRes = await fetch('/api/clans');
        const clans = await clanRes.json();
        const clanHtml = clans.map(c => \`
          <tr>
            <td>\${c.name}</td>
            <td>@\${c.leader_name}</td>
            <td>\${c.member_count}</td>
            <td>\${c.total_mined.toFixed(2)} AET</td>
          </tr>
        \`).join('');
        document.querySelector('#clans tbody').innerHTML = clanHtml || '<tr><td colspan="4">Brak klanów</td></tr>';

      } catch (err) {
        console.error('Error loading data:', err);
      }
    }

    loadData();
    setInterval(loadData, 30000); // Refresh every 30s
  </script>
</body>
</html>`;
}

// Create server
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes
  if (API[url.pathname]) {
    try {
      const data = API[url.pathname]();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Dashboard
  if (url.pathname === '/' || url.pathname === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getDashboard());
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🌐 AETHER Dashboard: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/stats`);
});