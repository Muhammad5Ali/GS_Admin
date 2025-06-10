// routes/reportRoutes.js
import express from 'express';
import Report from "../models/Report.js";
import User from "../models/User.js";
import cloudinary from '../lib/cloudinary.js';
import protectRoute from '../middleware/auth.middleware.js';
import classifyImage from '../services/classificationService.js';

const router = express.Router();

// Add request logging middleware
router.use((req, res, next) => {
  console.log(`Incoming ${req.method} to ${req.path}`);
  next();
});

router.post('/', protectRoute, async (req, res) => {
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
      forceSubmit
    } = req.body;

    // Server-side validation
    if (image && image.length > 5 * 1024 * 1024) {
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
    if (!latitude || !longitude) missingFields.push('location');

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        missingFields
      });
    }

    // Base64 validation
   if (!/^(data:image\/\w+;base64,)?[A-Za-z0-9+/=]+$/.test(image)) { // ✅ Allow prefix {
      return res.status(400).json({
        message: 'Invalid image format',
        code: 'INVALID_IMAGE_FORMAT'
      });
    }

    let classification;
    // Only run AI check if user hasn't forced the submit
    if (!forceSubmit) {
      try {
       const classification = await classifyImage(imageBase64);

        // Reject if not waste or low confidence
       if (!classification.isWaste || classification.confidence < 0.7) {
  const code = !classification.isWaste ? 'NOT_WASTE' : 'LOW_CONFIDENCE';
  const message = !classification.isWaste 
    ? 'Image does not show recognizable waste'
    : 'Low confidence in waste detection';
    
  return res.status(400).json({
    message,
    classification,
    code
  });
}
      } catch (error) {
        console.error('Classification Error:', error.message);
        if (error.message.includes('HF_API_ERROR')) {
          return res.status(503).json({
            message: 'AI service unavailable',
            code: 'SERVICE_UNAVAILABLE'
          });
        }

        if (error.message.includes('Failed to fetch')) {
          return res.status(502).json({
            message: 'Network error connecting to AI service',
            code: 'NETWORK_ERROR'
          });
        }

        const errorCode = error.message.split(':')[0];
        switch (errorCode) {
          case 'MODEL_LOADING':
            return res.status(503).json({
              message:
                'Our AI model is warming up. Please try again in 20 seconds.',
              code: 'MODEL_LOADING'
            });
          case 'TIMEOUT':
            return res.status(504).json({
              message: 'Image verification timed out. Please try again.',
              code: 'TIMEOUT'
            });
          case 'UNAUTHORIZED':
            return res.status(401).json({
              message: 'Authentication failed with AI service',
              code: 'HF_UNAUTHORIZED'
            });
          default:
            return res.status(502).json({
              message: 'Image verification service error',
              code: 'SERVICE_UNAVAILABLE',
              error: error.message
            });
        }
      }
    }

    // Cloudinary upload with timeout
    let uploadResponse;
    try {
      const cloudinaryPromise = cloudinary.uploader.upload(
        `data:image/jpeg;base64,${image}`,
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


// Add this temporary route to test classification
// routes/reportRoutes.js
// In routes/reportRoutes.js
router.get('/test-classify', async (req, res) => {
  try {
    const sampleBase64 = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // Test image
    const result = await classifyImage(sampleBase64); // ✅ Should return classification
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
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
router.get("/user", protectRoute, async (req, res) => {
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

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (report.publicId) {
      try {
        await cloudinary.uploader.destroy(report.publicId);
      } catch (deleteError) {
        console.error("Cloudinary deletion error:", deleteError);
      }
    }

    const pointsMap = {
      standard: 10,
      hazardous: 20,
      large: 15
    };
    
    const pointsToDeduct = report.reportType 
      ? pointsMap[report.reportType] || 10 
      : 10;

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 
        reportCount: -1, 
        points: -pointsToDeduct 
      }
    });

    await report.deleteOne();
    res.json({ message: "Report deleted successfully" });
    
  } catch (error) {
    console.error("Delete Report Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
