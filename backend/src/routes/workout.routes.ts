import { Router } from 'express';
import { z } from 'zod';
import {
  createWorkoutHandler,
  deleteWorkoutHandler,
  getWorkoutById,
  getWorkouts,
  updateWorkoutHandler,
} from '../controllers/workout.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const workoutSetSchema = z.object({
  exercise_name: z.string().min(1),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight_kg: z.number().positive().optional(),
});

const workoutSchema = z.object({
  name: z.string().min(1).max(100),
  notes: z.string().optional(),
  performed_at: z.string().datetime(),
  sets: z.array(workoutSetSchema).min(1),
});

router.use(requireAuth);

router.get('/', getWorkouts);
router.get('/:id', getWorkoutById);
router.post('/', validateBody(workoutSchema), createWorkoutHandler);
router.put('/:id', validateBody(workoutSchema), updateWorkoutHandler);
router.delete('/:id', deleteWorkoutHandler);

export default router;
