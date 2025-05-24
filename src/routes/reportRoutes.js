import express from 'express';
import Report from "../models/Report.js";
import cloudinary from '../lib/cloudinary.js';
import protectRoute from '../middleware/auth.middleware.js';


const router=express.Router();

router.post("/",protectRoute,async(req,res)=>{
    try {
        // Add this after field existence checks
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const isValidMimeType = allowedMimeTypes.some(type => 
  image.startsWith(`data:${type}`)
);

if (!isValidMimeType) {
  return res.status(400).json({
    message: "Invalid image format. Only JPEG, PNG, and WEBP allowed"
  });
}
        const{title,image,details,address,createdTime}=req.body;
         //checking if all of them are being provided
        if(!title|| !image || !details || !address || !createdTime){
            return res.status(400).json({message:"All fields are required"});
        }
        //upload the image to the cloudinary
        const uploadResponse=await cloudinary.uploader.upload(image);
        const imageUrl=uploadResponse.secure_url;
         //save to db
        const newReport=new Report({
           title,
           image:imageUrl,
           details,
           address,
          createdTime,
          user:req.user._id,
        });
        await newReport.save();
        //we have send a response so 201 will be better 
        res.status(201).json(newReport);


    } catch (error) {
          console.log("Errors in create report route:",error);
        res.status(500).json({message:error.message});
    }
})


//pagination=>infinite loading

router.get("/",protectRoute,async(req,res)=>{
 try {
    //example call from react-native-frontend
    //const response=await fetch("http://localhost:3000/api/books?page=1&limit=5");
    const page=req.query.page ||1;
    const limit=req.query.limit ||5;
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
//get recommended reports by the logged in user
router.get("/user",protectRoute,async(req,res)=>{
    try {
        const reports=await Report.find({user:req.user._id}).sort({createdAt:-1});
        res.json(reports);
    } catch (error) {
        console.log("Error in getting recommended books",error);
        res.status(500).json({message:"Internal Server Error"});
    }
})

router.delete("/:id",protectRoute,async(req,res)=>{
    try {
        const report=await Report.findById(req.params.id);
        if(!report) return res.status(404).json({message:"Report not found"});
        //check if the user is the creator of the Report
        if(report.user.toString()!==req.user._id.toString())
            return res.status(401).json({message:"You are not authorized to delete this report"});
         
        //delete the image from cloudinary
        //example imagr url how cloudinary stores yr image
        //https://res.cloudinary.com/de1rm4uto/image/upload/v17411568358/qyup61vejflxxw8igvi0.png

        if(report.image && report.image.includes("cloudinary")){
            try {
                const publicId=report.image.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(publicId);
                
            } catch (deleteError) {
                console.log("Error in deleting image from cloudinary",deleteError);
                //return res.status(500).json({message:"Internal Server Error"});
                
            }
        }
        //delete the report from db
        await report.deleteOne();

        res.json({message:"Report deleted successfully"});
    } catch (error) {
        console.log("Error in deleting Report route",error);
        res.status(500).json({message:"Internal Server Error"});
    }
    


});
export default router;