// services/classificationService.js
import fetch from 'node-fetch';

// Gradio two-step predict endpoint
const GRADIO_API_BASE = 'https://avatar77-wasteclassification.hf.space/gradio_api/call/predict';
const DEFAULT_TIMEOUT = 45000; // 45 seconds for Gradio cold starts

export default async function classifyImage(imageBase64) {
  try {
    // 1️⃣ POST request to initiate prediction
    const postResp = await fetch(GRADIO_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [imageBase64] }),
      timeout: DEFAULT_TIMEOUT,
    });

    if (!postResp.ok) {
      throw new Error(`HF_API_POST_ERROR: Status ${postResp.status}`);
    }

    // Gradio returns an event ID as raw text
    const eventId = await postResp.text();
    if (!eventId) {
      throw new Error('HF_API_POST_ERROR: No event ID returned');
    }

    // 2️⃣ GET request to fetch the actual classification
    const getUrl = `${GRADIO_API_BASE}/${eventId.trim()}`;
    const getResp = await fetch(getUrl, { timeout: DEFAULT_TIMEOUT });

    if (!getResp.ok) {
      throw new Error(`HF_API_GET_ERROR: Status ${getResp.status}`);
    }

    const result = await getResp.json();
    if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('HF_API_GET_ERROR: Invalid result format');
    }

    const [label, confidence] = result.data[0];
    return {
      isWaste: String(label).toLowerCase() === 'waste',
      label: String(label),
      confidence: parseFloat(confidence),
    };
  } catch (error) {
    console.error('Classification failed:', error.message || error);
    throw new Error('SERVICE_DOWN: Waste verification service unavailable');
  }
}
