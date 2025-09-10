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
