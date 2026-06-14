import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import {
  getDailyLogs as getDailyLogsForUser,
  softDeleteDailyLog,
  updateDailyLog,
  upsertDailyLog,
} from '../services/daily.service.js';

export const getDailyLogs = catchAsync(async (req: Request, res: Response) => {
  const updatedSince = typeof req.query.updatedSince === 'string' ? req.query.updatedSince : undefined;
  const logs = await getDailyLogsForUser(req.user.id, updatedSince);
  return res.json({ data: logs });
});

export const upsertDailyLogHandler = catchAsync(
  async (req: Request, res: Response) => {
    const log = await upsertDailyLog(req.user.id, req.body);
    return res.status(201).json({ data: log });
  }
);

export const updateDailyLogHandler = catchAsync(
  async (req: Request, res: Response) => {
    const logId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!logId) {
      return res.status(400).json({ error: 'Missing daily log id' });
    }

    const log = await updateDailyLog(req.user.id, logId, req.body);
    return res.json({ data: log });
  }
);

export const deleteDailyLogHandler = catchAsync(
  async (req: Request, res: Response) => {
    const logId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!logId) {
      return res.status(400).json({ error: 'Missing daily log id' });
    }

    const log = await softDeleteDailyLog(req.user.id, logId);
    return res.json({ data: log });
  }
);
