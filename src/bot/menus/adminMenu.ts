import { Menu } from "@grammyjs/menu";
import { Subscription } from "../../db/models/Subscription.js";
import { connectToDatabase } from "../../db/connection.js";

export const adminMenu = new Menu("admin-root-menu")
  .text("📊 Analytics & Stats", async (ctx) => {
    await connectToDatabase();
    const total = await Subscription.countDocuments();
    const active = await Subscription.countDocuments({ status: "ACTIVE" });
    const expired = await Subscription.countDocuments({ status: "EXPIRED" });
    const revenueAgg = await Subscription.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenue = revenueAgg[0]?.total || 0;

    await ctx.reply(
      `📊 <b>Admin Dashboard Analytics</b>\n\n` +
        `👥 <b>Total Subscribers:</b> <code>${total}</code>\n` +
        `🟢 <b>Active Subscribers:</b> <code>${active}</code>\n` +
        `🔴 <b>Expired Subscribers:</b> <code>${expired}</code>\n` +
        `💰 <b>Total Recorded Revenue:</b> <code>₹${revenue}</code>\n\n` +
        `⚡ <b>Platform:</b> Vercel Serverless (MongoDB Atlas)`,
      { parse_mode: "HTML" }
    );
  })
  .text("👥 Active List", async (ctx) => {
    await connectToDatabase();
    const activeSubs = await Subscription.find({ status: "ACTIVE" }).limit(10);
    if (activeSubs.length === 0) {
      return ctx.reply("ℹ️ No active subscribers found.");
    }
    let text = `<b>🟢 Active Subscribers (Top 10):</b>\n\n`;
    for (const s of activeSubs) {
      const expDate = new Date(s.expiry_date * 1000).toLocaleDateString();
      text += `• <code>${s.user_id}</code> | ${s.name} | Exp: ${expDate}\n`;
    }
    await ctx.reply(text, { parse_mode: "HTML" });
  })
  .row()
  .text("🔴 Expired List", async (ctx) => {
    await connectToDatabase();
    const expiredSubs = await Subscription.find({ status: "EXPIRED" }).limit(10);
    if (expiredSubs.length === 0) {
      return ctx.reply("ℹ️ No expired subscribers found.");
    }
    let text = `<b>🔴 Expired Subscribers (Top 10):</b>\n\n`;
    for (const s of expiredSubs) {
      text += `• <code>${s.user_id}</code> | ${s.name} | ${s.story_name}\n`;
    }
    await ctx.reply(text, { parse_mode: "HTML" });
  })
  .text("ℹ️ Quick Help", (ctx) =>
    ctx.reply(
      `<b>💡 Admin Command Shortcuts:</b>\n\n` +
        `• <code>/subadd &lt;user_id&gt; [days] [amount]</code> - Add subscriber\n` +
        `• <code>/subextend &lt;user_id&gt; [days]</code> - Extend subscriber\n` +
        `• <code>/subrem &lt;user_id&gt;</code> - Revoke & Kick subscriber\n` +
        `• <code>/substats</code> - View platform metrics`,
      { parse_mode: "HTML" }
    )
  );
