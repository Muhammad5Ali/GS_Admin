import express from 'express';
import { 
  getAllReports,
  getReportDetails,
  getSupervisors,
  getDashboardStats,
  getReportsOverview,
  getUserActivity,
  getReportStatusCounts,
  createSupervisor,
  deleteSupervisor,
  markAsPermanentResolved,
  rejectReport
} from '../controllers/adminController.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(isAuthenticated, isAdmin);

router.get('/reports', getAllReports);
router.get('/reports/:id', getReportDetails);
router.get('/supervisors', getSupervisors);
router.get('/stats', getDashboardStats);
router.get('/reports-overview', getReportsOverview);
router.get('/user-activity', getUserActivity);
router.get('/report-status-counts', getReportStatusCounts);
router.post('/supervisors', createSupervisor);
router.delete('/supervisors/:id', deleteSupervisor);
router.patch(
  '/reports/:id/permanent-resolved', 
  isAuthenticated,
  isAdmin,
  markAsPermanentResolved
);
router.post(
  '/reports/:id/reject',
  isAuthenticated,
  isAdmin,
  rejectReport
);

export default router;