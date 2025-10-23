import { Request, Response, NextFunction } from 'express';
import { NetCalculatorService } from '@/services/NetCalculatorService';
import { DataService } from '@/services/DataService';
import { CacheService } from '@/services/CacheService';
import { CalculationRequest, ApiResponse, NetCalculation } from '@/types';
import { ValidationError, NotFoundError } from '@/utils/errors';
import logger from '@/utils/logger';

export class CalculatorController {
  private calculatorService: NetCalculatorService;
  private dataService: DataService;

  constructor() {
    this.calculatorService = new NetCalculatorService();
    this.dataService = new DataService(new CacheService());
  }

  /**
   * Calculate required net scores for a department
   */
  public async calculateNets(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const calculationRequest: CalculationRequest = req.body;
      
      logger.info('Calculating nets for request:', calculationRequest);

      // Find the department and get score data
      const departments = await this.dataService.searchDepartments(
        calculationRequest.department,
        undefined // Will search across all universities initially
      );

      if (departments.length === 0) {
        throw new NotFoundError(`Department "${calculationRequest.department}" not found`);
      }

      // Filter by university if specified
      let targetDepartment = departments[0];
      if (calculationRequest.university) {
        const universities = await this.dataService.searchUniversities(calculationRequest.university);
        if (universities.length > 0) {
          const universityDepartments = departments.filter(
            dept => dept.item.universityId === universities[0].item.id
          );
          if (universityDepartments.length > 0) {
            targetDepartment = universityDepartments[0];
          }
        }
      }

      // Get score data for the department
      const scoreDataList = await this.dataService.getScoreData(targetDepartment.item.id);
      
      if (scoreDataList.length === 0) {
        throw new NotFoundError('No score data available for this department');
      }

      // Find the most recent score data for the requested score type
      const relevantScoreData = scoreDataList
        .filter(data => data.scoreType === calculationRequest.scoreType)
        .sort((a, b) => b.year - a.year)[0];

      if (!relevantScoreData) {
        throw new NotFoundError(
          `No score data available for score type "${calculationRequest.scoreType}"`
        );
      }

      // Calculate required nets
      const calculation = await this.calculatorService.calculateRequiredNets(
        calculationRequest,
        relevantScoreData
      );

      const response: ApiResponse<NetCalculation> = {
        success: true,
        data: calculation,
      };

      logger.info('Net calculation completed successfully');
      res.json(response);
    } catch (error) {
      logger.error('Error in calculateNets:', error);
      next(error);
    }
  }

  /**
   * Calculate multiple scenarios with different safety margins
   */
  public async calculateScenarios(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const calculationRequest: CalculationRequest = req.body;
      const { safetyMargins } = req.body;

      logger.info('Calculating scenarios for request:', calculationRequest);

      // Find department and score data (same logic as calculateNets)
      const departments = await this.dataService.searchDepartments(
        calculationRequest.department
      );

      if (departments.length === 0) {
        throw new NotFoundError(`Department "${calculationRequest.department}" not found`);
      }

      let targetDepartment = departments[0];
      if (calculationRequest.university) {
        const universities = await this.dataService.searchUniversities(calculationRequest.university);
        if (universities.length > 0) {
          const universityDepartments = departments.filter(
            dept => dept.item.universityId === universities[0].item.id
          );
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
        throw new NotFoundError(
          `No score data available for score type "${calculationRequest.scoreType}"`
        );
      }

      // Calculate multiple scenarios
      const scenarios = await this.calculatorService.calculateMultipleScenarios(
        calculationRequest,
        relevantScoreData,
        safetyMargins
      );

      const response: ApiResponse<NetCalculation[]> = {
        success: true,
        data: scenarios,
      };

      logger.info('Scenario calculations completed successfully');
      res.json(response);
    } catch (error) {
      logger.error('Error in calculateScenarios:', error);
      next(error);
    }
  }

  /**
   * Get study recommendations based on calculation
   */
  public async getRecommendations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const calculationRequest: CalculationRequest = req.body;

      logger.info('Getting recommendations for request:', calculationRequest);

      // First calculate the nets
      const departments = await this.dataService.searchDepartments(
        calculationRequest.department
      );

      if (departments.length === 0) {
        throw new NotFoundError(`Department "${calculationRequest.department}" not found`);
      }

      let targetDepartment = departments[0];
      if (calculationRequest.university) {
        const universities = await this.dataService.searchUniversities(calculationRequest.university);
        if (universities.length > 0) {
          const universityDepartments = departments.filter(
            dept => dept.item.universityId === universities[0].item.id
          );
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
        throw new NotFoundError(
          `No score data available for score type "${calculationRequest.scoreType}"`
        );
      }

      const calculation = await this.calculatorService.calculateRequiredNets(
        calculationRequest,
        relevantScoreData
      );

      // Get recommendations
      const recommendations = this.calculatorService.getStudyRecommendations(calculation);

      const response: ApiResponse<{
        calculation: NetCalculation;
        recommendations: typeof recommendations;
      }> = {
        success: true,
        data: {
          calculation,
          recommendations,
        },
      };

      logger.info('Recommendations generated successfully');
      res.json(response);
    } catch (error) {
      logger.error('Error in getRecommendations:', error);
      next(error);
    }
  }

  /**
   * Get net values for a specific score type
   */
  public async getNetValues(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { scoreType } = req.params;

      if (!['TYT', 'SAY', 'EA', 'SOZ', 'DIL'].includes(scoreType)) {
        throw new ValidationError('Invalid score type. Must be one of: TYT, SAY, EA, SOZ, DIL');
      }

      // Create a temporary calculator service instance to access net values
      const tempService = new NetCalculatorService();
      const netValues = (tempService as any).getNetValues(scoreType);

      const response: ApiResponse<Record<string, number>> = {
        success: true,
        data: netValues,
      };

      logger.info(`Net values retrieved for score type: ${scoreType}`);
      res.json(response);
    } catch (error) {
      logger.error('Error in getNetValues:', error);
      next(error);
    }
  }
}