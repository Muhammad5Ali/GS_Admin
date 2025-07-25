import Report from "../models/Report.js";
import cloudinary from '../lib/cloudinary.js';
import ErrorHandler from "../middleware/error.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import User from "../models/User.js";
import Worker from "../models/Worker.js";

export const resolveReport = catchAsyncError(async (req, res, next) => {
  const { image, latitude, longitude, address } = req.body;
  
  // Validate required fields
  if (!image || !latitude || !longitude || !address) {
    return next(new ErrorHandler("All resolution fields are required", 400));
  }

  const report = await Report.findById(req.params.id);
  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }

  // Upload resolution image to Cloudinary
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const dataUri = `data:image/jpeg;base64,${base64Data}`;
  
  const uploadResponse = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'image',
    folder: 'resolved-reports',
    quality: 'auto:good'
  });

  // Update report with resolution data
  report.resolvedImage = uploadResponse.secure_url;
  report.resolvedPublicId = uploadResponse.public_id;
  report.resolvedLocation = {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)]
  };
  report.resolvedAddress = address;
  report.resolvedBy = req.user._id;
  report.resolvedAt = Date.now();
  report.status = 'resolved';

  await report.save();

  res.status(200).json({
    success: true,
    message: "Report resolved successfully",
    report
  });
});
// Add this new controller
// export const updateReportStatus = catchAsyncError(async (req, res, next) => {
//   const report = await Report.findById(req.params.id);
  
//   if (!report) {
//     return next(new ErrorHandler("Report not found", 404));
//   }

//   const { status } = req.body;
  
//   // Validate allowed status transitions
//   if (status === 'resolved' && report.status !== 'in-progress') {
//     return next(new ErrorHandler("Report must be in progress before resolving", 400));
//   }

//   report.status = status;
//   await report.save();

//   res.status(200).json({
//     success: true,
//     message: `Report status updated to ${status}`,
//     report
//   });
// });
// export const updateReportStatus = catchAsyncError(async (req, res, next) => {
//   const report = await Report.findById(req.params.id);
  
//   if (!report) {
//     return next(new ErrorHandler("Report not found", 404));
//   }

//   const { status } = req.body;
  
//   // Validate allowed status transitions
//   if (status === 'resolved' && report.status !== 'in-progress') {
//     return next(new ErrorHandler("Report must be in progress before resolving", 400));
//   }

//   // Assign report to supervisor when status changes to in-progress
//   if (status === 'in-progress') {
//     report.assignedTo = req.user._id;
//     report.assignedAt = Date.now() // Add assignment timestamp
//     report.assignedMsg = req.body.assignedMsg || "No message provided"; 
//   }

//   report.status = status;
//   await report.save();

//   res.status(200).json({
//     success: true,
//     message: `Report status updated to ${status}`,
//     report
//   });
// });


export const updateReportStatus = catchAsyncError(async (req, res, next) => {
  const report = await Report.findById(req.params.id);
  
  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }

  const { status } = req.body;
  
  // Validate allowed status transitions
  if (status === 'resolved' && report.status !== 'in-progress') {
    return next(new ErrorHandler("Report must be in progress before resolving", 400));
  }

  // Track assignment when status changes to in-progress
  if (status === 'in-progress') {
    report.assignedTo = req.user._id;
    report.assignedAt = Date.now();
    report.assignedMsg = req.body.assignedMsg || "Assigned to supervisor";
  }

  // Track rejection
  if (status === 'rejected') {
    report.rejectedBy = req.user._id;
    report.rejectedAt = Date.now();
  }

  // Track resolution
  if (status === 'resolved') {
    report.resolvedBy = req.user._id;
    report.resolvedAt = Date.now();
  }

  report.status = status;
  await report.save();

  res.status(200).json({
    success: true,
    message: `Report status updated to ${status}`,
    report
  });
});

export const getResolvedReportDetails = catchAsyncError(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .populate('user', 'username profileImage')
    .populate('resolvedBy', 'username profileImage')
    .populate('assignedTo', 'username profileImage');

  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }

  if (report.status !== 'resolved') {
    return next(new ErrorHandler("This report is not resolved", 400));
  }

  res.status(200).json({
    success: true,
    report
  });
});

