import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minLength: [3, "Username must have at least 3 characters."],
    maxLength: [32, "Username cannot have more than 32 characters."]
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(email) {
        // Check for exactly one @ symbol
        const atSymbolCount = (email.match(/@/g) || []).length;
        if (atSymbolCount !== 1) return false;
        
        // Split email into parts
        const [localPart, domain] = email.split('@');
        
        // Check local part contains at least one alphabet character
        const hasAlphabet = /[A-Za-z]/.test(localPart);
        if (!hasAlphabet) return false;
        
        // Check local part contains only alphanumeric characters
        const isLocalPartValid = /^[A-Za-z0-9]+$/.test(localPart);
        if (!isLocalPartValid) return false;
        
        // Validate allowed domains
        const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com','iiu.edu.pk'];
        return allowedDomains.includes(domain);
      },
      message: 'Please enter a valid email address with only letters and numbers before the @ symbol from allowed domains (Gmail, Yahoo, Outlook, Hotmail, IIU).'
    }
  },
  password: {
    type: String,
    minLength: [8, "Password must have at least 8 characters."],
    maxLength: [32, "Password cannot have more than 32 characters."],
    select: false,
  },
  accountVerified: { 
    type: Boolean, 
    default: false 
  },
  role: {
  type: String,
  enum: ['user', 'supervisor', 'admin'],
  default: 'user'
},
  verificationCode: Number,
  verificationCodeExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  resetPasswordOTP: Number,       // Added for OTP reset
  resetPasswordOTPExpire: Date,   // Added for OTP expiration
  cooldownExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordResendCount: {
    type: Number,
    default: 0,
    min: 0
  },
  resetPasswordCooldownExpires: Date,
  profileImage: {
    type: String,
    default: ""
  },
  reportCount: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  }, 
  resendCount: {
    type: Number,
    default: 0,
    min: 0
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  // NEW SECURITY FIELDS
  resetPasswordVerified: {
    type: Boolean,
    default: false
  },
  welcomeEmailSent: {
  type: Boolean,
  default: false
},
  resetPasswordVerifiedExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

userSchema.methods.generateVerificationCode = function() {
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return parseInt(firstDigit + remainingDigits);
  }
  
  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 5 * 60 * 1000;

  return verificationCode;
};

// Generate JWT
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      verified: this.accountVerified,
      tokenVersion: this.tokenVersion
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Generate password reset OTP
userSchema.methods.generateResetOTP = function() {
  // Generate a 5-digit OTP
  const otp = Math.floor(10000 + Math.random() * 90000);
  this.resetPasswordOTP = otp;
  // Set expiration to 5 minutes (300,000 milliseconds)
  this.resetPasswordOTPExpire = Date.now() + 5 * 60 * 1000;
  return otp;
};

userSchema.index({ reportCount: -1, points: -1 });
// Add TTL index for automatic verification expiration
userSchema.index({ resetPasswordVerifiedExpires: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model("User", userSchema);

export default User;