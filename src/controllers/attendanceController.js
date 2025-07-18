import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";

// Mark attendance
export const markAttendance = catchAsyncError(async (req, res, next) => {
  const { workerId, status, tasksCompleted } = req.body;
  
  if (!workerId || !status) {
    return next(new ErrorHandler("Worker ID and status are required", 400));
  }

  // Verify worker belongs to supervisor
  const worker = await Worker.findOne({
    _id: workerId,
    supervisor: req.user._id
  });
  
  if (!worker) {
    return next(new ErrorHandler("Worker not found", 404));
  }

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create/update attendance
  const attendance = await Attendance.findOneAndUpdate(
    { worker: workerId, date: today },
    { 
      status,
      tasksCompleted: tasksCompleted || 0,
      supervisor: req.user._id
    },
    { upsert: true, new: true, runValidators: true }
  ).populate("worker");

  res.status(200).json({
    success: true,
    attendance
  });
});

// Get attendance for worker
export const getWorkerAttendance = catchAsyncError(async (req, res, next) => {
  const { workerId } = req.params;
  
  // Verify worker belongs to supervisor
  const worker = await Worker.findOne({
    _id: workerId,
    supervisor: req.user._id
  });
  
  if (!worker) {
    return next(new ErrorHandler("Worker not found", 404));
  }

  const attendance = await Attendance.find({ worker: workerId })
    .sort({ date: -1 })
    .limit(30);

  res.status(200).json({
    success: true,
    attendance
  });
});

// Get today's attendance for all workers
export const getTodaysAttendance = catchAsyncError(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const workers = await Worker.find({ supervisor: req.user._id });
  const workerIds = workers.map(worker => worker._id);
  
  const attendance = await Attendance.find({
    worker: { $in: workerIds },
    date: today
  }).populate("worker");

  res.status(200).json({
    success: true,
    attendance
  });
});
// Get attendance history by date range
export const getAttendanceHistory = catchAsyncError(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return next(new ErrorHandler("Start date and end date are required", 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include entire end day

  const workers = await Worker.find({ supervisor: req.user._id });
  const workerIds = workers.map(worker => worker._id);
  
  const attendance = await Attendance.find({
    worker: { $in: workerIds },
    date: { $gte: start, $lte: end }
  })
  .populate("worker")
  .sort({ date: -1 });

  // Group by date
  const historyByDate = {};
  attendance.forEach(record => {
    const dateStr = record.date.toISOString().split('T')[0];
    if (!historyByDate[dateStr]) {
      historyByDate[dateStr] = [];
    }
    historyByDate[dateStr].push({
      workerId: record.worker._id,
      workerName: record.worker.name,
      status: record.status,
      tasksCompleted: record.tasksCompleted
    });
  });

  res.status(200).json({
    success: true,
    history: historyByDate
  });
});

// Get attendance summary by date
export const getAttendanceSummary = catchAsyncError(async (req, res, next) => {
  const workers = await Worker.find({ supervisor: req.user._id });
  const workerIds = workers.map(worker => worker._id);
  
  const attendance = await Attendance.aggregate([
    {
      $match: {
        worker: { $in: workerIds.map(id => mongoose.Types.ObjectId(id)) }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          status: "$status"
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        attendance: {
          $push: {
            status: "$_id.status",
            count: "$count"
          }
        },
        totalWorkers: { $sum: "$count" }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  res.status(200).json({
    success: true,
    summary: attendance
  });
});