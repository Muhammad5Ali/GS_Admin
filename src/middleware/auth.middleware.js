// A middleware that has been created for authentication for the protected route so that
// only those can post who is authenticated

// const response=await fetch(`http://localhost:3000/api/books`,{
//     method:"POST",
//     body:JSON.stringify({
//         title,
//         caption
//     }),
//     headers:{Authorization:`Bearer ${token}`},
// });


import jwt from "jsonwebtoken";
import User from "../models/User.js"

const protectRoute=async(req,res,next)=>{
    try {
        //get token
        const token=req.headers("Authorization").replace("Bearer ","");
        if(!token) return res.status(401).json({message:"No authentication taken, access denied"});
        //verify token
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        //find user
        //-password: means we select every field except the password
        const user=await User.findById(decoded.userId).select("-password");
        if(!user) return res.status(401).json({message:"Token is not valid"});

        req.user=user;
        next();
    } catch (error) {
        console.error("Authentication error",error.message);
        res.status(401).json({message:"Token is not valid"});
    }
};
export default protectRoute;