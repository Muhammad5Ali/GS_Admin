// services/classificationService.js
import fetch from 'node-fetch';

const HF_API_URL = 'https://api-inference.huggingface.co/models/avatar77/wasteclassification';
const DEFAULT_TIMEOUT = 15000;  // give a bit more time for model warm-up

/**
 * Classifies a base64 image using Hugging Face Inference API
 * @param {string} imageBase64 - Base64-encoded image (no data: prefix)
 * @returns {Promise<{isWaste: boolean, confidence: number, label: string}>}
 */
export default async function classifyImage(imageBase64) {
  // 1) Validate base64 format
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    throw new Error('INVALID_BASE64');
  }

  // 2) Check size (5MB max)
  const byteLength = Buffer.byteLength(imageBase64, 'base64');
  if (byteLength > 5 * 1024 * 1024) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  // 3) Set up abort & timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    // 4) Call the HF Inference API
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: imageBase64 }),
      signal: controller.signal
    });

    // 5) Handle non-200
    if (!res.ok) {
      const txt = await res.text();
      console.error(`HF Inference API returned ${res.status}:`, txt);
      const code = res.status === 503 ? 'MODEL_LOADING'
                 : res.status === 401 ? 'UNAUTHORIZED'
                 : 'HF_SERVICE_ERROR';
      throw new Error(`${code}:${res.status}`);
    }

    // 6) Parse JSON
    const json = await res.json();
    // HF might return an array of labels+scores, or an object { label, score }
    const { label, score } = Array.isArray(json)
      ? json[0]
      : { label: json.label, score: json.score || json[0]?.score };

    if (!label) {
      console.error('Invalid HF response shape:', json);
      throw new Error('INVALID_RESPONSE');
    }

    // 7) Return normalized
    return {
      isWaste: label === 'Waste',
      label,
      confidence: parseFloat(score) || 0
    };

  } catch (err) {
    // 8) Map certain errors to actionable messages
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    // propagate our own codes
    if (/MODEL_LOADING|UNAUTHORIZED|HF_SERVICE_ERROR|INVALID_RESPONSE|IMAGE_TOO_LARGE|INVALID_BASE64|TIMEOUT/.test(err.message)) {
      throw err;
    }
    console.error('Unexpected classification error:', err);
    throw new Error('CLASSIFICATION_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }
}
