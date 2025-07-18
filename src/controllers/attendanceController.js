import mongoose from "mongoose"; 
import Attendance from "../models/Attendance.js";
import Worker from "../models/Worker.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import moment from 'moment-timezone';

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

  // Get today's date in Pakistan time (UTC+5)
  const todayPakistan = moment().tz('Asia/Karachi').startOf('day').toDate();
  const tomorrowPakistan = moment(todayPakistan).add(1, 'day').toDate();

  // Check if attendance already exists for today
  const existingAttendance = await Attendance.findOne({
    worker: workerId,
    date: { 
      $gte: todayPakistan,
      $lt: tomorrowPakistan
    }
  });

  if (existingAttendance) {
    return next(new ErrorHandler("Attendance already marked for today", 400));
  }

  // Create new attendance
  const attendance = await Attendance.create({
    worker: workerId,
    date: todayPakistan,
    status,
    tasksCompleted: tasksCompleted || 0,
    supervisor: req.user._id
  });

  // Populate worker details
  await attendance.populate("worker");

  res.status(201).json({
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
  // Get today in Pakistan time
  const todayPakistan = moment().tz('Asia/Karachi').startOf('day').toDate();
  const tomorrowPakistan = moment(todayPakistan).add(1, 'day').toDate();
  
  const workers = await Worker.find({ supervisor: req.user._id });
  const workerIds = workers.map(worker => worker._id);
  
  const attendance = await Attendance.find({
    worker: { $in: workerIds },
    date: { 
      $gte: todayPakistan,
      $lt: tomorrowPakistan
    }
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

  // Convert to Pakistan time
  const start = moment.tz(startDate, 'Asia/Karachi').startOf('day').toDate();
  const end = moment.tz(endDate, 'Asia/Karachi').endOf('day').toDate();

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
    const dateStr = moment(record.date).tz('Asia/Karachi').format('YYYY-MM-DD');
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
  
  // Convert to ObjectIds
  const objectIds = workerIds.map(id => new mongoose.Types.ObjectId(id));
  
  const attendance = await Attendance.aggregate([
    {
      $match: {
        worker: { $in: objectIds }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "+05:00" } },
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

// Get worker attendance with date filtering
export const getWorkerAttendanceByDate = catchAsyncError(async (req, res, next) => {
  const { workerId } = req.params;
  const { month, year } = req.query;
  
  // Verify worker belongs to supervisor
  const worker = await Worker.findOne({
    _id: workerId,
    supervisor: req.user._id
  });
  
  if (!worker) {
    return next(new ErrorHandler("Worker not found", 404));
  }

  // Calculate date range for the month in Pakistan time
  const startDate = moment.tz(`${year}-${month}-01`, 'Asia/Karachi').startOf('month').toDate();
  const endDate = moment(startDate).tz('Asia/Karachi').endOf('month').toDate();

  const attendance = await Attendance.find({
    worker: workerId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });

  res.status(200).json({
    success: true,
    attendance
  });
});