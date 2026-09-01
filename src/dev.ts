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

  console.log("🤖 Deleting any active Webhook for local long-polling...");
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  console.log("🚀 Starting local Telegram bot long-polling...");

  bot.start({
    onStart: (info) => {
      console.log(`🤖 Logged in as @${info.username} (ID: ${info.id})`);
      console.log("✅ Bot is online & listening for updates! Send /start on Telegram.");
    },
  });
}

startLocalDev().catch((err) => {
  console.error("❌ Failed to start local dev bot:", err);
  process.exit(1);
});
