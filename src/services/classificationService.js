// services/classificationService.js
import fetch from 'node-fetch';
import { Client } from "@gradio/client";

// 📣 Update model name
console.log(`Using model: avatar77/mobilenetv3`);

const DEFAULT_TIMEOUT = 60000; // 60s for cold starts
const MIN_CONFIDENCE = 0.65;    // Minimum confidence for waste classification
const HIGH_CONFIDENCE_THRESHOLD = 0.85; // High confidence threshold

/**
 * Low-level helper: POST to /predict then GET /predict/{event_id}
 * (not used currently, but can be reused for fallback or debugging)
 */
async function callGradioAPI(rawBase64) {
  const GRADIO_API_BASE = 'https://avatar77-wasteclassification.hf.space';
  const postUrl = `${GRADIO_API_BASE}/gradio_api/call/predict`;

  try {
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

    if (!postResp.ok) throw new Error(`HF_API_POST_ERROR: ${postResp.status}`);
    const postData = await postResp.json();
    const eventId = postData.event_id;

    if (!eventId) throw new Error('HF_API_ERROR: Missing event_id');

    const getUrl = `${postUrl}/${eventId}`;
    const startTime = Date.now();

    while (Date.now() - startTime < DEFAULT_TIMEOUT) {
      const getResp = await fetch(getUrl);
      if (!getResp.ok) throw new Error(`HF_API_GET_ERROR: ${getResp.status}`);
      const result = await getResp.json();

      console.log("Raw Gradio GET response:", JSON.stringify(result, null, 2));

      if (result.status === 'COMPLETE') return result;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('HF_API_TIMEOUT: Prediction took too long');
  } catch (err) {
    console.error('Gradio API Error:', err);
    throw new Error(`HF_API_ERROR: ${err.message}`);
  }
}

/**
 * Classify an image using Gradio + Hugging Face API.
 * Adds confidence thresholds and verification level.
 *
 * @param {string} imageBase64 – data URI or base64 string
 * @returns {Promise<{
 *   isWaste: boolean,
 *   label: string,
 *   confidence: number,
 *   verification: string,
 *   isHighConfidence: boolean,
 *   isVerifiedWaste: boolean,
 *   modelVersion: string,
 *   needsImprovement: boolean
 * }>}
 */
export default async function classifyImage(imageBase64) {
  const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    const client = await Client.connect("avatar77/mobilenetv3", {
      timeout: DEFAULT_TIMEOUT
    });
    console.log("Connected to Gradio client");

    // Create a file-like object with proper Gradio FileData format
    const fileData = {
      data: `data:image/jpeg;base64,${rawBase64}`,
      name: "uploaded_image.jpg",
      is_file: false,
      meta: {
        _type: "gradio.FileData"
      }
    };

    // Send the file data to the model
    const result = await client.predict("/predict", [fileData]);

    console.log("Raw Gradio response:", JSON.stringify(result, null, 2));

    // Validate response structure
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error(`INVALID_RESPONSE: Empty data array`);
    }

    // Extract prediction array [label, confidence]
    const prediction = result.data[0];
    if (!Array.isArray(prediction)) {
      throw new Error(`INVALID_RESPONSE: Expected array for prediction`);
    }
    if (prediction.length < 2) {
      throw new Error(`INVALID_RESPONSE: Prediction array too short`);
    }

    const [label, confidenceStr] = prediction;
    const confidence = parseFloat(confidenceStr);
    
    // Validate confidence value
    if (isNaN(confidence)) {
      throw new Error(`INVALID_CONFIDENCE: ${confidenceStr}`);
    }

    const labelLower = label.toLowerCase();

    // Determine verification level
    let verification = "unverified";
    const isWaste = labelLower.includes('waste');
    
    if (isWaste) {
      if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        verification = "high_confidence";
      } else if (confidence >= MIN_CONFIDENCE) {
        verification = "medium_confidence";
      }
    }

    console.log(`Classification: ${label} (${confidence.toFixed(4)}) - Verification: ${verification}`);

    return {
      isWaste: verification !== "unverified",
      label: String(label),
      confidence,
      verification,
      isHighConfidence: confidence >= HIGH_CONFIDENCE_THRESHOLD,
      isVerifiedWaste: isWaste && confidence >= HIGH_CONFIDENCE_THRESHOLD,
      modelVersion: "mobilenetv3-1.0",
      needsImprovement: confidence > 0.7 && confidence < 0.85
    };

  } catch (err) {
    console.error('Classification failed:', err);
    
    // Enhanced error logging
    let errorMessage = 'SERVICE_DOWN: ';
    
    if (err.original_msg) {
      errorMessage += err.original_msg;
    } else if (err.message) {
      errorMessage += err.message;
    } else {
      errorMessage += JSON.stringify(err);
    }
    
    throw new Error(errorMessage);
  }
}