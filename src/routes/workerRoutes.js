import express from "express";
import { 
  addWorker, 
  getWorkers, 
  updateWorker, 
  deleteWorker,
  getWorkerById 
} from "../controllers/workerController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { isSupervisor } from "./supervisorRoutes.js";

const router = express.Router();

router.use(isAuthenticated, isSupervisor);

// Worker CRUD routes
router.post("/", addWorker);
router.get("/", getWorkers);
router.get("/:id", getWorkerById);
router.put("/:id", updateWorker);
router.delete("/:id", deleteWorker);

export default router;