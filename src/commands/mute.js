const util = require('../util.js');
const Log = require('../Log');
const GuildConfig = require('../GuildConfig');

const command = {};

command.description = 'Mute a user';

command.usage = '@user|id <@user|id…> <duration> <reason>';

command.names = ['mute'];

command.execute = async (message, args, database, bot) => {
  /** @type {GuildConfig} */
  const guildconfig = await GuildConfig.get(message.guild.id);
  if(!guildconfig.isMod(message.member) && !message.member.hasPermission('BAN_MEMBERS')) {
    await message.react(util.icons.error);
    return;
  }

  let users = await util.userMentions(args);

  if (!users.length) {
    await message.channel.send(await util.usage(message, command.names[0]));
    return;
  }

  let duration = util.timeToSec(args.join(' '));

  while (util.isTime(args[0])){
    args.shift();
  }
  let reason = args.join(' ');

  for (let userId of users) {
    let user = await bot.users.fetch(userId);

    if (user.bot) {
      await message.react(util.icons.error);
      await message.channel.send("I can't interact with bots!");
      continue;
    }
    let member;
    try {
      member = await message.guild.members.fetch(userId);
    }
    catch{}

    //highest role check
    if(member && (message.member.roles.highest.comparePositionTo((await message.guild.members.fetch(userId)).roles.highest) <= 0 || guildconfig.isProtected(member))) {
      await message.react(util.icons.error);
      await message.channel.send(`You don't have the permission to mute <@${member.id}>!`);
      continue;
    }

    await command.mute(message.guild, user, message.author, reason, duration, message.channel);
  }
};

command.mute = async (guild, user, moderator, reason, duration, channel) => {
  reason = reason || 'No reason provided.';
  let time = util.secToTime(duration);

  let config = await GuildConfig.get(guild.id);
  let mutedRole = config.mutedRole;
  if (!mutedRole) {
    if (channel) {
      await channel.send("No muted role specified!");
    }
    return;
  }

  try {
    let member = await guild.members.fetch(user.id);
    if (duration) {
      await member.roles.add(mutedRole, `${moderator.username}#${moderator.discriminator} (${time}) | ` + reason);
      await member.send(`You were muted in \`${guild.name}\` for ${time} | ${reason}`);
    }
    else {
      await member.roles.add(mutedRole, `${moderator.username}#${moderator.discriminator} | `+reason);
      await member.send(`You were permanently muted in \`${guild.name}\` | ${reason}`);
    }
  } catch (e) {}

  let insert = await util.moderationDBAdd(guild.id, user.id, "mute", reason, duration, moderator.id);
  if (channel) {
    await util.chatSuccess(channel, user, reason, "muted", time);
  }
  await Log.logModeration(guild.id, moderator, user, reason, insert, "Mute", {time});
};

module.exports = command;
