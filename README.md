# 🚀 Paid Channel Subscription Bot

**Telegram Paid Channel Subscription & Management System** — built with **grammY (TypeScript)**, **MongoDB Atlas**, and **Vercel Serverless**, designed to run entirely on free-tier infrastructure.

Sell paid access to Telegram channels: single-use invite links, UPI/QR payment generation, automated 24-hour renewal reminders, and automatic kick/unban of expired members — no dedicated server required.

---

## ✨ Features

- 💳 **Multi-Channel & Multi-Plan Support** — Register multiple paid channels, each with its own price, duration, and UPI ID.
- ⏰ **Automated Expiry & Reminders** — 24-hour advance renewal warnings via DM with auto-generated UPI QR codes and bilingual (Malayalam/English) templates.
- 🚫 **Instant Auto Kick/Revoke** — Expired members are automatically banned + unbanned (kicked) from the channel at expiry, freeing the seat for a future rejoin.
- 🔑 **Single-Use Invite Links** — Every new subscriber gets a one-time, time-limited invite link instead of a shared/public link.
- 💰 **UPI QR Payment Engine** — Generates scannable UPI QR codes on the fly (`upi://pay` deep link) for manual/admin-verified payments.
- 👑 **Interactive Admin Panel** — Inline-keyboard admin menu (`/admin`) plus a full set of admin commands.
- 📊 **Live Admin Dashboard** — An HTML dashboard endpoint showing subscriber counts, revenue, and recent subscribers.
- ☁️ **100% Free Hosting Stack** — Vercel Free Serverless Functions + MongoDB Atlas Free M0 + an external cron trigger (cron-job.org / Upstash QStash).

---

## 🏗️ Architecture

```
                        +---------------------------------------+
                        |        Telegram Users & Admins        |
                        +-------------------+---------------------+
                                            |
                        +-------------------v---------------------+
                        |      Telegram Webhook (Bot API)        |
                        +-------------------+---------------------+
                                            |
                        +-------------------v---------------------+
                        |   Vercel Serverless Function (grammY)  |
                        +-------------------+---------------------+
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
+--------v--------+                +--------v--------+                +--------v--------+
|  Bot UI Engine  |                |  Cron Worker    |                | Admin Dashboard |
| (/api/bot.ts)   |                | (/api/cron.ts)  |                |(/api/dashboard) |
+--------+--------+                +--------+--------+                +--------+--------+
         |                                  |                                  |
         +----------------------------------+----------------------------------+
                                            |
                        +-------------------v---------------------+
                        |      MongoDB Atlas (Free M0 DB)        |
                        +---------------------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Bot Framework | [grammY](https://grammy.dev/) (TypeScript) |
| Runtime | Node.js + TypeScript (`tsx` for dev, `tsc` for build) |
| Database | MongoDB Atlas via Mongoose |
| Hosting | Vercel Serverless Functions |
| Scheduling | External cron (cron-job.org / Upstash QStash) hitting `/api/cron` |
| Payments | `qrcode` — generates UPI deep-link QR codes |
| Bot Menus/Flows | `@grammyjs/menu`, `@grammyjs/conversations` |

---

## 📂 Project Structure

```
.
├── api/
│   ├── bot.ts          # Webhook entry point — receives Telegram updates
│   ├── cron.ts          # Scheduled job: sends 24h reminders + auto-kicks expired subs
│   └── dashboard.ts      # HTML admin dashboard (subscriber stats, revenue, recent list)
├── docs/                # Full project documentation (see below)
├── scripts/
│   └── migrate_from_json.ts   # One-time migration from a legacy localdb.json
├── src/
│   ├── bot/
│   │   ├── app.ts        # All bot commands (user + admin)
│   │   └── menus/adminMenu.ts   # Inline-keyboard admin menu
│   ├── db/
│   │   ├── connection.ts        # Cached Mongoose connection
│   │   └── models/
│   │       ├── Subscription.ts
│   │       └── Channel.ts
│   ├── utils/qr.ts       # UPI QR code buffer generator
│   └── dev.ts            # Local long-polling dev runner
├── .env.sample
├── vercel.json           # Function memory/timeout config
└── package.json
```

---

## 🤖 Bot Commands

### User Commands

| Command | Description |
|---|---|
| `/start` | Welcome message + UPI payment info |
| `/help` | Full help guide (shows extra section if you're an admin) |
| `/about` | Bot version, engine, database & hosting info |
| `/stories` | Catalog of currently active paid channels/plans |
| `/myplan`, `/mystatus` | Your active subscriptions & time remaining |

### Admin Commands
*(restricted to Telegram user IDs listed in `ADMIN_IDS`)*

| Command | Description |
|---|---|
| `/admin` | Opens the interactive inline-keyboard admin panel |
| `/subadd <user_id> [days=30] [amount=60] [channel_id] [story_name]` | Add a subscriber, auto-generates & DMs a single-use invite link |
| `/subextend <user_id> [days=30] [amount] [channel_id]` | Extend an existing subscription |
| `/subrem <user_id> [channel_id]` | Revoke subscription + kick from channel |
| `/sublist` | List active subscribers (top 50) |
| `/subsync <channel_id> [user_ids...]` | Verify channel membership and sync/upsert subscription records |
| `/substats` | Subscriber counts (total / active / expired) |
| `/stats` | Server hardware, RAM/heap usage, uptime, and MongoDB Atlas stats |
| `/channeladd <channel_id> <story_name> [price=60] [days=30] [upi_id]` | Register a new paid channel slot, auto-syncs existing channel admins as lifetime subscribers |
| `/channellist` | List all registered channel slots |
| `/channelrem <channel_id>` | Deactivate a channel slot |

---

## 🌐 API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/bot` | `POST` | Telegram webhook receiver (verified via `WEBHOOK_SECRET` header) |
| `/api/cron` | `GET`/`POST` | Triggers 24h reminders + auto-kicks (verified via `?secret=CRON_SECRET`) |
| `/api/dashboard` | `GET` | HTML dashboard — subscriber stats, revenue, recent 50 subscribers |

