import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import {
  createDietLog,
  deleteDietLog,
  getDietLogs as getDietLogsForUser,
  updateDietLog,
} from '../services/diet.service.js';

/** Lists diet logs for the authenticated user. */
export const getDietLogs = catchAsync(async (req: Request, res: Response) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const logs = await getDietLogsForUser(req.user.id, date);
  return res.json({ data: logs });
});

/** Creates a diet log for the authenticated user. */
export const createDietLogHandler = catchAsync(
  async (req: Request, res: Response) => {
    const log = await createDietLog(req.user.id, req.body);
    return res.status(201).json({ data: log });
  }
);

/** Updates a diet log for the authenticated user. */
export const updateDietLogHandler = catchAsync(
  async (req: Request, res: Response) => {
    const logId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!logId) {
      return res.status(400).json({ error: 'Missing diet log id' });
    }

    const log = await updateDietLog(req.user.id, logId, req.body);
    return res.json({ data: log });
  }
);

/** Deletes a diet log for the authenticated user. */
export const deleteDietLogHandler = catchAsync(
  async (req: Request, res: Response) => {
    const logId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!logId) {
      return res.status(400).json({ error: 'Missing diet log id' });
    }

    await deleteDietLog(req.user.id, logId);
    return res.status(204).send();
  }
);
