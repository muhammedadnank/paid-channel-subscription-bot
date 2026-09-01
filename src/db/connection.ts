import mongoose from "mongoose";

let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cachedConnection && cachedConnection.connection.readyState === 1) {
    return cachedConnection;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables!");
  }

  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  };

  cachedConnection = await mongoose.connect(mongoUri, opts);
  console.log("🍃 Connected to MongoDB Atlas");
  return cachedConnection;
}