export const getRejectedReports = catchAsyncError(async (req, res, next) => {
  const supervisorId = req.user._id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const reports = await Report.find({
    resolvedBy: supervisorId,
    status: 'rejected'
  })
    .sort({ rejectedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'username profileImage')
    .populate('rejectedBy', 'username email');

  const total = await Report.countDocuments({
    resolvedBy: supervisorId,
    status: 'rejected'
  });

  res.status(200).json({
    success: true,
    reports,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});

export const getReportDetails = catchAsyncError(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .select('+assignedMsg')
    .populate('user', 'username email profileImage')
    .populate('assignedTo', 'username email profileImage')
    .populate('resolvedBy', 'username email profileImage')
    .populate('rejectedBy', 'username email profileImage')
    .populate('permanentlyResolvedBy', 'username email profileImage')
      .populate('outOfScopeBy', 'username email profileImage');

  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }
  // Ensure rejectionReason exists
  if (!report.rejectionReason) {
    report.rejectionReason = "No reason provided";
  }

  res.status(200).json({
    success: true,
    report
  });
});

// export const markAsOutOfScope = catchAsyncError(async (req, res, next) => {
//   const { reason } = req.body;
//   const report = await Report.findById(req.params.id);
  
//   if (!report) {
//     return next(new ErrorHandler("Report not found", 404));
//   }
  
//   // Validate allowed transitions
//   if (report.status !== 'pending') {
//     return next(new ErrorHandler(
//       "Only pending reports can be marked as out-of-scope", 
//       400
//     ));
//   }
  
//   // Update report
//   report.status = 'out-of-scope';
//   report.outOfScopeReason = reason;
//   report.markedOutOfScopeAt = Date.now();
//   report.markedOutOfScopeBy = req.user._id;
  
//   await report.save();
  
//   res.status(200).json({
//     success: true,
//     message: "Report marked as out of scope",
//     report
//   });
// });


export const markAsOutOfScope = catchAsyncError(async (req, res, next) => {
  const { reason } = req.body;
  const report = await Report.findById(req.params.id);
  
  if (!report) {
    return next(new ErrorHandler("Report not found", 404));
  }
  
  // Only allow marking pending reports
  if (report.status !== 'pending') {
    return next(new ErrorHandler(
      "Only pending reports can be marked as out-of-scope", 
      400
    ));
  }
  
  // Update report fields to match your schema
  report.status = 'out-of-scope';
  report.outOfScopeReason = reason;
  report.outOfScopeAt = Date.now();         // matches schema’s outOfScopeAt
  report.outOfScopeBy = req.user._id;       // matches schema’s outOfScopeBy
  
  await report.save();
  
  res.status(200).json({
    success: true,
    message: "Report marked as out of scope",
    report
  });
});


// export const getSupervisorProfile = catchAsyncError(async (req, res, next) => {
//   const supervisorId = req.user._id;
  
//   // Get supervisor profile
//   const supervisor = await User.findById(supervisorId)
//     .select('-password -tokenVersion -resetPasswordOTP -verificationCode');
  
//   if (!supervisor) {
//     return next(new ErrorHandler("Supervisor not found", 404));
//   }
  
//   // Get reports resolved by this supervisor
//   const resolvedReports = await Report.find({ 
//     resolvedBy: supervisorId,
//     status: 'resolved'
//   })
//     .sort({ resolvedAt: -1 })
//     .limit(10)
//     .populate('user', 'username profileImage');
  
//   // Get rejected reports by this supervisor
//   const rejectedReports = await Report.find({ 
//     resolvedBy: supervisorId,
//     status: 'rejected'
//   })
//     .sort({ rejectedAt: -1 })
//     .limit(10)
//     .populate('user', 'username profileImage');
  
//   // Get in-progress reports by this supervisor
//   const inProgressReports = await Report.find({ 
//     assignedTo: supervisorId,
//     status: 'in-progress'
//   });
  
//   // Calculate stats
//   const totalResolved = await Report.countDocuments({ 
//     resolvedBy: supervisorId,
//     status: 'resolved'
//   });
  
//   const totalRejected = await Report.countDocuments({ 
//     resolvedBy: supervisorId,
//     status: 'rejected'
//   });
  
//   const totalInProgress = inProgressReports.length;
//   const totalHandled = totalResolved + totalRejected;
  
//   // Calculate success rate (considering rejections)
//   const successRate = totalHandled > 0 
//     ? Math.round((totalResolved / totalHandled) * 100) 
//     : 0;

//   // Get worker count
//   const workerCount = await Worker.countDocuments({ supervisor: supervisorId });
  
//   res.status(200).json({
//     success: true,
//     supervisor,
//     resolvedReports,
//     rejectedReports,
//     stats: {
//       resolved: totalResolved,
//       rejected: totalRejected,
//       inProgress: totalInProgress,
//       successRate,
//       workerCount
//     }
//   });
// });

// Updated getSupervisorProfile controller


export const getSupervisorProfile = catchAsyncError(async (req, res, next) => {
  const supervisorId = req.user._id;
  
  const supervisor = await User.findById(supervisorId)
    .select('-password -tokenVersion -resetPasswordOTP -verificationCode');
  
  if (!supervisor) {
    return next(new ErrorHandler("Supervisor not found", 404));
  }
  
  // Get reports resolved by this supervisor
  const resolvedReports = await Report.find({ 
    resolvedBy: supervisorId,
    status: 'resolved'
  })
    .sort({ resolvedAt: -1 })
    .limit(10)
    .populate('user', 'username profileImage');
  
  // Get rejected reports
  const rejectedReports = await Report.find({ 
    resolvedBy: supervisorId,
    status: 'rejected'
  })
    .sort({ rejectedAt: -1 })
    .limit(10)
    .populate('user', 'username profileImage');
  
  // NEW: Get permanent-resolved reports associated with this supervisor
  const permanentResolvedReports = await Report.find({ 
    resolvedBy: supervisorId,  // Key change: use resolvedBy instead of permanentlyResolvedBy
    status: 'permanent-resolved'
  })
    .sort({ permanentlyResolvedAt: -1 })
    .limit(10)
    .populate('user', 'username profileImage');
  
  // Get in-progress reports
  const inProgressReports = await Report.find({ 
    assignedTo: supervisorId,
    status: 'in-progress'
  });
  
  // Calculate stats
  const totalResolved = await Report.countDocuments({ 
    resolvedBy: supervisorId,
    status: 'resolved'
  });
  
  const totalRejected = await Report.countDocuments({ 
    resolvedBy: supervisorId,
    status: 'rejected'
  });
  
  // NEW: Permanent resolved count
  const totalPermanentResolved = await Report.countDocuments({ 
    resolvedBy: supervisorId,  // Key change: use resolvedBy instead of permanentlyResolvedBy
    status: 'permanent-resolved'
  });
  
  const totalInProgress = inProgressReports.length;
  
  // Combine all handled reports for success rate calculation
  const totalHandled = totalResolved + totalRejected + totalPermanentResolved;
  
  // Update success rate calculation
  const successRate = totalHandled > 0 
    ? Math.round(((totalResolved + totalPermanentResolved) / totalHandled) * 100) 
    : 0;

  // Get worker count
  const workerCount = await Worker.countDocuments({ supervisor: supervisorId });
  
  res.status(200).json({
    success: true,
    supervisor,
    resolvedReports,
    rejectedReports,
    permanentResolvedReports, // Include in response
    stats: {
      resolved: totalResolved,
      rejected: totalRejected,
      permanentResolved: totalPermanentResolved, // New stat
      inProgress: totalInProgress,
      successRate,
      workerCount
    }
  });
});


// Make sure this exists
export const getPermanentResolvedReports = catchAsyncError(async (req, res, next) => {
  const supervisorId = req.user._id;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const reports = await Report.find({
    resolvedBy: supervisorId,  // Key change: use resolvedBy instead of permanentlyResolvedBy
    status: 'permanent-resolved'
  })
    .sort({ permanentlyResolvedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('user', 'username profileImage')
    .populate('permanentlyResolvedBy', 'username email');

  const total = await Report.countDocuments({
    resolvedBy: supervisorId,
    status: 'permanent-resolved'
  });

  res.status(200).json({
    success: true,
    reports,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page)
  });
});
