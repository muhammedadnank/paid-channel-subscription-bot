import { Schema, model, Document } from "mongoose";

export interface ISubscription extends Document {
  user_id: number;
  channel_id: number;
  story_name: string;
  name: string;
  username?: string;
  days: number;
  amount: number;
  status: "ACTIVE" | "EXPIRED" | "REMOVED";
  joined_date: number;
  expiry_date: number;
  reminded_24h: boolean;
  last_kicked_at?: number;
  created_at: Date;
  updated_at: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user_id: { type: Number, required: true, index: true },
    channel_id: { type: Number, required: true, index: true },
    story_name: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, default: "" },
    days: { type: Number, required: true, default: 30 },
    amount: { type: Number, required: true, default: 60 },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "REMOVED"],
      default: "ACTIVE",
      index: true,
    },
    joined_date: { type: Number, required: true },
    expiry_date: { type: Number, required: true, index: true },
    reminded_24h: { type: Boolean, default: false, index: true },
    last_kicked_at: { type: Number, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

SubscriptionSchema.index({ user_id: 1, channel_id: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1, reminded_24h: 1, expiry_date: 1 });

export const Subscription =
  model<ISubscription>("Subscription", SubscriptionSchema);
