const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const express = require("express");
const fs = require("fs");

const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

let db = require("./database.json");

function saveDB() {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}

client.once("ready", async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Banuje gracza Roblox")
      .addStringOption(opt =>
        opt.setName("roblox_id")
          .setDescription("ID Roblox")
          .setRequired(true))
      .addIntegerOption(opt =>
        opt.setName("czas")
          .setDescription("Czas bana w sekundach")
          .setRequired(true))
      .addStringOption(opt =>
        opt.setName("powod")
          .setDescription("Powód bana")
          .setRequired(true))
  ];

  const rest = new REST({ version: "10" }).setToken(config.token);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Komendy załadowane");
});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ban") {

    const robloxID = interaction.options.getString("roblox_id");
    const time = interaction.options.getInteger("czas");
    const reason = interaction.options.getString("powod");

    const endTime = Date.now() + (time * 1000);

    db.bans[robloxID] = {
      end: endTime,
      reason: reason
    };

    saveDB();

    const embed = new EmbedBuilder()
      .setTitle("🔨 Ban nadany")
      .setColor(config.color)
      .addFields(
        { name: "Roblox ID", value: robloxID },
        { name: "Czas", value: `${time} sekund` },
        { name: "Powód", value: reason }
      )
      .setTimestamp();

    const logChannel = client.channels.cache.get(config.logsChannel);
    if (logChannel) logChannel.send({ embeds: [embed] });

    await interaction.reply({ content: "Ban nadany.", ephemeral: true });
  }
});

client.login(config.token);



// ================= API DLA ROBLOX =================

const app = express();
app.use(express.json());

app.get("/check/:id", (req, res) => {
  const id = req.params.id;
  const ban = db.bans[id];

  if (!ban) return res.json({ banned: false });

  if (Date.now() > ban.end) {
    delete db.bans[id];
    saveDB();
    return res.json({ banned: false });
  }

  res.json({
    banned: true,
    reason: ban.reason
  });
});

app.listen(3000, () => {
  console.log("API działa na porcie 3000");
});
