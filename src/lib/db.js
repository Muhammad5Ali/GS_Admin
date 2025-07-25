import mongoose from "mongoose";
import dotenv from "dotenv";

// immediately load .env into process.env
dotenv.config();

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Database connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to the database", error);
    process.exit(1);
  }
};
