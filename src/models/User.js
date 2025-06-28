import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true
    },
    email:{     
        type:String,
        required:true,
        unique:true
    },
   password: {
    type: String,
    minLength: [8, "Password must have at least 8 characters."],
    maxLength: [32, "Password cannot have more than 32 characters."],
    select: false,
  },
  accountVerified: { type: Boolean, default: false },
  verificationCode: Number,
  verificationCodeExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
    
//      gender: {
//     type: String,
//     enum: ['male', 'female', 'other'],
//     required: true,
//     default: 'other'
//   },
    profileImage:{
        type:String,    
        default:""
    },
    reportCount: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
},{
    timestamps:true
});

//hash password before saving it to the database
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();

    const salt=await bcrypt.genSalt(10); //more value more security > processing time
    ///1234=>dhsashfvs
    this.password=await bcrypt.hash(this.password,salt);
    next();
});

//compare password functions

userSchema.methods.comparePassword=async function (userPassword) {
    //this.pass is the pass that we have in the db
    //userPassword is the password that get from the user login screen
    
    return await bcrypt.compare(userPassword,this.password);
};
userSchema.methods.generateVerificationCode = function () {
  function generateRandomFiveDigitNumber() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, 0);

    return parseInt(firstDigit + remainingDigits);
  }
  const verificationCode = generateRandomFiveDigitNumber();
  this.verificationCode = verificationCode;
  this.verificationCodeExpire = Date.now() + 10 * 60 * 1000;

  return verificationCode;
};
userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};
userSchema.methods.generateResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex"); //256 pair of hexadecimal digits can be sspecified as 20 bytes

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

userSchema.index({ reportCount: -1, points: -1 });
const User=mongoose.model("User",userSchema);

export default User;