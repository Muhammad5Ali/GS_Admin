import express from "express";
import { 
  addWorker, 
  getWorkers, 
  updateWorker, 
  deleteWorker 
} from "../controllers/workerController.js";
import { isAuthenticated } from "../middleware/auth.js";
import { isSupervisor } from "../routes/supervisorRoutes.js";

const router = express.Router();

router.use(isAuthenticated, isSupervisor);

router.post("/", addWorker);
router.get("/", getWorkers);
router.put("/:id", updateWorker);
router.delete("/:id", deleteWorker);

export default router;