const { Client, GatewayIntentBits, Events } = require("discord.js");
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require("@discordjs/voice");
const express = require("express");
require("dotenv").config();

/* ====== EXPRESS (UPTIME / RAILWAY) ====== */
const app = express();

app.get("/", (req, res) => {
  res.send("Bot aktif 🚀");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server hazır");
});

/* ====== DISCORD CLIENT ====== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ====== SES KANALINA BAĞLANMA FONKSİYONU ====== */
async function connectToVoice() {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return console.log("❌ Sunucu bulunamadı");

  const channel = guild.channels.cache.get(process.env.VOICE_CHANNEL_ID);
  if (!channel) return console.log("❌ Ses kanalı bulunamadı");

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,   // 🔇 kulaklık kapalı
    selfMute: true    // 🎤 mikrofon kapalı
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log("🔊 Ses kanalına başarıyla girildi");
  } catch (err) {
    console.log("⚠️ Ses kanalına girilemedi, tekrar denenecek");
    setTimeout(connectToVoice, 5000);
  }
}

/* ====== BOT HAZIR ====== */
client.once(Events.ClientReady, () => {
  console.log(`${client.user.tag} aktif`);
  connectToVoice();
});

/* ====== DISCONNECT OLURSA GERİ GİR ====== */
client.on(Events.VoiceStateUpdate, (_, newState) => {
  if (
    newState.member?.id === client.user.id &&
    newState.channelId === null
  ) {
    console.log("🔁 Sesten atıldı, tekrar bağlanıyor");
    setTimeout(connectToVoice, 3000);
  }
});

client.login(process.env.TOKEN);
