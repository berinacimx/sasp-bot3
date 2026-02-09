const { Client, GatewayIntentBits, Events, ActivityType } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus
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

/* ================= GLOBAL ================= */
let connection = null;
let player = null;
let connecting = false;

/* ================= SESSİZ SES (AFK KORUMA) ================= */
function createSilentStream() {
  return new Readable({
    read() {
      this.push(Buffer.from([0xF8, 0xFF, 0xFE])); // opus silence frame
    }
  });
}

function startSilentPlayer() {
  if (!player) {
    player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
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
  if (connecting) return;
  connecting = true;

  try {
    if (connection) {
      connection.destroy();
      connection = null;
    }

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);

    if (!channel || !channel.isVoiceBased()) {
      throw new Error("Ses kanalı geçersiz");
    }

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,   // 🔇 kulaklık kapalı
      selfMute: false   // 🎤 mikrofon açık
    });

    connection.once(VoiceConnectionStatus.Ready, () => {
      console.log("🔊 Ses kanalına bağlanıldı");
      startSilentPlayer();
    });

    connection.once(VoiceConnectionStatus.Disconnected, () => {
      console.log("⚠️ Ses bağlantısı koptu, yeniden bağlanılıyor");
      setTimeout(connectVoice, 3000);
    });

  } catch (err) {
    console.log("⚠️ Bağlanma hatası, tekrar deneniyor");
    setTimeout(connectVoice, 5000);
  } finally {
    connecting = false;
  }
}

/* ================= READY ================= */
client.once(Events.ClientReady, () => {
  console.log(`${client.user.tag} aktif`);

  client.user.setPresence({
    activities: [
      {
        name: "Developed By Rispect",
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/rispectofficial"
      }
    ],
    status: "online"
  });

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

/* ================= LOGIN ================= */
client.login(process.env.TOKEN);
