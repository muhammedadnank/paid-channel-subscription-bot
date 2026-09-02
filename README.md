# 🚀 Paid Channel Subscription Bot

**Enterprise-grade Telegram Paid Channel Subscription & Management System** — built with **grammY (TypeScript)**, **MongoDB Atlas**, and **Vercel Serverless**, designed to run entirely on free-tier infrastructure.

Manage paid access to Telegram channels: sell subscriptions, auto-generate UPI/QR payments, send renewal reminders, and automatically kick expired members — all without a dedicated server.

---

## ✨ Features

- 💳 **Multi-Channel & Multi-Plan Support** — Run subscriptions for multiple premium channels, each with its own pricing tiers and durations.
- ⏰ **Automated Expiry & Reminders** — 24-hour advance renewal warnings sent via DM, with auto-generated QR codes and bilingual (Malayalam/English) message templates.
- 🚫 **Instant Auto Kick/Revoke** — Expired members are automatically removed and unbanned at the exact expiry timestamp, with single-use invite links generated for renewals.
- 💰 **UPI/QR Payment Engine** — Built-in QR code generation for manual/admin-verified payments.
- ☁️ **100% Free Hosting Stack** — Vercel Free Serverless Functions + MongoDB Atlas Free M0 + cron-job.org / Upstash QStash for scheduled tasks.
- 🧩 **Modular Architecture** — Clean separation between bot logic, cron workers, and the payment engine.

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
|  Bot UI Engine  |                |  Cron Worker    |                | Payment Engine  |
| (/api/bot.ts)   |                | (/api/cron.ts)  |                | (UPI/QR & Admin)|
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
| Runtime | Node.js + TypeScript |
| Database | MongoDB Atlas (via Mongoose) |
| Hosting | Vercel Serverless Functions |
| Scheduling | cron-job.org / Upstash QStash |
| Payments | QR code generation (`qrcode`) |
| Menus/Flows | `@grammyjs/menu`, `@grammyjs/conversations` |

---

## 📂 Project Structure

```
.
├── api/            # Vercel serverless entry points (bot webhook, cron)
├── docs/           # Full project documentation (see below)
├── scripts/        # Utility scripts (e.g. migration from JSON)
├── src/            # Core application source
├── .env.sample     # Environment variable template
├── vercel.json     # Vercel deployment config
└── package.json
```

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

Refer to `.env.sample` for the required variables (bot token, MongoDB URI, admin IDs, etc.).

### Local Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Migrating Existing Data

If you're migrating subscription data from a JSON-based setup:

```bash
npm run migrate
```

---

## ☁️ Deployment (Vercel)

This project is designed to deploy on **Vercel's free tier** using serverless functions and a **webhook-based bot** (no polling, no always-on server needed).

### 1. Push to GitHub

Make sure your latest code (with `.env` **excluded** via `.gitignore`) is pushed to a GitHub repository.

### 2. Import the Project into Vercel

- Go to [vercel.com/new](https://vercel.com/new)
- Select **Import Git Repository** and choose this repo
- Framework preset: **Other** (it's picked up automatically via `vercel.json`)

### 3. Add Environment Variables

In **Project Settings → Environment Variables**, add everything from `.env.sample`, e.g.:

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Telegram bot token from [@BotFather](https://t.me/BotFather) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ADMIN_IDS` | Comma-separated Telegram admin user IDs |
| `WEBHOOK_SECRET` | Random secret used to verify Telegram webhook calls |
| `CRON_SECRET` | Random secret used to authenticate the cron endpoint |

### 4. Deploy

Click **Deploy** — Vercel will build the project using the `build` script (`tsc`) and deploy `api/bot.ts` and `api/cron.ts` as serverless functions.

Alternatively, deploy from the CLI:

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 5. Register the Telegram Webhook

Once deployed, point your bot at the Vercel function URL:

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

Since Vercel's free tier has limited built-in cron frequency, use an external scheduler to hit your cron endpoint periodically:

- **Option A — [cron-job.org](https://cron-job.org):** Create a job that sends a `GET`/`POST` request to `https://<your-project>.vercel.app/api/cron` (with the `CRON_SECRET` as a header or query param) every few minutes.
- **Option B — [Upstash QStash](https://upstash.com/docs/qstash):** Schedule the same endpoint via QStash's cron scheduler for more reliability.
- **Option C — [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs):** Define a schedule directly in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "*/10 * * * *" }
  ]
}
```

> ⚠️ On the Vercel Hobby (free) plan, cron jobs are limited to a minimum daily run — check current Vercel limits before relying on this alone; external schedulers (cron-job.org / QStash) give more frequent, reliable ticks for expiry checks.

### 7. Verify

- Send `/start` to your bot in Telegram — it should respond via the webhook.
- Manually trigger `/api/cron` once to confirm it connects to MongoDB and processes expiries without errors.

For the full deep-dive (MongoDB Atlas setup, index strategy, and phase-by-phase rollout), see [`docs/VERCEL_DEPLOYMENT_PLAN.md`](./docs/VERCEL_DEPLOYMENT_PLAN.md).

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
