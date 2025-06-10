// services/classificationService.js
import fetch from 'node-fetch';

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

  // ——— Setup timeout abort ———
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    // Strip any data URI prefix, then re-add as JPEG
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const dataURI = `data:image/jpeg;base64,${cleanBase64}`;

    // ——— Step 1: initiate prediction ———
    const initResponse = await fetch(`${GRADIO_API_URL}/call/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{ data: dataURI, meta: { _type: 'gradio.FileData' } }]
      }),
      signal: controller.signal
    });

    if (!initResponse.ok) {
      const text = await initResponse.text();
      console.error('Gradio init error:', text);
      throw new Error(`GRADIO_INIT_ERROR:${initResponse.status}`);
    }

    const initData = await initResponse.json();
    const eventId = initData.event_id;
    if (!eventId) {
      throw new Error('GRADIO_NO_EVENT_ID');
    }

    // ——— Step 2: poll for results ———
    const resultUrl = `${GRADIO_API_URL}/call/predict/${eventId}`;
    let resultData;
    const maxAttempts = 10;
    const pollInterval = 3000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, pollInterval));
      const pollRes = await fetch(resultUrl, { signal: controller.signal });
      if (!pollRes.ok) {
        console.error('Gradio poll error', await pollRes.text());
        throw new Error(`GRADIO_POLL_ERROR:${pollRes.status}`);
      }
      resultData = await pollRes.json();
      if (resultData.status === 'completed') break;
      if (resultData.status === 'failed') {
        throw new Error('GRADIO_PREDICTION_FAILED');
      }
    }

    if (!resultData || resultData.status !== 'completed') {
      throw new Error('GRADIO_TIMEOUT');
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
    // Abort / timeout
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }

    // Known error codes
    const known = [
      'GRADIO_INIT_ERROR', 'GRADIO_NO_EVENT_ID', 'GRADIO_POLL_ERROR',
      'GRADIO_PREDICTION_FAILED', 'GRADIO_TIMEOUT',
      'INVALID_RESPONSE', 'IMAGE_TOO_LARGE', 'INVALID_BASE64', 'TIMEOUT'
    ];
    if (known.some(code => err.message.includes(code))) {
      throw err;
    }

    console.error('Classification Error:', err);
    throw new Error('CLASSIFICATION_FAILED');
  } finally {
    clearTimeout(timeoutId);
  }
}
