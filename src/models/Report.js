import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,  // Usually store image as URL or path (base64 not recommended in schema directly)
    required: true
  },
  details: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  createdTime: {
    type: Date,
    default: Date.now
  },
   user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:false,
    }
},{
    timestamps:true
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
