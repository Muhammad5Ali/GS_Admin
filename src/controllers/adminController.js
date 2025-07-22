import mongoose from "mongoose";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";
import moment from 'moment-timezone';

// Get all reports with images and locations
export const getAllReports = catchAsyncError(async (req, res, next) => {
  // ADD 'search' TO THE DESTRUCTURED PARAMETERS
  const { status, type, page = 1, limit = 20, search } = req.query;
  
  const skip = (page - 1) * limit;
  
  // const filter = {};
  // if (status) filter.status = status;
    const filter = {};
  // Add 'rejected' as valid status
  if (status && ['pending', 'in-progress', 'resolved', 'permanent-resolved', 'rejected'].includes(status)) {
    filter.status = status;
  }
  if (type) filter.reportType = type;
  
  // Add search functionality - NOW 'search' IS DEFINED
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'user.username': { $regex: search, $options: 'i' } }
    ];
  }

  const reports = await Report.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'username email')
    .populate('assignedTo', 'username')
    .populate('resolvedBy', 'username')
    .sort({ createdAt: -1 });

  const total = await Report.countDocuments(filter);

  res.status(200).json({
    success: true,
    reports,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

// Get report details with images and geo-data
export const getReportDetails = catchAsyncError(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .populate('user', 'username email profileImage')
    .populate('assignedTo', 'username profileImage')
    .populate('resolvedBy', 'username profileImage')
    .populate('permanentlyResolvedBy', 'username email profileImage');

  if (!report) return next(new ErrorHandler("Report not found", 404));

  res.status(200).json({
    success: true,
    report: {
      ...report._doc,
      userImage: report.user?.profileImage,
      resolvedImage: report.resolvedImage,
      resolvedLocation: report.resolvedLocation,
      userLocation: report.location
    }
  });
});

// Get all supervisors with stats
export const getSupervisors = catchAsyncError(async (req, res, next) => {
  const supervisors = await User.find({ role: 'supervisor' })
    .select('-password -tokenVersion')
    .lean();

  const stats = await Promise.all(supervisors.map(async (sup) => {
    const [reportsResolved, workersCount] = await Promise.all([
      Report.countDocuments({ resolvedBy: sup._id }),
      Worker.countDocuments({ supervisor: sup._id })
    ]);
    return { ...sup, reportsResolved, workersCount };
  }));

  res.status(200).json({ success: true, supervisors: stats });
});




// Get reports overview data (last 7 days)
export const getReportsOverview = catchAsyncError(async (req, res, next) => {
  const timeZone = 'Asia/Karachi';
  const days = 7;
  const startDate = moment().tz(timeZone).subtract(days, 'days').startOf('day');
  const endDate = moment().tz(timeZone).endOf('day');

  const results = await Report.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate()
        }
      }
    },
    {
      $project: {
        date: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: timeZone
          }
        },
        status: 1
      }
    },
    {
      $group: {
        _id: {
          date: "$date",
          status: "$status"
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        data: {
          $push: {
            status: "$_id.status",
            count: "$count"
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Format for frontend
  const formattedData = results.map(day => ({
    date: day._id,
    new: day.data.find(d => d.status === 'pending')?.count || 0,
    inProgress: day.data.find(d => d.status === 'in-progress')?.count || 0,
    resolved: day.data.find(d => d.status === 'resolved')?.count || 0
  }));

  res.status(200).json({ success: true, data: formattedData });
});

// Get user activity data (last 12 hours)

export const getUserActivity = catchAsyncError(async (req, res, next) => {
  const timeZone = 'Asia/Karachi';
  const hours = 12;
  const now = moment().tz(timeZone);
  const startDate = now.clone().subtract(hours - 1, 'hours').startOf('hour');
  
  // Generate all hour buckets including current hour
  const hourBuckets = Array.from({ length: hours }, (_, i) => {
    const hourStart = startDate.clone().add(i, 'hours');
    return {
      hourLabel: hourStart.format("H:00"),
      start: hourStart.toDate(),
      end: hourStart.clone().add(1, 'hour').toDate()
    };
  });

  // Get all reports in the time range
  const reports = await Report.find({
    createdAt: {
      $gte: startDate.toDate(),
      $lte: now.toDate()
    }
  }).select('createdAt user');

  // Process reports into hour buckets
  const results = hourBuckets.map(bucket => {
    const bucketReports = reports.filter(report => {
      const reportTime = moment(report.createdAt).tz(timeZone);
      return reportTime.isBetween(bucket.start, bucket.end, null, '[)');
    });

    const activeUsers = new Set();
    let reportsSubmitted = 0;

    bucketReports.forEach(report => {
      reportsSubmitted++;
      activeUsers.add(report.user.toString());
    });

    return {
      hour: bucket.hourLabel,
      reportsSubmitted,
      activeUsers: activeUsers.size
    };
  });

  res.status(200).json({ success: true, data: results });
});


export const getDashboardStats = catchAsyncError(async (req, res, next) => {
  const [
    totalReports, 
    resolvedReports, 
    totalUsers, 
    totalSupervisors,
    pendingReports,
    rejectedReports,
    permanentResolvedReports,
    outOfScopeReports // New count
  ] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: 'resolved' }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'supervisor' }),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'rejected' }),
    Report.countDocuments({ status: 'permanent-resolved' }),
    Report.countDocuments({ status: 'out-of-scope' }) // New query
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalReports,
      resolvedReports,
      rejectedReports,
      pendingReports,
      permanentResolvedReports,
      outOfScopeReports, // Added to response
      resolutionRate: totalReports 
        ? ((resolvedReports + permanentResolvedReports) / totalReports * 100).toFixed(1) 
        : 0,
      totalUsers,
      totalSupervisors
    }
  });
});

