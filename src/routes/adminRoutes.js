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
import { catchAsyncError } from '../middleware/catchAsyncError.js';

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
// Add to existing routes
router.get('/reports/rejected', 
  isAuthenticated, 
  isAdmin, 
  catchAsyncError(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const reports = await Report.find({ status: 'rejected' })
      .skip(skip)
      .limit(parseInt(limit))
      .populateReportDetails() // Using our helper
      .sort({ rejectedAt: -1 });

    const total = await Report.countDocuments({ status: 'rejected' });

    res.status(200).json({
      success: true,
      reports,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  })
);

export default router;