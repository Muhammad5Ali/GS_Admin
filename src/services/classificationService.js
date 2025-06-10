// services/classificationService.js
import fetch from 'node-fetch';

// const GRADIO_API_URL = 'https://avatar77-wasteclassification.hf.space/api';

  const GRADIO_API_URL =  'https://avatar77-wasteclassification.hf.space/gradio_api/call/predict';
const DEFAULT_TIMEOUT = 45000; // 45 seconds for Gradio cold starts

export default async function classifyImage(imageBase64) {
  try {
    const response = await fetch(`${GRADIO_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [imageBase64] }),
      timeout: DEFAULT_TIMEOUT
    });

    if (!response.ok) {
      throw new Error(`HF_API_ERROR: Status ${response.status}`);
    }

    const result = await response.json();

    if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('INVALID_RESPONSE: No classification data returned');
    }

    const [label, confidence] = result.data[0];

    return {
      isWaste: label.toLowerCase() === 'waste',
      label,
      confidence: parseFloat(confidence)
    };
  } catch (error) {
    console.error('Classification failed:', error.message || error);
    throw new Error('SERVICE_DOWN: Waste verification service unavailable');
  }
}
