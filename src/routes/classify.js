// routes/classify.js
import express from 'express';
import fetch from 'node-fetch';
import FormData from 'form-data';

const router = express.Router();
const HF_API_URL = 'https://avatar77-wasteclassification.hf.space/api/predict';

router.post('/', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');
    
    const formData = new FormData();
    // Hugging Face expects the field name to be 'file'
    formData.append('file', imageBuffer, {
      filename: 'waste.jpg',
      contentType: 'image/jpeg'
    });

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face API error: ${response.status} - ${errorText}`);
      return res.status(500).json({ 
        error: 'Classification service unavailable',
        details: errorText.substring(0, 100) // Limit error message size
      });
    }

    const result = await response.json();
    
    // Parse model response - adjust based on actual response format
    // Your model returns an array: ["waste"] or ["non-waste"]
    const prediction = result.data[0].toLowerCase();
    const isWaste = prediction.includes('waste');
    
    res.status(200).json({ isWaste });
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ 
      error: 'Classification failed',
      details: error.message 
    });
  }
});

export default router;
