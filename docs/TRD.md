# 🛠️ Technical Requirement Document (TRD) - Vercel Serverless Stack

## 1. System Architecture & Tech Stack

### 1.1 Technology Stack
- **Runtime Engine**: Node.js 20.x (Vercel Serverless Function Runtime)
- **Language**: TypeScript 5.x (Strict type safety)
- **Telegram Framework**: **grammY** (`@grammyjs/bot` v1.x)
- **Plugins**: `@grammyjs/menu` (Inline Keyboards), `@grammyjs/conversations` (Dialog flows)
- **Database ORM**: Mongoose 8.x / MongoDB Native Node Driver (Connected to MongoDB Atlas M0)
- **Dynamic QR Generator**: `qrcode` npm package (Renders Buffer -> Telegram InputFile)
- **Cron Scheduler**: External HTTP Trigger ([cron-job.org](https://cron-job.org) or Upstash QStash) calling Vercel Endpoint `/api/cron`

---

## 2. Serverless Architecture & Entry Points

```
                               VERCEL SERVERLESS DIRECTORY
                               
paid-sub-vercel-bot/
├── api/
│   ├── bot.ts             # Webhook Entrypoint (Telegram -> Vercel)
│   └── cron.ts            # Cron Scheduler Worker Entrypoint
├── src/
│   ├── bot/
│   │   ├── commands/      # /start, /subadd, /subextend, /substats
│   │   └── menus/         # Interactive grammY menus
│   ├── db/
│   │   ├── connection.ts  # Cached MongoDB Mongoose connection
│   │   └── models/        # Subscription, Channel, Transaction models
│   └── utils/
│       └── qr.ts          # Buffer QR generator
├── vercel.json            # Vercel function configuration
└── package.json
```

---

## 3. Webhook Entrypoint Implementation (`api/bot.ts`)

```typescript
import { Bot, webhookCallback } from "grammy";
import { connectToDatabase } from "../src/db/connection";
import { registerAdminCommands } from "../src/bot/commands/admin";
import { registerUserCommands } from "../src/bot/commands/user";

const bot = new Bot(process.env.BOT_TOKEN!);

// Register Command & Menu Handlers
registerAdminCommands(bot);
registerUserCommands(bot);

// Serverless Handler for Vercel
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).send("Bot Webhook is Online");
  }

  // Verify Telegram Webhook Secret Token for Security
  const secretToken = req.headers["x-telegram-bot-api-secret-token"];
  if (process.env.WEBHOOK_SECRET && secretToken !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send("Unauthorized");
  }

  // Connect to MongoDB Atlas (reuses warm pool)
  await connectToDatabase();

  // Handover update to grammY Express/HTTP webhook adapter
  return webhookCallback(bot, "express")(req, res);
}
```

---

## 4. Cron Scheduler Endpoint Implementation (`api/cron.ts`)

```typescript
import { Bot } from "grammy";
import { connectToDatabase } from "../src/db/connection";
import { Subscription } from "../src/db/models/Subscription";
import { generateUPIQRBuffer } from "../src/utils/qr";

const bot = new Bot(process.env.BOT_TOKEN!);

export default async function handler(req: any, res: any) {
  // Validate Cron Security Key
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized cron trigger" });
  }

  await connectToDatabase();
  const now = Math.floor(Date.now() / 1000);

  // 1. Process 24-Hour Advance Expiry Warnings
  const warningSubs = await Subscription.find({
    status: "ACTIVE",
    reminded_24h: false,
    expiry_date: { $gt: now, $lte: now + 86400 }
  });

  let warningCount = 0;
  for (const sub of warningSubs) {
    try {
      const qrBuffer = await generateUPIQRBuffer(sub.amount, process.env.UPI_ID!);
      await bot.api.sendPhoto(
        sub.user_id,
        new InputFile(qrBuffer, "upi_qr.png"),
        {
          caption: `⚠️ <b>നിങ്ങളുടെ ${sub.story_name} സബ്സ്ക്രിപ്ഷൻ 24 മണിക്കൂറിനുള്ളിൽ അവസാനിക്കും!</b>\n\n` +
                   `🗓️ ഏക്സ്പെയറി തീയതി: <code>${new Date(sub.expiry_date * 1000).toLocaleString()}</code>\n` +
                   `💰 പുതുക്കൽ തുക: <code>₹${sub.amount}</code>\n💳 UPI ID: <code>${process.env.UPI_ID}</code>`,
          parse_mode: "HTML"
        }
      );

      sub.reminded_24h = true;
      await sub.save();
      warningCount++;
    } catch (err) {
      console.error(`Failed to send 24h warning to ${sub.user_id}:`, err);
    }
  }

  // 2. Process Day 30 Expiration Auto-Kicks
  const expiredSubs = await Subscription.find({
    status: "ACTIVE",
    expiry_date: { $lte: now }
  });

  let kickedCount = 0;
  for (const sub of expiredSubs) {
    try {
      // Kick & Unban from Telegram Channel via Bot API
      await bot.api.banChatMember(sub.channel_id, sub.user_id);
      await bot.api.unbanChatMember(sub.channel_id, sub.user_id);

      sub.status = "EXPIRED";
      await sub.save();

      // Send Renewal DM
      await bot.api.sendMessage(
        sub.user_id,
        `🛑 <b>നിങ്ങളുടെ ${sub.story_name} സബ്സ്ക്രിപ്ഷൻ കാലാവധി അവസാനിച്ചതിനാൽ ചാനലിൽ നിന്നും നീക്കം ചെയ്തിട്ടുണ്ട്.</b>`,
        { parse_mode: "HTML" }
      );
      kickedCount++;
    } catch (err) {
      console.error(`Failed to kick expired user ${sub.user_id}:`, err);
    }
  }

  return res.status(200).json({
    status: "SUCCESS",
    warnings_sent: warningCount,
    users_kicked: kickedCount
  });
}
```

---

## 5. Security & Secret Protection
- **`WEBHOOK_SECRET`**: Random secret header token configured in Telegram `setWebhook` API call to ensure incoming HTTP POST requests originate exclusively from Telegram.
- **`CRON_SECRET`**: Query string token (`/api/cron?secret=XYZ`) preventing unauthorized public invocations of the cron worker.
- **Admin Verification Middleware**: grammY custom middleware filtering commands against `process.env.ADMIN_IDS.split(",")`.
