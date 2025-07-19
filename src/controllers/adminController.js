import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Worker from "../models/Worker.js";
import Attendance from "../models/Attendance.js";

// Get all reports with images and locations
export const getAllReports = catchAsyncError(async (req, res, next) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.reportType = type;

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
    .populate('resolvedBy', 'username profileImage');

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

// Get dashboard stats
export const getDashboardStats = catchAsyncError(async (req, res, next) => {
  const [totalReports, resolvedReports, totalUsers, totalSupervisors] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: 'resolved' }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'supervisor' })
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalReports,
      resolvedReports,
      resolutionRate: totalReports ? (resolvedReports / totalReports * 100).toFixed(1) : 0,
      totalUsers,
      totalSupervisors
    }
  });
});