export const getReportStatusCounts = catchAsyncError(async (req, res, next) => {
  const [
    pending,
    inProgress,
    resolved,
    permanentResolved,
    rejected,
    outOfScope // New count
  ] = await Promise.all([
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'in-progress' }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'permanent-resolved' }),
    Report.countDocuments({ status: 'rejected' }),
    Report.countDocuments({ status: 'out-of-scope' }) // New query
  ]);

  // Calculate total including new status
  const total = pending + inProgress + resolved + permanentResolved + rejected + outOfScope;

  res.status(200).json({
    success: true,
    counts: {
      pending,
      inProgress,
      resolved,
      permanentResolved,
      rejected,
      outOfScope, // Added to response
      total
    }
  });
});

export const createSupervisor = catchAsyncError(async (req, res, next) => {
  const { username, email, password } = req.body;
  
  // Validate required fields
  if (!username || !email || !password) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Check for existing verified user
  const existingUser = await User.findOne({ 
    email,
    accountVerified: true
  });

  if (existingUser) {
    return next(new ErrorHandler("Email is already registered", 400));
  }

  // Create supervisor profile
  const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`;
  const user = await User.create({
    username,
    email,
    password,
    profileImage,
    role: 'supervisor',
    accountVerified: true
  });

  res.status(201).json({
    success: true,
    message: 'Supervisor account created successfully',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    }
  });
});
// Add this new function for deleting supervisors
export const deleteSupervisor = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  
  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler('Invalid supervisor ID', 400));
  }
  
  // Find supervisor
  const supervisor = await User.findById(id);
  
  if (!supervisor) {
    return next(new ErrorHandler('Supervisor not found', 404));
  }
  
  // Verify role
  if (supervisor.role !== 'supervisor') {
    return next(new ErrorHandler('User is not a supervisor', 400));
  }
  
  // Check if supervisor has resolved reports
  const hasResolvedReports = await Report.exists({ resolvedBy: id });
  
  if (hasResolvedReports) {
    return next(new ErrorHandler(
      'Cannot delete supervisor with resolved reports. Reassign reports first.',
      400
    ));
  }
  
  // Delete supervisor
  await supervisor.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'Supervisor deleted successfully'
  });
});
// Mark report as permanently resolved with distance check
export const markAsPermanentResolved = catchAsyncError(async (req, res, next) => {
  const reportId = req.params.id;
  const adminId = req.user._id;
  
  const report = await Report.findById(reportId);
  
  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }
  
  // Check if report is in resolved status
  if (report.status !== 'resolved') {
    return next(new ErrorHandler("Report must be resolved first", 400));
  }
  
  // Check if both locations exist
  if (!report.location?.coordinates || !report.resolvedLocation?.coordinates) {
    return next(new ErrorHandler("Location data missing", 400));
  }
  
  // Extract coordinates
  const [lng1, lat1] = report.location.coordinates; // Reported
  const [lng2, lat2] = report.resolvedLocation.coordinates; // Resolved
  
  // Calculate distance in meters
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  
  // Strict 10-meter requirement
  if (distance > 10) {
    return next(new ErrorHandler(
      `Resolved location is ${distance.toFixed(2)} meters away - must be within 10 meters`, 
      400
    ));
  }
  
  // Update report
  report.status = 'permanent-resolved';
  report.distanceToReported = distance; // Store the distance
  report.permanentlyResolvedAt = new Date();
  report.permanentlyResolvedBy = adminId;
  
  await report.save();
  
  res.status(200).json({
    success: true,
    message: "Report permanently resolved",
    distance,
    report
  });
});

// Helper function to calculate distance (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c * 1000; // Convert to meters
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}
// Reject report with reason
export const rejectReport = catchAsyncError(async (req, res, next) => {
  const reportId = req.params.id;
  const adminId = req.user._id;
  const { reason } = req.body;

  const report = await Report.findById(reportId);
  
  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }
  
  if (report.status !== 'resolved') {
    return next(new ErrorHandler("Report must be resolved first", 400));
  }
  
  // Update report
  report.status = 'rejected';
  report.rejectionReason = reason;
  report.rejectedAt = new Date();
  report.rejectedBy = adminId;
  
  await report.save();
  
  res.status(200).json({
    success: true,
    message: "Report rejected",
    report
  });
});

// Helper to populate report details
export const populateReportDetails = (report) => {
  return report
    .populate('user', 'username email profileImage')
    .populate('assignedTo', 'username profileImage')
    .populate('resolvedBy', 'username profileImage')
    .populate('rejectedBy', 'username email profileImage')
    .populate('permanentlyResolvedBy', 'username email profileImage');
};