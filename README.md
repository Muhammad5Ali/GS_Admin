# GreenSnap AI — Backend (MobileNetV3 Variant)

> Production-ready Express.js backend for **GreenSnap AI** — a civic waste-reporting platform.  
> This variant uses **MobileNetV3-Large** (whole-image classifier) to validate reports, manages supervisor/admin workflows, and enforces location-verified cleanups via a Haversine geofence. Deployed on **Render** (no Docker required).

---

## Table of Contents
- [About](#about)  
- [Key Features](#key-features)  
- [Tech Stack](#tech-stack)  
- [Quick Start](#quick-start)  
- [Environment (`.env`) Template](#environment-env-template)  
- [Core Theory (concise)](#core-theory-concise)  
  - [MobileNetV3 — rationale](#mobilenetv3---rationale)  
  - [Confidence thresholding](#confidence-thresholding)  
  - [Haversine geoverification](#haversine-geoverification)  
- [Model Integration Options](#model-integration-options)  
- [Deployment on Render (notes)](#deployment-on-render-notes)  
- [Product / UX Highlights Supported](#product--ux-highlights-supported)  
- [Maintainers & Credits](#maintainers--credits)  
- [License](#license)

---

## About
GreenSnap AI automates verification of citizen-submitted waste reports and enforces location-validated cleanups to improve municipal accountability and response times. This backend accepts images + GPS, performs model-driven filtering, records the full report lifecycle (timestamps, comments, distances), and supports supervisor/admin workflows and worker/attendance tracking.

---

## Key Features
- Model-based pre-filtering of image reports (waste vs non-waste)  
- Configurable confidence thresholds (auto-accept / retake / reject)  
- Supervisor workflows: pending → in-progress / out-of-scope (commented) → resolve (live GPS + photo)  
- Admin geospatial validation (Haversine distance → permanent-resolve / reject)  
- Worker management, attendance logging, and basic analytics/audit trail  
- Cloud image hosting support (Cloudinary) and optional external inference (Hugging Face / custom endpoint)

---

## Tech Stack
- Node.js + Express  
- MongoDB + Mongoose  
- JWT authentication, bcryptjs  
- Cloudinary (optional) for images  
- Optional inference: Hugging Face / TF Serving / Python microservice  
- Deployed on: **Render**

---

## Quick Start

```bash
# 1. clone
git clone https://github.com/Muhammad5Ali/GS_Admin.git
cd GS_Admin

# 2. install
npm install

# 3. add .env (see template below)

# 4. run (development)
npm run dev

# production
npm start

Environment (.env) Template

Create a .env file in the project root and fill values (do not commit secrets):
PORT=3000
NODE_ENV=development

MONGO_URI=                       # MongoDB connection string (e.g. mongodb+srv://<user>:<pass>@cluster.mongodb.net/greensnap)
JWT_SECRET=                       # strong secret
SUPERVISOR_SECRET=                # used to validate supervisor creation
ADMIN_SECRET_KEY=                 # admin creation/secure actions
JWT_EXPIRE=                       # e.g. 7d
COOKIE_EXPIRE=                    # seconds, e.g. 604800

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_SERVICE=
SMTP_PORT=
SMTP_MAIL=
SMTP_PASSWORD=

HF_API_URL=                        # optional inference endpoint (Hugging Face or custom)
HF_TIMEOUT=                        # milliseconds, e.g. 30000
GRADIO_SERVER_NAME=                # optional for local model UI
GRADIO_SERVER_PORT=
HF_HOME=
CACHE_TTL=                         # seconds for caching model results

PERMANENT_RESOLVE_DISTANCE_METERS=10
CONFIDENCE_AUTO_ACCEPT=0.85
CONFIDENCE_RETAKE=0.65

Core Theory (concise)
MobileNetV3 — rationale

MobileNetV3-Large is selected for its strong trade-off between accuracy and inference efficiency on mobile/edge-style workflows. In this backend it functions as a whole-image binary classifier (waste vs non-waste) to quickly filter incoming reports before manual workflows.

Confidence thresholding

The model returns a scalar confidence score for "waste". The backend applies simple, auditable thresholds (configurable via .env):

confidence >= CONFIDENCE_AUTO_ACCEPT → auto-accept (report proceeds as waste)

CONFIDENCE_RETAKE < confidence < CONFIDENCE_AUTO_ACCEPT → low confidence → prompt user to retake photo

confidence <= CONFIDENCE_RETAKE → non-waste → reject

This logic reduces false positives, optimizes supervisor time, and remains transparent for auditing.

Haversine geoverification

Admin finalization computes the great-circle distance between the reported coordinates and the cleanup coordinates. If the distance ≤ PERMANENT_RESOLVE_DISTANCE_METERS (default 10 m), mark permanent-resolved; otherwise mark rejected. The verified distance is stored with the report for audit and transparency.
// Haversine (returns meters)
function deg2rad(deg) { return deg * (Math.PI / 180); }
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}
Note: MongoDB GeoJSON stores coordinates as [longitude, latitude]. Convert to (lat, lon) when calling the helper.
Model Integration Options (practical)

External inference service (recommended for Render): forward uploaded images to HF_API_URL or a custom inference endpoint; backend receives { label, confidence }. Keeps the Render instance lightweight.

In-process inference: use tfjs-node and load a converted MobileNetV3 model inside Node. Suitable for dev/testing but increases memory and CPU consumption in production.

Deployment on Render (notes)

Create a Web Service on Render and connect this repository.

Use npm start as the start command (ensure start script points to your server entry).

Configure all sensitive keys in Render's Environment settings (never upload .env).

Recommendation: offload heavy model inference to an external service (Hugging Face or a separate inference instance) to maintain consistent performance.

Monitor logs and model-call latency; model inference time directly impacts UX.

Product / UX Highlights Supported by This Backend

Citizen: submit geo-tagged reports, view report lifecycle, and earn leaderboard points for verified reports.

Supervisor: view pending queue, mark items in-progress or out-of-scope (comment+timestamp), resolve with live GPS + photo, manage workers & attendance, view performance summaries.

Admin: monitor full lifecycle, validate with strict geofence, view verified distances & admin comments, and run analytics on contributions and success rates.

Maintainers & Credits

Maintainers: Muhammad Ali, Moeez Abdullah

Supervisor: Abid Jameel

Repository: https://github.com/Muhammad5Ali/GS_Admin

Contributing

Contributions are welcome. If you plan to contribute:

Open an issue to discuss major changes.

Create feature branches and submit PRs with clear descriptions.

Do not commit secrets or model binaries; use environment variables and external model registries.

License

MIT — see LICENSE for details.
