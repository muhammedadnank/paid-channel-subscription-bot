# 🎨 UI/UX & Telegram Bot Interaction Flow - grammY Stack

## 1. Overview & UI Guidelines
The **Vercel Serverless Bot** utilizes grammY's `@grammyjs/menu` plugin to construct reactive inline keyboards, status cards, and payment workflows.

---

## 2. Interactive Menu Layout (`src/bot/menus/main.ts`)

### 2.1 Main User Menu
```
+----------------------------------------------------------------+
|  👋 Welcome to Pocket FM VIP Subscription Bot!                |
|                                                                |
|  Select an option below to manage your subscription:           |
+----------------------------------------------------------------+
|  [ 🍿 Browse Channels & Plans ]  |  [ 📋 My Active Subscriptions ]|
+----------------------------------+-----------------------------+
|  [ 💳 Payment Methods / UPI ]    |  [ 💬 Help & Support ]      |
+----------------------------------------------------------------+
```

### 2.2 grammY Code Structure (`src/bot/menus/main.ts`)
```typescript
import { Menu } from "@grammyjs/menu";

export const mainMenu = new Menu("main-menu")
  .text("🍿 Browse Channels", async (ctx) => {
    await ctx.reply("Select a channel plan below:", { reply_markup: channelMenu });
  })
  .text("📋 My Subscriptions", async (ctx) => {
    // Query MongoDB and show subscriptions
  })
  .row()
  .text("💳 UPI Info", (ctx) => ctx.reply(`💳 **UPI ID:** <code>${process.env.UPI_ID}</code>`, { parse_mode: "HTML" }))
  .text("💬 Support", (ctx) => ctx.reply("Contact Admin: @adnan_dev"));
```

---

## 3. Malayalam Notification DMs & Dynamic QR Codes

### 3.1 24-Hour Expiry Warning DM
Dispatched automatically by `/api/cron.ts` worker with dynamic UPI QR code photo.

```html
<b>⚠️ നിങ്ങളുടെ Pocket FM Subscription അവസാനിക്കാൻ പോകുന്നു!</b>

പ്രിയ <b>{name}</b>,
നിങ്ങളുടെ <b>{story_name}</b> സബ്സ്ക്രിപ്ഷൻ കാലാവധി <b>{remaining_hours} മണിക്കൂറിനുള്ളിൽ</b> അവസാനിക്കും.

🗓️ <b>ഏക്സ്പെയറി തീയതി:</b> <code>{expiry_date_str}</code>
💰 <b>പുതുക്കൽ തുക:</b> <code>₹{amount}</code> (30 ദിവസത്തേക്ക്)

സബ്സ്ക്രിപ്ഷൻ തടസ്സമില്ലാതെ തുടരാൻ താഴെ കാണുന്ന QR സ്കാൻ ചെയ്ത് പണം അടച്ച് റീന്യൂ ചെയ്യുക:

💳 <b>UPI ID:</b> <code>{upi_id}</code>

<i>കാലാവധി കഴിഞ്ഞാൽ സിസ്റ്റം സ്വയം ചാനലിൽ നിന്നും നീക്കം (Auto-Kick) ചെയ്യുന്നതാണ്.</i>
```

### 3.2 Single-Use Invite Link Delivery DM
Generated via `bot.api.createChatInviteLink(channel_id, { member_limit: 1, expire_date: now + 86400 })`.

```html
<b>🎉 സബ്സ്ക്രിപ്ഷൻ വിജയം! Welcome to {story_name}!</b>

പ്രിയ <b>{name}</b>,
നിങ്ങളുടെ സബ്സ്ക്രിപ്ഷൻ വിജയികരമായി ആക്റ്റീവ് ആയിട്ടുണ്ട്.

🗓️ <b>കാലാവധി അവസാനിക്കുന്നത്:</b> <code>{expiry_date_str}</code>
🔑 <b>നിങ്ങളുടെ പേഴ്സണൽ ചാനൽ ലിങ്ക്:</b>
{invite_link}

<i>⚠️ ഈ ലിങ്ക് ഒരാൾക്ക് (Single Use) മാത്രമേ ഉപയോഗിക്കാൻ സാധിക്കൂ. 24 മണിക്കൂറിനുള്ളിൽ ജോയിൻ ചെയ്യുക.</i>
```
