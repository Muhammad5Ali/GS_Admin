// routes/classify.js
import express from 'express';
import classifyImage from '../services/classificationService.js';
import rateLimit from 'express-rate-limit';
import protectRoute from '../middleware/auth.middleware.js';
// Add authentication

const router = express.Router();
const HF_API_URL = 'https://avatar77-wasteclassification.hf.space/api/predict';
const HF_TIMEOUT = process.env.HF_TIMEOUT || 45000; // 45 seconds

// Rate limiting - 10 requests per minute
const classifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: JSON.stringify({
    error: 'Too many classification requests',
    message: 'Please try again later'
  }),
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', protectRoute, classifyLimiter, async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        error: 'No image provided',
        code: 'MISSING_IMAGE'
      });
    }

    const result = await classifyImage(image);
    res.status(200).json(result);
  } catch (error) {
    // Map errors to appropriate HTTP responses
    const errorCode = error.message.split(':')[0];
    const errorMap = {
      'INVALID_BASE64': [400, 'Invalid base64 image format'],
      'IMAGE_TOO_LARGE': [413, `Image exceeds 5MB limit`],
      'HF_SERVICE_ERROR': [502, 'Classification service error'],
      'INVALID_RESPONSE': [502, 'Invalid classification response'],
      'AbortError': [504, 'Classification timed out']
    };

    const [status, message] = errorMap[errorCode] || [500, 'Classification failed'];
    res.status(status).json({ 
      error: message,
      code: errorCode || 'INTERNAL_ERROR'
    });
  }
});

export default router;