import db from './sqlite.js';

const migrations = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    balance REAL DEFAULT 0,
    total_mined REAL DEFAULT 0,
    mining_rate REAL DEFAULT 1,
    last_mined TIMESTAMP,
    referred_by INTEGER,
    referral_code TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Mining sessions
  `CREATE TABLE IF NOT EXISTS mining_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    tokens_earned REAL DEFAULT 0,
    boost_used BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // AI tasks
  `CREATE TABLE IF NOT EXISTS ai_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_type TEXT NOT NULL,
    task_data TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    reward REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // Transactions
  `CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL,
    reference TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // Boosts
  `CREATE TABLE IF NOT EXISTS boosts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    boost_type TEXT NOT NULL,
    multiplier REAL DEFAULT 1,
    duration_hours INTEGER DEFAULT 1,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // Referrals
  `CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    bonus_earned REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
  )`,

  // Clans
  `CREATE TABLE IF NOT EXISTS clans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    leader_id INTEGER NOT NULL,
    total_mined REAL DEFAULT 0,
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES users(id)
  )`,

  // Clan members
  `CREATE TABLE IF NOT EXISTS clan_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clan_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clan_id) REFERENCES clans(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // Achievements
  `CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,

  // Settings
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

// Run migrations
console.log('Running database migrations...');
for (const sql of migrations) {
  db.exec(sql);
}
console.log('Migrations completed!');

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
  CREATE INDEX IF NOT EXISTS idx_mining_sessions_user_id ON mining_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
  CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
`);

console.log('Indexes created!');
console.log('Database setup complete.');