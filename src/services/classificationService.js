// services/classificationService.js
import fetch from 'node-fetch';

// Gradio two-step predict endpoint
const GRADIO_API_BASE = 'https://avatar77-wasteclassification.hf.space/gradio_api/call/predict';
const DEFAULT_TIMEOUT = 60000; // 60 seconds to allow cold starts

/**
 * Classify an image using the Hugging Face Gradio API.
 * Performs a POST to initiate prediction and a GET to fetch the results using the event_id.
 * @param {string} imageBase64 - Raw base64-encoded image data (no data URI prefix)
 * @returns {Promise<{ isWaste: boolean; label: string; confidence: number }>} Classification result
 */
export default async function classifyImage(imageBase64) {
  try {
    // 1️⃣ Initiate prediction: POST returns JSON with { event_id }
    const postResp = await fetch(GRADIO_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            name: 'upload.jpg',      // Placeholder filename
            data: imageBase64        // Raw base64 string
          }
        ]
      }),
      timeout: DEFAULT_TIMEOUT,
    });

    if (!postResp.ok) {
      const errBody = await postResp.text();
      console.error('HF POST error:', postResp.status, errBody);
      throw new Error(`HF_API_POST_ERROR: Status ${postResp.status}`);
    }

    const postJson = await postResp.json();
    const eventId = postJson.event_id;
    if (!eventId) {
      console.error('HF POST no event_id:', postJson);
      throw new Error('HF_API_POST_ERROR: No event_id in response');
    }

    // 2️⃣ Fetch prediction result: GET with event_id
    const getUrl = `${GRADIO_API_BASE}/${eventId}`;
    const getResp = await fetch(getUrl, { timeout: DEFAULT_TIMEOUT });
    if (!getResp.ok) {
      const errBody = await getResp.text();
      console.error('HF GET error:', getResp.status, errBody);
      throw new Error(`HF_API_GET_ERROR: Status ${getResp.status}`);
    }

    const resultJson = await getResp.json();
    if (!resultJson?.data || !Array.isArray(resultJson.data) || resultJson.data.length === 0) {
      console.error('HF GET invalid format:', resultJson);
      throw new Error('HF_API_GET_ERROR: Invalid result format');
    }

    const [label, confidence] = resultJson.data[0];
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
