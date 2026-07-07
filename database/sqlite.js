import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/aether.json';

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

// Simple JSON database
class JSONDatabase {
  constructor(path) {
    this.path = path;
    this.data = this.load();
  }

  load() {
    if (existsSync(this.path)) {
      try {
        return JSON.parse(readFileSync(this.path, 'utf-8'));
      } catch {
        return this.getDefaultData();
      }
    }
    return this.getDefaultData();
  }

  getDefaultData() {
    return {
      users: [],
      mining_sessions: [],
      ai_tasks: [],
      transactions: [],
      boosts: [],
      referrals: [],
      clans: [],
      clan_members: [],
      achievements: [],
      settings: {}
    };
  }

  save() {
    writeFileSync(this.path, JSON.stringify(this.data, null, 2));
  }

  // Users
  findUser(telegramId) {
    return this.data.users.find(u => u.telegram_id === telegramId);
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  findUserByReferralCode(code) {
    return this.data.users.find(u => u.referral_code === code);
  }

  updateClanLeader(clanId, userId) {
    const clan = this.findClan(clanId);
    if (clan) {
      clan.leader_id = userId;
      // Update member role
      const oldLeader = this.data.clan_members.find(m => m.clan_id === clanId && m.role === 'leader');
      if (oldLeader) oldLeader.role = 'member';
      const newLeader = this.data.clan_members.find(m => m.clan_id === clanId && m.user_id === userId);
      if (newLeader) newLeader.role = 'leader';
      this.save();
    }
  }

  updateClanMined(clanId, amount) {
    const clan = this.findClan(clanId);
    if (clan) {
      clan.total_mined += amount;
      this.save();
    }
  }

  createUser(telegramId, username, firstName, referralCode) {
    const id = this.data.users.length + 1;
    const user = {
      id,
      telegram_id: telegramId,
      username,
      first_name: firstName,
      balance: 0,
      total_mined: 0,
      mining_rate: 1,
      last_mined: null,
      referred_by: null,
      referral_code: referralCode,
      language: "pl",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (user) {
      Object.assign(user, updates, { updated_at: new Date().toISOString() });
      this.save();
    }
    return user;
  }

  // Mining Sessions
  findActiveMiningSession(userId) {
    return this.data.mining_sessions.find(s => s.user_id === userId && !s.ended_at);
  }

  createMiningSession(userId, boostUsed = false) {
    const id = this.data.mining_sessions.length + 1;
    const session = {
      id,
      user_id: userId,
      started_at: new Date().toISOString(),
      ended_at: null,
      tokens_earned: 0,
      boost_used: boostUsed
    };
    this.data.mining_sessions.push(session);
    this.save();
    return session;
  }

  updateMiningSession(id, updates) {
    const session = this.data.mining_sessions.find(s => s.id === id);
    if (session) {
      Object.assign(session, updates);
      this.save();
    }
    return session;
  }

  getAllActiveMiningSessions() {
    return this.data.mining_sessions.filter(s => !s.ended_at);
  }

  // AI Tasks
  createAITask(userId, taskType, taskData, reward) {
    const id = this.data.ai_tasks.length + 1;
    const task = {
      id,
      user_id: userId,
      task_type: taskType,
      task_data: taskData,
      status: 'pending',
      result: null,
      reward,
      created_at: new Date().toISOString(),
      completed_at: null
    };
    this.data.ai_tasks.push(task);
    this.save();
    return task;
  }

  findAITask(id) {
    return this.data.ai_tasks.find(t => t.id === id);
  }

  updateAITask(id, updates) {
    const task = this.data.ai_tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      this.save();
    }
    return task;
  }

  getDailyTaskCount(userId) {
    const today = new Date().toISOString().split('T')[0];
    return this.data.ai_tasks.filter(t =>
      t.user_id === userId &&
      t.status === 'completed' &&
      t.completed_at &&
      t.completed_at.startsWith(today)
    ).length;
  }

  // Transactions
  createTransaction(userId, type, amount, balanceAfter, reference) {
    const id = this.data.transactions.length + 1;
    const tx = {
      id,
      user_id: userId,
      type,
      amount,
      balance_after: balanceAfter,
      reference,
      created_at: new Date().toISOString()
    };
    this.data.transactions.push(tx);
    this.save();
    return tx;
  }

  // Boosts
  createBoost(userId, boostType, multiplier, durationHours) {
    const id = this.data.boosts.length + 1;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    const boost = {
      id,
      user_id: userId,
      boost_type: boostType,
      multiplier,
      duration_hours: durationHours,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
    this.data.boosts.push(boost);
    this.save();
    return boost;
  }

  getActiveBoosts(userId) {
    const now = new Date().toISOString();
    return this.data.boosts.filter(b => b.user_id === userId && b.expires_at > now);
  }

  // Referrals
  createReferral(referrerId, referredId) {
    const id = this.data.referrals.length + 1;
    const referral = {
      id,
      referrer_id: referrerId,
      referred_id: referredId,
      bonus_earned: 0,
      created_at: new Date().toISOString()
    };
    this.data.referrals.push(referral);
    this.save();
    return referral;
  }

  getReferralStats(userId) {
    const referrals = this.data.referrals.filter(r => r.referrer_id === userId);
    const totalBonus = referrals.reduce((sum, r) => sum + r.bonus_earned, 0);
    return {
      count: referrals.length,
      totalBonus,
      recent: referrals.slice(-5).reverse()
    };
  }

  // Clans
  createClan(name, leaderId) {
    const id = this.data.clans.length + 1;
    const clan = {
      id,
      name,
      leader_id: leaderId,
      total_mined: 0,
      member_count: 1,
      created_at: new Date().toISOString()
    };
    this.data.clans.push(clan);

    // Add leader as member
    this.data.clan_members.push({
      id: this.data.clan_members.length + 1,
      clan_id: id,
      user_id: leaderId,
      role: 'leader',
      joined_at: new Date().toISOString()
    });

    this.save();
    return clan;
  }

  findClan(id) {
    return this.data.clans.find(c => c.id === id);
  }

  findClanByName(name) {
    return this.data.clans.find(c => c.name === name);
  }

  getUserClan(userId) {
    const member = this.data.clan_members.find(m => m.user_id === userId);
    if (!member) return null;
    const clan = this.findClan(member.clan_id);
    return { ...clan, role: member.role };
  }

  joinClan(clanId, userId) {
    this.data.clan_members.push({
      id: this.data.clan_members.length + 1,
      clan_id: clanId,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString()
    });

    const clan = this.findClan(clanId);
    if (clan) {
      clan.member_count++;
      this.save();
    }
    return true;
  }

  leaveClan(userId) {
    const memberIndex = this.data.clan_members.findIndex(m => m.user_id === userId);
    if (memberIndex === -1) return false;

    const member = this.data.clan_members[memberIndex];
    this.data.clan_members.splice(memberIndex, 1);

    const clan = this.findClan(member.clan_id);
    if (clan) {
      clan.member_count--;
      if (clan.member_count <= 0) {
        const clanIndex = this.data.clans.findIndex(c => c.id === member.clan_id);
        this.data.clans.splice(clanIndex, 1);
      }
    }

    this.save();
    return true;
  }

  getClanMembers(clanId) {
    return this.data.clan_members
      .filter(m => m.clan_id === clanId)
      .map(m => {
        const user = this.findUserById(m.user_id);
        return { ...m, username: user?.username, first_name: user?.first_name, total_mined: user?.total_mined || 0 };
      });
  }

  // Achievements
  createAchievement(userId, type, name) {
    const existing = this.data.achievements.find(a => a.user_id === userId && a.achievement_type === type);
    if (existing) return existing;

    const achievement = {
      id: this.data.achievements.length + 1,
      user_id: userId,
      achievement_type: type,
      achievement_name: name,
      unlocked_at: new Date().toISOString()
    };
    this.data.achievements.push(achievement);
    this.save();
    return achievement;
  }

  getUserAchievements(userId) {
    return this.data.achievements.filter(a => a.user_id === userId);
  }

  // Leaderboards
  getMiningLeaderboard(limit = 10) {
    return this.data.users
      .filter(u => u.total_mined > 0)
      .sort((a, b) => b.total_mined - a.total_mined)
      .slice(0, limit);
  }

  getBalanceLeaderboard(limit = 10) {
    return this.data.users
      .filter(u => u.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }

  getUserRank(userId, type = 'mining') {
    const field = type === 'mining' ? 'total_mined' : 'balance';
    const sorted = this.data.users
      .filter(u => u[field] > 0)
      .sort((a, b) => b[field] - a[field]);

    const rank = sorted.findIndex(u => u.id === userId);
    return rank === -1 ? null : rank + 1;
  }
}

const db = new JSONDatabase(DB_PATH);

// Initialize tables if empty
if (db.data.users.length === 0) {
  console.log('Initializing database...');
  db.save();
}

export default db;