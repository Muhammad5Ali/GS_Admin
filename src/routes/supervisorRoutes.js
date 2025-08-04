import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import { catchAsyncError } from '../middleware/catchAsyncError.js';
import { resolveReport,updateReportStatus,getResolvedReportDetails,getRejectedReports,
getReportDetails,markAsOutOfScope,getSupervisorProfile,getPermanentResolvedReports } from "../controllers/supervisorController.js";


const router = express.Router();

// Middleware to check supervisor role
export const isSupervisor = (req, res, next) => {
  if (req.user.role !== 'supervisor') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Get pending reports
router.get('/reports/pending', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profileImage');

    const totalPending = await Report.countDocuments({ status: 'pending' });

    res.json({
      reports,
      currentPage: page,
      totalPending,
      totalPages: Math.ceil(totalPending / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Get in-progress reports
router.get('/reports/in-progress', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ status: 'in-progress' })
      .sort({ updatedAt: -1 }) // Sort by most recently updated
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'username profileImage')
      .populate('user', 'username profileImage')
       .select('+assignedMsg'); 

    const totalInProgress = await Report.countDocuments({ status: 'in-progress' });

    res.json({
      reports,
      currentPage: page,
      totalInProgress,
      totalPages: Math.ceil(totalInProgress / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
// Get resolved reports
router.get('/reports/resolved', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ status: 'resolved' })
      .sort({ resolvedAt: -1 }) // Sort by resolution date
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profileImage')
      .populate('resolvedBy', 'username');

    const totalResolved = await Report.countDocuments({ status: 'resolved' });

    res.json({
      reports,
      currentPage: page,
      totalResolved,
      totalPages: Math.ceil(totalResolved / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/reports/:id/status', 
  isAuthenticated, 
  isSupervisor, 
  updateReportStatus
);

router.put('/reports/:id/resolve', isAuthenticated, isSupervisor, resolveReport);
router.get('/reports/resolved/:id', 
  isAuthenticated, 
  isSupervisor, 
  getResolvedReportDetails
);

router.get('/profile', 
  isAuthenticated, 
  isSupervisor, 
  getSupervisorProfile  
);


router.get('/reports/rejected', 
  isAuthenticated, 
  isSupervisor, 
  getRejectedReports
);
router.get('/reports/permanent-resolved', 
  isAuthenticated, 
  isSupervisor, 
  getPermanentResolvedReports
);

router.get('/reports/out-of-scope', 
  isAuthenticated, 
  isSupervisor, 
  catchAsyncError(async (req, res) => {
    const supervisorId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reports = await Report.find({
      status: 'out-of-scope',
      outOfScopeBy: supervisorId
    })
      .sort({ outOfScopeAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username profileImage')
      .populate('outOfScopeBy', 'username');

    const total = await Report.countDocuments({
      status: 'out-of-scope',
      outOfScopeBy: supervisorId
    });

    res.status(200).json({
      success: true,
      reports,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  })
);
// Get any report details (including rejected)
router.get('/reports/:id', 
  isAuthenticated, 
  isSupervisor, 
  getReportDetails
);
router.put(
  '/reports/:id/out-of-scope', 
  isAuthenticated, 
  isSupervisor, 
  markAsOutOfScope
);

export default router;