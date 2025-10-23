import rateLimit from 'express-rate-limit';
import { RateLimitError } from '@/utils/errors';
import logger from '@/utils/logger';

/**
 * Rate limiter specifically for chat messages
 * Limits users to 20 messages per minute as per requirements
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    error: {
      code: 'CHAT_RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla mesaj gönderiyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.',
      details: {
        limit: 20,
        windowMs: 60000,
        retryAfter: 60,
      },
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Use user ID for rate limiting
  keyGenerator: (req) => {
    const userId = req.headers['x-user-id'] || req.user?.id || req.ip;
    return `chat:${userId}`;
  },

  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    const userId = req.headers['x-user-id'] || req.user?.id || req.ip;
    logger.warn(`Chat rate limit exceeded for user: ${userId}`);
    
    const error = new RateLimitError(
      'Çok fazla mesaj gönderiyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.'
    );
    
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: {
          limit: 20,
          windowMs: 60000,
          retryAfter: 60,
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
    
    // Skip for admin users
    const userRole = req.headers['x-user-role'] || req.user?.role;
    if (userRole === 'admin') {
      return true;
    }
    
    return false;
  },
});

/**
 * Session-based rate limiter to prevent session creation abuse
 */
export const sessionCreationRateLimiter = rateLimit({
  windowMs: 300000, // 5 minutes
  max: 5, // 5 session creations per 5 minutes
  message: {
    success: false,
    error: {
      code: 'SESSION_CREATION_RATE_LIMIT_EXCEEDED',
      message: 'Çok fazla oturum oluşturma isteği. Lütfen birkaç dakika bekleyip tekrar deneyin.',
      details: {
        limit: 5,
        windowMs: 300000,
        retryAfter: 300,
      },
    },
  },
  keyGenerator: (req) => {
    const userId = req.headers['x-user-id'] || req.user?.id || req.ip;
    return `session_creation:${userId}`;
  },
});