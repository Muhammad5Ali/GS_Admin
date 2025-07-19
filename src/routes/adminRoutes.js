import express from 'express';
import { 
  getAllReports,
  getReportDetails,
  getSupervisors,
  getDashboardStats
} from '../controllers/adminController.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(isAuthenticated, isAdmin);

router.get('/reports', getAllReports);
router.get('/reports/:id', getReportDetails);
router.get('/supervisors', getSupervisors);
router.get('/stats', getDashboardStats);

export default router;