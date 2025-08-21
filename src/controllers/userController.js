import ErrorHandler from "../middleware/error.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import { 
  generateVerificationTemplate, 
  generateResetOTPTemplate,
  generateWelcomeTemplate
} from '../utils/emailTemplates.js';

// export const register = catchAsyncError(async (req, res, next) => {
//   try {
//     const { username, email, password } = req.body;
    
//     // Validate required fields
//     if (!username || !email || !password) {
//       return next(new ErrorHandler("All fields are required.", 400));
//     }

//     // Check for existing verified user
//     const existingUser = await User.findOne({ 
//       email,
//       accountVerified: true
//     });

//     if (existingUser) {
//       return next(new ErrorHandler("Email is already registered.", 400));
//     }
    
//     // Enhanced: Prevent too many registration attempts within 24 hours
//     const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
//     const registrationAttempts = await User.countDocuments({
//       email,
//       accountVerified: false,
//       createdAt: { $gt: twentyFourHoursAgo }
//     });

//     if (registrationAttempts >= 3) {
//       return next(
//         new ErrorHandler(
//           "You have exceeded the maximum registration attempts. Please try again tomorrow.",
//           400
//         )
//       );
//     }

//     // Create user profile
//     const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`;
//     const userData = { username, email, password, profileImage };

//     const user = await User.create(userData);
//     const verificationCode = user.generateVerificationCode();
//     await user.save();
    
//     // Send verification email
//     sendVerificationEmail(verificationCode, username, email, res);
    
//   } catch (error) {
//     console.error("Registration Error:", error);
//     next(error);
//   }
// });


