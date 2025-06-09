import express from "express";
import "dotenv/config";
import cors from "cors";
import job from "./lib/cron.js";
import rateLimit from "express-rate-limit";
import axios from "axios"; // Add axios for Hugging Face API calls
import classifyRoutes from "./routes/classify.js";

import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

job.start(); // Start the cron job

// Security and configuration
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({
      error: "Payload too large",
      suggestion: "Compress images before uploading"
    });
  }
  
  // Handle other errors
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Rate limiter for report creation
const reportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit to 5 report submissions per minute
  message: JSON.stringify({
    error: 'Too many report submissions',
    message: 'Please try again later'
  })
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/report", reportLimiter, reportRoutes); // Add rate limiter to reports
app.use("/api/users", userRoutes);
app.use("/api/classify", classifyRoutes); // Mount classify route


app.listen(PORT, () => {
  console.log(`Server is listening on port:${PORT}`);
  connectDB();
});