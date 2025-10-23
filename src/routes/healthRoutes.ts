import { Router } from 'express';
import healthController from '@/controllers/HealthController';

const router = Router();

// Basic health check
router.get('/', healthController.healthCheck.bind(healthController));

// Detailed health check
router.get('/detailed', healthController.detailedHealthCheck.bind(healthController));

// Performance metrics
router.get('/metrics', healthController.getMetrics.bind(healthController));

// Request analytics
router.get('/analytics', healthController.getAnalytics.bind(healthController));

// Component-specific health checks
router.get('/database', healthController.databaseHealth.bind(healthController));
router.get('/cache', healthController.cacheHealth.bind(healthController));

// Kubernetes probes
router.get('/readiness', healthController.readiness.bind(healthController));
router.get('/liveness', healthController.liveness.bind(healthController));

export default router;