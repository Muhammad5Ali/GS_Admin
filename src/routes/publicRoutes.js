// backend/src/routes/publicRoutes.js
import express from 'express';
import { getPublicStats } from '../controllers/publicController.js';

const router = express.Router();
router.get('/stats', getPublicStats);

export default router;