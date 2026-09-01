# 🚀 Paid Channel Subscription System - Standalone Architecture & Documentation

Welcome to the official specification and architectural design documentation for the standalone **Telegram Paid Channel Subscription & Management System**.

This project extracts, upgrades, and decouples the subscription management features originally developed in `Kurigram_Project` into an enterprise-grade, high-concurrency standalone platform powered by **grammY (TypeScript)** or **FastAPI (Python)**, **MongoDB Atlas**, and **Vercel Serverless**.

---

## 📑 Documentation Index

The complete project architecture, requirements, database models, UI/UX flows, and execution plans are divided into dedicated markdown specifications:

| Document | Description | Focus Area |
| :--- | :--- | :--- |
| ⚡ [**VERCEL_DEPLOYMENT_PLAN.md**](file:///home/adnanxpkd/projects/Telegram%20Related/Personal%20UserBot%20project/Paid%20Channel%20Subscription%20Plan/docs/VERCEL_DEPLOYMENT_PLAN.md) | **100% Free Vercel Deployment** | Vercel Free Tier setup, grammY Webhook code, Cron endpoints & MongoDB Atlas. |
| 📄 [**PRD.md**](file:///home/adnanxpkd/projects/Telegram%20Related/Personal%20UserBot%20project/Paid%20Channel%20Subscription%20Plan/docs/PRD.md) | **Product Requirement Document** | Business logic, goals, user roles, feature specifications & lifecycle. |
| 🛠️ [**TRD.md**](file:///home/adnanxpkd/projects/Telegram%20Related/Personal%20UserBot%20project/Paid%20Channel%20Subscription%20Plan/docs/TRD.md) | **Technical Requirement Document** | Tech stack, system architecture, MTProto / Bot API engine & security. |
| 🍃 [**DATABASE_PLAN.md**](file:///home/adnanxpkd/projects/Telegram%20Related/Personal%20UserBot%20project/Paid%20Channel%20Subscription%20Plan/docs/DATABASE_PLAN.md) | **MongoDB Database & Indexing Plan** | Collections (`users`, `subscriptions`, `channels`, `transactions`), TTL indexes & aggregations. |
| 🎨 [**UI_UX_FLOW.md**](file:///home/adnanxpkd/projects/Telegram%20Related/Personal%20UserBot%20project/Paid%20Channel%20Subscription%20Plan/docs/UI_UX_FLOW.md) | **UI/UX & Telegram Bot Interaction Flow** | Bot inline keyboards, interactive menus, Malayalam templates & UI wireframes. |
| 🗺️ [**IMPLEMENTATION_PLAN.md**](file:///home/adnanxpkd/projects/Telegram%20Related/Personal%20UserBot%20project/Paid%20Channel%20Subscription%20Plan/docs/IMPLEMENTATION_PLAN.md) | **Step-by-Step Implementation Plan** | Phase-by-phase roadmap, modular folder structure & testing guide. |

---

## 💡 System Overview & Architecture Highlights

```
                        +---------------------------------------+
                        |        Telegram Users & Admins        |
                        +-------------------+-------------------+
                                            |
                        +-------------------v-------------------+
                        |    Telegram Webhook (Bot API)         |
                        +-------------------+-------------------+
                                            |
                        +-------------------v-------------------+
                        |   Vercel Serverless Function (grammY) |
                        +-------------------+-------------------+
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
                        +-------------------v-------------------+
                        |      MongoDB Atlas (Free M0 DB)       |
                        +---------------------------------------+
```

### Core Features:
1. **100% Free Hosting Stack**: Vercel Free Serverless + MongoDB Atlas Free M0 Database + cron-job.org / Upstash QStash.
2. **Multi-Channel & Multi-Plan Support**: Manage multiple premium Telegram channels with different pricing, durations, and story/content names.
3. **Automated Expiry & Reminders**: 24-hour advance renewal warnings via DM with automated QR generation and personalized Malayalam/English text.
4. **Instant Automated Kick/Revoke**: Automatic removal and unban of expired members on exact timestamp expiry, coupled with single-use invite link generation.
