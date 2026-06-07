import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/** Validates request body with a Zod schema. */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
    }

    req.body = result.data;
    return next();
  };
}
