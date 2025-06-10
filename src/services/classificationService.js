// services/classificationService.js
import fetch from 'node-fetch';
import https from 'https';

const GRADIO_API_URL = 'https://avatar77-wasteclassification.hf.space/gradio_api';
const DEFAULT_TIMEOUT = 45000; // 45 seconds for Gradio cold starts

export default async function classifyImage(imageBase64) {
  // ——— Validation ———
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    throw new Error('INVALID_BASE64');
  }
  const byteLength = Buffer.byteLength(imageBase64, 'base64');
  if (byteLength > 5 * 1024 * 1024) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  // Strip any data URI prefix, for both Gradio and fallback
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // ——— Setup timeout abort ———
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  // Custom HTTPS agent to bypass potential SSL issues
  const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

  try {
    // ——— Step 1: initiate prediction ———
    const dataURI = `data:image/jpeg;base64,${cleanBase64}`;
    const initResponse = await fetch(`${GRADIO_API_URL}/call/predict`, {
      method: 'POST',
      agent,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [dataURI] }),
      signal: controller.signal
    });

    if (!initResponse.ok) {
      const text = await initResponse.text();
      console.error('Gradio init error:', text);
      throw new Error(`GRADIO_INIT_ERROR:${initResponse.status}`);
    }

    const initData = await initResponse.json();
    const eventId = initData.event_id;
    if (!eventId) throw new Error('GRADIO_NO_EVENT_ID');

    // ——— Step 2: poll for results ———
    const resultUrl = `${GRADIO_API_URL}/call/predict/${eventId}`;
    let resultData;
    const maxAttempts = 10, pollInterval = 3000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, pollInterval));
      const pollRes = await fetch(resultUrl, { agent, signal: controller.signal });
      if (!pollRes.ok) {
        console.error('Gradio poll error:', await pollRes.text());
        throw new Error(`GRADIO_POLL_ERROR:${pollRes.status}`);
      }
      resultData = await pollRes.json();
      if (resultData.status === 'completed') break;
      if (resultData.status === 'failed') {
        throw new Error('GRADIO_PREDICTION_FAILED');
      }
    }

    // ——— Fallback if Gradio never completes ———
    if (!resultData || resultData.status !== 'completed') {
      console.warn('Gradio failed to complete, using local fallback');
      return localImageClassification(cleanBase64);
    }

    // ——— Process and validate output ———
    const outputItem = resultData.output?.data?.[0]?.[0];
    if (!outputItem || !outputItem.label || outputItem.confidence == null) {
      console.error('Invalid Gradio response:', resultData);
      throw new Error('INVALID_RESPONSE');
    }

    const { label, confidence } = outputItem;
    console.log(`Classification: ${label} (${confidence.toFixed(2)})`);

    return {
      isWaste: label === 'Waste',
      label,
      confidence
    };

  } catch (err) {
    // ——— Error mapping ———
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT:Classification timed out');
    }
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      throw new Error('SERVICE_DOWN:Classification service is offline');
    }
    if (err.message.includes('Unexpected token')) {
      throw new Error('INVALID_RESPONSE:Invalid JSON response');
    }

    console.error('Classification Error:', err);

    // ——— Try local fallback on any failure ———
    try {
      console.warn('Primary classification error, falling back locally');
      return localImageClassification(cleanBase64);
    } catch (fallbackErr) {
      // If fallback also fails, rethrow original
      throw err;
    }

  } finally {
    clearTimeout(timeoutId);
  }
}


// ——— Local fallback classifier ———
// (Simple pixel-based heuristic; replace with your on-device model)
async function localImageClassification(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  const greenThreshold = 100, brownThreshold = 150;
  let greenCount = 0, brownCount = 0;

  for (let i = 0; i + 2 < buffer.length; i += 4) {
    const r = buffer[i], g = buffer[i + 1], b = buffer[i + 2];
    if (g > r + 30 && g > b + 30) greenCount++;
    if (r > brownThreshold && g > brownThreshold - 40 && b < brownThreshold - 40) brownCount++;
  }

  const isWaste = brownCount > greenCount;
  const label = isWaste ? 'Waste (fallback)' : 'Non-waste (fallback)';
  const confidence = isWaste ? 0.85 : 0.75;

  console.log(`Local fallback: ${label} (${confidence.toFixed(2)})`);
  return { isWaste, label, confidence };
}
