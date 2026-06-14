import { Router } from 'express';
import { z } from 'zod';
import {
  createDietLogHandler,
  deleteDietLogHandler,
  getDietLogs,
  updateDietLogHandler,
} from '../controllers/diet.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const mealIdSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

const dietLogSchema = z.object({
  meal_id: mealIdSchema.optional(),
  meal_name: z.string().min(1).max(100),
  calories: z.number().nonnegative().nullable().optional(),
  protein_g: z.number().nonnegative().nullable().optional(),
  carbs_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().nullable().optional(),
  fiber_g: z.number().nonnegative().nullable().optional(),
  sodium_mg: z.number().nonnegative().nullable().optional(),
  potassium_mg: z.number().nonnegative().nullable().optional(),
  calcium_mg: z.number().nonnegative().nullable().optional(),
  iron_mg: z.number().nonnegative().nullable().optional(),
  vitamin_c_mg: z.number().nonnegative().nullable().optional(),
  folate_mcg: z.number().nonnegative().nullable().optional(),
  serving_size: z.number().nonnegative().nullable().optional(),
  serving_unit: z.string().max(50).nullable().optional(),
  source_food_id: z.string().nullable().optional(),
  logged_at: z.string().datetime(),
});

router.use(requireAuth);

router.get('/', getDietLogs);
router.post('/', validateBody(dietLogSchema), createDietLogHandler);
router.put('/:id', validateBody(dietLogSchema), updateDietLogHandler);
router.delete('/:id', deleteDietLogHandler);

export default router;
