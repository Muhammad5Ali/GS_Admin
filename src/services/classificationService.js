// services/classificationService.js
import fetch from 'node-fetch';

const GRADIO_API_BASE = 'https://avatar77-wasteclassification.hf.space/api';  // ✅ Correct base URL
const DEFAULT_TIMEOUT = 60000; // 60s for cold starts

/**
 * Low-level helper: POST to /predict then GET /predict/{event_id}
 * with full debug logging of both raw responses.
 *
 * @param {string} rawBase64  – the pure base64 string (no data URI prefix)
 * @returns {Promise<any>}    – the full JSON payload from Gradio
 */
async function callGradioAPI(rawBase64) {
  // 1️⃣ Kick off the prediction
  const postUrl = `${GRADIO_API_BASE}/predict`;
  console.log(`Gradio POST → ${postUrl}`);
  const postResp = await fetch(postUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        {
          name: 'upload.jpg',
          data: [rawBase64]
        }
      ]
    }),
    timeout: DEFAULT_TIMEOUT
  });

  if (!postResp.ok) {
    const body = await postResp.text();
    console.error('Gradio POST failed:', postResp.status, body);
    throw new Error(`HF_API_POST_ERROR: ${postResp.status}`);
  }

  const postJson = await postResp.json();
  console.log('Gradio POST response:', postJson);

  const eventId = postJson.event_id;
  if (!eventId) {
    console.error('No event_id in POST response:', postJson);
    throw new Error('HF_API_POST_ERROR: Missing event_id');
  }

  // 2️⃣ Fetch the prediction result
  const getUrl = `${postUrl}/${eventId}`;
  console.log(`Gradio GET → ${getUrl}`);
  const getResp = await fetch(getUrl, { timeout: DEFAULT_TIMEOUT });

  if (!getResp.ok) {
    const body = await getResp.text();
    console.error('Gradio GET failed:', getResp.status, body);
    throw new Error(`HF_API_GET_ERROR: ${getResp.status}`);
  }

  const getJson = await getResp.json();
  console.log('Gradio GET response:', getJson);
  return getJson;
}

/**
 * Public classifier: validates your input, calls Gradio, and
 * returns a normalized `{ isWaste, label, confidence }`.
 *
 * @param {string} imageBase64  – a data URI or raw base64 string
 * @returns {Promise<{isWaste:boolean,label:string,confidence:number}>}
 */
export default async function classifyImage(imageBase64) {
  try {
    // Normalize: strip “data:image/...;base64,” if present
    let rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    if (!rawBase64) {
      throw new Error('INVALID_BASE64: missing data.');
    }

    // Call the Gradio API
    const resultJson = await callGradioAPI(rawBase64);

    // Validate structure
    if (!Array.isArray(resultJson.data) || resultJson.data.length === 0) {
      console.error('Invalid Gradio data:', resultJson);
      throw new Error('INVALID_RESPONSE');
    }

    // After receiving resultJson:
const [label, confidence] = resultJson.data[0]; // ✅ Ensure it's an array
    return {
      isWaste: String(label).toLowerCase() === 'waste',
      label: String(label),
      confidence: parseFloat(confidence)
    };

  } catch (err) {
    console.error('Classification failed:', err.message || err);
    throw new Error('SERVICE_DOWN: Waste verification unavailable');
  }
}
