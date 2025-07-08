import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET top reporters with positional ranking
router.get('/top-reporters', async (req, res) => {
  try {
    // Fetch top 10 reporters sorted by reportCount (desc) then points (desc)
    const topReporters = await User.find()
      .sort({ reportCount: -1, points: -1 })
      .limit(10)
      .select('username profileImage reportCount points _id')
      .lean();

    // Add positional rank to each reporter
    const reportersWithRank = topReporters.map((reporter, index) => ({
      ...reporter,
      rank: index + 1  // 1-based ranking
    }));

    res.json(reportersWithRank);
  } catch (error) {
    console.error('Error fetching top reporters:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

export default router;