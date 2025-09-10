# GreenSnap AI — Backend (MobileNetV3 Variant)

**Repository:** https://github.com/Muhammad5Ali/GS_Admin  
**Role:** Express.js backend powering the GreenSnap mobile apps (citizens & supervisors) and the Admin web portal. This variant uses **MobileNetV3-Large** for whole-image waste classification and enforces geospatial verification (Haversine 10 m rule).

---

## Purpose (TL;DR)
GreenSnap AI automates validation of citizen-submitted waste reports, enforces location-verified cleanups, and provides supervisors/admins the workflows and audit data needed for accountable municipal action. This backend receives images + location, runs a MobileNetV3 classification, applies confidence thresholds, stores report lifecycle data, and performs the final geo-verification that decides whether a cleanup is permanently accepted.

---

## Quick start (minimal)

1. Clone & install
```bash
git clone https://github.com/Muhammad5Ali/GS_Admin.git
cd GS_Admin
npm install
Add .env (see template below)

Run (development)

bash
Copy code
npm run dev
# or
node server.js
.env template (fill values)
Create a .env in the project root and add the following keys (do not commit secrets).

ini
Copy code
PORT=3000
NODE_ENV=development
MONGO_URI=
JWT_SECRET=
SUPERVISOR_SECRET=
ADMIN_SECRET_KEY=
JWT_EXPIRE=
COOKIE_EXPIRE=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_SERVICE=
SMTP_PORT=
SMTP_MAIL=
SMTP_PASSWORD=
HF_API_URL=
HF_TIMEOUT=
GRADIO_SERVER_NAME=
GRADIO_SERVER_PORT=
HF_HOME=
CACHE_TTL=
PERMANENT_RESOLVE_DISTANCE_METERS=10
CONFIDENCE_AUTO_ACCEPT=0.85
CONFIDENCE_RETAKE=0.65
PERMANENT_RESOLVE_DISTANCE_METERS controls the admin geofence (default 10 m).

CONFIDENCE_AUTO_ACCEPT / CONFIDENCE_RETAKE control the MobileNet decision thresholds.

Architecture (short)
Mobile clients (React Native Expo): citizens submit reports; supervisors manage & resolve on mobile.

Admin portal (React): administrators review and permanently validate or reject reports.

Backend (this repo): Node/Express + MongoDB. Handles auth, reports lifecycle, model inference calls (to HF or a local/remote model service), Cloudinary image uploads, attendance & worker records, analytics, and the geospatial validation step.

Theory — How verification works
MobileNetV3-Large (image classification)
MobileNetV3 is a modern, efficient convolutional backbone optimized for latency and mobile/edge deployment.

For GreenSnap we use MobileNetV3-Large as a whole-image binary classifier (waste vs non-waste). Benefits: fast inference, small model footprint, and good accuracy for on-device / lightweight inference services.

Confidence thresholding (decision logic)
The model returns a single confidence score for "waste". The backend applies simple, configurable thresholds:

confidence >= CONFIDENCE_AUTO_ACCEPT → automatically accept as waste.

CONFIDENCE_RETAKE < confidence < CONFIDENCE_AUTO_ACCEPT → low confidence → client is asked to retake or resubmit for clarity.

confidence <= CONFIDENCE_RETAKE → classify as non-waste (reject).

This rule reduces false positives, minimizes manual review load, and maintains predictable behavior.

Haversine distance (geo verification)
Final admin validation compares reported coordinates vs. resolved coordinates using the Haversine formula (great-circle distance).

If the computed distance ≤ PERMANENT_RESOLVE_DISTANCE_METERS (default 10 m), the report is permanently resolved and the verified distance is recorded. Otherwise the report is rejected and the distance is stored for audit and feedback.

Using a strict distance check enforces real location-based accountability (not just a “done” flag).

Model integration options (practical)
External inference (recommended): backend forwards image to Hugging Face / custom inference endpoint (HF_API_URL) and receives { label, confidence }. Keeps backend lightweight and suitable for Render.

In-process inference: use tfjs-node and load MobileNetV3 locally. Works for testing, but consumes more memory on single instances—less optimal for Render production.

Deployment notes (Render)
This repo is designed to run as a Render Web Service (no Docker required).

Set all .env keys in the Render dashboard (never commit .env).

Use npm start (or your configured start script). Render sets PORT automatically if needed.

Recommendation: offload model inference to an external service (HuggingFace or a separate inference instance) to keep the Render service lightweight and stable.

UX highlights (what this backend supports)
Model-based pre-filtering of reports (auto-accept / retake / reject)

Supervisor workflow: pending → in-progress / out-of-scope (comment recorded with date/time) → resolve (captured live GPS + photo)

Admin validation: Haversine check, admin comment, verified distance, permanent-resolve or reject

Worker management: add workers, mark attendance, record tasks completed, daily summaries & top workers

Citizen features supported via backend: leaderboard points, profile report lifecycle with timestamps, and map-based location comparison

Credits & contact
Maintainers: Muhammad Ali, Moeez Abdullah

Supervisor: Abid Jameel

Repo: https://github.com/Muhammad5Ali/GS_Admin

License
MIT

yaml
Copy code

---

If you want, I can:
- Produce a compact `ENV_TEMPLATE` file (without secrets) you can add to the repo.  
- Create a 1-page CONTRIBUTING.md for quick onboarding. Which would you like next?
