import { catchAsyncError } from "./catchAsyncError.js";
import ErrorHandler from "./error.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const isAuthenticated = catchAsyncError(async (req, res, next) => {
  let authToken;
  
  // 1. Check for web token in cookies
  if (req.cookies && req.cookies.token) {
    authToken = req.cookies.token;
  } 
  // 2. Check for mobile token in Authorization header
  else if (req.headers.authorization) {
    const [scheme, token] = req.headers.authorization.split(" ");
    if (scheme === "Bearer" && token) {
      authToken = token;
    }
  }

  // If no token found
  if (!authToken) {
    return next(new ErrorHandler("User is not authenticated. Please login.", 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).select('+tokenVersion');
    
    if (!user) {
      return next(new ErrorHandler("User not found. Please login again.", 404));
    }
    
    // Check token version
    const tokenVersion = decoded.tokenVersion || 0;
    if (user.tokenVersion !== tokenVersion) {
      return next(new ErrorHandler("Session expired. Please login again.", 401));
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ErrorHandler("Session expired. Please login again.", 401));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ErrorHandler("Invalid token. Please login again.", 401));
    }
    
    // Generic error
    return next(new ErrorHandler("Authentication failed. Please login again.", 401));
  }
});