export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return next(new ErrorHandler("All fields are required.", 400));
    }

    // Validate username length
    if (username.length < 3 || username.length > 32) {
      return next(new ErrorHandler("Username must be between 3 and 32 characters.", 400));
    }

    // ENHANCED: Validate email format with specific rules
    // 1. Only one @ symbol
    // 2. Before @: only alphanumeric characters, at least one alphabet
    // 3. After @: specific allowed domains
    const emailRegex = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/;
    
    // Check if email matches basic format
    if (!emailRegex.test(email)) {
      return next(new ErrorHandler("Please enter a valid email address.", 400));
    }
    
    // Check for exactly one @ symbol
    const atSymbolCount = (email.match(/@/g) || []).length;
    if (atSymbolCount !== 1) {
      return next(new ErrorHandler("Email can only contain one @ symbol.", 400));
    }
    
    // Split email into local part and domain
    const [localPart, domain] = email.split('@');
    
    // Check local part contains at least one alphabet character
    const hasAlphabet = /[A-Za-z]/.test(localPart);
    if (!hasAlphabet) {
      return next(new ErrorHandler("Email must contain at least one letter before the @ symbol.", 400));
    }
    
    // Check local part contains only alphanumeric characters
    const isLocalPartValid = /^[A-Za-z0-9]+$/.test(localPart);
    if (!isLocalPartValid) {
      return next(new ErrorHandler("Email can only contain letters and numbers before the @ symbol.", 400));
    }

    // Restrict to specific domains (including original iiu.edu.pk)
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'iiu.edu.pk'];
    if (!allowedDomains.includes(domain)) {
      return next(new ErrorHandler("We only accept emails from Gmail, Yahoo, Outlook, Hotmail, and IIU.edu.pk.", 400));
    }

    // Check for existing verified user
    const existingUser = await User.findOne({ 
      email,
      accountVerified: true
    });

    if (existingUser) {
      return next(new ErrorHandler("Email is already registered.", 400));
    }
    
    // Prevent too many registration attempts within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const registrationAttempts = await User.countDocuments({
      email,
      accountVerified: false,
      createdAt: { $gt: twentyFourHoursAgo }
    });

    if (registrationAttempts >= 3) {
      return next(
        new ErrorHandler(
          "You have exceeded the maximum registration attempts. Please try again tomorrow.",
          400
        )
      );
    }

    // Create user profile
    const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`;
    const userData = { username, email, password, profileImage };

    const user = await User.create(userData);
    const verificationCode = user.generateVerificationCode();
    await user.save();
    
    // Send verification email
    sendVerificationEmail(verificationCode, username, email, res);
    
  } catch (error) {
    console.error("Registration Error:", error);
    next(error);
  }
});

async function sendVerificationEmail(verificationCode, username, email, res) {
  try {
    const message = generateVerificationTemplate(verificationCode, username);
    await sendEmail({ 
      email, 
      subject: "Your Verification Code", 
      message 
    });
    
    res.status(200).json({
      success: true,
      message: `Verification email sent to ${email}`
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send verification email.",
    });
  }
}

export const verifyOTP = catchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;

  try {
    // Validate OTP format
    if (!otp || isNaN(Number(otp))) {
      return next(new ErrorHandler("Invalid OTP format", 400));
    }

    // Find unverified user
    const user = await User.findOne({ 
      email, 
      accountVerified: false 
    });

    if (!user) {
      return next(new ErrorHandler("No pending verification found. Please register first.", 404));
    }

    const numericOTP = Number(otp);

    // Verify OTP
    if (user.verificationCode !== numericOTP) {
      return next(new ErrorHandler("Invalid OTP code", 400));
    }

    // Check expiration
    const currentTime = Date.now();
    const expirationTime = user.verificationCodeExpire.getTime();
    
    if (currentTime > expirationTime) {
      return next(new ErrorHandler("OTP has expired. Please register again.", 400));
    }

    // Verify user account
    user.accountVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    user.resendCount = 0;
    user.cooldownExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send success response WITHOUT token
    res.status(200).json({
      success: true,
      message: "Account successfully verified!",
    });

  } catch (error) {
    console.error("OTP Verification Error:", error);
    next(new ErrorHandler("Internal Server Error", 500));
  }
});

export const resendOTP = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const MAX_RESEND_ATTEMPTS = 3;
  const COOLDOWN_HOURS = 24;

  // Validate email format
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return next(new ErrorHandler("Invalid email address", 400));
  }

  // Find unverified user
  const user = await User.findOne({ 
    email, 
    accountVerified: false 
  });

  if (!user) {
    return next(new ErrorHandler("No pending verification found for this email", 404));
  }

  // NEW: Combined check for max attempts AND active cooldown
  if (user.resendCount >= MAX_RESEND_ATTEMPTS && user.cooldownExpires && user.cooldownExpires > Date.now()) {
    const hoursLeft = Math.ceil((user.cooldownExpires - Date.now()) / (3600 * 1000));
    return next(new ErrorHandler(
      `Maximum attempts reached. Try again in ${hoursLeft} hours.`,
      429
    ));
  }

  // Check if cooldown is active (for cases below max attempts)
  if (user.cooldownExpires && user.cooldownExpires > Date.now()) {
    const minutesLeft = Math.ceil((user.cooldownExpires - Date.now()) / (60 * 1000));
    return next(new ErrorHandler(
      `Please try again in ${minutesLeft} minutes.`,
      429
    ));
  }

  // Reset counter if cooldown period has passed OR we're below max attempts
  if (user.resendCount >= MAX_RESEND_ATTEMPTS) {
    user.resendCount = 0;
  }

  // Generate new verification code and update resend count
  const verificationCode = user.generateVerificationCode();
  user.resendCount = (user.resendCount || 0) + 1;

  // Set cooldown if max attempts reached
  if (user.resendCount === MAX_RESEND_ATTEMPTS) {
    user.cooldownExpires = Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000;
  } else {
    user.cooldownExpires = undefined;
  }

  await user.save({ validateBeforeSave: false });

  // Send email
  try {
    const message = generateVerificationTemplate(verificationCode, user.username);
    await sendEmail({ 
      email, 
      subject: "Your New Verification Code", 
      message 
    });

    res.status(200).json({
      success: true,
      message: `New verification code sent to ${email}`
    });
  } catch (error) {
    console.error("Resend OTP email error:", error);
    
    // Rollback changes on email failure
    user.resendCount -= 1;
    if (user.resendCount < MAX_RESEND_ATTEMPTS) {
      user.cooldownExpires = undefined;
    }
    await user.save({ validateBeforeSave: false });
    
    return next(new ErrorHandler("Failed to resend OTP email", 500));
  }
});

export const login = catchAsyncError(async (req, res, next) => {
  const { email, password, client } = req.body; // Added 'client' parameter

  // Validate all inputs including client type
  if (!email || !password || !client) {
    return next(new ErrorHandler("Email, password, and client type are required.", 400));
  }

  // Find user by email (regardless of verification status)
  const user = await User.findOne({
    email
  }).select("+password +welcomeEmailSent +accountVerified");

  // Check if user exists
  if (!user) {
    return next(new ErrorHandler("No account found with this email address.", 400));
  }

  // Check if account is verified
  if (!user.accountVerified) {
    return next(new ErrorHandler("Please verify your account before logging in.", 400));
  }

  // Verify password
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Incorrect password. Please try again.", 400));
  }

  // Validate role based on client type
  if (client === "mobile" && !["user", "supervisor"].includes(user.role)) {
    return next(new ErrorHandler("Mobile access restricted to users/supervisors", 403));
  }

  if (client === "web" && user.role !== "admin") {
    return next(new ErrorHandler("Web dashboard requires admin privileges", 403));
  }

  // Send welcome email on first login (if applicable)
  if (!user.welcomeEmailSent) {
    try {
      const message = generateWelcomeTemplate(user.username);
      await sendEmail({
        email: user.email,
        subject: "Welcome to GreenSnap!",
        message
      });

      // Update user record to mark email as sent
      user.welcomeEmailSent = true;
      await user.save({ validateBeforeSave: false });

      console.log(`Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't block login for email failure
    }
  }

  // Send authentication token
  sendToken(user, 200, "User logged in successfully.", res);
});

