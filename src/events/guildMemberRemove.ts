import { Events, GuildMember } from 'discord.js';
import { LogManager } from '../managers/logManager';

export const name = Events.GuildMemberRemove;

export async function execute(member: GuildMember) {
  // Logger le départ du membre
  await LogManager.logMessage({
    type: 'member_leave',
    userId: member.user.id
  });
}

