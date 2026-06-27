import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  // Postgres / Supabase (PostgREST) error normalisation.
  // Supabase errors carry a SQLSTATE-style `code`.
  if (err.code === '23505') {
    // unique_violation
    status = 409;
    message = 'A record with that value already exists';
  } else if (err.code === '23503') {
    // foreign_key_violation
    status = 400;
    message = 'Referenced record does not exist';
  } else if (err.code === '22P02' || err.code === '22007' || err.code === '22008') {
    // invalid_text_representation / invalid datetime — bad id or date
    status = 400;
    message = 'Invalid value in request';
  } else if (err.code === '23502') {
    // not_null_violation
    status = 400;
    message = 'A required field is missing';
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('✗', err);
  }

  res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
  });
}
