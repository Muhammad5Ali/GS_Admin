import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Worker",
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["present", "absent", "on-leave"],
    default: "present"
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// Compound index for quick lookups
attendanceSchema.index({ worker: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;