> ⚠️ **Security note:** `/api/dashboard` currently has **no authentication** — anyone with the URL can view subscriber Telegram IDs, names, and revenue. Treat the deployed dashboard URL as a secret, or add auth (Vercel Password Protection, Basic Auth, or a shared secret query param) before sharing/going live.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- A MongoDB Atlas cluster (Free M0 tier works)
- A Vercel account (for deployment)

### Installation

```bash
git clone https://github.com/muhammedadnank/paid-channel-subscription-bot.git
cd paid-channel-subscription-bot
npm install
```

### Configuration

Copy the environment template and fill in your values:

```bash
cp .env.sample .env
```

| Variable | Required | Description |
|---|---|---|
| `BOT_TOKEN` | ✅ | Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `WEBHOOK_SECRET` | recommended | Secret compared against Telegram's `X-Telegram-Bot-Api-Secret-Token` header |
| `ADMIN_IDS` | ✅ | Comma-separated Telegram user IDs allowed to run admin commands |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `MONGO_NAME` | optional | Database name (default: `paid_sub_db`) |
| `UPI_ID` | recommended | UPI ID shown to users and encoded in QR codes (default: `merchant@upi`) |
| `CRON_SECRET` | recommended | Secret required as `?secret=` on `/api/cron` |
| `LOG_CHANNEL_ID` | optional | Channel/chat ID where admin activity logs (e.g. sync results) are posted |
| `DEFAULT_CHANNEL_ID` | optional | Fallback channel ID used by `/subadd`, `/subextend`, `/subrem` when none is passed |
| `DEFAULT_STORY_NAME` | optional | Fallback plan/story name used by `/subadd` when none is passed |

> Note: `LOG_CHANNEL_ID`, `DEFAULT_CHANNEL_ID`, and `DEFAULT_STORY_NAME` are read by the bot but not currently listed in `.env.sample` — add them there if you use those commands without explicit arguments.

### Local Development

```bash
npm run dev
```

Runs `src/dev.ts` via `tsx watch`, using long-polling (no webhook needed locally).

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Migrating Legacy Data

If you have subscriber data in a legacy `localdb.json` (from the original `Kurigram_Project`), place it in the project root and run:

```bash
npm run migrate
```

This upserts records into the `subscriptions` collection based on `user_id` + `channel_id`.

---

## ☁️ Deployment (Vercel)

This project is designed to deploy on **Vercel's free tier** using serverless functions and a **webhook-based bot** (no polling, no always-on server needed).

### 1. Push to GitHub

Make sure your latest code (with `.env` **excluded** via `.gitignore`) is pushed to a GitHub repository.

### 2. Import the Project into Vercel

