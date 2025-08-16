// backend/src/controllers/publicController.js
import Report from '../models/Report.js';
import User from '../models/User.js';
import { catchAsyncError } from '../middleware/catchAsyncError.js';

export const getPublicStats = catchAsyncError(async (req, res) => {
  const [permanentResolved, activeSupervisors, registeredUsers] = await Promise.all([
    Report.countDocuments({ status: 'permanent-resolved' }),
    User.countDocuments({ role: 'supervisor' }),
    User.countDocuments({ role: 'user' })
  ]);

  res.status(200).json({
    success: true,
    stats: {
      permanentResolved,
      activeSupervisors,
      registeredUsers
    }
  });
});