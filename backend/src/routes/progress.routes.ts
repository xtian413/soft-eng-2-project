import { Router } from 'express';
import { z } from 'zod';
import {
  createProgressEntryHandler,
  deleteProgressEntryHandler,
  getProgressList,
  updateProgressEntryHandler,
} from '../controllers/progress.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const progressSchema = z.object({
  weight_kg: z.number().positive(),
  recorded_at: z.string().datetime(),
  recorded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.use(requireAuth);

router.get('/', getProgressList);
router.post('/', validateBody(progressSchema), createProgressEntryHandler);
router.put('/:id', validateBody(progressSchema), updateProgressEntryHandler);
router.delete('/:id', deleteProgressEntryHandler);

export default router;
