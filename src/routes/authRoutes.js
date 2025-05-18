import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router=express.Router();

const generateToken=(userId)=>{
    return jwt.sign({userId},process.env.JWT_SECRET,{expiresIn:"15d"})
}

router.post("/register",async (req,res)=>{
    try {
          //checking all the fields
  const{email, username,password}=req.body;
        if(!username||!email ||!password){
            return res.status(400).json({message:"All of the fields are required!!"})
        }
        if(password.length<6){
            return res.status(400).json({message:"Password should be at least consisting of 6 characters!!"})
        }
        if(username.length<3){
            return res.status(400).json({message:"Username must be 3 characters long!!"})
        }

        //check if user already existed
        const existingUser=await User.findOne({username});
        if(existingUser){
            return res.status(400).json({message:"User already existed.."});
        }
        const existingEmail=await User.findOne({email});
        if(existingEmail){
            return res.status(400).json({ message: "Email already exists.."});
        }
        //get random number
const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;



//create a user
const user=new User({
  email,
  username,
  password,
  profileImage,
});

await user.save();
const token=generateToken(user._id);
//we dont store token on the server side    
res.status(201).json({
    //instead we send token to the client
 token, //for the feature rquest we r using this token, use token to upload image and get other reports
 //server will use this token to tell whether user is authenticated or he is n't
  //send this token to the client
          //because we will use this token to make a report 
          //or we wanna fetch the report
          //So for the feature request will use this token from the client and 
          //server will check who is owner of this token, so to check that
          //you are authenticated or not...
 user:{
    id: user._id,
    username:user.username,
    email:user.email,
    profileImage:user.profileImage
 },
});
    } catch (error) { 
        console.log("Error in register route",error);
        res.status(500).json({message:"Internal Server error"});
    }
});

router.post("/login",async (req,res)=>{
    try {
        const {email,password}=req.body;
        if(!email|| !password) return res.status(400).json({message:"All fields are required"});
        //check if user exists
        const user=await User.findOne({email});
        if(!user) return res.status(400).json({message:"Invalid credentials"});
        //check if password is correct
        const isPasswordCorrect=await user.comparePassword(password);
        if(!isPasswordCorrect) return res.status(400).json({message:"Invalid credentials"});
  
        //generate token
        const token=generateToken(user._id);
        res.status(200).json({
          token,
          user:{
            id:user._id,
            username:user.username,
            email:user.email,
            profileImage:user.profileImage,
          },
        });
        
      } catch (error) {
        console.log("Errors in login route:", error);
        res.status(500).json({message:"Internal Server Error"});
      }
  });

export default router