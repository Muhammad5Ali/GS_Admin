// services/classificationService.js
import fetch from 'node-fetch';
import { Client } from "@gradio/client";

// 📣 Log the model name as soon as this module is loaded
console.log(`Using model: avatar77/wasteclassification`);

const DEFAULT_TIMEOUT = 60000; // 60s for cold starts
const MIN_CONFIDENCE = 0.6;    // 60% confidence threshold

/**
 * Low-level helper: POST to /predict then GET /predict/{event_id}
 * with full debug logging of both raw responses.
 *
 * @param {string} rawBase64  – the pure base64 string (no data URI prefix)
 * @returns {Promise<any>}    – the full JSON payload from Gradio
 */
async function callGradioAPI(rawBase64) {
  const GRADIO_API_BASE = 'https://avatar77-wasteclassification.hf.space';
  const postUrl = `${GRADIO_API_BASE}/gradio_api/call/predict`;
  
  try {
    // 1. Start prediction
    const postResp = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            path: `data:image/jpeg;base64,${rawBase64}`,
            meta: { _type: "gradio.FileData" }
          }
        ]
      }),
      timeout: DEFAULT_TIMEOUT
    });

    if (!postResp.ok) {
      throw new Error(`HF_API_POST_ERROR: ${postResp.status}`);
    }

    const postData = await postResp.json();
    const eventId = postData.event_id;
    
    if (!eventId) {
      throw new Error('HF_API_ERROR: Missing event_id');
    }

    // 2. Fetch prediction result
    const getUrl = `${postUrl}/${eventId}`;
    const startTime = Date.now();
    
    while (Date.now() - startTime < DEFAULT_TIMEOUT) {
      const getResp = await fetch(getUrl);
      if (!getResp.ok) {
        throw new Error(`HF_API_GET_ERROR: ${getResp.status}`);
      }

      const result = await getResp.json();
      console.log("Raw Gradio GET response:", JSON.stringify(result, null, 2));

      if (result.status === 'COMPLETE') {
        return result;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('HF_API_TIMEOUT: Prediction took too long');
  } catch (err) {
    console.error('Gradio API Error:', err);
    throw new Error(`HF_API_ERROR: ${err.message}`);
  }
}


/**
 * Public classifier: validates your input, calls Gradio, and
 * returns a normalized `{ isWaste, label, confidence }`.
 *
 * @param {string} imageBase64  – a data URI or raw base64 string
 * @returns {Promise<{isWaste:boolean,label:string,confidence:number}>}
 */
export default async function classifyImage(imageBase64) {
  // 1) Strip out the data URI prefix
  const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    // 2) Connect to Gradio client
    const client = await Client.connect(
      "avatar77/wasteclassification",
      { timeout: DEFAULT_TIMEOUT }
    );
    console.log("Connected to Gradio client");

    // 3) Convert base64 to Buffer
    const buffer = Buffer.from(rawBase64, 'base64');

    // 4) Perform prediction and unpack
    try {
      const result = await client.predict("/predict", { img: buffer });
      console.log("Raw Gradio response:", JSON.stringify(result, null, 2));

      // NEW: Handle the actual response format
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        throw new Error(`INVALID_RESPONSE: Empty data array`);
      }

      const prediction = result.data[0];
      if (!prediction || typeof prediction !== 'object') {
        throw new Error(`INVALID_RESPONSE: Expected object in data array`);
      }

      const label = prediction.label || "Unknown";
      const confidence = prediction.confidence || 0;

      const isWaste = String(label).toLowerCase().includes('waste') &&
                      parseFloat(confidence) >= MIN_CONFIDENCE;

      console.log(`Classification: ${label} (${confidence}) - Waste: ${isWaste}`);

      // 5) Return normalized output with confidence threshold
      return {
        isWaste,
        label: String(label),
        confidence: parseFloat(confidence),
      };

    } catch (predictionErr) {
      console.error("Prediction failed:", predictionErr);
      throw new Error(`PREDICTION_ERROR: ${predictionErr.message}`);
    }

  } catch (err) {
    console.error('Classification failed (service down or connect error):', err);
    throw new Error(`SERVICE_DOWN: ${err.message}`);
  }
}
