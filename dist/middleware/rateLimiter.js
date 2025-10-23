"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lenientRateLimiter = exports.strictRateLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const errors_1 = require("@/utils/errors");
const config_1 = __importDefault(require("@/config"));
const logger_1 = __importDefault(require("@/utils/logger"));
/**
 * Rate limiter for calculator endpoints
 * Limits users to 20 requests per minute
 */
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs, // 1 minute
    max: config_1.default.rateLimit.maxRequests, // 20 requests per window
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many calculation requests. Please wait before trying again.',
            details: {
                limit: config_1.default.rateLimit.maxRequests,
                windowMs: config_1.default.rateLimit.windowMs,
                retryAfter: Math.ceil(config_1.default.rateLimit.windowMs / 1000),
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
        logger_1.default.warn(`Rate limit exceeded for user/IP: ${userId}`);
        const error = new errors_1.RateLimitError('Too many calculation requests. Please wait before trying again.');
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                details: {
                    limit: config_1.default.rateLimit.maxRequests,
                    windowMs: config_1.default.rateLimit.windowMs,
                    retryAfter: Math.ceil(config_1.default.rateLimit.windowMs / 1000),
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
exports.strictRateLimiter = (0, express_rate_limit_1.default)({
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
exports.lenientRateLimiter = (0, express_rate_limit_1.default)({
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
//# sourceMappingURL=rateLimiter.js.map