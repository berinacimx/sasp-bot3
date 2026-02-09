require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType
} = require("discord.js");
const express = require("express");

/* ==================== UPTIME (7/24) ==================== */
const app = express();
app.get("/", (req, res) => res.send("Bot Aktif - SASP"));
app.listen(process.env.PORT || 3000);

/* ==================== CLIENT AYARLARI ==================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.GuildMember]
});

/* ==================== DURUM DÖNGÜSÜ (STREAMING) ==================== */
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot aktif: ${client.user.tag}`);

  let toggle = false;

  setInterval(async () => {
    try {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      await guild.members.fetch({ withPresences: true });

      const online = guild.members.cache.filter(
        m => m.presence && m.presence.status !== "offline"
      ).size;

      if (toggle) {
        // Durum 1: SASP ❤️ Rispect
        client.user.setActivity("SASP ❤️ Rispect", {
          type: ActivityType.Streaming,
          url: "https://www.twitch.tv/rispectofficial"
        });
      } else {
        // Durum 2: İstatistikler
        client.user.setActivity(
          `Çevrimiçi : ${online} | Üye : ${guild.memberCount}`,
          {
            type: ActivityType.Streaming,
            url: "https://www.twitch.tv/rispectofficial"
          }
        );
      }

      toggle = !toggle;
    } catch (err) {
      console.error("Durum gün
