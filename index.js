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
  { count, users } = require("./storage");

client.on("ready", async () => {
  console.log(`Ready as ${client.user.tag}!`);

  const channel = await client.channels.fetch(config.channel);
  if (!channel) return console.log("Error: Channel not found");
  if (!channel.isText()) return console.log("Error: Channel is not a text channel");
  if (!channel.isThread()) console.log("Warning: Channel is not a thread");

  const guild = await client.guilds.fetch(channel.guildId);
  guild.commands.set([{
    name: "count",
    description: "Main count command",
    options: [
      {
        type: "SUB_COMMAND",
        name: "leaderboard",
        description: "Show the top 10 counters on the server"
      },
      {
        type: "SUB_COMMAND",
        name: "next",
        description: "Show the next count"
      },
      {
        type: "SUB_COMMAND",
        name: "score",
        description: "Show the score of yourself or someone else",
        options: [{
          type: "USER",
          name: "member",
          description: "The member you want the score of, default is yourself"
        }]
      }
    ]
  }]);
});

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
      count.set("number", newCount);
      message.react("✅").then(() => setTimeout(() => message.delete(), 5000));
    }
  } else {
    const currentCount = await count.get("count") || 0, currentUser = await count.get("user") || "0";

    if (!message.content.includes("\n") && message.author.id !== currentUser && (
      message.content == `${currentCount + 1}` ||
      message.content.startsWith(`${currentCount + 1} `)
    )) {
      users.add(message.author.id, 1);
      count.put({ count: currentCount + 1, user: message.author.id });
    } else message.delete();
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand()) return;

  const subcommand = interaction.options.getSubcommand();
  if (subcommand == "leaderboard") {
    const
      scores = await users.get(),
      scoresSorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]).slice(0, 10);

    return interaction.reply({ embeds: [{
      title: "Counting leaderboard",
      color: 0x7289da,
      fields: [
        {
          name: "Member",
          value: scoresSorted.map((id, index) => `**${index + 1}.** <@${id}>`).join("\n"),
          inline: true
        },
        {
          name: "Score",
          value: scoresSorted.map(id => scores[id]).join("\n"),
          inline: true
        },
        {
          name: "% of top",
          value: scoresSorted.map(id => makeBar(scores[id], scores[scoresSorted[0]])).join("\n"),
          inline: true
        }
      ]
    }], ephemeral: true });
  } else if (subcommand == "next") {
    const current = await count.get("count") || 0;
    return interaction.reply({ content: `The next count in <#${config.channel}> is **${current + 1}**.`, ephemeral: true });
  } else if (subcommand == "score") {
    const
      member = interaction.options.getUser("member") || interaction.user,
      scores = await users.get() || {},
      scoresSorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]),
      place = scores[member.id] ? scoresSorted.indexOf(member.id) + 1 : "∞",
      score = scores[member.id] || 0;

    return interaction.reply({ content: `${member} has a score of **${score}** and is **#${place}** on the leaderboard!`, ephemeral: true });
  }
});

client.login(config.token);

function makeBar(value, max, segments = 25) {
  let bar = "[", count = 0, running = true, added = false;
  while (running) {
    if (!added && (count/segments) > (value/max)) {
      added = true;
      bar += "](http://projectblurple.com)";
    }
    bar += "\\|";
    count++;
    if (count >= segments) {
      running = false;
      if (!added) bar += "](http://projectblurple.com)";
    }
  }

  const percent = (value / max) * 100;
  return `${bar} ${percent.toFixed(2)}%`;
}