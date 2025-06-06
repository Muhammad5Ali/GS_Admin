import express from "express";
import "dotenv/config";
import cors from "cors";
import job from "./lib/cron.js";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./lib/db.js";
import classifyRouter from "./routes/classify.js";

const app=express();

const PORT=process.env.PORT || 3000;

job.start(); //start the cron job
//middleware allows u to access the email, name etc, allow to parse json data
//app.use(express.json());
// Increase payload size limit to 10MB
app.use(express.json({ limit: '10mb' }));

// Add error handling for large payloads
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({
      message: "Payload too large",
      suggestion: "Compress images before uploading"
    });
  }
  next();
});
// app.use(cors());
// Add full CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true
}));
const classifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 8, // Limit each IP to 8 requests per windowMs
  message: 'Too many classification requests, please try again later'
});

app.use("/api/auth",authRoutes);
app.use("/api/report",reportRoutes);
// New user routes
app.use("/api/users", userRoutes);
app.use('/classify', classifyLimiter, classifyRouter);

app.listen(PORT,()=>{
    console.log(`Server is listening on port:${PORT}`);;
    connectDB();
});