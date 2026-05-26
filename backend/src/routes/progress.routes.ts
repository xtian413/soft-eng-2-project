import { Router } from 'express';
import { z } from 'zod';
import {
  createProgressEntryHandler,
  deleteProgressEntryHandler,
  getProgressList,
} from '../controllers/progress.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const progressSchema = z.object({
  weight_kg: z.number().positive(),
  body_fat_pct: z.number().min(0).max(100).optional(),
  recorded_at: z.string().datetime(),
});

router.use(requireAuth);

router.get('/', getProgressList);
router.post('/', validateBody(progressSchema), createProgressEntryHandler);
router.delete('/:id', deleteProgressEntryHandler);

export default router;
