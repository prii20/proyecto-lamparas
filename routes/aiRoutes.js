import express from 'express';
import { suggest } from '../controllers/aiController.js';

const router = express.Router();

// POST /api/suggest
router.post('/suggest', suggest);

export default router;
