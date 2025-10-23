"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculatorController = void 0;
const NetCalculatorService_1 = require("@/services/NetCalculatorService");
const DataService_1 = require("@/services/DataService");
const CacheService_1 = require("@/services/CacheService");
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
class CalculatorController {
    constructor() {
        this.calculatorService = new NetCalculatorService_1.NetCalculatorService();
        this.dataService = new DataService_1.DataService(new CacheService_1.CacheService());
    }
    /**
     * Calculate required net scores for a department
     */
    async calculateNets(req, res, next) {
        try {
            const calculationRequest = req.body;
            logger_1.default.info('Calculating nets for request:', calculationRequest);
            // Find the department and get score data
            const departments = await this.dataService.searchDepartments(calculationRequest.department, undefined // Will search across all universities initially
            );
            if (departments.length === 0) {
                throw new errors_1.NotFoundError(`Department "${calculationRequest.department}" not found`);
            }
            // Filter by university if specified
            let targetDepartment = departments[0];
            if (calculationRequest.university) {
                const universities = await this.dataService.searchUniversities(calculationRequest.university);
                if (universities.length > 0) {
                    const universityDepartments = departments.filter(dept => dept.item.universityId === universities[0].item.id);
                    if (universityDepartments.length > 0) {
                        targetDepartment = universityDepartments[0];
                    }
                }
            }
            // Get score data for the department
            const scoreDataList = await this.dataService.getScoreData(targetDepartment.item.id);
            if (scoreDataList.length === 0) {
                throw new errors_1.NotFoundError('No score data available for this department');
            }
            // Find the most recent score data for the requested score type
            const relevantScoreData = scoreDataList
                .filter(data => data.scoreType === calculationRequest.scoreType)
                .sort((a, b) => b.year - a.year)[0];
            if (!relevantScoreData) {
                throw new errors_1.NotFoundError(`No score data available for score type "${calculationRequest.scoreType}"`);
            }
            // Calculate required nets
            const calculation = await this.calculatorService.calculateRequiredNets(calculationRequest, relevantScoreData);
            const response = {
                success: true,
                data: calculation,
            };
            logger_1.default.info('Net calculation completed successfully');
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error in calculateNets:', error);
            next(error);
        }
    }
    /**
     * Calculate multiple scenarios with different safety margins
     */
    async calculateScenarios(req, res, next) {
        try {
            const calculationRequest = req.body;
            const { safetyMargins } = req.body;
            logger_1.default.info('Calculating scenarios for request:', calculationRequest);
            // Find department and score data (same logic as calculateNets)
            const departments = await this.dataService.searchDepartments(calculationRequest.department);
            if (departments.length === 0) {
                throw new errors_1.NotFoundError(`Department "${calculationRequest.department}" not found`);
            }
            let targetDepartment = departments[0];
            if (calculationRequest.university) {
                const universities = await this.dataService.searchUniversities(calculationRequest.university);
                if (universities.length > 0) {
                    const universityDepartments = departments.filter(dept => dept.item.universityId === universities[0].item.id);
                    if (universityDepartments.length > 0) {
                        targetDepartment = universityDepartments[0];
                    }
                }
            }
            const scoreDataList = await this.dataService.getScoreData(targetDepartment.item.id);
            const relevantScoreData = scoreDataList
                .filter(data => data.scoreType === calculationRequest.scoreType)
                .sort((a, b) => b.year - a.year)[0];
            if (!relevantScoreData) {
                throw new errors_1.NotFoundError(`No score data available for score type "${calculationRequest.scoreType}"`);
            }
            // Calculate multiple scenarios
            const scenarios = await this.calculatorService.calculateMultipleScenarios(calculationRequest, relevantScoreData, safetyMargins);
            const response = {
                success: true,
                data: scenarios,
            };
            logger_1.default.info('Scenario calculations completed successfully');
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error in calculateScenarios:', error);
            next(error);
        }
    }
    /**
     * Get study recommendations based on calculation
     */
    async getRecommendations(req, res, next) {
        try {
            const calculationRequest = req.body;
            logger_1.default.info('Getting recommendations for request:', calculationRequest);
            // First calculate the nets
            const departments = await this.dataService.searchDepartments(calculationRequest.department);
            if (departments.length === 0) {
                throw new errors_1.NotFoundError(`Department "${calculationRequest.department}" not found`);
            }
            let targetDepartment = departments[0];
            if (calculationRequest.university) {
                const universities = await this.dataService.searchUniversities(calculationRequest.university);
                if (universities.length > 0) {
                    const universityDepartments = departments.filter(dept => dept.item.universityId === universities[0].item.id);
                    if (universityDepartments.length > 0) {
                        targetDepartment = universityDepartments[0];
                    }
                }
            }
            const scoreDataList = await this.dataService.getScoreData(targetDepartment.item.id);
            const relevantScoreData = scoreDataList
                .filter(data => data.scoreType === calculationRequest.scoreType)
                .sort((a, b) => b.year - a.year)[0];
            if (!relevantScoreData) {
                throw new errors_1.NotFoundError(`No score data available for score type "${calculationRequest.scoreType}"`);
            }
            const calculation = await this.calculatorService.calculateRequiredNets(calculationRequest, relevantScoreData);
            // Get recommendations
            const recommendations = this.calculatorService.getStudyRecommendations(calculation);
            const response = {
                success: true,
                data: {
                    calculation,
                    recommendations,
                },
            };
            logger_1.default.info('Recommendations generated successfully');
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error in getRecommendations:', error);
            next(error);
        }
    }
    /**
     * Get net values for a specific score type
     */
    async getNetValues(req, res, next) {
        try {
            const { scoreType } = req.params;
            if (!['TYT', 'SAY', 'EA', 'SOZ', 'DIL'].includes(scoreType)) {
                throw new errors_1.ValidationError('Invalid score type. Must be one of: TYT, SAY, EA, SOZ, DIL');
            }
            // Create a temporary calculator service instance to access net values
            const tempService = new NetCalculatorService_1.NetCalculatorService();
            const netValues = tempService.getNetValues(scoreType);
            const response = {
                success: true,
                data: netValues,
            };
            logger_1.default.info(`Net values retrieved for score type: ${scoreType}`);
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Error in getNetValues:', error);
            next(error);
        }
    }
}
exports.CalculatorController = CalculatorController;
//# sourceMappingURL=CalculatorController.js.map