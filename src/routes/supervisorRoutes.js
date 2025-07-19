import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import { resolveReport,updateReportStatus,getResolvedReportDetails } from "../controllers/supervisorController.js";
import NodeCache from 'node-cache';

const router = express.Router();
// Create cache instance (1 minute TTL)
const statsCache = new NodeCache({ stdTTL: 60 });

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
// Add this new route
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
    
//     res.json({
//       success: true,
//       supervisor,
//       resolvedReports
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });
// Updated profile route with real stats
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
    
//     // Calculate success rate (avoid division by zero)
//     const successRate = totalHandled > 0 
//       ? Math.round((totalResolved / totalHandled) * 100) 
//       : 0;
    
//     res.json({
//       success: true,
//       supervisor,
//       resolvedReports,
//       stats: {
//         resolved: totalResolved,
//         inProgress: totalInProgress,
//         successRate
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });
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
    
//     // Get in-progress reports by this supervisor - FIXED
//     const inProgressReports = await Report.find({ 
//       assignedTo: supervisorId, // Changed to assignedTo
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
    
//     res.json({
//       success: true,
//       supervisor,
//       resolvedReports,
//       stats: {
//         resolved: totalResolved,
//         inProgress: totalInProgress,
//         successRate
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });
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
// Supervisor profile with caching and enhanced stats
router.get('/profile', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const supervisorId = req.user._id.toString();
    
    // Check cache first
    const cached = statsCache.get(supervisorId);
    if (cached) {
      return res.json(cached);
    }
    
    // Get supervisor profile
    const supervisor = await User.findById(supervisorId)
      .select('-password -tokenVersion -resetPasswordOTP -verificationCode');
    
    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' });
    }
    
    // Parallel fetching for better performance
    const [
      resolvedReports,
      inProgressReports,
      resolvedCount,
      workerCount
    ] = await Promise.all([
      // Recently resolved reports
      Report.find({ 
        resolvedBy: supervisorId,
        status: 'resolved'
      })
        .sort({ resolvedAt: -1 })
        .limit(10)
        .populate('user', 'username profileImage'),
      
      // In-progress reports
      Report.find({ 
        assignedTo: supervisorId,
        status: 'in-progress'
      }),
      
      // Count of resolved reports
      Report.countDocuments({ 
        resolvedBy: supervisorId,
        status: 'resolved'
      }),
      
      // Worker count
      Worker.countDocuments({ supervisor: supervisorId })
    ]);
    
    // Calculate stats
    const totalInProgress = inProgressReports.length;
    const totalHandled = resolvedCount + totalInProgress;
    const successRate = totalHandled > 0 
      ? Math.round((resolvedCount / totalHandled) * 100) 
      : 0;
    
    // Weekly resolution stats
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyStats = await Report.aggregate([
      {
        $match: {
          resolvedBy: supervisorId,
          status: 'resolved',
          resolvedAt: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$resolvedAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    
    // Format day names for frontend
    const dayMap = {
      1: 'Sunday',
      2: 'Monday',
      3: 'Tuesday',
      4: 'Wednesday',
      5: 'Thursday',
      6: 'Friday',
      7: 'Saturday'
    };
    
    const formattedWeeklyStats = weeklyStats.map(stat => ({
      day: dayMap[stat._id] || `Day ${stat._id}`,
      count: stat.count
    }));
    
    // Prepare response
    const response = {
      success: true,
      supervisor,
      resolvedReports,
      stats: {
        resolved: resolvedCount,
        inProgress: totalInProgress,
        successRate,
        workerCount,
        weeklyStats: formattedWeeklyStats
      }
    };
    
    // Cache the response
    statsCache.set(supervisorId, response);
    
    res.json(response);
  } catch (error) {
    console.error('Supervisor profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});
export default router;