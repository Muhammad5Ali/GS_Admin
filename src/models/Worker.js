import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15 // Added max length constraint
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    validate: { // Added phone number validation
      validator: function(v) {
        return /^\d{11}$/.test(v); // Validate exactly 11 digits
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  area: {
    type: String,
    required: true,
    maxlength: 20 // Added max length constraint
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Worker = mongoose.model("Worker", workerSchema);
export default Worker;