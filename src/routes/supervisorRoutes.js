import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { resolveReport } from "../controllers/supervisorController.js";

const router = express.Router();

// Middleware to check supervisor role
const isSupervisor = (req, res, next) => {
  if (req.user.role !== 'supervisor') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Get pending reports
router.get('/reports/pending', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username profileImage');

    const totalPending = await Report.countDocuments({ status: 'pending' });

    res.json({
      reports,
      currentPage: page,
      totalPending,
      totalPages: Math.ceil(totalPending / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update report status
router.put('/reports/:id/status', isAuthenticated, isSupervisor, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status === 'resolved') {
      return res.status(400).json({ 
        message: 'Use the resolve endpoint to resolve reports' 
      });
    }
    
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
router.put('/reports/:id/resolve', isAuthenticated, isSupervisor, resolveReport);

export default router;