"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
const PerformanceMonitoringService_1 = __importDefault(require("@/services/PerformanceMonitoringService"));
const CacheService_1 = require("@/services/CacheService");
const connection_1 = __importDefault(require("@/database/connection"));
class HealthController {
    constructor() {
        this.cacheService = new CacheService_1.CacheService();
    }
    /**
     * Basic health check endpoint
     */
    async healthCheck(req, res) {
        try {
            const health = await PerformanceMonitoringService_1.default.getSystemHealth();
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json({
                status: health.status,
                timestamp: health.timestamp,
                uptime: health.system.uptime,
                version: process.env.npm_package_version || '1.0.0',
            });
        }
        catch (error) {
            logger_1.default.error('Health check failed', error);
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
    async detailedHealthCheck(req, res) {
        try {
            const health = await PerformanceMonitoringService_1.default.getSystemHealth();
            res.json(health);
        }
        catch (error) {
            logger_1.default.error('Detailed health check failed', error);
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
    async getMetrics(req, res) {
        try {
            const metrics = await PerformanceMonitoringService_1.default.getPerformanceMetrics();
            res.json(metrics);
        }
        catch (error) {
            logger_1.default.error('Failed to get metrics', error);
            res.status(500).json({
                error: 'Failed to retrieve metrics',
            });
        }
    }
    /**
     * Request analytics endpoint
     */
    async getAnalytics(req, res) {
        try {
            const minutes = parseInt(req.query.minutes) || 60;
            const analytics = PerformanceMonitoringService_1.default.getRequestAnalytics(minutes);
            res.json(analytics);
        }
        catch (error) {
            logger_1.default.error('Failed to get analytics', error);
            res.status(500).json({
                error: 'Failed to retrieve analytics',
            });
        }
    }
    /**
     * Database health check
     */
    async databaseHealth(req, res) {
        try {
            const startTime = Date.now();
            await connection_1.default.query('SELECT 1');
            const responseTime = Date.now() - startTime;
            const stats = await connection_1.default.getPerformanceStats();
            res.json({
                status: 'healthy',
                responseTime,
                stats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error('Database health check failed', error);
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
    async cacheHealth(req, res) {
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
        }
        catch (error) {
            logger_1.default.error('Cache health check failed', error);
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
    async readiness(req, res) {
        try {
            // Check if all critical services are ready
            const dbCheck = connection_1.default.query('SELECT 1');
            const cacheCheck = this.cacheService.exists('readiness_check');
            await Promise.all([dbCheck, cacheCheck]);
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            logger_1.default.error('Readiness check failed', error);
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * Liveness probe (for Kubernetes)
     */
    async liveness(req, res) {
        // Simple liveness check - if the process is running, it's alive
        res.status(200).json({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }
}
exports.HealthController = HealthController;
exports.default = new HealthController();
//# sourceMappingURL=HealthController.js.map