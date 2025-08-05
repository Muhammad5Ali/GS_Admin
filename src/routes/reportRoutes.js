// routes/reportRoutes.js
import express from 'express';
import Report from "../models/Report.js";
import User from "../models/User.js";
import cloudinary from '../lib/cloudinary.js';
import { isAuthenticated } from "../middleware/auth.js";
import classifyImage from '../services/classificationService.js';

const router = express.Router();

// Constants for confidence thresholds
const MIN_CONFIDENCE_WASTE = 0.65;     // Minimum confidence for waste classification
const MIN_CONFIDENCE_NON_WASTE = 0.75;  // Minimum confidence for non-waste classification

// Add request logging middleware
router.use((req, res, next) => {
  console.log(`Incoming ${req.method} to ${req.path}`);
  next();
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const {
      title,
      image,
      details,
      address,
      latitude,
      longitude,
      photoTimestamp,
      reportType,
    } = req.body;

    // Server-side validation
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    
    // Size validation using base64 string
    if (Buffer.byteLength(base64Data, 'base64') > 5 * 1024 * 1024) {
      return res.status(413).json({ 
        message: 'Image too large (max 5MB)',
        code: 'IMAGE_TOO_LARGE'
      });
    }

    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!image) missingFields.push('image');
    if (!details) missingFields.push('details');
    if (!address) missingFields.push('address');
    if (latitude === undefined || longitude === undefined) {
      missingFields.push('location');
    } else {
      // Validate coordinate format and range
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
          message: 'Invalid coordinates',
          code: 'INVALID_COORDINATES'
        });
      }
      
      // Validate coordinate ranges
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          message: 'Coordinates out of valid range',
          code: 'INVALID_COORDINATES_RANGE',
          details: {
            validLatitudeRange: '[-90, 90]',
            validLongitudeRange: '[-180, 180]',
            received: { latitude: lat, longitude: lon }
          }
        });
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        missingFields
      });
    }

    // Base64 validation
    if (!/^(data:image\/\w+;base64,)?[A-Za-z0-9+/=]+$/.test(image)) {
      return res.status(400).json({
        message: 'Invalid image format',
        code: 'INVALID_IMAGE_FORMAT'
      });
    }

  let classification;
try {
  classification = await classifyImage(image);
  
  const minConfidence = classification.isWaste 
    ? MIN_CONFIDENCE_WASTE 
    : MIN_CONFIDENCE_NON_WASTE;
  
  if (!classification.isWaste && classification.confidence >= minConfidence) {
    return res.status(400).json({
      message: 'Image does not show recognizable waste',
      classification,
      code: 'NOT_WASTE'
    });
  }
  
  if (classification.confidence < minConfidence) {
    return res.status(400).json({
      message: 'Low confidence in waste detection',
      classification,
      code: 'LOW_CONFIDENCE'
    });
  }
} catch (error) {
  console.error('Classification Error:', error);
  return res.status(503).json({
    message: 'Waste verification service unavailable',
    code: 'SERVICE_UNAVAILABLE',
    error: error.message
  });
}

    // Cloudinary upload with timeout - USING DATA URI
    let uploadResponse;
    try {
      const dataUri = `data:image/jpeg;base64,${base64Data}`;
      const cloudinaryPromise = cloudinary.uploader.upload(
        dataUri,
        {
          resource_type: 'image',
          folder: 'reports',
          quality: 'auto',
          format: 'jpg',
          transformation: [{ width: 800, crop: 'limit' }, { quality: 'auto:good' }]
        }
      );
      
      const uploadTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('CLOUDINARY_TIMEOUT')), 15000)
      );
      uploadResponse = await Promise.race([cloudinaryPromise, uploadTimeout]);
    } catch (uploadError) {
      console.error('Cloudinary Upload Error:', uploadError);
      if (uploadError.message === 'CLOUDINARY_TIMEOUT') {
        return res.status(504).json({
          message: 'Image upload timed out',
          code: 'CLOUDINARY_TIMEOUT'
        });
      }
      return res.status(500).json({
        message: 'Image upload failed',
        error: uploadError.message,
        code: 'CLOUDINARY_ERROR'
      });
    }

    // Create report in DB
    const finalReportType = reportType || 'standard';
    const newReport = new Report({
      title: title.trim(),
      image: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      details: details.trim(),
      address: address.trim(),
      reportType: finalReportType,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      photoTimestamp: photoTimestamp ? new Date(photoTimestamp) : new Date(),
      user: req.user._id
    });
    const savedReport = await newReport.save();

    // Update user points
    const pointsMap = { standard: 10, hazardous: 20, large: 15 };
    const pointsToAdd = pointsMap[finalReportType] || 10;
    try {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { reportCount: 1, points: pointsToAdd }
      });
    } catch (updateError) {
      console.error('User update error:', updateError);
    }

    res.status(201).json({
      message: 'Report created successfully',
      report: savedReport,
      pointsEarned: pointsToAdd
    });
  } catch (error) {
    console.error('Report Creation Error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation Error',
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
    res.status(500).json({
      message: 'Internal server error',
      error: error.message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Test classification route
router.get('/test-classify', async (req, res) => {
  try {
    const sampleBase64 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const result = await classifyImage(sampleBase64);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pagination => infinite loading
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;
    const reports = await Report.find().sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profileImage");

    const totalReports = await Report.countDocuments();

    res.send({  
      reports,
      currentPage: page,
      totalReports,
      totalPages: Math.ceil(totalReports / limit),
    });
  } catch (error) {
    console.log("Error in getting reports:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get reports that are being reported by the logged in user 
router.get("/user", isAuthenticated, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "username profileImage");
    res.json(reports);
  } catch (error) {
    console.log("Error in getting user reports:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Find the user who created the report
    const user = await User.findById(report.user);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate points to deduct
    const pointsMap = { standard: 10, hazardous: 20, large: 15 };
    const pointsToDeduct = pointsMap[report.reportType] || 10;

    // Update user counts and points
    user.reportCount = Math.max(0, user.reportCount - 1);
    user.points = Math.max(0, user.points - pointsToDeduct);
    
    await user.save();

    // Delete the report and cloudinary image
    if (report.publicId) {
      await cloudinary.uploader.destroy(report.publicId);
    }
    
    await report.deleteOne();
    res.json({ message: "Report deleted successfully" });
    
  } catch (error) {
    console.error("Delete Report Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('user', 'username profileImage')
      .populate('assignedTo', 'username email profileImage')
      .populate('assignedBy', 'username profileImage')
      .populate('resolvedBy', 'username email profileImage')
      .populate('permanentlyResolvedBy', 'username email profileImage')
      .populate('rejectedBy', 'username email profileImage')
      .populate('outOfScopeBy', 'username email profileImage');

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Verify report ownership
    if (report.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;