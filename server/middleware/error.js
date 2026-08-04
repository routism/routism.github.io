import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
  } else {
    logger.warn(err.message, { path: req.originalUrl });
  }

  const payload = { error: err.message || 'Internal server error' };
  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
