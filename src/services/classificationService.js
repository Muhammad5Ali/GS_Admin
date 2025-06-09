import fetch from 'node-fetch';
import FormData from 'form-data';

const HF_API_URL = 'https://avatar77-wasteclassification.hf.space/api/predict';
const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 2;

/**
 * Classifies a base64 image using Hugging Face API
 * @param {string} imageBase64 - Base64-encoded image
 * @returns {Promise<{isWaste: boolean, confidence: number, label: string}>}
 */
export default async function classifyImage(imageBase64) {
  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!base64Regex.test(imageBase64)) {
    throw new Error('INVALID_BASE64');
  }

  // Check image size (5MB max)
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const MAX_SIZE = 5 * 1024 * 1024;
  if (imageBuffer.length > MAX_SIZE) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  const formData = new FormData();
  formData.append('file', imageBuffer, {
    filename: 'waste.jpg',
    contentType: 'image/jpeg'
  });

  let retries = 0;

  async function attemptClassification() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    try {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HF_SERVICE_ERROR: ${errorData.error || response.status}`);
      }

      const result = await response.json();

      if (!result.data || !Array.isArray(result.data) || !result.data[0]?.label) {
        throw new Error('INVALID_RESPONSE');
      }

      const topResult = result.data[0];

      return {
        isWaste: topResult.label === "Waste",
        confidence: parseFloat(topResult.confidence) || 0,
        label: topResult.label
      };
    } catch (error) {
      if (error.message.includes('loading') && retries < MAX_RETRIES) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        return attemptClassification();
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return attemptClassification();
}
