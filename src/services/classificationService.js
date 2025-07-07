// services/classificationService.js
import fetch from 'node-fetch';

console.log(`Using model: avatar77/mobilenetv3`);

const DEFAULT_TIMEOUT = 60000;
const MIN_CONFIDENCE = 0.65;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const HF_API_URL = 'https://avatar77-mobilenetv3.hf.space/run/predict';

export default async function classifyImage(imageBase64) {
  const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    console.log("Calling Gradio API directly");

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [
          {
            data: `data:image/jpeg;base64,${rawBase64}`,
            name: "uploaded_image.jpg",
            is_file: false
          }
        ]
      }),
      timeout: DEFAULT_TIMEOUT
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API_ERROR: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Raw API response:", JSON.stringify(result, null, 2));

    // Validate response structure
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error(`INVALID_RESPONSE: Empty data array`);
    }

    const prediction = result.data[0];
    if (!Array.isArray(prediction)) {
      throw new Error(`INVALID_RESPONSE: Expected array for prediction`);
    }
    if (prediction.length < 2) {
      throw new Error(`INVALID_RESPONSE: Prediction array too short`);
    }

    const [label, confidenceStr] = prediction;
    const confidence = parseFloat(confidenceStr);
    
    if (isNaN(confidence)) {
      throw new Error(`INVALID_CONFIDENCE: ${confidenceStr}`);
    }

    const labelLower = label.toLowerCase();
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
    
    if (err.message) {
      errorMessage += err.message;
    } else {
      errorMessage += JSON.stringify(err);
    }
    
    throw new Error(errorMessage);
  }
}