import express from "express";
import "dotenv/config";
import cors from "cors";
import job from "./lib/cron.js";
import rateLimit from "express-rate-limit";
import classifyRoutes from "./routes/classify.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./lib/db.js";
import { errorMiddleware } from "./middleware/error.js";
import { removeUnverifiedAccounts } from "./automation/removeUnverifiedAccounts.js";
import supervisorRoutes from "./routes/supervisorRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
app.set('trust proxy', 1); // Trust reverse proxy

const PORT = process.env.PORT || 3000;

job.start(); // Start the cron job

// Security and configuration
app.use(express.json({ limit: '10mb' }));

// Enable CORS
app.use(cors());

app.use(cookieParser()); // Parse cookies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Error handling middleware
app.use((err, req, res, next) => {
  res.setHeader('Content-Type', 'application/json');

  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({
      error: "Payload too large",
      suggestion: "Compress images before uploading"
    });
  }

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
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
app.use("/api/auth", authRoutes);
app.use("/api/report", reportLimiter, reportRoutes); // Rate limiter applied
app.use("/api/users", userRoutes);
app.use("/api/classify", classifyRoutes);
app.use("/api/supervisor", supervisorRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);


removeUnverifiedAccounts(); // Schedule task to remove unverified accounts
// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
  });
});

app.use(errorMiddleware); // Error handling middleware