const
  Discord = require("discord.js"),
  config = require("./config"),
  client = new Discord.Client({
    messageCacheLifetime: 30,
    messageSweepInterval: 60,
    partials: [ "USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION" ],
    presence: {
      status: "online",
      activities: [{
        name: "the counting thread",
        type: "WATCHING"
      }]
    },
    intents: [ "GUILDS", "GUILD_MESSAGES" ]
  }),
  db = require("quick.db");

client.on("ready", () => console.log(`Reasy as ${client.user.tag}!`));

client.on("messageCreate", async message => {
  if (
    !message.guild ||
    message.author.bot ||
    message.channel?.id !== config.channel
  ) return;

  if (
    config.managers.includes(message.author.id) &&
    message.content.startsWith("!")
  ) {
    const newCount = parseInt(message.content.substring(1));
    if (!isNaN(newCount)) {
      db.set("count", newCount);
      message.react("✅").then(() => setTimeout(() => message.delete(), 5000));
    }
  } else {
    const currentCount = db.get("count") || 0;

    if (!message.content.includes("\n") && (
      message.content == `${currentCount + 1}` ||
      message.content.startsWith(`${currentCount + 1} `)
    )) {
      db.add(`scores.${message.author.id}`, 1);
      db.set("count", currentCount + 1);
    } else message.delete();
  }
});

client.login(config.token);