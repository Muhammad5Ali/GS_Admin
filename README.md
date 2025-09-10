# GreenSnap AI — Backend (MobileNetV3 Variant)

> Production-ready Express.js backend for **GreenSnap AI** — a civic waste-reporting platform.
> This variant uses **MobileNetV3‑Large** (whole-image classifier) to validate reports, manages supervisor/admin workflows, and enforces location‑verified cleanups via a Haversine geofence. Deployed on **Render** (no Docker required).

---

## Table of Contents

* [About](#about)
* [Key Features](#key-features)
* [Tech Stack](#tech-stack)
* [Quick Start](#quick-start)
* [Environment (`.env`) Template](#environment-env-template)
* [Core Theory (concise)](#core-theory-concise)

  * [MobileNetV3 — rationale](#mobilenetv3---rationale)
  * [Confidence thresholding](#confidence-thresholding)
  * [Haversine geoverification](#haversine-geoverification)
* [Model Integration Options](#model-integration-options)
* [Deployment on Render (notes)](#deployment-on-render-notes)
* [Product / UX Highlights Supported](#product--ux-highlights-supported)
* [Maintainers & Credits](#maintainers--credits)
* [Contributing](#contributing)
* [License](#license)

---

## About

GreenSnap AI automates verification and lifecycle management of citizen-submitted waste reports so municipalities and civic teams can act faster and more transparently. The backend accepts geo‑tagged reports (image + GPS + description), performs model-driven filtering, records audit trails (timestamps, comments, resolved images), and supports supervisor/admin workflows including strict geospatial verification before permanently closing a report.

---

## Key Features

* Role-aware authentication and authorization: **Citizen**, **Supervisor**, **Admin**.
* Report ingestion (image + GPS + description) and lifecycle management.
* Image validation workflow using MobileNetV3 confidence thresholds.
* Supervisor tooling: mark in-progress, out-of-scope (with comments & timestamps), resolve with live GPS + photo, worker & attendance hooks.
* Admin geospatial verification (Haversine distance) → permanent-resolve / reject.
* Cloud image hosting integration (Cloudinary) and optional external model inference (Hugging Face / custom endpoint).
* Lightweight analytics & auditable history for transparency.

---

## Tech Stack

* **Node.js + Express**
* **MongoDB + Mongoose** (GeoJSON for location storage)
* JWT authentication, `bcryptjs` for password hashing
* Cloudinary (optional) for image hosting
* Optional inference endpoints (Hugging Face, TF Serving, or a small Python microservice)
* Hosted on **Render** (Web Service)

---

## Quick Start

```bash
# 1. clone
git clone https://github.com/Muhammad5Ali/GS_Admin.git
cd GS_Admin

# 2. install
npm install

# 3. create .env (see template below)

# 4. run (development)
npm run dev

# production
npm start
```

> **Note:** Do **not** commit your `.env` file or any secrets to the repository.

---

## Environment (`.env`) Template

Create a `.env` file in the project root and fill the values. **Do not commit** this file to version control.

```env
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
```

---

## Core Theory (concise)

### MobileNetV3 — rationale

**MobileNetV3‑Large** is chosen for its balance of accuracy and efficiency on edge/mobile workflows. In GreenSnap it is used as a whole-image binary classifier (waste vs non-waste), returning a single `confidence` (scalar) that the backend uses to decide the next action.

### Confidence thresholding

The backend applies a simple, auditable rule set (configurable via `.env`):

* `confidence >= CONFIDENCE_AUTO_ACCEPT` → **auto-accept** (report proceeds as waste)
* `CONFIDENCE_RETAKE < confidence < CONFIDENCE_AUTO_ACCEPT` → **low confidence** → ask user to retake the photo
* `confidence <= CONFIDENCE_RETAKE` → **non-waste** → reject

This reduces manual review load while keeping clear, storable rules for audits.

### Haversine geoverification

To ensure a cleanup was performed at the reported location, the admin computes the great‑circle distance between the original reported coordinates and the resolved coordinates. If the distance ≤ `PERMANENT_RESOLVE_DISTANCE_METERS` (default **10 m**) → **permanent-resolve**; otherwise **reject**. The computed distance is stored with the report for transparency and auditing.

> **Note:** MongoDB GeoJSON stores coordinates as `[longitude, latitude]`. Convert to `(lat, lon)` before calling the helper.

```js
// Haversine — returns meters
function deg2rad(deg) { return deg * (Math.PI / 180); }
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2
          + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // meters
}
```

---

## Model Integration Options

**External inference service (recommended for Render)**

* Host the MobileNetV3 model on an external inference endpoint (Hugging Face, TF Serving, or a small Python microservice).
* The backend forwards images and receives `{ label, confidence }` JSON. Keeps the Render instance lightweight and stable.

**In-process inference (development / testing)**

* Use `tfjs-node` to load a converted MobileNetV3 model inside Node.
* Acceptable for development or small-scale testing, but increases memory & CPU usage in production.

---

## Deployment on Render (notes)

1. Create a **Web Service** on Render and connect this GitHub repository.
2. Use `npm start` as the start command (ensure your `package.json` `start` script points to the server entry: e.g. `node server.js`).
3. Add all sensitive values (DB credentials, API keys, model endpoints) to Render's Environment settings — do **not** upload your `.env` file.
4. For production stability, offload heavy model inference to an external service (Hugging Face or a dedicated inference instance).
5. Monitor logs and response times for any `POST /models/predict` calls — model latency directly impacts user experience.

---

## Product / UX Highlights Supported by This Backend

* **Citizen:** submit geo‑tagged reports, view report lifecycle, earn leaderboard points for verified reports.
* **Supervisor (mobile):** view pending queue, mark in‑progress / out‑of‑scope with comments & timestamps, resolve with live GPS + photo, manage workers & attendance, view performance summaries.
* **Admin (web):** monitor full lifecycle, run Haversine validation, view verified distances & admin comments, manage supervisors & workers, access lightweight analytics.

---



## Contributing

Contributions are welcome!

* Open an issue to discuss major changes.
* Create feature branches and submit PRs with clear descriptions and tests where appropriate.
* **Do not** commit secrets, model binaries, or dataset dumps to the repository — use environment variables and external model registries.

If you'd like, the maintainers can add a `CONTRIBUTING.md` for new contributors or provide an `ENV_TEMPLATE` (safe to commit) that developers can copy into `.env.local`.

---

## License

This project is licensed under the **MIT License** — see the `LICENSE` file for details.

---

*Last updated: 2025-09-10*
