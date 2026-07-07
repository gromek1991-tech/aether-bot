import db from '../database/sqlite.js';

const MAX_CLAN_SIZE = parseInt(process.env.MAX_CLAN_SIZE || 50);

// Create clan
export function createClan(userId, clanName) {
  const user = db.findUserById(userId);

  if (!user) {
    return { success: false, message: '❌ Użytkownik nie znaleziony.' };
  }

  // Check if user already in a clan
  const existingMembership = db.getUserClan(userId);

  if (existingMembership) {
    return { success: false, message: '❌ Jesteś już w klanie! Opuść go najpierw.' };
  }

  // Check if clan name exists
  const existingClan = db.findClanByName(clanName);

  if (existingClan) {
    return { success: false, message: '❌ Klan o tej nazwie już istnieje.' };
  }

  // Create clan
  const clan = db.createClan(clanName, userId);

  return {
    success: true,
    message: `🎉 Klan "${clanName}" utworzony!Jesteś liderem.`,
    clanId: clan.id
  };
}

// Join clan
export function joinClan(userId, clanId) {
  const user = db.findUserById(userId);
  const clan = db.findClan(clanId);

  if (!user || !clan) {
    return { success: false, message: '❌ Nie znaleziono użytkownika lub klanu.' };
  }

  // Check if already in a clan
  const existingMembership = db.getUserClan(userId);

  if (existingMembership) {
    return { success: false, message: '❌ Jesteś już w klanie!' };
  }

  // Check clan size
  if (clan.member_count >= MAX_CLAN_SIZE) {
    return { success: false, message: '❌ Klan jest pełny!' };
  }

  // Join clan
  db.joinClan(clanId, userId);

  return {
    success: true,
    message: `🎉 Dołączyłeś do klanu "${clan.name}"!`,
    clanName: clan.name
  };
}

// Leave clan
export function leaveClan(userId) {
  const membership = db.getUserClan(userId);

  if (!membership) {
    return { success: false, message: '❌ Nie jesteś w żadnym klanie.' };
  }

  if (membership.role === 'leader') {
    // Check for other members
    const members = db.getClanMembers(membership.id);

    if (members.length > 1) {
      // Transfer to oldest member
      const newLeader = members.find(m => m.user_id !== userId);
      if (newLeader) {
        db.updateClanLeader(membership.id, newLeader.user_id);
      }
    } else {
      // Disband clan
      db.leaveClan(userId);
      return {
        success: true,
        message: `📁 Klan "${membership.name}" został rozwiązany.`
      };
    }
  }

  // Leave clan
  db.leaveClan(userId);

  return {
    success: true,
    message: `👋 Opuściłeś klan "${membership.name}".`
  };
}

// Get clan info
export function getClanInfo(clanId) {
  const clan = db.findClan(clanId);

  if (!clan) {
    return null;
  }

  const members = db.getClanMembers(clanId);
  const leader = db.findUserById(clan.leader_id);

  return {
    ...clan,
    leader_name: leader?.username,
    members
  };
}

// Get user's clan
export function getUserClan(userId) {
  return db.getUserClan(userId);
}

// Get clan leaderboard
export function getClanLeaderboard(limit = 10) {
  return db.data.clans
    .map(clan => {
      const leader = db.findUserById(clan.leader_id);
      return {
        id: clan.id,
        name: clan.name,
        total_mined: clan.total_mined,
        member_count: clan.member_count,
        leader_name: leader?.username
      };
    })
    .sort((a, b) => b.total_mined - a.total_mined)
    .slice(0, limit);
}

// Format clan info
export function formatClanInfo(clan) {
  if (!clan) {
    return '❌ Klan nie znaleziony.';
  }

  let text = `🏴 *${clan.name}*\n\n`;
  text += `👑 Lider: ${clan.leader_name ? `@${clan.leader_name}` : 'Nieznany'}\n`;
  text += `👥 Członkowie: ${clan.member_count}/${MAX_CLAN_SIZE}\n`;
  text += `⛏️ Wykopane: ${clan.total_mined.toFixed(2)} AET\n\n`;

  if (clan.members && clan.members.length > 0) {
    text += `*Członkowie:*\n`;
    clan.members.forEach((member, index) => {
      const role = member.role === 'leader' ? '👑 ' : '';
      const name = member.username ? `@${member.username}` : (member.first_name || 'Anonim');
      text += `${index + 1}. ${role}${name} (${member.total_mined.toFixed(2)} AET)\n`;
    });
  }

  return text;
}