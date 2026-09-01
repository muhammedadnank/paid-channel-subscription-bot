import "dotenv/config";
import { createBot } from "./bot/app.js";
import { connectToDatabase } from "./db/connection.js";

async function startLocalDev() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("❌ BOT_TOKEN environment variable is missing in .env!");
    process.exit(1);
  }

  console.log("🍃 Connecting to MongoDB Atlas...");
  await connectToDatabase();

  const bot = createBot(token);

  console.log("🤖 Fetching Bot Info from Telegram...");
  await bot.init();
  console.log(`🤖 Logged in as @${bot.botInfo.username} (ID: ${bot.botInfo.id})`);

  console.log("🧹 Clearing active Telegram Webhook for long-polling...");
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log("✅ Webhook cleared successfully.");
  } catch (err: any) {
    console.warn("⚠️ Warning clearing webhook:", err.message);
  }

  console.log("🚀 Starting local Telegram bot long-polling...");
  console.log("✅ Bot is online & listening for updates! Send /start on Telegram.");

  await bot.start();
}

startLocalDev().catch((err) => {
  console.error("❌ Failed to start local dev bot:", err);
  process.exit(1);
});
