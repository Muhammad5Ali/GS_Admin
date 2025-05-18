import express from "express";
import "dotenv/config";
import cors from "cors";
import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { connectDB } from "./lib/db.js";

const app=express();

const PORT=process.env.PORT || 3001;
job.start(); //start the cron job
//middleware allows u to access the email, name etc, allow to parse json data
app.use(express.json());
app.use(cors());

app.use("/api/auth",authRoutes);
app.use("/api/report",reportRoutes);

app.listen(PORT,()=>{
    console.log(`Server is listening on port:${PORT}`);;
    connectDB();
});



