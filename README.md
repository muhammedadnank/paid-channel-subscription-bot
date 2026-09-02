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

## ☁️ Deployment

This project is designed to deploy on **Vercel's free tier** using serverless functions and a webhook-based bot (no polling, no always-on server needed).

See [`docs/VERCEL_DEPLOYMENT_PLAN.md`](./docs/VERCEL_DEPLOYMENT_PLAN.md) for the full step-by-step deployment guide, including cron job setup for automated expiry checks and reminders.

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
