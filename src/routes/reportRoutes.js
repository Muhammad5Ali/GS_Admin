import express from 'express';
import Report from "../models/Report.js";
import User from "../models/User.js";
import cloudinary from '../lib/cloudinary.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

// Add request logging middleware
router.use((req, res, next) => {
  console.log(`Incoming ${req.method} to ${req.path}`);
  next();
});

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, image, details, address, latitude, longitude, photoTimestamp } = req.body;
    
    // Add server-side image size validation
    if (image && image.length > 5 * 1024 * 1024) { // 5MB limit
      return res.status(413).json({ message: "Image too large (max 5MB)" });
    }
    
    // Validation
    if (!title || !image || !details || !address || !latitude || !longitude) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Base64 validation
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image)) {
      return res.status(400).json({ message: "Invalid image format" });
    }

    // Optimize Cloudinary upload
    let uploadResponse; // DECLARE OUTSIDE TRY BLOCK
    try {
      uploadResponse = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${image}`, 
        {
          resource_type: "image",
          folder: "reports",
          quality: "auto",
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto:best' }
          ]
        }
      );
    } catch (uploadError) {
      console.error("Cloudinary Upload Error:", uploadError);
      return res.status(500).json({ 
        message: "Image upload failed",
        error: uploadError.message 
      });
    }

    // Create report
    const newReport = new Report({
      title: title.trim(),
      image: uploadResponse.secure_url,
      details: details.trim(),
      address: address.trim(),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      photoTimestamp: photoTimestamp ? new Date(photoTimestamp) : new Date(),
      user: req.user._id,
      publicId: uploadResponse.public_id, // STORE PUBLIC ID
    });

    // Save to database
    const savedReport = await newReport.save();

    // Extract report type from request body
    const reportType = req.body.reportType || 'standard'; // Default to 'standard'
    
    const pointsMap = {
      standard: 10,
      hazardous: 20,
      large: 15
    };
    const pointsToAdd = pointsMap[reportType] || 10;
    
    // Update user's report count and points
    try {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {   
          reportCount: 1, 
          points: pointsToAdd
        }
      });
    } catch (updateError) {
      console.error("User update error:", updateError);
    }
    
    res.status(201).json({
      message: "Report created successfully",
      report: savedReport
    });

  } catch (error) {
    console.error("Server Error:", error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation Error",
        error: error.message 
      });
    }
    
    // General error response
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

// Pagination => infinite loading
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 2;
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
    console.log("Error in getting all reports route", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get reports that are being reported by the logged in user 
router.get("/user", protectRoute, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.log("Error in getting user reports", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });
    
    // Authorization check
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "You are not authorized to delete this report" });
    }

    // Cloudinary deletion - USE STORED PUBLIC ID IF AVAILABLE
    if (report.publicId) {
      try {
        console.log(`Deleting Cloudinary asset by publicId: ${report.publicId}`);
        await cloudinary.uploader.destroy(report.publicId);
      } catch (deleteError) {
        console.error("Cloudinary deletion error (using stored publicId):", deleteError);
      }
    } 
    // Fallback to URL extraction for older reports
    else if (report.image && report.image.includes("cloudinary")) {
      try {
        const urlParts = report.image.split('/');
        const uploadIndex = urlParts.findIndex(part => part === "upload");
        
        if (uploadIndex !== -1) {
          const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
          const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");
          
          // Add folder prefix
          const fullPublicId = `reports/${publicId}`;
          
          console.log(`Deleting Cloudinary asset by extracted publicId: ${fullPublicId}`);
          await cloudinary.uploader.destroy(fullPublicId);
        }
      } catch (deleteError) {
        console.error("Cloudinary deletion error (using URL extraction):", deleteError);
      }
    }

    // Point deduction logic
    const pointsMap = {
      standard: 10,
      hazardous: 20,
      large: 15
    };
    const pointsToDeduct = pointsMap[report.reportType] || 10;

    await User.findByIdAndUpdate(report.user, {
      $inc: { 
        reportCount: -1, 
        points: -pointsToDeduct 
      }
    });

    // Delete report from DB
    await report.deleteOne();

    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error in delete route:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;