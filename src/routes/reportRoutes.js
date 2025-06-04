import express from 'express';
import Report from "../models/Report.js";
import User from "../models/User.js";
import cloudinary from '../lib/cloudinary.js';
import protectRoute from '../middleware/auth.middleware.js';


const router=express.Router();

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

    // Cloudinary upload with error handling
    // let uploadResponse;
    // try {
    //   uploadResponse = await cloudinary.uploader.upload(
    //     `data:image/jpeg;base64,${image}`, 
    //     {
    //       resource_type: "image",
    //       folder: "reports",
    //       allowed_formats: ['jpg', 'jpeg', 'png'],
    //       transformation: [{ width: 800, height: 600, crop: 'limit' }]
    //     }
    //   );
    // } catch (uploadError) {
    //   console.error("Cloudinary Upload Error:", uploadError);
    //   return res.status(500).json({ 
    //     message: "Image upload failed",
    //     error: uploadError.message 
    //   });
    // }
    // Optimize Cloudinary upload
    let uploadResponse;
    try {
      uploadResponse = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${image}`, 
        {
          resource_type: "image",
          folder: "reports",
          quality: "auto", // Auto-optimize quality
          format: 'jpg',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto:best' } // Balance quality/size
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
      publicId: uploadResponse.public_id, // Store public ID
      details: details.trim(),
      address: address.trim(),
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      photoTimestamp: photoTimestamp ? new Date(photoTimestamp) : new Date(),
      user: req.user._id
    });

    // Save to database
    const savedReport = await newReport.save();

    // Add point calculation and user update here ▼▼▼
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


//pagination=>infinite loading

router.get("/",protectRoute,async(req,res)=>{
 try {
    //example call from react-native-frontend
    //const response=await fetch("http://localhost:3000/api/reports?page=1&limit=5");
    const page=req.query.page ||1;
    const limit=req.query.limit ||2;
    const skip=(page-1)*limit;
    const reports=await Report.find().sort({createdAt:-1}) //descending order from newest one to  //the older and so on
    .skip(skip)
    .limit(limit)
    .populate("user","username profileImage");

    const totalReports=await Report.countDocuments();

    res.send({  
        reports,
        currentPage:page,
        totalReports,
        totalPages:Math.ceil(totalReports/limit),
    });
 } catch (error) {
    console.log("Error in getting all book route",error);
    res.status(500).json({message:"Internal Server Error"});
 }
})
//get reports that are being reported by the logged in user 
router.get("/user",protectRoute,async(req,res)=>{
    try {
      //  const reports=await Report.find({user:req.user._id}).sort({createdAt:-1});
      const reports=await Report.find({user:req.user._id})
  .sort({createdAt:-1})
  .populate("user","username profileImage");
        res.json(reports);
    } catch (error) {
        console.log("Error in getting recommended books",error);
        res.status(500).json({message:"Internal Server Error"});
    }
})
{/** router.delete("/:id",protectRoute,async(req,res)=>{
//     try {
//         const report=await Report.findById(req.params.id);
//         if(!report) return res.status(404).json({message:"Report not found"});
//         //check if the user is the creator of the Report
//         if(report.user.toString()!==req.user._id.toString())
//             return res.status(401).json({message:"You are not authorized to delete this report"});
         
//         //delete the image from cloudinary
//         //example imagr url how cloudinary stores yr image
//         //https://res.cloudinary.com/de1rm4uto/image/upload/v17411568358/qyup61vejflxxw8igvi0.png

//         if(report.image && report.image.includes("cloudinary")){
//             try {
//                 const publicId=report.image.split("/").pop().split(".")[0];
//                 await cloudinary.uploader.destroy(publicId);
                
//             } catch (deleteError) {
//                 console.log("Error in deleting image from cloudinary",deleteError);
//                 //return res.status(500).json({message:"Internal Server Error"});
                
//             }
//         }
//         // Add before deleting report
// const pointsMap = {
//   standard: 10,
//   hazardous: 20,
//   large: 15
// };
// const pointsToDeduct = pointsMap[report.reportType] || 10;

// await User.findByIdAndUpdate(report.user, {
//   $inc: { 
//     reportCount: -1, 
//     points: -pointsToDeduct 
//   }
// });
//         //delete the report from db
//         await report.deleteOne();

//         res.json({message:"Report deleted successfully"});
//     } catch (error) {
//         console.log("Error in deleting Report route",error);
//         res.status(500).json({message:"Internal Server Error"});
//     }
    


 }); */}
 router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Authorization check
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Cloudinary deletion - improved reliability
    if (report.image && report.image.includes("cloudinary")) {
      try {
        // Extract public ID safely
        const urlParts = report.image.split("/");
        const publicId = urlParts[urlParts.length - 1].split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error("Cloudinary deletion error:", deleteError);
      }
    }

    // Points calculation and update - optimized
    const pointsMap = {
      standard: 10,
      hazardous: 20,
      large: 15
    };
    const pointsToDeduct = pointsMap[report.reportType] || 10;

    // Atomic user update with concurrency safety
    await User.findByIdAndUpdate(report.user, {
      $inc: { 
        reportCount: -1, 
        points: -pointsToDeduct 
      }
    });

    // Delete report document
    await report.deleteOne();

    res.json({ message: "Report deleted successfully" });
    
  } catch (error) {
    console.error("Delete Report Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;