- Go to [vercel.com/new](https://vercel.com/new)
- Select **Import Git Repository** and choose this repo
- Framework preset: **Other** (function config comes from `vercel.json`)

### 3. Add Environment Variables

In **Project Settings → Environment Variables**, add all variables from the table above (`BOT_TOKEN`, `MONGO_URI`, `MONGO_NAME`, `ADMIN_IDS`, `UPI_ID`, `WEBHOOK_SECRET`, `CRON_SECRET`, and any of the optional ones you rely on).

### 4. Deploy

Click **Deploy** — Vercel builds the project (`tsc`) and deploys `api/bot.ts`, `api/cron.ts`, and `api/dashboard.ts` as serverless functions (1024 MB / 10s timeout, per `vercel.json`).

Or deploy from the CLI:

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 5. Register the Telegram Webhook

```bash
curl -F "url=https://<your-project>.vercel.app/api/bot" \
     -F "secret_token=<WEBHOOK_SECRET>" \
     https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

Verify it's set correctly:

```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

### 6. Set Up the Cron Job (Expiry Checks & Reminders)

Vercel's free tier has limited built-in cron frequency, so use an external scheduler to hit `/api/cron` periodically:

- **Option A — [cron-job.org](https://cron-job.org):** Create a job hitting `https://<your-project>.vercel.app/api/cron?secret=<CRON_SECRET>` every few minutes.
- **Option B — [Upstash QStash](https://upstash.com/docs/qstash):** Schedule the same endpoint via QStash for more reliability.
- **Option C — [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs):** Add to `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron?secret=<CRON_SECRET>", "schedule": "*/10 * * * *" }
  ]
}
```

> ⚠️ `api/cron.ts` processes reminders and kicks **sequentially** (one Telegram API call at a time), and `vercel.json` currently caps functions at **10s (`maxDuration`)**. If your subscriber count grows large, this can start timing out before finishing the batch — consider raising `maxDuration` and/or batching the `bot.api` calls with `Promise.allSettled`.

### 7. Verify

- Send `/start` to your bot in Telegram — it should respond via the webhook.
- Manually trigger `/api/cron?secret=<CRON_SECRET>` once to confirm it connects to MongoDB and processes expiries without errors.
- Open `/api/dashboard` to confirm stats render (see the security note above before sharing this URL).

For the full deep-dive (MongoDB Atlas setup, index strategy, and phase-by-phase rollout), see [`docs/VERCEL_DEPLOYMENT_PLAN.md`](./docs/VERCEL_DEPLOYMENT_PLAN.md).

---

## 📑 Documentation Index

Full architecture, requirements, database models, and UI/UX flows live in `docs/`:

| Document | Description | Focus Area |
|---|---|---|
| ⚡ `VERCEL_DEPLOYMENT_PLAN.md` | 100% Free Vercel Deployment | Vercel free-tier setup, grammY webhook code, cron endpoints & MongoDB Atlas |
| 📄 `PRD.md` | Product Requirement Document | Business logic, goals, user roles, feature lifecycle |
| 🛠️ `TRD.md` | Technical Requirement Document | Tech stack, system architecture, Bot API engine & security |
| 🍃 `DATABASE_PLAN.md` | MongoDB Database & Indexing Plan | Collections (`users`, `subscriptions`, `channels`, `transactions`), TTL indexes & aggregations |
| 🎨 `UI_UX_FLOW.md` | UI/UX & Bot Interaction Flow | Inline keyboards, interactive menus, Malayalam templates & wireframes |
| 🗺️ `IMPLEMENTATION_PLAN.md` | Step-by-Step Implementation Plan | Phase-by-phase roadmap, folder structure & testing guide |

---

## ⚠️ Known Issues / TODO

- **`api/dashboard.ts` has no authentication** — add a shared-secret check or Vercel Password Protection before deploying publicly.
- **`scripts/migrate_from_json.ts`** references a non-existent legacy field `rec.reminded_29d` (should be the subscriber's reminder flag) — it always evaluates to `false`, which happens to match the schema default, but the reference should be corrected for clarity.
- `.env.sample` doesn't document `LOG_CHANNEL_ID`, `DEFAULT_CHANNEL_ID`, or `DEFAULT_STORY_NAME`, all of which the bot reads from `process.env`.
- `api/cron.ts` sends reminder/kick notifications sequentially inside a loop — fine for small subscriber counts, but may need batching or a higher `maxDuration` as usage grows.
- No automated tests or linting are currently configured.

---

## 📌 Project Origin

This project extracts, upgrades, and decouples the subscription management features originally built inside `Kurigram_Project` into a standalone, enterprise-grade platform.

---

## 📄 License

Licensed under the **MIT License**.

---

## 👤 Author

**Muhammed Adnan K**
- GitHub: [@muhammedadnank](https://github.com/muhammedadnank)
