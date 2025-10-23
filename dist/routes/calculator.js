"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CalculatorController_1 = require("@/controllers/CalculatorController");
const validation_1 = require("@/middleware/validation");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const router = (0, express_1.Router)();
const calculatorController = new CalculatorController_1.CalculatorController();
// Apply rate limiting to all calculator routes
router.use(rateLimiter_1.rateLimiter);
/**
 * POST /api/calculator/calculate
 * Calculate required net scores for a specific department
 */
router.post('/calculate', validation_1.validateCalculationRequest, calculatorController.calculateNets.bind(calculatorController));
/**
 * POST /api/calculator/scenarios
 * Calculate multiple scenarios with different safety margins
 */
router.post('/scenarios', validation_1.validateCalculationRequest, calculatorController.calculateScenarios.bind(calculatorController));
/**
 * POST /api/calculator/recommendations
 * Get study recommendations based on calculation results
 */
router.post('/recommendations', validation_1.validateCalculationRequest, calculatorController.getRecommendations.bind(calculatorController));
/**
 * GET /api/calculator/net-values/:scoreType
 * Get net values (coefficients) for a specific score type
 */
router.get('/net-values/:scoreType', calculatorController.getNetValues.bind(calculatorController));
exports.default = router;
//# sourceMappingURL=calculator.js.map