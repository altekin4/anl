import { Request, Response } from 'express';
import logger from '@/utils/logger';
import performanceMonitor from '@/services/PerformanceMonitoringService';
import { CacheService } from '@/services/CacheService';
import db from '@/database/connection';

export class HealthController {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * Basic health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await performanceMonitor.getSystemHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        uptime: health.system.uptime,
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }

  /**
   * Detailed health check with all system components
   */
  async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await performanceMonitor.getSystemHealth();
      res.json(health);
    } catch (error) {
      logger.error('Detailed health check failed', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Detailed health check failed',
      });
    }
  }

  /**
   * Performance metrics endpoint
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await performanceMonitor.getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', error);
      res.status(500).json({
        error: 'Failed to retrieve metrics',
      });
    }
  }

  /**
   * Request analytics endpoint
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const minutes = parseInt(req.query.minutes as string) || 60;
      const analytics = performanceMonitor.getRequestAnalytics(minutes);
      res.json(analytics);
    } catch (error) {
      logger.error('Failed to get analytics', error);
      res.status(500).json({
        error: 'Failed to retrieve analytics',
      });
    }
  }

  /**
   * Database health check
   */
  async databaseHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      await db.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      const stats = await db.getPerformanceStats();
      
      res.json({
        status: 'healthy',
        responseTime,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Database health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Cache health check
   */
  async cacheHealth(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const testKey = 'health_check_' + Date.now();
      const testValue = 'test';
      
      // Test cache operations
      await this.cacheService.set(testKey, testValue, 10);
      const retrieved = await this.cacheService.get(testKey);
      await this.cacheService.delete(testKey);
      
      const responseTime = Date.now() - startTime;
      const stats = await this.cacheService.getCacheStats();
      
      res.json({
        status: retrieved === testValue ? 'healthy' : 'degraded',
        responseTime,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Cache health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        error: 'Cache connection failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Readiness probe (for Kubernetes)
   */
  async readiness(req: Request, res: Response): Promise<void> {
    try {
      // Check if all critical services are ready
      const dbCheck = db.query('SELECT 1');
      const cacheCheck = this.cacheService.exists('readiness_check');
      
      await Promise.all([dbCheck, cacheCheck]);
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed', error);
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Liveness probe (for Kubernetes)
   */
  async liveness(req: Request, res: Response): Promise<void> {
    // Simple liveness check - if the process is running, it's alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}

export default new HealthController();