// export const login = catchAsyncError(async (req, res, next) => {
//   const { email, password } = req.body;
  
//   // Validate input
//   if (!email || !password) {
//     return next(new ErrorHandler("Email and password are required.", 400));
//   }
  
//   // Find user with verified account
//   const user = await User.findOne({ 
//     email, 
//     accountVerified: true 
//   }).select("+password +welcomeEmailSent");  // Include welcomeEmailSent field
  
//   if (!user) {
//     return next(new ErrorHandler("Invalid email or password.", 400));
//   }
  
//   // Verify password
//   const isPasswordMatched = await user.comparePassword(password);
//   if (!isPasswordMatched) {
//     return next(new ErrorHandler("Invalid email or password.", 400));
//   }
  
//   // Send welcome email on first login
//   if (!user.welcomeEmailSent) {
//     try {
//       const message = generateWelcomeTemplate(user.username);
//       await sendEmail({ 
//         email: user.email, 
//         subject: "Welcome to GreenSnap!", 
//         message 
//       });
      
//       // Update user record to mark email as sent
//       user.welcomeEmailSent = true;
//       await user.save({ validateBeforeSave: false });
      
//       console.log(`Welcome email sent to ${user.email}`);
//     } catch (emailError) {
//       console.error('Welcome email failed:', emailError);
//       // Don't block login for email failure
//     }
//   }
  
//   // Send authentication token
//   sendToken(user, 200, "User logged in successfully.", res);
// });
export const registerSupervisor = catchAsyncError(async (req, res, next) => {
  const { username, email, password, secretKey } = req.body;
  
  // Validate secret key (store in .env)
  if (secretKey !== process.env.SUPERVISOR_SECRET) {
    return next(new ErrorHandler("Invalid supervisor key", 401));
  }

  // Same registration logic as regular user but with role
  const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`;
  const user = await User.create({
    username,
    email,
    password,
    profileImage,
    role: 'supervisor',
    accountVerified: true // Skip email verification for supervisors
  });

  res.status(201).json({
    success: true,
    message: 'Supervisor account created'
  });
});

export const registerAdmin = catchAsyncError(async (req, res, next) => {
  const { username, email, password, secretKey } = req.body;
  
  // Validate secret key
  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    return next(new ErrorHandler("Invalid admin registration key", 401));
  }

  // Check for existing verified user
  const existingUser = await User.findOne({ 
    email,
    accountVerified: true
  });

  if (existingUser) {
    return next(new ErrorHandler("Email is already registered.", 400));
  }

  // Create admin profile
  const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`;
  
  const user = await User.create({
    username,
    email,
    password,
    profileImage,
    role: 'admin',
    accountVerified: true // Skip verification for admins
  });

  res.status(201).json({
    success: true,
    message: 'Admin account created successfully',
    userId: user._id
  });
});

// export const logout = catchAsyncError(async (req, res, next) => {
//   // Clear token from response
//   res
//     .status(200)
//     .cookie("token", "", {
//       expires: new Date(Date.now()),
//       httpOnly: true,
//       sameSite: "none",
//       secure: true
//     })
//     .json({
//       success: true,
//       message: "Logged out successfully.",
//     });
  
//   // Add token invalidation logic
//   const user = await User.findById(req.user._id);
//   if (user) {
//     user.tokenVersion = (user.tokenVersion || 0) + 1;
//     await user.save({ validateBeforeSave: false });
    
//     console.log(`Token invalidated for user ${user.email}. New token version: ${user.tokenVersion}`);
//   }
// });

