// routes/classify.js
import express from 'express';
import classifyImage from '../services/classificationService.js';
import rateLimit from 'express-rate-limit';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();
const HF_API_URL = 'https://avatar77-mobilenetv3.hf.space/gradio_api/call/predict';
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

// Health check endpoint
router.get('/health', async (req, res) => {
  const start = Date.now();
  try {
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    // Timeout after 10 seconds
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    
    const result = await classifyImage(testImage);
    
    // ✅ Verify expected model version
    if (result.modelVersion !== "mobilenetv3-1.0") {
      throw new Error('WRONG_MODEL_VERSION');
    }
    
    res.json({
      status: 'operational',
      responseTime: `${Date.now() - start}ms`,
      gradioWorking: true,
      modelVersion: result.modelVersion  // Return model version
    });
  } catch (error) {
    // Handle specific model version error
    if (error.message === 'WRONG_MODEL_VERSION') {
      return res.status(500).json({
        status: 'degraded',
        responseTime: `${Date.now() - start}ms`,
        error: 'Wrong model version detected',
        gradioWorking: true,
        actualVersion: result?.modelVersion || 'unknown'
      });
    }
    
    res.status(500).json({
      status: 'degraded',
      responseTime: `${Date.now() - start}ms`,
      error: error.message,
      gradioWorking: false
    });
  }
});

// Test classification endpoint
router.post('/test', async (req, res) => {
  try {
    const { image } = req.body;
    const result = await classifyImage(image);
    res.json(result);
  } catch (error) {
    console.error('Classification test error:', error);
    res.status(500).json({ 
      error: 'Classification failed',
      details: error.message
    });
  }
});

// Status check endpoint
router.get('/status', async (req, res) => {
  try {
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    await classifyImage(testImage);
    res.json({ status: 'operational' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

// Main classification endpoint
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
      'SERVICE_DOWN': [503, 'Classification service is offline'],
      'INVALID_RESPONSE': [502, 'Invalid classification response'],
      'TIMEOUT': [504, 'Classification timed out'],
      'SERVICE_ERROR': [500, 'Classification service error']
    };

    // Add fallback for unmapped errors
    const [status, message] = errorMap[errorCode] || [500, error.message.split(':')[1] || 'Classification failed'];
    res.status(status).json({ 
      error: message,
      code: errorCode || 'INTERNAL_ERROR'
    });
  }
});

export default router;