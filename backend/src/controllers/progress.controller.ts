import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import {
  createProgressEntry,
  deleteProgressEntry,
  getProgressEntries,
} from '../services/progress.service.js';

/** Lists body progress entries for the authenticated user. */
export const getProgressList = catchAsync(
  async (req: Request, res: Response) => {
    const entries = await getProgressEntries(req.user.id);
    return res.json({ data: entries });
  }
);

/** Creates a body progress entry for the authenticated user. */
export const createProgressEntryHandler = catchAsync(
  async (req: Request, res: Response) => {
    const entry = await createProgressEntry(req.user.id, req.body);
    return res.status(201).json({ data: entry });
  }
);

/** Deletes a body progress entry for the authenticated user. */
export const deleteProgressEntryHandler = catchAsync(
  async (req: Request, res: Response) => {
    const entryId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!entryId) {
      return res.status(400).json({ error: 'Missing progress entry id' });
    }

    await deleteProgressEntry(req.user.id, entryId);
    return res.status(204).send();
  }
);
