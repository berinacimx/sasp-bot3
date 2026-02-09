const { Client, GatewayIntentBits, Events } = require("discord.js");
const {
  joinVoiceChannel,
  entersState,
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

let connection;
let player;
let reconnecting = false;

/* ================= SESSİZ AUDIO (AFK KORUMA) ================= */
function createSilentStream() {
  return new Readable({
    read() {
      this.push(Buffer.from([0xF8, 0xFF, 0xFE])); // opus silence frame
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
  if (reconnecting) return;
  reconnecting = true;

  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const channel = await guild.channels.fetch(process.env.VOICE_CHANNEL_ID);
    if (!channel) throw new Error("Ses kanalı yok");

    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,   // 🔇 kulaklık kapalı
      selfMute: false   // 🎤 mikrofon AÇIK
    });

    connection.on("stateChange", (_, newState) => {
      if (newState.status === VoiceConnectionStatus.Disconnected) {
        setTimeout(connectVoice, 3000);
      }
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    startSilentLoop();

    console.log("🔊 Ses kanalına bağlanıldı");
  } catch (err) {
    console.log("⚠️ Bağlanma hatası, tekrar deneniyor");
    setTimeout(connectVoice, 5000);
  } finally {
    reconnecting = false;
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
    setTimeout(connectVoice, 3000);
  }
});

/* ================= GLOBAL CRASH KORUMA ================= */
process.on("unhandledRejection", () => {});
process.on("uncaughtException", () => {});

client.login(process.env.TOKEN);
