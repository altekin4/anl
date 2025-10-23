import { Request, Response } from 'express';
export declare class HealthController {
    private cacheService;
    constructor();
    /**
     * Basic health check endpoint
     */
    healthCheck(req: Request, res: Response): Promise<void>;
    /**
     * Detailed health check with all system components
     */
    detailedHealthCheck(req: Request, res: Response): Promise<void>;
    /**
     * Performance metrics endpoint
     */
    getMetrics(req: Request, res: Response): Promise<void>;
    /**
     * Request analytics endpoint
     */
    getAnalytics(req: Request, res: Response): Promise<void>;
    /**
     * Database health check
     */
    databaseHealth(req: Request, res: Response): Promise<void>;
    /**
     * Cache health check
     */
    cacheHealth(req: Request, res: Response): Promise<void>;
    /**
     * Readiness probe (for Kubernetes)
     */
    readiness(req: Request, res: Response): Promise<void>;
    /**
     * Liveness probe (for Kubernetes)
     */
    liveness(req: Request, res: Response): Promise<void>;
}
declare const _default: HealthController;
export default _default;
//# sourceMappingURL=HealthController.d.ts.map