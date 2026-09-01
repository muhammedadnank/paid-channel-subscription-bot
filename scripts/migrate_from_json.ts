import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Subscription } from "../src/db/models/Subscription.js";

async function migrate() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("❌ MONGO_URI environment variable is required!");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("🍃 Connected to MongoDB Atlas for migration.");

  const localdbPath = path.resolve(process.cwd(), "localdb.json");
  if (!fs.existsSync(localdbPath)) {
    console.error(`❌ localdb.json not found at ${localdbPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(localdbPath, "utf-8"));
  let subsData = raw.SUBSCRIPTION_USERS || {};
  if (typeof subsData === "string") {
    subsData = JSON.parse(subsData);
  }

  let count = 0;
  for (const [key, rec] of Object.entries<any>(subsData)) {
    const userId = Number(rec.user_id);
    const channelId = Number(rec.channel_id);
    if (!userId || !channelId) continue;

    await Subscription.findOneAndUpdate(
      { user_id: userId, channel_id: channelId },
      {
        user_id: userId,
        channel_id: channelId,
        story_name: rec.story_name || "Pocket FM VIP",
        name: rec.name || "Subscriber",
        username: rec.username || "",
        days: Number(rec.days || 30),
        amount: Number(rec.amount || 60),
        status: String(rec.status || "ACTIVE").toUpperCase(),
        joined_date: Number(rec.joined_date || 0),
        expiry_date: Number(rec.expiry_date || 0),
        reminded_24h: Boolean(rec.reminded_29d || false),
        last_kicked_at: rec.last_kicked || null,
      },
      { upsert: true, new: true }
    );
    count++;
    console.log(`Migrated subscriber: ${userId} (${rec.name})`);
  }

  console.log(`✅ Migration complete! Total ${count} records migrated to MongoDB Atlas.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
