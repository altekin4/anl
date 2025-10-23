/**
 * Rate limiter specifically for chat messages
 * Limits users to 20 messages per minute as per requirements
 */
export declare const chatRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Session-based rate limiter to prevent session creation abuse
 */
export declare const sessionCreationRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=chatRateLimiter.d.ts.map