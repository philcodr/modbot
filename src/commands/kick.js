const util = require('../util.js');
const GuildConfig = require('../GuildConfig');
const Log = require('../Log');

const command = {};

command.description = 'Kick a user';

command.usage = '@user|id <@user|id…> <reason>';

command.names = ['kick'];

command.execute = async (message, args, database, bot) => {
  /** @type {GuildConfig} */
  const guildconfig = await GuildConfig.get(message.guild.id);
  if(!await guildconfig.isMod(message.member) && !message.member.hasPermission('KICK_MEMBERS')) {
    await message.react(util.icons.error);
    return;
  }

  const users = await util.userMentions(args);

  if (!users.length) {
    await message.channel.send(await util.usage(message, command.names[0]));
    return;
  }

  let reason = args.join(' ');

  for (let userId of users) {
    let member;
    try {
      member = await message.guild.members.fetch(userId);
    } catch (e) {
      await message.react(util.icons.error);
      await message.channel.send("User not found or not in guild!");
      continue;
    }

    if (member.user.bot) {
      await message.react(util.icons.error);
      await message.channel.send("I can't interact with bots!");
      continue;
    }

    //highest role check
    if(message.member.roles.highest.comparePositionTo(member.roles.highest) <= 0 || guildconfig.isProtected(member)){
      await message.react(util.icons.error);
      await message.channel.send(`You don't have the permission to kick <@${member.id}>!`);
      continue;
    }

    await command.kick(message.guild, member, message.author, reason, message.channel);
  }
};

command.kick = async (guild, member, moderator, reason, channel) => {
  reason = reason || 'No reason provided.';

  let insert = await util.moderationDBAdd(guild.id, member.id, "kick", reason, null, moderator.id);

  try {
    await member.send(`You were kicked from \`${guild.name}\` | ${reason}`);
  } catch (e) {}
  await member.kick(`${moderator.username}#${moderator.discriminator} | `+reason);

  if (channel) {
    await util.chatSuccess(channel, member.user, reason, "kicked");
  }
  await Log.logModeration(guild.id, moderator, member.user, reason, insert, "Kick");
};

module.exports = command;
