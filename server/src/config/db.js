import mongoose from "mongoose";

export const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in environment variables.");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
};
