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

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, image, details, address, latitude, longitude, photoTimestamp, reportType } = req.body;
    
    // Server-side validation
    if (image && image.length > 5 * 1024 * 1024) {
      return res.status(413).json({ 
        message: "Image too large (max 5MB)",
        code: "IMAGE_TOO_LARGE"
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
        code: "MISSING_FIELDS",
        missingFields
      });
    }

    // Base64 validation
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      return res.status(400).json({ 
        message: "Invalid image format",
        code: "INVALID_IMAGE_FORMAT"
      });
    }

    // Classify image using the service
    let classification;
    try {
      classification = await classifyImage(image);
    } catch (error) {
      console.error("Classification Error:", error.message);
      const errorCode = error.message.split(':')[0];

      // Handle specific error codes
      switch (errorCode) {
        case 'MODEL_LOADING':
          return res.status(503).json({
            message: 'Our AI model is warming up. Please try again in 20 seconds.',
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

    // New low-confidence check
    if (classification.label === "Waste" && classification.confidence < 0.7) {
      return res.status(400).json({
        message: 'Low confidence in waste detection',
        classification,
        code: 'LOW_CONFIDENCE'
      });
    }

    if (classification.label !== "Waste") {
      return res.status(400).json({ 
        message: 'Image is not of waste...',
        classification,
        code: 'NOT_WASTE'
      });
    }

    // Cloudinary upload with timeout
    let uploadResponse;
    try {
      const cloudinaryPromise = cloudinary.uploader.upload(
        `data:image/jpeg;base64,${image}`,
        {
          resource_type: "image",
          folder: "reports",
          quality: "auto",
          format: 'jpg',
          transformation: [
            { width: 800, crop: 'limit' }, 
            { quality: 'auto:good' }
          ]
        }
      );

      const uploadTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('CLOUDINARY_TIMEOUT')), 15000)
      );

      uploadResponse = await Promise.race([cloudinaryPromise, uploadTimeout]);

    } catch (uploadError) {
      console.error("Cloudinary Upload Error:", uploadError);

      if (uploadError.message === 'CLOUDINARY_TIMEOUT') {
        return res.status(504).json({
          message: "Image upload timed out",
          code: "CLOUDINARY_TIMEOUT"
        });
      }

      return res.status(500).json({ 
        message: "Image upload failed",
        error: uploadError.message,
        code: "CLOUDINARY_ERROR"
      });
    }

    // Create report
    const finalReportType = reportType || 'standard';
    const newReport = new Report({
      title: title.trim(),
      image: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      details: details.trim(),
      address: address.trim(),
      reportType: finalReportType,
      location: {
        type: "Point",
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
      console.error("User update error:", updateError);
    }

    res.status(201).json({
      message: "Report created successfully",
      report: savedReport,
      pointsEarned: pointsToAdd
    });

  } catch (error) {
    console.error("Report Creation Error:", error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation Error",
        error: error.message,
        code: "VALIDATION_ERROR"
      });
    }

    res.status(500).json({ 
      message: "Internal server error",
      error: error.message,
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// Add this temporary route to test classification
// routes/reportRoutes.js
router.get('/test-classify', async (req, res) => {
  try {
    // Use a sample base64 image
    const result = await classifyImage('data:image/jpeg;base64,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');
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
