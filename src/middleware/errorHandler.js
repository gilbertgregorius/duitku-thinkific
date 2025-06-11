const logger = require('../utils/logger');

/**
 * Centralized error handling middleware
 */
class ErrorHandler {
  
  /**
   * Main error handling middleware
   */
  static handle() {
    return (err, req, res, next) => {
      // Default error
      let error = {
        message: err.message || 'Internal Server Error',
        status: err.status || err.statusCode || 500,
        code: err.code || 'INTERNAL_ERROR'
      };

      // Handle specific error types
      if (err.name === 'ValidationError') {
        error = ErrorHandler.handleValidationError(err);
      } else if (err.name === 'CastError') {
        error = ErrorHandler.handleCastError(err);
      } else if (err.code === 11000) {
        error = ErrorHandler.handleDuplicateError(err);
      } else if (err.name === 'JsonWebTokenError') {
        error = ErrorHandler.handleJWTError(err);
      } else if (err.name === 'TokenExpiredError') {
        error = ErrorHandler.handleJWTExpiredError(err);
      } else if (err.type === 'entity.parse.failed') {
        error = ErrorHandler.handleJSONParseError(err);
      }

      // Log error
      logger.error('Error handled by middleware:', {
        message: error.message,
        status: error.status,
        code: error.code,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Don't send stack trace in production
      const response = {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          status: error.status
        }
      };

      if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
        response.error.details = err.details || null;
      }

      res.status(error.status).json(response);
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(err) {
    const errors = Object.values(err.errors || {}).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));

    return {
      message: 'Validation Error',
      status: 400,
      code: 'VALIDATION_ERROR',
      details: errors
    };
  }

  /**
   * Handle cast errors (invalid ObjectId, etc.)
   */
  static handleCastError(err) {
    return {
      message: `Invalid ${err.path}: ${err.value}`,
      status: 400,
      code: 'CAST_ERROR'
    };
  }

  /**
   * Handle duplicate key errors
   */
  static handleDuplicateError(err) {
    const field = Object.keys(err.keyValue || {})[0];
    return {
      message: `Duplicate ${field}. Please use another value.`,
      status: 409,
      code: 'DUPLICATE_ERROR'
    };
  }

  /**
   * Handle JWT errors
   */
  static handleJWTError(err) {
    return {
      message: 'Invalid token. Please log in again.',
      status: 401,
      code: 'INVALID_TOKEN'
    };
  }

  /**
   * Handle JWT expired errors
   */
  static handleJWTExpiredError(err) {
    return {
      message: 'Token expired. Please log in again.',
      status: 401,
      code: 'EXPIRED_TOKEN'
    };
  }

  /**
   * Handle JSON parse errors
   */
  static handleJSONParseError(err) {
    return {
      message: 'Invalid JSON format in request body',
      status: 400,
      code: 'JSON_PARSE_ERROR'
    };
  }

  /**
   * Handle async errors (wrap async route handlers)
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle 404 errors for unmatched routes
   */
  static notFound() {
    return (req, res, next) => {
      const error = new Error(`Route ${req.originalUrl} not found`);
      error.status = 404;
      error.code = 'ROUTE_NOT_FOUND';
      next(error);
    };
  }

  /**
   * Send success response with consistent format
   */
  static sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      data
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response with consistent format
   */
  static sendError(res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR') {
    const response = {
      success: false,
      error: {
        message,
        code,
        status: statusCode
      }
    };

    res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;
