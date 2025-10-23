"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HealthController_1 = __importDefault(require("@/controllers/HealthController"));
const router = (0, express_1.Router)();
// Basic health check
router.get('/', HealthController_1.default.healthCheck.bind(HealthController_1.default));
// Detailed health check
router.get('/detailed', HealthController_1.default.detailedHealthCheck.bind(HealthController_1.default));
// Performance metrics
router.get('/metrics', HealthController_1.default.getMetrics.bind(HealthController_1.default));
// Request analytics
router.get('/analytics', HealthController_1.default.getAnalytics.bind(HealthController_1.default));
// Component-specific health checks
router.get('/database', HealthController_1.default.databaseHealth.bind(HealthController_1.default));
router.get('/cache', HealthController_1.default.cacheHealth.bind(HealthController_1.default));
// Kubernetes probes
router.get('/readiness', HealthController_1.default.readiness.bind(HealthController_1.default));
router.get('/liveness', HealthController_1.default.liveness.bind(HealthController_1.default));
exports.default = router;
//# sourceMappingURL=healthRoutes.js.map