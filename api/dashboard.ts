import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { connectToDatabase } from "../src/db/connection.js";
import { Subscription } from "../src/db/models/Subscription.js";

export default async function handler(req: any, res: any) {
  try {
    await connectToDatabase();

    const total = await Subscription.countDocuments();
    const active = await Subscription.countDocuments({ status: "ACTIVE" });
    const expired = await Subscription.countDocuments({ status: "EXPIRED" });
    const subscribers = await Subscription.find().sort({ created_at: -1 }).limit(50);

    const revenueAgg = await Subscription.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenue = revenueAgg[0]?.total || 0;

    const rowsHtml = subscribers
      .map(
        (s) => `
      <tr>
        <td><code>${s.user_id}</code></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.story_name}</td>
        <td><span class="badge ${s.status === "ACTIVE" ? "bg-success" : "bg-danger"}">${s.status}</span></td>
        <td>₹${s.amount}</td>
        <td>${new Date(s.expiry_date * 1000).toLocaleDateString()}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paid Channel Bot - Admin Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { background-color: #0f172a; color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; }
    .stat-val { font-size: 2.2rem; font-weight: 700; color: #38bdf8; }
    .table-dark { background-color: #1e293b; color: #f8fafc; }
    .table-dark th { background-color: #334155; color: #94a3b8; }
    .badge-success { background-color: #10b981; }
    .badge-danger { background-color: #ef4444; }
  </style>
</head>
<body class="p-4">
  <div class="container-fluid">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="fw-bold text-white mb-0">👑 Paid Channel Bot Admin Panel</h2>
        <p class="text-muted mb-0">Live Platform Overview & MongoDB Atlas Subscriber Management</p>
      </div>
      <span class="badge bg-primary px-3 py-2 fs-6">⚡ Vercel Serverless Active</span>
    </div>

    <!-- Analytics Stat Cards -->
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="card p-3 shadow-sm">
          <span class="text-muted">Total Subscribers</span>
          <div class="stat-val">${total}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card p-3 shadow-sm">
          <span class="text-muted">Active Subscriptions</span>
          <div class="stat-val text-success">${active}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card p-3 shadow-sm">
          <span class="text-muted">Expired Subscriptions</span>
          <div class="stat-val text-danger">${expired}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card p-3 shadow-sm">
          <span class="text-muted">Total Revenue</span>
          <div class="stat-val text-warning">₹${revenue}</div>
        </div>
      </div>
    </div>

    <!-- Subscriber Table Card -->
    <div class="card p-4">
      <h4 class="fw-bold mb-3">📋 Recent Subscribers List (Top 50)</h4>
      <div class="table-responsive">
        <table class="table table-dark table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Telegram ID</th>
              <th>Name</th>
              <th>Channel / Story</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" class="text-center py-4 text-muted">No subscribers found in database</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  } catch (err: any) {
    console.error("Dashboard error:", err);
    return res.status(500).send(`<h3>Error loading Dashboard: ${err.message}</h3>`);
  }
}
