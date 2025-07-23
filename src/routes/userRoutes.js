import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET top reporters with positional ranking
// router.get('/top-reporters', async (req, res) => {
//   try {
//     // Fetch top 10 reporters sorted by reportCount (desc) then points (desc)
//     const topReporters = await User.find({ role: 'user' })
//       .sort({ reportCount: -1, points: -1 })
//       .limit(10)
//       .select('username profileImage reportCount points _id')
//       .lean();

//     // Add positional rank to each reporter
//     const reportersWithRank = topReporters.map((reporter, index) => ({
//       ...reporter,
//       rank: index + 1  // 1-based ranking
//     }));

//     res.json(reportersWithRank);
//   } catch (error) {
//     console.error('Error fetching top reporters:', error);
//     res.status(500).json({ 
//       message: 'Server error',
//       error: error.message 
//     });
//   }
// });


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