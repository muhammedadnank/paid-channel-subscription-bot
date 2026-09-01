# 🍃 MongoDB & Mongoose Database Plan (Atlas M0 Cluster)

## 1. Cloud Database Strategy
The project utilizes **MongoDB Atlas (Free M0 Tier)**, providing 512 MB permanent storage, zero setup cost, and native serverless connection pooling via **Mongoose**.

### Mongoose Connection Caching Strategy (`src/db/connection.ts`)
To prevent connection leaks across Vercel serverless function invocations, Mongoose reuses warm connections:

```typescript
import mongoose from "mongoose";

let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  };

  cachedConnection = await mongoose.connect(process.env.MONGO_URI!, opts);
  console.log("🍃 MongoDB Atlas Connection Established");
  return cachedConnection;
}
```

---

## 2. Mongoose Schema Definitions

### 2.1 Subscription Model (`src/db/models/Subscription.ts`)
```typescript
import { Schema, model, Document } from "mongoose";

export interface ISubscription extends Document {
  user_id: number;
  channel_id: number;
  story_name: string;
  name: string;
  username?: string;
  days: number;
  amount: number;
  status: "ACTIVE" | "EXPIRED" | "REMOVED";
  joined_date: number; // Epoch timestamp
  expiry_date: number; // Epoch timestamp
  reminded_24h: boolean;
  last_kicked_at?: number;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user_id: { type: Number, required: true, index: true },
    channel_id: { type: Number, required: true, index: true },
    story_name: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, default: "" },
    days: { type: Number, required: true, default: 30 },
    amount: { type: Number, required: true, default: 60 },
    status: { type: String, enum: ["ACTIVE", "EXPIRED", "REMOVED"], default: "ACTIVE", index: true },
    joined_date: { type: Number, required: true },
    expiry_date: { type: Number, required: true, index: true },
    reminded_24h: { type: Boolean, default: false, index: true },
    last_kicked_at: { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Unique Compound Index (Prevents duplicate subscriptions per channel)
SubscriptionSchema.index({ user_id: 1, channel_id: 1 }, { unique: true });

// Compound Index for Cron Warning Queries
SubscriptionSchema.index({ status: 1, reminded_24h: 1, expiry_date: 1 });

export const Subscription = model<ISubscription>("Subscription", SubscriptionSchema);
```

### 2.2 Channel Model (`src/db/models/Channel.ts`)
```typescript
import { Schema, model, Document } from "mongoose";

export interface IChannel extends Document {
  channel_id: number;
  title: string;
  story_name: string;
  default_price: number;
  default_days: number;
  upi_id: string;
  log_channel_id: number;
  is_active: boolean;
}

const ChannelSchema = new Schema<IChannel>({
  channel_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  story_name: { type: String, required: true },
  default_price: { type: Number, default: 60 },
  default_days: { type: Number, default: 30 },
  upi_id: { type: String, required: true },
  log_channel_id: { type: Number, required: true },
  is_active: { type: Boolean, default: true }
});

export const Channel = model<IChannel>("Channel", ChannelSchema);
```

---

## 3. Migration Script (`scripts/migrate_from_json.ts`)
Imports legacy data from Kurigram's `localdb.json` into MongoDB Atlas:

```typescript
import fs from "fs";
import mongoose from "mongoose";
import { Subscription } from "../src/db/models/Subscription";

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI!);
  const rawData = JSON.parse(fs.readFileSync("localdb.json", "utf-8"));
  
  let subData = rawData.SUBSCRIPTION_USERS || {};
  if (typeof subData === "string") {
    subData = JSON.parse(subData);
  }

  for (const [key, rec] of Object.entries<any>(subData)) {
    await Subscription.findOneAndUpdate(
      { user_id: Number(rec.user_id), channel_id: Number(rec.channel_id) },
      {
        user_id: Number(rec.user_id),
        channel_id: Number(rec.channel_id),
        story_name: rec.story_name || "Pocket FM Channel",
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
    console.log(`Migrated subscriber ${rec.user_id} (${rec.name})`);
  }

  console.log("✅ Kurigram JSON data successfully migrated to MongoDB Atlas!");
  process.exit(0);
}

migrate();
```
