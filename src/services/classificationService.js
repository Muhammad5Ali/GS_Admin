// services/classificationService.js
import fetch from 'node-fetch';
import { Client } from "@gradio/client";

// 📣 Log the model name as soon as this module is loaded
console.log(`Using model: avatar77/wasteclassification`);

const DEFAULT_TIMEOUT = 60000; // 60s for cold starts
const MIN_CONFIDENCE = 0.65;    // ⬆️ Updated to 65%
const HIGH_CONFIDENCE_THRESHOLD = 0.85; // ⬇️ Updated to 85%

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
    const client = await Client.connect("avatar77/wasteclassification", {
      timeout: DEFAULT_TIMEOUT
    });
    console.log("Connected to Gradio client");

    const buffer = Buffer.from(rawBase64, 'base64');
    const result = await client.predict("/predict", { img: buffer });

    console.log("Raw Gradio response:", JSON.stringify(result, null, 2));

    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error(`INVALID_RESPONSE: Empty data array`);
    }

    const prediction = result.data[0];
    if (!prediction || typeof prediction !== 'object') {
      throw new Error(`INVALID_RESPONSE: Expected object in data array`);
    }

    const label = prediction.label || "Unknown";
    const confidence = prediction.confidence || 0;
    const labelLower = label.toLowerCase();

    let verification = "unverified";
    if (labelLower.includes('waste')) {
      if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        verification = "high_confidence";
      } else if (confidence >= MIN_CONFIDENCE) {
        verification = "medium_confidence";
      }
    }

    const isWaste = verification !== "unverified";

    const isHighConfidence = confidence >= HIGH_CONFIDENCE_THRESHOLD;
    const isVerifiedWaste = labelLower.includes('waste') && isHighConfidence;

    const needsImprovement =
      (labelLower.includes('waste') && confidence > 0.7 && confidence < 0.85) ||
      (confidence > 0.9 && !labelLower.includes('waste'));

    console.log(`Classification: ${label} (${confidence}) - Verification: ${verification}`);

    return {
      isWaste,
      label: String(label),
      confidence: parseFloat(confidence),
      verification,
      isHighConfidence,
      isVerifiedWaste,
      modelVersion: "1.0",
      needsImprovement
    };

  } catch (err) {
    console.error('Classification failed:', err);
    throw new Error(`SERVICE_DOWN: ${err.message}`);
  }
}
