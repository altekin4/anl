"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = __importDefault(require("@/config"));
// Custom format for structured logging
const structuredFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const logEntry = {
        timestamp,
        level,
        service,
        message,
        ...meta,
    };
    // Add performance context if available
    if (meta.duration && typeof meta.duration === 'number') {
        logEntry.performance = {
            duration: meta.duration,
            slow: meta.duration > 1000,
        };
    }
    return JSON.stringify(logEntry);
}));
const logger = winston_1.default.createLogger({
    level: config_1.default.nodeEnv === 'production' ? 'info' : 'debug',
    format: structuredFormat,
    defaultMeta: {
        service: 'tercih-sihirbazi',
        version: process.env.npm_package_version || '1.0.0',
        environment: config_1.default.nodeEnv,
    },
    transports: [
        // Error logs
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined logs
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Performance logs
        new winston_1.default.transports.File({
            filename: 'logs/performance.log',
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, duration, ...meta }) => {
                if (duration || meta.performance) {
                    return JSON.stringify({
                        timestamp,
                        level,
                        message,
                        duration,
                        ...meta,
                    });
                }
                return ''; // Return empty string instead of null
            })),
            maxsize: 5242880, // 5MB
            maxFiles: 3,
        }),
    ],
});
// Console transport for development
if (config_1.default.nodeEnv !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, service, duration, ...meta }) => {
            let output = `${timestamp} [${service}] ${level}: ${message}`;
            if (duration) {
                output += ` (${duration}ms)`;
            }
            if (Object.keys(meta).length > 0) {
                output += ` ${JSON.stringify(meta)}`;
            }
            return output;
        }))
    }));
}
// Add performance logging methods
const originalLogger = logger;
exports.performanceLogger = {
    ...originalLogger,
    /**
     * Log with performance timing
     */
    timed: (level, message, startTime, meta = {}) => {
        const duration = Date.now() - startTime;
        originalLogger.log(level, message, { ...meta, duration });
    },
    /**
     * Log database query performance
     */
    queryPerformance: (query, duration, rows) => {
        originalLogger.info('Database query executed', {
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            duration,
            rows,
            category: 'database',
        });
    },
    /**
     * Log cache operation performance
     */
    cachePerformance: (operation, key, duration, hit) => {
        originalLogger.info('Cache operation', {
            operation,
            key: key.substring(0, 50) + (key.length > 50 ? '...' : ''),
            duration,
            hit,
            category: 'cache',
        });
    },
    /**
     * Log API request performance
     */
    requestPerformance: (method, path, statusCode, duration, userId) => {
        originalLogger.info('API request completed', {
            method,
            path,
            statusCode,
            duration,
            userId,
            category: 'api',
        });
    },
};
exports.default = logger;
//# sourceMappingURL=logger.js.map