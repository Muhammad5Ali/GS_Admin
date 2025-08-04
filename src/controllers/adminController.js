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
    const filter = {};
  // Add 'rejected' as valid status
  if (status && ['pending', 'in-progress', 'resolved', 'permanent-resolved', 'rejected','out-of-scope'].includes(status)) {
    filter.status = status;
  }
  if (type) filter.reportType = type;  
  // Add search functionality - NOW 'search' IS DEFINED
if (search) {
  filter.$or = [
    { title: { $regex: search, $options: 'i' } },
    { details: { $regex: search, $options: 'i' } }, // Changed from 'description' to 'details'
    { 'user.username': { $regex: search, $options: 'i' } },
    { address: { $regex: search, $options: 'i' } } // Added address search
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
// Get all regular users (admin only)
export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find({ role: 'user' })  // Add role filter
    .select('username profileImage createdAt')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users
  });
});

// Get report details with images and geo-data
export const getReportDetails = catchAsyncError(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .populate('user', 'username email profileImage')
    .populate('assignedTo', 'username profileImage')
      .populate('assignedBy', 'username profileImage')
    .populate('resolvedBy', 'username profileImage')
    .populate('permanentlyResolvedBy', 'username email profileImage')
     .populate('outOfScopeBy', 'username email profileImage');

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
// Update getSupervisors
export const getSupervisors = catchAsyncError(async (req, res, next) => {
  const supervisors = await User.find({ role: 'supervisor' })
    .select('-password -tokenVersion')
    .lean();

  const stats = await Promise.all(supervisors.map(async (sup) => {
    const [resolved, permanentResolved, rejected, outOfScope, workersCount] = await Promise.all([
      Report.countDocuments({ resolvedBy: sup._id, status: 'resolved' }),
      Report.countDocuments({ resolvedBy: sup._id, status: 'permanent-resolved' }),
      Report.countDocuments({ resolvedBy: sup._id, status: 'rejected' }),
      Report.countDocuments({ resolvedBy: sup._id, status: 'out-of-scope' }),
      Worker.countDocuments({ supervisor: sup._id })
    ]);
    
    // Calculate performance rating
    const totalHandled = resolved + rejected + permanentResolved + outOfScope;
    const successRate = totalHandled > 0 
      ? Math.round((resolved + permanentResolved) / totalHandled * 100) 
      : 0;
    
    let performance;
    if (successRate >= 90) performance = "Excellent";
    else if (successRate >= 75) performance = "Good";
    else if (successRate >= 50) performance = "Average";
    else performance = "Needs Improvement";
    
    return { 
      ...sup, 
      resolvedReports: resolved,
      permanentResolvedReports: permanentResolved,
      rejectedReports: rejected,
      outOfScopeReports: outOfScope,
      workersCount,
      performance,
      successRate
    };
  }));

  res.status(200).json({ success: true, supervisors: stats });
});
export const getSupervisorPerformance = catchAsyncError(async (req, res, next) => {
  const supervisorId = req.params.id;
  
  const [
    inProgress,
    resolved,
    rejected,
    permanentResolved,
    workersCount,
    outOfScope
  ] = await Promise.all([
    Report.countDocuments({ assignedTo: supervisorId, status: 'in-progress' }),
    Report.countDocuments({ resolvedBy: supervisorId, status: 'resolved' }),
    Report.countDocuments({ resolvedBy: supervisorId, status: 'rejected' }),
    Report.countDocuments({ resolvedBy: supervisorId, status: 'permanent-resolved' }),
    Worker.countDocuments({ supervisor: supervisorId }),
    Report.countDocuments({ resolvedBy: supervisorId, status: 'out-of-scope' }) 
  ]);
  // Enhanced performance calculation
  const totalHandled = resolved + rejected + permanentResolved + outOfScope;
  const successRate = totalHandled > 0 
    ? Math.round((resolved + permanentResolved) / totalHandled * 100) 
    : 0;
  
  let performance;
  if (successRate >= 90) performance = "Excellent";
  else if (successRate >= 75) performance = "Good";
  else if (successRate >= 50) performance = "Average";
  else performance = "Needs Improvement";

  res.status(200).json({
    success: true,
    stats: { 
      inProgress, 
      resolved, 
      rejected, 
      permanentResolved, 
      workersCount,
      outOfScope,
      successRate
    },
    performance
  });
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
    resolved: day.data.find(d => d.status === 'resolved')?.count || 0,
    permanentResolved: day.data.find(d => d.status === 'permanent-resolved')?.count || 0,
    rejected: day.data.find(d => d.status === 'rejected')?.count || 0,
    outOfScope: day.data.find(d => d.status === 'out-of-scope')?.count || 0
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
    outOfScopeReports,
    inProgressReports  // NEW: Add this
  ] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: 'resolved' }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'supervisor' }),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'rejected' }),
    Report.countDocuments({ status: 'permanent-resolved' }),
    Report.countDocuments({ status: 'out-of-scope' }),
    Report.countDocuments({ status: 'in-progress' })  // NEW: Add this
  ]);
