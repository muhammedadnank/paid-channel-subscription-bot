import os from "node:os";
import mongoose from "mongoose";
import { Bot, InlineKeyboard } from "grammy";
import { connectToDatabase } from "../db/connection.js";
import { Subscription } from "../db/models/Subscription.js";
import { Channel } from "../db/models/Channel.js";
import { adminMenu } from "./menus/adminMenu.js";

export function createBot(token: string) {
  const bot = new Bot(token);

  async function sendAdminLog(text: string, keyboard?: InlineKeyboard) {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return;
    try {
      await bot.api.sendMessage(logChannelId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (e) {
      console.warn("Could not dispatch admin log:", e);
    }
  }

  bot.catch((err) => {
    console.error("❌ grammY Error in handler:", err);
  });

  bot.use(async (ctx, next) => {
    console.log(
      `📩 Received update from user ${ctx.from?.id} (${ctx.from?.first_name}): ${ctx.message?.text || "Update"}`
    );
    await next();
  });

  bot.use(adminMenu);

  function isAdmin(userId: number): boolean {
    const adminIds = (process.env.ADMIN_IDS || "")
      .split(",")
      .map((id) => parseInt(id.trim(), 10));
    return adminIds.includes(userId);
  }

  // Command: /admin
  bot.command("admin", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }
    await ctx.reply("👑 <b>Paid Channel Admin Control Dashboard:</b>", {
      parse_mode: "HTML",
      reply_markup: adminMenu,
    });
  });

  // Command: /help
  bot.command("help", async (ctx) => {
    const isUserAdmin = ctx.from ? isAdmin(ctx.from.id) : false;
    let helpText =
      `📖 <b>Paid Channel Bot Help Guide</b>\n\n` +
      `<b>👤 User Commands:</b>\n` +
      `• <code>/start</code> - Welcome menu & payment UPI info\n` +
      `• <code>/myplan</code> - Check active subscription validity & expiry\n` +
      `• <code>/about</code> - Platform info & architecture\n` +
      `• <code>/help</code> - Display this help guide\n`;

    if (isUserAdmin) {
      helpText +=
        `\n<b>🛡️ Admin Commands:</b>\n` +
        `• <code>/admin</code> - Interactive Admin Menu Dashboard\n` +
        `• <code>/subadd &lt;user_id&gt; [days] [amount] [channel_id] [story]</code>\n` +
        `• <code>/subextend &lt;user_id&gt; [days] [amount] [channel_id]</code>\n` +
        `• <code>/subrem &lt;user_id&gt; [channel_id]</code> - Revoke & Kick user\n` +
        `• <code>/sublist</code> - View active subscribers list\n` +
        `• <code>/substats</code> or <code>/stats</code> - View system analytics\n` +
        `• <code>/channeladd &lt;channel_id&gt; &lt;story_name&gt; [price] [days]</code>\n` +
        `• <code>/channellist</code> - View registered channel slots\n` +
        `• <code>/channelrem &lt;channel_id&gt;</code> - Deactivate channel slot\n`;
    }

    return ctx.reply(helpText, { parse_mode: "HTML" });
  });

  // Command: /about
  bot.command("about", async (ctx) => {
    return ctx.reply(
      `ℹ️ <b>About Paid Channel Subscription Bot</b>\n\n` +
      `🚀 <b>Version:</b> 1.0.0 (Standalone Serverless)\n` +
      `⚡ <b>Engine:</b> grammY (TypeScript)\n` +
      `🍃 <b>Database:</b> MongoDB Atlas Cloud\n` +
      `☁️ <b>Hosting:</b> Vercel Serverless Functions\n\n` +
      `Automated private Telegram channel gatekeeper with single-use invite links, 24-hour advance renewal warnings, and automated kick/unban routines.`,
      { parse_mode: "HTML" }
    );
  });

  // Command: /stories (Catalog of available paid channels)
  bot.command("stories", async (ctx) => {
    await connectToDatabase();
    const channels = await Channel.find({ is_active: true });
    const upiId = process.env.UPI_ID || "merchant@upi";

    if (channels.length === 0) {
      return ctx.reply(
        `ℹ️ <b>നിലവിൽ ലഭ്യമായ സബ്സ്ക്രിപ്ഷൻ ചാനലുകൾ ഒന്നുമില്ല.</b>\n\n` +
        `കൂടുതൽ വിവരങ്ങൾക്ക് അഡ്മിനുമായി ബന്ധപ്പെടുക.`,
        { parse_mode: "HTML" }
      );
    }

    let msg = `📚 <b>ലഭ്യമായ പ്രീമിയം ഓഡിയോബുക്ക് / വിഐപി ചാനലുകൾ:</b>\n\n`;
    for (const c of channels) {
      msg +=
        `📖 <b>${c.story_name}</b>\n` +
        `  • ചാനൽ പേര്: ${c.title}\n` +
        `  • നിരക്ക്: <b>₹${c.default_price} / ${c.default_days} ദിവസങ്ങൾ</b>\n\n`;
    }

    msg += `💳 <b>സബ്സ്ക്രൈബ് ചെയ്യാൻ UPI ID:</b> <code>${upiId}</code>\n\n` +
      `പണം അടച്ച ശേഷം സ്ക്രീൻഷോട്ട് അഡ്മിന് അയച്ചു നൽകുക.`;

    return ctx.reply(msg, { parse_mode: "HTML" });
  });

  // Command: /mystatus (Alias for /myplan)
  bot.command("mystatus", async (ctx) => {
    if (!ctx.from) return;
    await connectToDatabase();
    const subs = await Subscription.find({ user_id: ctx.from.id, status: "ACTIVE" });

    if (subs.length === 0) {
      return ctx.reply(
        `ℹ️ <b>നിങ്ങൾക്ക് ലോഗിൻ ചെയ്ത ആക്റ്റീവ് സബ്സ്ക്രിപ്ഷനുകൾ ഒന്നും കാണുന്നില്ല.</b>\n\n` +
        `പുതിയ സബ്സ്ക്രിപ്ഷൻ എടുക്കാൻ അഡ്മിനുമായി ബന്ധപ്പെടുക.`,
        { parse_mode: "HTML" }
      );
    }

    let text = `📋 <b>നിങ്ങളുടെ സബ്സ്ക്രിപ്ഷൻ വിവരങ്ങൾ (${subs.length}):</b>\n\n`;
    const now = Math.floor(Date.now() / 1000);
    for (const s of subs) {
      const expDateStr = new Date(s.expiry_date * 1000).toLocaleString();
      const remHours = Math.max(0, Math.floor((s.expiry_date - now) / 3600));
      const remDays = Math.floor(remHours / 24);
      text +=
        `• 📺 <b>${s.story_name}</b>\n` +
        `  🗓️ ഏക്സ്പെയറി: <code>${expDateStr}</code>\n` +
        `  ⏳ ബാക്കി സമയം: <b>${remDays} ദിവസങ്ങൾ (${remHours} മണിക്കൂർ)</b>\n\n`;
    }

    return ctx.reply(text, { parse_mode: "HTML" });
  });

  // Admin Command: /subsync <channel_id> [story_name]
  bot.command("subsync", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    const args = ctx.match.trim().split(/\s+/);
    if (!args[0]) {
      return ctx.reply(
        "⚠️ <b>Usage:</b> <code>/subsync &lt;channel_id&gt; [story_name]</code>",
        { parse_mode: "HTML" }
      );
    }

    const channelId = parseInt(args[0], 10);
    const storyName = args.slice(1).join(" ") || "Pocket FM VIP";

    await connectToDatabase();
    await ctx.reply("🔄 <b>Historical Member Auto-Sync ആരംഭിച്ചു...</b>", { parse_mode: "HTML" });

    try {
      const chat = await ctx.api.getChat(channelId);
      const memberCount = await ctx.api.getChatMemberCount(channelId);

      const userIds = args.slice(1).map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
      let syncedCount = 0;
      const now = Math.floor(Date.now() / 1000);
      const expiryTs = now + 30 * 86400;

      for (const uid of userIds) {
        try {
          const member = await ctx.api.getChatMember(channelId, uid);
          if (["member", "administrator", "creator"].includes(member.status)) {
            await Subscription.findOneAndUpdate(
              { user_id: uid, channel_id: channelId },
              {
                user_id: uid,
                channel_id: channelId,
                story_name: chat.title || storyName,
                name: member.user.first_name || `Subscriber (${uid})`,
                days: 30,
                amount: 60,
                status: "ACTIVE",
                joined_date: now,
                expiry_date: expiryTs,
                reminded_24h: false,
              },
              { upsert: true, new: true }
            );
            syncedCount++;
          }
        } catch (e) {
          console.warn(`Could not verify chat member ${uid}:`, e);
        }
      }

      await sendAdminLog(
        `🔄 <b>Channel Auto-Sync Completed</b>\n\n` +
          `📺 <b>Channel:</b> ${chat.title || storyName} (<code>${channelId}</code>)\n` +
          `👥 <b>Total Telegram Members:</b> ${memberCount}\n` +
          `✅ <b>Synced Active Members in DB:</b> ${syncedCount}`
      );

      return ctx.reply(
        `✅ <b>Channel Sync Completed!</b>\n\n` +
          `📺 <b>Title:</b> ${chat.title || storyName}\n` +
          `👥 <b>Telegram Members Count:</b> <code>${memberCount}</code>\n` +
          `📊 <b>Synced Members in DB:</b> <code>${syncedCount}</code>`,
        { parse_mode: "HTML" }
      );
    } catch (e: any) {
      return ctx.reply(`❌ <b>Sync Error:</b> ${e.message}`, { parse_mode: "HTML" });
    }
  });

  // Command: /myplan
  bot.command("myplan", async (ctx) => {
    if (!ctx.from) return;
    await connectToDatabase();
    const subs = await Subscription.find({ user_id: ctx.from.id, status: "ACTIVE" });

    if (subs.length === 0) {
      return ctx.reply(
        `ℹ️ <b>നിങ്ങൾക്ക് ലോഗിൻ ചെയ്ത ആക്റ്റീവ് സബ്സ്ക്രിപ്ഷനുകൾ ഒന്നും കാണുന്നില്ല.</b>\n\n` +
        `പുതിയ സബ്സ്ക്രിപ്ഷൻ എടുക്കാൻ അഡ്മിനുമായി ബന്ധപ്പെടുക.`,
        { parse_mode: "HTML" }
      );
    }

    let text = `📋 <b>നിങ്ങളുടെ സബ്സ്ക്രിപ്ഷൻ വിവരങ്ങൾ (${subs.length}):</b>\n\n`;
    const now = Math.floor(Date.now() / 1000);
    for (const s of subs) {
      const expDateStr = new Date(s.expiry_date * 1000).toLocaleString();
      const remHours = Math.max(0, Math.floor((s.expiry_date - now) / 3600));
      const remDays = Math.floor(remHours / 24);
      text +=
        `• 📺 <b>${s.story_name}</b>\n` +
        `  🗓️ ഏക്സ്പെയറി: <code>${expDateStr}</code>\n` +
        `  ⏳ ബാക്കി സമയം: <b>${remDays} ദിവസങ്ങൾ (${remHours} മണിക്കൂർ)</b>\n\n`;
    }

    return ctx.reply(text, { parse_mode: "HTML" });
  });

  // Command: /stats (System Hardware, Memory & Database Resource Stats)
  bot.command("stats", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    await connectToDatabase();

    // 1. Process & OS Metrics
    const uptimeSec = Math.floor(process.uptime());
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = uptimeSec % 60;
    const uptimeStr = `${days}d ${hours}h ${mins}m ${secs}s`;

    const mem = process.memoryUsage();
    const rssMB = (mem.rss / 1024 / 1024).toFixed(2);
    const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(2);
    const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || "CPU";
    const cpuCores = cpus.length;

    // 2. Database Metrics (MongoDB Atlas)
    const dbName = process.env.MONGO_NAME || "paid_sub_db";
    let dbSizeMB = "0.00";
    let dbStorageMB = "0.00";
    let dbCollections = 0;
    let dbObjects = 0;

    if (mongoose.connection.db) {
      try {
        const stats = await mongoose.connection.db.stats();
        dbSizeMB = ((stats.dataSize || 0) / 1024 / 1024).toFixed(2);
        dbStorageMB = ((stats.storageSize || 0) / 1024 / 1024).toFixed(2);
        dbCollections = stats.collections || 0;
        dbObjects = stats.objects || 0;
      } catch (e) { }
    }

    const totalSubs = await Subscription.countDocuments();
    const activeSubs = await Subscription.countDocuments({ status: "ACTIVE" });
    const expiredSubs = await Subscription.countDocuments({ status: "EXPIRED" });
    const totalChannels = await Channel.countDocuments({ is_active: true });

    return ctx.reply(
      `🖥️ <b>Bot System Hardware & Resource Stats</b>\n\n` +
      `⚙️ <b>Engine & Process Info:</b>\n` +
      `• <b>Node.js Version:</b> <code>${process.version}</code>\n` +
      `• <b>OS Platform:</b> <code>${process.platform} (${os.arch()})</code>\n` +
      `• <b>Process Uptime:</b> <code>${uptimeStr}</code>\n` +
      `• <b>CPU Cores:</b> <code>${cpuCores} Cores (${cpuModel})</code>\n\n` +
      `💾 <b>Memory (RAM) Usage:</b>\n` +
      `• <b>Process RSS RAM:</b> <code>${rssMB} MB</code>\n` +
      `• <b>Heap Used / Total:</b> <code>${heapUsedMB} MB / ${heapTotalMB} MB</code>\n` +
      `• <b>System Total / Free RAM:</b> <code>${totalMemGB} GB / ${freeMemGB} GB</code>\n\n` +
      `🍃 <b>MongoDB Atlas Database Stats:</b>\n` +
      `• <b>Database Name:</b> <code>${dbName}</code>\n` +
      `• <b>Data Size:</b> <code>${dbSizeMB} MB</code> (Storage: ${dbStorageMB} MB)\n` +
      `• <b>Collections / Documents:</b> <code>${dbCollections} Colls / ${dbObjects} Docs</code>\n` +
      `• <b>Subscribers (Active/Exp):</b> <code>${totalSubs} Total (${activeSubs} Active / ${expiredSubs} Expired)</code>\n` +
      `• <b>Active Channels:</b> <code>${totalChannels} Slots</code>`,
      { parse_mode: "HTML" }
    );
  });

  // Command: /start
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name || "User";
    const upiId = process.env.UPI_ID || "merchant@upi";

    await ctx.reply(
      `👋 <b>ഹലോ ${name}, Welcome to Paid Channel Subscription Bot!</b>\n\n` +
      `ചാനൽ സബ്സ്ക്രിപ്ഷൻ വിവരങ്ങൾ അറിയാനും പുതുക്കാനും താഴെ കാണുന്ന ഓപ്ഷനുകൾ ഉപയോഗിക്കുക:\n\n` +
      `💳 <b>UPI ID:</b> <code>${upiId}</code>\n\n` +
      `ചോദ്യങ്ങൾക്കോ സഹായങ്ങൾക്കോ അഡ്മിനുമായി ബന്ധപ്പെടുക.`,
      { parse_mode: "HTML" }
    );
  });

  // Admin Command: /subadd <user_id> [days] [amount] [channel_id] [story_name]
  bot.command("subadd", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    const args = ctx.match.trim().split(/\s+/);
    if (args.length < 1 || !args[0]) {
      return ctx.reply(
        "⚠️ <b>Usage:</b> <code>/subadd &lt;user_id&gt; [days=30] [amount=60] [channel_id] [story_name]</code>",
        { parse_mode: "HTML" }
      );
    }

    const targetUserId = parseInt(args[0], 10);
    const days = args[1] ? parseFloat(args[1]) : 30;
    const amount = args[2] ? parseFloat(args[2]) : 60;
    const channelId = args[3]
      ? parseInt(args[3], 10)
      : parseInt(process.env.DEFAULT_CHANNEL_ID || "0", 10);
    const storyName =
      args.slice(4).join(" ") ||
      process.env.DEFAULT_STORY_NAME ||
      "Pocket FM VIP";

    await connectToDatabase();

    const now = Math.floor(Date.now() / 1000);
    const expiryTs = now + days * 86400;

    await Subscription.findOneAndUpdate(
      { user_id: targetUserId, channel_id: channelId },
      {
        user_id: targetUserId,
        channel_id: channelId,
        story_name: storyName,
        name: `Subscriber (${targetUserId})`,
        days,
        amount,
        status: "ACTIVE",
        joined_date: now,
        expiry_date: expiryTs,
        reminded_24h: false,
      },
      { upsert: true, new: true }
    );

    let inviteLink = "Failed to generate invite link";
    try {
      const linkRes = await ctx.api.createChatInviteLink(channelId, {
        member_limit: 1,
        expire_date: now + 86400,
      });
      inviteLink = linkRes.invite_link;
    } catch (err: any) {
      console.error("Invite link generation error:", err.message);
    }

    try {
      const expStr = new Date(expiryTs * 1000).toLocaleString();
      await ctx.api.sendMessage(
        targetUserId,
        `🎉 <b>സബ്സ്ക്രിപ്ഷൻ വിജയികരമായി ആക്റ്റീവ് ആയിട്ടുണ്ട്!</b>\n\n` +
        `📺 <b>ചാനൽ:</b> ${storyName}\n` +
        `🗓️ <b>കാലാവധി അവസാനിക്കുന്നത്:</b> <code>${expStr}</code>\n\n` +
        `🔑 <b>നിങ്ങളുടെ സിംഗിൾ യൂസ് ഇൻവൈറ്റ് ലിങ്ക്:</b>\n${inviteLink}\n\n` +
        `<i>⚠️ ഈ ലിങ്ക് ഒരാൾക്ക് (Single Use) മാത്രമേ ഉപയോഗിക്കാൻ സാധിക്കൂ. 24 മണിക്കൂറിനുള്ളിൽ ജോയിൻ ചെയ്യുക.</i>`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      console.error("Failed to DM subscriber:", e);
    }

    return ctx.reply(
      `✅ Added subscriber <code>${targetUserId}</code> for ${days} days (${storyName}).`,
      { parse_mode: "HTML" }
    );
  });

  // Admin Command: /subextend <user_id> [additional_days=30] [amount] [channel_id]
  bot.command("subextend", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    const args = ctx.match.trim().split(/\s+/);
    if (args.length < 1 || !args[0]) {
      return ctx.reply(
        "⚠️ <b>Usage:</b> <code>/subextend &lt;user_id&gt; [additional_days=30] [amount] [channel_id]</code>",
        { parse_mode: "HTML" }
      );
    }

    const targetUserId = parseInt(args[0], 10);
    const addDays = args[1] ? parseFloat(args[1]) : 30;
    const channelId = args[3]
      ? parseInt(args[3], 10)
      : parseInt(process.env.DEFAULT_CHANNEL_ID || "0", 10);

    await connectToDatabase();
    const existing = await Subscription.findOne({
      user_id: targetUserId,
      ...(channelId ? { channel_id: channelId } : {}),
    });

    if (!existing) {
      return ctx.reply(`❌ No existing subscription record found for user <code>${targetUserId}</code>.`);
    }

    const now = Math.floor(Date.now() / 1000);
    const baseTime = Math.max(existing.expiry_date, now);
    const newExpiry = baseTime + addDays * 86400;

    existing.expiry_date = newExpiry;
    existing.status = "ACTIVE";
    existing.reminded_24h = false;
    existing.days += addDays;
    if (args[2]) existing.amount = parseFloat(args[2]);
    await existing.save();

    const expStr = new Date(newExpiry * 1000).toLocaleString();
    try {
      await ctx.api.sendMessage(
        targetUserId,
        `🔄 <b>നിങ്ങളുടെ ${existing.story_name} സബ്സ്ക്രിപ്ഷൻ +${addDays} ദിവസത്തേക്ക് നീട്ടിയിട്ടുണ്ട്!</b>\n\n` +
        `🗓️ <b>പുതിയ ഏക്സ്പെയറി തീയതി:</b> <code>${expStr}</code>`,
        { parse_mode: "HTML" }
      );
    } catch (e) {
      console.error("Failed to send extension DM:", e);
    }

    return ctx.reply(
      `✅ Extended subscription for <code>${targetUserId}</code> by +${addDays} days. New Expiry: <code>${expStr}</code>`,
      { parse_mode: "HTML" }
    );
  });

  // Admin Command: /subrem <user_id> [channel_id]
  bot.command("subrem", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    const args = ctx.match.trim().split(/\s+/);
    if (args.length < 1 || !args[0]) {
      return ctx.reply(
        "⚠️ <b>Usage:</b> <code>/subrem &lt;user_id&gt; [channel_id]</code>",
        { parse_mode: "HTML" }
      );
    }

    const targetUserId = parseInt(args[0], 10);
    const channelId = args[1]
      ? parseInt(args[1], 10)
      : parseInt(process.env.DEFAULT_CHANNEL_ID || "0", 10);

    await connectToDatabase();
    const existing = await Subscription.findOne({ user_id: targetUserId, channel_id: channelId });
    if (!existing) {
      return ctx.reply(`❌ No active subscription record found for user <code>${targetUserId}</code>.`);
    }

    existing.status = "REMOVED";
    await existing.save();

    // Execute Channel Kick via Telegram API if channelId exists
    if (channelId) {
      try {
        await ctx.api.banChatMember(channelId, targetUserId);
        await ctx.api.unbanChatMember(channelId, targetUserId);
      } catch (err: any) {
        console.error(`Failed to kick user ${targetUserId} from channel ${channelId}:`, err.message);
      }
    }

    return ctx.reply(
      `🗑️ Revoked subscription and kicked user <code>${targetUserId}</code> from channel.`,
      { parse_mode: "HTML" }
    );
  });

  // Admin Command: /sublist
  bot.command("sublist", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    await connectToDatabase();
    const subs = await Subscription.find({ status: "ACTIVE" }).limit(50);

    if (subs.length === 0) {
      return ctx.reply("ℹ️ No active subscribers found in database.");
    }

    let msg = `<b>📋 Active Subscribers List (${subs.length})</b>\n\n`;
    for (const s of subs) {
      const expStr = new Date(s.expiry_date * 1000).toLocaleDateString();
      msg += `• <code>${s.user_id}</code> | ${s.name} | ${s.story_name} | Exp: ${expStr}\n`;
    }

    return ctx.reply(msg, { parse_mode: "HTML" });
  });

  // Admin Command: /channeladd <channel_id> <story_name> [price=60] [days=30] [upi_id]
  bot.command("channeladd", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    const args = ctx.match.trim().split(/\s+/);
    if (args.length < 2 || !args[0] || !args[1]) {
      return ctx.reply(
        "⚠️ <b>Usage:</b> <code>/channeladd &lt;channel_id&gt; &lt;story_name&gt; [price=60] [days=30] [upi_id]</code>",
        { parse_mode: "HTML" }
      );
    }

    const channelId = parseInt(args[0], 10);
    const storyName = args[1];
    const price = args[2] ? parseFloat(args[2]) : 60;
    const days = args[3] ? parseInt(args[3], 10) : 30;
    const upiId = args[4] || process.env.UPI_ID || "merchant@upi";

    await connectToDatabase();

    let title = storyName;
    try {
      const chat = await ctx.api.getChat(channelId);
      title = chat.title || storyName;
    } catch (e) {
      console.warn(`Could not fetch chat title for ${channelId}, using storyName.`);
    }

    const chDoc = await Channel.findOneAndUpdate(
      { channel_id: channelId },
      {
        channel_id: channelId,
        title,
        story_name: storyName,
        default_price: price,
        default_days: days,
        upi_id: upiId,
        log_channel_id: channelId,
        is_active: true,
      },
      { upsert: true, new: true }
    );

    return ctx.reply(
      `✅ <b>Channel Registered Successfully!</b>\n\n` +
      `📺 <b>Title:</b> ${chDoc.title}\n` +
      `📖 <b>Story Name:</b> ${chDoc.story_name}\n` +
      `🆔 <b>Channel ID:</b> <code>${chDoc.channel_id}</code>\n` +
      `💰 <b>Default Price:</b> ₹${chDoc.default_price} / ${chDoc.default_days} Days\n` +
      `💳 <b>UPI ID:</b> <code>${chDoc.upi_id}</code>`,
      { parse_mode: "HTML" }
    );
  });

  // Admin Command: /channellist
  bot.command("channellist", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    await connectToDatabase();
    const channels = await Channel.find({ is_active: true });

    if (channels.length === 0) {
      return ctx.reply("ℹ️ No active channels registered in database.");
    }

    let msg = `<b>📺 Registered Paid Channels (${channels.length})</b>\n\n`;
    for (const c of channels) {
      msg += `• <b>${c.story_name}</b> | <code>${c.channel_id}</code> | ₹${c.default_price}/${c.default_days}d\n`;
    }

    return ctx.reply(msg, { parse_mode: "HTML" });
  });

  // Admin Command: /channelrem <channel_id>
  bot.command("channelrem", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    const args = ctx.match.trim().split(/\s+/);
    if (!args[0]) {
      return ctx.reply("⚠️ <b>Usage:</b> <code>/channelrem &lt;channel_id&gt;</code>", {
        parse_mode: "HTML",
      });
    }

    const channelId = parseInt(args[0], 10);
    await connectToDatabase();

    await Channel.findOneAndUpdate({ channel_id: channelId }, { is_active: false });
    return ctx.reply(`🗑️ Channel slot <code>${channelId}</code> deactivated.`, {
      parse_mode: "HTML",
    });
  });

  // Admin Command: /substats
  bot.command("substats", async (ctx) => {
    if (!ctx.from || !isAdmin(ctx.from.id)) {
      return ctx.reply("⛔ നിങ്ങൾക്ക് ഈ കമാൻഡ് ഉപയോഗിക്കാൻ അധികാരമില്ല.");
    }

    await connectToDatabase();
    const total = await Subscription.countDocuments();
    const active = await Subscription.countDocuments({ status: "ACTIVE" });
    const expired = await Subscription.countDocuments({ status: "EXPIRED" });

    return ctx.reply(
      `📊 <b>Subscription Platform Analytics</b>\n\n` +
      `👥 <b>Total Subscribers:</b> <code>${total}</code>\n` +
      `🟢 <b>Active Subscribers:</b> <code>${active}</code>\n` +
      `🔴 <b>Expired Subscribers:</b> <code>${expired}</code>\n\n` +
      `⚡ <b>Deployment Status:</b> Running`,
      { parse_mode: "HTML" }
    );
  });

  return bot;
}
