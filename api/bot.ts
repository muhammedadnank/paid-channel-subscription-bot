import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { webhookCallback } from "grammy";
import { createBot } from "../src/bot/app.js";
import { connectToDatabase } from "../src/db/connection.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN environment variable is missing!");
}

const bot = createBot(token);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(200).send("Paid Channel Subscription Webhook Active");
  }

  const secretToken = req.headers["x-telegram-bot-api-secret-token"];
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (expectedSecret && secretToken !== expectedSecret) {
    return res.status(401).send("Unauthorized Secret Token");
  }

  await connectToDatabase();
  return webhookCallback(bot, "express")(req, res);
}
