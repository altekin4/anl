import winston from 'winston';
import config from '@/config';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service,
      message,
      ...meta,
    };
    
    // Add performance context if available
    if (meta.duration && typeof meta.duration === 'number') {
      (logEntry as any).performance = {
        duration: meta.duration,
        slow: meta.duration > 1000,
      };
    }
    
    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: structuredFormat,
  defaultMeta: { 
    service: 'tercih-sihirbazi',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
  },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Performance logs
    new winston.transports.File({
      filename: 'logs/performance.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, duration, ...meta }) => {
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
        })
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
});

// Console transport for development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, service, duration, ...meta }) => {
        let output = `${timestamp} [${service}] ${level}: ${message}`;
        
        if (duration) {
          output += ` (${duration}ms)`;
        }
        
        if (Object.keys(meta).length > 0) {
          output += ` ${JSON.stringify(meta)}`;
        }
        
        return output;
      })
    )
  }));
}

// Add performance logging methods
const originalLogger = logger;

export const performanceLogger = {
  ...originalLogger,
  
  /**
   * Log with performance timing
   */
  timed: (level: string, message: string, startTime: number, meta: any = {}) => {
    const duration = Date.now() - startTime;
    originalLogger.log(level, message, { ...meta, duration });
  },
  
  /**
   * Log database query performance
   */
  queryPerformance: (query: string, duration: number, rows?: number) => {
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
  cachePerformance: (operation: string, key: string, duration: number, hit?: boolean) => {
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
  requestPerformance: (method: string, path: string, statusCode: number, duration: number, userId?: string) => {
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

export default logger;