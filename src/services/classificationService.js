// services/classificationService.js
import fetch from 'node-fetch';

console.log(`Using model: avatar77/mobilenetv3`);

const DEFAULT_TIMEOUT = 60000;
const MIN_CONFIDENCE = 0.65;
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
// const HF_API_URL = 'https://avatar77-mobilenetv3.hf.space/api/predict';
const HF_API_URL = 'https://avatar77-mobilenetv3.hf.space/gradio_api/call/predict';
const MAX_RETRIES = 3;

export default async function classifyImage(imageBase64) {
  const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  let retryCount = 0;

  async function attemptClassification() {
    // Declare responseClone at function scope for error handling
    let responseClone;
    
    try {
      console.log("Calling Gradio API (attempt " + (retryCount + 1) + ")");

      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [rawBase64], // Send pure base64 without prefix
           fn_index: 0 
        }),
        timeout: DEFAULT_TIMEOUT
      });

      // Clone response immediately for error handling
      responseClone = response.clone();
      const responseText = await response.text();

      if (!response.ok) {
        const error = new Error(`API_ERROR: ${response.status} - ${responseText}`);
        error.details = {
          status: response.status,
          text: responseText
        };
        throw error;
      }

      const result = JSON.parse(responseText);
      console.log("Raw API response:", JSON.stringify(result, null, 2));

      // Handle both response formats
      let label, confidenceValue;

      // New format: {label: "Waste", confidence: 0.95}
      if (result.label && typeof result.confidence === 'number') {
        label = result.label;
        confidenceValue = result.confidence;
      } 
      // Old format: {data: [["Waste", "0.95"]]}
      else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        const prediction = result.data[0];
        if (Array.isArray(prediction) && prediction.length >= 2) {
          label = prediction[0];
          confidenceValue = prediction[1];
        } else {
          throw new Error(`INVALID_RESPONSE: Malformed prediction array`);
        }
      }
      // Error case
      else {
        throw new Error(`INVALID_RESPONSE: ${JSON.stringify(result)}`);
      }

      const confidence = parseFloat(confidenceValue);
      if (isNaN(confidence)) {
        throw new Error(`INVALID_CONFIDENCE: ${confidenceValue}`);
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
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Retrying in ${delay/1000}s due to error:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attemptClassification();
      }

      // Enhanced error logging with responseClone access
      let errorDetails = {
        message: err.message,
        stack: err.stack
      };

      if (err.details) {
        errorDetails.responseStatus = err.details.status;
        errorDetails.responseText = err.details.text;
      } else if (responseClone) {
        try {
          errorDetails.responseStatus = responseClone.status;
          errorDetails.responseText = await responseClone.text();
        } catch (parseErr) {
          errorDetails.responseParseError = parseErr.message;
        }
      }

      console.error('Classification failed:', errorDetails);
      
      let errorMessage = 'SERVICE_DOWN: ';
      errorMessage += err.message || JSON.stringify(err);
      throw new Error(errorMessage);
    }
  }

  return attemptClassification();
}