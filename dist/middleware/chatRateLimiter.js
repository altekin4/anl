"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionCreationRateLimiter = exports.chatRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
/**
 * Rate limiter specifically for chat messages
 * Limits users to 20 messages per minute as per requirements
 */
exports.chatRateLimiter = (0, express_rate_limit_1.default)({
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
        logger_1.default.warn(`Chat rate limit exceeded for user: ${userId}`);
        const error = new errors_1.RateLimitError('Çok fazla mesaj gönderiyorsunuz. Lütfen bir dakika bekleyip tekrar deneyin.');
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
exports.sessionCreationRateLimiter = (0, express_rate_limit_1.default)({
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
//# sourceMappingURL=chatRateLimiter.js.map