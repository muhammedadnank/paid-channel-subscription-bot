# 🗺️ Step-by-Step Implementation Plan (Vercel Serverless Stack)

## 1. Project Implementation Roadmap

```
+-----------------------------------------------------------------------------------+
|  PHASE 1: Project Setup (TypeScript, grammY, Mongoose, Vercel Config)              |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|  PHASE 2: Database Layer (MongoDB Atlas Connection & Mongoose Schemas)            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|  PHASE 3: Bot Engine (grammY Webhook Handler, Commands & Invite Link Generator)   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|  PHASE 4: Vercel Cron Worker (24h Warning DM & Auto-Kick Engine)                  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|  PHASE 5: QR Generator & Data Migration from Kurigram JSON                        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|  PHASE 6: Vercel Deployment & Free Cron Service (cron-job.org / QStash)           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Detailed Task Checklist

### Phase 1: Environment & Scaffolding Initialization
- [ ] Create project directory and initialize Node.js TypeScript project:
  ```bash
  mkdir paid-sub-bot && cd paid-sub-bot
  npm init -y
  npm install grammy @grammyjs/menu mongoose qrcode dotenv
  npm install -D typescript @types/node @types/qrcode tsx
  npx tsc --init
  ```
- [ ] Configure `vercel.json` for Serverless functions:
  ```json
  {
    "functions": {
      "api/*.ts": {
        "memory": 1024,
        "maxDuration": 10
      }
    }
  }
  ```

### Phase 2: MongoDB Atlas Database Setup
- [ ] Create Free M0 Database on [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas).
- [ ] Implement `src/db/connection.ts` with warm connection caching.
- [ ] Implement Mongoose models (`Subscription`, `Channel`, `Transaction`).
- [ ] Create indexes (`user_id + channel_id` unique compound index).

### Phase 3: grammY Webhook & Command Logic
- [ ] Create `api/bot.ts` with `webhookCallback(bot, "express")`.
- [ ] Implement Admin Commands:
  - `/subadd`: Add subscriber, call `bot.api.createChatInviteLink()`, send DM.
  - `/subextend`: Extend `expiry_date` by X days, reset `reminded_24h = false`.
  - `/subrem`: Kick & unban user (`bot.api.banChatMember` + `bot.api.unbanChatMember`), set status `REMOVED`.
  - `/substats`: Aggregated Mongo pipeline showing total revenue, active, and expired count.
- [ ] Implement `@grammyjs/menu` interactive inline keyboard for `/start`.

### Phase 4: Serverless Cron Worker Implementation
- [ ] Implement `api/cron.ts` endpoint with `CRON_SECRET` validation.
- [ ] Implement 24-hour warning routine with dynamic UPI QR code generator (`qrcode`).
- [ ] Implement Day 30 auto-kick routine and DM renewal notice.

### Phase 5: Legacy Data Migration
- [ ] Create `scripts/migrate_from_json.ts` to import `localdb.json` from Kurigram to MongoDB Atlas.

### Phase 6: Vercel Deployment & Webhook Binding
- [ ] Deploy project to Vercel via CLI or GitHub integration: `vercel --prod`.
- [ ] Configure Environment Variables in Vercel Dashboard: `BOT_TOKEN`, `MONGO_URI`, `UPI_ID`, `WEBHOOK_SECRET`, `CRON_SECRET`, `ADMIN_IDS`.
- [ ] Register Webhook with Telegram:
  `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_APP>.vercel.app/api/bot&secret_token=<WEBHOOK_SECRET>`
- [ ] Register 10-minute cron on [cron-job.org](https://cron-job.org) targeting `https://<YOUR_VERCEL_APP>.vercel.app/api/cron?secret=<CRON_SECRET>`.

---

## 3. Verification & Testing Checklist
- [ ] Test `/start` menu on Telegram.
- [ ] Execute `/subadd <user_id> 30 60` -> Verify MongoDB Atlas document creation & single-use invite link DM delivery.
- [ ] Manually trigger `/api/cron?secret=XYZ` -> Verify warning DMs and channel kicks.
