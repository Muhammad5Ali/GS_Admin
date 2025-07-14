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

  report.status = status;
  await report.save();

  res.status(200).json({
    success: true,
    message: `Report status updated to ${status}`,
    report
  });
});