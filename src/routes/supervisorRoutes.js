import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import { resolveReport,updateReportStatus,getResolvedReportDetails,getRejectedReports,getReportDetails,markAsOutOfScope } from "../controllers/supervisorController.js";


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
      .populate('user', 'username profileImage');

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

// Update report status
// router.put('/reports/:id/status', isAuthenticated, isSupervisor, async (req, res) => {
//   try {
//     const { status } = req.body;
    
//     if (status === 'resolved') {
//       return res.status(400).json({ 
//         message: 'Use the resolve endpoint to resolve reports' 
//       });
//     }
    
//     const report = await Report.findByIdAndUpdate(
//       req.params.id,
//       { status },
//       { new: true }
//     );
//     res.json(report);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// Update the status route
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

// router.get('/profile', isAuthenticated, isSupervisor, async (req, res) => {
//   try {
//     const supervisorId = req.user._id;
    
//     // Get supervisor profile
//     const supervisor = await User.findById(supervisorId)
//       .select('-password -tokenVersion -resetPasswordOTP -verificationCode');
    
//     if (!supervisor) {
//       return res.status(404).json({ message: 'Supervisor not found' });
//     }
    
//     // Get reports resolved by this supervisor
//     const resolvedReports = await Report.find({ 
//       resolvedBy: supervisorId,
//       status: 'resolved'
//     })
//       .sort({ resolvedAt: -1 })
//       .limit(10)
//       .populate('user', 'username profileImage');
    
//     // Get in-progress reports by this supervisor
//     const inProgressReports = await Report.find({ 
//       assignedTo: supervisorId,
//       status: 'in-progress'
//     });
    
//     // Calculate stats
//     const totalResolved = await Report.countDocuments({ 
//       resolvedBy: supervisorId,
//       status: 'resolved'
//     });
    
//     const totalInProgress = inProgressReports.length;
//     const totalHandled = totalResolved + totalInProgress;
    
//     // Calculate success rate
//     const successRate = totalHandled > 0 
//       ? Math.round((totalResolved / totalHandled) * 100) 
//       : 0;

//     // NEW: Get worker count
//     const workerCount = await Worker.countDocuments({ supervisor: supervisorId });
    
//     res.json({
//       success: true,
//       supervisor,
//       resolvedReports,
//       stats: {
//         resolved: totalResolved,
//         inProgress: totalInProgress,
//         successRate,
//         workerCount  // Add worker count to stats
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });


// Get rejected reports for supervisor


// Updated profile route with rejected reports



router.get('/profile', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const supervisorId = req.user._id;
    
    // Get supervisor profile
    const supervisor = await User.findById(supervisorId)
      .select('-password -tokenVersion -resetPasswordOTP -verificationCode');
    
    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }
    
    // Get reports resolved by this supervisor
    const resolvedReports = await Report.find({ 
      resolvedBy: supervisorId,
      status: 'resolved'
    })
      .sort({ resolvedAt: -1 })
      .limit(10)
      .populate('user', 'username profileImage');
    
    // NEW: Get rejected reports by this supervisor
    const rejectedReports = await Report.find({ 
      resolvedBy: supervisorId,
      status: 'rejected'
    })
      .sort({ rejectedAt: -1 })
      .limit(10)
      .populate('user', 'username profileImage');
    
    // Get in-progress reports by this supervisor
    const inProgressReports = await Report.find({ 
      assignedTo: supervisorId,
      status: 'in-progress'
    });
    
    // Calculate stats
    const totalResolved = await Report.countDocuments({ 
      resolvedBy: supervisorId,
      status: 'resolved'
    });
    
    // NEW: Add rejected count
    const totalRejected = await Report.countDocuments({ 
      resolvedBy: supervisorId,
      status: 'rejected'
    });
    
    const totalInProgress = inProgressReports.length;
    const totalHandled = totalResolved + totalInProgress;
    
    // Calculate success rate
    const successRate = totalHandled > 0 
      ? Math.round((totalResolved / totalHandled) * 100) 
      : 0;

    // Get worker count
    const workerCount = await Worker.countDocuments({ supervisor: supervisorId });
    
    res.json({
      success: true,
      supervisor,
      resolvedReports,
      rejectedReports, // NEW: Add rejected reports
      stats: {
        resolved: totalResolved,
        rejected: totalRejected, // NEW: Add rejected count
        inProgress: totalInProgress,
        successRate,
        workerCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/reports/rejected', 
  isAuthenticated, 
  isSupervisor, 
  getRejectedReports
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