import type { NextFunction, Request, Response } from 'express';

interface AppError {
  statusCode?: number;
  message?: string;
}

/** Handles API errors and normalizes the response. */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';

  console.error(err);

  res.status(statusCode).json({ error: message });
}
