# ⚡ Vercel Free Tier Architecture (grammY + MongoDB Atlas)

## 1. Vercel Hobby (Free Tier) Limits & Capabilities

Vercel provides a generous **Hobby (Free) Tier** ideal for hosting Telegram Webhook Bots without paying any hosting fees:

| Resource / Limit | Vercel Free Tier Limit | Paid Channel Bot Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Serverless Function Executions** | **100,000 Requests / Day** | ~5,000 Updates / Day | 🟢 **100% Covered** |
| **Max Execution Timeout** | **10 Seconds / Request** | ~1-2 Seconds / Request | 🟢 **100% Covered** |
| **Node.js / TypeScript Runtime**| Included (Native) | Node.js 18+ / 20+ | 🟢 **100% Covered** |
| **Bandwidth** | **100 GB / Month** | ~5 GB / Month | 🟢 **100% Covered** |
| **SSL / HTTPS Certificates** | **Auto Free Let's Encrypt** | Required by Telegram API | 🟢 **100% Covered** |

---

## 2. Recommended 100% Free Stack Components

```
+-----------------------------------------------------------------------------------+
|                              100% FREE CLOUD STACK                                |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
+-------v-------+                 +-------v-------+                 +-------v-------+
| Vercel Server |                 | MongoDB Atlas |                 | Upstash QStash|
| (grammY Bot)  |                 | (Free M0 DB)  |                 | (Free Crons)  |
| 100k Req/Day  |                 | 512 MB Storage|                 | 500 Crons/Day |
+---------------+                 +---------------+                 +---------------+
```

1. **Bot Engine**: **grammY (TypeScript / Node.js)**
   - Runs in `api/bot.ts` as a Vercel Serverless Webhook Function.
   - Ultra-fast cold start (~30ms) & native `webhookCallback(bot, "express")`.
2. **Database**: **MongoDB Atlas (Free M0 Cluster)**
   - 512 MB permanent storage (Stores 100,000+ subscriber records easily).
   - No credit card required.
3. **Cron Worker (10-min Expiry Check & 24h Warnings)**:
   - **cron-job.org** or **Upstash QStash** (Free 500 triggers/day).
   - Automatically triggers `https://your-app.vercel.app/api/cron?secret=YOUR_SECRET` every 10 minutes.

---

## 3. Vercel Project Directory Structure (`grammY` TypeScript)

```
paid-sub-vercel-bot/
├── api/
│   ├── bot.ts               # Telegram Webhook Endpoint (/api/bot)
│   └── cron.ts              # 10-Min Expiry & Warning Worker (/api/cron)
├── src/
│   ├── config/
│   │   └── env.ts           # Environment variables validation (Zod)
│   ├── db/
│   │   ├── client.ts        # Mongoose / MongoClient connection helper
│   │   └── models/
│   │       ├── Subscription.ts
│   │       └── Channel.ts
│   ├── bot/
│   │   ├── commands/        # /start, /subadd, /subextend, /substats
│   │   ├── menus/           # grammY interactive inline keyboards
│   │   └── services/        # Invite link creation & Channel kick helpers
│   └── utils/
│       └── qr.ts            # Dynamic UPI QR Code generator
├── vercel.json              # Vercel function timeout & cron config
├── package.json             # Dependencies (@grammyjs/bot, mongoose, qrcode)
├── tsconfig.json            # TypeScript configuration
└── README.md
```

---

## 4. Key Vercel Implementation Files

### 4.1 Webhook Endpoint (`api/bot.ts`)
```typescript
import { Bot, webhookCallback } from "grammy";
import { connectDB } from "../src/db/client";
import { setupBotCommands } from "../src/bot/commands";

const bot = new Bot(process.env.BOT_TOKEN!);

// Register commands and inline menus
setupBotCommands(bot);

// Vercel Serverless Handler
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).send("Paid Subscription Bot Webhook Active");
  }
  
  // Ensure DB Connection
  await connectDB();
  
  // Handover update to grammY
  return webhookCallback(bot, "express")(req, res);
}
```

### 4.2 Cron Worker Endpoint (`api/cron.ts`)
```typescript
import { Bot } from "grammy";
import { connectDB } from "../src/db/client";
import { Subscription } from "../src/db/models/Subscription";

const bot = new Bot(process.env.BOT_TOKEN!);

export default async function handler(req: any, res: any) {
  // Protect cron endpoint with secret key
  const secret = req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await connectDB();
  const now = Math.floor(Date.now() / 1000);

  // 1. Process 24-Hour Expiry Warnings
  const warningSubs = await Subscription.find({
    status: "ACTIVE",
    reminded_24h: false,
    expiry_date: { $gt: now, $lte: now + 86400 }
  });

  for (const sub of warningSubs) {
    try {
      await bot.api.sendMessage(
        sub.user_id,
        `⚠️ നിങ്ങളുടെ ${sub.story_name} സബ്സ്ക്രിപ്ഷൻ 24 മണിക്കൂറിനുള്ളിൽ അവസാനിക്കും!`,
        { parse_mode: "HTML" }
      );
      sub.reminded_24h = true;
      await sub.save();
    } catch (e) {
      console.error(`Warning DM failed for user ${sub.user_id}:`, e);
    }
  }

  // 2. Process Auto-Kicks for Expired Users
  const expiredSubs = await Subscription.find({
    status: "ACTIVE",
    expiry_date: { $lte: now }
  });

  for (const sub of expiredSubs) {
    try {
      // Kick & Unban from Telegram Channel
      await bot.api.banChatMember(sub.channel_id, sub.user_id);
      await bot.api.unbanChatMember(sub.channel_id, sub.user_id);
      
      sub.status = "EXPIRED";
      await sub.save();

      // Send Renewal DM
      await bot.api.sendMessage(
        sub.user_id,
        `🛑 നിങ്ങളുടെ ${sub.story_name} സബ്സ്ക്രിപ്ഷൻ കാലാവധി അവസാനിച്ചതിനാൽ ചാനലിൽ നിന്നും നീക്കം ചെയ്തിട്ടുണ്ട്.`
      );
    } catch (e) {
      console.error(`Auto-kick failed for user ${sub.user_id}:`, e);
    }
  }

  return res.status(200).json({
    status: "OK",
    warnings_sent: warningSubs.length,
    kicked_count: expiredSubs.length
  });
}
```

---

## 5. Deployment Steps on Vercel

1. **GitHub Repository**: Push your code to GitHub.
2. **Import to Vercel**: Connect your GitHub account to [vercel.com](https://vercel.com) and import the repository.
3. **Set Environment Variables**:
   - `BOT_TOKEN`: Telegram bot token from @BotFather
   - `MONGO_URI`: `mongodb+srv://user:pass@cluster.mongodb.net/paid_sub`
   - `CRON_SECRET`: Random secret string to secure cron API route
4. **Deploy**: Click Deploy!
5. **Set Telegram Webhook**:
   Run in browser or curl:
   `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_PROJECT>.vercel.app/api/bot`
6. **Set 10-Min Free Cron**:
   Create a free job on [cron-job.org](https://cron-job.org) targeting `https://<YOUR_PROJECT>.vercel.app/api/cron?secret=<YOUR_CRON_SECRET>` every 10 minutes.
