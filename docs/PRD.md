# 📋 Product Requirement Document (PRD) - Vercel Serverless Stack

## 1. Executive Summary
The **Telegram Paid Channel Subscription & Management System** is a 100% serverless, cloud-native automation platform designed to monetize private Telegram channels (audiobooks, premium series, educational content). Built specifically for deployment on **Vercel's Free Hobby Tier**, it leverages **grammY (TypeScript)**, **MongoDB Atlas**, and **Serverless Webhook Events** to automate subscription registration, payment verification, single-use invite link generation, 24-hour advance renewal warnings, and automated channel kick/unban routines.

---

## 2. Business Objectives & Vercel Cost Target
- **Zero Hosting Expense ($0/month)**: Designed strictly within Vercel Free Tier limits (100,000 requests/day, 10s execution limit) and MongoDB Atlas M0 Free Cluster (512MB storage).
- **Automated Channel Gatekeeping**: Eliminate manual member administration using official Telegram Bot API admin methods (`banChatMember`, `unbanChatMember`, `createChatInviteLink`).
- **High Renewal Conversion**: Automated 24-hour advance DMs with Malayalam text and dynamic UPI QR code images.
- **Single-Use Access Security**: Prevent invite link leakage by generating single-use Telegram invite links (`member_limit=1`, `expire_date=now+24h`).

---

## 3. System Roles & Boundaries

### 3.1 Roles
1. **Super Admin / Channel Owner**: Adds channel slots, sets pricing, approves manual UPI transactions, and views revenue metrics.
2. **End-User / Subscriber**: Interacts with the bot via Telegram UI, selects plans, receives payment QR codes, submits UTR payment proofs, receives invite links, and receives renewal notifications.

---

## 4. System Architecture & Lifecycle (Vercel Serverless)

```
                                VERCEL FREE SERVERLESS ARCHITECTURE
                                
[ Telegram App ] ------ (HTTP POST Webhook) ------> [ /api/bot.ts (grammY) ]
                                                            |
                                                            v
[ Cron-Job.org ] ------ (Every 10 Mins) -----------> [ /api/cron.ts ]
                                                            |
                                                            +-------> [ MongoDB Atlas M0 ]
```

### 4.1 Subscription States
- `ACTIVE`: User has active channel access (`expiry_date > current_timestamp`).
- `WARNING_SENT`: 24-hour warning DM delivered; user remains active.
- `EXPIRED`: Expiry timestamp elapsed; user kicked/unbanned from Telegram channel.
- `REMOVED`: Subscription revoked manually by Admin.

---

## 5. Functional Requirements (Bot API Driven)

### 5.1 Channel Slot & Plan Configuration
- Support multiple Telegram channels managed from a single Vercel bot.
- Each channel record contains: `channel_id`, `title`, `story_name`, `default_price`, `default_days`, `upi_id`, and `log_channel_id`.

### 5.2 Interactive Bot UI (`@grammyjs/menu`)
- Interactive inline keyboards for plan browsing, status checking, and payment proof submission.

### 5.3 Automated 24-Hour Expiry Warning (`/api/cron.ts`)
- Executed via cron trigger every 10 minutes.
- Queries MongoDB Atlas for active subscriptions where `0 < remaining_seconds <= 86400` and `reminded_24h == false`.
- Sends personalized Malayalam DM with dynamic UPI QR code attachment.
- Updates database flag `reminded_24h = true`.

### 5.4 Automated Day 30 Channel Kick & Renewal DM
- Queries MongoDB for subscriptions where `status == "ACTIVE"` and `expiry_date <= current_timestamp`.
- Executes Telegram API kick sequence: `bot.api.banChatMember(channel_id, user_id)` followed by `bot.api.unbanChatMember(channel_id, user_id)`.
- Updates MongoDB status to `"EXPIRED"`.
- Dispatches renewal DM to user with payment details and QR code.
- Dispatches HTML card to Admin Log Channel.

---

## 6. Non-Functional Requirements (Serverless Optimized)
- **Cold Start Optimization**: Cold start latency must remain `< 50ms` using TypeScript and grammY.
- **Idempotent Webhook Execution**: Idempotency keys to prevent duplicate processing of Telegram retries.
- **Database Connection Reuse**: Cached MongoClient connection in Vercel function instances.
