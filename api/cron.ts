import { Bot, InputFile } from "grammy";
import { connectToDatabase } from "../src/db/connection.js";
import { Subscription } from "../src/db/models/Subscription.js";
import { generateUPIQRBuffer } from "../src/utils/qr.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is missing!");
}

const bot = new Bot(token);

export default async function handler(req: any, res: any) {
  // Security verification for cron caller
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.query.secret !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized cron trigger" });
  }

  await connectToDatabase();
  const now = Math.floor(Date.now() / 1000);
  const upiId = process.env.UPI_ID || "merchant@upi";

  // 1. Process 24-Hour Expiry Warnings
  const warningSubs = await Subscription.find({
    status: "ACTIVE",
    reminded_24h: false,
    expiry_date: { $gt: now, $lte: now + 86400 },
  });

  let warningCount = 0;
  for (const sub of warningSubs) {
    try {
      const remSec = sub.expiry_date - now;
      const remHours = Math.max(1, Math.floor(remSec / 3600));
      const expStr = new Date(sub.expiry_date * 1000).toLocaleString();
      const qrBuffer = await generateUPIQRBuffer(sub.amount, upiId);

      await bot.api.sendPhoto(
        sub.user_id,
        new InputFile(qrBuffer, "upi_qr.png"),
        {
          caption:
            `⚠️ <b>നിങ്ങളുടെ ${sub.story_name} സബ്സ്ക്രിപ്ഷൻ അവസാനിക്കാൻ പോകുന്നു!</b>\n\n` +
            `നിങ്ങളുടെ ചാനൽ സബ്സ്ക്രിപ്ഷൻ കാലാവധി <b>${remHours} മണിക്കൂറിനുള്ളിൽ</b> അവസാനിക്കും.\n\n` +
            `🗓️ <b>ഏക്സ്പെയറി തീയതി:</b> <code>${expStr}</code>\n` +
            `💰 <b>പുതുക്കൽ തുക:</b> <code>₹${sub.amount}</code>\n` +
            `💳 <b>UPI ID:</b> <code>${upiId}</code>\n\n` +
            `<i>സബ്സ്ക്രിപ്ഷൻ തുടരാൻ QR സ്കാൻ ചെയ്ത് പണം അടച്ച് റീന്യൂ ചെയ്യുക.</i>`,
          parse_mode: "HTML",
        }
      );

      sub.reminded_24h = true;
      await sub.save();
      warningCount++;
    } catch (err: any) {
      console.error(`Warning DM failed for user ${sub.user_id}:`, err.message);
    }
  }

  // 2. Process Auto-Kicks for Expired Subscriptions
  const expiredSubs = await Subscription.find({
    status: "ACTIVE",
    expiry_date: { $lte: now },
  });

  let kickedCount = 0;
  for (const sub of expiredSubs) {
    try {
      // Kick & Unban from Channel via Telegram Bot API
      await bot.api.banChatMember(sub.channel_id, sub.user_id);
      await bot.api.unbanChatMember(sub.channel_id, sub.user_id);

      sub.status = "EXPIRED";
      sub.last_kicked_at = now;
      await sub.save();

      // Dispatch Renewal DM
      await bot.api.sendMessage(
        sub.user_id,
        `🛑 <b>നിങ്ങളുടെ ${sub.story_name} സബ്സ്ക്രിപ്ഷൻ കാലാവധി അവസാനിച്ചതിനാൽ ചാനലിൽ നിന്നും നീക്കം ചെയ്തിട്ടുണ്ട്.</b>\n\n` +
          `വീണ്ടും ജോയിൻ ചെയ്യാൻ <code>₹${sub.amount}</code> താഴെ കാണുന്ന UPI ID-യിലേക്ക് അടച്ച ശേഷം അഡ്മിന് UTR നൽകുക.\n\n` +
          `💳 <b>UPI ID:</b> <code>${upiId}</code>`,
        { parse_mode: "HTML" }
      );
      kickedCount++;
    } catch (err: any) {
      console.error(`Auto-kick failed for user ${sub.user_id}:`, err.message);
    }
  }

  return res.status(200).json({
    status: "SUCCESS",
    timestamp: new Date().toISOString(),
    warnings_sent: warningCount,
    users_kicked: kickedCount,
  });
}
