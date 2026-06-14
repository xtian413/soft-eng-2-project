import { Router } from 'express';
import { z } from 'zod';
import {
  deleteDailyLogHandler,
  getDailyLogs,
  updateDailyLogHandler,
  upsertDailyLogHandler,
} from '../controllers/daily.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/).nullable();
const dailyLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bedtime: timeSchema.optional(),
  waketime: timeSchema.optional(),
  sleep_hours: z.number().nonnegative().max(24).nullable().optional(),
  water_ml: z.number().nonnegative().nullable().optional(),
  water_goal_ml: z.number().positive().max(6000).nullable().optional(),
  updated_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

const dailyLogUpdateSchema = dailyLogSchema.omit({ date: true }).partial();

router.use(requireAuth);

router.get('/', getDailyLogs);
router.post('/', validateBody(dailyLogSchema), upsertDailyLogHandler);
router.put('/:id', validateBody(dailyLogUpdateSchema), updateDailyLogHandler);
router.delete('/:id', deleteDailyLogHandler);

export default router;
