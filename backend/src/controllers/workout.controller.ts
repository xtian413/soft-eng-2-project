import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import {
  createWorkoutWithSets,
  deleteWorkout,
  getWorkoutWithSets,
  getWorkoutsForUser,
  updateWorkout,
} from '../services/workout.service.js';

/** Lists workouts for the authenticated user. */
export const getWorkouts = catchAsync(async (req: Request, res: Response) => {
  const workouts = await getWorkoutsForUser(req.user.id);
  return res.json({ data: workouts });
});

/** Gets a workout detail for the authenticated user. */
export const getWorkoutById = catchAsync(
  async (req: Request, res: Response) => {
    const workoutId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!workoutId) {
      return res.status(400).json({ error: 'Missing workout id' });
    }

    const workout = await getWorkoutWithSets(workoutId, req.user.id);
    return res.json({ data: workout });
  }
);

/** Creates a workout for the authenticated user. */
export const createWorkoutHandler = catchAsync(
  async (req: Request, res: Response) => {
    const workout = await createWorkoutWithSets(req.user.id, req.body);
    return res.status(201).json({ data: workout });
  }
);

/** Updates a workout for the authenticated user. */
export const updateWorkoutHandler = catchAsync(
  async (req: Request, res: Response) => {
    const workoutId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!workoutId) {
      return res.status(400).json({ error: 'Missing workout id' });
    }

    const workout = await updateWorkout(workoutId, req.user.id, {
      name: req.body.name,
      notes: req.body.notes,
      performed_at: req.body.performed_at,
    });
    return res.json({ data: workout });
  }
);

/** Deletes a workout for the authenticated user. */
export const deleteWorkoutHandler = catchAsync(
  async (req: Request, res: Response) => {
    const workoutId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!workoutId) {
      return res.status(400).json({ error: 'Missing workout id' });
    }

    await deleteWorkout(workoutId, req.user.id);
    return res.status(204).send();
  }
);
