// services/classificationService.js
import fetch from 'node-fetch';

//const HF_API_URL = 'https://api-inference.huggingface.co/models/avatar77/wasteclassification';
const HF_API_URL = 'https://api-inference.huggingface.co/models/avatar77/wasteclassification';
const DEFAULT_TIMEOUT = 20000; // Increased to 20s for cold starts

/**
 * Classifies a base64-encoded image using a Hugging Face model.
 * @param {string} imageBase64 - The image in base64 encoding.
 * @returns {Promise<{ isWaste: boolean, label: string, confidence: number }>}
 */
export default async function classifyImage(imageBase64) {
  // Validate base64 format
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    throw new Error('INVALID_BASE64');
  }

  // Check size limit (5MB)
  const byteLength = Buffer.byteLength(imageBase64, 'base64');
  if (byteLength > 5 * 1024 * 1024) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
       const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        'Content-Type': 'application/json',
      },
     body: JSON.stringify({ 
        inputs: cleanBase64, // Use clean base64 without header
        options: { wait_for_model: true } // Critical for cold starts
      }),
      signal: controller.signal
    });
      // Handle model loading explicitly
    if (res.status === 503) {
      const errorData = await res.json();
      if (errorData.error && /loading|starting/i.test(errorData.error)) {
        throw new Error('MODEL_LOADING');
      }
    }

    // Handle 503 model loading message
    if (res.status === 503) {
      const errorData = await res.json();
      if (errorData.error && /loading/i.test(errorData.error)) {
        throw new Error('MODEL_LOADING');
      }
    }

    // Handle other non-OK responses
    if (!res.ok) {
      const txt = await res.text();
      console.error(`HF API Error ${res.status}:`, txt);

      const code = res.status === 503 ? 'MODEL_LOADING'
                 : res.status === 401 ? 'UNAUTHORIZED'
                 : 'HF_SERVICE_ERROR';
      throw new Error(`${code}:${res.status}`);
    }

    // Parse and validate response
    const json = await res.json();
    const { label, score } = Array.isArray(json)
      ? json[0]
      : { label: json.label, score: json.score || json[0]?.score };

    if (!label) {
      console.error('Invalid HF response:', json);
      throw new Error('INVALID_RESPONSE');
    }

    const confidence = parseFloat(score) || 0;
    console.log(`Classification: ${label} (${confidence.toFixed(2)})`);

    return {
      isWaste: label === 'Waste',
      label,
      confidence
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }

    const knownErrors = [
      'MODEL_LOADING', 'UNAUTHORIZED', 'HF_SERVICE_ERROR',
      'INVALID_RESPONSE', 'IMAGE_TOO_LARGE', 'INVALID_BASE64', 'TIMEOUT'
    ];

    if (knownErrors.some(e => err.message.includes(e))) {
      throw err;
    }

    console.error('Classification Error:', err);
    throw new Error('CLASSIFICATION_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }
}
