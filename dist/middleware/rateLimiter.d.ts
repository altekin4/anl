/**
 * Rate limiter for calculator endpoints
 * Limits users to 20 requests per minute
 */
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Stricter rate limiter for resource-intensive operations
 */
export declare const strictRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Lenient rate limiter for read-only operations
 */
export declare const lenientRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map