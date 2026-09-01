import { Schema, model, Document } from "mongoose";

export interface IChannel extends Document {
  channel_id: number;
  title: string;
  story_name: string;
  default_price: number;
  default_days: number;
  upi_id: string;
  log_channel_id: number;
  is_active: boolean;
}

const ChannelSchema = new Schema<IChannel>({
  channel_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  story_name: { type: String, required: true },
  default_price: { type: Number, default: 60 },
  default_days: { type: Number, default: 30 },
  upi_id: { type: String, required: true },
  log_channel_id: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
});

export const Channel = model<IChannel>("Channel", ChannelSchema);
