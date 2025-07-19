import express from "express";
import { 
  markAttendance, 
  getWorkerAttendance, 
  getTodaysAttendance,
  getAttendanceByDate,
  getAttendanceHistory,
  getAttendanceSummary,
  getWorkerAttendanceByDate
} from "../controllers/attendanceController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { isSupervisor } from "./supervisorRoutes.js";

const router = express.Router();

router.use(isAuthenticated, isSupervisor);

router.post("/", markAttendance);
router.get("/worker/:workerId", getWorkerAttendance);
router.get("/today", getTodaysAttendance);
router.get("/by-date", getAttendanceByDate);
router.get("/history", getAttendanceHistory);
router.get("/summary", getAttendanceSummary);
router.get("/worker/:workerId/by-date", getWorkerAttendanceByDate);

export default router;