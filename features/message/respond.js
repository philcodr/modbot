const util = require('../../lib/util');

exports.event = async (database, message) => {
  if (!message.guild || message.author.bot) {
    return;
  }

  const triggered = [];

  const responses = await util.getAutoResponses(message.channel.id, message.guild.id);
  for (let [,response] of responses) {
    if (response.matches(message)) {
      triggered.push(response.response);
    }
  }
  
  if (triggered.length) {
    await message.channel.send(triggered[Math.floor(Math.random() * triggered.length)]);
  }
};
