import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

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
    password:{
        type:String,
        required:true,
        minlength:6
    },
    profileImage:{
        type:String,    
        default:""
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

const User=mongoose.model("User",userSchema);

export default User;