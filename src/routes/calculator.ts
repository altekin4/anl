import { Router } from 'express';
import { CalculatorController } from '@/controllers/CalculatorController';
import { validateCalculationRequest } from '@/middleware/validation';
import { rateLimiter } from '@/middleware/rateLimiter';

const router = Router();
const calculatorController = new CalculatorController();

// Apply rate limiting to all calculator routes
router.use(rateLimiter);

/**
 * POST /api/calculator/calculate
 * Calculate required net scores for a specific department
 */
router.post(
  '/calculate',
  validateCalculationRequest,
  calculatorController.calculateNets.bind(calculatorController)
);

/**
 * POST /api/calculator/scenarios
 * Calculate multiple scenarios with different safety margins
 */
router.post(
  '/scenarios',
  validateCalculationRequest,
  calculatorController.calculateScenarios.bind(calculatorController)
);

/**
 * POST /api/calculator/recommendations
 * Get study recommendations based on calculation results
 */
router.post(
  '/recommendations',
  validateCalculationRequest,
  calculatorController.getRecommendations.bind(calculatorController)
);

/**
 * GET /api/calculator/net-values/:scoreType
 * Get net values (coefficients) for a specific score type
 */
router.get(
  '/net-values/:scoreType',
  calculatorController.getNetValues.bind(calculatorController)
);

export default router;