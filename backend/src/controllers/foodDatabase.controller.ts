import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { searchFoodDatabase } from '../services/foodDatabase.service.js';

/** Searches the USDA food database. */
export const getFoodDatabase = catchAsync(async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const limitParam = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
  const limit =
    typeof limitParam === 'number' && Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, 200)
      : undefined;

  const foods = await searchFoodDatabase(query, limit);
  return res.json({ data: foods });
});
