import express from "express";
import { 
  markAttendance, 
  getWorkerAttendance, 
  getTodaysAttendance 
} from "../controllers/attendanceController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { isSupervisor } from "./supervisorRoutes.js";

const router = express.Router();

router.use(isAuthenticated, isSupervisor);

router.post("/", markAttendance);
router.get("/worker/:workerId", getWorkerAttendance);
router.get("/today", getTodaysAttendance);

export default router;