res.status(200).json({
    success: true,
    stats: {
      totalReports,
      resolvedReports,
      rejectedReports,
      pendingReports,
      permanentResolvedReports,
      outOfScopeReports,
      inProgressReports,  // NEW: Add this
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
    outOfScope
  ] = await Promise.all([
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'in-progress' }),
    Report.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'permanent-resolved' }),
    Report.countDocuments({ status: 'rejected' }),
    Report.countDocuments({ status: 'out-of-scope' }) 
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
//function for deleting supervisors
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

export const assignReportsToSupervisor = catchAsyncError(async (req, res, next) => {
  const { supervisorId, reportIds, assignmentMessage } = req.body;
  const adminId = req.user._id;
  // Validate inputs
 if (
  !supervisorId ||
  !reportIds ||
  !Array.isArray(reportIds)
) {
  return next(
    new ErrorHandler("Supervisor ID and report IDs are required", 400)
  );
}
  // Verify supervisor exists
  const supervisor = await User.findOne({
    _id: supervisorId,
    role: 'supervisor'
  });
  if (!supervisor) {
    return next(new ErrorHandler("Invalid supervisor ID", 404));
  }
  // Process each report assignment
  const results = [];
  for (const reportId of reportIds) {
    // Check report exists and is pending
    const report = await Report.findById(reportId);
    if (!report) {
      results.push({ reportId, status: 'failed', message: 'Report not found' });
      continue;
    }
    if (report.status !== 'pending') {
      results.push({ reportId, status: 'failed', message: 'Only pending reports can be assigned' });
      continue;
    }
    // Update report
    report.status = 'in-progress';
    report.assignedTo = supervisorId;
    report.assignedBy = adminId;
    report.assignedAt = new Date();
    report.assignedMsg = assignmentMessage || "Assigned by admin";
    await report.save();
    results.push({ reportId, status: 'success' });
  }
  res.status(200).json({
    success: true,
    message: "Reports assignment processed",
    results
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

// Worker Management Controllers
export const getAllWorkers = catchAsyncError(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (page - 1) * limit;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { area: { $regex: search, $options: 'i' } }
    ];
  }
  const workers = await Worker.find(filter)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('supervisor', 'username email profileImage')
    .sort({ createdAt: -1 });
  const total = await Worker.countDocuments(filter);
  res.status(200).json({
    success: true,
    workers,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

export const addWorkerByAdmin = catchAsyncError(async (req, res, next) => {
  const { name, phone, area, supervisorId } = req.body;
  if (!name || !phone || !area || !supervisorId) {
    return next(new ErrorHandler("All fields are required", 400));
  }
  // Validate supervisor
  const supervisor = await User.findOne({
    _id: supervisorId,
    role: 'supervisor'
  });
  if (!supervisor) {
    return next(new ErrorHandler("Invalid supervisor ID", 404));
  }
  const worker = await Worker.create({
    name,
    phone,
    area,
    supervisor: supervisorId
  });
  res.status(201).json({
    success: true,
    message: 'Worker created successfully',
    worker
  });
});

export const deleteWorkerByAdmin = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const worker = await Worker.findById(id);
  if (!worker) {
    return next(new ErrorHandler("Worker not found", 404));
  }
  // Delete related attendance records
  await Attendance.deleteMany({ worker: id });
  await worker.deleteOne();
  res.status(200).json({
    success: true,
    message: 'Worker and related attendance records deleted'
  });
});
// Attendance Controllers
export const getWorkerAttendance = catchAsyncError(async (req, res, next) => {
  const { workerId } = req.params;
  const { startDate, endDate } = req.query;
  const worker = await Worker.findById(workerId);
  if (!worker) {
    return next(new ErrorHandler("Worker not found", 404));
  }
  let filter = { worker: workerId };
  if (startDate && endDate) {
    const start = moment.tz(startDate, 'Asia/Karachi').startOf('day').toDate();
    const end = moment.tz(endDate, 'Asia/Karachi').endOf('day').toDate();
    filter.date = { $gte: start, $lte: end };
  }
  const attendance = await Attendance.find(filter)
    .populate('supervisor', 'username')
    .sort({ date: -1 });
  res.status(200).json({
    success: true,
    attendance
  });
});
export const getAttendanceSummary = catchAsyncError(async (req, res, next) => {
  const { date } = req.query;
  if (!date) {
    return next(new ErrorHandler("Date is required", 400));
  }
  // Convert to Pakistan time
  const startDate = moment.tz(date, 'Asia/Karachi').startOf('day').toDate();
  const endDate = moment(startDate).tz('Asia/Karachi').add(1, 'day').toDate();
  const attendance = await Attendance.find({
    date: { 
      $gte: startDate,
      $lt: endDate
    }
  })
  .populate('worker', 'name phone area')
  .populate('supervisor', 'username');
  res.status(200).json({
    success: true,
    date: startDate,
    attendance
  });
});
// Report Status Distribution (Pie Chart Data)
export const getReportDistribution = catchAsyncError(async (req, res, next) => {
  const distribution = await Report.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        status: "$_id",
        count: 1,
        _id: 0
      }
    }
  ]);
  res.status(200).json({
    success: true,
    distribution
  });
});
export const getSupervisorPerformanceAnalytics = catchAsyncError(async (req, res, next) => {
  const supervisors = await User.find({ role: 'supervisor' });
  const performanceData = await Promise.all(
    supervisors.map(async (supervisor) => {
      // 1) Aggregate counts for statuses that have resolvedBy
      const reports = await Report.aggregate([
        { $match: { resolvedBy: supervisor._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      const resolved  = reports.find(r => r._id === 'resolved')?.count  || 0;
      const permanent = reports.find(r => r._id === 'permanent-resolved')?.count || 0;
      const rejected  = reports.find(r => r._id === 'rejected')?.count  || 0;
      const outOfScope= reports.find(r => r._id === 'out-of-scope')?.count  || 0;
      // 2) Separately count in-progress *assignments*
      const inProgress = await Report.countDocuments({
        assignedTo: supervisor._id,
        status: 'in-progress'
      });
      // 3) Compute success rate (only counts those that went through resolve/permanent vs rejected/out-of-scope)
      const handledTotal = resolved + permanent + rejected + outOfScope;
      const successRate = handledTotal > 0
        ? Math.round((resolved + permanent) / handledTotal * 100)
        : 0;
      return {
        supervisor: supervisor.username,
        profileImage: supervisor.profileImage,
        inProgress,
        resolved,
        permanentResolved: permanent,
        rejected,
        outOfScope,
        successRate
      };
    })
  );
  res.status(200).json({
    success: true,
    performanceData
  });
});
// Worker Attendance Analytics
export const getWorkerAttendanceAnalytics = catchAsyncError(async (req, res, next) => {
  const thirtyDaysAgo = moment().tz('Asia/Karachi').subtract(30, 'days').toDate();
  const attendance = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+05:00" } },
          status: "$status"
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        attendance: {
          $push: {
            status: "$_id.status",
            count: "$count"
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  const formatted = attendance.map(day => ({
    date: day._id,
    present: day.attendance.find(a => a.status === 'present')?.count || 0,
    absent: day.attendance.find(a => a.status === 'absent')?.count || 0,
    onLeave: day.attendance.find(a => a.status === 'on-leave')?.count || 0
  }));
  res.status(200).json({
    success: true,
    attendanceTrends: formatted
  });
});
// Report Trends Over Time
export const getReportTrends = catchAsyncError(async (req, res, next) => {
  const timeZone = 'Asia/Karachi';
  const days = 30;
  const startDate = moment().tz(timeZone).subtract(days, 'days').startOf('day');
  const endDate = moment().tz(timeZone).endOf('day');
  const trends = await Report.aggregate([
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
        _id: "$date",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  // Fill in missing days with 0 counts
  const allDays = {};
  for (let i = 0; i < days; i++) {
    const date = moment(startDate).add(i, 'days').format('YYYY-MM-DD');
    allDays[date] = { date, count: 0 };
  }
  trends.forEach(day => {
    allDays[day._id] = { date: day._id, count: day.count };
  });
  const result = Object.values(allDays);
  res.status(200).json({
    success: true,
    reportTrends: result
  });
});