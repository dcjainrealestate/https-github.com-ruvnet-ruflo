import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.issues });
    return;
  }

  if (err instanceof HttpError) {
    const body: Record<string, unknown> = { error: err.message };
    const tempToken = (err as HttpError & { tempToken?: string }).tempToken;
    if (tempToken) {
      body.tempToken = tempToken;
    }
    res.status(err.status).json(body);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
