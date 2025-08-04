import express from 'express';
import { logout } from '../controllers/userController.js';
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
  rejectReport,
  assignReportsToSupervisor,
  getSupervisorPerformance,
  getAllWorkers,
  addWorkerByAdmin,
  deleteWorkerByAdmin,
  getWorkerAttendance,
  getAttendanceSummary,
  getReportDistribution,
  getSupervisorPerformanceAnalytics,
  getWorkerAttendanceAnalytics,
  getReportTrends,
  getAllUsers
} from '../controllers/adminController.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import { catchAsyncError } from '../middleware/catchAsyncError.js';
import Report from '../models/Report.js';

const router = express.Router();

router.use(isAuthenticated, isAdmin);

router.get('/reports', getAllReports);
router.get('/users', getAllUsers);

router.get('/supervisors', getSupervisors);
router.get('/supervisors/:id/performance', getSupervisorPerformance);

router.post(
  '/reports/assign-to-supervisor',
  isAuthenticated,
  isAdmin,
  assignReportsToSupervisor
);
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
router.get('/rejected-reports', 
  isAuthenticated, 
  isAdmin, 
  catchAsyncError(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const reports = await Report.find({ status: 'rejected' })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('rejectedBy', 'username email profileImage')
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
router.get('/reports/:id', getReportDetails);

// Worker Management Routes
router.get('/workers', getAllWorkers);
router.post('/workers', addWorkerByAdmin);
router.delete('/workers/:id', deleteWorkerByAdmin);

// Attendance Routes
router.get('/workers/:workerId/attendance', getWorkerAttendance);
router.get('/attendance/summary', getAttendanceSummary);
// Analytics Dashboard Routes
router.get('/analytics/report-distribution', getReportDistribution);
router.get('/analytics/supervisor-performance', getSupervisorPerformanceAnalytics);
router.get('/analytics/worker-attendance', getWorkerAttendanceAnalytics);
router.get('/analytics/report-trends', getReportTrends);
router.post('/logout',logout);
export default router;