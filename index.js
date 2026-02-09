const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const express = require("express");
require("dotenv").config();

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* Uptime / Railway için mini web */
app.get("/", (req, res) => {
  res.send("Bot aktif 🚀");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server hazır");
});

/* Bot hazır */
client.once("ready", () => {
  console.log(`${client.user.tag} aktif!`);

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return console.log("Sunucu bulunamadı");

  const channel = guild.channels.cache.get(process.env.VOICE_CHANNEL_ID);
  if (!channel) return console.log("Ses kanalı bulunamadı");

  joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });

  console.log("Ses kanalına girildi 🔊");
});

client.login(process.env.TOKEN);