import { Router } from 'express';
import { z } from 'zod';
import {
  createDietLogHandler,
  deleteDietLogHandler,
  getDietLogs,
  updateDietLogHandler,
} from '../controllers/diet.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const dietLogSchema = z.object({
  meal_name: z.string().min(1).max(100),
  calories: z.number().positive().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  logged_at: z.string().datetime(),
});

router.use(requireAuth);

router.get('/', getDietLogs);
router.post('/', validateBody(dietLogSchema), createDietLogHandler);
router.put('/:id', validateBody(dietLogSchema), updateDietLogHandler);
router.delete('/:id', deleteDietLogHandler);

export default router;
