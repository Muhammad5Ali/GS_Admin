import Worker from "../models/Worker.js";
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";

// Add new worker
export const addWorker = catchAsyncError(async (req, res, next) => {
  const { name, phone, area } = req.body;
  
if (!name || !phone || !area) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  // Validate lengths
  if (name.length > 15) {
    return next(new ErrorHandler("Name must be 15 characters or less", 400));
  }
  
  if (phone.length !== 11 || !/^\d+$/.test(phone)) {
    return next(new ErrorHandler("Phone must be 11 digits", 400));
  }
  
  if (area.length > 20) {
    return next(new ErrorHandler("Area must be 20 characters or less", 400));
  }

  const worker = await Worker.create({
    name,
    phone,
    area,
    supervisor: req.user._id
  });

  res.status(201).json({
    success: true,
    worker
  });
});

// Get all workers for supervisor
export const getWorkers = catchAsyncError(async (req, res, next) => {
  const workers = await Worker.find({ supervisor: req.user._id });
  
  res.status(200).json({
    success: true,
    workers
  });
});

// Update worker
export const updateWorker = catchAsyncError(async (req, res, next) => {
  const worker = await Worker.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!worker || worker.supervisor.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Worker not found", 404));
  }

  res.status(200).json({
    success: true,
    worker
  });
});

// Delete worker
export const deleteWorker = catchAsyncError(async (req, res, next) => {
  const worker = await Worker.findById(req.params.id);
  
  if (!worker || worker.supervisor.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler("Worker not found", 404));
  }

  await worker.deleteOne();

  res.status(200).json({
    success: true,
    message: "Worker deleted"
  });
});