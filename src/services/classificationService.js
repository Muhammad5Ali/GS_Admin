// services/classificationService.js
import fetch from 'node-fetch';
import { Client } from "@gradio/client";

//const GRADIO_API_BASE = 'https://avatar77-wasteclassification.hf.space/api';  // ✅ Correct base URL
const DEFAULT_TIMEOUT = 60000; // 60s for cold starts

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
      
      if (result.status === 'COMPLETE') {
        return result;
      }
      
      // Wait before polling again
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
  const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  try {
    const client = await Client.connect(
      "avatar77/wasteclassification",
      { timeout: DEFAULT_TIMEOUT }
    );

    // Convert base64 to Buffer
    const buffer = Buffer.from(rawBase64, 'base64');
    
    // Wrap client.predict with timeout
    const predictionPromise = client.predict("/predict", [buffer]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), DEFAULT_TIMEOUT)
    );

    const result = await Promise.race([predictionPromise, timeoutPromise]);
    
    // Validate response
    if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('INVALID_RESPONSE: Unexpected API response');
    }

    const [label, confidence] = result.data;
    return {
      isWaste: String(label).toLowerCase().includes('waste'),
      label: String(label),
      confidence: parseFloat(confidence),
    };
  } catch (err) {
    console.error('Classification failed:', err);
    throw new Error(`SERVICE_DOWN: ${err.message}`);
  }
}