export const logout = catchAsyncError(async (req, res, next) => {
  // Increment token version
  const user = await User.findById(req.user._id);
  if (user) {
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save({ validateBeforeSave: false });
  }

  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      sameSite: "none",
      secure: true
    })
    .json({
      success: true,
      message: "Logged out successfully.",
    });
});

export const getUser = catchAsyncError(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    // user,
      user: {
      ...user._doc,
      createdAt: user.createdAt, // Ensure createdAt is included
    },
  });
});

export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const MAX_RESEND_ATTEMPTS = 3;
  const COOLDOWN_HOURS = 24;
  
  const user = await User.findOne({
    email: req.body.email,
    accountVerified: true,
  });
  
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }
  
  // Check and reset counter if cooldown expired
  if (user.resetPasswordResendCount >= MAX_RESEND_ATTEMPTS && 
      user.resetPasswordCooldownExpires < Date.now()) {
    user.resetPasswordResendCount = 0;
    user.resetPasswordCooldownExpires = undefined;
  }
  
  // Check if in cooldown period
  if (user.resetPasswordResendCount >= MAX_RESEND_ATTEMPTS) {
    const hoursLeft = Math.ceil((user.resetPasswordCooldownExpires - Date.now()) / (3600 * 1000));
    return next(new ErrorHandler(
      `You've reached maximum resend attempts. Try again in ${hoursLeft} hours.`,
      429
    ));
  }

  // Generate reset OTP
  const resetOTP = user.generateResetOTP();
  
  // Update resend counter
  user.resetPasswordResendCount = (user.resetPasswordResendCount || 0) + 1;
  
  // Set cooldown if max attempts reached
  if (user.resetPasswordResendCount === MAX_RESEND_ATTEMPTS) {
    user.resetPasswordCooldownExpires = Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000;
  }
  
  await user.save({ validateBeforeSave: false });
  
  // Send email with OTP
  try {
    const message = generateResetOTPTemplate(resetOTP, user.username);
    await sendEmail({
      email: user.email,
      subject: "GreenSnap Password Reset OTP",
      message,
    });
    
    res.status(200).json({
      success: true,
      message: `Password reset OTP sent to ${user.email}`,
    });
  } catch (error) {
    console.error("Forgot Password Email Error:", error);
    
    // Revert changes on email failure
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    user.resetPasswordResendCount -= 1;
    
    if (user.resetPasswordResendCount < MAX_RESEND_ATTEMPTS) {
      user.resetPasswordCooldownExpires = undefined;
    }
    
    await user.save({ validateBeforeSave: false });
    
    return next(
      new ErrorHandler(
        error.message || "Failed to send reset password email",
        500
      )
    );
  }
});

export const verifyResetOTP = catchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorHandler("Email and OTP are required.", 400));
  }

  // Find user by email
  const user = await User.findOne({ email, accountVerified: true });
  
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  // Check if OTP matches
  if (user.resetPasswordOTP !== Number(otp)) {
    return next(new ErrorHandler("Invalid OTP code", 400));
  }

  // Check expiration
  if (user.resetPasswordOTPExpire <= Date.now()) {
    return next(new ErrorHandler("OTP has expired. Please request a new one.", 400));
  }

  // SECURITY ENHANCEMENT: Set verification flags
  user.resetPasswordVerified = true;
  user.resetPasswordVerifiedExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  
  // Clear OTP after verification
  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpire = undefined;
  
  // Reset rate-limiting counters
  user.resetPasswordResendCount = 0;
  user.resetPasswordCooldownExpires = undefined;
  
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "OTP verified successfully. You can now reset your password.",
  });
});

export const resetPasswordWithOTP = catchAsyncError(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return next(new ErrorHandler("Email and password are required.", 400));
    }

    // SECURITY ENHANCEMENT: Verify OTP was validated
    const user = await User.findOne({ 
      email, 
      accountVerified: true,
      resetPasswordVerified: true,
      resetPasswordVerifiedExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      console.error("Unauthorized password reset attempt:", email);
      return next(new ErrorHandler("Password reset not authorized or expired", 401));
    }

    // Update security credentials
    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    
    // Clear verification flags
    user.resetPasswordVerified = undefined;
    user.resetPasswordVerifiedExpires = undefined;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully.",
    });
    
  } catch (error) {
    console.error("Password reset error:", error);
    next(new ErrorHandler("Internal Server Error", 500));
  }
});