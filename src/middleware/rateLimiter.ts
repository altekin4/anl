import rateLimit from 'express-rate-limit';
import { RateLimitError } from '@/utils/errors';
import config from '@/config';
import logger from '@/utils/logger';

/**
 * Rate limiter for calculator endpoints
 * Limits users to 20 requests per minute
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // 20 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many calculation requests. Please wait before trying again.',
      details: {
        limit: config.rateLimit.maxRequests,
        windowMs: config.rateLimit.windowMs,
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      },
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  
  // Custom key generator to identify users
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = req.headers['x-user-id'] || req.ip;
    return `calculator:${userId}`;
  },

  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    const userId = req.headers['x-user-id'] || req.ip;
    logger.warn(`Rate limit exceeded for user/IP: ${userId}`);
    
    const error = new RateLimitError(
      'Too many calculation requests. Please wait before trying again.'
    );
    
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: {
          limit: config.rateLimit.maxRequests,
          windowMs: config.rateLimit.windowMs,
          retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
        },
      },
    });
  },

  // Skip rate limiting for certain conditions
  skip: (req) => {
    // Skip rate limiting for health checks
    if (req.path === '/health') {
      return true;
    }
    
    // Skip for admin users (if implemented)
    const userRole = req.headers['x-user-role'];
    if (userRole === 'admin') {
      return true;
    }
    
    return false;
  },
});

/**
 * Stricter rate limiter for resource-intensive operations
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many resource-intensive requests. Please wait before trying again.',
      details: {
        limit: 5,
        windowMs: 60000,
        retryAfter: 60,
      },
    },
  },
  keyGenerator: (req) => {
    const userId = req.headers['x-user-id'] || req.ip;
    return `strict:${userId}`;
  },
});

/**
 * Lenient rate limiter for read-only operations
 */
export const lenientRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please wait before trying again.',
      details: {
        limit: 100,
        windowMs: 60000,
        retryAfter: 60,
      },
    },
  },
  keyGenerator: (req) => {
    const userId = req.headers['x-user-id'] || req.ip;
    return `lenient:${userId}`;
  },
});