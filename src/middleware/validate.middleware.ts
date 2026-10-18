import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Validate request data against a Zod schema.
 * For 'body' and 'params': replaces the value directly.
 * For 'query': uses Object.assign to work around Express 5's read-only query getter.
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      sendError(res, 'VALIDATION_ERROR', 'Validation failed', 422, details);
      return;
    }

    if (target === 'query') {
      // Express 5: req.query is a getter — use Object.assign to mutate in-place
      Object.assign(req.query, result.data);
    } else {
      // body and params are writable
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any)[target] = result.data;
    }

    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!errors[path]) errors[path] = [];
    errors[path].push(issue.message);
  }
  return errors;
}
