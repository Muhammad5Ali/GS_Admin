GreenSnap AI — Backend (MobileNetV3 Variant)

Express.js backend for GreenSnap AI — a production-ready service that validates citizen-submitted waste reports using MobileNetV3-Large, manages supervisor/admin workflows, and enforces location-verified cleanups via a Haversine geofence. Deployed on Render (no Docker required).

Why this service exists

GreenSnap AI automates the verification and lifecycle of civic waste reports so municipalities can act faster and more transparently. This backend:

Filters photo reports with a lightweight, robust image classifier (MobileNetV3).

Applies configurable confidence rules to reduce false positives and unnecessary field trips.

Records supervisor actions and audit data (timestamps, comments, resolved images).

Validates cleanup locations using a strict geospatial check (default: 10 meters) before permanently closing a report.

What’s included

Authentication and role-aware logic (Citizen, Supervisor, Admin)

Report ingestion (image + GPS + description) and lifecycle management

Image validation workflow (MobileNetV3 confidence thresholds)

Supervisor tools support (in-progress, out-of-scope, resolve, worker/attendance hooks)

Admin geospatial verification (Haversine distance → permanent-resolve / reject)

Cloud image hosting support (Cloudinary) and optional external model inference (Hugging Face / custom endpoint)

Lightweight analytics & audit trail storage for transparency

Quick start (developer)
# clone
git clone https://github.com/Muhammad5Ali/GS_Admin.git
cd GS_Admin

# install
npm install

# create .env (see template below), then run
npm run dev
# or for production
npm start

.env template (copy → fill — do NOT commit)
PORT=3000
NODE_ENV=development

MONGO_URI=                       # mongodb+srv://<user>:<pass>@cluster.mongodb.net/greensnap
JWT_SECRET=                       # strong random secret
SUPERVISOR_SECRET=                # used for supervisor registration validation
ADMIN_SECRET_KEY=                 # used for admin creation/secure actions
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

HF_API_URL=                        # optional: Hugging Face or custom inference endpoint
HF_TIMEOUT=                        # ms, e.g. 30000
GRADIO_SERVER_NAME=                # optional dev/testing
GRADIO_SERVER_PORT=
HF_HOME=
CACHE_TTL=                         # seconds for caching model responses

PERMANENT_RESOLVE_DISTANCE_METERS=10
CONFIDENCE_AUTO_ACCEPT=0.85
CONFIDENCE_RETAKE=0.65

Decision logic (theory, concise)
MobileNetV3 — why & how

MobileNetV3-Large is chosen for its balance of accuracy and efficiency on edge/mobile workflows. In GreenSnap it is used as a whole-image binary classifier (waste vs non-waste), returning a single confidence score used by the backend to decide the next action.

Confidence thresholding (configurable)

confidence >= CONFIDENCE_AUTO_ACCEPT → auto-accept (report proceeds as waste).

CONFIDENCE_RETAKE < confidence < CONFIDENCE_AUTO_ACCEPT → low confidence → user is asked to retake the photo.

confidence <= CONFIDENCE_RETAKE → non-waste → report is rejected.

This reduces human review load while keeping a clear, auditable rule-set.

Haversine geoverification (concise)

To ensure a cleanup happened at the reported place, the admin computes great-circle distance between reported coordinates and resolved coordinates. If distance ≤ PERMANENT_RESOLVE_DISTANCE_METERS (default 10 m) → permanent-resolved; otherwise → rejected. The computed distance is stored for audit.

// Haversine — returns meters
function deg2rad(deg){ return deg * (Math.PI / 180); }
function haversineMeters(lat1, lon1, lat2, lon2){
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(deg2rad(lat1))*Math.cos(deg2rad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000;
}


Note: MongoDB GeoJSON stores coordinates as [longitude, latitude]. Convert to (lat, lon) before calling the helper.

Model integration (recommended options)

External inference service (recommended for Render):
Host the MobileNetV3 model on an inference endpoint (Hugging Face, TF Serving, or a small Python microservice). The backend forwards images and receives { label, confidence }. This keeps the Render service lightweight and stable.

In-process inference (development / testing):
Use tfjs-node to load a converted MobileNetV3 model inside the Node process. Acceptable for testing but increases memory/CPU usage in production.

Deployment on Render (notes)

Create a Web Service and connect this GitHub repo.

Use npm start as the start command. Render will set the PORT env variable; you may leave PORT=3000 as default.

Add all sensitive keys in Render's Environment settings (do not upload .env).

For production stability, offload model inference to an external service (Hugging Face or a dedicated inference instance).

Monitor logs and response times for any POST /models/predict calls — model latency impacts UX.

UX & product highlights supported by this backend

Citizens: submit geo-tagged reports, view report lifecycle & leaderboard points.

Supervisors (mobile): view pending queue, mark in-progress / out-of-scope with recorded comments & timestamps, resolve with live cleanup photo + GPS, manage workers and attendance, see performance summaries.

Admins (web): monitor full lifecycle, run Haversine validation, view verified distances and admin comments, manage supervisors/workers, and access basic analytics.

Maintainers & credits

Maintainers: Muhammad Ali, Moeez Abdullah

Supervisor: Abid Jameel

Repository: https://github.com/Muhammad5Ali/GS_Admin

License

MIT — see LICENSE file.

If you’d like, I can:

Add a one-page CONTRIBUTING.md tailored for new contributors, or

Produce a short ENV_TEMPLATE (safe to commit) that developers can copy to .env.local.
