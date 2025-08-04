import express from 'express';
import User from '../models/User.js';

const router = express.Router();




router.get('/top-reporters', async (req, res) => {
  try {
    // Get users with their actual active report counts
    const topReporters = await User.aggregate([
      {
        $match: { role: 'user' }
      },
      {
        $lookup: {
          from: "reports",
          localField: "_id",
          foreignField: "user",
          as: "reports"
        }
      },
      {
        $addFields: {
          actualReportCount: { $size: "$reports" }
        }
      },
      {
        $sort: { actualReportCount: -1, points: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          username: 1,
          profileImage: 1,
          reportCount: "$actualReportCount",
          points: 1,
          _id: 1
        }
      }
    ]);

    res.json(topReporters);
  } catch (error) {
    console.error('Error fetching top reporters:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

export default router;