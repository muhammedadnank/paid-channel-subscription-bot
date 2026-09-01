import { Bot, webhookCallback, InputFile } from "grammy";
import { connectToDatabase } from "../src/db/connection.js";
import { Subscription } from "../src/db/models/Subscription.js";
import { generateUPIQRBuffer } from "../src/utils/qr.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is missing!");
}

const bot = new Bot(token);

// Helper middleware to check Admin IDs
function isAdmin(userId: number): boolean {
  const adminIds = (process.env.ADMIN_IDS || "").split(",").map((id) => parseInt(id.trim(), 10));
  return adminIds.includes(userId);
}

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
    return ctx.reply("⚠️ **Usage:** `/subadd <user_id> [days=30] [amount=60] [channel_id] [story_name]`");
  }

  const targetUserId = parseInt(args[0], 10);
  const days = args[1] ? parseFloat(args[1]) : 30;
  const amount = args[2] ? parseFloat(args[2]) : 60;
  const channelId = args[3] ? parseInt(args[3], 10) : parseInt(process.env.DEFAULT_CHANNEL_ID || "0", 10);
  const storyName = args.slice(4).join(" ") || process.env.DEFAULT_STORY_NAME || "Pocket FM VIP";

  await connectToDatabase();

  const now = Math.floor(Date.now() / 1000);
  const expiryTs = now + days * 86400;

  // Persist / update in MongoDB
  const sub = await Subscription.findOneAndUpdate(
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

  // Generate 1-Time Invite Link via Bot API
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

  // Send DM to Subscriber
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

  return ctx.reply(`✅ Added subscriber <code>${targetUserId}</code> for ${days} days (${storyName}).`);
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
      `⚡ <b>Deployment:</b> Vercel Serverless (grammY + MongoDB Atlas)`,
    { parse_mode: "HTML" }
  );
});

// Vercel Serverless Function Export
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).send("Paid Channel Subscription Webhook Active");
  }

  const secretToken = req.headers["x-telegram-bot-api-secret-token"];
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (expectedSecret && secretToken !== expectedSecret) {
    return res.status(401).send("Unauthorized Secret Token");
  }

  await connectToDatabase();
  return webhookCallback(bot, "express")(req, res);
}
