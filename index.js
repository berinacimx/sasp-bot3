const { Client, GatewayIntentBits, Events } = require("discord.js");
const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior
} = require("@discordjs/voice");
const express = require("express");
const { Readable } = require("stream");
require("dotenv").config();

/* ================= EXPRESS (UPTIME) ================= */
const app = express();
app.get("/", (_, res) => res.send("Bot aktif 🚀"));
app.listen(process.env.PORT || 3000);

/* ================= DISCORD CLIENT ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let connection = null;
let player = null;

/* ================= SESSİZ AUDIO (AFK KORUMA) ================= */
function createSilentStream() {
  return new Readable({
    read() {
      this.push(Buffer.from([0xF8, 0xFF, 0xFE])); // opus silence
    }
  });
}

function startSilentLoop() {
  if (!player) {
    player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });

    player.on(AudioPlayerStatus.Idle, () => {
      player.play(createAudioResource(createSilentStream()));
    });
  }

  player.play(createAudioResource(createSilentStream()));
  connection.subscribe(player);
}

/* ================= VOICE CONNECT ================= */
async function connectVoice() {
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID).catch(() => null);
    if (!guild) return setTimeout(connectVoice, 5000);

    const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isVoiceBased()) {
      console.log("❌ Geçerli bir ses kanalı bulunamadı");
      return setTimeout(connectVoice, 5000);
    }

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,   // 🔇 kulaklık kapalı
      selfMute: false   // 🎤 mikrofon AÇIK
    });

    connection.once(VoiceConnectionStatus.Ready, () => {
      console.log("🔊 Ses kanalına bağlanıldı");
      startSilentLoop();
    });

    connection.once(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ Voice disconnect, tekrar bağlanılıyor");
      setTimeout(connectVoice, 3000);
    });

  } catch (err) {
    console.log("⚠️ Bağlanma hatası, tekrar deneniyor");
    setTimeout(connectVoice, 5000);
  }
}

/* ================= READY ================= */
client.once(Events.ClientReady, () => {
  console.log(`${client.user.tag} aktif`);
  connectVoice();
});

/* ================= KICK / MOVE KORUMA ================= */
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (
    oldState.member?.id === client.user.id &&
    !newState.channelId
  ) {
    console.log("🚫 Sesten atıldı, geri giriliyor");
    setTimeout(connectVoice, 3000);
  }
});

/* ================= GLOBAL CRASH KORUMA ================= */
process.on("unhandledRejection", () => {});
process.on("uncaughtException", () => {});

client.login(process.env.TOKEN);
