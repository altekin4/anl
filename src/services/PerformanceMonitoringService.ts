import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import { CacheService } from './CacheService';
import db from '@/database/connection';

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  slowRequestCount: number;
  cacheHitRatio: number;
  dbConnectionsActive: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private cacheService: CacheService;
  private metrics: Map<string, any> = new Map();
  private requestHistory: RequestMetrics[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

  constructor() {
    this.cacheService = new CacheService();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * Express middleware for request monitoring
   */
  requestMonitoringMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): Response {
        const responseTime = Date.now() - startTime;
        
        // Record request metrics
        const requestMetric: RequestMetrics = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
        };

        PerformanceMonitoringService.getInstance().recordRequest(requestMetric);
        
        // Log slow requests
        if (responseTime > PerformanceMonitoringService.getInstance().SLOW_REQUEST_THRESHOLD) {
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.path,
            responseTime,
            statusCode: res.statusCode,
          });
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Record individual request metrics
   */
  private recordRequest(metric: RequestMetrics): void {
    this.requestHistory.push(metric);
    
    // Keep history size manageable
    if (this.requestHistory.length > this.MAX_HISTORY_SIZE) {
      this.requestHistory.shift();
    }

    // Update counters
    this.incrementCounter('total_requests');
    
    if (metric.statusCode >= 400) {
      this.incrementCounter('error_requests');
    }
    
    if (metric.responseTime > this.SLOW_REQUEST_THRESHOLD) {
      this.incrementCounter('slow_requests');
    }

    // Update average response time
    this.updateAverageResponseTime(metric.responseTime);
  }

  /**
   * Increment a counter metric
   */
  private incrementCounter(key: string): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const currentAvg = this.metrics.get('avg_response_time') || 0;
    const currentCount = this.metrics.get('total_requests') || 1;
    
    const newAvg = ((currentAvg * (currentCount - 1)) + responseTime) / currentCount;
    this.metrics.set('avg_response_time', newAvg);
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheStats = await this.cacheService.getCacheStats();
    const dbStats = await db.getPerformanceStats();
    
    return {
      requestCount: this.metrics.get('total_requests') || 0,
      averageResponseTime: Math.round(this.metrics.get('avg_response_time') || 0),
      errorCount: this.metrics.get('error_requests') || 0,
      slowRequestCount: this.metrics.get('slow_requests') || 0,
      cacheHitRatio: cacheStats?.stats?.hitRatio || 0,
      dbConnectionsActive: dbStats?.activeConnections || 0,
      memoryUsage: process.memoryUsage(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * Get detailed system health information
   */
  async getSystemHealth(): Promise<any> {
    const metrics = await this.getPerformanceMetrics();
    const cacheStats = await this.cacheService.getCacheStats();
    const dbStats = await db.getPerformanceStats();

    // Determine health status
    const isHealthy = 
      metrics.averageResponseTime < this.SLOW_REQUEST_THRESHOLD &&
      (metrics.errorCount / Math.max(metrics.requestCount, 1)) < 0.05 && // Less than 5% error rate
      cacheStats.connected &&
      dbStats !== null;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      metrics,
      cache: cacheStats,
      database: dbStats,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };
  }

  /**
   * Get request analytics for the last N minutes
   */
  getRequestAnalytics(minutes: number = 60): any {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const recentRequests = this.requestHistory.filter(req => req.timestamp > cutoffTime);

    if (recentRequests.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequestRate: 0,
        topEndpoints: [],
        statusCodeDistribution: {},
      };
    }

    // Calculate metrics
    const totalRequests = recentRequests.length;
    const averageResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / totalRequests;
    const errorRequests = recentRequests.filter(req => req.statusCode >= 400).length;
    const slowRequests = recentRequests.filter(req => req.responseTime > this.SLOW_REQUEST_THRESHOLD).length;

    // Top endpoints
    const endpointCounts = recentRequests.reduce((acc, req) => {
      const key = `${req.method} ${req.path}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    // Status code distribution
    const statusCodeDistribution = recentRequests.reduce((acc, req) => {
      acc[req.statusCode] = (acc[req.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round((errorRequests / totalRequests) * 100 * 100) / 100, // 2 decimal places
      slowRequestRate: Math.round((slowRequests / totalRequests) * 100 * 100) / 100,
      topEndpoints,
      statusCodeDistribution,
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.requestHistory = [];
    logger.info('Performance metrics reset');
  }

  /**
   * Log performance summary
   */
  async logPerformanceSummary(): Promise<void> {
    try {
      const metrics = await this.getPerformanceMetrics();
      const analytics = this.getRequestAnalytics(60); // Last hour

      logger.info('Performance Summary', {
        requests: {
          total: metrics.requestCount,
          errors: metrics.errorCount,
          slow: metrics.slowRequestCount,
          avgResponseTime: metrics.averageResponseTime,
        },
        cache: {
          hitRatio: metrics.cacheHitRatio,
        },
        database: {
          activeConnections: metrics.dbConnectionsActive,
        },
        system: {
          uptime: metrics.uptime,
          memoryUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        },
        lastHour: analytics,
      });
    } catch (error) {
      logger.error('Failed to log performance summary', error);
    }
  }
}

export default PerformanceMonitoringService.getInstance();