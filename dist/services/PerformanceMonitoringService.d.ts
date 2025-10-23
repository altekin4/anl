import { Request, Response, NextFunction } from 'express';
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
export declare class PerformanceMonitoringService {
    private static instance;
    private cacheService;
    private metrics;
    private requestHistory;
    private readonly MAX_HISTORY_SIZE;
    private readonly SLOW_REQUEST_THRESHOLD;
    constructor();
    static getInstance(): PerformanceMonitoringService;
    /**
     * Express middleware for request monitoring
     */
    requestMonitoringMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Record individual request metrics
     */
    private recordRequest;
    /**
     * Increment a counter metric
     */
    private incrementCounter;
    /**
     * Update average response time
     */
    private updateAverageResponseTime;
    /**
     * Get comprehensive performance metrics
     */
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    /**
     * Get detailed system health information
     */
    getSystemHealth(): Promise<any>;
    /**
     * Get request analytics for the last N minutes
     */
    getRequestAnalytics(minutes?: number): any;
    /**
     * Reset all metrics (useful for testing)
     */
    resetMetrics(): void;
    /**
     * Log performance summary
     */
    logPerformanceSummary(): Promise<void>;
}
declare const _default: PerformanceMonitoringService;
export default _default;
//# sourceMappingURL=PerformanceMonitoringService.d.ts.map