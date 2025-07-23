import Report from "../models/Report.js";
import cloudinary from '../lib/cloudinary.js';
import ErrorHandler from "../middleware/error.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";

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

  // Assign report to supervisor when status changes to in-progress
  if (status === 'in-progress') {
    report.assignedTo = req.user._id;
    report.assignedAt = Date.now() // Add assignment timestamp
    report.assignedMsg = req.body.message; 
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