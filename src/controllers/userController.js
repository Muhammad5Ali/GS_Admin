import ErrorHandler from "../middleware/error.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import crypto from "crypto";

export const register = catchAsyncError(async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return next(new ErrorHandler("All fields are required.", 400));
    }

    // Check for existing verified user
    const existingUser = await User.findOne({ 
      email,
      accountVerified: true
    });

    if (existingUser) {
      return next(new ErrorHandler("Email is already registered.", 400));
    }
    
    // Prevent too many registration attempts
    const registrationAttempts = await User.countDocuments({
      email,
      accountVerified: false
    });

    if (registrationAttempts > 3) {
      return next(
        new ErrorHandler(
          "You have exceeded the maximum registration attempts. Please try again later.",
          400
        )
      );
    }

    // Create user profile
    const profileImage = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`;
    const userData = { username, email, password, profileImage };

    const user = await User.create(userData);
    const verificationCode = await user.generateVerificationCode();
    await user.save();
    
    // Send verification email
    sendVerificationEmail(verificationCode, username, email, res);
    
  } catch (error) {
    next(error);
  }
});

async function sendVerificationEmail(verificationCode, username, email, res) {
  try {
    const message = generateEmailTemplate(verificationCode);
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

function generateEmailTemplate(verificationCode) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>GreenSnap Verification Code</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f2f2;">
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="background-color:#f2f2f2; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="background:#ffffff; border-radius:8px; overflow:hidden; font-family:Arial, sans-serif;"
          >

            <!-- Inline SVG Logo -->
            <tr>
              <td align="center" style="padding: 30px 0 10px;">
                <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="48" fill="#2e7d32" />
                  <path d="M50 20 C65 20, 80 35, 50 80 C20 35, 35 20, 50 20 Z" fill="#a5d6a7"/>
                </svg>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding: 0 40px 10px; text-align:center;">
                <h1 style="margin:0; font-size:24px; color:#2e7d32;">
                  Your GreenSnap Verification Code
                </h1>
              </td>
            </tr>

            <!-- Greeting -->
            <tr>
              <td style="padding: 0 40px 20px; font-size:16px; color:#333;">
                <p style="margin:0;">Hello,</p>
                <p style="margin:10px 0 0;">
                  Thank you for signing up for <strong>GreenSnap</strong>. Please use the verification code below to confirm your email address:
                </p>
              </td>
            </tr>

            <!-- Code Display -->
            <tr>
              <td align="center" style="padding: 0 40px 30px;">
                <div
                  style="
                    display:inline-block;
                    font-size:32px;
                    font-weight:bold;
                    color:#2e7d32;
                    letter-spacing:4px;
                    padding:15px 25px;
                    border:2px dashed #2e7d32;
                    border-radius:6px;
                  "
                >
                  ${verificationCode}
                </div>
              </td>
            </tr>

            <!-- Expiry Notice -->
            <tr>
              <td style="padding: 0 40px 20px; font-size:14px; color:#666;">
                This code will expire in <strong>10 minutes</strong>. If you did not request this, simply ignore this email.
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color:#f9f9f9; padding:20px 40px; font-size:12px; color:#999; text-align:center;">
                <p style="margin:0;">
                  © ${new Date().getFullYear()} GreenSnap, Inc. All rights reserved.
                </p>
                <p style="margin:8px 0 0;">
                  If you have any questions, feel free to contact us at
                  <a href="mailto:greensnapofficial@gmail.com">greensnapofficial@gmail.com</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
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
    user.verificationCode = null;
    user.verificationCodeExpire = null;
    await user.save({ validateBeforeSave: false });

    // Send success response
    sendToken(user, 200, "Account successfully verified!", res);

  } catch (error) {
    console.error("OTP Verification Error:", error);
    next(new ErrorHandler("Internal Server Error", 500));
  }
});

export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Validate input
  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required.", 400));
  }
  
  // Find user
  const user = await User.findOne({ 
    email, 
    accountVerified: true 
  }).select("+password");
  
  if (!user) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  
  // Verify password
  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password.", 400));
  }
  
  // Send token
  sendToken(user, 200, "User logged in successfully.", res);
});

export const logout = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
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
    user,
  });
});

export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
    accountVerified: true,
  });
  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

  const message = `Your Reset Password Token is:- \n\n ${resetPasswordUrl} \n\n If you have not requested this email then please ignore it.`;

  try {
    sendEmail({
      email: user.email,
      subject: "GREENSNAP APP RESET PASSWORD",
      message,
    });
    res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully.`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new ErrorHandler(
        error.message ? error.message : "Cannot send reset password token.",
        500
      )
    );
  }
});

export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new ErrorHandler(
        "Reset password token is invalid or has been expired.",400
      )
    );
  }

  if (req.body.password !== req.body.confirmPassword) {
    return next(
      new ErrorHandler("Password & confirm password entered by you do not match with each other.", 400)
    );
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendToken(user, 200, "Reset Password Successfully.", res);
});